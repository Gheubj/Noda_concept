import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Dropdown, Input, Popover, Segmented, Select, Space, Typography, Upload, message } from "antd";
import { DeleteOutlined, DownOutlined, PlusOutlined, UpOutlined, UploadOutlined } from "@ant-design/icons";
import type { LessonContentBlock, StudioGoal } from "@/shared/types/lessonContent";
import { apiClient } from "@/shared/api/client";
import { resolveLessonMediaUrl } from "@/shared/lessonMediaUrl";
import { newLessonBlockId } from "@/shared/lessonContentBlocks";
import { useSessionStore } from "@/store/useSessionStore";
import { listProjects } from "@/features/project/projectRepository";
import type { DeckTextFormatApi } from "@/components/deck/deckTextSelection";
import { wrapTextareaSelection } from "@/components/deck/deckTextSelection";
import type { UploadProps } from "antd";

const { Text } = Typography;

const BLOCK_TYPES: { value: LessonContentBlock["type"]; label: string }[] = [
  { value: "text", label: "Текст" },
  { value: "media", label: "Медиа (картинка/PDF)" },
  { value: "studio", label: "Мини-разработка" },
  { value: "checkpoint", label: "Вопрос" },
  { value: "divider", label: "Разделитель (legacy)" }
];

const STUDIO_GOAL_TYPES: Array<{ value: StudioGoal["type"]; label: string }> = [
  { value: "add_block", label: "Добавить блок" },
  { value: "select_dataset", label: "Выбрать датасет" },
  { value: "train_model", label: "Запустить обучение" },
  { value: "run_prediction", label: "Сделать предсказание" },
  { value: "save_model", label: "Сохранить модель (выполнить блок)" }
];

const STUDIO_BLOCK_TYPE_OPTIONS = [
  { value: "noda_start", label: "Старт" },
  { value: "noda_train_model_simple", label: "Обучить модель (уровень 1)" },
  { value: "noda_train_model", label: "Обучить модель (уровень 2+)" },
  { value: "noda_predict_l1", label: "Предсказать (уровень 1)" },
  { value: "noda_predict_class", label: "Предсказать (уровень 2+)" },
  { value: "noda_save_model", label: "Сохранить модель" }
];

function defaultBlock(type: LessonContentBlock["type"]): LessonContentBlock {
  const id = newLessonBlockId();
  switch (type) {
    case "text":
      return { id, type: "text", body: "Текст блока" };
    case "media":
      return {
        id,
        type: "media",
        kind: "image",
        url: "https://placehold.co/1200x600/png?text=Замени+URL+или+загрузи+файл",
        caption: null
      };
    case "studio":
      return {
        id,
        type: "studio",
        instruction: "",
        ctaAction: null,
        studioPracticeKind: "empty",
        studioWorkspaceLevel: 1
      };
    case "checkpoint":
      return { id, type: "checkpoint", question: "", expectedAnswer: "", answerMode: "text", options: [] };
    case "divider":
      return { id, type: "divider" };
    default:
      return { id, type: "text", body: "Блок" };
  }
}

export function createAdminLessonBlock(
  type: "text" | "media" | "studio" | "checkpoint"
): import("@/shared/types/lessonContent").LessonDeckInnerBlock {
  return defaultBlock(type) as import("@/shared/types/lessonContent").LessonDeckInnerBlock;
}

export type AdminLessonBlockEditorProps = {
  blocks: LessonContentBlock[];
  onChange: (next: LessonContentBlock[]) => void;
  /** Режим слайда: один блок, без лишних кнопок; превью текста как у ученика */
  deckSingleElement?: boolean;
  /** id элемента на слайде (дека), для связи с лентой форматирования */
  deckCanvasElementId?: string;
  /** Этот элемент сейчас выделен на канвасе */
  deckElementSelected?: boolean;
  /** Кнопки текста/медиа вынесены в шапку редактора слайда */
  deckChromeInRibbon?: boolean;
  onRegisterDeckTextFormatApi?: (elementId: string, api: DeckTextFormatApi | null) => void;
  /** Высота текстового блока по содержимому (px), для подгонки Rnd на слайде */
  onDeckTextNaturalHeightPx?: (heightPx: number) => void;
};

export function AdminLessonBlockEditor({
  blocks,
  onChange,
  deckSingleElement = false,
  deckCanvasElementId,
  deckElementSelected = false,
  deckChromeInRibbon = false,
  onRegisterDeckTextFormatApi,
  onDeckTextNaturalHeightPx
}: AdminLessonBlockEditorProps) {
  const { user } = useSessionStore();
  const [uploadBusy, setUploadBusy] = useState<Record<string, boolean>>({});
  const [projectOptions, setProjectOptions] = useState<Array<{ value: string; label: string }>>([]);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) {
      setProjectOptions([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const list = await listProjects(userId);
        if (cancelled) {
          return;
        }
        setProjectOptions(list.map((p) => ({ value: p.id, label: p.title })));
      } catch {
        if (!cancelled) {
          setProjectOptions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const setBusy = useCallback((blockId: string, v: boolean) => {
    setUploadBusy((prev) => ({ ...prev, [blockId]: v }));
  }, []);

  const setBlock = (index: number, patch: Partial<LessonContentBlock>) => {
    const next = [...blocks];
    const cur = next[index];
    if (!cur) {
      return;
    }
    next[index] = { ...cur, ...patch } as LessonContentBlock;
    onChange(next);
  };

  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const deckTextWrapRef = useRef<HTMLDivElement>(null);
  const onDeckTextNaturalHeightPxRef = useRef(onDeckTextNaturalHeightPx);
  onDeckTextNaturalHeightPxRef.current = onDeckTextNaturalHeightPx;

  useEffect(() => {
    if (
      !deckSingleElement ||
      !deckChromeInRibbon ||
      blocks[0]?.type !== "text" ||
      !deckCanvasElementId ||
      !onRegisterDeckTextFormatApi
    ) {
      return;
    }
    if (!deckElementSelected) {
      onRegisterDeckTextFormatApi(deckCanvasElementId, null);
      return;
    }
    const api: DeckTextFormatApi = {
      wrapSelection: (left, right) => {
        const ta = deckTextWrapRef.current?.querySelector("textarea") as HTMLTextAreaElement | null;
        const b = blocksRef.current[0];
        if (!ta || !b || b.type !== "text") {
          return;
        }
        wrapTextareaSelection(ta, ta.value, (next) => onChange([{ ...b, body: next }]), left, right);
      }
    };
    onRegisterDeckTextFormatApi(deckCanvasElementId, api);
    return () => onRegisterDeckTextFormatApi(deckCanvasElementId, null);
  }, [
    deckSingleElement,
    deckChromeInRibbon,
    deckElementSelected,
    deckCanvasElementId,
    onRegisterDeckTextFormatApi,
    onChange
  ]);

  useEffect(() => {
    if (!deckSingleElement || !deckChromeInRibbon || blocks[0]?.type !== "text" || !onDeckTextNaturalHeightPx) {
      return;
    }
    const root = deckTextWrapRef.current;
    if (!root) {
      return;
    }
    let raf = 0;
    const report = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const h = Math.ceil(root.getBoundingClientRect().height);
        if (h > 0) {
          onDeckTextNaturalHeightPxRef.current?.(h);
        }
      });
    };
    const ro = new ResizeObserver(report);
    ro.observe(root);
    report();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [
    deckSingleElement,
    deckChromeInRibbon,
    blocks[0]?.type,
    blocks[0]?.type === "text" ? blocks[0].body : "",
    blocks[0]?.type === "text" ? (blocks[0].textScale ?? "md") : ""
  ]);

  const updateStudioGoal = (index: number, goalIndex: number, patch: Partial<StudioGoal>) => {
    const block = blocks[index];
    if (!block || block.type !== "studio") {
      return;
    }
    const goals = [...(block.goals ?? [])];
    const current = goals[goalIndex];
    if (!current) {
      return;
    }
    goals[goalIndex] = { ...current, ...patch } as StudioGoal;
    setBlock(index, { goals } as Partial<LessonContentBlock>);
  };

  const addStudioGoal = (index: number) => {
    const block = blocks[index];
    if (!block || block.type !== "studio") {
      return;
    }
    const goals = [...(block.goals ?? [])];
    goals.push({
      id: newLessonBlockId(),
      title: "Добавить блок «Обучить модель»",
      type: "add_block",
      blockType: "noda_train_model_simple"
    });
    setBlock(index, { goals } as Partial<LessonContentBlock>);
  };

  const removeStudioGoal = (index: number, goalIndex: number) => {
    const block = blocks[index];
    if (!block || block.type !== "studio") {
      return;
    }
    const goals = (block.goals ?? []).filter((_, i) => i !== goalIndex);
    setBlock(index, { goals } as Partial<LessonContentBlock>);
  };

  const replaceBlockType = (index: number, type: LessonContentBlock["type"]) => {
    const next = [...blocks];
    next[index] = defaultBlock(type);
    onChange(next);
  };

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= blocks.length) {
      return;
    }
    const next = [...blocks];
    [next[index], next[j]] = [next[j], next[index]];
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(blocks.filter((_, i) => i !== index));
  };

  const insertBlockAt = (index: number, type: LessonContentBlock["type"]) => {
    const next = [...blocks];
    next.splice(index, 0, defaultBlock(type));
    onChange(next);
  };

  /** Вставляет `divider` между каждой парой соседних блоков, если между ними ещё нет разделителя. */
  const insertDividersBetweenAllBlocks = useCallback(() => {
    if (blocks.length < 2) {
      return;
    }
    const next = [...blocks];
    let added = 0;
    for (let i = next.length - 2; i >= 0; i--) {
      const a = next[i];
      const b = next[i + 1];
      if (a && b && a.type !== "divider" && b.type !== "divider") {
        next.splice(i + 1, 0, { id: newLessonBlockId(), type: "divider" });
        added += 1;
      }
    }
    if (added === 0) {
      message.info("Между всеми парами блоков уже стоят разделители или добавлять нечего.");
      return;
    }
    onChange(next);
    message.success(`Добавлено разделителей: ${added}`);
  }, [blocks, onChange]);

  const uploadImageForMediaBlock = (blockId: string, index: number): UploadProps["customRequest"] => {
    return async (options) => {
      const { file, onError, onSuccess } = options;
      const blob = file as File;
      setBusy(blockId, true);
      try {
        const fd = new FormData();
        fd.append("image", blob, blob.name || "slide.png");
        const res = await apiClient.postForm<{ url: string }>("/api/admin/uploads/lesson-image", fd);
        setBlock(index, { url: res.url } as Partial<Extract<LessonContentBlock, { type: "media" }>>);
        message.success("Изображение загружено");
        onSuccess?.(res, new XMLHttpRequest());
      } catch (e) {
        message.error(e instanceof Error ? e.message : "Ошибка загрузки");
        onError?.(e instanceof Error ? e : new Error("upload"));
      } finally {
        setBusy(blockId, false);
      }
    };
  };

  const uploadPdfForMediaBlock = (blockId: string, index: number): UploadProps["customRequest"] => {
    return async (options) => {
      const { file, onError, onSuccess } = options;
      const blob = file as File;
      setBusy(blockId, true);
      try {
        const fd = new FormData();
        fd.append("pdf", blob, blob.name || "lesson.pdf");
        const res = await apiClient.postForm<{ url: string }>("/api/admin/uploads/lesson-pdf", fd);
        setBlock(index, { url: res.url } as Partial<Extract<LessonContentBlock, { type: "media" }>>);
        message.success("PDF загружен");
        onSuccess?.(res, new XMLHttpRequest());
      } catch (e) {
        message.error(e instanceof Error ? e.message : "Ошибка загрузки");
        onError?.(e instanceof Error ? e : new Error("upload"));
      } finally {
        setBusy(blockId, false);
      }
    };
  };

  const studioProjectSelectOptions = useMemo(
    () => [
      { value: "__empty__", label: "Пустая практика" },
      { value: "__template__", label: "Снимок из шаблона урока (starterPayload)" },
      ...projectOptions.map((item) => ({ value: item.value, label: item.label }))
    ],
    [projectOptions]
  );

  return (
    <Space
      direction="vertical"
      size={deckSingleElement ? "small" : "middle"}
      style={{ width: "100%" }}
      className={`lesson-block-editor${deckSingleElement ? " lesson-block-editor--deck-single" : ""}${
        deckSingleElement && deckChromeInRibbon && blocks[0]?.type === "text"
          ? " lesson-block-editor--deck-slide-ppt-text"
          : ""
      }`}
    >
      {!deckSingleElement && blocks.length >= 2 ? (
        <div className="lesson-block-editor__bulk-actions">
          <Button type="default" onClick={insertDividersBetweenAllBlocks}>
            Разделители между всеми блоками
          </Button>
        </div>
      ) : null}
      {!deckSingleElement && blocks.length === 0 ? (
        <div className="lesson-block-editor__insert-row lesson-block-editor__insert-row--empty">
          <Dropdown
            menu={{
              items: BLOCK_TYPES.map((t) => ({
                key: t.value,
                label: t.label,
                onClick: () => insertBlockAt(0, t.value)
              }))
            }}
          >
            <Button type="dashed" icon={<PlusOutlined />}>
              Добавить первый блок
            </Button>
          </Dropdown>
        </div>
      ) : null}
      {blocks.map((block, index) => {
        const blockEditorInner = (
          <>
          {block.type === "text" ? (
            <Space
              direction="vertical"
              style={{
                width: "100%",
                height: deckSingleElement && !deckChromeInRibbon ? "100%" : undefined
              }}
              className="lesson-block-editor__section"
            >
              {deckSingleElement ? (
                deckChromeInRibbon ? (
                  <div ref={deckTextWrapRef} className="lesson-block-editor__deck-text-wrap lesson-block-editor__deck-text-wrap--ppt" style={{ width: "100%" }}>
                    <Input.TextArea
                      className="lesson-block-editor__deck-text-plain-input lesson-block-editor__deck-text-plain-input--ppt"
                      variant="borderless"
                      placeholder="Текст"
                      value={block.body}
                      onChange={(e) => setBlock(index, { body: e.target.value })}
                      autoSize={{ minRows: 1, maxRows: 500 }}
                    />
                  </div>
                ) : (
                  <>
                    <Input.TextArea
                      className="lesson-block-editor__deck-text-plain-input"
                      variant="borderless"
                      placeholder="Текст слайда"
                      value={block.body}
                      onChange={(e) => setBlock(index, { body: e.target.value })}
                      autoSize={false}
                    />
                    <Segmented
                      size="small"
                      value={block.textScale ?? "md"}
                      options={[
                        { label: "М", value: "sm" },
                        { label: "Н", value: "md" },
                        { label: "К", value: "lg" }
                      ]}
                      onChange={(v) => setBlock(index, { textScale: v as "sm" | "md" | "lg" })}
                    />
                  </>
                )
              ) : (
                <Input.TextArea rows={6} value={block.body} onChange={(e) => setBlock(index, { body: e.target.value })} />
              )}
            </Space>
          ) : null}
          {block.type === "media" ? (
            deckSingleElement && block.kind === "image" ? (
              <div
                className={`lesson-block-editor__deck-image-only${
                  block.url ? " lesson-block-editor__deck-image-only--has-url" : ""
                }`}
                title={block.url ? "Наведите на область — кнопки замены и подписи" : undefined}
              >
                {block.url ? (
                  deckChromeInRibbon ? (
                    <img className="lesson-block-editor__deck-image-only-img" src={resolveLessonMediaUrl(block.url)} alt="" />
                  ) : (
                    <>
                      <img className="lesson-block-editor__deck-image-only-img" src={resolveLessonMediaUrl(block.url)} alt="" />
                      <div className="lesson-block-editor__deck-image-only-bar">
                        <Upload
                          accept="image/*"
                          maxCount={1}
                          showUploadList={false}
                          customRequest={uploadImageForMediaBlock(block.id, index)}
                        >
                          <Button size="small" type="primary" loading={uploadBusy[block.id]}>
                            Заменить
                          </Button>
                        </Upload>
                        <Popover
                          trigger="click"
                          title="Подпись"
                          content={
                            <Input
                              placeholder="Необязательно"
                              value={block.caption ?? ""}
                              onChange={(e) => setBlock(index, { caption: e.target.value || null })}
                              style={{ width: 260 }}
                            />
                          }
                        >
                          <Button size="small">Подпись</Button>
                        </Popover>
                      </div>
                    </>
                  )
                ) : (
                  <Upload
                    accept="image/*"
                    maxCount={1}
                    showUploadList={false}
                    customRequest={uploadImageForMediaBlock(block.id, index)}
                    className="lesson-block-editor__deck-image-upload"
                  >
                    <button type="button" className="lesson-block-editor__deck-image-drop">
                      <UploadOutlined style={{ fontSize: 28, marginBottom: 8 }} />
                      <div>Нажми или перетащи картинку</div>
                    </button>
                  </Upload>
                )}
              </div>
            ) : deckSingleElement && block.kind === "pdf" ? (
              deckChromeInRibbon ? (
                <div className="lesson-block-editor__deck-pdf-slot">
                  {block.url ? (
                    <Text type="secondary" className="lesson-block-editor__deck-pdf-slot-hint">
                      PDF
                    </Text>
                  ) : (
                    <Upload
                      accept="application/pdf,.pdf"
                      maxCount={1}
                      showUploadList={false}
                      customRequest={uploadPdfForMediaBlock(block.id, index)}
                      className="lesson-block-editor__deck-image-upload"
                    >
                      <button type="button" className="lesson-block-editor__deck-image-drop">
                        <UploadOutlined style={{ fontSize: 22, marginBottom: 6 }} />
                        <div>PDF — выберите файл</div>
                      </button>
                    </Upload>
                  )}
                </div>
              ) : (
              <Space direction="vertical" style={{ width: "100%" }} size="small" className="lesson-block-editor__section">
                <Text type="secondary">{block.url ? "PDF подключён" : "Файл PDF"}</Text>
                <Upload
                  accept="application/pdf,.pdf"
                  maxCount={1}
                  showUploadList={false}
                  customRequest={uploadPdfForMediaBlock(block.id, index)}
                >
                  <Button icon={<UploadOutlined />} loading={uploadBusy[block.id]} block>
                    {block.url ? "Заменить PDF" : "Загрузить PDF"}
                  </Button>
                </Upload>
                <Input
                  placeholder="Заголовок над презентацией (необязательно)"
                  value={block.caption ?? ""}
                  onChange={(e) => setBlock(index, { caption: e.target.value || null })}
                />
              </Space>
              )
            ) : (
            <Space direction="vertical" style={{ width: "100%" }} className="lesson-block-editor__section">
              <Select
                value={block.kind}
                options={[
                  { value: "image", label: "Картинка" },
                  { value: "pdf", label: "PDF" }
                ]}
                onChange={(v) => setBlock(index, { kind: v as "image" | "pdf" })}
              />
              <Input
                placeholder={block.kind === "pdf" ? "URL PDF" : "URL картинки"}
                value={block.url}
                onChange={(e) => setBlock(index, { url: e.target.value })}
              />
              {block.kind === "pdf" ? (
                <Upload
                  accept="application/pdf,.pdf"
                  maxCount={1}
                  showUploadList={false}
                  customRequest={uploadPdfForMediaBlock(block.id, index)}
                >
                  <Button icon={<UploadOutlined />} loading={uploadBusy[block.id]}>
                    Загрузить PDF
                  </Button>
                </Upload>
              ) : (
                <Upload
                  accept="image/*"
                  maxCount={1}
                  showUploadList={false}
                  customRequest={uploadImageForMediaBlock(block.id, index)}
                >
                  <Button icon={<UploadOutlined />} loading={uploadBusy[block.id]}>
                    Загрузить картинку
                  </Button>
                </Upload>
              )}
              <Input
                placeholder={block.kind === "pdf" ? "Заголовок над презентацией" : "Подпись (необязательно)"}
                value={block.caption ?? ""}
                onChange={(e) => setBlock(index, { caption: e.target.value || null })}
              />
            </Space>
            )
          ) : null}
          {block.type === "studio" ? (
            <Space direction="vertical" style={{ width: "100%" }} className="lesson-block-editor__section">
              {!deckSingleElement ? <Text type="secondary">Инструкция и параметры мини-разработки</Text> : null}
              <Input.TextArea
                className={deckSingleElement ? "lesson-block-editor__deck-text-plain-input" : undefined}
                variant={deckSingleElement ? "borderless" : undefined}
                rows={deckSingleElement ? undefined : 3}
                autoSize={deckSingleElement ? false : undefined}
                placeholder={deckSingleElement ? "Инструкция для ученика" : undefined}
                value={block.instruction}
                onChange={(e) => setBlock(index, { instruction: e.target.value })}
              />
              {!deckSingleElement ? (
                <>
                  <Text type="secondary">Короткий текст на панели «Сцена» внутри мини-студии (если пусто — туда попадает полная инструкция выше)</Text>
                  <Input.TextArea
                    rows={2}
                    placeholder="Например: нажми Старт, когда цепочка готова; на сцене — график и метрики."
                    value={block.stageInstruction ?? ""}
                    onChange={(e) =>
                      setBlock(index, { stageInstruction: e.target.value.trim() ? e.target.value : null })
                    }
                  />
                </>
              ) : null}
              <Select
                  style={{ width: "100%" }}
                  value={
                    block.studioPracticeKind === "template"
                      ? "__template__"
                      : block.studioPracticeKind === "project_clone" && block.referenceProjectId
                        ? block.referenceProjectId
                        : "__empty__"
                  }
                  options={studioProjectSelectOptions}
                  showSearch
                  optionFilterProp="label"
                  onChange={(v) => {
                    if (v === "__empty__") {
                      setBlock(index, {
                        studioPracticeKind: "empty",
                        referenceProjectId: null,
                        studioWorkspaceLevel: block.studioWorkspaceLevel ?? 1
                      });
                      return;
                    }
                    if (v === "__template__") {
                      setBlock(index, {
                        studioPracticeKind: "template",
                        referenceProjectId: null,
                        studioWorkspaceLevel: block.studioWorkspaceLevel ?? 1
                      });
                      return;
                    }
                    setBlock(index, {
                      studioPracticeKind: "project_clone",
                      referenceProjectId: v,
                      studioWorkspaceLevel: undefined
                    });
                  }}
                />
                <Select
                  style={{ width: "100%" }}
                  value={block.studioWorkspaceLevel ?? 1}
                  disabled={
                    (block.studioPracticeKind === "project_clone" && Boolean(block.referenceProjectId)) ||
                    block.studioPracticeKind === "template"
                  }
                  title={
                    block.studioPracticeKind === "project_clone"
                      ? "Для проекта из библиотеки уровень берется из проекта"
                      : block.studioPracticeKind === "template"
                        ? "Для снимка шаблона уровень берется из starterPayload"
                        : undefined
                  }
                  placeholder="Уровень Blockly"
                  onChange={(v) => {
                    setBlock(index, { studioWorkspaceLevel: v as 1 | 2 });
                  }}
                  options={[
                    { value: 1, label: "Уровень Blockly 1" },
                    { value: 2, label: "Уровень Blockly 2" }
                  ]}
                />
                <Card size="small" title="Цели мини-разработки">
                  <Space direction="vertical" style={{ width: "100%" }} size="small">
                    {(block.goals ?? []).map((goal, goalIndex) => (
                      <Card
                        key={goal.id}
                        size="small"
                        type="inner"
                        title={`Цель ${goalIndex + 1}`}
                        extra={
                          <Button size="small" danger onClick={() => removeStudioGoal(index, goalIndex)}>
                            Удалить
                          </Button>
                        }
                      >
                        <Space direction="vertical" style={{ width: "100%" }} size="small">
                          <Input
                            placeholder="Текст цели (что увидит ученик)"
                            value={goal.title}
                            onChange={(e) => updateStudioGoal(index, goalIndex, { title: e.target.value })}
                          />
                          <Select
                            style={{ width: "100%" }}
                            value={goal.type}
                            options={STUDIO_GOAL_TYPES}
                            onChange={(v) => {
                              const t = v as StudioGoal["type"];
                              if (t === "add_block") {
                                updateStudioGoal(index, goalIndex, {
                                  type: t,
                                  blockType: "noda_train_model_simple"
                                } as Partial<StudioGoal>);
                                return;
                              }
                              if (t === "select_dataset") {
                                updateStudioGoal(index, goalIndex, {
                                  type: t,
                                  datasetKind: "image"
                                } as Partial<StudioGoal>);
                                return;
                              }
                              updateStudioGoal(index, goalIndex, { type: t } as Partial<StudioGoal>);
                            }}
                          />
                          {goal.type === "add_block" ? (
                            <Select
                              style={{ width: "100%" }}
                              value={goal.blockType}
                              options={STUDIO_BLOCK_TYPE_OPTIONS}
                              onChange={(v) =>
                                updateStudioGoal(index, goalIndex, { blockType: String(v) } as Partial<StudioGoal>)
                              }
                            />
                          ) : null}
                          {goal.type === "select_dataset" ? (
                            <Select
                              style={{ width: "100%" }}
                              value={goal.datasetKind}
                              options={[
                                { value: "image", label: "Image датасет" },
                                { value: "tabular", label: "Tabular датасет" }
                              ]}
                              onChange={(v) =>
                                updateStudioGoal(
                                  index,
                                  goalIndex,
                                  { datasetKind: v as "image" | "tabular" } as Partial<StudioGoal>
                                )
                              }
                            />
                          ) : null}
                        </Space>
                      </Card>
                    ))}
                    <Button type="dashed" onClick={() => addStudioGoal(index)} icon={<PlusOutlined />}>
                      Добавить цель
                    </Button>
                  </Space>
                </Card>
              {deckSingleElement ? (
                <div className="lesson-block-editor__studio-student-slot">
                  <Text type="secondary">У ученика: Blockly в iframe фиксированной высоты (как на слайде)</Text>
                </div>
              ) : null}
            </Space>
          ) : null}
          {block.type === "divider" ? <hr className="lesson-block-editor__divider-line" /> : null}
          {block.type === "checkpoint" ? (
            <Space direction="vertical" style={{ width: "100%" }} className="lesson-block-editor__section">
              <Input.TextArea
                className={deckSingleElement ? "lesson-block-editor__deck-text-plain-input" : undefined}
                variant={deckSingleElement ? "borderless" : undefined}
                rows={deckSingleElement ? undefined : 2}
                autoSize={deckSingleElement ? false : undefined}
                placeholder={deckSingleElement ? "Вопрос" : undefined}
                value={block.question}
                onChange={(e) => setBlock(index, { question: e.target.value })}
              />
              <Select
                value={block.answerMode ?? "text"}
                onChange={(v) => setBlock(index, { answerMode: v as "text" | "single" | "multi" })}
                options={[
                  { value: "text", label: "Свободный ввод" },
                  { value: "single", label: "Один вариант" },
                  { value: "multi", label: "Несколько вариантов" }
                ]}
              />
              {(block.answerMode ?? "text") !== "text" ? (
                <Input.TextArea
                  rows={3}
                  placeholder="Варианты, каждый с новой строки"
                  value={(block.options ?? []).join("\n")}
                  onChange={(e) =>
                    setBlock(index, {
                      options: e.target.value
                        .split("\n")
                        .map((s) => s.trim())
                        .filter(Boolean)
                    })
                  }
                />
              ) : null}
              {(block.answerMode ?? "text") === "text" ? (
                <Input
                  placeholder="Ожидаемый ответ"
                  value={block.expectedAnswer}
                  onChange={(e) => setBlock(index, { expectedAnswer: e.target.value })}
                />
              ) : null}
              {(block.answerMode ?? "text") === "single" ? (
                <Select
                  placeholder="Правильный вариант"
                  value={block.expectedAnswer || undefined}
                  options={(block.options ?? []).map((o) => ({ value: o, label: o }))}
                  onChange={(v) => setBlock(index, { expectedAnswer: String(v) })}
                />
              ) : null}
              {(block.answerMode ?? "text") === "multi" ? (
                <Select
                  mode="multiple"
                  placeholder="Правильные варианты"
                  value={
                    block.expectedAnswer
                      ? block.expectedAnswer
                          .split("||")
                          .map((x) => x.trim())
                          .filter(Boolean)
                      : []
                  }
                  options={(block.options ?? []).map((o) => ({ value: o, label: o }))}
                  onChange={(values) => setBlock(index, { expectedAnswer: values.map(String).join("||") })}
                />
              ) : null}
            </Space>
          ) : null}
          </>
        );
        return (
          <div key={block.id}>
            {!deckSingleElement ? (
              <div className="lesson-block-editor__insert-row">
                <Dropdown
                  menu={{
                    items: BLOCK_TYPES.map((t) => ({
                      key: t.value,
                      label: t.label,
                      onClick: () => insertBlockAt(index, t.value)
                    }))
                  }}
                >
                  <Button size="small" type="text" icon={<PlusOutlined />}>
                    Добавить блок
                  </Button>
                </Dropdown>
              </div>
            ) : null}
            {deckSingleElement ? (
              <div
                className={`lesson-block-editor__deck-canvas-cell lesson-block-editor__cell${
                  block.type === "divider" ? " lesson-block-editor__deck-canvas-cell--divider" : ""
                }`}
              >
                {blockEditorInner}
              </div>
            ) : (
              <Card
                className={`lesson-block-editor__card lesson-block-editor__cell${
                  block.type === "divider" ? " lesson-block-editor__card--divider" : ""
                }`}
                size="small"
                bordered={block.type !== "divider"}
                title={
                  <Space wrap>
                    <Text type="secondary">#{index + 1}</Text>
                    <Select
                      size="small"
                      style={{ width: 200 }}
                      value={block.type}
                      options={BLOCK_TYPES}
                      onChange={(v) => replaceBlockType(index, v as LessonContentBlock["type"])}
                    />
                    <Button size="small" icon={<UpOutlined />} disabled={index === 0} onClick={() => move(index, -1)} />
                    <Button
                      size="small"
                      icon={<DownOutlined />}
                      disabled={index === blocks.length - 1}
                      onClick={() => move(index, 1)}
                    />
                    <Button size="small" danger icon={<DeleteOutlined />} onClick={() => remove(index)} />
                  </Space>
                }
              >
                {blockEditorInner}
              </Card>
            )}
            {!deckSingleElement && index === blocks.length - 1 ? (
            <div className="lesson-block-editor__insert-row">
              <Dropdown
                menu={{
                  items: BLOCK_TYPES.map((t) => ({
                    key: t.value,
                    label: t.label,
                    onClick: () => insertBlockAt(index + 1, t.value)
                  }))
                }}
              >
                <Button size="small" type="text" icon={<PlusOutlined />}>
                  Добавить блок
                </Button>
              </Dropdown>
            </div>
          ) : null}
        </div>
        );
      })}
    </Space>
  );
}
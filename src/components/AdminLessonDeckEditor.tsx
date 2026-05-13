import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Dropdown, Input, Modal, Select, Space, Typography, Upload, message, type MenuProps } from "antd";
import {
  CopyOutlined,
  MoreOutlined,
  PlusOutlined,
  UploadOutlined
} from "@ant-design/icons";
import { Rnd } from "react-rnd";
import type { LessonContentDeck, LessonDeckElement, LessonDeckSlide } from "@/shared/types/lessonContent";
import { newLessonBlockId, flattenDeckToBlocks } from "@/shared/lessonContentBlocks";
import { AdminLessonBlockEditor, createAdminLessonBlock } from "@/components/AdminLessonBlockEditor";
import { apiClient } from "@/shared/api/client";
import { resolveLessonMediaUrl } from "@/shared/lessonMediaUrl";
import type { UploadProps } from "antd";

const { Text } = Typography;

const ADD_TYPES = [
  { key: "text", label: "Текст" },
  { key: "media", label: "Медиа" },
  { key: "studio", label: "Мини-разработка" },
  { key: "checkpoint", label: "Вопрос" }
] as const;

export type AdminLessonDeckEditorProps = {
  deck: LessonContentDeck;
  onChange: (next: LessonContentDeck) => void;
};

function updateSlide(slides: LessonDeckSlide[], index: number, patch: Partial<LessonDeckSlide>): LessonDeckSlide[] {
  return slides.map((s, i) => (i === index ? { ...s, ...patch } : s));
}

function updateElement(
  slides: LessonDeckSlide[],
  slideIndex: number,
  elementId: string,
  patch: Partial<LessonDeckElement>
): LessonDeckSlide[] {
  return slides.map((s, si) => {
    if (si !== slideIndex) {
      return s;
    }
    return {
      ...s,
      elements: s.elements.map((el) => (el.id === elementId ? { ...el, ...patch } : el))
    };
  });
}

function removeElement(slides: LessonDeckSlide[], slideIndex: number, elementId: string): LessonDeckSlide[] {
  return slides.map((s, si) => {
    if (si !== slideIndex) {
      return s;
    }
    return { ...s, elements: s.elements.filter((el) => el.id !== elementId) };
  });
}

export function AdminLessonDeckEditor({ deck, onChange }: AdminLessonDeckEditorProps) {
  const slides = deck.slides ?? [];
  const [slideIndex, setSlideIndex] = useState(0);
  const safeIndex = Math.min(Math.max(0, slideIndex), Math.max(0, slides.length - 1));
  const slide = slides[safeIndex];
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 960, h: 540 });
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);

  useLayoutEffect(() => {
    const el = canvasRef.current;
    if (!el) {
      return;
    }
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setCanvasSize({ w: Math.max(1, r.width), h: Math.max(1, r.height) });
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    setCanvasSize({ w: Math.max(1, r.width), h: Math.max(1, r.height) });
    return () => ro.disconnect();
  }, [safeIndex, slide?.id]);

  useEffect(() => {
    if (!slide?.elements.length) {
      setSelectedElementId(null);
      return;
    }
    setSelectedElementId((cur) => (cur && slide.elements.some((e) => e.id === cur) ? cur : slide.elements[0]!.id));
  }, [safeIndex, slide?.id, slide?.elements.length]);

  const setSlides = useCallback(
    (nextSlides: LessonDeckSlide[]) => {
      onChange({ schemaVersion: 1, slides: nextSlides });
    },
    [onChange]
  );

  const totalElements = useMemo(() => slides.reduce((acc, s) => acc + s.elements.length, 0), [slides]);

  const addElement = (type: (typeof ADD_TYPES)[number]["key"]) => {
    if (!slide) {
      return;
    }
    if (totalElements >= 100) {
      message.warning("Не больше 100 элементов на весь урок.");
      return;
    }
    const block = createAdminLessonBlock(type);
    const y = Math.min(58, 8 + slide.elements.length * 5);
    const isStudio = type === "studio";
    const el: LessonDeckElement = {
      id: newLessonBlockId(),
      layout: {
        x: 6 + (slide.elements.length % 3) * 8,
        y,
        w: isStudio ? 88 : 48,
        h: isStudio ? 58 : 24
      },
      zIndex: slide.elements.length,
      block
    };
    setSlides(updateSlide(slides, safeIndex, { elements: [...slide.elements, el] }));
    setSelectedElementId(el.id);
  };

  const applyLayout = (elementId: string, layout: LessonDeckElement["layout"]) => {
    if (!slide) {
      return;
    }
    setSlides(updateElement(slides, safeIndex, elementId, { layout }));
  };

  const replaceElementBlockType = (elementId: string, type: (typeof ADD_TYPES)[number]["key"]) => {
    if (!slide) {
      return;
    }
    const el = slide.elements.find((e) => e.id === elementId);
    if (!el || el.block.type === type) {
      return;
    }
    const nb = createAdminLessonBlock(type);
    const merged = { ...nb, id: el.block.id } as LessonDeckElement["block"];
    setSlides(updateElement(slides, safeIndex, elementId, { block: merged }));
  };

  const onDragStop = (elementId: string, d: { x: number; y: number }) => {
    const { w: cw, h: ch } = canvasSize;
    const x = (d.x / cw) * 100;
    const y = (d.y / ch) * 100;
    const el = slide?.elements.find((e) => e.id === elementId);
    if (!el) {
      return;
    }
    applyLayout(elementId, { ...el.layout, x, y });
  };

  const onResizeStop = (elementId: string, ref: HTMLElement, position: { x: number; y: number }) => {
    const { w: cw, h: ch } = canvasSize;
    const el = slide?.elements.find((e) => e.id === elementId);
    if (!el) {
      return;
    }
    const nw = ref.offsetWidth;
    const nh = ref.offsetHeight;
    applyLayout(elementId, {
      x: (position.x / cw) * 100,
      y: (position.y / ch) * 100,
      w: (nw / cw) * 100,
      h: (nh / ch) * 100
    });
  };

  const addSlide = () => {
    const bid = newLessonBlockId();
    const newSlide: LessonDeckSlide = {
      id: newLessonBlockId(),
      elements: [
        {
          id: newLessonBlockId(),
          layout: { x: 8, y: 10, w: 84, h: 14 },
          zIndex: 0,
          block: { id: bid, type: "text", body: "Новый слайд" }
        }
      ]
    };
    setSlides([...slides, newSlide]);
    setSlideIndex(slides.length);
  };

  const duplicateSlide = () => {
    if (!slide) {
      return;
    }
    const cloned: LessonDeckSlide = {
      id: newLessonBlockId(),
      title: slide.title ? `${slide.title} (копия)` : undefined,
      backgroundImageUrl: slide.backgroundImageUrl ?? null,
      elements: slide.elements.map((el) => ({
        ...el,
        id: newLessonBlockId(),
        block: { ...el.block, id: newLessonBlockId() } as typeof el.block
      }))
    };
    const next = [...slides.slice(0, safeIndex + 1), cloned, ...slides.slice(safeIndex + 1)];
    setSlides(next);
    setSlideIndex(safeIndex + 1);
  };

  const removeSlide = () => {
    if (slides.length <= 1) {
      message.warning("Нужен хотя бы один слайд.");
      return;
    }
    Modal.confirm({
      title: "Удалить слайд?",
      onOk: () => {
        const next = slides.filter((_, i) => i !== safeIndex);
        setSlides(next);
        setSlideIndex(Math.min(safeIndex, next.length - 1));
        setSelectedElementId(null);
      }
    });
  };

  const uploadBackground: UploadProps["customRequest"] = async (options) => {
    const { file, onError, onSuccess } = options;
    const blob = file as File;
    setUploadBusy(true);
    try {
      const fd = new FormData();
      fd.append("image", blob, blob.name || "bg.png");
      const res = await apiClient.postForm<{ url: string }>("/api/admin/uploads/lesson-image", fd);
      if (!slide) {
        return;
      }
      setSlides(updateSlide(slides, safeIndex, { backgroundImageUrl: res.url }));
      message.success("Фон загружен");
      onSuccess?.(res, new XMLHttpRequest());
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Ошибка загрузки");
      onError?.(e instanceof Error ? e : new Error("upload"));
    } finally {
      setUploadBusy(false);
    }
  };

  const zOrder = (elementId: string, dir: -1 | 1) => {
    if (!slide) {
      return;
    }
    const el = slide.elements.find((e) => e.id === elementId);
    if (!el) {
      return;
    }
    const cur = el.zIndex ?? 0;
    setSlides(updateElement(slides, safeIndex, elementId, { zIndex: Math.max(0, cur + dir) }));
  };

  const blockCount = flattenDeckToBlocks(deck).length;

  if (!slide) {
    return <Text type="secondary">Нет слайдов — добавьте первый.</Text>;
  }

  const bg = slide.backgroundImageUrl?.trim();

  const activeDeckElementId = selectedElementId ?? slide.elements[0]?.id ?? null;
  const activeDeckElement = activeDeckElementId
    ? slide.elements.find((e) => e.id === activeDeckElementId)
    : undefined;

  const deckCanvasMoreMenu: MenuProps["items"] =
    activeDeckElementId && activeDeckElement
      ? [
          {
            key: "type",
            label: "Тип элемента",
            children: ADD_TYPES.map((t) => ({
              key: `t-${t.key}`,
              label: t.label,
              disabled: activeDeckElement.block.type === t.key,
              onClick: () => replaceElementBlockType(activeDeckElementId, t.key)
            }))
          },
          { type: "divider" },
          {
            key: "z-back",
            label: "Ниже по слою",
            onClick: () => zOrder(activeDeckElementId, -1)
          },
          {
            key: "z-front",
            label: "Выше по слою",
            onClick: () => zOrder(activeDeckElementId, 1)
          },
          { type: "divider" },
          {
            key: "del",
            danger: true,
            label: "Удалить элемент",
            onClick: () => {
              Modal.confirm({
                title: "Удалить элемент?",
                onOk: () => {
                  setSlides(removeElement(slides, safeIndex, activeDeckElementId));
                  setSelectedElementId(null);
                }
              });
            }
          }
        ]
      : [];

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }} className="admin-lesson-deck-editor">
      <Card size="small" title="Слайды">
        <Space wrap>
          <Button onClick={() => setSlideIndex((i) => Math.max(0, i - 1))} disabled={safeIndex <= 0}>
            ←
          </Button>
          <Text>
            {safeIndex + 1} / {slides.length} · элементов всего: {totalElements} (в JSON блоков: {blockCount})
          </Text>
          <Button
            onClick={() => setSlideIndex((i) => Math.min(slides.length - 1, i + 1))}
            disabled={safeIndex >= slides.length - 1}
          >
            →
          </Button>
          <Button type="dashed" icon={<PlusOutlined />} onClick={addSlide}>
            Слайд
          </Button>
          <Button icon={<CopyOutlined />} onClick={duplicateSlide}>
            Дублировать слайд
          </Button>
          <Button danger onClick={removeSlide}>
            Удалить слайд
          </Button>
        </Space>
      </Card>

      <Card size="small" title="Параметры слайда">
        <Space direction="vertical" style={{ width: "100%" }}>
          <Input
            placeholder="Заголовок (для навигации)"
            value={slide.title ?? ""}
            onChange={(e) => setSlides(updateSlide(slides, safeIndex, { title: e.target.value || undefined }))}
          />
          <Space wrap>
            <Upload accept="image/*" showUploadList={false} customRequest={uploadBackground}>
              <Button icon={<UploadOutlined />} loading={uploadBusy}>
                Фон (картинка)
              </Button>
            </Upload>
            {slide.backgroundImageUrl ? (
              <Button onClick={() => setSlides(updateSlide(slides, safeIndex, { backgroundImageUrl: null }))}>
                Сбросить фон
              </Button>
            ) : null}
          </Space>
        </Space>
      </Card>

      <Card size="small" title="Канвас 16:9">
        <Space wrap style={{ marginBottom: 8 }}>
          <Dropdown
            menu={{
              items: ADD_TYPES.map((t) => ({
                key: t.key,
                label: t.label,
                onClick: () => addElement(t.key)
              }))
            }}
          >
            <Button type="primary" icon={<PlusOutlined />}>
              Добавить элемент
            </Button>
          </Dropdown>
          <Text type="secondary">
            Текст: перетаскивание за рамку (не за поле ввода). Размер букв — «М / Н / К» над полем. Тип и слой — кнопка «⋯».
          </Text>
        </Space>
        {slide.elements.length > 0 ? (
          <div className="admin-lesson-deck-editor__element-picker">
            {slide.elements.length > 1 ? (
              <>
                <Text type="secondary">Активный:</Text>
                <Select
                  size="small"
                  style={{ minWidth: 200 }}
                  placeholder="Элемент"
                  value={selectedElementId ?? undefined}
                  options={slide.elements.map((el, idx) => ({
                    value: el.id,
                    label: `Элемент ${idx + 1}`
                  }))}
                  onChange={(id) => setSelectedElementId(id)}
                />
              </>
            ) : null}
            <Dropdown menu={{ items: deckCanvasMoreMenu }} trigger={["click"]} disabled={!activeDeckElementId}>
              <Button size="small" type="default" icon={<MoreOutlined aria-label="Действия с элементом" />} />
            </Dropdown>
          </div>
        ) : null}
        <div
          ref={canvasRef}
          className="admin-lesson-deck-editor__canvas"
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "16 / 9",
            backgroundColor: "var(--ant-color-fill-quaternary, #f5f5f5)",
            ...(bg
              ? {
                  backgroundImage: `url(${resolveLessonMediaUrl(bg)})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center"
                }
              : {})
          }}
        >
          {slide.elements.map((el) => {
            const { w: cw, h: ch } = canvasSize;
            const pxW = (el.layout.w / 100) * cw;
            const pxH = (el.layout.h / 100) * ch;
            const pxX = (el.layout.x / 100) * cw;
            const pxY = (el.layout.y / 100) * ch;
            const selected = el.id === selectedElementId;
            const isStudio = el.block.type === "studio";
            const isText = el.block.type === "text";
            return (
              <Rnd
                key={el.id}
                bounds="parent"
                size={{ width: pxW, height: pxH }}
                position={{ x: pxX, y: pxY }}
                cancel="textarea, input, button, a, .ant-input, .ant-input-affix-wrapper, .ant-input-number, .ant-select, .ant-select-selector, .ant-upload, .ant-btn, .ant-dropdown-trigger, [role='combobox'], [role='listbox'], [role='menuitem']"
                enableResizing={!isStudio && !isText}
                onDragStop={(_e, d) => onDragStop(el.id, d)}
                onResizeStop={!isStudio && !isText ? (_e, _dir, ref, _delta, position) => onResizeStop(el.id, ref, position) : undefined}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setSelectedElementId(el.id);
                }}
                className={`admin-lesson-deck-editor__rnd${selected ? " admin-lesson-deck-editor__rnd--selected" : ""}${isStudio ? " admin-lesson-deck-editor__rnd--studio" : ""}`}
                style={{ zIndex: 10 + (el.zIndex ?? 0) }}
              >
                <div className="admin-lesson-deck-editor__rnd-inner">
                  <div className="admin-lesson-deck-editor__rnd-body">
                    <AdminLessonBlockEditor
                      deckSingleElement
                      blocks={[el.block]}
                      onChange={(next) => {
                        const b = next[0];
                        if (!b || b.type === "divider") {
                          return;
                        }
                        const preservedId = el.block.id;
                        const merged = { ...b, id: preservedId } as typeof b;
                        setSlides(updateElement(slides, safeIndex, el.id, { block: merged }));
                      }}
                    />
                  </div>
                </div>
              </Rnd>
            );
          })}
        </div>
      </Card>
    </Space>
  );
}

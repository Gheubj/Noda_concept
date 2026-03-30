import { useEffect, useRef } from "react";
import { Alert, Card, Segmented, Space, Tag, Tooltip, Typography } from "antd";
import * as Blockly from "blockly";
import { useAppStore } from "@/store/useAppStore";
import type { WorkspaceLevel } from "@/store/useAppStore";
import { predictByModelType, trainByModelType } from "@/features/model/mlEngine";
import type { ModelType } from "@/shared/types/ai";

const { Paragraph, Text } = Typography;

const DEFAULT_TRAIN_CONFIG = {
  trainSplit: 0.7,
  valSplit: 0.15,
  testSplit: 0.15,
  epochs: 80,
  learningRate: 0.02
} as const;

type BlockCommand =
  | { type: "start" }
  | {
      type: "train";
      modelType: ModelType;
      datasetRef: string;
      trainSplit: number;
      valSplit: number;
      testSplit: number;
      epochs: number;
      learningRate: number;
    }
  | { type: "set_input"; value: string }
  | { type: "predict"; modelType: ModelType; inputRef: string };

function isImageModel(modelType: ModelType) {
  return modelType === "image_knn";
}

function getTrainDatasetOptions(modelType: ModelType) {
  const state = useAppStore.getState();
  const merged = isImageModel(modelType)
    ? state.imageDatasets
        .filter((item) => item.taskType === "classification")
        .map((item) => [`Image: ${item.title}`, `image:${item.id}`] as [string, string])
    : state.tabularDatasets.map(
        (item) => [`Tabular: ${item.title}`, `tabular:${item.id}`] as [string, string]
      );
  return merged.length > 0 ? merged : ([["нет данных", "none"]] as [string, string][]);
}

function getPredictInputOptions(modelType: ModelType) {
  const state = useAppStore.getState();
  const merged = isImageModel(modelType)
    ? state.imagePredictionInputs.map(
        (item) => [`Image input: ${item.title}`, `image:${item.id}`] as [string, string]
      )
    : state.tabularPredictionInputs.map(
        (item) => [`Tabular input: ${item.title}`, `tabular:${item.id}`] as [string, string]
      );
  return merged.length > 0
    ? merged
    : ([["нет входных данных", "none"]] as [string, string][]);
}

/** Уровень 3 пока как 2 — только набор блоков в палитре */
function effectiveToolboxLevel(level: WorkspaceLevel): 1 | 2 {
  return level === 1 ? 1 : 2;
}

function getToolboxDefinition(level: 1 | 2): Blockly.utils.toolbox.ToolboxDefinition {
  if (level === 1) {
    return {
      kind: "flyoutToolbox",
      contents: [
        { kind: "block", type: "noda_start" },
        { kind: "block", type: "noda_train_model_simple" },
        { kind: "block", type: "noda_predict_class" }
      ]
    };
  }
  return {
    kind: "flyoutToolbox",
    contents: [
      { kind: "block", type: "noda_start" },
      { kind: "block", type: "noda_train_model" },
      { kind: "block", type: "noda_set_predict_input" },
      { kind: "block", type: "noda_predict_class" }
    ]
  };
}

function registerBlocks() {
  if (Blockly.Blocks.noda_start) {
    return;
  }
  Blockly.Blocks.noda_start = {
    init() {
      this.appendDummyInput().appendField("Старт");
      this.setNextStatement(true, null);
      this.setColour(20);
      this.setDeletable(false);
      this.setMovable(false);
    }
  };
  /** Уровень 1: только модель и датасет */
  Blockly.Blocks.noda_train_model_simple = {
    init() {
      this.appendDummyInput()
        .appendField("обучить модель")
        .appendField(
          new Blockly.FieldDropdown([
            ["Image KNN (картинки)", "image_knn"],
            ["Регрессия (linear)", "tabular_regression"],
            ["Классификация (логистическая)", "tabular_classification"],
            ["Нейросеть (MLP)", "tabular_neural"]
          ]),
          "MODEL_TYPE"
        )
        .appendField("данные")
        .appendField(
          new Blockly.FieldDropdown(function () {
            const modelType = this.getSourceBlock()?.getFieldValue("MODEL_TYPE") as ModelType;
            return getTrainDatasetOptions(modelType);
          }),
          "DATASET_REF"
        );
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(220);
    }
  };
  /** Уровень 2+: сплит, эпохи, lr */
  Blockly.Blocks.noda_train_model = {
    init() {
      this.appendDummyInput()
        .appendField("обучить модель")
        .appendField(
          new Blockly.FieldDropdown([
            ["Image KNN (картинки)", "image_knn"],
            ["Регрессия (linear)", "tabular_regression"],
            ["Классификация (логистическая)", "tabular_classification"],
            ["Нейросеть (MLP)", "tabular_neural"]
          ]),
          "MODEL_TYPE"
        )
        .appendField("данные")
        .appendField(
          new Blockly.FieldDropdown(function () {
            const modelType = this.getSourceBlock()?.getFieldValue("MODEL_TYPE") as ModelType;
            return getTrainDatasetOptions(modelType);
          }),
          "DATASET_REF"
        );
      this.appendDummyInput()
        .appendField("train")
        .appendField(new Blockly.FieldNumber(0.7, 0.1, 0.9, 0.05), "TRAIN_SPLIT")
        .appendField("val")
        .appendField(new Blockly.FieldNumber(0.15, 0.05, 0.4, 0.05), "VAL_SPLIT")
        .appendField("test")
        .appendField(new Blockly.FieldNumber(0.15, 0.05, 0.4, 0.05), "TEST_SPLIT");
      this.appendDummyInput()
        .appendField("epochs")
        .appendField(new Blockly.FieldNumber(80, 5, 500, 5), "EPOCHS")
        .appendField("lr")
        .appendField(new Blockly.FieldNumber(0.02, 0.0001, 1, 0.001), "LR");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(220);
    }
  };
  Blockly.Blocks.noda_set_predict_input = {
    init() {
      this.appendDummyInput()
        .appendField("ввести данные для распознавания")
        .appendField(new Blockly.FieldTextInput("5.1,3.5,1.4,0.2"), "MANUAL_INPUT");
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(120);
    }
  };
  Blockly.Blocks.noda_predict_class = {
    init() {
      this.appendDummyInput()
        .appendField("предсказать")
        .appendField(
          new Blockly.FieldDropdown([
            ["Image KNN (картинки)", "image_knn"],
            ["Регрессия (linear)", "tabular_regression"],
            ["Классификация (логистическая)", "tabular_classification"],
            ["Нейросеть (MLP)", "tabular_neural"]
          ]),
          "MODEL_TYPE"
        )
        .appendField("вход")
        .appendField(
          new Blockly.FieldDropdown(function () {
            const modelType = this.getSourceBlock()?.getFieldValue("MODEL_TYPE") as ModelType;
            return getPredictInputOptions(modelType);
          }),
          "INPUT_REF"
        );
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160);
    }
  };
}

function getDefaultWorkspaceJson(trainBlockType: "noda_train_model_simple" | "noda_train_model") {
  const blocks: Record<string, unknown>[] = [
    { type: "noda_start", x: 20, y: 20 },
    { type: trainBlockType, x: 20, y: 100 }
  ];
  if (trainBlockType === "noda_train_model") {
    blocks.push(
      { type: "noda_set_predict_input", x: 20, y: 180 },
      { type: "noda_predict_class", x: 20, y: 260 }
    );
  } else {
    blocks.push({ type: "noda_predict_class", x: 20, y: 180 });
  }
  return {
    blocks: {
      languageVersion: 0,
      blocks
    }
  };
}

export function BlocklyWorkspace() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const workspaceRef = useRef<Blockly.WorkspaceSvg | null>(null);
  const isRunningRef = useRef(false);
  const {
    prediction,
    evaluation,
    training,
    blocklyState,
    workspaceLevel,
    setWorkspaceLevel
  } = useAppStore();

  const readCommandsFromStart = (): BlockCommand[] => {
    const workspace = workspaceRef.current;
    if (!workspace) {
      return [];
    }
    const startBlock = workspace.getTopBlocks(true).find((block) => block.type === "noda_start");
    if (!startBlock) {
      return [];
    }
    const commands: BlockCommand[] = [{ type: "start" }];
    let current = startBlock.getNextBlock();
    while (current) {
      if (current.type === "noda_train_model_simple") {
        commands.push({
          type: "train",
          modelType: current.getFieldValue("MODEL_TYPE") as ModelType,
          datasetRef: current.getFieldValue("DATASET_REF"),
          ...DEFAULT_TRAIN_CONFIG
        });
      }
      if (current.type === "noda_train_model") {
        const trainSplit = Number(current.getFieldValue("TRAIN_SPLIT")) || 0.7;
        const valSplit = Number(current.getFieldValue("VAL_SPLIT")) || 0.15;
        const testSplit = Number(current.getFieldValue("TEST_SPLIT")) || 0.15;
        const epochs = Number(current.getFieldValue("EPOCHS")) || 80;
        const learningRate = Number(current.getFieldValue("LR")) || 0.02;
        commands.push({
          type: "train",
          modelType: current.getFieldValue("MODEL_TYPE") as ModelType,
          datasetRef: current.getFieldValue("DATASET_REF"),
          trainSplit,
          valSplit,
          testSplit,
          epochs,
          learningRate
        });
      }
      if (current.type === "noda_set_predict_input") {
        commands.push({
          type: "set_input",
          value: current.getFieldValue("MANUAL_INPUT")
        });
      }
      if (current.type === "noda_predict_class") {
        commands.push({
          type: "predict",
          modelType: current.getFieldValue("MODEL_TYPE") as ModelType,
          inputRef: current.getFieldValue("INPUT_REF")
        });
      }
      current = current.getNextBlock();
    }
    return commands;
  };

  const runProgram = async () => {
    if (isRunningRef.current) {
      return;
    }
    isRunningRef.current = true;
    try {
      const state = useAppStore.getState();
      const commands = readCommandsFromStart();
      if (commands.length === 0) {
        state.setTraining({
          isTraining: false,
          message: "Добавь блок Старт и соедини с ним блоки обучения/предсказания."
        });
        return;
      }

      for (const command of commands) {
        if (command.type === "train") {
          state.setLastModelType(command.modelType);
          const [kind, id] = command.datasetRef.split(":");
          const imageDataset =
            kind === "image" ? state.imageDatasets.find((item) => item.id === id) : null;
          const tabularDataset =
            kind === "tabular"
              ? state.tabularDatasets.find((item) => item.id === id)?.dataset ?? null
              : null;
          if (command.modelType === "image_knn" && !imageDataset) {
            throw new Error("Для image модели выбери image dataset в блоке обучения.");
          }
          if (command.modelType !== "image_knn" && !tabularDataset) {
            throw new Error("Для tabular модели выбери tabular dataset в блоке обучения.");
          }
          state.setTraining({
            isTraining: true,
            progress: 0,
            message: `Запуск обучения: ${command.modelType}`
          });
          const splitSum = command.trainSplit + command.valSplit + command.testSplit;
          if (Math.abs(splitSum - 1) > 0.02) {
            throw new Error("Сумма train/val/test должна быть около 1.0");
          }
          const evalResult = await trainByModelType({
            modelType: command.modelType,
            classes: imageDataset?.classes ?? [],
            tabularDataset,
            config: {
              trainSplit: command.trainSplit,
              valSplit: command.valSplit,
              testSplit: command.testSplit,
              epochs: command.epochs,
              learningRate: command.learningRate
            },
            onProgress: (progress, message) => {
              state.setTraining({ progress, message });
            }
          });
          state.setEvaluation(evalResult);
          state.setTraining({ isTraining: false, progress: 100, message: "Обучение завершено." });
        }
        if (command.type === "set_input") {
          state.setWorkspaceTabularInput(command.value);
        }
        if (command.type === "predict") {
          state.setLastModelType(command.modelType);
          const [kind, id] = command.inputRef.split(":");
          const imageInput =
            kind === "image" ? state.imagePredictionInputs.find((item) => item.id === id) : null;
          const tabularInput =
            kind === "tabular"
              ? state.tabularPredictionInputs.find((item) => item.id === id)?.input ?? ""
              : "";
          if (command.modelType === "image_knn" && !imageInput) {
            throw new Error("Для image предсказания выбери image input в блоке предсказания.");
          }
          const manualFallback = state.workspaceTabularInput.trim();
          if (command.modelType !== "image_knn" && !tabularInput && !manualFallback) {
            throw new Error(
              "Для таблиц: добавь вход в библиотеке (вкладка «Данные для предсказания») или на уровне 2 поставь блок «ввести данные для распознавания» перед «предсказать»."
            );
          }
          const labelsMap = state.imageDatasets
            .flatMap((dataset) => dataset.classes)
            .reduce<Record<string, string>>((acc, item) => {
              acc[item.labelId] = item.title;
              return acc;
            }, {});
          const result = await predictByModelType({
            modelType: command.modelType,
            predictionFile: imageInput?.file ?? null,
            labelsMap,
            tabularInput: tabularInput || manualFallback
          });
          state.setPrediction(result);
        }
      }
    } catch (error) {
      useAppStore.getState().setTraining({
        isTraining: false,
        message: error instanceof Error ? error.message : "Ошибка выполнения сценария"
      });
    } finally {
      isRunningRef.current = false;
    }
  };

  useEffect(() => {
    registerBlocks();
    if (!containerRef.current) {
      return;
    }
    const level = useAppStore.getState().workspaceLevel;
    const toolboxLevel = effectiveToolboxLevel(level);
    const toolbox = getToolboxDefinition(toolboxLevel);
    workspaceRef.current = Blockly.inject(containerRef.current, {
      toolbox,
      trashcan: true,
      grid: {
        spacing: 20,
        length: 3,
        colour: "#e0e0e0",
        snap: false
      },
      move: {
        scrollbars: true,
        drag: true,
        wheel: true
      },
      zoom: {
        controls: true,
        wheel: true,
        startScale: 1,
        maxScale: 3,
        minScale: 0.3,
        scaleSpeed: 1.2
      }
    });
    const trainType = toolboxLevel === 1 ? "noda_train_model_simple" : "noda_train_model";
    const initialState =
      blocklyState.trim().length > 0
        ? JSON.parse(blocklyState)
        : getDefaultWorkspaceJson(trainType);
    Blockly.serialization.workspaces.load(initialState, workspaceRef.current);
    const clickHandler = (event: Blockly.Events.Abstract) => {
      if (!workspaceRef.current) {
        return;
      }
      const selectedBlockId =
        (event as unknown as { blockId?: string }).blockId ??
        (event as unknown as { newElementId?: string }).newElementId;
      if (!selectedBlockId) {
        return;
      }
      const block = workspaceRef.current.getBlockById(selectedBlockId);
      if (!block) {
        return;
      }
      const isClickType =
        event.type === Blockly.Events.CLICK || event.type === Blockly.Events.SELECTED;
      if (isClickType && block.type === "noda_start") {
        void runProgram();
      }
    };
    const persistHandler = () => {
      if (!workspaceRef.current) {
        return;
      }
      const saved = Blockly.serialization.workspaces.save(workspaceRef.current);
      useAppStore.getState().setBlocklyState(JSON.stringify(saved));
    };
    workspaceRef.current.addChangeListener(clickHandler);
    workspaceRef.current.addChangeListener(persistHandler);
    const resizeHandler = () => {
      if (workspaceRef.current) {
        Blockly.svgResize(workspaceRef.current);
      }
    };
    window.addEventListener("resize", resizeHandler);
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", resizeHandler);
      vv.addEventListener("scroll", resizeHandler);
    }
    resizeHandler();
    return () => {
      workspaceRef.current?.removeChangeListener(clickHandler);
      workspaceRef.current?.removeChangeListener(persistHandler);
      window.removeEventListener("resize", resizeHandler);
      if (vv) {
        vv.removeEventListener("resize", resizeHandler);
        vv.removeEventListener("scroll", resizeHandler);
      }
      workspaceRef.current?.dispose();
      workspaceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const ws = workspaceRef.current;
    if (!ws) {
      return;
    }
    const eff = effectiveToolboxLevel(workspaceLevel);
    ws.updateToolbox(getToolboxDefinition(eff));
    Blockly.svgResize(ws);
  }, [workspaceLevel]);

  useEffect(() => {
    if (!workspaceRef.current || !blocklyState) {
      return;
    }
    const saved = Blockly.serialization.workspaces.save(workspaceRef.current);
    const current = JSON.stringify(saved);
    if (current === blocklyState) {
      return;
    }
    try {
      Blockly.serialization.workspaces.load(JSON.parse(blocklyState), workspaceRef.current);
      Blockly.svgResize(workspaceRef.current);
    } catch {
      // Ignore malformed saved state.
    }
  }, [blocklyState]);

  const showManualInputHint = effectiveToolboxLevel(workspaceLevel) === 2;

  return (
    <Card
      size="small"
      title="Blockly Workspace"
      className="workspace-card"
      extra={
        <Space size={8} wrap>
          {workspaceLevel === 3 ? (
            <Tag color="processing">Скоро больше настроек</Tag>
          ) : null}
          <Segmented<WorkspaceLevel>
            size="small"
            value={workspaceLevel}
            onChange={(v) => setWorkspaceLevel(v)}
            options={[
              { label: "Уровень 1", value: 1 },
              { label: "Уровень 2", value: 2 },
              { label: "Уровень 3", value: 3 }
            ]}
          />
        </Space>
      }
    >
      <Paragraph>
        Выполняется цепочка от блока <Text strong>Старт</Text>. Нажми на «Старт», чтобы запустить.
      </Paragraph>
      {showManualInputHint ? (
        <Paragraph type="secondary" style={{ marginBottom: 8 }}>
          <Tooltip title="Для табличных моделей: если не создавал вход в библиотеке, впиши числа в блок «ввести данные для распознавания» перед «предсказать».">
            <span>Подсказка уровня 2: ручной ввод чисел для таблиц — см. блок ниже в палитре.</span>
          </Tooltip>
        </Paragraph>
      ) : null}
      <Space direction="vertical" size={10} style={{ width: "100%" }}>
        <div ref={containerRef} className="blockly-container" />
        <Alert type="info" showIcon message={training.message} />
        {prediction ? (
          <Alert
            type="success"
            showIcon
            message={`Результат: ${prediction.title}`}
            description={`Уверенность: ${(prediction.confidence * 100).toFixed(1)}%`}
          />
        ) : null}
        {evaluation ? (
          <Alert
            type="warning"
            showIcon
            message="Оценка модели"
            description={`${evaluation.summary}. ${Object.entries(evaluation.metrics)
              .map(([key, value]) => `${key}: ${value.toFixed(4)}`)
              .join(", ")}`}
          />
        ) : null}
      </Space>
    </Card>
  );
}

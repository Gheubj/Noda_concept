import * as mobilenet from "@tensorflow-models/mobilenet";
import * as knnClassifier from "@tensorflow-models/knn-classifier";
import * as tf from "@tensorflow/tfjs";
import type {
  DatasetClass,
  ModelEvaluation,
  ModelType,
  PredictionResult,
  TabularDataset,
  TrainConfig
} from "@/shared/types/ai";

let mobileNetModel: mobilenet.MobileNet | null = null;
const imageClassifier = knnClassifier.create();
let tabularModel: tf.LayersModel | null = null;
let tabularMode: "regression" | "classification" | null = null;
let classIndexToLabel: string[] = [];

async function getModel() {
  if (!mobileNetModel) {
    mobileNetModel = await mobilenet.load({ version: 2, alpha: 1 });
  }
  return mobileNetModel;
}

async function fileToImageBitmap(file: File) {
  return createImageBitmap(file);
}

export async function trainKnnModel(
  classes: DatasetClass[],
  onProgress: (progress: number, message: string) => void
) {
  imageClassifier.clearAllClasses();
  const model = await getModel();

  const totalSamples = classes.reduce((acc, item) => acc + item.files.length, 0);
  let processed = 0;

  for (const datasetClass of classes) {
    for (const file of datasetClass.files) {
      const bitmap = await fileToImageBitmap(file);
      const activation = tf.tidy(() => {
        const imageTensor = tf.browser.fromPixels(bitmap).toFloat();
        const resized = tf.image.resizeBilinear(imageTensor, [224, 224]);
        const normalized = resized.div(255);
        const batched = normalized.expandDims(0);
        return model.infer(batched, true) as tf.Tensor;
      });
      imageClassifier.addExample(activation, datasetClass.labelId);
      activation.dispose();
      bitmap.close();
      processed += 1;
      const progress = totalSamples > 0 ? Math.round((processed / totalSamples) * 100) : 100;
      onProgress(progress, `Обработано ${processed} из ${totalSamples} изображений`);
      await tf.nextFrame();
    }
  }
}

async function predictImageByFile(
  file: File,
  labelsMap: Record<string, string>
): Promise<PredictionResult | null> {
  const classCount = Object.keys(imageClassifier.getClassExampleCount()).length;
  if (classCount === 0) {
    return null;
  }

  const model = await getModel();
  const bitmap = await fileToImageBitmap(file);
  const activation = tf.tidy(() => {
    const imageTensor = tf.browser.fromPixels(bitmap).toFloat();
    const resized = tf.image.resizeBilinear(imageTensor, [224, 224]);
    const normalized = resized.div(255);
    const batched = normalized.expandDims(0);
    return model.infer(batched, true) as tf.Tensor;
  });

  const result = await imageClassifier.predictClass(activation);
  activation.dispose();
  bitmap.close();

  const title = labelsMap[result.label] ?? result.label;
  return {
    labelId: result.label,
    title,
    confidence: result.confidences[result.label] ?? 0
  };
}

function parseTabular(dataset: TabularDataset) {
  const rows = dataset.rows.filter((row) => row.length >= 2);
  if (rows.length < 2) {
    throw new Error("Для табличных моделей нужно минимум 2 строки данных.");
  }
  const featureCount = rows[0].length - 1;
  const x = rows.map((row) => row.slice(0, featureCount).map((value) => Number(value.trim())));
  if (x.some((row) => row.some((value) => Number.isNaN(value)))) {
    throw new Error("Все признаки в CSV должны быть числовыми.");
  }
  const yRaw = rows.map((row) => row[featureCount].trim());
  return { x, yRaw, featureCount };
}

async function trainTabularModel(
  modelType: ModelType,
  dataset: TabularDataset,
  config: TrainConfig,
  onProgress: (progress: number, message: string) => void
): Promise<ModelEvaluation> {
  const { x, yRaw, featureCount } = parseTabular(dataset);
  const indices = x.map((_, index) => index);
  tf.util.shuffle(indices);
  const total = indices.length;
  if (total < 3) {
    throw new Error("Для train/val/test нужно минимум 3 строки в CSV.");
  }
  let trainCount = Math.max(1, Math.floor(total * config.trainSplit));
  let valCount = Math.max(1, Math.floor(total * config.valSplit));
  let testCount = total - trainCount - valCount;
  if (testCount < 1) {
    testCount = 1;
  }
  while (trainCount + valCount + testCount > total) {
    if (trainCount >= valCount && trainCount >= testCount && trainCount > 1) {
      trainCount -= 1;
    } else if (valCount >= testCount && valCount > 1) {
      valCount -= 1;
    } else if (testCount > 1) {
      testCount -= 1;
    } else {
      break;
    }
  }
  const trainIdx = indices.slice(0, trainCount);
  const valIdx = indices.slice(trainCount, trainCount + valCount);
  const testIdx = indices.slice(trainCount + valCount, trainCount + valCount + testCount);
  const xTrain = tf.tensor2d(trainIdx.map((i) => x[i]));
  const xVal = tf.tensor2d(valIdx.map((i) => x[i]));
  const xTest = tf.tensor2d(testIdx.map((i) => x[i]));

  if (modelType === "tabular_regression") {
    const y = yRaw.map((value) => Number(value));
    if (y.some((value) => Number.isNaN(value))) {
      throw new Error("Для регрессии целевая колонка должна быть числом.");
    }
    const yTrain = tf.tensor2d(trainIdx.map((i) => [y[i]]));
    const yVal = tf.tensor2d(valIdx.map((i) => [y[i]]));
    const yTest = tf.tensor2d(testIdx.map((i) => [y[i]]));
    tabularModel?.dispose();
    tabularModel = tf.sequential({
      layers: [tf.layers.dense({ inputShape: [featureCount], units: 1 })]
    });
    tabularModel.compile({
      optimizer: tf.train.adam(config.learningRate),
      loss: "meanSquaredError",
      metrics: ["mse"]
    });
    await tabularModel.fit(xTrain, yTrain, {
      epochs: config.epochs,
      validationData: [xVal, yVal],
      callbacks: {
        onEpochEnd: async (epoch) => {
          onProgress(
            Math.round(((epoch + 1) / config.epochs) * 100),
            `Эпоха ${epoch + 1}/${config.epochs}`
          );
          await tf.nextFrame();
        }
      }
    });
    const testEval = tabularModel.evaluate(xTest, yTest) as tf.Tensor | tf.Tensor[];
    const evalTensor = Array.isArray(testEval) ? testEval[0] : testEval;
    const mseValue = (await evalTensor.data())[0] ?? 0;
    tabularMode = "regression";
    classIndexToLabel = [];
    xTrain.dispose();
    xVal.dispose();
    xTest.dispose();
    yTrain.dispose();
    yVal.dispose();
    yTest.dispose();
    return {
      summary: `Regression test MSE: ${mseValue.toFixed(4)}`,
      metrics: { testMSE: mseValue }
    };
  }

  const uniqueLabels = [...new Set(yRaw)];
  const labelToIndex = uniqueLabels.reduce<Record<string, number>>((acc, value, index) => {
    acc[value] = index;
    return acc;
  }, {});
  const yIndices = yRaw.map((value) => labelToIndex[value]);
  const buildOneHot = (rows: number[]) =>
    tf.oneHot(tf.tensor1d(rows.map((i) => yIndices[i]), "int32"), uniqueLabels.length);
  const yTrain = buildOneHot(trainIdx);
  const yVal = buildOneHot(valIdx);
  const yTest = buildOneHot(testIdx);

  tabularModel?.dispose();
  if (modelType === "tabular_neural") {
    tabularModel = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [featureCount], units: 16, activation: "relu" }),
        tf.layers.dense({ units: 8, activation: "relu" }),
        tf.layers.dense({ units: uniqueLabels.length, activation: "softmax" })
      ]
    });
  } else {
    tabularModel = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [featureCount],
          units: uniqueLabels.length,
          activation: "softmax"
        })
      ]
    });
  }
  tabularModel.compile({
    optimizer: tf.train.adam(config.learningRate),
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"]
  });
  await tabularModel.fit(xTrain, yTrain, {
    epochs: config.epochs,
    validationData: [xVal, yVal],
    callbacks: {
      onEpochEnd: async (epoch) => {
        onProgress(
          Math.round(((epoch + 1) / config.epochs) * 100),
          `Эпоха ${epoch + 1}/${config.epochs}`
        );
        await tf.nextFrame();
      }
    }
  });
  const evaluation = tabularModel.evaluate(xTest, yTest) as tf.Tensor[];
  const loss = (await evaluation[0].data())[0] ?? 0;
  const acc = (await evaluation[1].data())[0] ?? 0;
  tabularMode = "classification";
  classIndexToLabel = uniqueLabels;
  xTrain.dispose();
  xVal.dispose();
  xTest.dispose();
  yTrain.dispose();
  yVal.dispose();
  yTest.dispose();
  return {
    summary: `Classification test accuracy: ${(acc * 100).toFixed(1)}%`,
    metrics: { testLoss: loss, testAccuracy: acc }
  };
}

export async function trainByModelType(args: {
  modelType: ModelType;
  classes: DatasetClass[];
  tabularDataset: TabularDataset | null;
  config: TrainConfig;
  onProgress: (progress: number, message: string) => void;
}): Promise<ModelEvaluation> {
  if (args.modelType === "image_knn") {
    await trainKnnModel(args.classes, args.onProgress);
    const sampleCount = args.classes.reduce((sum, item) => sum + item.files.length, 0);
    return {
      summary: `Image KNN обучен на ${sampleCount} изображениях`,
      metrics: { samples: sampleCount }
    };
  }
  if (!args.tabularDataset) {
    throw new Error("Для табличной модели сначала загрузи CSV в библиотеке.");
  }
  return trainTabularModel(args.modelType, args.tabularDataset, args.config, args.onProgress);
}

function parsePredictionFeatures(input: string) {
  const values = input
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => !Number.isNaN(item));
  if (values.length === 0) {
    throw new Error("Введите признаки для предсказания, например: 1.2, 3.4, 5");
  }
  return values;
}

async function predictTabularByInput(input: string): Promise<PredictionResult | null> {
  if (!tabularModel || !tabularMode) {
    return null;
  }
  const features = parsePredictionFeatures(input);
  const x = tf.tensor2d([features]);
  const y = tabularModel.predict(x) as tf.Tensor;
  const values = Array.from(await y.data());
  x.dispose();
  y.dispose();

  if (tabularMode === "regression") {
    const value = values[0] ?? 0;
    return {
      labelId: "regression_output",
      title: `Прогноз: ${value.toFixed(4)}`,
      confidence: 1
    };
  }

  let maxIndex = 0;
  let maxValue = values[0] ?? 0;
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] > maxValue) {
      maxValue = values[i];
      maxIndex = i;
    }
  }
  const title = classIndexToLabel[maxIndex] ?? `class_${maxIndex}`;
  return {
    labelId: title,
    title,
    confidence: maxValue
  };
}

export async function predictByModelType(args: {
  modelType: ModelType;
  predictionFile: File | null;
  labelsMap: Record<string, string>;
  tabularInput: string;
}) {
  if (args.modelType === "image_knn") {
    if (!args.predictionFile) {
      throw new Error("Для image модели нужно выбрать изображение для предсказания.");
    }
    return predictImageByFile(args.predictionFile, args.labelsMap);
  }
  return predictTabularByInput(args.tabularInput);
}

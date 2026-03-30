import { create } from "zustand";
import type {
  ImageDataset,
  ImagePredictionInput,
  ModelType,
  ModelEvaluation,
  PredictionResult,
  TabularDataset,
  TabularDatasetEntry,
  TabularPredictionInput,
  TrainingState
} from "@/shared/types/ai";
import type { NodaProjectMeta, NodaProjectSnapshot } from "@/shared/types/project";

export type WorkspaceLevel = 1 | 2 | 3;

const WORKSPACE_LEVEL_KEY = "noda_workspace_level";

function readWorkspaceLevel(): WorkspaceLevel {
  const raw = localStorage.getItem(WORKSPACE_LEVEL_KEY);
  if (raw === "1" || raw === "2" || raw === "3") {
    return Number(raw) as WorkspaceLevel;
  }
  return 1;
}

interface AppState {
  activeProject: NodaProjectMeta | null;
  imageDatasets: ImageDataset[];
  tabularDatasets: TabularDatasetEntry[];
  imagePredictionInputs: ImagePredictionInput[];
  tabularPredictionInputs: TabularPredictionInput[];
  prediction: PredictionResult | null;
  evaluation: ModelEvaluation | null;
  lastModelType: ModelType | null;
  blocklyState: string;
  workspaceTabularInput: string;
  workspaceLevel: WorkspaceLevel;
  training: TrainingState;
  setActiveProject: (project: NodaProjectMeta | null) => void;
  addImageDataset: (title: string, taskType: "classification" | "clustering") => string | null;
  addClassToImageDataset: (datasetId: string, title: string) => void;
  addSamplesToClass: (datasetId: string, labelId: string, files: File[]) => void;
  addUnlabeledSamplesToImageDataset: (datasetId: string, files: File[]) => void;
  clearUnlabeledSamples: (datasetId: string) => void;
  addTabularDataset: (title: string, dataset: TabularDataset) => void;
  addImagePredictionInput: (title: string, file: File) => void;
  addTabularPredictionInput: (title: string, input: string) => void;
  removeImageDataset: (id: string) => void;
  removeTabularDataset: (id: string) => void;
  removeImagePredictionInput: (id: string) => void;
  removeTabularPredictionInput: (id: string) => void;
  setPrediction: (result: PredictionResult | null) => void;
  setEvaluation: (value: ModelEvaluation | null) => void;
  setWorkspaceTabularInput: (value: string) => void;
  setLastModelType: (modelType: ModelType | null) => void;
  setBlocklyState: (value: string) => void;
  getProjectSnapshot: () => NodaProjectSnapshot;
  loadProjectSnapshot: (snapshot: NodaProjectSnapshot) => void;
  setTraining: (state: Partial<TrainingState>) => void;
  setWorkspaceLevel: (level: WorkspaceLevel) => void;
}

const createLabelId = (title: string) =>
  title.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9а-я_]/gi, "");
const createId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const useAppStore = create<AppState>((set, get) => ({
  activeProject: null,
  imageDatasets: [],
  tabularDatasets: [],
  imagePredictionInputs: [],
  tabularPredictionInputs: [],
  prediction: null,
  evaluation: null,
  lastModelType: null,
  blocklyState: "",
  workspaceTabularInput: "",
  workspaceLevel: readWorkspaceLevel(),
  training: {
    isTraining: false,
    progress: 0,
    message: "Ожидание"
  },
  setActiveProject: (project) => set({ activeProject: project }),
  addImageDataset: (title, taskType) => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      return null;
    }
    const exists = get().imageDatasets.some((item) => item.title === normalizedTitle);
    if (exists) {
      return null;
    }
    const id = createId();
    set((state) => ({
      imageDatasets: [
        ...state.imageDatasets,
        {
          id,
          title: normalizedTitle,
          taskType,
          classes: [],
          ...(taskType === "clustering" ? { unlabeledFiles: [] } : {})
        }
      ]
    }));
    return id;
  },
  addClassToImageDataset: (datasetId, title) =>
    set((state) => ({
      imageDatasets: state.imageDatasets.map((dataset) => {
        if (dataset.id !== datasetId) {
          return dataset;
        }
        const normalizedTitle = title.trim();
        if (!normalizedTitle) {
          return dataset;
        }
        const labelId = createLabelId(normalizedTitle);
        const exists = dataset.classes.some((item) => item.labelId === labelId);
        if (exists) {
          return dataset;
        }
        return {
          ...dataset,
          classes: [...dataset.classes, { labelId, title: normalizedTitle, files: [] }]
        };
      })
    })),
  addSamplesToClass: (datasetId, labelId, files) =>
    set((state) => ({
      imageDatasets: state.imageDatasets.map((dataset) =>
        dataset.id !== datasetId
          ? dataset
          : {
              ...dataset,
              classes: dataset.classes.map((item) =>
                item.labelId === labelId ? { ...item, files: [...item.files, ...files] } : item
              )
            }
      )
    })),
  addUnlabeledSamplesToImageDataset: (datasetId, files) =>
    set((state) => ({
      imageDatasets: state.imageDatasets.map((dataset) =>
        dataset.id !== datasetId
          ? dataset
          : {
              ...dataset,
              unlabeledFiles: [...(dataset.unlabeledFiles ?? []), ...files]
            }
      )
    })),
  clearUnlabeledSamples: (datasetId) =>
    set((state) => ({
      imageDatasets: state.imageDatasets.map((dataset) =>
        dataset.id !== datasetId ? dataset : { ...dataset, unlabeledFiles: [] }
      )
    })),
  addTabularDataset: (title, dataset) =>
    set((state) => ({
      tabularDatasets: [...state.tabularDatasets, { id: createId(), title: title.trim(), dataset }]
    })),
  addImagePredictionInput: (title, file) =>
    set((state) => ({
      imagePredictionInputs: [...state.imagePredictionInputs, { id: createId(), title: title.trim(), file }]
    })),
  addTabularPredictionInput: (title, input) =>
    set((state) => ({
      tabularPredictionInputs: [
        ...state.tabularPredictionInputs,
        { id: createId(), title: title.trim(), input: input.trim() }
      ]
    })),
  removeImageDataset: (id) =>
    set((state) => ({
      imageDatasets: state.imageDatasets.filter((ds) => ds.id !== id)
    })),
  removeTabularDataset: (id) =>
    set((state) => ({
      tabularDatasets: state.tabularDatasets.filter((ds) => ds.id !== id)
    })),
  removeImagePredictionInput: (id) =>
    set((state) => ({
      imagePredictionInputs: state.imagePredictionInputs.filter((item) => item.id !== id)
    })),
  removeTabularPredictionInput: (id) =>
    set((state) => ({
      tabularPredictionInputs: state.tabularPredictionInputs.filter((item) => item.id !== id)
    })),
  setPrediction: (result) => set({ prediction: result }),
  setEvaluation: (value) => set({ evaluation: value }),
  setWorkspaceTabularInput: (value) => set({ workspaceTabularInput: value }),
  setLastModelType: (modelType) => set({ lastModelType: modelType }),
  setBlocklyState: (value) => set({ blocklyState: value }),
  getProjectSnapshot: () => {
    const state = get();
    return {
      imageDatasets: state.imageDatasets,
      tabularDatasets: state.tabularDatasets,
      imagePredictionInputs: state.imagePredictionInputs,
      tabularPredictionInputs: state.tabularPredictionInputs,
      blocklyState: state.blocklyState
    };
  },
  loadProjectSnapshot: (snapshot) =>
    set({
      imageDatasets: snapshot.imageDatasets,
      tabularDatasets: snapshot.tabularDatasets,
      imagePredictionInputs: snapshot.imagePredictionInputs,
      tabularPredictionInputs: snapshot.tabularPredictionInputs,
      blocklyState: snapshot.blocklyState,
      prediction: null,
      evaluation: null,
      workspaceTabularInput: "",
      training: { isTraining: false, progress: 0, message: "Проект загружен" }
    }),
  setTraining: (nextState) =>
    set((state) => ({
      training: { ...state.training, ...nextState }
    })),
  setWorkspaceLevel: (level) => {
    localStorage.setItem(WORKSPACE_LEVEL_KEY, String(level));
    set({ workspaceLevel: level });
  }
}));

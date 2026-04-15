export interface LessonContentSlide {
  title: string;
  body: string;
  mediaUrl?: string | null;
}

export interface LessonContentPracticeStep {
  title: string;
  instruction: string;
  ctaAction?: string | null;
}

export interface LessonContentCheckpoint {
  question: string;
  expectedAnswer: string;
}

export interface LessonContentHint {
  title: string;
  text: string;
}

export interface LessonContent {
  presentationPdfUrl?: string | null;
  slides: LessonContentSlide[];
  practiceSteps: LessonContentPracticeStep[];
  checkpoints: LessonContentCheckpoint[];
  hints: LessonContentHint[];
}

export const EMPTY_LESSON_CONTENT: LessonContent = {
  presentationPdfUrl: null,
  slides: [],
  practiceSteps: [],
  checkpoints: [],
  hints: []
};

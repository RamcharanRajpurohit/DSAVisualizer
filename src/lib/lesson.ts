/**
 * Guided lessons (inspired by VisuAlgo's e-Lecture mode): short slides shown over the
 * canvas. "Try it" buttons call actions the page registers, so the lesson can drive the
 * visualization ("insert 70 and watch it sift up").
 */
export interface LessonTry {
  label: string;
  /** Key into the page's `lessonActions`. */
  action: string;
}

export interface LessonSlide {
  title: string;
  /** RichText: **bold**, `code`, newlines. Keep it to ~2–5 short sentences. */
  body: string;
  tryIt?: readonly LessonTry[];
}

export interface Lesson {
  /** Stable id, used to remember that the visitor has seen it. */
  id: string;
  title: string;
  slides: readonly LessonSlide[];
}

export type LessonActions = Record<string, () => void>;

/** A multiple-choice question generated from what is on screen (VisuAlgo-style training). */
export interface QuizQuestion {
  prompt: string;
  choices: readonly string[];
  /** Index into `choices`. */
  answer: number;
  explain?: string;
}

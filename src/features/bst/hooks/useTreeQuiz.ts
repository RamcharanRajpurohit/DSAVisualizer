"use client";

import { useRef } from "react";
import { VALUE_MAX, VALUE_MIN } from "@/config/input";
import type { QuizQuestion } from "@/lib/lesson";
import type { BSTEngine } from "../engine/BSTEngine";
import { makeQuestion, type QuizKind } from "../model/quiz";

/** Question generator for <QuizCard>: asks about the last completed tree, never the same type twice in a row. */
export function useTreeQuiz(engine: BSTEngine | null, avl: boolean): () => QuizQuestion | null {
  const last = useRef<QuizKind | null>(null);
  return () => {
    if (!engine) return null;
    const q = makeQuestion(engine.stableTree(), { avl, avoid: last.current, min: VALUE_MIN, max: VALUE_MAX });
    last.current = q?.kind ?? null;
    return q;
  };
}

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { markdownWithCustomEmojiImages } from "@/shared/emojiMarkdown";

/** Маркер в теле текстового блока урока: всё после него показывается в раскрывающейся подсказке. */
export const LESSON_REVEAL_MARKER = "<!--reveal-->";

export function splitRevealBody(body: string): { lead: string; reveal: string | null } {
  const idx = body.indexOf(LESSON_REVEAL_MARKER);
  if (idx === -1) {
    return { lead: body, reveal: null };
  }
  const lead = body.slice(0, idx).trimEnd();
  const reveal = body.slice(idx + LESSON_REVEAL_MARKER.length).trimStart();
  return { lead, reveal: reveal.length > 0 ? reveal : null };
}

type LessonRevealBodyProps = {
  markdown: string;
  /** Класс для ReactMarkdown-обёртки (например lesson-flow__markdown) */
  className?: string;
};

/** Размытая панель: по нажатию плавно показывает развёрнутую инструкцию. */
export function LessonRevealBody({ markdown, className }: LessonRevealBodyProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`lesson-reveal${open ? " lesson-reveal--open" : ""}`}>
      <button type="button" className="lesson-reveal__toggle" onClick={() => setOpen((v) => !v)}>
        {open ? "Свернуть развёрнутую инструкцию" : "Показать развёрнутую инструкцию"}
      </button>
      <div className={`lesson-reveal__shell${open ? "" : " lesson-reveal__shell--closed"}`}>
        <div className={`lesson-reveal__inner ${className ?? ""}`.trim()}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdownWithCustomEmojiImages(markdown)}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

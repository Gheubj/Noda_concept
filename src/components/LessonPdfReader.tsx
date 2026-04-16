import { useEffect, useRef, useState } from "react";
import { Alert, Button, Spin } from "antd";
import { AnnotationMode, getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { resolveLessonMediaUrl } from "@/shared/lessonMediaUrl";

GlobalWorkerOptions.workerSrc = pdfWorker;

const MAX_PAGES = 40;

type LessonPdfReaderProps = {
  src: string;
  caption?: string | null;
};

export function LessonPdfReader({ src, caption }: LessonPdfReaderProps) {
  const url = resolveLessonMediaUrl(src);
  const pagesRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      setError("Файл не указан");
      return;
    }

    const pagesEl = pagesRef.current;
    if (!pagesEl) {
      return;
    }

    let cancelled = false;
    const loadTask: PDFDocumentLoadingTask = getDocument({ url });
    docRef.current = null;

    void (async () => {
      setLoading(true);
      setError(null);
      setTruncated(false);
      pagesEl.replaceChildren();

      try {
        const doc = await loadTask.promise;
        if (cancelled) {
          await doc.destroy().catch(() => {});
          return;
        }
        docRef.current = doc;

        const total = doc.numPages;
        const toRender = Math.min(total, MAX_PAGES);
        setTruncated(total > MAX_PAGES);

        const maxW = Math.max(320, pagesEl.clientWidth || 800);

        for (let i = 1; i <= toRender; i++) {
          if (cancelled) {
            break;
          }
          const page = await doc.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const scale = Math.min(2, maxW / base.width);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            continue;
          }
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.className = "lesson-flow__pdf-page-canvas";
          canvas.setAttribute("role", "img");
          canvas.setAttribute(
            "aria-label",
            caption ? `${caption}, стр. ${i}` : `PDF, стр. ${i}`
          );
          pagesEl.appendChild(canvas);
          const renderTask = page.render({
            canvasContext: ctx,
            viewport,
            annotationMode: AnnotationMode.DISABLE
          });
          try {
            await renderTask.promise;
          } catch {
            break;
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Не удалось открыть PDF");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (docRef.current) {
        void docRef.current.destroy().catch(() => {});
        docRef.current = null;
      } else {
        void loadTask.destroy().catch(() => {});
      }
      pagesEl.replaceChildren();
    };
  }, [url, caption]);

  if (!url) {
    return null;
  }

  return (
    <div className="lesson-flow__pdf-reader">
      {loading ? (
        <div className="lesson-flow__pdf-reader-loading">
          <Spin tip="Загрузка…" />
        </div>
      ) : null}
      {error ? (
        <Alert
          type="warning"
          showIcon
          style={{ margin: 12 }}
          message="Не удалось показать как картинку"
          description={error}
          action={
            <Button size="small" href={url} target="_blank" rel="noreferrer">
              Открыть PDF
            </Button>
          }
        />
      ) : null}
      <div ref={pagesRef} className="lesson-flow__pdf-pages" aria-hidden={Boolean(error)} />
      {!error && truncated ? (
        <p className="lesson-flow__pdf-truncated">
          Показаны первые {MAX_PAGES} страниц.{" "}
          <a href={url} target="_blank" rel="noreferrer">
            Открыть весь файл
          </a>
        </p>
      ) : null}
    </div>
  );
}

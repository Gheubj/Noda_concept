import type { CSSProperties } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { TrainingEpochLog } from "@/shared/types/ai";

type StudioTrainingProcessVizProps = {
  epochHistory: TrainingEpochLog[];
  warming: boolean;
  compact?: boolean;
};

function pickTrainLoss(r: TrainingEpochLog): number | undefined {
  const v = r.loss ?? r.mse;
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function pickValLoss(r: TrainingEpochLog): number | undefined {
  const v = r.valLoss ?? r.valMse;
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) {
    return 0;
  }
  return Math.min(1, Math.max(0, x));
}

/** Нормализация последнего значения в серии (0 = лучше в этом прогоне, 1 = хуже). */
function normTail(values: number[]): number {
  if (values.length === 0) {
    return 1;
  }
  const last = values[values.length - 1]!;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1e-9);
  return clamp01((last - min) / span);
}

function useLossVisualMetrics(history: TrainingEpochLog[]) {
  return useMemo(() => {
    const trainSer = history.map(pickTrainLoss).filter((v): v is number => v !== undefined);
    const valSer = history.map(pickValLoss).filter((v): v is number => v !== undefined);

    const trainBad = normTail(trainSer);
    const valBad = valSer.length ? normTail(valSer) : trainBad;

    const prev = trainSer.length > 1 ? trainSer[trainSer.length - 2]! : null;
    const lastT = trainSer.length ? trainSer[trainSer.length - 1]! : null;
    let improve = 0;
    if (prev != null && lastT != null && prev > 0) {
      improve = clamp01((prev - lastT) / (prev + 1e-9));
    }

    const dashSec = Math.min(2.2, Math.max(0.55, 0.85 + 1.15 * trainBad - 0.5 * improve));

    const slice = history.slice(-56);
    const pts: { x: number; y: number }[] = [];
    const sliceLosses: number[] = [];
    for (const r of slice) {
      const L = pickTrainLoss(r);
      if (L !== undefined) {
        sliceLosses.push(L);
      }
    }
    if (sliceLosses.length >= 2) {
      const minL = Math.min(...sliceLosses);
      const maxL = Math.max(...sliceLosses);
      const span = Math.max(maxL - minL, 1e-9);
      const n = sliceLosses.length;
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0 : i / (n - 1);
        const L = sliceLosses[i]!;
        const ty = (L - minL) / span;
        pts.push({ x: t, y: ty });
      }
    }

    return {
      trainBad,
      valBad,
      dashSec,
      pts,
      trainGood: 1 - trainBad,
      valGood: 1 - valBad
    };
  }, [history]);
}

function sparklineFromPts(
  pts: { x: number; y: number }[],
  x0: number,
  x1: number,
  y0: number,
  y1: number
): { line: string; area: string } | null {
  if (pts.length < 2) {
    return null;
  }
  const coords = pts.map((p) => {
    const x = x0 + p.x * (x1 - x0);
    const y = y0 + p.y * (y1 - y0);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = coords.join(" ");
  const first = `${x0.toFixed(1)},${y1.toFixed(1)}`;
  const last = `${x1.toFixed(1)},${y1.toFixed(1)}`;
  const area = `${first} ${line} ${last} Z`;
  return { line, area };
}

/**
 * Без текста: две полосы train/val loss (цвета как у графиков) + мини-кривая train loss.
 */
export function StudioTrainingProcessViz({ epochHistory, warming, compact }: StudioTrainingProcessVizProps) {
  const { trainBad, dashSec, pts, trainGood, valGood } = useLossVisualMetrics(epochHistory);
  const sparkFillId = useId().replace(/:/g, "");
  const prevLen = useRef(0);
  const [epochTick, setEpochTick] = useState(false);

  useEffect(() => {
    const n = epochHistory.length;
    if (n > prevLen.current && n > 0) {
      setEpochTick(true);
      const t = window.setTimeout(() => setEpochTick(false), 480);
      prevLen.current = n;
      return () => window.clearTimeout(t);
    }
    prevLen.current = n;
  }, [epochHistory.length]);

  const vb = compact ? "0 0 300 72" : "0 0 340 82";
  const sparkX0 = compact ? 20 : 24;
  const sparkX1 = compact ? 280 : 316;
  const barY1 = compact ? 12 : 14;
  const barY2 = compact ? 24 : 27;
  const barH = compact ? 7 : 8;
  const sparkY0 = compact ? 38 : 42;
  const sparkY1 = compact ? 58 : 64;

  const spark = useMemo(
    () => sparklineFromPts(pts, sparkX0, sparkX1, sparkY0, sparkY1),
    [pts, sparkX0, sparkX1, sparkY0, sparkY1]
  );

  const bw = sparkX1 - sparkX0;
  const wTrain = bw * trainGood;
  const wVal = bw * valGood;

  const rootClass = [
    "studio-training-viz",
    warming ? "studio-training-viz--warming" : "",
    compact ? "studio-training-viz--compact" : "",
    epochTick ? "studio-training-viz--epoch-tick" : ""
  ]
    .filter(Boolean)
    .join(" ");

  const rootStyle = {
    "--stv-loss-n": String(trainBad),
    "--stv-dash-s": `${dashSec}s`
  } as CSSProperties;

  const sparkFillGradientId = `stv-spark-${sparkFillId}`;

  return (
    <div className={rootClass} style={rootStyle}>
      <svg className="studio-training-viz__svg" viewBox={vb} preserveAspectRatio="xMidYMid meet" aria-hidden>
        <defs>
          <linearGradient id={`${sparkFillId}-train-bar`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6aa3ff" />
            <stop offset="100%" stopColor="#9d7bff" />
          </linearGradient>
          <linearGradient id={`${sparkFillId}-val-bar`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#30d7d2" />
          </linearGradient>
          <linearGradient id={sparkFillGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6aa3ff" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#9d7bff" stopOpacity="0.07" />
          </linearGradient>
        </defs>

        <g className="studio-training-viz__meters">
          <rect
            x={sparkX0}
            y={barY1}
            width={bw}
            height={barH}
            rx={4}
            className="studio-training-viz__meter-track"
          />
          <rect
            x={sparkX0}
            y={barY1}
            width={Math.max(0, wTrain)}
            height={barH}
            rx={4}
            className="studio-training-viz__meter-fill studio-training-viz__meter-fill--train"
            fill={`url(#${sparkFillId}-train-bar)`}
          />
          <rect
            x={sparkX0}
            y={barY2}
            width={bw}
            height={barH}
            rx={4}
            className="studio-training-viz__meter-track"
          />
          <rect
            x={sparkX0}
            y={barY2}
            width={Math.max(0, wVal)}
            height={barH}
            rx={4}
            className="studio-training-viz__meter-fill studio-training-viz__meter-fill--val"
            fill={`url(#${sparkFillId}-val-bar)`}
          />
        </g>

        {spark ? (
          <g className="studio-training-viz__spark">
            <polygon points={spark.area} fill={`url(#${sparkFillGradientId})`} className="studio-training-viz__spark-area" />
            <polyline
              points={spark.line}
              fill="none"
              className="studio-training-viz__spark-line"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        ) : null}
      </svg>
    </div>
  );
}

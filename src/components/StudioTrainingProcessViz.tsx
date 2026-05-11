import type { ReactNode } from "react";
import type { ModelType } from "@/shared/types/ai";

type StudioTrainingProcessVizProps = {
  modelType: ModelType;
  /** До первой эпохи — усиленный «ожидание» пульс входа */
  warming: boolean;
  compact?: boolean;
};

function Node({ cx, cy, r, className }: { cx: number; cy: number; r: number; className?: string }) {
  return <circle cx={cx} cy={cy} r={r} className={["studio-training-viz__node", className ?? ""].filter(Boolean).join(" ")} />;
}

function Edge({
  x1,
  y1,
  x2,
  y2,
  dashClass
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dashClass: string;
}) {
  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      className={`studio-training-viz__edge ${dashClass}`}
      strokeLinecap="round"
    />
  );
}

function fanEdges(
  fromXs: number[],
  fromYs: number[],
  toXs: number[],
  toYs: number[],
  dashBase: number
) {
  const lines: ReactNode[] = [];
  let k = 0;
  for (let i = 0; i < fromXs.length; i++) {
    for (let j = 0; j < toXs.length; j++) {
      lines.push(
        <Edge
          key={`${i}-${j}`}
          x1={fromXs[i]!}
          y1={fromYs[i]!}
          x2={toXs[j]!}
          y2={toYs[j]!}
          dashClass={`studio-training-viz__dash--${(dashBase + k++) % 4}`}
        />
      );
    }
  }
  return lines;
}

function positionsColumn(cx: number, top: number, bottom: number, count: number): { x: number; y: number }[] {
  if (count <= 0) {
    return [];
  }
  if (count === 1) {
    return [{ x: cx, y: (top + bottom) / 2 }];
  }
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    out.push({ x: cx, y: top + t * (bottom - top) });
  }
  return out;
}

export function StudioTrainingProcessViz({ modelType, warming, compact }: StudioTrainingProcessVizProps) {
  const vb = compact ? "0 0 300 72" : "0 0 340 88";
  const top = compact ? 14 : 18;
  const bottom = compact ? 58 : 70;
  const rIn = compact ? 4 : 5;
  const rMid = compact ? 4.5 : 5.5;
  const rOut = compact ? 5 : 6;

  const xIn = compact ? 22 : 26;
  const inCount = 3;
  const inPos = positionsColumn(xIn, top, bottom, inCount);

  const rootClass = [
    "studio-training-viz",
    warming ? "studio-training-viz--warming" : "",
    compact ? "studio-training-viz--compact" : ""
  ]
    .filter(Boolean)
    .join(" ");

  let body: ReactNode;

  if (modelType === "tabular_regression") {
    const xH = compact ? 118 : 132;
    const xO = compact ? 268 : 300;
    const hPos = positionsColumn(xH, top, bottom, 1);
    const oPos = positionsColumn(xO, top, bottom, 1);
    body = (
      <>
        {inPos.map((p, i) => (
          <Node key={`in-${i}`} cx={p.x} cy={p.y} r={rIn} className={`studio-training-viz__node--p${i % 5}`} />
        ))}
        <Node cx={hPos[0]!.x} cy={hPos[0]!.y} r={rMid} className="studio-training-viz__node--p3" />
        <Node cx={oPos[0]!.x} cy={oPos[0]!.y} r={rOut} className="studio-training-viz__node--out studio-training-viz__node--p0" />
        {fanEdges(
          inPos.map((p) => p.x),
          inPos.map((p) => p.y),
          [hPos[0]!.x],
          [hPos[0]!.y],
          0
        )}
        <Edge x1={hPos[0]!.x} y1={hPos[0]!.y} x2={oPos[0]!.x} y2={oPos[0]!.y} dashClass="studio-training-viz__dash--2" />
      </>
    );
  } else if (modelType === "tabular_neural") {
    const x1 = compact ? 108 : 118;
    const x2 = compact ? 168 : 188;
    const x3 = compact ? 228 : 252;
    const xO = compact ? 278 : 308;
    const c1 = 4;
    const c2 = 3;
    const c3 = 2;
    const p1 = positionsColumn(x1, top, bottom, c1);
    const p2 = positionsColumn(x2, top, bottom, c2);
    const p3 = positionsColumn(x3, top, bottom, c3);
    const pO = positionsColumn(xO, top, bottom, 2);
    body = (
      <>
        {inPos.map((p, i) => (
          <Node key={`in-${i}`} cx={p.x} cy={p.y} r={rIn} className={`studio-training-viz__node--p${i % 5}`} />
        ))}
        {p1.map((p, i) => (
          <Node key={`h1-${i}`} cx={p.x} cy={p.y} r={rMid} className={`studio-training-viz__node--p${(i + 1) % 5}`} />
        ))}
        {p2.map((p, i) => (
          <Node key={`h2-${i}`} cx={p.x} cy={p.y} r={rMid} className={`studio-training-viz__node--p${(i + 2) % 5}`} />
        ))}
        {p3.map((p, i) => (
          <Node key={`h3-${i}`} cx={p.x} cy={p.y} r={rMid} className={`studio-training-viz__node--p${(i + 1) % 5}`} />
        ))}
        {pO.map((p, i) => (
          <Node key={`o-${i}`} cx={p.x} cy={p.y} r={rOut} className={`studio-training-viz__node--out studio-training-viz__node--p${i % 5}`} />
        ))}
        {fanEdges(
          inPos.map((p) => p.x),
          inPos.map((p) => p.y),
          p1.map((p) => p.x),
          p1.map((p) => p.y),
          0
        )}
        {fanEdges(
          p1.map((p) => p.x),
          p1.map((p) => p.y),
          p2.map((p) => p.x),
          p2.map((p) => p.y),
          1
        )}
        {fanEdges(
          p2.map((p) => p.x),
          p2.map((p) => p.y),
          p3.map((p) => p.x),
          p3.map((p) => p.y),
          2
        )}
        {fanEdges(
          p3.map((p) => p.x),
          p3.map((p) => p.y),
          pO.map((p) => p.x),
          pO.map((p) => p.y),
          3
        )}
      </>
    );
  } else if (modelType === "tabular_orchestrator") {
    const xB = compact ? 100 : 108;
    const xU = compact ? 128 : 142;
    const yU = compact ? 26 : 30;
    const yB = compact ? 46 : 58;
    const xM = compact ? 188 : 208;
    const xO = compact ? 268 : 300;
    const upper = { x: xM, y: (top + bottom) / 2 - (compact ? 7 : 9) };
    const lower = { x: xM, y: (top + bottom) / 2 + (compact ? 7 : 9) };
    const out = { x: xO, y: (top + bottom) / 2 };
    body = (
      <>
        {inPos.map((p, i) => (
          <Node key={`in-${i}`} cx={p.x} cy={p.y} r={rIn} className={`studio-training-viz__node--p${i % 5}`} />
        ))}
        <Node cx={xB} cy={yB} r={rMid} className="studio-training-viz__node--p2" />
        <Node cx={xU} cy={yU} r={rMid} className="studio-training-viz__node--p4" />
        <Node cx={upper.x} cy={upper.y} r={rMid} className="studio-training-viz__node--p1" />
        <Node cx={lower.x} cy={lower.y} r={rMid} className="studio-training-viz__node--p3" />
        <Node cx={out.x} cy={out.y} r={rOut} className="studio-training-viz__node--out studio-training-viz__node--p0" />
        {fanEdges(
          inPos.map((p) => p.x),
          inPos.map((p) => p.y),
          [xB, xU],
          [yB, yU],
          0
        )}
        <Edge x1={xB} y1={yB} x2={upper.x} y2={upper.y} dashClass="studio-training-viz__dash--1" />
        <Edge x1={xU} y1={yU} x2={lower.x} y2={lower.y} dashClass="studio-training-viz__dash--2" />
        <Edge x1={upper.x} y1={upper.y} x2={out.x} y2={out.y} dashClass="studio-training-viz__dash--3" />
        <Edge x1={lower.x} y1={lower.y} x2={out.x} y2={out.y} dashClass="studio-training-viz__dash--0" />
      </>
    );
  } else {
    /* Linear classifier: inputs → small hidden → multiple outputs */
    const xH = compact ? 124 : 138;
    const xO = compact ? 248 : 272;
    const outCount = 3;
    const oPos = positionsColumn(xO, top, bottom, outCount);
    const hPos = positionsColumn(xH, top, bottom, 2);
    body = (
      <>
        {inPos.map((p, i) => (
          <Node key={`in-${i}`} cx={p.x} cy={p.y} r={rIn} className={`studio-training-viz__node--p${i % 5}`} />
        ))}
        {hPos.map((p, i) => (
          <Node key={`h-${i}`} cx={p.x} cy={p.y} r={rMid} className={`studio-training-viz__node--p${(i + 2) % 5}`} />
        ))}
        {oPos.map((p, i) => (
          <Node key={`o-${i}`} cx={p.x} cy={p.y} r={rOut} className={`studio-training-viz__node--out studio-training-viz__node--p${i % 5}`} />
        ))}
        {fanEdges(
          inPos.map((p) => p.x),
          inPos.map((p) => p.y),
          hPos.map((p) => p.x),
          hPos.map((p) => p.y),
          0
        )}
        {fanEdges(
          hPos.map((p) => p.x),
          hPos.map((p) => p.y),
          oPos.map((p) => p.x),
          oPos.map((p) => p.y),
          1
        )}
      </>
    );
  }

  return (
    <div className={rootClass} aria-hidden>
      <svg className="studio-training-viz__svg" viewBox={vb} preserveAspectRatio="xMidYMid meet">
        {body}
      </svg>
    </div>
  );
}

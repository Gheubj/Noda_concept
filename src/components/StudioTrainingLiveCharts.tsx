import { Space, Typography } from "antd";
import { Fragment, useId, useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { useAppStore } from "@/store/useAppStore";
import type { ModelType } from "@/shared/types/ai";

const { Text } = Typography;

function modelTitle(modelType: ModelType): string {
  switch (modelType) {
    case "tabular_regression":
      return "Регрессия";
    case "tabular_classification":
      return "Классификация";
    case "tabular_neural":
      return "Нейросеть (MLP)";
    case "tabular_orchestrator":
      return "Оркестр моделей";
    default:
      return modelType;
  }
}

type StudioTrainingLiveChartsProps = {
  className?: string;
  compact?: boolean;
};

const PIPE_STEPS = [
  { id: "data", label: "Данные", hint: "признаки и ответ" },
  { id: "forward", label: "Прямой ход", hint: "модель считает выход" },
  { id: "loss", label: "Лосс", hint: "насколько ошиблись" },
  { id: "update", label: "Веса", hint: "шаг оптимизатора" }
] as const;

export function StudioTrainingLiveCharts({ className, compact }: StudioTrainingLiveChartsProps) {
  const training = useAppStore((s) => s.training);
  const liveEpochHistory = useAppStore((s) => s.liveEpochHistory);
  const plannedEpochs = useAppStore((s) => s.liveTrainingPlannedEpochs);
  const streamModelType = useAppStore((s) => s.liveTrainingStreamModelType);

  const uid = useId().replace(/:/g, "");
  const chartHeight = compact ? 118 : 154;
  const margin = { top: 4, right: 4, left: 0, bottom: 0 };
  const axisTick = { fontSize: 9, fill: "rgba(148, 163, 184, 0.95)" };
  const gridStroke = "rgba(148, 163, 184, 0.16)";
  const tipStyle = {
    borderRadius: 10,
    border: "1px solid rgba(148, 163, 184, 0.28)",
    background: "color-mix(in srgb, var(--surface-floating, rgba(255,255,255,0.9)) 88%, transparent)",
    backdropFilter: "blur(10px)",
    fontSize: 11
  } as const;

  const rows = liveEpochHistory ?? [];
  const isRegression = streamModelType === "tabular_regression";
  const hasAcc = !isRegression && rows.some((r) => r.accuracy != null || r.valAccuracy != null);

  const currentEpoch = rows.length > 0 ? rows[rows.length - 1]!.epoch : 0;
  const totalPlanned = plannedEpochs ?? currentEpoch;
  const epochProgressPct =
    totalPlanned > 0 ? Math.min(100, Math.round((currentEpoch / Math.max(totalPlanned, 1)) * 100)) : 0;

  const show = training.isTraining && streamModelType != null && liveEpochHistory !== null;

  const title = useMemo(() => {
    if (!streamModelType) {
      return "";
    }
    return modelTitle(streamModelType);
  }, [streamModelType]);

  if (!show) {
    return null;
  }

  return (
    <div className={["studio-training-live", compact ? "studio-training-live--compact" : "", className ?? ""].filter(Boolean).join(" ")}>
      <div className="studio-training-live__header">
        <Text strong className="studio-training-live__title">
          {title}
        </Text>
        <Text type="secondary" className="studio-training-live__epoch">
          Эпоха {currentEpoch} / {Math.max(totalPlanned, 1)}
        </Text>
      </div>

      <div className="studio-training-live__process">
        {compact ? (
          <Text type="secondary" className="studio-training-live__process-lead studio-training-live__process-lead--compact">
            Каждая эпоха — полный проход по обучению и шаг оптимизатора. Val — контроль без дообучения на этих строках.
          </Text>
        ) : (
          <Text type="secondary" className="studio-training-live__process-lead">
            Идёт обучение: за одну эпоху модель один раз просматривает все обучающие примеры, сравнивает ответ с истиной,
            получает лосс и чуть сдвигает веса в сторону меньшей ошибки. Это повторяется много эпох подряд. Кривые ниже
            показывают, как меняется ошибка и качество; линия val — отдельная выборка для контроля (на ней веса не
            дообучаются).
          </Text>
        )}

        <div
          className={[
            "studio-training-live__pipeline",
            currentEpoch === 0 ? "studio-training-live__pipeline--warming" : ""
          ]
            .filter(Boolean)
            .join(" ")}
          aria-label="Этапы одной эпохи обучения"
        >
          {PIPE_STEPS.map((step, index) => (
            <Fragment key={step.id}>
              <div className="studio-training-live__pipe-step">
                <span className="studio-training-live__pipe-step-index" aria-hidden>
                  {index + 1}
                </span>
                <span className="studio-training-live__pipe-step-label">{step.label}</span>
                {!compact ? (
                  <span className="studio-training-live__pipe-step-hint" title={step.hint}>
                    {step.hint}
                  </span>
                ) : null}
              </div>
              {index < PIPE_STEPS.length - 1 ? (
                <span className="studio-training-live__pipe-arrow" aria-hidden>
                  →
                </span>
              ) : null}
            </Fragment>
          ))}
        </div>

        <div className="studio-training-live__epoch-track" aria-hidden>
          <div className="studio-training-live__epoch-track-fill" style={{ width: `${epochProgressPct}%` }} />
        </div>
        <Text type="secondary" className="studio-training-live__epoch-track-caption">
          Прогресс по плану эпох: {epochProgressPct}%
        </Text>
      </div>

      <Space direction="vertical" size={compact ? 6 : 10} style={{ width: "100%" }}>
        <div className="studio-metrics-chart-shell studio-training-live__shell">
          <div className="studio-metrics-chart-shell__head">
            <Text strong>Потери (loss)</Text>
          </div>
          {!compact ? (
            <Text type="secondary" className="studio-training-live__chart-caption">
              train — ошибка на данных, на которых учимся; val — на отложенной части без шага по весам.
            </Text>
          ) : null}
          <div className="studio-metrics-chart-shell__plot studio-metrics-line-chart">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <LineChart data={rows} margin={margin}>
                <defs>
                  <linearGradient id={`${uid}-live-loss-tr`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6aa3ff" />
                    <stop offset="100%" stopColor="#9d7bff" />
                  </linearGradient>
                  <linearGradient id={`${uid}-live-loss-val`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#30d7d2" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 6" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="epoch" tick={axisTick} axisLine={false} tickLine={false} tickMargin={4} />
                <YAxis tick={axisTick} width={32} axisLine={false} tickLine={false} tickMargin={2} />
                <Tooltip contentStyle={tipStyle} />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 2 }} />
                <Line
                  isAnimationActive
                  animationDuration={280}
                  type="monotone"
                  dataKey="loss"
                  name="train"
                  stroke={`url(#${uid}-live-loss-tr)`}
                  dot={false}
                  strokeWidth={2}
                  strokeLinecap="round"
                  connectNulls
                />
                <Line
                  isAnimationActive
                  animationDuration={280}
                  type="monotone"
                  dataKey="valLoss"
                  name="val"
                  stroke={`url(#${uid}-live-loss-val)`}
                  dot={false}
                  strokeWidth={2}
                  strokeLinecap="round"
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {hasAcc ? (
          <div className="studio-metrics-chart-shell studio-training-live__shell">
            <div className="studio-metrics-chart-shell__head">
              <Text strong>Точность (accuracy)</Text>
            </div>
            <div className="studio-metrics-chart-shell__plot studio-metrics-line-chart">
              <ResponsiveContainer width="100%" height={chartHeight}>
                <LineChart data={rows} margin={margin}>
                  <defs>
                    <linearGradient id={`${uid}-live-acc-tr`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#9d7bff" />
                      <stop offset="100%" stopColor="#6aa3ff" />
                    </linearGradient>
                    <linearGradient id={`${uid}-live-acc-val`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#5eead4" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 6" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="epoch" tick={axisTick} axisLine={false} tickLine={false} tickMargin={4} />
                  <YAxis domain={[0, 1]} tick={axisTick} width={32} axisLine={false} tickLine={false} tickMargin={2} />
                  <Tooltip
                    contentStyle={tipStyle}
                    formatter={(v: number | string) => [typeof v === "number" ? `${(v * 100).toFixed(1)}%` : v, ""]}
                  />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 2 }} />
                  <Line
                    isAnimationActive
                    animationDuration={280}
                    type="monotone"
                    dataKey="accuracy"
                    name="train"
                    stroke={`url(#${uid}-live-acc-tr)`}
                    dot={false}
                    strokeWidth={2}
                    strokeLinecap="round"
                    connectNulls
                  />
                  <Line
                    isAnimationActive
                    animationDuration={280}
                    type="monotone"
                    dataKey="valAccuracy"
                    name="val"
                    stroke={`url(#${uid}-live-acc-val)`}
                    dot={false}
                    strokeWidth={2}
                    strokeLinecap="round"
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}

        {isRegression ? (
          <div className="studio-metrics-chart-shell studio-training-live__shell">
            <div className="studio-metrics-chart-shell__head">
              <Text strong>MSE</Text>
            </div>
            <div className="studio-metrics-chart-shell__plot studio-metrics-line-chart">
              <ResponsiveContainer width="100%" height={chartHeight}>
                <LineChart data={rows} margin={margin}>
                  <defs>
                    <linearGradient id={`${uid}-live-mse-tr`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#8b7ae8" />
                      <stop offset="100%" stopColor="#6aa3ff" />
                    </linearGradient>
                    <linearGradient id={`${uid}-live-mse-val`} x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3db8b4" />
                      <stop offset="100%" stopColor="#5ec8b8" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 6" stroke={gridStroke} vertical={false} />
                  <XAxis dataKey="epoch" tick={axisTick} axisLine={false} tickLine={false} tickMargin={4} />
                  <YAxis tick={axisTick} width={36} axisLine={false} tickLine={false} tickMargin={2} />
                  <Tooltip contentStyle={tipStyle} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 2 }} />
                  <Line
                    isAnimationActive
                    animationDuration={280}
                    type="monotone"
                    dataKey="mse"
                    name="train mse"
                    stroke={`url(#${uid}-live-mse-tr)`}
                    dot={false}
                    strokeWidth={2}
                    strokeLinecap="round"
                    connectNulls
                  />
                  <Line
                    isAnimationActive
                    animationDuration={280}
                    type="monotone"
                    dataKey="valMse"
                    name="val mse"
                    stroke={`url(#${uid}-live-mse-val)`}
                    dot={false}
                    strokeWidth={2}
                    strokeLinecap="round"
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : null}
      </Space>
      {rows.length === 0 ? (
        <Text type="secondary" className="studio-training-live__hint">
          Считаем первую эпоху…
        </Text>
      ) : null}
    </div>
  );
}

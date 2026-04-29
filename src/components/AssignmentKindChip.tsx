import type { ReactNode } from "react";
import {
  BookOutlined,
  FileTextOutlined,
  SolutionOutlined
} from "@ant-design/icons";

/**
 * Общий чип для типа учебной задачи. Дизайн взят из LMS-блока на лендинге,
 * чтобы реальные карточки заданий выглядели согласованно с лендингом.
 *
 * Поддерживаемые kind:
 *  - "lesson"    — урок / занятие в расписании
 *  - "classwork" — классная работа
 *  - "homework"  — домашнее задание
 */
export type AssignmentKind = "lesson" | "classwork" | "homework" | string;

const KIND_META: Record<
  string,
  { label: string; icon: ReactNode; cls: string }
> = {
  lesson: {
    label: "Урок",
    icon: <BookOutlined />,
    cls: "lms-kind-icon--lesson"
  },
  classwork: {
    label: "Классная",
    icon: <SolutionOutlined />,
    cls: "lms-kind-icon--cw"
  },
  homework: {
    label: "ДЗ",
    icon: <FileTextOutlined />,
    cls: "lms-kind-icon--hw"
  }
};

interface AssignmentKindIconProps {
  kind: AssignmentKind;
  size?: "sm" | "md";
}

export function AssignmentKindIcon({ kind, size = "md" }: AssignmentKindIconProps) {
  const meta = KIND_META[kind];
  if (!meta) {
    return null;
  }
  return (
    <span
      className={`lms-kind-icon ${meta.cls} lms-kind-icon--${size}`}
      title={meta.label}
      aria-label={meta.label}
    >
      {meta.icon}
    </span>
  );
}

interface AssignmentKindChipProps {
  kind: AssignmentKind;
  /** Подпись справа, если не указана — используется стандартная (Урок / Классная / ДЗ). */
  label?: string;
}

/** Чип «иконка + подпись» в стиле лендинга. */
export function AssignmentKindChip({ kind, label }: AssignmentKindChipProps) {
  const meta = KIND_META[kind];
  if (!meta) {
    return null;
  }
  return (
    <span className="lms-kind-chip">
      <AssignmentKindIcon kind={kind} size="sm" />
      <span className="lms-kind-chip__label">{label ?? meta.label}</span>
    </span>
  );
}

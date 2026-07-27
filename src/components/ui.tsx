"use client";

import { AlertStatus, alertColors, alertLabel } from "@/lib/alert";
import { Stage } from "@prisma/client";
import { stageColors, stageLabels } from "@/lib/labels";
import { X, ArrowLeft } from "lucide-react";
import { useEffect } from "react";

export function PageHeader({
  title,
  subtitle,
  actions,
  onBack,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onBack?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-4 sm:px-6 py-5 border-b border-gray-200 bg-white">
      <div className="flex items-start gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="btn-secondary mt-0.5 flex-shrink-0"
            title="Atrás"
            aria-label="Atrás"
          >
            <ArrowLeft size={16} /> Atrás
          </button>
        )}
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent = "navy",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  accent?: "navy" | "gold" | "green" | "red";
}) {
  const accentClasses: Record<string, string> = {
    navy: "text-calume-navy",
    gold: "text-calume-goldDark",
    green: "text-alert-green",
    red: "text-alert-red",
  };
  return (
    <div className="card p-4">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${accentClasses[accent]}`}>{value}</div>
      {hint && <div className="text-xs text-gray-400 mt-1">{hint}</div>}
    </div>
  );
}

export function AlertDot({ status, showLabel = false }: { status: AlertStatus; showLabel?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: alertColors[status] }} />
      {showLabel && <span className="text-xs text-gray-500">{alertLabel(status)}</span>}
    </span>
  );
}

export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span
      className="badge"
      style={{ backgroundColor: `${stageColors[stage]}1A`, color: stageColors[stage] }}
    >
      {stageLabels[stage]}
    </span>
  );
}

export function TagPill({ name, color }: { name: string; color: string }) {
  return (
    <span className="badge" style={{ backgroundColor: `${color}1A`, color }}>
      #{name}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative bg-white rounded-xl2 shadow-popover w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, description }: { icon?: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="text-center py-16 px-4">
      {icon && <div className="flex justify-center mb-3 text-gray-300">{icon}</div>}
      <h3 className="text-sm font-medium text-gray-900">{title}</h3>
      {description && <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">{description}</p>}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Eliminar",
  danger = true,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  danger?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl2 shadow-popover w-full max-w-sm p-5">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-2">{message}</p>
        <div className="flex justify-end gap-2 mt-5">
          <button className="btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button className={danger ? "btn-danger" : "btn-primary"} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

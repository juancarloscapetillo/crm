"use client";

import Link from "next/link";
import toast from "react-hot-toast";
import { Star, Clock, Handshake } from "lucide-react";
import { AlertDot, TagPill } from "@/components/ui";
import { formatCurrency, formatDateTime, sourceLabels } from "@/lib/labels";
import { AlertStatus, getAlertStatus } from "@/lib/alert";
import { Stage } from "@prisma/client";

export type ProspectCardData = {
  id: string;
  name: string;
  project?: { name: string } | null;
  unitInterest?: string | null;
  budget?: number | null;
  assignedUser?: { name: string } | null;
  advisor?: { name: string } | null;
  updatedAt: string;
  lastActivityAt: string;
  stage: Stage;
  nextAction?: string | null;
  nextActionDate?: string | null;
  tags: { tag: { id: string; name: string; color: string } }[];
  sourceType: keyof typeof sourceLabels;
  alertStatus: AlertStatus;
  isFavorite: boolean;
};

export default function ProspectCard({
  prospect,
  onFavoriteToggle,
  dragHandleProps,
}: {
  prospect: ProspectCardData;
  onFavoriteToggle?: (id: string, next: boolean) => void;
  dragHandleProps?: any;
}) {
  async function toggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(`/api/prospects/${prospect.id}/favorite`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onFavoriteToggle?.(prospect.id, data.isFavorite);
      toast.success(data.isFavorite ? "Agregado a favoritos" : "Quitado de favoritos");
    } catch {
      toast.error("No se pudo actualizar favoritos");
    }
  }

  const liveAlertStatus = prospect.lastActivityAt ? getAlertStatus(prospect.lastActivityAt, prospect.stage) : prospect.alertStatus;
  const borderColor = { green: "#3FBE7A", yellow: "#F0B429", red: "#E15B5B", closed: "#E5E7EB" }[liveAlertStatus];

  return (
    <Link
      href={`/prospectos/${prospect.id}`}
      className="block bg-white rounded-lg border-l-4 shadow-card p-3 hover:shadow-popover transition-shadow"
      style={{ borderLeftColor: borderColor }}
      {...dragHandleProps}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium text-sm text-gray-900 truncate">{prospect.name}</div>
          <div className="text-xs text-gray-500 truncate">
            {prospect.project?.name || "Sin proyecto"} {prospect.unitInterest ? `· ${prospect.unitInterest}` : ""}
          </div>
        </div>
        <button onClick={toggleFavorite} title="Marcar como favorito" className="flex-shrink-0">
          <Star size={16} className={prospect.isFavorite ? "fill-calume-gold text-calume-gold" : "text-gray-300"} />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {prospect.tags.slice(0, 3).map((t) => (
          <TagPill key={t.tag.id} name={t.tag.name} color={t.tag.color} />
        ))}
      </div>

      {prospect.advisor && (
        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-calume-navy bg-calume-navy/5 rounded px-2 py-1 truncate">
          <Handshake size={11} className="flex-shrink-0" />
          <span className="truncate">{prospect.advisor.name}</span>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <span>{prospect.assignedUser?.name || "Sin asignar"}</span>
        <span className="font-medium text-calume-navy">{formatCurrency(prospect.budget)}</span>
      </div>

      <div className="mt-1.5 flex items-center justify-between text-[11px] text-gray-400">
        <AlertDot status={liveAlertStatus} showLabel />
        <span className="flex items-center gap-1">
          <Clock size={11} /> {formatDateTime(prospect.updatedAt)}
        </span>
      </div>
      {prospect.nextAction && (
        <div className="mt-1.5 text-[11px] text-calume-navy bg-calume-navy/5 rounded px-2 py-1 truncate">
          Próximo: {prospect.nextAction}
        </div>
      )}
    </Link>
  );
}

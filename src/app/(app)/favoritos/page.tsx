"use client";

import { Star } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/ui";
import ProspectCard, { ProspectCardData } from "@/components/ProspectCard";
import { useFetch, useTick } from "@/lib/hooks";

export default function FavoritosPage() {
  const { data, loading, reload } = useFetch<{ prospects: ProspectCardData[] }>("/api/prospects?favorite=true");
  useTick();
  const prospects = data?.prospects || [];

  return (
    <div>
      <PageHeader
        title="⭐ Favoritos"
        subtitle="Accesos rápidos a los prospectos que marcaste como favoritos. La etapa comercial original no cambia."
      />
      <div className="p-4 sm:p-6">
        {loading && <p className="text-sm text-gray-500">Cargando...</p>}
        {!loading && prospects.length === 0 && (
          <EmptyState
            icon={<Star size={40} />}
            title="Aún no tienes favoritos"
            description="Marca la estrella en cualquier tarjeta de prospecto para verlo aquí como acceso directo."
          />
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {prospects.map((p) => (
            <ProspectCard key={p.id} prospect={p} onFavoriteToggle={reload} />
          ))}
        </div>
      </div>
    </div>
  );
}

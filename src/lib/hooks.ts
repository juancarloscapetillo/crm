"use client";

import { useEffect, useState } from "react";

/** Forces periodic re-renders so time-based UI (e.g. follow-up alert colors) updates without a manual reload. */
export function useTick(intervalMs = 60000) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return tick;
}

export function useFetch<T>(url: string | null, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setLoading(true);
    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Error al cargar datos");
        return res.json();
      })
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, reloadKey, ...deps]);

  return { data, loading, error, reload: () => setReloadKey((k) => k + 1) };
}

export function useCatalogs() {
  const { data: tagsData } = useFetch<{ tags: any[] }>("/api/tags");
  const { data: projectsData } = useFetch<{ projects: any[] }>("/api/projects");
  const { data: usersData } = useFetch<{ users: any[] }>("/api/users");
  const { data: companiesData } = useFetch<{ companies: any[] }>("/api/companies");
  const { data: advisorsData } = useFetch<{ advisors: any[] }>("/api/advisors");

  return {
    tags: tagsData?.tags || [],
    projects: projectsData?.projects || [],
    users: usersData?.users || [],
    companies: companiesData?.companies || [],
    advisors: advisorsData?.advisors || [],
  };
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";

type Result = {
  id: string;
  name: string;
  stage: string;
  type: "prospecto";
};

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results);
        setOpen(true);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="relative w-full max-w-md" ref={boxRef}>
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9 pr-8"
          placeholder="Buscar prospectos por nombre, teléfono o correo..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {query && (
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            onClick={() => {
              setQuery("");
              setResults([]);
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-30 mt-1 w-full bg-white rounded-lg shadow-popover border border-gray-100 max-h-80 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.id}
              className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0"
              onClick={() => {
                router.push(`/prospectos/${r.id}`);
                setOpen(false);
                setQuery("");
              }}
            >
              <div className="font-medium text-gray-900">{r.name}</div>
              <div className="text-xs text-gray-500">{r.stage}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

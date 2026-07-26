"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { Download, Upload } from "lucide-react";

interface ImportSummary {
  totalRows: number;
  created: number;
  skipped: string[];
  projectsUsed: string[];
  companiesTouched: number;
  advisorsTouched: number;
}

export default function ImportSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [force, setForce] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [alreadyImportedMsg, setAlreadyImportedMsg] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setSummary(null);
    setAlreadyImportedMsg(null);

    const form = new FormData();
    form.append("file", file);
    form.append("force", force ? "true" : "false");

    const res = await fetch("/api/admin/import-prospects", { method: "POST", body: form });
    const data = await res.json();
    setUploading(false);

    if (!res.ok) {
      if (res.status === 409) {
        setAlreadyImportedMsg(data.error);
      } else {
        toast.error(data.error || "No se pudo importar el archivo");
      }
      return;
    }

    setSummary(data.summary);
    toast.success(`${data.summary.created} de ${data.summary.totalRows} prospectos importados`);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-900">Importar prospectos desde CSV</h3>
        <p className="text-xs text-gray-500 mt-1">
          Sube un archivo con tus prospectos ya trabajados (de un Excel, Notion, u otro tablero de seguimiento). El
          orden de las columnas no importa, pero deben tener estos nombres de encabezado:
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="text-xs w-full border border-gray-100 rounded">
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="px-2 py-1.5 font-medium text-gray-700 whitespace-nowrap">Nombre del Cliente</td>
                <td className="px-2 py-1.5 text-gray-500">El nombre real del prospecto.</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-2 py-1.5 font-medium text-gray-700 whitespace-nowrap">Proyecto</td>
                <td className="px-2 py-1.5 text-gray-500">Nombre del proyecto (se crea si no existe).</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-2 py-1.5 font-medium text-gray-700 whitespace-nowrap">Etapa</td>
                <td className="px-2 py-1.5 text-gray-500">Informes, Visita, Cotización o Cerrada.</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-2 py-1.5 font-medium text-gray-700 whitespace-nowrap">Fecha de Inicio</td>
                <td className="px-2 py-1.5 text-gray-500">Fecha de ingreso, formato DD/MM/AAAA.</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-2 py-1.5 font-medium text-gray-700 whitespace-nowrap">Ultimo de Seguimiento</td>
                <td className="px-2 py-1.5 text-gray-500">Fecha del último contacto, DD/MM/AAAA (opcional).</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-2 py-1.5 font-medium text-gray-700 whitespace-nowrap">Tags</td>
                <td className="px-2 py-1.5 text-gray-500">Broker, Redes Sociales o Boca a boca.</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-2 py-1.5 font-medium text-gray-700 whitespace-nowrap">Asignado a</td>
                <td className="px-2 py-1.5 text-gray-500">Nombre completo del vendedor, tal cual está registrado en el CRM.</td>
              </tr>
              <tr className="border-b border-gray-100 bg-calume-navy/5">
                <td className="px-2 py-1.5 font-medium text-gray-700 whitespace-nowrap">Asesor</td>
                <td className="px-2 py-1.5 text-gray-500">
                  Nombre del asesor externo que trae al cliente (déjalo vacío si es venta directa). Si escribes el
                  nombre del vendedor asignado, se marca como venta directa.
                </td>
              </tr>
              <tr className="border-b border-gray-100 bg-calume-navy/5">
                <td className="px-2 py-1.5 font-medium text-gray-700 whitespace-nowrap">Inmobiliaria</td>
                <td className="px-2 py-1.5 text-gray-500">Empresa del asesor (opcional, déjalo vacío si es independiente).</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-2 py-1.5 font-medium text-gray-700 whitespace-nowrap">Valor Estimado</td>
                <td className="px-2 py-1.5 text-gray-500">Valor estimado de la venta en pesos (número, opcional).</td>
              </tr>
              <tr>
                <td className="px-2 py-1.5 font-medium text-gray-700 whitespace-nowrap">Comentarios</td>
                <td className="px-2 py-1.5 text-gray-500">Notas libres sobre el seguimiento.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          También aceptamos el formato del CRM anterior, donde el asesor y la inmobiliaria venían combinados en
          "Nombre del Cliente" (ej. "Juan Pérez - Century21") y el nombre real del cliente iba dentro de Comentarios
          antes de "//" — si tu archivo no tiene columnas de Asesor/Inmobiliaria, se detecta e interpreta así
          automáticamente.
        </p>
        <a
          href="/templates/plantilla-importacion-prospectos.csv"
          download
          className="btn-secondary text-xs mt-3 inline-flex"
        >
          <Download size={13} /> Descargar plantilla de ejemplo
        </a>
      </div>

      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Subir archivo</h3>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="input text-sm flex-1"
          />
          <button onClick={handleUpload} disabled={!file || uploading} className="btn-gold whitespace-nowrap">
            <Upload size={14} /> {uploading ? "Importando..." : "Importar"}
          </button>
        </div>
        <label className="flex items-center gap-2 mt-3 text-xs text-gray-500">
          <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} />
          Forzar de nuevo (usar solo si ya importaste antes y de verdad quieres repetirlo; puede duplicar prospectos)
        </label>

        {alreadyImportedMsg && (
          <div className="mt-4 text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded p-3">{alreadyImportedMsg}</div>
        )}

        {summary && (
          <div className="mt-4 text-xs bg-green-50 text-green-800 border border-green-200 rounded p-3 space-y-1">
            <div>
              Prospectos creados: <strong>{summary.created} / {summary.totalRows}</strong>
            </div>
            <div>Proyectos usados: {summary.projectsUsed.join(", ") || "—"}</div>
            <div>Inmobiliarias creadas/usadas: {summary.companiesTouched}</div>
            <div>Asesores creados/usados: {summary.advisorsTouched}</div>
            {summary.skipped.length > 0 && (
              <div className="mt-2 text-amber-700">
                <div className="font-medium">Filas omitidas ({summary.skipped.length}):</div>
                <ul className="list-disc list-inside">
                  {summary.skipped.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

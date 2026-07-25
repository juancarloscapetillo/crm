# Calume CRM

CRM inmobiliario para **Desarrolladora Calume** (Mérida, Yucatán). Prototipo funcional para
gestión de prospectos, pipeline de ventas, seguimiento comercial, asesores externos, marketing
y reportes ejecutivos.

## Arquitectura

- **Next.js 14 (App Router, TypeScript)** — un solo proyecto sirve frontend y backend (API routes).
- **PostgreSQL + Prisma ORM** — persistencia y modelo de datos.
- **NextAuth (Credentials + JWT)** — autenticación con roles `ADMIN` / `VENDEDOR`.
- **Tailwind CSS** — sistema visual con los colores de marca de Calume (`#253574` navy, `#F6B436` dorado).
- **dnd-kit** — pipeline Kanban con drag & drop.
- **Recharts** — gráficas del dashboard.
- **xlsx** — exportación a Excel; CSV nativo; vista de impresión con CSS `@media print` para generar PDF desde el navegador.

El logotipo (`public/brand/calume-logo.png` y `calume-icon.png`) fue extraído directamente del
manual de marca `Calume_Marca.pdf` en el Drive de Calume — no se inventaron colores ni versiones.

### Modelo de datos (resumen)

`User` (admin/vendedor) · `Prospect` · `Activity` (línea de tiempo) · `Task` · `Tag` ·
`ProspectTag` · `Favorite` · `Attachment` (archivos, guardados como bytes en BD) · `Project`
(proyecto inmobiliario) · `Company` (empresa inmobiliaria) · `Advisor` (asesor externo) ·
`MarketingInvestment` (inversión y atribución de marketing).

### Supuestos comerciales documentados

Al no estar definidos explícitamente, se tomaron estas decisiones (documentadas para que el
equipo de Calume las valide):

1. **Atribución de venta**: la venta se atribuye al vendedor asignado al prospecto en el momento
   en que su etapa cambia a "Ganado" (no al vendedor original si hubo reasignación).
2. **CAC (costo de adquisición)**: se calcula como inversión total del periodo/filtro ÷ prospectos
   ganados en ese mismo periodo/filtro. Si no hay ventas ganadas, se muestra explícitamente
   "Datos insuficientes" en vez de un cálculo engañoso (ej. división entre cero).
3. **Asesor activo**: un asesor externo se considera activo si alguno de sus prospectos tuvo
   actividad registrada (comentario, llamada, visita, cambio de etapa, etc.) en los últimos 30 días,
   o dentro del periodo seleccionado en filtros.
4. **Semáforo de seguimiento** (verde/amarillo/rojo): se basa en `lastActivityAt`, actualizado por
   cualquier comentario, llamada, mensaje, correo, visita, cambio de etapa, cambio de vendedor,
   tarea creada/completada o edición relevante del expediente. No aplica en etapas Ganado/Perdido.
   Los colores se recalculan en el navegador cada 60 segundos sin necesidad de recargar la página.
5. **Favoritos**: son una referencia (tabla `Favorite`), no una copia del prospecto ni una etapa
   del pipeline — el registro original nunca se duplica.

## Requisitos previos

- Node.js 20+
- PostgreSQL 14+

## Configuración local

```bash
npm install
cp .env.example .env   # completa DATABASE_URL y NEXTAUTH_SECRET
npx prisma db push     # crea las tablas
npx tsx prisma/seed.ts --demo   # usuarios de prueba + datos demo (opcional --demo)
npm run dev
```

### Variables de entorno

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión de PostgreSQL |
| `NEXTAUTH_SECRET` | Clave aleatoria para firmar sesiones (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | URL pública de la app (en Railway, el dominio generado) |

Ningún valor sensible está incluido en el repositorio; `.env.example` documenta las variables
necesarias sin exponer contraseñas reales.

## Usuarios de prueba

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@calume.mx` | `Calume2026!` |
| Vendedor | `vendedor1@calume.mx` | `Vendedor2026!` |
| Vendedor | `vendedor2@calume.mx` | `Vendedor2026!` |
| Vendedor | `vendedor3@calume.mx` | `Vendedor2026!` |

**Recomendación:** cambia estas contraseñas desde Configuración → Usuarios antes de usar el
sistema en producción con datos reales.

La base de datos inicia **vacía de prospectos reales**. En Configuración → Datos demostrativos
puedes generar (y eliminar en cualquier momento) un set de prospectos y registros de marketing
de ejemplo, claramente marcados con la etiqueta "⚠ Dato demostrativo", únicamente para visualizar
el dashboard y los reportes con datos.

## Funcionalidades terminadas

- Autenticación con roles Administrador / Vendedor y control de acceso por API.
- Alta, edición, eliminación (solo admin) y perfil completo de prospectos.
- Pipeline Kanban con drag & drop entre 5 etapas, estadísticas por columna y alertas.
- Vista de Favoritos como acceso directo, sin duplicar registros ni afectar la etapa.
- Línea de tiempo automática (creación, comentarios, llamadas, mensajes, correos, visitas,
  cambios de etapa/vendedor, tareas) con usuario y fecha de cada movimiento.
- Semáforo de seguimiento automático (72h / 96h) con actualización en vivo y filtros.
- Tags personalizables (crear/editar/eliminar) y multi-asignación a prospectos.
- Empresas y asesores externos con métricas calculadas (prospectos, ventas, conversión, valor).
- Módulo de inversión en marketing con cálculo automático de CAC, costo por lead/visita/venta,
  conversión y ROI — con manejo explícito de "datos insuficientes".
- Dashboard ejecutivo con filtros (periodo, vendedor, tag, canal, proyecto, rango personalizado)
  y gráficas de evolución/distribución.
- Reportes exportables a CSV, Excel y vista de impresión/PDF.
- Buscador global de prospectos.
- Gestión de usuarios (alta, activar/desactivar, cambio de rol) — solo Administrador.
- Datos demostrativos generables/eliminables, aislados de la operación real.
- Diseño responsivo (escritorio y celular) con la identidad visual de Calume.

## Funcionalidades pendientes / limitaciones conocidas

- **Adjuntos**: se almacenan como bytes en PostgreSQL (simple y suficiente para el prototipo);
  para volúmenes grandes de archivos se recomienda migrar a un bucket de almacenamiento (S3,
  Cloudflare R2, etc.) antes de producción.
- **Integraciones no implementadas** (fuera de alcance de este prototipo, según lo solicitado):
  WhatsApp, correo saliente, formularios de campañas, automatizaciones, inventario de
  departamentos, apartado/separación de unidades, comisiones, firma de documentos. El modelo de
  datos (proyectos, prospectos, tags, empresas) está diseñado para poder añadir estos módulos
  después sin rediseño mayor.
- **Recuperación de contraseña** no implementada (el administrador puede resetear la contraseña
  de cualquier usuario desde Configuración).
- **Notificaciones push/email** de seguimientos vencidos no implementadas; el semáforo y los
  filtros de tareas cubren esta necesidad dentro de la app.

## Despliegue en Railway

La app está preparada para desplegarse como un solo servicio Node.js:

- `npm run build` ejecuta `prisma generate` y `next build`.
- Antes de cada deploy se ejecuta `npx prisma db push` para sincronizar el esquema con la base
  de datos de Railway (variable `DATABASE_URL` referenciando el plugin de Postgres).
- `npm start` levanta `next start` en el puerto que Railway asigna (`$PORT`).

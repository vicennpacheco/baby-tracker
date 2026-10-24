<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Kidoo — instrucciones para agentes de código

Kidoo (nombre en clave; en producción, el MVP «Métricas Bebé») es un SaaS B2C multi-tenant para registrar y compartir en tiempo real el día a día de un bebé. Maneja **datos de salud de menores**, así que la privacidad y el aislamiento entre familias no son negociables.

**Fuente de verdad de las reglas:** [`CLAUDE.md`](./CLAUDE.md). Este archivo y `.cursor/rules/` solo resumen y apuntan a ella; si discrepan, manda `CLAUDE.md`.

Antes de proponer o escribir código:

1. Lee `CLAUDE.md` completo y la fase en curso de [`PLAN_ESCALABILIDAD_KIDOO.md`](./PLAN_ESCALABILIDAD_KIDOO.md). Las reglas marcadas **[Kx]** solo rigen cuando esa fase está aprobada.
2. Consulta las decisiones relacionadas en [`docs/architecture/decisions.md`](./docs/architecture/decisions.md). Nunca borres filas: se sustituyen.
3. Planifica y pide confirmación antes de cambios de esquema, dependencias nuevas, entornos o reglas.

Lo imprescindible:

- **Server Components por defecto.** Escrituras solo por Server Actions con `requireMember()` + Zod + `ActionResult`. Lecturas en `features/<m>/queries.ts` (`server-only`).
- **Aislamiento por familia** en cada query y action; RLS en todas las tablas (aplicada también al servidor desde K2 con `withTenant`).
- **Prisma 7** (cliente desde `@/generated/prisma/client`). El esquema solo cambia con Prisma Migrate, con *expand → migrate → contract*. Nunca `db push` ni DDL suelto.
- **Realtime** solo como señal `{table, op}` por el canal privado de la familia, nunca con datos.
- **IA** (desde K6): Gemini en Vertex AI UE, con consentimiento de la familia, herramientas de solo lectura y confirmación humana. El modelo nunca escribe.
- **TypeScript estricto:** sin `any`, `!` ni `@ts-ignore`. Fechas en UTC y días en la zona de la familia. Medidas como enteros con unidad.
- **UI:** mobile-first, objetivos de 48 px, pantallas en lugar de modales, modo oscuro, WCAG AA, tokens CSS y nada de colores literales.
- **Git:** nunca en `main` (despliega producción). Ramas cortas y Conventional Commits en inglés. Secretos, ids de infraestructura y hosts de producción, jamás en el repositorio.
- **Cierre:** `npm run typecheck`, `npm run lint` y `npm test` en verde, y el plan y los dos README (`README.md` en inglés y `README.es.md`) actualizados.

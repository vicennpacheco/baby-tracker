# Nidly

🇬🇧 **English** · 🇪🇸 [Leer en español](./README.es.md)

> **Mobile-first B2C SaaS** (installable PWA) that lets families log their baby's day in seconds (feedings, diapers, sleep, growth and health) and **share it in real time** with every caregiver, with data protected in the EU.
>
> **Status (2026-10-24):** the MVP, **"Métricas Bebé"**, has been in production since 2026-10-10 and is used by a real family on iOS and Android. **Nidly** is its evolution into a multi-tenant SaaS and is **under way**: see [`PLAN_ESCALABILIDAD_NIDLY.md`](./PLAN_ESCALABILIDAD_NIDLY.md) (in Spanish). "Kidoo" was a codename and has been **dropped** because of trademark risk; the final name is **Nidly** (decision 087). The plan was approved on 2026-10-24 and phase **K0** is in progress.

---

## Overview

In the first months with a baby there are questions the pediatrician always asks and that nobody remembers at 4 a.m.: when did the baby last eat? Which breast? How many wet diapers today? How long did the baby sleep? And when several people take care of the baby, the questions multiply: did you already give the bottle?

Nidly is a quick log designed to be used **one-handed, in low light and half asleep**, shared by the whole family: what one caregiver logs shows up instantly on everyone else's phone. On top of that reliable base, Nidly adds what you need to understand the data, without interpreting it medically:
- WHO growth percentiles;
- a report for the pediatrician;
- sleep window predictions;
- an AI assistant that logs from text or voice, with your confirmation.

### Product principles

1. **Log in ≤ 3 taps** from the home screen for frequent actions (feeding, diaper, sleep). With voice or free text, in one.
2. **One hand, low light:** big buttons, primary actions within thumb reach and dark mode from day one.
3. **Smart defaults:** time = now, suggest the breast opposite to the last one, remember the last bottle amount.
4. **Simple screens instead of modals:** every form is its own screen with a "Back" button.
5. **One truth, on every phone:** data lives in the cloud and syncs in real time across all of the family's devices.
6. **European privacy by design:**
   - data and compute in the EU;
   - strict isolation between families in the database;
   - AI only with consent, and never trained on your data.
7. **Never a diagnosis:** Nidly logs, summarizes and compares with references. When in doubt, ask your pediatrician.

### Features

| Module | What it does | Status |
|---|---|---|
| **Family & access** | Email + code login, create a family and baby (two-step wizard), invite with a single-use code, remove a member, leave and delete the family | ✅ In production |
| **Feeding** | Left/right breast with a shared timer and suggested side; bottle with ml and milk type | ✅ In production |
| **Diapers** | Wet / dirty / mixed in one tap; stool color and consistency | ✅ In production |
| **Sleep** | Shared timer, late start ("10 min ago") and manual entry | ✅ In production |
| **Growth** | Weight, length and head circumference with weight change | ✅ In production |
| **Health** | Vaccines and medications with dose and reactions; repeat a medication in one tap | ✅ In production |
| **Today** | Last feeding, daily totals, running timers, day navigation | ✅ In production |
| **Sync & PWA** | Real time across devices; installable on iOS and Android; offline page | ✅ In production |
| **Languages** | Spanish and English in the first version; metric or imperial units | 📐 K1 |
| **Multi-tenant** | Several families per user, roles (owner, member, caregiver, view-only), RLS isolation on the server | 📐 K2 |
| **Family chat** | Messages between the family's caregivers, in real time | 📐 K3 |
| **WHO percentiles** | Growth curves with corrected age for preterm babies | 📐 K4 |
| **Pediatrician report** | PDF for a period and a time-limited share link | 📐 K5 |
| **AI assistant** | Natural-language logging and questions about the baby's data, with confirmation | 📐 K6 |
| **Voice** | Dictated logging, one-handed | 📐 K7 |
| **Sleep prediction** | Explained suggested window for the next nap | 📐 K8 |
| **Plans** | Freemium: logging and sync are free | 📐 K9 |

> **Disclaimer:** Nidly is a logging tool. It does not give medical advice or diagnoses. When in doubt, ask your pediatrician.

---

## Engineering highlights

- **Concurrency solved in the database:**
  - two caregivers can start the same nap at the same time and only one is created (partial unique index);
  - stopping a timer is idempotent, and double taps never create duplicates (client-generated UUIDs);
  - all of it is tested with real collisions against Postgres.
- **Real time without leaks:** a trigger sends only `{table, op}` over a **private** Broadcast channel, and each device re-reads from the server. `postgres_changes` was dropped because its `DELETE` events reached any account (decision 066).
- **Layered security:**
  - authorization on the server in every query and action;
  - RLS on every table and the Data API disabled;
  - in phase K2, RLS also for server queries (`SET LOCAL ROLE` per transaction).
- **Correct dates in any time zone:** UTC in the database, "today" computed in the family's time zone, and sessions that cross midnight split between both days.
- **Risk-free PWA:** a hand-written service worker that never stores family data; installable on iOS and Android.
- **Measurable quality:**
  - strict TypeScript;
  - 545 tests, with integration tests against real Postgres;
  - mutation checks for every security barrier;
  - verified WCAG AA;
  - 85 documented architecture decisions.

---

## Tech stack

| Layer | Technology | Status | Role |
|---|---|---|---|
| Framework | **Next.js** 16 (App Router, Cache Components) | In use | Routing, Server Components, Server Actions |
| UI runtime | React 19 | In use | `useTransition`, `useOptimistic` |
| Language | **TypeScript** (strict mode) | In use | End-to-end typing |
| Styling & components | **Tailwind CSS** 4 + **shadcn/ui** (Base UI) | In use | Design tokens in CSS, accessible components |
| Database | **Supabase PostgreSQL** (eu-west-3) | In use | Single source of truth |
| ORM | **Prisma** 7 + `@prisma/adapter-pg` | In use | Schema, migrations and typed client |
| Authentication | Supabase Auth + `@supabase/ssr` | In use | Email OTP, cookie session |
| Real time | Supabase Realtime (private Broadcast) | In use | Per-family change signal |
| Validation & forms | **Zod** 4, React Hook Form | In use | Schemas shared by client and server |
| Dates | date-fns + `@date-fns/tz` | In use | Days in the family's time zone |
| Tests | Vitest | In use | Unit + integration against real Postgres |
| Hosting | Vercel (`cdg1`, Paris) | In use | Functions in the EU |
| CI/CD | GitHub Actions | 📐 K0 | CI on every PR, staging → production migrations |
| i18n | `next-intl` | 📐 K1 | ICU messages per language, no locale prefix in routes |
| Storage | Supabase Storage | 📐 K5 | Private PDF reports |
| PDF | `@react-pdf/renderer` | 📐 K5 | Pediatrician report |
| AI | Vercel AI SDK + **Gemini on Vertex AI (EU)** | 📐 K6 | Structured output, read-only tools |
| Vectors | `pgvector` | 📐 K6 | Curated guidance corpus |
| Payments | To be decided (Stripe recommended) | 📐 K9 | Per-family subscriptions |

Requirement: **Node.js 24 LTS**. Prisma is pinned to **stable 7.x**, because npm's `latest` tag points to a Prisma 8 release candidate. Versions of new dependencies are verified when they are installed.

---

## Architecture

**Today (MVP in production):**

```
  Phone A / Phone B (PWA)            Next.js server (Vercel, EU)         Supabase (EU)
  ───────────────────────            ───────────────────────────         ─────────────
  Client Components                  Server Actions                      PostgreSQL
  (forms, timers)       ───────────▶ auth → Zod → Prisma ───────────▶   (source of truth, RLS)
           ▲                         Server Components   DATABASE_URL        │ triggers
           │ HTML/RSC ◀──────────── queries (Prisma)     pooler :6543        ▼
  RealtimeSync ◀──── private WebSocket household:<id> ◀──────────── Realtime Broadcast ({table, op})
  (router.refresh())
```

**Nidly (target):**
- RLS also applied to server queries (`withTenant` + `app_tenant` role);
- `next-intl`;
- chat over the same private channel;
- an assistant using Gemini on Vertex AI (EU), with read-only tools and human confirmation;
- reports in private Storage with signed links;
- CI/CD with a staging environment.

The full diagram is in [`PLAN_ESCALABILIDAD_NIDLY.md` §5](./PLAN_ESCALABILIDAD_NIDLY.md#5-arquitectura-objetivo).

**Principles:**
- **Reads:** Server Components with Prisma, through `features/<module>/queries.ts`. No internal REST API.
- **Writes:** Server Actions that check the session, family and role, validate with Zod, write, revalidate and return a typed `ActionResult<T>`. Neither the client nor the AI writes directly.
- **Sync:** Realtime is only a "something changed" signal. Each device re-reads from the server, and no health data travels over the socket.
- **Security:** server-side authorization in every query and action, RLS on every table, Data API disabled and data in the EU.

The detailed architecture, code and design rules are in [`CLAUDE.md`](./CLAUDE.md), and the decisions in [`docs/architecture/decisions.md`](./docs/architecture/decisions.md) (both in Spanish).

---

## Data model

Prisma models in PascalCase mapped to snake_case tables and columns (`feedings.baby_id`). `uuid` ids (generated on the client so creates are idempotent), `timestamptz` dates (UTC) and measurements stored as **integers with the unit in the field name**.

| Model | Main fields | Status |
|---|---|---|
| `Household` | `name` (+ `timeZone` in K2) | In use |
| `HouseholdMember` | `householdId`, `userId`, `role`, `displayName` | In use (N:M and roles in K2) |
| `HouseholdInvite` | `householdId`, `codeHash`, `expiresAt`, `usedAt?` (+ `role` in K2) | In use |
| `Baby` | `householdId`, `name`, `birthDate`, `sex?` (+ `gestationalAgeWeeks`, `updatedById` in K2) | In use |
| `Feeding` · `DiaperChange` · `SleepSession` · `GrowthMeasurement` · `HealthRecord` | Baby records with `babyId`, `createdById`, `updatedById` | In use |
| `Profile` | `locale`, `measurementSystem` | K1 |
| `HouseholdMessage` · `HouseholdMessageRead` | Family chat | K3 |
| `GrowthReferenceLms` | WHO tables (L, M, S) | K4 |
| `ReportExport` · `ReportShareLink` | Reports and links | K5 |
| `AiConsent` · `AiUsage` · `AiInteraction` · `KnowledgeChunk` | AI assistant | K6 |
| `SleepPrediction` | Batch prediction (V2) | K8 |
| `Subscription` · `BillingEvent` | Plans | K9 |

The planned migrations (SQL drafts) are in [`PLAN_ESCALABILIDAD_NIDLY.md` §11](./PLAN_ESCALABILIDAD_NIDLY.md#11-migraciones-sql-borradores).

---

## Project structure

```
baby-tracker/                    # renamed with the final brand (K9)
├── prisma/
│   ├── schema.prisma            # Models (URLs live in prisma.config.ts, Prisma 7)
│   ├── migrations/              # Prisma SQL + RLS, partial indexes, grants and triggers
│   ├── platform/                # supabase-bootstrap.sql (once per project, as postgres) and shadow-stubs.sql
│   └── seed.ts                  # Dev/staging only
├── prisma.config.ts             # DIRECT_URL for the Prisma CLI
├── public/sw.js                 # Hand-written service worker (never stores family data)
├── scripts/                     # Test DB; verify-db.ts (K0); WHO reference loader (K4)
├── src/
│   ├── proxy.ts                 # Supabase session refresh
│   ├── app/                     # Routing and composition only
│   │   ├── (auth)/              # login/, join/
│   │   ├── (app)/(tabs)/        # With the bottom bar: Today, Feeding, Diapers, Sleep, More…
│   │   ├── (app)/(task)/        # Without the bar: create, edit, invite…
│   │   ├── offline/             # "Offline" page
│   │   └── manifest.ts          # PWA manifest
│   ├── features/<module>/       # schemas · queries · actions · service · labels · components
│   ├── components/              # ui/ (shadcn) · layout/ · shared/
│   ├── i18n/                    # next-intl (K1)
│   ├── lib/                     # supabase/, db.ts, tenant-db.ts (K2), env.ts, dates.ts…
│   └── generated/prisma/        # Generated Prisma client (do not edit)
├── messages/<locale>/           # Message catalogs (K1)
├── docs/
│   ├── architecture/decisions.md      # Architecture decision log (ADR 001–085)
│   └── superpowers/plans/             # Detailed plan for each phase
├── PLAN_ESCALABILIDAD_NIDLY.md  # Nidly technical vision and development order
├── CLAUDE.md                    # Rules for Claude (and for any contributor)
├── AGENTS.md                    # Entry point for coding agents
└── .cursor/rules/               # Cursor rules (point to CLAUDE.md)
```

---

## Roadmap

### MVP "Métricas Bebé" — ✅ done (2026-10-07 → 2026-10-12)

| Phase | Scope | Status |
|---|---|---|
| 1 · Setup, DB and auth | Next.js 16, Prisma 7 on Supabase EU, RLS, OTP login, `requireMember()` | ✅ |
| 2 · Backend | Idempotent actions, concurrency-safe timers, daily summary, invites (ADR-043), 337 tests | ✅ |
| 3 · UI/UX | All five modules, onboarding, settings, AA accessibility | ✅ 2026-10-09 |
| 4 · Dashboard, sync, PWA and deploy | "Today", private Broadcast, PWA installed on iOS and Android, Vercel + Supabase in production | ✅ 2026-10-12 |

Left over from the MVP, taken over by Nidly:
- [ ] Lighthouse performance and accessibility ≥ 90 in production (including the 1.5 s on 4G target). → K9
- [ ] Final icons. → K1 / K9, together with the brand

Each phase is detailed in the plans in [`docs/superpowers/plans/`](./docs/superpowers/plans/) and in decisions 001–072.

### Nidly — 🚧 in progress (K0)

Strict order: each phase starts when the previous one meets its exit criteria. Details in [`PLAN_ESCALABILIDAD_NIDLY.md` §12](./PLAN_ESCALABILIDAD_NIDLY.md#12-orden-secuencial-estricto-de-desarrollo).

- [ ] **K0 · Foundations:**
  - `v1.0.0-mvp` tag and protected `main`;
  - a **staging** project;
  - CI with an ephemeral Postgres;
  - staging → production migrations with manual approval and `verify-db`;
  - tests moved out of the production instance.
- [ ] **K1 · i18n and brand:** `next-intl`, `es` + `en`, profile with language and units, imperial units, test pseudo-locale, name and icons.
- [ ] **K2 · Multi-tenant:** several families per user, roles, active family, per-family time zone, **RLS enforced on the server** (`withTenant`), isolation test suite.
- [ ] **K3 · Family chat** (optional Web Push).
- [ ] **K4 · WHO percentiles** with corrected age.
- [ ] **K5 · PDF report** for the pediatrician with a time-limited link.
- [ ] **K6 · AI assistant** for text (requires an approved DPIA and DPA).
- [ ] **K7 · Voice logging.**
- [ ] **K8 · Sleep window prediction.**
- [ ] **K9 · Monetization and launch:** plans, legal, brand, Lighthouse.

---

## Getting started

```bash
npm install
cp .env.example .env          # Today: the Supabase project's values; from K0 on: staging's
```

1. **Only the first time for each Supabase project:** run [`prisma/platform/supabase-bootstrap.sql`](./prisma/platform/supabase-bootstrap.sql) as `postgres` (Supabase MCP or SQL editor). It creates the helpers the migration needs and that the `prisma` role cannot create (decision 027).
2. Apply the migrations and generate the client:

   ```bash
   npx prisma migrate deploy  # Today the only project is production (decision 068): never run migrate dev against it
   ```

3. Sample data (**dev/staging only**; the seed refuses any other project):

   ```bash
   SEED_DEV_PROJECT_REF=<ref> SEED_OWNER_USER_ID=<your-id> npx prisma db seed
   npm run dev                                    # http://localhost:3000
   ```

4. Tests:

   ```bash
   npm run test:db                                # creates and migrates the test DB
   npm test                                       # unit + integration
   ```

| Variable | Where it comes from (Supabase dashboard → **Connect** button) | Used for |
|---|---|---|
| `DATABASE_URL` | Transaction pooler, port **6543**, adding `?pgbouncer=true` | Prisma Client in the app |
| `DIRECT_URL` | Session pooler, port **5432** (or the direct connection over IPv6) | Prisma CLI: migrations and Studio |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | Auth and Realtime in the browser |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_…`) | Auth and Realtime in the browser |
| `APP_TIMEZONE` | — (defaults to `Europe/Madrid`; from K2 on, the default for new families) | Computing "today" |
| `DATABASE_CA_CERT` | Database → Settings → SSL configuration (PEM) | Full TLS verification; required in production |

| Script | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm test` | Vitest: unit + integration |
| `npm run test:unit` / `npm run test:int` | Unit only (no network) / integration only |
| `npm run test:db` | Creates and migrates the test database |

---

## Contributing

1. Read [`CLAUDE.md`](./CLAUDE.md) (architecture, conventions, design and security) and the current phase of [`PLAN_ESCALABILIDAD_NIDLY.md`](./PLAN_ESCALABILIDAD_NIDLY.md). Both are in Spanish, the project's working language.
2. Work on a short-lived branch (`feat/…`, `fix/…`, `docs/…`, `db/…`), never on `main`, which deploys to production.
3. Commits follow Conventional Commits, in English. One migration per PR, always *expand → migrate → contract*.
4. If you change the README, update its Spanish version (`README.es.md`) in the same commit.
5. Coding agents (Claude, Cursor and others) follow the same rules: [`AGENTS.md`](./AGENTS.md) and [`.cursor/rules/`](./.cursor/rules/) point to `CLAUDE.md`.

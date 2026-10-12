# Baby Tracker

> MVP de una aplicación web **mobile-first** (preparada para PWA) para que padres primerizos registren en segundos las métricas diarias de su bebé (tomas, pañales, sueño, crecimiento y salud) con los datos **sincronizados en tiempo real entre los móviles de ambos padres**.

---

## Descripción

En los primeros meses con un bebé hay preguntas que el pediatra siempre hace y que, a las 4 de la madrugada, nadie recuerda: ¿cuándo comió por última vez? ¿De qué pecho? ¿Cuántos pañales mojados lleva hoy? ¿Cuánto ha dormido? Y cuando cuidan dos personas, la pregunta se multiplica: ¿ya le diste tú el biberón?

**Baby Tracker** (en la interfaz, «Métricas Bebé») es un registro rápido pensado para usarse **con una mano, con poca luz y medio dormido**, compartido por toda la familia: lo que registra un progenitor aparece al instante en el móvil del otro. El objetivo del MVP no es analizar ni diagnosticar, sino **capturar datos fiables con la mínima fricción** y mostrarlos en un resumen diario claro.

### Principios de producto

1. **Registrar en ≤ 3 toques** desde la pantalla de inicio las acciones frecuentes (toma, pañal, sueño).
2. **Una mano, poca luz:** botones grandes, acciones principales al alcance del pulgar y modo oscuro desde el primer día.
3. **Valores por defecto inteligentes:** hora = ahora, sugerir el pecho contrario al último, recordar la última cantidad de biberón.
4. **Pantallas simples en lugar de modales:** cada formulario es una pantalla propia con su botón "Atrás".
5. **Una sola verdad, en todos los móviles:** los datos viven en la nube y se sincronizan en tiempo real entre todos los dispositivos de la familia.
6. **Datos protegidos:** solo los miembros de la familia acceden a ellos (autenticación + control de acceso por filas), alojados en una región de la UE.

### Alcance del MVP

| Módulo | Qué registra |
|---|---|
| **Familia y acceso** | Inicio de sesión con email y código, creación de la familia e invitación al otro progenitor. Ambos ven y editan los mismos datos. |
| **Alimentación** | Pecho izquierdo / derecho con inicio y fin (cronómetro o entrada manual). Biberón: ml y tipo de leche (materna o fórmula). |
| **Pañales** | Tipo (mojado, sucio, mixto), color y textura de las heces, notas. |
| **Sueño** | Cronómetro (iniciar / parar) o entrada manual de inicio y fin. Un cronómetro iniciado en un móvil se ve y se puede parar desde el otro. |
| **Crecimiento** | Peso, longitud/altura y perímetro craneal, con fecha de medición. |
| **Vacunas / Salud** | Vacunas y medicamentos: nombre, dosis, fecha y hora, reacciones. |
| **Dashboard** | Resumen de hoy: última toma, totales del día, pañales, horas de sueño, cronómetros activos y accesos rápidos. |

### Fuera del alcance del MVP (backlog)

- Roles y permisos avanzados (p. ej. abuelos o cuidadores con acceso de solo lectura).
- Escritura sin conexión (cola de registros offline y sincronización posterior). El MVP ya genera los IDs en el cliente para que añadirla después no exija rediseñar.
- Curvas de percentiles de la OMS y gráficas avanzadas.
- Exportación a PDF/CSV para la consulta del pediatra.
- Recordatorios y notificaciones push (próxima toma, próxima dosis).
- Avisos informativos basados en guías (p. ej. colores de heces que conviene consultar).
- Selector de varios bebés en la UI (el modelo de datos ya lo soporta desde el inicio).
- Multi-idioma (el MVP es solo en español).

> **Aviso:** la aplicación es una herramienta de registro. No ofrece consejo médico ni interpreta los datos. Ante cualquier duda, consulta con tu pediatra.

---

## Stack tecnológico

| Capa | Tecnología | Versión objetivo¹ | Rol |
|---|---|---|---|
| Framework | **Next.js** (App Router) | 16.x | Routing, Server Components, Server Actions |
| UI runtime | React | 19.x | `useTransition`, `useOptimistic`, `useActionState` |
| Lenguaje | **TypeScript** (modo estricto) | la que instale `create-next-app`² | Tipado estricto de extremo a extremo |
| Estilos | **Tailwind CSS** | 4.x | Utilidades y tokens de diseño en CSS (`@theme`) |
| Componentes | **shadcn/ui** | CLI 4.x | Componentes accesibles copiados al repo |
| Base de datos | **Supabase** (PostgreSQL gestionado, región UE) | — | Fuente única de verdad en la nube |
| ORM | **Prisma ORM** + `@prisma/adapter-pg` + `pg` | **7.x estable**³ | Esquema, migraciones y cliente tipado |
| Autenticación | Supabase Auth + `@supabase/ssr` | 0.x | Sesión en cookies para Server Components y Server Actions |
| Tiempo real | Supabase Realtime (`@supabase/supabase-js`) | 2.x | Avisar a los demás dispositivos de que hay cambios |
| Validación | **Zod** | 4.x | Esquemas compartidos cliente/servidor |
| Formularios | React Hook Form + `@hookform/resolvers` | 7.x / 5.x | Estado de formularios con validación Zod (integración estándar de shadcn/ui) |
| Fechas | date-fns + `@date-fns/tz` | 4.x / 1.x | Formato en español y cálculo de "días" en la zona horaria del hogar |
| Iconos | lucide-react | — | Iconografía (incluida con shadcn/ui) |
| Feedback UI | sonner | 2.x | Toasts ("Pañal guardado · Deshacer") |
| Tests | Vitest | 5.x | Tests de esquemas y lógica de dominio |
| Despliegue | Vercel (recomendado) u otra plataforma Node.js | — | Funciones en una región de la UE próxima a la de Supabase |

1. Versiones estables comprobadas en npm el 7 de octubre de 2026. Requisito: **Node.js 24 LTS** (mínimo 22.12, por Prisma 7).
2. En npm ya está TypeScript 7 (compilador nativo). Usar la versión que proponga `create-next-app` y no subir de versión mayor hasta confirmar que Next.js y `typescript-eslint` la soportan.
3. **Ojo:** el tag `latest` de `prisma` en npm apunta a una RC de Prisma 8. Instalar explícitamente `prisma@7` y `@prisma/client@7`.

---

## Arquitectura

```
  Móvil A / Móvil B (PWA)            Servidor Next.js                 Supabase (región UE)
  ───────────────────────            ────────────────                 ────────────────────
  Client Components                  Server Actions                   PostgreSQL
  (formularios, cronómetros) ──────▶ auth → Zod → Prisma ──────────▶  (fuente de verdad)
           ▲                         Server Components   DATABASE_URL        │
           │ HTML/RSC ◀──────────── queries (Prisma)     pooler :6543        │ cambios
           │                                                                 ▼
  RealtimeSync ◀──────────── WebSocket autenticado ◀──────────────── Supabase Realtime
  (router.refresh())

  Prisma CLI (migraciones) ───────── DIRECT_URL (session pooler o conexión directa :5432) ──▶ PostgreSQL
```

- **Lecturas:** los Server Components consultan PostgreSQL con Prisma a través de `features/<módulo>/queries.ts`. Sin API REST interna.
- **Escrituras:** Server Actions que comprueban la sesión y la familia del usuario, validan con Zod, escriben con Prisma, revalidan las rutas afectadas y devuelven un `ActionResult<T>` tipado.
- **Sincronización multi-dispositivo:**
  1. Un progenitor registra un pañal y la Server Action lo escribe en PostgreSQL.
  2. Supabase Realtime detecta el cambio y avisa, por un WebSocket autenticado, a los demás dispositivos de la familia.
  3. Cada dispositivo ejecuta `router.refresh()` y los Server Components vuelven a leer los datos.

  Realtime es **solo una señal de "hay cambios"**: la fuente de verdad es siempre la base de datos leída en el servidor.
- **Conexiones a la base de datos (estándar Supabase):** `DATABASE_URL` (pooler en modo transacción, puerto 6543) para la aplicación y `DIRECT_URL` (session pooler o conexión directa, puerto 5432) para las migraciones de Prisma.
- **Seguridad:** Supabase Auth para la identidad, autorización por familia en cada query y action del servidor, y Row Level Security (RLS) en todas las tablas como defensa en profundidad y filtro de Realtime.
- **Entornos:** un proyecto de Supabase para desarrollo (datos de prueba) y otro para producción (datos reales).

Las reglas detalladas de arquitectura, código y diseño están en [`CLAUDE.md`](./CLAUDE.md).

---

## Modelo de datos (borrador)

Los modelos Prisma van en PascalCase y se mapean a tablas y columnas en snake_case (`feedings.baby_id`). IDs `uuid`, fechas `timestamptz` (UTC) y medidas como **enteros con la unidad en el nombre del campo**.

| Modelo | Campos principales |
|---|---|
| `Household` | `name` (la familia) |
| `HouseholdMember` | `householdId`, `userId` (usuario de Supabase Auth), `role` (`OWNER` · `MEMBER`), `displayName` |
| `HouseholdInvite` | `householdId`, `code`, `expiresAt`, `usedAt?` |
| `Baby` | `householdId`, `name`, `birthDate`, `sex?` |
| `Feeding` | `type` (`BREAST_LEFT` · `BREAST_RIGHT` · `BOTTLE`), `startedAt`, `endedAt?` (*null* = toma en curso), `amountMl?`, `bottleContent?` (`BREAST_MILK` · `FORMULA`), `notes?` |
| `DiaperChange` | `occurredAt`, `type` (`WET` · `DIRTY` · `MIXED`), `stoolColor?`, `stoolConsistency?`, `notes?` |
| `SleepSession` | `startedAt`, `endedAt?` (*null* = durmiendo ahora), `notes?` |
| `GrowthMeasurement` | `measuredAt`, `weightGrams?`, `lengthMm?`, `headCircumferenceMm?` (al menos una medida obligatoria) |
| `HealthRecord` | `kind` (`VACCINE` · `MEDICATION`), `name`, `doseAmount?`, `doseUnit?`, `doseNumber?` (nº de dosis de la serie vacunal), `administeredAt`, `reaction?`, `notes?` |

Todos los registros del bebé (`Feeding`, `DiaperChange`, `SleepSession`, `GrowthMeasurement`, `HealthRecord`) incluyen `babyId` (borrado en cascada) y `createdById` (quién lo registró). Todos los modelos llevan `id`, `createdAt` y `updatedAt`. Los valores concretos de los enums de color y textura de heces y de unidades de dosis se cierran en la Fase 1.

---

## Estructura del proyecto (prevista)

```
baby-tracker/
├── prisma/
│   ├── schema.prisma          # Modelos (sin URLs de conexión: en Prisma 7 van en prisma.config.ts)
│   ├── migrations/            # SQL de Prisma + RLS, índices parciales y publicación Realtime
│   └── seed.ts                # Solo para el proyecto de desarrollo
├── prisma.config.ts           # Usa DIRECT_URL para la CLI de Prisma
├── public/                    # sw.js: service worker manual (los iconos los genera app/icon.tsx)
├── src/
│   ├── proxy.ts               # Refresco de la sesión de Supabase (antes middleware.ts)
│   ├── app/                   # Solo routing y composición de pantallas
│   │   ├── (auth)/            # login/, join/ (unirse con código de invitación)
│   │   ├── (app)/             # Pantallas autenticadas (RealtimeSync en la Fase 4)
│   │   │   ├── (tabs)/        # Con BottomNav: page.tsx ("Hoy"), feeding/ · diapers/ · sleep/ (historiales), more/ ("Más"), growth/ · health/ · settings/
│   │   │   └── (task)/        # Sin barra, una tarea por pantalla: feeding/new/ · feeding/[id]/edit/ · settings/invite/…
│   │   ├── offline/           # Página «Sin conexión» del service worker (estática)
│   │   └── manifest.ts        # Manifiesto de la PWA (icon.tsx y apple-icon.tsx generan los iconos)
│   ├── features/              # Un directorio por módulo de dominio
│   │   ├── feeding/
│   │   │   ├── schemas.ts     # Zod (compartido cliente/servidor)
│   │   │   ├── queries.ts     # Lecturas (server-only)
│   │   │   ├── actions.ts     # Server Actions ("use server")
│   │   │   ├── service.ts     # Lógica de dominio pura y testeable
│   │   │   ├── labels.ts      # Textos en español para los enums
│   │   │   └── components/
│   │   ├── diapers/ · sleep/ · growth/ · health/ · dashboard/
│   │   ├── auth/ · household/ # Sesión, requireMember(), familia e invitaciones
│   │   └── sync/              # RealtimeSync e indicador de conexión
│   ├── components/
│   │   ├── ui/                # shadcn/ui (generado)
│   │   ├── layout/            # BottomNav, PageHeader…
│   │   └── shared/            # DateTimeField, ChoiceGrid, EmptyState…
│   ├── lib/
│   │   ├── supabase/          # server.ts · client.ts (@supabase/ssr)
│   │   └── db.ts · env.ts · action-result.ts · dates.ts · utils.ts
│   └── generated/prisma/      # Cliente Prisma generado (no editar, ignorado en git)
├── CLAUDE.md
└── README.md
```

---

## Roadmap

### Fase 1 — Setup, base de datos y autenticación

**Objetivo:** un proyecto que compila, con el esquema migrado y verificado en Supabase, y con inicio de sesión funcionando.

- [x] Inicializar Next.js con App Router, TypeScript, Tailwind CSS, ESLint, carpeta `src/` y alias `@/*`.
- [x] Endurecer `tsconfig.json` (`strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`).
- [x] Prettier + `prettier-plugin-tailwindcss`; scripts `typecheck`, `lint`, `format`, `test`.
- [x] Inicializar shadcn/ui (tema, tokens de color por módulo, modo oscuro) y añadir los componentes base: Button, Card, Input, Label, Field (sustituye a Form, ver decisión 020), ToggleGroup, Tabs, Sonner, AlertDialog, Skeleton, InputOTP.
- [x] Proyecto de Supabase **dev** (`baby-tracker`, eu-west-3) con la Data API desactivada, porque el acceso a datos va por Prisma. El proyecto **prod** se crea al desplegar (Fase 4, decisión 026).
- [x] Rol de base de datos dedicado `prisma`, según la guía de Supabase para Prisma.
- [x] Instalar `prisma@7`, `@prisma/client@7`, `@prisma/adapter-pg` y `pg`.
- [x] Configurar las **dos URLs de conexión**: `DATABASE_URL` (pooler transaccional, puerto 6543, `?pgbouncer=true`) para la app y `DIRECT_URL` (session pooler o conexión directa, puerto 5432) para las migraciones en `prisma.config.ts`.
- [x] `.env` y `.env.example` con `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` y `APP_TIMEZONE`, validados con Zod en `src/lib/env.ts` (y `src/lib/public-env.ts` para el cliente).
- [x] Modelar el esquema completo: familia, miembros, invitaciones, bebé y registros; enums nativos, UUID, `timestamptz`, mapeo snake_case e índices `(baby_id, fecha)`.
- [x] Migración inicial (`prisma migrate dev --name init`, contra **dev**) con SQL adicional en la misma migración:
  - RLS activado en todas las tablas y políticas `SELECT` solo para miembros de la familia;
  - índices únicos parciales (una sola toma de pecho y una sola siesta activas por bebé);
  - tablas añadidas a la publicación `supabase_realtime`.
- [x] **Verificar la migración vía MCP de Supabase:** `_prisma_migrations`, tablas, RLS, políticas, publicación y *advisors* de seguridad.
- [x] `prisma/seed.ts` con una familia, un bebé y unos 3 días de datos realistas (solo en dev).
- [x] Singleton de `PrismaClient` en `src/lib/db.ts` con `PrismaPg` sobre `DATABASE_URL`, protegido con `server-only`.
- [x] Supabase Auth: clientes `@supabase/ssr` (servidor y navegador), refresco de sesión en `src/proxy.ts` y login con email + código de 8 dígitos (SMTP propio con `{{ .Token }}` en las plantillas *Magic Link* y *Confirm signup*).
- [x] Helper `requireMember()` que devuelve `userId` y `householdId`, o redirige al login.
- [x] Helpers de fechas en `src/lib/dates.ts` (inicio/fin de día en la zona del hogar, duraciones, formato en español).

**Criterio de salida:** `npm run build`, `npm run typecheck` y `npm run lint` pasan; la migración figura como aplicada y verificada vía MCP sin avisos de seguridad críticos; un usuario puede iniciar sesión.

### Fase 2 — Backend / acciones

**Objetivo:** toda la lógica de lectura y escritura, autorizada, validada y probada, sin depender de la UI.

- [x] Tipo `ActionResult<T>` y helpers (`ok`, `validationError`, `handleActionError`). *(Adelantado a la Fase 1: lo necesitan las acciones de login.)*
- [x] Autorización en todas las queries y actions: `requireMember()` y comprobación de que el `babyId` pertenece a la familia del usuario (`assertBabyInHousehold()`, `requireBaby()`; cada query y action nueva los usa).
- [x] Familia: crear familia y bebé, generar código de invitación (con caducidad) y unirse con código (`features/household`: código Crockford de 10 caracteres, solo su hash en la BD, 24 h, un solo uso, máximo 2 miembros, canje atómico; ADR-043).
- [x] Esquemas Zod por módulo (alta y edición) con mensajes en español y reglas cruzadas: `endedAt > startedAt`, `amountMl` obligatorio en biberón, al menos una medida en crecimiento, rangos plausibles, sin fechas futuras. *(Esquemas paramétricos por zona horaria, `<entidad>Schemas(timeZone)`; decisiones 049, 050 y 052.)*
- [x] Queries por módulo: listado por día, detalle, último registro y sesión activa. *(Las sesiones que cruzan la medianoche aparecen en los dos días; decisión 053.)*
- [x] Server Actions CRUD por módulo, **idempotentes**: el cliente envía el UUID del registro, así que un doble toque o un reintento no duplica nada. Todas guardan `createdById`. *(`insertOnce`, ediciones con `updatedById` y borrado idempotente; decisión 050.)*
- [x] Acciones de cronómetro seguras ante concurrencia: `startFeeding` / `stopFeeding` y `startSleepSession` / `stopSleepSession`, más `switchFeedingSide` (cambio de pecho en una transacción; decisión 051).
  - Inicio: el índice único parcial impide dos sesiones activas a la vez, y el conflicto se devuelve como `CONFLICT`.
  - Parada: idempotente; si el otro progenitor ya la paró, no da error.
- [x] Servicio de resumen diario (`getDailySummary`) calculado en la zona horaria del hogar, incluyendo sesiones que cruzan la medianoche. *(`features/dashboard`: recuentos por día de inicio y duraciones repartidas por tramos; decisión 053.)*
- [x] Revalidación de rutas tras cada mutación (`/` y la lista del módulo).
- [x] Tests con Vitest (337 en total, con pruebas de mutación de las barreras de concurrencia):
  - esquemas Zod, duraciones y resumen diario;
  - concurrencia: doble alta con el mismo UUID, dos inicios de siesta simultáneos, doble parada;
  - autorización: un usuario no puede leer ni modificar datos de otra familia.

**Criterio de salida:** cada action cubierta por tests (incluidos concurrencia y autorización), cero `any`, y todos los errores esperados devueltos como `ActionResult`.

### Fase 3 — UI/UX de los módulos

**Objetivo:** registrar y consultar cada módulo desde el móvil con una mano.

**Estado:** terminada el 2026-10-09.

- [x] Pantallas de acceso: login con email + código, crear familia y bebé, e invitar o unirse con código (el código se muestra una sola vez: botones "Compartir" y "Generar otro"). *(`/join`, `/join/create`, `/join/code` y `/settings/invite`; decisiones 046–048.)*
- [x] Ajustes de familia: ver miembros e invitación pendiente, y expulsar a un miembro (respuesta si un código se filtra antes de que se una la pareja). *(Solo quien creó la familia expulsa; expulsar revoca los códigos pendientes y "Anular código" los invalida, bajo el mismo bloqueo que el canje; interruptor de tema; decisión 064.)*
- [x] Layout base: `PageHeader`, `BottomNav` (Hoy · Tomas · Pañales · Sueño · Más), contenedor `max-w-md` y *safe areas* de iOS. *(Grupos `(tabs)` y `(task)`, pantalla Más y pantallas provisionales por módulo; decisiones 054 y 055.)*
- [x] Componentes compartidos: `DateTimeField` con atajos ("Ahora", "−5 min", "−15 min", "−30 min"), `NumberStepper`, `ChoiceGrid` (opciones como botones grandes), `SubmitButton` con estado pendiente y `EmptyState`. *(Además `DayNav`, `TextField`, `FormFooter`, `FormSkeleton`, `LinkCard`, `DeleteRecordButton`, `offerUndo` y `useSingleFlight`; decisiones 057 y 060.)*
- [x] **Alimentación:** botones "Pecho izq." / "Pecho der." con cronómetro, sugerencia del siguiente pecho, biberón con cantidades rápidas (60 / 90 / 120 / 150 ml) e historial del día. *(Cronómetro compartido con "Cambiar de pecho" y "Parar", biberón en dos toques precargado con el último, alta con otra hora, edición y borrado con autoría y `?day=`; decisiones 059–061.)*
- [x] **Pañales:** registro en un toque (Mojado / Sucio / Mixto) y detalle opcional de color y textura con muestras visuales y texto. *(Historial por día con `?day=`, alta con otra hora, edición y borrado con autoría; decisiones 056–058.)*
- [x] **Sueño:** cronómetro grande iniciar / parar y entrada manual. *(Inicio tardío «hace 5 / 10 / 15 min» calculado en el servidor y sin solaparse con el sueño anterior, historial con `?day=` y noches en los dos días, edición y borrado de siestas terminadas; decisión 062.)*
- [x] **Crecimiento:** formulario de medidas e historial. *(Entrada en kg/cm con coma, último valor de cada medida y variación de peso; decisión 063.)*
- [x] **Vacunas / Salud:** alta de vacuna o medicamento, historial y reacciones. *(Dosis y unidad juntas, número de dosis solo en vacunas, repetir un medicamento reciente en un toque; decisión 063.)*
- [x] Autoría visible y discreta en historiales ("por Ana"). *(`RecordHistoryItem` en los cinco módulos y "Registrado por… · editado por…" en cada edición.)*
- [x] Editar y borrar registros (confirmación con `AlertDialog`) y "Deshacer" en el toast tras crear. *(En los cinco módulos; decisiones 056, 060 y 063.)*
- [x] Mensaje claro cuando hay conflicto (p. ej. "Ya hay una siesta en curso, iniciada por Ana"). *(Los únicos conflictos son los de los cronómetros de Tomas y Sueño; decisiones 051, 059 y 062.)*
- [x] `loading.tsx` (skeletons), `error.tsx` y `not-found.tsx` en cada segmento. *(`error.tsx` con `retry()` en `(auth)`, `(tabs)` y `(task)`; `loading.tsx` en `(tabs)` y `(task)`; `not-found.tsx` en `(task)` y en la raíz, y `global-error.tsx`; decisión 063.)*
- [x] Revisión de accesibilidad: objetivos táctiles ≥ 48 px, contraste AA, foco visible y etiquetas. *(Por módulo al cerrar cada uno y global el 2026-10-09; el contraste de los tokens lo protege `theme-tokens.test.ts`; decisiones 055, 058 y 061.)*

**Criterio de salida:** flujo completo de cada módulo probado en un móvil real (o emulación de 375 × 667) en modo claro y oscuro.

### Fase 4 — Dashboard, PWA y sincronización multi-dispositivo

**Objetivo:** una pantalla de inicio útil de un vistazo y una app instalable que funcione con **varios clientes simultáneos**.

**Estado:** dashboard, sincronización y despliegue terminados el 2026-10-10; PWA (manifiesto, *service worker* y metadatos de iOS) el 2026-10-12. Queda verificar la instalación en los dos móviles y Lighthouse.

> **Requisito de arquitectura de la PWA:** la app está diseñada para que varios clientes trabajen a la vez (ambos padres, cada uno con uno o más dispositivos) contra **una única fuente de verdad en la nube** (Supabase PostgreSQL).
> - Ningún dispositivo guarda una copia propia de los datos que pueda divergir.
> - Los cambios se propagan con Supabase Realtime.
> - Los conflictos se resuelven en la base de datos: idempotencia por UUID, índices únicos parciales y paradas idempotentes.
> - El service worker solo cachea el *shell* estático, **nunca** respuestas con datos del usuario.

**Dashboard**

- [x] Dashboard "Hoy": última toma (hace cuánto, qué pecho y quién la registró), nº de tomas y ml totales, pañales mojados/sucios, horas de sueño, cronómetros activos y accesos rápidos a cada registro. *(Decisiones 065 y 067.)*
- [x] Navegación entre días (ayer / hoy) en el resumen. *(Con `?day=` y selector de fecha nativo; decisión 067.)*

**Sincronización en la nube (multi-cliente)**

- [x] `RealtimeSync` en el layout autenticado *(por Broadcast privado por familia, no `postgres_changes`: resuelve la limitación de los `DELETE`; decisión 066)*:
  - suscripción autenticada a los cambios de las tablas del bebé con Supabase Realtime;
  - al recibir un evento, `router.refresh()` con *debounce*;
  - los eventos `DELETE` no se pueden filtrar por `baby_id` (limitación de `postgres_changes`): suscribirse a ellos por separado o pasar a Broadcast (regla 2.8).
- [x] Reconexión robusta: al volver a primer plano (`visibilitychange`) o al recuperar la red (`online`), refrescar los datos y restablecer la suscripción. Los navegadores móviles cierran los WebSockets en segundo plano.
- [x] Indicador de estado de conexión (en línea · reconectando · sin conexión). Sin conexión, los botones de registro se deshabilitan con un mensaje claro: en el MVP no hay escritura offline.
- [x] Cronómetros compartidos: lo que inicia un progenitor lo ve en marcha, y lo puede parar, el otro.
- [x] Prueba con dos sesiones simultáneas (dos dispositivos o navegadores con usuarios distintos de la misma familia):
  - un registro en A aparece en B en menos de 2 s;
  - dos inicios de siesta simultáneos generan un solo registro;
  - los dobles toques no duplican nada.

**PWA**

- [x] `app/manifest.ts` (nombre, iconos 192/512 y *maskable*, `display: standalone`, `theme_color`). *(Iconos provisionales generados con `next/og`; decisión 072.)*
- [x] Service worker con caché del *shell* estático y pantalla "Sin conexión" (elegir entre Serwist o un SW manual según la compatibilidad con la versión de Next.js/Turbopack). Las respuestas autenticadas (HTML/RSC con datos) no se cachean. *(SW manual en `public/sw.js`, sin dependencias: solo guarda `/offline`, sus recursos y los iconos; decisión 072.)*
- [x] Metadatos para iOS (`apple-touch-icon`, `appleWebApp`) y `viewport` con `themeColor` claro/oscuro. *(Más la tarjeta «Añádela a tu pantalla de inicio» en «Hoy» para iPhone y iPad; decisión 072.)*
- [ ] Verificar instalabilidad (Chrome DevTools → Application) y Lighthouse de rendimiento y accesibilidad ≥ 90. *(Manifiesto, iconos, SW y página offline verificados en un build de producción local el 2026-10-12; falta instalarla en los dos móviles y pasar Lighthouse en producción.)*

**Despliegue**

- [x] Vercel (u otra plataforma) con las funciones en una región de la UE próxima a Supabase. *(Desplegado en Vercel el 2026-10-10, con las funciones en `cdg1`, París.)*
- [x] *(Decisión 068: el proyecto existente, ya configurado así, es el de producción.)* Proyecto de Supabase **prod** en la UE, igual que dev: `prisma/platform/supabase-bootstrap.sql`, Data API desactivada, SMTP propio con `{{ .Token }}` en **las dos** plantillas, *Magic Link* y *Confirm signup* (un email nuevo recibe *Confirm signup*, porque `signInWithOtp` lo da de alta), y longitud del código OTP en 8.
- [x] Variables de entorno de producción (incluida `DATABASE_CA_CERT`) y `prisma migrate deploy` contra el proyecto **prod**, verificado vía MCP. *(Variables introducidas por el usuario; 3 migraciones, los *triggers* y las particiones de mensajes verificados vía MCP el 2026-10-10.)*

**Criterio de salida:**
- La app se instala en Android e iOS y abre en modo *standalone*.
- Dos móviles de la misma familia ven los mismos datos en menos de 2 s.
- Las pruebas de concurrencia no generan duplicados.
- El dashboard carga en menos de 1,5 s en 4G.

---

## Puesta en marcha

```bash
npm install
cp .env.example .env          # Rellenar con los datos del proyecto Supabase de desarrollo
```

1. **Solo la primera vez por proyecto de Supabase:** ejecutar [`prisma/platform/supabase-bootstrap.sql`](./prisma/platform/supabase-bootstrap.sql) como `postgres` (MCP de Supabase o editor SQL). Crea los *helpers* que la migración necesita y que el rol `prisma` no puede crear (decisión 027).
2. Aplicar las migraciones y generar el cliente:

   ```bash
   npx prisma migrate dev     # Solo contra dev; en prod: npx prisma migrate deploy
   ```

3. Iniciar sesión una vez en la app y cargar los datos de ejemplo con tu id de Supabase Auth (Authentication → Users):

   ```bash
   SEED_DEV_PROJECT_REF=<ref-dev> SEED_OWNER_USER_ID=<tu-id> npx prisma db seed   # Solo dev: se niega con cualquier otro proyecto
   npm run dev                                    # http://localhost:3000
   ```

4. Tests de integración: crear y migrar una vez la base de datos de test `baby_tracker_test` dentro del proyecto **dev** (usa `SEED_DEV_PROJECT_REF` de `.env`):

   ```bash
   npm run test:db
   npm test                                       # unit + integración
   ```

| Variable | De dónde sale (panel de Supabase → botón **Connect**) | Uso |
|---|---|---|
| `DATABASE_URL` | Transaction pooler, puerto **6543**, añadiendo `?pgbouncer=true` | Prisma Client en la app |
| `DIRECT_URL` | Session pooler, puerto **5432** (o conexión directa si tu red tiene IPv6) | Prisma CLI: migraciones y Studio |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto | Auth y Realtime en el cliente |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave publicable (`sb_publishable_…`) | Auth y Realtime en el cliente |
| `APP_TIMEZONE` | — (por defecto `Europe/Madrid`) | Cálculo de "hoy" y resúmenes diarios |
| `DATABASE_CA_CERT` | Database → Settings → SSL configuration → certificado (PEM) | Verificación TLS completa; obligatorio en el despliegue de producción |

| Script | Uso |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y servidor de producción |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm test` | Vitest: unit + integración |
| `npm run test:unit` / `npm run test:int` | Solo unit (sin red) / solo integración (`baby_tracker_test`) |
| `npm run test:db` | Crea y migra la base de datos de test en el proyecto dev |
| `npx prisma migrate status` | Estado de las migraciones |
| `npx prisma studio` | Explorar la base de datos |

---

## Contribuir

Antes de proponer o escribir código, lee [`CLAUDE.md`](./CLAUDE.md): define la arquitectura, las convenciones y las reglas de diseño del proyecto, y el registro de decisiones tomadas.

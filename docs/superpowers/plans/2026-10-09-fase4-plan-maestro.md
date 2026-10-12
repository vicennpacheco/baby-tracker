# Fase 4 — Plan maestro: Dashboard, sincronización en tiempo real, PWA y despliegue

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que «Hoy» enseñe el día de un vistazo y que lo que registra un progenitor aparezca en el móvil del otro en menos de 2 s, sin que ningún dispositivo guarde datos propios. Después, instalar la app (PWA) y desplegarla en producción.

**Alcance de este plan:** bloques **A (Dashboard)** y **B (Realtime)** en detalle. **C (PWA)** y **D (Despliegue)** quedan esbozados: cada uno tendrá su propio plan cuando A y B estén cerrados, porque dependen de decisiones externas (iconos, cuenta de Vercel, coste del proyecto de producción).

**Spec:** [`CLAUDE.md`](../../../CLAUDE.md) §2.2, §2.4, §2.5, §2.8, §4.2, §4.4, §5 y [`README.md` → Fase 4](../../../README.md), con su criterio de salida.

---

## 1. Punto de partida (verificado en el código el 2026-10-09)

| Pieza | Estado |
|---|---|
| Resumen diario | `getDailySummary(babyId, day, now)` en `features/dashboard/queries.ts` y `summarizeDay` / `summarizeFeedings` / `summarizeSleep` puros y probados (decisión 053). |
| Queries para «Hoy» | `getActiveFeeding`, `getActiveSleepSession`, `getLastFeeding`, `getLastBreastFeeding` y `getLastBottleFeeding` existen. *(Corregido el 2026-10-09: `getLastFeeding` ya existía; le faltaba el test de aislamiento.)* |
| Pantalla «Hoy» | `(tabs)/page.tsx` es un marcador: saludo, tarjeta de invitación y «El resumen del día, muy pronto». |
| Tiempo relativo | `formatTimeAgo` existe; falta el componente cliente que lo repinte (§2.5). `ElapsedTime` ya resuelve el primer pintado con la hora del servidor. |
| Realtime en la BD | Las 6 tablas del bebé están en `supabase_realtime` (`private.add_table_to_realtime`, decisión 027), con RLS `SELECT` para `authenticated` vía `is_household_member` (decisión 029). |
| Realtime en el cliente | `createSupabaseBrowserClient()` (solo para Realtime). `RefreshOnFocus` en `(app)/layout.tsx` refresca al volver a primer plano y al recuperar la red (decisión 059). `useOnlineStatus` y los botones deshabilitados sin conexión ya existen (decisión 047). |
| Librerías | `@supabase/supabase-js` 2.117.3: renueva el token de Realtime solo en `TOKEN_REFRESHED` / `SIGNED_IN` / `INITIAL_SESSION` (comprobado en `dist/index.mjs`). `@supabase/ssr` 0.12.7. |

**Hechos de Supabase que condicionan el diseño** (MCP `search_docs` y changelog, 2026-10-09):

1. Los eventos `DELETE` de `postgres_changes` **no se pueden filtrar**, y RLS **no se aplica** a los `DELETE`. Todos los suscriptores de la tabla, de cualquier familia, reciben la clave primaria de cada fila borrada.
2. Con RLS, `postgres_changes` evalúa las políticas una vez por suscriptor y por cambio. A nuestra escala no es un problema.
3. Supabase recomienda canales **privados** de Broadcast para producción: `realtime.broadcast_changes` desde un *trigger*, con autorización mediante RLS sobre `realtime.messages`.
4. Desde el 2026-07-14 el esquema `realtime` está bloqueado ante cambios (*breaking change*), aunque las políticas RLS sobre `realtime.messages` «siguen funcionando». Hay que comprobar quién puede crearlas.

## 2. Decisiones que necesito que apruebes

**D1. Transporte de Realtime** (la decisión importante).

| | **B · Broadcast privado por familia (recomendada)** | A · `postgres_changes` (lo previsto en la decisión 015) |
|---|---|---|
| Qué es | Un *trigger* en cada tabla del bebé llama a `realtime.broadcast_changes` sobre el *topic* `household:<id>`. El cliente se suscribe a un canal **privado**, autorizado por una política sobre `realtime.messages` con `is_household_member`. | El cliente se suscribe a `postgres_changes` con `baby_id=eq.<id>`; RLS filtra `INSERT` y `UPDATE`. |
| `DELETE` | Acotado a la familia: el *trigger* conoce la fila borrada. | **Llega a todas las familias** (solo la clave primaria y la hora). Es una fuga de metadatos entre familias y un refresco inútil en cada borrado ajeno. |
| Coste | Una migración (*triggers* en 6 tablas), una ampliación de `supabase-bootstrap.sql` (función `SECURITY DEFINER` en `private` y política sobre `realtime.messages`, como `postgres`, excepción de la decisión 027), *stubs* para la BD temporal de Prisma y la de tests, y verificación vía MCP. | Ninguna migración: solo el cliente. |
| Riesgo | El bloqueo de 2026 podría impedir crear la política. Por eso va primero un **spike** (S0). | Ninguno técnico; el riesgo es de privacidad. |

Recomiendo **B**: son datos de salud de un menor (§5), el proyecto de producción aún no existe y es la evolución que la regla 2.8 ya prevé. Si el spike S0 falla, paso a A con la fuga documentada como riesgo aceptado, y te lo consulto antes.

**D2. Cronómetros en «Hoy»:** tarjetas «En curso» compactas (tipo, autor y `ElapsedTime`) que **enlazan** a Tomas o Sueño, donde está «Parar». Parar desde «Hoy» cuesta 2 toques, y la barra inferior ya está a un toque. No se duplica la lógica de las barras de los módulos.

**D3. Indicador de conexión:** una franja fina bajo la cabecera, en `(tabs)` y en `(task)`, con `role="status"` y texto («Reconectando…» / «Sin conexión. Conéctate para registrar.»). Solo se ve cuando no se está «en línea» (§2.8). El aviso actual de `StickyActionBar` se queda: dice por qué los botones están deshabilitados justo donde están.

**D4. Navegación por días en «Hoy»:** `?day=` con `DayNav` y `dayNavHrefs("/")`. En días pasados solo se muestra el resumen; «última toma» y los cronómetros solo aparecen hoy.

## 3. Bloque 0 — Cierre de la Fase 3 e integraciones (antes de A)

- [x] 0.1 QA del usuario de **Ajustes** (`/settings`: miembros, Expulsar, Anular código y tema) y de la **revisión global de accesibilidad** en el navegador. Después, marcar las 2 casillas que quedan y la **Fase 3 como terminada**.
- [ ] 0.2 Integrar la rama `claude/sweet-chatterjee-51ffcd` (`requireBaby()` falla en voz alta): revisar, renumerar su decisión al siguiente número libre y pasar `npm test`.
- [ ] 0.3 Integrar la tarea en segundo plano de fallos de red en las Server Actions, si ha terminado: revisión, decisión y `npm test`.

## 4. Bloque A — Dashboard «Hoy»

**Contenido de la pantalla (hoy):**
1. **Última toma:** tipo (pecho izq./der. o biberón con ml), «hace 1 h 20 min» (en un componente cliente que se repinta) y «por Ana». Debajo, «Siguiente: pecho derecho» (`suggestNextBreast`).
2. **En curso:** las tarjetas de D2, solo si hay algún cronómetro en marcha.
3. **Resumen del día:** cuatro tarjetas que enlazan a su módulo, con cifras grandes y `tabular-nums`, cada una con su token, icono y texto (§4.4):
   - Tomas: número, «3 biberones · 330 ml», «4 de pecho · 1 h 25 min»;
   - Pañales: mojados y sucios (`MIXED` cuenta en los dos, decisión 053);
   - Sueño: horas de sueño y número de siestas;
   - Crecimiento: el último peso con su fecha, si existe (es una lectura más, `getLatestGrowthMeasurement`).
4. La tarjeta «Invita al otro progenitor» se mantiene mientras haya hueco.

**Rendimiento:** todas las lecturas van en un solo `Promise.all` dentro de `<Suspense>` con *skeleton*. El objetivo es menos de 1,5 s en 4G (criterio de salida), medido con Lighthouse en el bloque C.

### Tareas
- [x] A1. `test(feeding): keep another baby out of the last feeding`: *`getLastFeeding` ya existía (el análisis del punto 1 lo daba por ausente); se añadió el test de aislamiento entre bebés con su prueba de mutación.*
- [x] A2. `feat(ui): add a ticking time-ago`: `TimeAgo` en `components/shared` (primer pintado con `serverNow`, como `ElapsedTime`; repinta cada 30 s, con limpieza), apoyado en una función pura con test.
- [x] A3. `feat(dashboard): add labels`: textos de las tarjetas (`describeFeedingTotals`, `describeDiapers`, `describeSleepTotal`) con tests (plurales, ceros, `MIXED`). Pasa por `design:ux-copy`.
- [x] A4. `feat(dashboard): add the summary cards`: `features/dashboard/components/*` (tarjeta enlace por módulo, última toma y cronómetros en curso), en Server Components salvo `TimeAgo` y `ElapsedTime`.
- [x] A5. `feat(dashboard): add the today screen`: `(tabs)/page.tsx` con `requireBaby`, `?day=` y `DayNav`, lecturas en paralelo, *skeleton* y estados vacíos («Aún no hay nada hoy» con accesos a cada registro).
- [x] A6. `docs`: decisión 065. *(Las casillas «Dashboard» y «Navegación entre días» del README se marcan tras la revisión del usuario.)*

## 5. Bloque B — Sincronización en tiempo real

**Arquitectura (con D1 = B):**

```
Server Action ─▶ PostgreSQL (fuente de verdad)
                    │ trigger AFTER INSERT/UPDATE/DELETE en las 6 tablas
                    ▼
     private.broadcast_household_change()  (SECURITY DEFINER, search_path='')
                    │ realtime.broadcast_changes('household:<id>', …)
                    ▼
     canal privado «household:<id>» ── RLS en realtime.messages: is_household_member(<id>)
                    ▼
   RealtimeSync (cliente) ─ debounce 300 ms ─▶ router.refresh() ─▶ Server Components releen la BD
```

- El *payload* **nunca** se aplica al estado local: es solo una señal (decisión 015). Ni siquiera hace falta leerlo.
- `RealtimeSync` va dentro de `(app)/layout.tsx` en un `<Suspense fallback={null}>` con un cargador de servidor que lee `requireMember()` y le pasa solo el `householdId`. El layout sigue siendo estático (decisión 054).
- **Ciclo de vida:**
  - `supabase.realtime.setAuth()` antes de suscribirse (canal privado); supabase-js renueva el token después.
  - Con `visibilitychange` → `visible` y con `online`: `router.refresh()` y, si el canal no está `SUBSCRIBED`, se elimina y se vuelve a crear.
  - Absorbe a `RefreshOnFocus`, que desaparece.
- **Estado de conexión:** una función pura `connectionStatus({ channelState, isOnline })` que da `online · reconnecting · offline`; la usan `RealtimeSync` y el indicador de D3.

### Tareas
- [x] **S0. Spike (desechable, en dev):** **superado el 2026-10-09** (bloques `DO` terminados en `RAISE EXCEPTION`, así que nada persiste; verificado después).
  - `postgres` **puede** crear la función en `private` y la política sobre `realtime.messages`, aunque la tabla es de `supabase_realtime_admin` y el esquema está bloqueado desde julio de 2026.
  - Un *trigger* sobre una tabla temporal escribe 3 mensajes **privados** (`INSERT`, `UPDATE` y `DELETE`, este último acotado a la familia). Con la política, el miembro ve los 3, un extraño 0, y el propio miembro 0 en el *topic* de otra familia.
  - Un `realtime.send` desde la BD llega a un cliente conectado (script en Node, canal público de prueba, unos 30 s después de suscribirse).
  - **Hallazgo 1:** `realtime.send` convierte los errores de inserción en un `WARNING` y los silencia. Sin particiones en `realtime.messages`, el mensaje se pierde sin error. Las particiones diarias las crea Realtime cuando hay un cliente conectado (dev no tenía ninguna hasta conectar el script). En B1, la verificación vía MCP comprueba que existan; en prod, al desplegar (bloque D).
  - **Hallazgo 2:** `realtime.broadcast_changes` envía la fila completa (`record` y `old_record`), es decir, datos de salud por el canal. El *trigger* usará `realtime.send` con solo `{table, op}`: es una señal, no un dato (decisión 015, §5).
  - Sin probar (no hay sesión en el panel): la unión a un canal privado con el JWT de un usuario real. Queda para la QA de B5.
- [x] B1. `feat(db): broadcast household changes`:
  - ampliar `prisma/platform/supabase-bootstrap.sql` (función y política, idempotente) y `shadow-stubs.sql`;
  - migración `prisma migrate dev --create-only --name broadcast_household_changes` con los *triggers* de las 6 tablas;
  - verificación vía MCP: `_prisma_migrations`, *triggers*, `pg_policies` sobre `realtime.messages` y *advisors* (regla 0.2);
  - test de integración: los *triggers* no rompen ninguna escritura contra el *stub*.
  - **Pide tu confirmación antes de aplicar** (cambio de esquema y de la excepción de la decisión 027).
- [x] B2. `feat(sync): add the connection status and debounced refresh`: funciones puras con test (estados, temporizadores falsos y un aviso doble en 300 ms → un solo refresco).
- [x] B3. `feat(sync): add RealtimeSync`: cliente con canal privado, reconexión, limpieza en el desmontaje y `router.refresh()`; cargador en `(app)/layout.tsx`; se elimina `RefreshOnFocus`.
- [x] B4. `feat(sync): add the connection indicator`: la franja de D3 en `(tabs)` y `(task)`, accesible y con movimiento reducido.
- [x] B5. `test(sync)`: *(superada el 2026-10-10 con dos móviles)* QA con dos sesiones (dos usuarios de la familia de dev):
  - un registro en A aparece en B en menos de 2 s (cronometrado);
  - un borrado en A desaparece en B;
  - dos inicios de siesta simultáneos dan un registro y un aviso;
  - modo avión → «Sin conexión» → vuelve sola;
  - una pestaña de **otra** familia no recibe nada (comprobado en la pestaña de red).
- [x] B6. `docs`: decisiones 066 y 067, y reglas 0.2 y 2.8 actualizadas. *(Las casillas de «Sincronización en la nube» del README, tras la QA de B5.)* Antes: decisión de Realtime (sustituye la parte de transporte de la 015 y cumple la «evolución prevista» de la 2.8) y casillas de «Sincronización en la nube».

## 6. Bloques C y D — esbozo (plan propio más adelante)

**C. PWA:** *(hecho el 2026-10-12 con un SW manual, sin Serwist; decisión 072. Queda instalarla en los móviles y Lighthouse.)*
- `app/manifest.ts`, iconos 192/512 y *maskable*;
- *service worker* solo con el *shell* estático y una pantalla «Sin conexión». Elegir Serwist o un SW manual tras comprobar la compatibilidad con Next 16.4 y Turbopack: sería una dependencia nueva y hay que justificarla (regla 0.7);
- metadatos de iOS;
- instalabilidad y Lighthouse ≥ 90 (incluido el objetivo de 1,5 s de A).

**D. Despliegue:**
- crear el proyecto de Supabase **prod** en la UE: tiene coste y es una acción externa, así que la confirmaremos antes;
- *bootstrap*, `migrate deploy` verificado vía MCP;
- Vercel en la UE con las variables de entorno y `DATABASE_CA_CERT`;
- SMTP con `{{ .Token }}` en las dos plantillas.

## 7. Estrategia de pruebas

- **Unit:** etiquetas del dashboard, `TimeAgo` (función pura), `connectionStatus` y el *debounce* con temporizadores falsos.
- **Integración** (`baby_tracker_test`): `getLastFeeding`; las escrituras siguen funcionando con los *triggers* contra el *stub*.
- **Base de datos real (dev, vía MCP):** *triggers*, política, *advisors* y el spike S0.
- **Navegador:** «Hoy» a 375 px en claro y oscuro, el indicador de conexión y la QA de dos sesiones de B5. El panel de Claude no tiene sesión, así que esa QA es tuya. Yo preparo la lista y verifico la BD y los logs vía MCP.

## 8. Riesgos

| Riesgo | Mitigación |
|---|---|
| El bloqueo de 2026 del esquema `realtime` impide la política de B. | El spike S0 va primero; si falla, paso a A con decisión documentada. |
| Los navegadores móviles cortan el WebSocket en segundo plano. | Reconexión y refresco en `visibilitychange` y `online` (B3); el servidor sigue siendo la fuente de verdad. |
| El token caduca con la app abierta. | supabase-js lo renueva (comprobado); `CHANNEL_ERROR` → resuscripción. |
| Refrescos en cascada si llegan varios cambios seguidos. | *Debounce* de 300 ms; un solo `router.refresh()`. |
| Un dashboard lento en 4G. | Lecturas en paralelo y acotadas por índice (decisión 053); medición en C. |

## 9. Skills por tarea (regla 0.1)

- `supabase` y `supabase-postgres-best-practices` en S0 y B1, con `search_docs` antes de escribir SQL.
- `engineering:system-design` para cerrar D1.
- `design:ux-copy` en A3 y B4.
- `engineering:testing-strategy` en B2 y B5.
- `superpowers:test-driven-development` en todas las funciones puras y queries.
- `design:accessibility-review`, `engineering:code-review` y `design:design-system` al cerrar A y B.
- `security-review` tras B1.

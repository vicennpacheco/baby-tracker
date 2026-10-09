# Onboarding, primer uso y gestión de la familia · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** que crear una familia sea un asistente claro, que «Hoy» acoja al primer uso, que los datos del bebé se puedan editar y que la familia se pueda abandonar o eliminar.

**Restricciones:** sin migraciones ni escrituras vía MCP (decisión 068: el único proyecto es producción), sin dependencias nuevas, commits firmados solo por el usuario. **Ejecución por rondas:** se para tras cada una para la QA del usuario.

**Spec:** [`CLAUDE.md`](../../../CLAUDE.md) §2.3, §2.6, §2.7, §4.2, §4.3. Decisiones 069, 070 y 071, aprobadas el 2026-10-10.

## Ronda 1 · Integración y onboarding

- [x] 0. `fix(auth): fail loudly when a household has no baby`: rama de `requireBaby()` integrada (decisión 070, antes 056), con prueba de mutación.
- [x] 1. `feat(household): ask the baby's sex, optional`: «Niña · Niño · Prefiero no decirlo» (`null`), `BabySexField` y tests (decisión 069).
- [x] 2. `feat(household): create the family in two steps`: asistente con `?step=baby` y `pushState`, un solo envío, `PageHeader.onBack`.
- [x] 3. `fix(household): announce the wizard step to screen readers` (revisión de accesibilidad).
- [ ] QA del usuario: asistente, botón atrás del sistema y de la cabecera, recarga en el paso 2, sexo opcional.

## Ronda 2 · Estado de primer uso en «Hoy»

- [ ] 4. `hasAnyRecord(babyId)` en `features/dashboard`, con test de integración y prueba de mutación del filtro.
- [ ] 5. Tarjeta de bienvenida («Todo listo para …» con «Primer pañal», «Primera toma», «Primera siesta»), solo hoy y sin registros; oculta el resumen a cero.

## Ronda 3 · Editar los datos del bebé

- [ ] 6. `updateBaby` (los dos miembros, Zod, `assertBabyInHousehold`), con tests de integración y prueba de mutación.
- [ ] 7. Pantalla `/settings/baby` y tarjeta «Tu bebé» en Ajustes.

## Ronda 4 · Salir y eliminar la familia

- [ ] 8. `leaveHousehold` (solo el MEMBER, bajo el bloqueo de la familia; el OWNER recibe `CONFLICT`).
- [ ] 9. `deleteHousehold` (solo el OWNER; el servidor comprueba el nombre del bebé tecleado; borrado en cascada en una transacción con bloqueo).
- [ ] 10. «Zona peligrosa» en Ajustes: «Salir de la familia» y «Eliminar familia» con `AlertDialog` y el nombre del bebé para desbloquear (excepción acotada a la regla 4.3).
- [ ] Revisión de seguridad, accesibilidad y código; decisión 071 completada; QA del usuario con una familia de prueba (el borrado es real en producción).

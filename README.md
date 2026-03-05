# Gestor de Proyectos Pro

Aplicación web local para gestión de proyectos, sin dependencias de runtime.

## Evolución a SEMSEproject

Este repositorio ya tiene una base funcional (UI + validaciones + tests + CI).  
Para evolucionarlo a **SEMSEproject (ConTech + Marketplace + FSM + Evidence + Escrow + Trust)** se documentó el blueprint en:

- [docs/architecture/SEMSEPROJECT_BLUEPRINT.md](/home/yoni/project-manager-app/docs/architecture/SEMSEPROJECT_BLUEPRINT.md)
- [docs/architecture/SEMSE_IMPLEMENTATION_BACKLOG.md](/home/yoni/project-manager-app/docs/architecture/SEMSE_IMPLEMENTATION_BACKLOG.md)
- [docs/architecture/SEMSE_API_SURFACE_V1.md](/home/yoni/project-manager-app/docs/architecture/SEMSE_API_SURFACE_V1.md)
- [docs/security/SECURITY_BASELINE.md](/home/yoni/project-manager-app/docs/security/SECURITY_BASELINE.md)
- [docs/runbooks/LOCAL_BOOTSTRAP.md](/home/yoni/project-manager-app/docs/runbooks/LOCAL_BOOTSTRAP.md)
- [infra/docker/compose.semse-mvp.yml](/home/yoni/project-manager-app/infra/docker/compose.semse-mvp.yml)

### Avance técnico Fase 0 ya agregado

- Estructura monorepo preparada:
  - `apps/web`, `apps/api`, `apps/worker`
  - `packages/ui`, `packages/shared`, `packages/schemas`, `packages/db`, `packages/auth`, `packages/agents`
- API base en NestJS (scaffold):
  - [`apps/api/src/main.ts`](/home/yoni/project-manager-app/apps/api/src/main.ts)
  - [`apps/api/src/app.module.ts`](/home/yoni/project-manager-app/apps/api/src/app.module.ts)
  - Controladores `v1`: health, auth, jobs, bids, projects, milestones, evidence, payments/escrow, disputes, ops, agents.
- Worker base ejecutable:
  - [`apps/worker/src/main.mjs`](/home/yoni/project-manager-app/apps/worker/src/main.mjs) con ciclo `claim -> heartbeat -> complete/fail`.
- Modelo de datos base Prisma:
  - [`packages/db/prisma/schema.prisma`](/home/yoni/project-manager-app/packages/db/prisma/schema.prisma)
- Contratos Zod iniciales:
  - [`packages/schemas/src/index.ts`](/home/yoni/project-manager-app/packages/schemas/src/index.ts)

### Boot de infraestructura local (SEMSE MVP)

```bash
docker compose -f infra/docker/compose.semse-mvp.yml up -d
```

### API scaffold: contexto y permisos por headers (temporal)

Mientras se integra auth real, el scaffold de `apps/api` resuelve actor/tenant desde headers:
- `x-user-id`
- `x-tenant-id`
- `x-org-id`
- `x-roles` (CSV, por ejemplo: `OPS_ADMIN`, `CLIENT,PRO` o `WORKER`)
- `x-idempotency-key` (opcional, para deduplicar `POST /v1/agents/runs`)

## Badges

Configurados para `Samuelcastella/project-manager-app`:

[![CI](https://github.com/Samuelcastella/project-manager-app/actions/workflows/ci.yml/badge.svg)](https://github.com/Samuelcastella/project-manager-app/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/Samuelcastella/project-manager-app/graph/badge.svg)](https://codecov.io/gh/Samuelcastella/project-manager-app)

## Funcionalidades

- Crear y editar proyectos.
- Campos: nombre, responsable, estado, prioridad, fecha, presupuesto, etiquetas y descripción.
- Vista lista, kanban y calendario mensual.
- Indicadores de urgencia en calendario (vencido / próximo a vencer).
- Métricas en tiempo real: total, en progreso, vencidos y % completado.
- Métricas financieras: presupuesto total y por estado.
- Ranking de presupuesto por responsable.
- Filtros avanzados (texto, estado, prioridad, responsable) y ordenamiento.
- Recordar filtros automáticamente por vista.
- Presets de filtros guardados en `localStorage` (asociados por vista).
- Export/import de backup completo (`proyectos + presets + filtros por vista`).
- Deshacer última acción (botón + Ctrl/Cmd+Z).
- Confirmación antes de sobrescribir configuración al importar backup completo.
- Atajos de teclado (`/`, `n`, `Esc`, `l`, `k`, `c`).
- Cambio rápido de estado.
- Eliminación individual y limpieza masiva de completados.
- Exportar e importar proyectos en JSON.
- Persistencia con `localStorage`.

## Mejores prácticas aplicadas

- Validación de datos antes de crear/editar.
- Normalización de datos importados y lectura de versiones antiguas de storage.
- Confirmación explícita para acciones destructivas.
- Mensajes accesibles en vivo (`aria-live`) para feedback de estado.
- Manejo seguro de errores de JSON y almacenamiento.
- `debounce` en filtros de texto para mejor rendimiento.
- Lógica estructurada por funciones pequeñas y reutilizables.

## Tests automatizados

### Unitarios (Node test runner)

```bash
npm run test:unit
```

### Cobertura con c8 (con umbrales)

```bash
npm run coverage
# o:
npm run test:coverage
```

### Pipeline local equivalente a CI

```bash
npm run test:ci
```

Umbrales mínimos configurados:
- `lines >= 90%`
- `functions >= 90%`
- `statements >= 90%`
- `branches >= 85%`

Cobertura actual:
- Parseo y normalización de etiquetas.
- Validaciones de formulario.
- Filtros y ordenamiento de proyectos.
- Normalización de proyectos e identificación de vencidos.

### E2E (Playwright)

```bash
npm run test:e2e
```

Escenarios actuales:
- Crear proyecto y verificar render en lista.
- Cambiar a vista kanban y mover estado con acción rápida.
- Validar atajos de teclado (`/` y `n`).
- Guardar y aplicar preset de filtros.
- Calcular métricas financieras y ranking por responsable.
- Mostrar proyectos en vista calendario por fecha límite.
- Resaltar celdas de calendario próximas a vencer.
- Recordar filtros distintos entre lista y kanban.
- Importar backup completo con configuración de usuario.
- Deshacer eliminación de proyecto.
- Cobertura unitaria de normalización de backup/presets/filtros.

Si es la primera vez:

```bash
npm install
npx playwright install chromium
```

## CI

Se agregó pipeline en [`.github/workflows/ci.yml`](/home/yoni/project-manager-app/.github/workflows/ci.yml) con dos jobs:
- `unit-coverage`: ejecuta `npm run test:coverage`, valida umbrales y publica resumen de cobertura en el run.
- `e2e`: ejecuta Playwright (`chromium`) con `npm run test:e2e` y sube artefactos para debugging.

### Reporte externo de cobertura (Codecov)

- Se agregó configuración en [codecov.yml](/home/yoni/project-manager-app/codecov.yml).
- El workflow sube `coverage/lcov.info` a Codecov en cada ejecución.
- Si tu repositorio es privado, define el secret `CODECOV_TOKEN` en GitHub:
  `Settings -> Secrets and variables -> Actions -> New repository secret`.
- Si es público, el token suele no ser necesario (puedes dejarlo vacío).

### Mantenimiento automático de dependencias

- Se agregó [`.github/dependabot.yml`](/home/yoni/project-manager-app/.github/dependabot.yml).
- Dependabot revisa semanalmente:
  - Dependencias `npm`.
  - Versiones de `GitHub Actions`.

## Releases

- Se agregó workflow de release en [`.github/workflows/release.yml`](/home/yoni/project-manager-app/.github/workflows/release.yml).
- Al hacer push de un tag `v*.*.*`, el pipeline:
  - Ejecuta la suite completa (`npm run test:ci`).
  - Crea un GitHub Release automático con notas generadas.

Comandos para versionar:

```bash
npm run release:patch   # v1.0.0 -> v1.0.1
npm run release:minor   # v1.0.0 -> v1.1.0
npm run release:major   # v1.0.0 -> v2.0.0
git push --follow-tags
```

## Publicar en GitHub

Si aún no publicaste el repo remoto:

```bash
cd /home/yoni/project-manager-app
git init
git add .
git commit -m "feat: project manager app with tests and CI"
git branch -M main
git remote add origin git@github.com:Samuelcastella/project-manager-app.git
git push -u origin main
```

## Ejecutar app

Abre `index.html` en tu navegador.

## Gestión del proyecto

- Changelog: [CHANGELOG.md](/home/yoni/project-manager-app/CHANGELOG.md)
- Roadmap: [ROADMAP.md](/home/yoni/project-manager-app/ROADMAP.md)
- Plantilla de PR: [pull_request_template.md](/home/yoni/project-manager-app/.github/pull_request_template.md)

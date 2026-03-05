# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows Semantic Versioning.

## [Unreleased]

### Added
- Presets de filtros guardados en `localStorage`.
- Atajos de teclado:
  - `/` foco en búsqueda.
  - `n` nuevo proyecto.
  - `Esc` cancela edición/desenfoca.

### Planned
- Dashboard financiero por responsable y por etiqueta.
- Vista de calendario mensual para fechas límite.
- Mejoras de accesibilidad (navegación completa por teclado y focus management).

## [1.0.2] - 2026-03-05

### Fixed
- Ajuste de comando unit test para CI (`tests/unit/*.test.mjs`) y estabilidad de workflow Release.

### CI
- Workflow `Release` validado de punta a punta en GitHub Actions.

## [1.0.1] - 2026-03-05

### Added
- Primera versión releaseada con tag automático y GitHub Release generado en CI.

## [1.0.0] - 2026-03-04

### Added
- App web para gestión de proyectos con lista + kanban.
- CRUD local de proyectos con `localStorage`.
- Filtros, ordenamiento, métricas, import/export JSON.
- Test unitarios + E2E Playwright.
- Cobertura con `c8` y umbrales mínimos.
- Pipeline CI, Codecov y Dependabot.

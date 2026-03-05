# apps/worker

Procesadores de cola (BullMQ) y tareas asíncronas.

Responsabilidades:
- Runs de agentes IA.
- Procesamiento de evidencia (thumbnails, validaciones, scanning).
- Webhooks de pagos y reconciliación.
- Notificaciones por email/eventos.

Flujo API esperado para workers:
1. `POST /v1/agents/runs/claim`
2. `POST /v1/agents/runs/:runId/heartbeat`
3. `POST /v1/agents/runs/:runId/complete` o `.../fail`

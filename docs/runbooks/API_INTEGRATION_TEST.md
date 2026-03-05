# API Integration Test (Local)

Script end-to-end que valida reglas clave del dominio API:

- Marketplace: job -> bid -> accept
- Project auto-creado
- Milestones: create -> submit -> approve -> paid
- Escrow: deposit + release
- Disputes: evita duplicado abierto por proyecto
- Agents: run lifecycle + reclaim stale
- Ops: dashboard agregado

## Ejecución

```bash
cd /home/yoni/project-manager-app
node ./scripts/api-integration.mjs
```

## Prerrequisitos

- API corriendo en `http://localhost:4000` (o `SEMSE_API_URL`).
- Headers simulados por variables de entorno (roles `OPS_ADMIN,WORKER` por default).

## Variables opcionales

- `SEMSE_API_URL`
- `SEMSE_TENANT_ID`
- `SEMSE_USER_ID`
- `SEMSE_ORG_ID`
- `SEMSE_ROLES`
- `SEMSE_WORKER_ID`

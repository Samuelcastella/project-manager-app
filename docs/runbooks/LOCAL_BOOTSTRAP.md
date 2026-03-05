# Local Bootstrap (MVP stack)

## Prerrequisitos
- Node.js >= 20
- pnpm >= 9
- Docker + Docker Compose

## Boot rápido
```bash
cd /home/yoni/project-manager-app
docker compose -f infra/docker/compose.semse-mvp.yml up -d
```

Servicios esperados:
- Postgres: `localhost:5432`
- Redis: `localhost:6379`
- MinIO API: `localhost:9000`
- MinIO Console: `localhost:9001`
- MailHog UI: `localhost:8025`

## Próximo paso (cuando se inicialicen apps)
```bash
pnpm install
pnpm turbo run dev
```

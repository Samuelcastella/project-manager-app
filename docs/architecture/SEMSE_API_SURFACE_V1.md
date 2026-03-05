# SEMSE API Surface v1 (REST)

## Auth
- `POST /v1/auth/login`
- `POST /v1/auth/logout`
- `POST /v1/auth/refresh`
- `GET /v1/auth/me`

## Jobs / Bids
- `POST /v1/jobs`
- `GET /v1/jobs`
- `GET /v1/jobs/:jobId`
- `PATCH /v1/jobs/:jobId`
- `POST /v1/jobs/:jobId/bids`
- `GET /v1/jobs/:jobId/bids`
- `POST /v1/bids/:bidId/accept`

## Work Orders / Milestones
- `GET /v1/projects`
- `GET /v1/projects/:projectId`
- `PATCH /v1/projects/:projectId/status`
- `GET /v1/projects/:projectId/escrow`
- `GET /v1/projects/:projectId/payments`
- `POST /v1/projects/:projectId/milestones`
- `POST /v1/milestones/:milestoneId/submit`
- `POST /v1/milestones/:milestoneId/approve`
- `POST /v1/milestones/:milestoneId/reject`

## Payments / Escrow
- `POST /v1/projects/:projectId/escrow/deposit`
- `POST /v1/milestones/:milestoneId/escrow/release`
- `POST /v1/payments/webhook`

## Evidence
- `POST /v1/evidence/presign`
- `POST /v1/evidence`
- `GET /v1/projects/:projectId/evidence`
- `GET /v1/evidence/:evidenceId`

## Disputes
- `POST /v1/disputes`
- `GET /v1/disputes`
- `POST /v1/disputes/:disputeId/assign`
- `POST /v1/disputes/:disputeId/resolve`

## Ops
- `GET /v1/ops/audit`
- `GET /v1/ops/risk-scores`
- `POST /v1/ops/approvals/:approvalId/decision`

## Agents
- `GET /v1/agents/catalog`
- `POST /v1/agents/runs`
- `GET /v1/agents/runs`
- `GET /v1/agents/runs/:runId`
- `POST /v1/agents/runs/:runId/retry`

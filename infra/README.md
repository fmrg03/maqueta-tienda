# Infraestructura

## Desarrollo local

Levanta PostgreSQL y Redis con Docker Compose:

```bash
cd infra
docker compose -f docker-compose.dev.yml up -d
```

Luego copia `backend/.env.example` a `backend/.env` y ajusta `DATABASE_URL`
si cambiaste usuario/password/puerto.

## Producción

Pendiente de definir — ver `docs/ARCHITECTURE.md` sección 4 (Estrategia de
Infraestructura) para el diseño conceptual (contenedores por servicio, colas
BullMQ, almacenamiento S3-compatible).

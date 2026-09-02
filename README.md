# Maqueta Tienda — App Web de Construcción

Monorepo del proyecto: inventario, catálogo, carrito de consulta y agenda de
asesorías para empresa de construcción. Ver el plano técnico completo en
[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Estructura

```
.
├── backend/    # API REST — NestJS + TypeScript + TypeORM + PostgreSQL
├── frontend/   # Next.js + TypeScript + React
├── infra/      # Docker Compose, configuración de despliegue
└── docs/       # Documentación técnica (arquitectura, decisiones)
```

## Backend

Ver [`backend/README.md`](./backend/README.md) para instrucciones de
instalación, variables de entorno y cómo correr los tests.

## Arranque local (verificado de punta a punta)

Este flujo fue probado completo, desde una base de datos vacía, antes de
subirse al repo — no debería haber sorpresas siguiéndolo tal cual.

```bash
# 1. Levantar Postgres + Redis
cd infra
docker compose -f docker-compose.dev.yml up -d

# 2. Backend: instalar, migrar, cargar datos de ejemplo
cd ../backend
npm install
cp .env.example .env
npm run migration:run

SEED_ADMIN_EMAIL=admin@empresa.com SEED_ADMIN_NOMBRE="Tu Nombre" npm run seed:admin
npm run seed:data

# 3. Arrancar la API
npm run start:dev
```

Verificá que quedó arriba:
- `GET http://localhost:3000/health` → `{"status":"ok", ...}`
- `GET http://localhost:3000/api/v1/catalogo/materiales` → el material de ejemplo del seed
- `GET http://localhost:3000/api/docs` → Swagger, para probar el resto de los endpoints (login con la cuenta que creó `seed:admin`, usar el botón "Authorize" con el `accessToken`)

**Importante:** `seed:admin` y `seed:data` necesitan correr con las mismas
credenciales privilegiadas que las migraciones (el `usuario` del
`docker-compose`, no `app_backend`) — ver `docs/ARCHITECTURE.md` sección 6
para el porqué (tiene que ver con RLS).

## Frontend

Próximamente.

## Infraestructura

Ver [`infra/README.md`](./infra/README.md).

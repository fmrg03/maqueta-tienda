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

## Frontend

Próximamente.

## Infraestructura

Próximamente — Docker Compose para entorno local (Postgres + Redis + backend
+ frontend).

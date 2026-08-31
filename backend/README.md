# Backend — API REST

NestJS + TypeScript + TypeORM + PostgreSQL. Ver el plano completo en
[`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

## Setup

```bash
cd backend
npm install
cp .env.example .env   # completar con tus credenciales locales
npm run start:dev
```

## Tests

```bash
npm test
```

## Módulos implementados

- `usuarios/` — CRUD de usuarios, roles (`admin` | `ventas` | `asesor` | `cliente`)
- `auth/` — login, register, refresh de tokens JWT (access 15m / refresh 7d)

## Módulos pendientes

- `inventario/` — materiales, variantes, movimientos, reportes
- `proveedores/`
- `catalogo/`
- `carrito/` — `SolicitudCarrito`
- `asesorias/` — `Asesor`, `DisponibilidadAsesor`, `SolicitudAsesoria`

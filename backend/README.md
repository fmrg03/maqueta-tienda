# Backend — API REST

NestJS + TypeScript + TypeORM + PostgreSQL. Ver el plano completo en
[`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

## Setup

```bash
cd backend
npm install
cp .env.example .env   # completar con tus credenciales locales
npm run migration:run  # aplica el esquema a la base de datos
npm run start:dev
```

## Migraciones

TypeORM con migraciones explícitas — `synchronize` solo está activo en
desarrollo (`app.module.ts`), **nunca en producción**.

```bash
npm run migration:generate -- src/migrations/NombreDescriptivo   # tras cambiar una entidad
npm run migration:run                                             # aplicar pendientes
npm run migration:revert                                          # revertir la última
```

La migración inicial (`InitSchema`) fue generada y probada (`up` y `down`)
contra un PostgreSQL real antes de subirse al repo.

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

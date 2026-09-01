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

## Row Level Security (RLS)

La migración `AddRowLevelSecurity` crea un rol de aplicación (`app_backend`,
sin privilegios de superusuario) y políticas de RLS sobre `usuarios`,
`solicitudes_carrito` y `solicitudes_asesoria`. **`DATABASE_URL` en
producción debe conectar como `app_backend`, no como superusuario** — un
superusuario de Postgres siempre bypassea RLS, sin excepción.

El contexto de sesión (`app.rol`, `app.usuario_id`) lo setea
`RlsInterceptor` (`src/common/rls/`) en cada request autenticado, dentro
de una transacción por request. Probado de punta a punta (registro, login,
y un endpoint admin protegido) contra un Postgres real — ver
`docs/ARCHITECTURE.md` sección 6 para el detalle de diseño y los casos
límite encontrados (el lookup de login y el `RETURNING` del auto-registro
necesitan una excepción acotada, documentada ahí).

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

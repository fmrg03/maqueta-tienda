# ARCHITECTURE.md
## App Web — Empresa de Construcción (Inventario + Catálogo + Asesorías)
### v2 — MVP sin pasarela de pago

---

## 1. Stack Tecnológico

### Frontend — Next.js (React + TypeScript)
- **Justificación:** el catálogo público necesita SEO real (clientes buscando materiales), y Next.js da SSR/ISR para esas páginas, App Router para separar limpiamente admin/catálogo/carrito/asesorías, y Server Actions/Route Handlers para llamadas simples.
- El usuario ya tiene base en React, así que la curva de aprendizaje es baja.

### Backend — NestJS (Node.js + TypeScript)
- **Justificación:** decisión ya tomada por el usuario, coherente con TypeScript end-to-end. Arquitectura modular (módulos Nest = subdominios: `inventario`, `catalogo`, `carrito`, `asesorias`, `auth`).
- **ORM: TypeORM** (decisión ya tomada) sobre PostgreSQL.

### Base de Datos — PostgreSQL
- **Justificación:** el catálogo complejo (variantes + combos + múltiples proveedores) necesita relaciones robustas y transacciones ACID confiables para inventario. JSONB para atributos dinámicos de variantes.

### Infraestructura complementaria
- **Redis:** cache de catálogo (lecturas públicas de alto tráfico) y cola de trabajos (BullMQ) para tareas asíncronas (envío de emails/WhatsApp de solicitudes, recordatorios de asesoría).
- **Almacenamiento de archivos:** S3-compatible para imágenes de productos y PDFs de solicitudes.
- **Notificación por WhatsApp:** integración vía API externa (ej. WhatsApp Business API / Twilio / proveedor similar) para enviar el "carrito" armado al área de ventas — no requiere infraestructura de mensajería propia.
- **Contenedores:** Docker para desarrollo y producción; Docker Compose en local (Postgres + Redis + backend + frontend). Kubernetes queda para cuando el tráfico lo justifique — no es necesario en el MVP.
- **Sin pasarela de pago:** queda explícitamente fuera de este MVP; se incorpora en la fase de ecommerce.

---

## 2. Modelo de Datos

### Entidades principales

**Usuario**
- id, nombre, email, password_hash, rol (`admin` | `ventas` | `cliente`), telefono, created_at

**Material** (producto base)
- id, sku, nombre, descripcion, categoria_id, precio_costo, precio_venta, imagen_url, activo

**VarianteMaterial**
- id, material_id (FK), atributos (JSONB: color, tamaño, etc.), sku_variante, stock, precio_venta_override

**Combo**
- id, nombre, descripcion, precio_combo
- **ComboItem** (tabla puente): combo_id, material_id o variante_id, cantidad

**Proveedor**
- id, nombre, contacto, condiciones_pago

**MaterialProveedor** (tabla puente, N:N)
- material_id, proveedor_id, precio_costo_proveedor, tiempo_entrega_dias

**MovimientoInventario**
- id, variante_id (FK), tipo (`entrada` | `salida`), cantidad, motivo, usuario_id, created_at
- Base para los reportes de ingreso/salida y ganancias por período.

**SolicitudCarrito** (consulta a ventas, sin pago)
- id, cliente_nombre, cliente_telefono, cliente_email (opcional), items (relación con Material/Variante/Combo + cantidades), estado (`nueva` | `contactado` | `cerrada`), canal_envio (`whatsapp` | `email` | `formulario`), notas, created_at

**Asesor**
- id, usuario_id (FK), especialidad, activo

**DisponibilidadAsesor**
- id, asesor_id (FK), dia_semana o fecha_especifica, hora_inicio, hora_fin
- Todas las fechas/horas se almacenan en UTC y se normalizan a `America/Caracas` (timezone del negocio) tanto al mostrarlas al cliente como al asesor — evita bugs de horario por diferencia de zona entre server y usuarios.
- **Implementación:** columnas de tipo `timestamptz` en PostgreSQL (nunca `timestamp` sin zona). El backend (NestJS) siempre recibe/devuelve fechas en formato ISO 8601 con sufijo `Z` (ej. `2026-08-31T14:00:00Z`). La conversión a `America/Caracas` ocurre **únicamente en la capa de presentación** (frontend, con `Intl.DateTimeFormat` o `date-fns-tz`) — nunca se guarda ni se calcula lógica de negocio en hora local, solo en UTC.
- Al confirmarse una `SolicitudAsesoria` sobre una franja, esa franja pasa a no disponible (bloqueada) para nuevas reservas — evita doble booking sobre el mismo asesor/horario. **Se implementa con un constraint único (`asesor_id` + `fecha_hora`) a nivel de base de datos, dentro de una transacción con lock (`SELECT ... FOR UPDATE`) al momento de reservar**, no solo validación en la capa de aplicación — así se evita la condición de carrera si dos clientes reservan el mismo bloque casi simultáneamente.

**SolicitudAsesoria**
- id, cliente_nombre, cliente_telefono, cliente_email, asesor_id (FK, opcional si se asigna luego), fecha_hora_llamada (franja agendada para la llamada/videollamada por WhatsApp), estado (`pendiente` | `llamada_realizada` | `visita_pactada` | `no_procede` | `cancelada`), notas_llamada
- El sistema solo agenda la **llamada de primer contacto** (vía WhatsApp, informal). Si de esa llamada surge que la empresa puede dar el servicio, la fecha/hora de la **visita en sitio** se coordina manualmente entre asesor y cliente, fuera del sistema — no hay campos de fecha/dirección de visita en el modelo, solo el estado `visita_pactada` como registro de que ocurrió.
- **Transiciones de estado validadas en el servicio** (no cualquier estado puede pasar a cualquier otro): `pendiente → llamada_realizada → visita_pactada` o `no_procede`. `cancelada` es alcanzable desde cualquier estado. Un intento de transición inválida (ej. `pendiente → visita_pactada` sin pasar por la llamada) se rechaza — ver sección 6.

### Relaciones clave
- `Material` 1—N `VarianteMaterial`
- `Material` N—N `Proveedor` (vía `MaterialProveedor`)
- `Combo` N—N `Material`/`VarianteMaterial` (vía `ComboItem`)
- `VarianteMaterial` 1—N `MovimientoInventario`
- `SolicitudCarrito` 1—N items (Material/Variante/Combo + cantidad, tabla de detalle)
- `Asesor` 1—N `DisponibilidadAsesor`
- `Asesor` 1—N `SolicitudAsesoria`

---

## 3. Contratos de la API (REST)

Base: `/api/v1`

### Auth
- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/refresh`

### Inventario (admin)
- `GET /materiales` — filtros: categoria, proveedor, stock_bajo
- `POST /materiales`
- `PATCH /materiales/:id`
- `POST /materiales/:id/variantes`
- `POST /materiales/:id/movimientos` — registra entrada/salida
- `GET /reportes/inventario?desde=&hasta=&agrupacion=semana|mes|anio`
- `GET /reportes/ganancias?desde=&hasta=`

### Catálogo (público)
- `GET /catalogo/materiales` — paginado, con variantes y precio_venta
- `GET /catalogo/materiales/:id`
- `GET /catalogo/combos`
- `GET /catalogo/categorias`

### Proveedores (admin)
- `GET /proveedores`
- `POST /proveedores`
- `POST /materiales/:id/proveedores` — asociar proveedor + precio_costo

### Carrito / Solicitud a Ventas
- `POST /carrito/solicitud` — recibe items armados en el catálogo + datos de contacto; genera `SolicitudCarrito` y dispara notificación (WhatsApp/email) a ventas
- `GET /carrito/solicitudes` (admin/ventas) — listado con filtros por estado
- `PATCH /carrito/solicitudes/:id` — actualizar estado (`contactado`, `cerrada`)

### Asesorías (agenda de llamada de primer contacto)
- `GET /asesores/disponibilidad?fecha=` — franjas horarias libres según `DisponibilidadAsesor`, para la llamada por WhatsApp
- `POST /asesorias/solicitud` — cliente elige franja + datos de contacto → crea `SolicitudAsesoria` en estado `pendiente`, marca esa franja como no disponible en `DisponibilidadAsesor`, y dispara notificación al asesor con el horario pactado
- `GET /asesorias/solicitudes` (admin) — listado con filtros por estado
- `PATCH /asesorias/solicitudes/:id/registrar-llamada` — marca que la llamada por WhatsApp ocurrió, agrega notas de lo conversado
- `PATCH /asesorias/solicitudes/:id/marcar-visita-pactada` — registra que, tras la llamada, se acordó una visita en sitio (coordinada manualmente, fuera del sistema)
- `PATCH /asesorias/solicitudes/:id/marcar-no-procede` — la empresa no puede brindar el servicio solicitado
- `PATCH /asesorias/solicitudes/:id/cancelar`

---

## 4. Estrategia de Infraestructura

### Arquitectura de red conceptual (MVP)

```
[Cliente Web] ──HTTPS──> [Next.js Frontend] ──HTTPS──> [NestJS API Gateway]
                                                              │
                    ┌──────────────────┬──────────────────────┼──────────────────────┐
                    │                  │                        │                      │
             [Módulo Inventario] [Módulo Catálogo]      [Módulo Carrito]      [Módulo Asesorías]
                    │                  │                        │                      │
                    └──────────────────┴────────────┬───────────┴──────────────────────┘
                                                      │
                                              [PostgreSQL]
                                                      │
                                          [Redis (cache/colas)]
                                                      │
                                          [S3 - imágenes/PDFs]
                                                      │
                                    [Worker BullMQ] ──> [API WhatsApp / Email]
```

### Notas de despliegue
- **Contenedores:** cada servicio (frontend, backend, worker de colas) en su propio contenedor Docker. `docker-compose.yml` para desarrollo local.
- **Colas de mensajería:** BullMQ sobre Redis para: envío de notificación WhatsApp/email cuando llega una `SolicitudCarrito` o `SolicitudAsesoria`, y recordatorios de visitas pactadas.
- **Almacenamiento de archivos:** bucket S3 separado por tipo (`/imagenes-productos`, `/solicitudes-pdf`), con URLs firmadas para acceso privado cuando aplique.
- **Ambientes:** dev / staging / prod, con variables de entorno separadas (credenciales de API de WhatsApp).
- **Escalado futuro:** al incorporar pasarela de pago y ecommerce completo, se agrega el módulo `pagos` sin romper lo existente (la `SolicitudCarrito` puede evolucionar a `Cotizacion`/`Orden` real). K8s entra en juego cuando el tráfico lo justifique.

---

## 5. Seguridad

### Rate limiting
- Endpoints públicos sin autenticación (`POST /carrito/solicitud`, `POST /asesorias/solicitud`) llevan rate limiting por IP y por número de teléfono (ej. `@nestjs/throttler` + Redis como store), para evitar spam/abuso que además generaría costos innecesarios de notificación por WhatsApp.
- Recomendado sumar un captcha simple (ej. Cloudflare Turnstile) en ambos formularios antes de ir a producción.

### Sanitización de inputs y validación
- Toda entrada de la API se valida con DTOs + `class-validator`/`class-transformer` en NestJS (whitelist estricta de campos, rechazo de propiedades no declaradas).
- Sanitización adicional de campos de texto libre (notas, descripciones) antes de persistir, para prevenir inyección de HTML/scripts si esos campos se renderizan en el panel admin.

### Prepared statements / prevención de inyección SQL
- TypeORM usa parámetros preparados por defecto en sus métodos (`find`, `QueryBuilder` con parámetros nombrados); **prohibido concatenar strings para construir queries crudas** — cualquier query nativa que se necesite debe ir siempre parametrizada.

### Row Level Security (RLS)
- Se habilita RLS en PostgreSQL sobre las tablas sensibles (`SolicitudCarrito`, `SolicitudAsesoria`, `Usuario`), con políticas que restringen el acceso según el rol de la conexión (ej. un asesor solo ve sus propias `SolicitudAsesoria` asignadas; ventas ve todas las `SolicitudCarrito`).
- Esto añade una capa de defensa a nivel de base de datos, independiente de los guards de NestJS — si hay un bug en la lógica de autorización de la app, RLS sigue bloqueando el acceso indebido.

### Autenticación y autorización
- JWT con refresh tokens para sesiones de `admin`/`ventas`/`asesor`. Guards de NestJS + roles decorators para autorización por endpoint, reforzados por RLS como mencionado arriba.
- Passwords con hash `bcrypt`/`argon2`, nunca en texto plano ni siquiera en logs.

---

## 6. Decisiones de Implementación (Backend)

Registradas al implementar el backend en NestJS, sobre el diseño de las secciones 1-5. Aprobadas por el usuario.

### Concurrencia: lock pesimista transaccional
Todo recurso finito y reservable (stock de `VarianteMaterial`, franjas de `DisponibilidadAsesor`) se actualiza dentro de una transacción de base de datos que toma un **lock pesimista** (`SELECT ... FOR UPDATE`, vía `setLock('pessimistic_write')` de TypeORM) sobre la fila antes de leer/modificar su estado. Esto es más fuerte que solo el constraint único a nivel de DB (sección 2): el constraint evita que quede un dato inconsistente persistido, pero el lock evita que dos requests concurrentes lean el mismo estado "disponible" antes de que el primero lo cambie, lo cual daría un error de constraint confuso en vez de una respuesta clara (`409 Conflict`) al segundo cliente. Aplicado en:
- `InventarioService.registrarMovimiento` — evita vender/descontar de un stock que ya se agotó por otra operación concurrente.
- `AsesoriasService.crearSolicitud` — evita doble booking de la misma franja de asesor.

### Notificaciones (WhatsApp/email): interfaz desacoplada desde el día uno
Se implementó `NotificacionesService` (en `backend/src/common/notificaciones/`) como la única puerta de entrada para disparar notificaciones de nuevas solicitudes (`SolicitudCarrito`, `SolicitudAsesoria`). En el MVP actual es un stub que solo loguea — la integración real con BullMQ (cola) y la API de WhatsApp (sección 4) se conecta detrás de esta misma interfaz sin tocar `CarritoService` ni `AsesoriasService`.

### Máquina de estados en `SolicitudAsesoria`
No cualquier transición de estado es válida — se implementó una validación explícita (`AsesoriasService.transicionar`) que solo permite avanzar por el flujo definido en la sección 2 (`pendiente → llamada_realizada → visita_pactada` o `no_procede`; `cancelada` desde cualquier estado). Un intento de saltarse un paso (ej. marcar visita pactada sin haber registrado la llamada) responde `400 Bad Request` en vez de dejar datos inconsistentes.

### Row Level Security (RLS), implementado y probado contra Postgres real
La migración `AddRowLevelSecurity` crea:
- Un rol de aplicación **`app_backend`**, sin privilegio de superusuario. Esto es un requisito duro: un superusuario de Postgres siempre bypassea RLS sin excepción, así que `DATABASE_URL` en producción debe conectar como `app_backend` — nunca como el usuario que corre las migraciones.
- Políticas sobre `usuarios` (cada quien ve su propia fila, admin ve todas), `solicitudes_carrito` (solo `ventas`/`admin` leen, la creación es pública) y `solicitudes_asesoria` (admin ve todas, cada asesor solo las suyas — vía join con su `Asesor.usuarioId`).

El contexto de sesión (`app.rol`, `app.usuario_id`) se setea vía `set_config(..., true)` — parametrizado, nunca interpolado en el SQL — desde `RlsInterceptor` (`backend/src/common/rls/`), que envuelve cada request HTTP en una transacción propia y expone el `EntityManager` transaccional vía `AsyncLocalStorage` a los tres servicios protegidos (`UsuariosService`, `CarritoService`, `AsesoriasService`), con fallback al repositorio inyectado normalmente cuando no hay contexto activo (tests unitarios).

**Dos casos límite reales, encontrados solo al probar contra una app corriendo de verdad (no solo con SQL manual), documentados aquí porque no eran obvios de antemano:**
1. **El lookup de login necesita leer `usuarios` sin sesión previa** (es exactamente el momento en que la sesión todavía no existe). Se agregó una política de `SELECT` acotada al valor especial `app.rol = 'service_auth'`, que solo `UsuariosService.findByEmailConPassword` setea, y solo para esa consulta puntual.
2. **El `INSERT ... RETURNING` que TypeORM genera para leer columnas autogeneradas también exige que la fila pase una política de `SELECT`**, no solo la de `INSERT` — no es suficiente con permitir el insert. El auto-registro público (`POST /auth/register`) reusa el mismo contexto `service_auth` justo antes de guardar, por la misma razón que el login.

Como control adicional descubierto en el camino: el DTO de registro público aceptaba un campo `rol` arbitrario — cualquiera podía auto-asignarse `admin` vía `POST /auth/register`. Se corrigió forzando `rol: cliente` en `AuthService.register` sin importar lo que venga en el body; crear usuarios con otros roles quedó exclusivo de `POST /usuarios` (admin-only).

### Manejo global de errores
`AllExceptionsFilter` (`backend/src/common/filters/`) estandariza toda respuesta de error de la API a una única forma (`statusCode`, `error`, `message`, `path`, `timestamp`), sin importar si el error viene de una excepción de negocio (`NotFoundException`, etc.), del `ValidationPipe` (preserva el array de mensajes por campo), o de un error no controlado de TypeORM/Postgres — estos últimos nunca exponen el mensaje crudo de la base de datos al cliente (se loguean server-side, el cliente recibe un 500 genérico). Probado tanto con tests unitarios como en vivo contra la app real.

### Documentación interactiva (Swagger/OpenAPI)
Expuesta en `/api/docs` vía `@nestjs/swagger`, deshabilitada automáticamente cuando `NODE_ENV=production` (es documentación de desarrollo, no un endpoint pensado para estar público). Los controladores llevan `@ApiTags` por módulo y `@ApiBearerAuth` en los endpoints protegidos por JWT — incluyendo, a nivel de método (no de clase), los controladores mixtos que combinan endpoints públicos y protegidos (`carrito`, `asesorias`, `asesores`).

### Cuenta admin fundacional (`protegido`), en vez de un rol jerárquico nuevo
Se evaluó agregar un rol `master`/`root` por encima de `admin` (que pudiera eliminar admins, mientras que un admin no puede eliminar a otro admin ni al master). Se descartó por ahora: la empresa va a operar con un solo admin al inicio (aunque puede haber varios admins a futuro, todos con el mismo nivel de poder entre sí) — un rol jerárquico nuevo hubiera significado tocar el enum `RolUsuario`, los guards, y las políticas de RLS en varios lugares sin que hubiera, todavía, alguien de quien proteger esa cuenta.

En su lugar, se agregó un campo `protegido: boolean` (default `false`) a `Usuario`. Logra el mismo objetivo práctico sin la complejidad de un rol nuevo:
- Solo la cuenta creada por el script `npm run seed:admin` (`backend/src/scripts/seed-admin.ts`) tiene `protegido = true` — no es alcanzable desde ningún endpoint de la API.
- `UsuariosService.desactivar` y `UsuariosService.update` (al intentar cambiarle el rol) rechazan la operación con `403 Forbidden` sobre una cuenta protegida, **sin importar qué rol tenga quien lo pide** — ni siquiera otro admin puede tocarla.
- El script de seed debe correr con las credenciales privilegiadas de las migraciones (no con `app_backend`): insertar un usuario con `rol='admin'` choca con las mismas políticas de RLS ya descritas — no existe todavía una sesión admin activa que lo autorice, y a propósito no se agregó una excepción tipo `service_auth` para este caso, porque crear el admin fundacional es una operación administrativa deliberadamente fuera de la app en ejecución.
- Probado de punta a punta: seed exitoso, segundo intento de seed rechazado (ya existe una cuenta protegida), login, y un `DELETE` sobre la propia cuenta protegida devolviendo `403` con el formato de error estándar.

Si en el futuro la empresa necesita jerarquía real entre varios admins (algunos pudiendo eliminar a otros admins), ahí sí se justifica un rol `master` — hoy no hay nadie a quien restringir.

### Health check, CI, y seeds de desarrollo
- `GET /health` (sin auth, para balanceadores/orquestadores) chequea la conexión real a la base de datos vía `@nestjs/terminus`.
- CI en GitHub Actions (`.github/workflows/backend-ci.yml`): `tsc --noEmit` + `npm test` en cada push/PR contra `main`.
- `npm run seed:data`: categorías, un proveedor, un material con variante, un asesor con una franja de disponibilidad — idempotente (no duplica si ya existe), pensado solo para desarrollo local. Igual que `seed:admin`, necesita credenciales privilegiadas (no `app_backend`) por la misma razón de RLS.

### Dos bugs más, encontrados en una corrida de arranque limpio de punta a punta (DB vacía → migraciones → seeds → app corriendo → requests reales)
Aparecieron recién al simular el flujo completo que alguien seguiría clonando el repo por primera vez — ninguno se detectó con tests unitarios ni con SQL manual, porque ambos dependen de la app real ejecutando el camino completo:

1. **`ParseIntPipe`/`ParseBoolPipe` con `{ optional: true }`** no se comportaban como documentado en la versión de Nest instalada: `GET /api/v1/catalogo/materiales` sin query params devolvía `400` en vez de usar valores por defecto. Se reemplazó por parseo manual en `CatalogoController` y `MaterialesController`.

2. **El mismo problema de `INSERT ... RETURNING` + RLS que ya afectaba a `usuarios`, mordiendo también `solicitudes_asesoria` y `solicitudes_carrito`**: ambos endpoints públicos de creación (`POST /asesorias/solicitud`, `POST /carrito/solicitud`) fallaban con `500` porque ninguna de esas dos tablas tenía la excepción `service_auth` para el `SELECT` que el `RETURNING` necesita. Corregido con una migración nueva (`FixAsesoriaInsertReturning` — no se editó la migración de RLS ya pusheada) que agrega esa política a ambas tablas, más el mismo `set_config('app.rol', 'service_auth', true)` antes del insert en `AsesoriasService.crearSolicitud` y `CarritoService.crearSolicitud`.

Ambos verificados con la app real corriendo como `app_backend` (no superusuario): `POST /carrito/solicitud` y `POST /asesorias/solicitud` devolviendo `201`, con la franja de asesoría quedando correctamente bloqueada (`disponible: false`) tras la reserva.

### Cierre de los gaps de seguridad que quedaban abiertos de la sección 5
Tras una revisión punto por punto del `.md` contra el código, se cerraron los 4 puntos que estaban documentados pero no completamente implementados:

1. **Rate limiting por teléfono, además de por IP.** `PhoneRateLimitGuard` (`backend/src/common/rate-limit/`) usa Redis directamente (`INCR` + `EXPIRE`, key por endpoint + teléfono) en `/carrito/solicitud` y `/asesorias/solicitud` — 5 solicitudes por teléfono por hora, independiente del límite por IP que ya existía. Verificado en vivo: 6 requests seguidos con el mismo teléfono, el 6to devuelve `429`.

2. **`ThrottlerModule` con storage en Redis, no en memoria.** Con una sola instancia del backend no había diferencia notable, pero en memoria el contador no se comparte entre instancias — con 2+ instancias corriendo detrás de un balanceador, el límite efectivo se multiplicaría por la cantidad de instancias. Se usa `@nest-lab/throttler-storage-redis`. Verificado en vivo inspeccionando las keys en Redis (`redis-cli KEYS "*"` muestra las keys `{hash:default}:hits` del throttler).

3. **Sanitización de campos de texto libre.** `@SanitizedText()` (`backend/src/common/sanitize/`, sobre `sanitize-html` con `allowedTags: []`) aplicado a `Material.descripcion`, `Combo.descripcion`, `SolicitudCarrito.notas` y `SolicitudAsesoria.notasLlamada`. Corre en la fase de transformación del `ValidationPipe`, antes de llegar al service. Verificado en vivo: un `POST /materiales` con `<script>alert(1)</script>` en la descripción lo guarda sin el tag, ya sanitizado.

4. **Captcha (Cloudflare Turnstile), implementado como opt-in.** `CaptchaGuard` (`backend/src/common/captcha/`) verifica un token contra la API de Turnstile solo si `CAPTCHA_ENABLED=true` — deshabilitado por defecto porque no existe todavía un sitio real de Turnstile ni un frontend con el widget integrado; activarlo a ciegas rompería los flujos públicos. Cubierto con tests unitarios (habilitado/deshabilitado, token válido/inválido/ausente, falta de configuración del servidor); no probado en vivo contra la API real de Cloudflare por la misma razón.

**Bug encontrado en el camino:** `sanitize-html@2.13+` depende de una versión de `htmlparser2` que es ESM-only, incompatible con el setup CommonJS del proyecto — rompía Jest por completo al intentar parsear el paquete. Se fijó `sanitize-html` en `2.12.1` (última versión con `htmlparser2` en CommonJS).

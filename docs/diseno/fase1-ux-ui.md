# Fase 1 — Arquitectura de Información y UX/UI
## App Web — Empresa de Materiales de Construcción

Insumos analizados: `ARCHITECTURE.md`, `swagger.json` (35 endpoints, 34 DTOs), `guia-pantallas.md`.

---

## 0. Fundamento del diseño

**Sujeto:** venta de materiales de construcción (cemento, tuberías, herramientas) + agenda de asesoría técnica, en Venezuela. Sin checkout — el negocio es "consultá, te contactamos por WhatsApp".

**Dos audiencias, una identidad:**
1. **Storefront público** — contratistas, dueños de obra, clientes finales. Mobile-first, cultura de contacto directo por WhatsApp, decisión de compra basada en confianza y disponibilidad real de stock.
2. **Panel interno** — admin/ventas/asesores. Trabajo denso de datos (inventario, leads, reportes), prioriza velocidad y claridad sobre estética de venta.

Comparten paleta y tipografía; difieren en densidad y tono.

**Por qué esta dirección y no la genérica de IA** (revisión explícita contra los defaults más comunes):
- ❌ Crema `#F4F1EA` + acento terracota `#D97757` → ❌ descartado, es el default reconocible de cualquier generador. En su lugar: **gris concreto cálido** + **amarillo de obra** como acento.
- ❌ Negro casi puro `#0B0B0B` + acento neón → descartado. En su lugar: **carbón cálido** (tono asfalto/tierra, nunca negro puro).
- ❌ Cards idénticas con esquinas redondeadas y sombra suave (kit SaaS) → descartado para el catálogo. En su lugar: **fichas técnicas** con borde fino sólido, como una lista de precios de ferretería impresa.
- ❌ Eyebrows en MAYÚSCULAS, labels con em-dash, flechas en botones, monoespaciado decorativo → descartado en todos lados. El monoespaciado se usa **solo** donde hay datos tabulares reales (precio, SKU, stock) — es información, no decoración.
- ✅ Numeración tipo 01/02/03 se usa **únicamente** en el stepper de estados de asesoría (`pendiente → llamada → visita`), porque ahí sí es una secuencia real — en ningún otro lugar.

---

## 1. Sistema visual (tokens)

### Color

| Token | Hex | Uso |
|---|---|---|
| `concreto` | `#EDEAE3` | Fondo base — gris cálido de concreto pulido, no blanco puro |
| `carbon` | `#2C2A26` | Texto principal, fondos oscuros (header admin) — cálido, no negro puro |
| `acero` | `#5C6B70` | Elementos secundarios, bordes, iconografía, texto secundario |
| `amarillo-obra` | `#F2B705` | **Único** acento para acciones primarias (CTA, botón activo) — amarillo de casco de seguridad, se usa con moderación |
| `oxido` | `#B5502D` | Alertas cálidas puntuales: stock bajo, badges de urgencia real (no decorativo) |
| `disponible` | `#3F7A52` | Uso **semántico exclusivo**: stock disponible, estado "activo" — nunca decorativo |

**Regla dura:** `amarillo-obra` solo en un elemento de acción por pantalla. Si todo es amarillo, no hay jerarquía.

### Tipografía

| Rol | Familia | Uso |
|---|---|---|
| Titulares | **Roboto Slab** (700/500) | Nombres de producto, títulos de sección, hero — un slab serif transmite solidez/peso, coherente con "materiales que construyen" |
| Cuerpo / UI | **IBM Plex Sans** | Todo el texto de interfaz, formularios, botones — en ambos entornos |
| Datos tabulares | **IBM Plex Mono** | Precios, SKUs, stock — **solo** donde el contenido es literalmente una cifra o código alineable |

Line-length objetivo: <80 caracteres en texto de lectura (descripciones de producto, notas).

### Layout

- **Storefront:** alineación izquierda predominante. Excepción: hero de home, asimétrico, con fotografía real de material ocupando ~45% del viewport (no ilustración genérica).
- **Catálogo:** grid de fichas técnicas — borde fino sólido de 1px en `acero`, radio de esquina mínimo (2–4px, no el redondeo genérico de 12–16px), separación por líneas divisorias.
- **Panel admin:** sidebar fija a la izquierda, contenido en tablas densas, sin tarjetas decorativas — estados de fila con color semántico (`disponible` / `oxido` / `amarillo-obra` para pendiente).

### Principios

1. **El material es la imagen** — fotografía real de productos como protagonista, no íconos abstractos ni ilustraciones planas.
2. **El precio vive en la variante, visualmente** — la ficha de producto muestra el selector de presentación de forma explícita; nunca un precio "desde" ambiguo tapando que cada variante cuesta distinto.
3. **Dos densidades, una marca** — el panel es denso y utilitario; el storefront es más abierto y confía en la fotografía — pero comparten paleta y tipografía.
4. **Sin urgencia falsa** — el carrito es "pedí que te contacten", no un checkout. Nada de countdown timers ni "solo quedan 2 unidades" — el tono es de asesoría honesta, no presión de venta.

---

## 2. Arquitectura de Información

### 2.1 Sitemap — Zona pública (storefront)

```
Home
 │
 ├─ Catálogo ──────────────► Ficha de Producto
 │   (grid, filtro           (selector de variante,
 │    por categoría)          precio/stock por variante)
 │
 ├─ Combos ────────────────► Ficha de Combo
 │
 ├─ Carrito de Consulta      (acumula ítems desde Catálogo/Combos
 │   (resumen + formulario    → NO es checkout, es "pedí que te
 │    de contacto)             contacten")
 │
 ├─ Agendar Llamada
 │   └─ Elegir asesor → Ver disponibilidad → Formulario de contacto
 │       (agenda solo la LLAMADA de primer contacto, no una visita)
 │
 └─ Cuenta
     ├─ Registro (queda como rol "cliente" siempre)
     ├─ Login
     └─ Logout
```

### 2.2 Sitemap — Panel interno (requiere sesión)

```
Login
 │
 ▼
Dashboard (contenido según rol)
 │
 ├─ [admin] ──────────────────────────────────────────┐
 │   ├─ Usuarios (crear/editar/desactivar)             │
 │   ├─ Materiales                                     │
 │   │   ├─ Alta de material (datos descriptivos)      │
 │   │   └─ Agregar variante(s) (precio, stock, sku)   │
 │   ├─ Movimientos de inventario (kardex)             │
 │   ├─ Proveedores                                    │
 │   │   └─ Asociar proveedor a una VARIANTE           │
 │   ├─ Combos (arma paquetes con variantes específicas)│
 │   ├─ Reportes (inventario, ganancias — por período) │
 │   ├─ Asesores (alta + disponibilidad)               │
 │   ├─ Solicitudes de Carrito (todas)                 │
 │   └─ Solicitudes de Asesoría (todas)                │
 │                                                       │
 ├─ [ventas] ─────────────────────────────────────────┤
 │   └─ Solicitudes de Carrito (bandeja de leads)      │
 │                                                       │
 └─ [asesor] ─────────────────────────────────────────┘
     └─ Mis Solicitudes de Asesoría (solo las propias)
         stepper: pendiente → llamada_realizada →
                  (visita_pactada | no_procede)
                  [cancelada, desde cualquier punto]
```

**Nota de permisos para el diseño:** el menú lateral del panel debe construirse dinámicamente según el rol devuelto en el login — un `ventas` nunca debería ver siquiera la opción "Materiales" en su navegación, no solo bloquearla al hacer clic.

---

## 3. Wireframes conceptuales (ASCII) de las pantallas clave

### 3.1 Home (storefront)

```
┌─────────────────────────────────────────────────┐
│ [Logo]        Catálogo  Combos  Asesoría  [Login]│
├─────────────────────────────────────────────────┤
│                                                   │
│  ┌───────────────┐   Encontrá el material        │
│  │  [foto real   │   que tu obra necesita         │
│  │   de material │                                │
│  │   - cemento]  │   [Ver catálogo →ver arriba,   │
│  │               │    sin flecha real en botón]   │
│  └───────────────┘   [Agendar una llamada]        │
│                                                   │
├─────────────────────────────────────────────────┤
│  Categorías destacadas                           │
│  [Cemento]  [Tuberías]  [Herramientas]  [Combos] │
└─────────────────────────────────────────────────┘
```

### 3.2 Catálogo (grid de fichas técnicas, no cards SaaS)

```
┌─────────────────────────────────────────────────┐
│ Filtrar por categoría: [ Todas ▾ ]               │
├──────────────────┬──────────────────┬───────────┤
│ [foto]           │ [foto]           │ [foto]    │
│ Cemento Portland │ Tubería PVC 4"   │ ...       │
│ ─────────────────│ ─────────────────│           │
│ Desde $8.00      │ Desde $12.00     │           │
│ 2 presentaciones │ 1 presentación   │           │
└──────────────────┴──────────────────┴───────────┘
```

### 3.3 Ficha de producto (selector de variante obligatorio)

```
┌─────────────────────────────────────────────────┐
│ [foto grande]        Cemento Portland Gris        │
│                       Bolsa de cemento gris, uso  │
│                       general                     │
│                                                   │
│                       Presentación:               │
│                       ( ) 25kg — $8.00 — 100 disp.│
│                       ( ) 50kg — $15.00 — 40 disp.│
│                                                   │
│                       Cantidad: [ - 1 + ]         │
│                       [ Agregar a mi consulta ]   │
└─────────────────────────────────────────────────┘
```

### 3.4 Panel admin — Dashboard (rol admin)

```
┌─────────┬───────────────────────────────────────┐
│ [Logo]  │  Solicitudes nuevas: 4   Stock bajo: 2 │
│         │                                        │
│ Usuarios│  ┌─ Ganancias del mes ────────────┐    │
│ Materia-│  │  [gráfico de barras/línea]     │    │
│  les    │  └────────────────────────────────┘    │
│ Provee- │                                        │
│  dores  │  Últimas solicitudes de carrito        │
│ Combos  │  ┌────────────────────────────────┐    │
│ Reportes│  │ Juan Pérez  · nueva  · hace 2h  │    │
│ Asesores│  │ María Ruiz  · contactado        │    │
│ Solicit.│  └────────────────────────────────┘    │
│ carrito │                                        │
│ Solicit.│                                        │
│ asesoría│                                        │
└─────────┴───────────────────────────────────────┘
```

### 3.5 Bandeja de solicitud de asesoría (stepper de estado, no dropdown libre)

```
┌─────────────────────────────────────────────────┐
│ Carlos Ruiz — +58 412-1112233                    │
│                                                   │
│  ●───────●───────○───────○                       │
│ pendiente llamada  visita  (no procede)           │
│           realizada pactada                       │
│                                                   │
│  [ Registrar llamada ]   ← única acción           │
│                            disponible en este      │
│                            punto del flujo         │
└─────────────────────────────────────────────────┘
```

---

## 4. Próximos pasos sugeridos (Fase 2)

1. Mockups de alta fidelidad de las 5 pantallas clave de arriba (home, catálogo, ficha de producto, dashboard admin, bandeja de asesoría), aplicando los tokens de la sección 1.
2. Definir el sistema de componentes reutilizables (botón primario/secundario, input, tabla, badge de estado, stepper) antes de tocar código de Next.js.
3. Copywriting real de microtextos (estados vacíos, mensajes de error, confirmaciones) siguiendo el tono definido: directo, sin disculpas, sin venta agresiva.

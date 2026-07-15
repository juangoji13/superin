# PRD — Super IN

**Versión:** MVP de demostración  
**Producto:** Plataforma web de domicilios y cotizaciones de eventos  
**Ubicación inicial:** Barranquilla, Colombia  
**Estado:** Listo para diseño y desarrollo

---

## 1. Resumen

Super IN contará con dos módulos independientes dentro de una misma marca:

1. **Domicilios:** pedidos de almuerzos ejecutivos a domicilio.
2. **Salón de eventos:** landing informativa y formulario de cotización.

El MVP busca evitar que los pedidos se pierdan entre mensajes de WhatsApp. La página será el canal de registro y control; WhatsApp será el canal humano para confirmar y atender al cliente, sin usar WhatsApp Business API.

---

## 2. Problema

Actualmente los pedidos y consultas llegan por WhatsApp en gran cantidad, por lo que pueden perderse, responderse tarde o gestionarse sin orden. También se requiere publicar el menú diario sin reenviarlo manualmente a cada cliente y controlar qué platos o variantes siguen disponibles.

---

## 3. Objetivos

- Centralizar los domicilios en un panel operativo.
- Mostrar menú diario seleccionable y con stock disponible.
- Permitir comprar platos preparados o construir un plato personalizado.
- Registrar el pedido antes de abrir WhatsApp.
- Permitir confirmación humana desde administración.
- Dar visibilidad del estado del pedido al cliente, cocina y domiciliario.
- Mantener separado el flujo del salón de eventos.

---

## 4. Usuarios y roles

| Usuario | Necesidad | Permisos principales |
|---|---|---|
| Cliente | Pedir domicilio rápidamente | Ver menú, carrito, pago, horario, estado y WhatsApp |
| Administradora | Controlar operación | Confirmar/rechazar pedidos, cambiar estados, editar menú, stock, precios y horarios |
| Chef | Preparar pedidos | Ver pedido, cantidades, productos y observaciones; marcar listo |
| Domiciliario | Entregar pedidos | Ver cliente, dirección, contacto, pago, mapa y actualizar entrega |

**Usuarios iniciales internos:** 1 administradora, 2 chefs y 1 domiciliario.

---

## 5. Alcance del MVP

### 5.1 Domicilios

- Página pública de domicilios, optimizada para celular.
- Menú diario editable.
- Sección **Platos ya hechos**.
- Sección **Ármate un plato**.
- Carrito y formulario de pedido sin registro de cuenta.
- Pedidos para el mismo día o máximo un día de anticipación.
- Selector gráfico de franjas de entrega cada 15 minutos desde las 10:00 a. m.
- Costo de domicilio configurable y sumado al total.
- Pago en efectivo o transferencia.
- Carga opcional de comprobante para transferencias.
- Creación de pedido con código único.
- Apertura de WhatsApp con pedido prellenado.
- Panel administrativo, vista de cocina y vista de domiciliario.
- Consulta pública de estado por código y celular.
- Control de stock por plato, proteína o variante.

### 5.2 Salón de eventos

- Landing independiente en ruta propia.
- Servicios, galería, ubicación y medios de contacto.
- Formulario de cotización rápida.
- Registro de solicitud y apertura de WhatsApp con resumen.

---

## 6. Fuera del MVP

- WhatsApp Business API, mensajes automáticos y difusión masiva.
- Registro de cuentas para clientes.
- Rastreo GPS en vivo.
- Inventario de insumos de cocina.
- Facturación electrónica.
- Pasarela de pagos.
- Múltiples domiciliarios y asignación automática.
- Calendario con bloqueo automático para el salón.
- CRM avanzado.

---

## 7. Flujo del cliente

1. El cliente entra a `/domicilios`.
2. Consulta el menú diario.
3. Selecciona platos listos o construye su plato.
4. Agrega productos al carrito.
5. Elige fecha y franja de entrega.
6. Diligencia nombre, celular, dirección, barrio y referencia.
7. Elige pago en efectivo o transferencia; si aplica, adjunta comprobante.
8. El sistema calcula subtotal, domicilio y total.
9. Se crea el pedido con estado **Pendiente de confirmación** y código único.
10. Se abre WhatsApp con el resumen del pedido.
11. Administración confirma, rechaza o cancela.
12. El cliente consulta el progreso desde una página pública.

---

## 8. Menú y productos

### 8.1 Platos ya hechos

Son combinaciones creadas por administración o cocina. Cada plato tendrá nombre, foto opcional, componentes, precio, stock y estado.

| Plato mockup | Componentes | Precio | Stock | Estado |
|---|---|---:|---:|---|
| Almuerzo costeño | Arroz con coco, pollo guisado, patacón, ensalada, jugo | $22.000 | 20 | Disponible |
| Carne asada ejecutiva | Arroz blanco, carne, papa criolla, ensalada, bebida | $25.000 | 8 | Disponible |
| Pescado frito | Arroz con coco, pescado, patacón, ensalada, jugo | $28.000 | 0 | Agotado |

### 8.2 Ármate un plato

El cliente selecciona las opciones habilitadas en cada grupo:

| Grupo | Opciones mockup | Regla |
|---|---|---|
| Arroz | Blanco, con coco, mixto | Obligatorio |
| Proteína | Pollo, carne asada, cerdo, pescado | Obligatorio; puede cambiar precio |
| Acompañamiento | Patacón, yuca, papa criolla | Obligatorio |
| Bebida | Jugo de corozo, limonada, gaseosa, agua | Obligatorio |
| Ensalada | Verde, rusa, sin ensalada | Configurable |
| Sopa | Sancocho, crema, sin sopa | Configurable |
| Postre | Flan, arroz con leche | Adicional opcional |

Cada opción debe admitir: nombre, foto opcional, precio adicional, stock exacto, estado activo/inactivo y orden visual.

### 8.3 Reglas de stock

- El stock se muestra con número exacto al cliente.
- El stock se controla por plato y/o variante, especialmente proteína.
- Un producto con stock cero se muestra como **Agotado** y no puede agregarse.
- Crear pedido no descuenta stock.
- Confirmar pedido descuenta stock.
- Rechazar, cancelar o expirar un pedido no descuenta stock.
- Si una proteína se agota, se bloquea en “Ármate un plato” y se marca agotado cualquier plato preparado que dependa de ella.

---

## 9. Pedido y pago

### Datos requeridos

- Nombre completo
- Celular
- Dirección de entrega
- Barrio
- Referencia de ubicación
- Fecha de entrega
- Franja de entrega
- Productos y observaciones
- Método de pago

### Métodos de pago

- Efectivo
- Transferencia

Para transferencia se podrá adjuntar comprobante. El valor de domicilio será configurable por administración.

---

## 10. Horarios y programación

- Se permiten pedidos para el mismo día o máximo un día antes.
- Las franjas inician a las **10:00 a. m.**.
- Cada franja dura **15 minutos**.
- La hora final, cupos y franjas activas serán configurables desde el panel.
- La demostración incluirá franjas mockup, por ejemplo: 10:00, 10:15, 10:30, 10:45, 11:00.

---

## 11. WhatsApp y confirmación

Al finalizar el pedido, el sistema guarda el registro y abre WhatsApp con un mensaje estructurado. No se usarán automatizaciones ni API oficial.

### Mensaje mockup

```text
Hola, hice el pedido SUP-1042 desde la página.

Cliente: Laura Gómez
Entrega: 15 de julio, 12:30 p. m.
Dirección: Carrera 45 #72-20, Barrio Colombia
Pedido:
- 1 Almuerzo armado: arroz con coco, pollo guisado, patacón, jugo de corozo
- 1 Gaseosa personal

Total: $29.000
Pago: Transferencia
```

Cualquier persona autorizada que tenga el teléfono administrativo puede atender WhatsApp; la confirmación operativa se realiza desde el panel administrativo.

### Tiempo de confirmación

- Un pedido queda en **Pendiente de confirmación** durante 15 minutos.
- Si no se confirma, pasa a **Cancelado/Expirado**.
- La pantalla de estado muestra un botón para abrir WhatsApp con el texto:

```text
Hola, hice el pedido SUP-1042 desde la página, pero no fue confirmado. ¿Podrían ayudarme?
```

---

## 12. Estados del pedido

| Estado | Responsable | Descripción |
|---|---|---|
| Pendiente de confirmación | Sistema | Pedido creado; espera máximo 15 minutos |
| Confirmado | Administradora | Pedido aceptado; descuenta stock |
| En preparación | Cocina | Pedido en elaboración |
| Listo para entrega | Cocina/Administración | Pedido preparado |
| En camino | Domiciliario | Pedido salió a entrega |
| Entregado | Domiciliario | Pedido finalizado |
| Rechazado | Administradora | No se puede atender |
| Cancelado/Expirado | Sistema/Administración | Pedido no confirmado o cancelado |

---

## 13. Panel administrativo

### Funciones

- Visualizar pedidos en tiempo real.
- Filtrar por fecha, estado y horario.
- Confirmar, rechazar, cancelar y cambiar estados.
- Configurar tiempo estimado de entrega.
- Abrir WhatsApp con datos del pedido.
- Gestionar menú diario, platos, variantes, precios, fotos y stock.
- Configurar zonas, costos de domicilio, horario y franjas.
- Ver comprobantes de transferencia.
- Consultar historial básico de pedidos.

### Vista mockup

```text
[Pendientes: 3] [En cocina: 4] [En camino: 2]

SUP-1042 | 12:30 p. m. | Laura Gómez | $29.000
Pollo guisado + gaseosa | Barrio Colombia
[Confirmar] [Rechazar] [WhatsApp]

SUP-1043 | 12:45 p. m. | Andrés Pérez | $22.000
Almuerzo costeño | Boston
[Confirmar] [Rechazar] [WhatsApp]
```

---

## 14. Vista de cocina

Cocina solo verá número de pedido, horario, productos, cantidades y observaciones. No verá dirección, teléfono, valor ni forma de pago.

```text
Pedido: SUP-1042
Entrega programada: 12:30 p. m.

1 x Almuerzo armado
- Arroz con coco
- Pollo guisado
- Patacón
- Jugo de corozo
Observación: sin ensalada

[En preparación] [Marcar como listo]
```

---

## 15. Vista del domiciliario

El domiciliario verá pedidos listos o en ruta, con los datos necesarios para entregar.

```text
Pedido: SUP-1042
Cliente: Laura Gómez
Teléfono: 300 123 4567
Dirección: Carrera 45 #72-20
Referencia: Casa blanca, portón negro
Total: $29.000
Pago: Transferencia

[Abrir Google Maps] [Llamar] [Abrir WhatsApp]
[Recogido] [En camino] [Entregado]
```

---

## 16. Estado público del pedido

Ruta sugerida:

```text
/pedido/SUP-1042
```

El cliente consulta con código y celular. Verá:

- Código del pedido
- Fecha y franja de entrega
- Resumen del pedido
- Total
- Estado actual
- Tiempo estimado tras confirmación
- Botón de soporte por WhatsApp

No verá ubicación GPS, información interna ni datos de otros clientes.

---

## 17. Salón de eventos

Ruta sugerida: `/eventos`.

### Contenido

- Presentación del salón
- Galería
- Servicios
- Capacidad
- Ubicación y mapa
- Redes y WhatsApp
- Formulario de cotización

### Formulario mockup

```text
Nombre: Camila Torres
Celular: 301 555 9876
Tipo de evento: Cumpleaños
Fecha estimada: 20 de agosto de 2026
Número de invitados: 80
Horario: Noche
Servicios requeridos: Decoración, sonido y catering
Mensaje adicional: Quiero temática tropical

[Solicitar cotización por WhatsApp]
```

La solicitud se guardará y abrirá WhatsApp con los datos. Precios, paquetes y calendario de disponibilidad se definirán en una fase posterior.

---

## 18. Modelo de datos base

| Entidad | Campos principales |
|---|---|
| Usuarios | id, nombre, email, rol, activo |
| Roles | administradora, chef, domiciliario |
| Categorías | id, nombre, tipo, activo |
| Productos | id, nombre, descripción, precio, foto, stock, activo |
| Opciones de plato | id, grupo, nombre, precio_adicional, stock, activo |
| Platos preparados | id, nombre, componentes, precio, stock, activo |
| Pedidos | código, cliente, celular, dirección, barrio, referencia, fecha, franja, estado, subtotal, domicilio, total |
| Detalles de pedido | pedido_id, producto/opción, cantidad, precio, observaciones |
| Comprobantes | pedido_id, url_archivo, fecha_carga |
| Configuración | WhatsApp, horarios, zonas, costos, tiempo_confirmación |
| Cotizaciones | cliente, celular, evento, fecha, invitados, servicios, mensaje, estado |

---

## 19. Requisitos no funcionales

- Diseño mobile-first.
- Carga rápida en redes móviles.
- Autenticación y control de roles en panel interno.
- Restricción de datos sensibles por rol.
- Dirección, teléfonos y comprobantes no deben ser públicos.
- Imágenes optimizadas.
- Base de datos con respaldo periódico.
- Datos mockup editables desde administración.

---

## 20. Stack técnico recomendado

| Capa | Tecnología propuesta |
|---|---|
| Frontend | Next.js, TypeScript, Tailwind CSS |
| Base de datos y backend | Supabase: PostgreSQL, Auth, Storage, RLS |
| Hosting inicial | Vercel |
| Archivos | Supabase Storage |
| Mapas | Enlaces a Google Maps |
| WhatsApp | `wa.me` con mensaje prellenado |

### Hosting

Para el MVP no es necesario usar el servidor Oracle. Vercel + Supabase reduce configuración de servidor, facilita SSL y despliegues. El servidor Oracle puede reservarse para automatizaciones, copias de seguridad o una API futura.

Si la clienta ya tiene hosting, debe validarse que soporte aplicaciones Next.js. Si es hosting compartido tradicional orientado a PHP/cPanel, se recomienda mantener el frontend en Vercel y conectar un dominio propio.

---

## 21. Criterios de aceptación

- El cliente puede pedir desde celular un plato preparado o personalizado.
- No se pueden agregar opciones agotadas.
- El pedido se guarda antes de abrir WhatsApp.
- WhatsApp recibe un resumen con código, productos, dirección, fecha/franja y total.
- Administración puede confirmar o rechazar pedidos.
- Confirmar descuenta el stock correcto.
- Cocina no ve datos de contacto, dirección ni valores.
- Domiciliario puede abrir ruta, llamar y marcar estados.
- El cliente puede consultar su estado sin crear una cuenta.
- Pedidos sin confirmar en 15 minutos expiran y ofrecen soporte por WhatsApp.
- Administración puede editar menú, stock, precios, costos y franjas.
- La solicitud de eventos se guarda y abre WhatsApp con sus datos.

---

## 22. Fase 2

- Pasarela de pagos.
- Validación automática de transferencias.
- Indicadores de ventas, platos más vendidos, cancelaciones y tiempos de entrega.
- Reporte diario para cocina y administración.
- Varios domiciliarios y asignación de pedidos.
- Zonas con costo calculado automáticamente.
- Bloqueo de franjas por capacidad.
- Calendario del salón, anticipos y paquetes.
- PWA instalable.

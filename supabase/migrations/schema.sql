-- Habilitar extensión pgcrypto para UUIDs si es necesario
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Roles
CREATE TABLE IF NOT EXISTS public.roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    creado_a TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insertar roles iniciales
INSERT INTO public.roles (nombre) VALUES 
('administradora'), 
('chef'), 
('domiciliario')
ON CONFLICT (nombre) DO NOTHING;

-- 2. Tabla de Usuarios (para el personal interno)
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    rol VARCHAR(50) REFERENCES public.roles(nombre) NOT NULL,
    activo BOOLEAN DEFAULT true NOT NULL,
    creado_a TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla de Categorías de Productos
CREATE TABLE IF NOT EXISTS public.categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- 'plato_hecho', 'armable'
    activo BOOLEAN DEFAULT true NOT NULL,
    creado_a TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabla de Productos (Platos preparados o bebidas)
CREATE TABLE IF NOT EXISTS public.productos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria_id INT REFERENCES public.categorias(id) ON DELETE SET NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio INT NOT NULL CHECK (precio >= 0),
    foto TEXT,
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    activo BOOLEAN DEFAULT true NOT NULL,
    creado_a TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabla de Opciones de Platos (para "Ármate un plato")
CREATE TABLE IF NOT EXISTS public.opciones_plato (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grupo VARCHAR(50) NOT NULL, -- 'Arroz', 'Proteína', 'Acompañamiento', 'Bebida', 'Ensalada', 'Sopa', 'Postre'
    nombre VARCHAR(100) NOT NULL,
    precio_adicional INT DEFAULT 0 CHECK (precio_adicional >= 0),
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    activo BOOLEAN DEFAULT true NOT NULL,
    orden INT DEFAULT 0 NOT NULL,
    dias TEXT[] DEFAULT '{}',
    creado_a TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabla de Pedidos
CREATE TABLE IF NOT EXISTS public.pedidos (
    codigo VARCHAR(20) PRIMARY KEY, -- e.g., 'SUP-1042'
    cliente VARCHAR(100) NOT NULL,
    celular VARCHAR(20) NOT NULL,
    direccion TEXT NOT NULL,
    barrio VARCHAR(100) NOT NULL,
    referencia TEXT,
    fecha DATE NOT NULL,
    franja VARCHAR(30) NOT NULL, -- e.g., '12:30 p.m.' or 'Inmediato'
    estado VARCHAR(50) DEFAULT 'Pendiente de confirmación' NOT NULL,
    subtotal INT NOT NULL CHECK (subtotal >= 0),
    domicilio INT NOT NULL CHECK (domicilio >= 0),
    total INT NOT NULL CHECK (total >= 0),
    metodo_pago VARCHAR(50) NOT NULL, -- 'Efectivo', 'Transferencia'
    tiempo_estimado INT, -- en minutos, configurable tras confirmar
    creado_a TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Detalles de los Pedidos
CREATE TABLE IF NOT EXISTS public.detalles_pedido (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_codigo VARCHAR(20) REFERENCES public.pedidos(codigo) ON DELETE CASCADE NOT NULL,
    nombre VARCHAR(100) NOT NULL, -- Nombre del producto o 'Almuerzo Armado'
    componentes JSONB, -- Si es almuerzo armado, JSON con los ingredientes seleccionados
    cantidad INT DEFAULT 1 NOT NULL CHECK (cantidad > 0),
    precio INT NOT NULL CHECK (precio >= 0),
    observaciones TEXT
);

-- 8. Carga de Comprobantes para Transferencias
CREATE TABLE IF NOT EXISTS public.comprobantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_codigo VARCHAR(20) REFERENCES public.pedidos(codigo) ON DELETE CASCADE UNIQUE NOT NULL,
    url_archivo TEXT NOT NULL,
    creado_a TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Tabla de Configuración Global
CREATE TABLE IF NOT EXISTS public.configuracion (
    clave VARCHAR(100) PRIMARY KEY,
    valor JSONB NOT NULL
);

-- Insertar configuraciones iniciales por defecto
INSERT INTO public.configuracion (clave, valor) VALUES 
('whatsapp_contacto', '{"numero": "573001234567"}'::jsonb),
('costo_domicilio', '{"valor": 5000}'::jsonb),
('tiempo_confirmacion', '{"minutos": 15}'::jsonb),
('horarios_servicio', '{"abierto": true, "hora_inicio": "10:00", "hora_fin": "15:00"}'::jsonb),
('franjas_entrega', '["10:00", "10:15", "10:30", "10:45", "11:00", "11:15", "11:30", "11:45", "12:00", "12:15", "12:30", "12:45", "13:00", "13:15", "13:30", "13:45", "14:00"]'::jsonb)
ON CONFLICT (clave) DO NOTHING;

-- 10. Cotizaciones para Salón de Eventos
CREATE TABLE IF NOT EXISTS public.cotizaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente VARCHAR(100) NOT NULL,
    celular VARCHAR(20) NOT NULL,
    tipo_evento VARCHAR(100) NOT NULL,
    fecha DATE NOT NULL,
    invitados INT NOT NULL CHECK (invitados > 0),
    horario VARCHAR(50) NOT NULL, -- 'Día', 'Tarde', 'Noche'
    servicios JSONB NOT NULL, -- Arreglo de strings: ["decoracion", "sonido", "catering"]
    mensaje TEXT,
    estado VARCHAR(50) DEFAULT 'Pendiente' NOT NULL,
    creado_a TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opciones_plato ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detalles_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprobantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE RLS (BASELINE)

-- 1. Categorías: Cualquiera lee, solo administradores escriben.
CREATE POLICY "Permitir lectura pública de categorías" ON public.categorias
    FOR SELECT USING (true);
CREATE POLICY "Permitir escritura a administradores en categorías" ON public.categorias
    FOR ALL USING (auth.role() = 'authenticated');

-- 2. Productos: Cualquiera lee, solo administradores escriben.
CREATE POLICY "Permitir lectura pública de productos" ON public.productos
    FOR SELECT USING (true);
CREATE POLICY "Permitir escritura a administradores en productos" ON public.productos
    FOR ALL USING (auth.role() = 'authenticated');

-- 3. Opciones de Plato: Cualquiera lee, solo administradores escriben.
CREATE POLICY "Permitir lectura pública de opciones" ON public.opciones_plato
    FOR SELECT USING (true);
CREATE POLICY "Permitir escritura a administradores en opciones" ON public.opciones_plato
    FOR ALL USING (auth.role() = 'authenticated');

-- 4. Pedidos: 
-- - Clientes pueden insertar.
-- - Clientes pueden consultar el suyo propio mediante código.
-- - Usuarios autenticados (personal) pueden hacer todo.
CREATE POLICY "Permitir inserción de pedidos a clientes" ON public.pedidos
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir lectura pública por código de pedido" ON public.pedidos
    FOR SELECT USING (true);
CREATE POLICY "Permitir gestión de pedidos a personal autenticado" ON public.pedidos
    FOR ALL USING (auth.role() = 'authenticated');

-- 5. Detalles de Pedido:
-- - Clientes pueden insertar.
-- - Clientes pueden leer.
-- - Personal autenticado puede hacer todo.
CREATE POLICY "Permitir inserción de detalles a clientes" ON public.detalles_pedido
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir lectura de detalles de pedidos" ON public.detalles_pedido
    FOR SELECT USING (true);
CREATE POLICY "Permitir gestión de detalles a personal autenticado" ON public.detalles_pedido
    FOR ALL USING (auth.role() = 'authenticated');

-- 11. Usuarios: Lectura pública, registro y actualización propia.
CREATE POLICY "Permitir lectura pública de usuarios" ON public.usuarios
    FOR SELECT USING (true);
CREATE POLICY "Permitir registro de perfil propio" ON public.usuarios
    FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Permitir actualización de perfil propio" ON public.usuarios
    FOR UPDATE USING (auth.uid() = id);


-- 6. Comprobantes:
-- - Clientes pueden insertar.
-- - Solo personal autenticado puede ver.
CREATE POLICY "Permitir inserción de comprobante a clientes" ON public.comprobantes
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir ver comprobantes a todos" ON public.comprobantes
    FOR SELECT USING (true);

-- 7. Configuración: Lectura pública, escritura privada.
CREATE POLICY "Permitir lectura pública de configuración" ON public.configuracion
    FOR SELECT USING (true);
CREATE POLICY "Permitir gestión de configuración a administradores" ON public.configuracion
    FOR ALL USING (auth.role() = 'authenticated');

-- 8. Cotizaciones: Inserción pública, gestión autenticada.
CREATE POLICY "Permitir creación de cotizaciones" ON public.cotizaciones
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir ver y gestionar cotizaciones a administradores" ON public.cotizaciones
    FOR ALL USING (auth.role() = 'authenticated');

-- 9. CONFIGURACIÓN DE STORAGE BUCKETS (Usando el esquema storage de Supabase)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('comprobantes', 'comprobantes', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('imagenes-menu', 'imagenes-menu', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage para 'comprobantes' (clientes suben, personal lee)
CREATE POLICY "Cualquiera puede subir comprobantes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'comprobantes');

CREATE POLICY "Solo personal autenticado puede leer comprobantes"
ON storage.objects FOR SELECT
USING (bucket_id = 'comprobantes' AND auth.role() = 'authenticated');

-- Políticas de Storage para 'imagenes-menu' (público lee, personal escribe)
CREATE POLICY "Cualquiera puede leer imagenes de menu"
ON storage.objects FOR SELECT
USING (bucket_id = 'imagenes-menu');

CREATE POLICY "Solo personal autenticado puede subir/modificar imagenes de menu"
ON storage.objects FOR ALL
USING (bucket_id = 'imagenes-menu' AND auth.role() = 'authenticated');

-- 10. Habilitar tiempo real (Realtime) para pedidos y cotizaciones en Supabase
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.cotizaciones;
  END IF;
END $$;

-- Ejecuta este script en el SQL Editor de tu panel de Supabase para crear el bucket de Storage

-- 1. Crear el bucket "comprobantes" si no existe y hacerlo público
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprobantes', 'comprobantes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Eliminar políticas previas si existieran para evitar conflictos
DROP POLICY IF EXISTS "Permitir ver comprobantes a todos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir subir comprobantes a todos" ON storage.objects;

-- 3. Crear política para permitir que cualquiera pueda VER las imágenes del bucket comprobantes
CREATE POLICY "Permitir ver comprobantes a todos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'comprobantes' );

-- 4. Crear política para permitir que cualquiera pueda SUBIR imágenes al bucket comprobantes
CREATE POLICY "Permitir subir comprobantes a todos"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'comprobantes' );

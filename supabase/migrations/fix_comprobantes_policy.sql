-- Run this script in the Supabase SQL Editor to allow both authenticated and anon users to read receipt URLs.
DROP POLICY IF EXISTS "Permitir ver comprobantes a personal autenticado" ON public.comprobantes;
DROP POLICY IF EXISTS "Permitir ver comprobantes a todos" ON public.comprobantes;

CREATE POLICY "Permitir ver comprobantes a todos" ON public.comprobantes
    FOR SELECT USING (true);

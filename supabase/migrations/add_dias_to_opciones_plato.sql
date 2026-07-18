-- Run this script in the Supabase SQL Editor to support day-specific options for Custom Plate components
ALTER TABLE public.opciones_plato ADD COLUMN IF NOT EXISTS dias TEXT[] DEFAULT '{}';

-- Alter franja column in public.pedidos to allow longer strings like 'Inmediato' or 'Lo antes posible'
ALTER TABLE public.pedidos ALTER COLUMN franja TYPE VARCHAR(30);

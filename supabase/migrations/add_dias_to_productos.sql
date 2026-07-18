-- Run this script in the Supabase SQL Editor to support day-specific menus
ALTER TABLE public.productos ADD COLUMN IF NOT EXISTS dias TEXT[] DEFAULT '{}';

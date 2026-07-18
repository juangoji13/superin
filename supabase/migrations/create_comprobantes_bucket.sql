-- Run this script in the Supabase SQL Editor

-- Create a new public bucket for 'comprobantes'
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprobantes', 'comprobantes', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to the bucket
CREATE POLICY "Public Access for Comprobantes" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'comprobantes');

-- Allow authenticated and anon users to upload to the bucket
CREATE POLICY "Allow Upload to Comprobantes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'comprobantes');

-- Allow authenticated users to delete/update if necessary
CREATE POLICY "Allow Update to Comprobantes"
ON storage.objects FOR UPDATE
WITH CHECK (bucket_id = 'comprobantes');

CREATE POLICY "Allow Delete to Comprobantes"
ON storage.objects FOR DELETE
USING (bucket_id = 'comprobantes');

DROP POLICY IF EXISTS "demo photos delete" ON storage.objects;
CREATE POLICY "block direct demo photo deletion" ON storage.objects AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (bucket_id <> 'complaint-photos');
CREATE POLICY "block direct demo photo overwrite" ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon, authenticated USING (bucket_id <> 'complaint-photos') WITH CHECK (bucket_id <> 'complaint-photos');
DROP POLICY IF EXISTS "public demo delete" ON public.complaints;
CREATE POLICY "block direct demo complaint deletion" ON public.complaints AS RESTRICTIVE FOR DELETE TO anon, authenticated USING (false);
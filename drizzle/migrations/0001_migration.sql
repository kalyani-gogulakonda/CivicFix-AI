CREATE POLICY "demo photos read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'complaint-photos');
CREATE POLICY "demo photos upload" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'complaint-photos');
CREATE POLICY "demo photos delete" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'complaint-photos');
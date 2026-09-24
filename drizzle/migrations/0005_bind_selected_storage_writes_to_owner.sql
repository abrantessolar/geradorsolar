DROP POLICY IF EXISTS "Equipe deleta layouts" ON storage.objects;
CREATE POLICY "Proprietário deleta layouts" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'layouts-obras' AND owner_id = auth.uid()::text AND public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Equipe atualiza layouts" ON storage.objects;
CREATE POLICY "Proprietário atualiza layouts" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'layouts-obras' AND owner_id = auth.uid()::text AND public.has_panel_access(auth.uid())) WITH CHECK (bucket_id = 'layouts-obras' AND owner_id = auth.uid()::text AND public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Equipe envia layouts" ON storage.objects;
CREATE POLICY "Proprietário envia layouts" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'layouts-obras' AND owner_id = auth.uid()::text AND public.has_panel_access(auth.uid()));

DROP POLICY IF EXISTS "Equipe atualiza templates" ON storage.objects;
CREATE POLICY "Proprietário atualiza templates" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'templates' AND owner_id = auth.uid()::text AND public.has_panel_access(auth.uid())) WITH CHECK (bucket_id = 'templates' AND owner_id = auth.uid()::text AND public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Equipe envia templates" ON storage.objects;
CREATE POLICY "Proprietário envia templates" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'templates' AND owner_id = auth.uid()::text AND public.has_panel_access(auth.uid()));

DROP POLICY IF EXISTS "Equipe atualiza premios" ON storage.objects;
CREATE POLICY "Proprietário atualiza premios" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'energia-premios' AND owner_id = auth.uid()::text AND public.has_panel_access(auth.uid())) WITH CHECK (bucket_id = 'energia-premios' AND owner_id = auth.uid()::text AND public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Equipe envia premios" ON storage.objects;
CREATE POLICY "Proprietário envia premios" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'energia-premios' AND owner_id = auth.uid()::text AND public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Equipe deleta premios" ON storage.objects;
CREATE POLICY "Proprietário deleta premios" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'energia-premios' AND owner_id = auth.uid()::text AND public.has_panel_access(auth.uid()));
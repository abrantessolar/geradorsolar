-- Restrict shared operational tables to authenticated staff with panel access.
DROP POLICY IF EXISTS "Autenticados inserem histórico" ON public.historico_propostas;
CREATE POLICY "Equipe insere histórico"
ON public.historico_propostas FOR INSERT TO authenticated
WITH CHECK (public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Histórico visível para autenticados" ON public.historico_propostas;
CREATE POLICY "Equipe vê histórico"
ON public.historico_propostas FOR SELECT TO authenticated
USING (public.has_panel_access(auth.uid()));

DROP POLICY IF EXISTS "Autenticados inserem leads" ON public.leads;
CREATE POLICY "Equipe insere leads"
ON public.leads FOR INSERT TO authenticated
WITH CHECK (public.has_panel_access(auth.uid()));

DROP POLICY IF EXISTS "escrita autenticada propostas_hibridas" ON public.propostas_hibridas;
CREATE POLICY "Equipe gerencia propostas_hibridas"
ON public.propostas_hibridas FOR ALL TO authenticated
USING (public.has_panel_access(auth.uid()))
WITH CHECK (public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "leitura publica propostas_hibridas" ON public.propostas_hibridas;
CREATE POLICY "Proposta hibrida acessível por código"
ON public.propostas_hibridas FOR SELECT TO anon, authenticated
USING (codigo_acesso IS NOT NULL AND codigo_acesso = current_setting('request.headers', true)::jsonb ->> 'x-proposal-code');

-- Replace tautological reads on public catalog tables with explicit public-record predicates.
DROP POLICY IF EXISTS "Equipamentos visíveis para todos" ON public.equipamentos_calculadora;
CREATE POLICY "Equipamentos ativos visíveis para todos" ON public.equipamentos_calculadora FOR SELECT TO anon, authenticated USING (ativo = true);
DROP POLICY IF EXISTS "Fotos visíveis para todos" ON public.fotos_portfolio;
CREATE POLICY "Fotos ativas visíveis para todos" ON public.fotos_portfolio FOR SELECT TO anon, authenticated USING (ativo = true);
DROP POLICY IF EXISTS "Irradiância visível para todos" ON public.cidades_irradiancia;
CREATE POLICY "Irradiância pública por cidade" ON public.cidades_irradiancia FOR SELECT TO anon, authenticated USING (cidade IS NOT NULL AND uf IS NOT NULL);
DROP POLICY IF EXISTS "leitura publica equipamentos_simulador_hibrido" ON public.equipamentos_simulador_hibrido;
CREATE POLICY "Equipamentos híbridos ativos públicos" ON public.equipamentos_simulador_hibrido FOR SELECT TO anon, authenticated USING (ativo = true);
DROP POLICY IF EXISTS "leitura publica equipamentos_inversor_hibrido" ON public.equipamentos_inversor_hibrido;
CREATE POLICY "Inversores híbridos ativos públicos" ON public.equipamentos_inversor_hibrido FOR SELECT TO anon, authenticated USING (ativo = true);
DROP POLICY IF EXISTS "leitura publica equipamentos_bateria_hibrida" ON public.equipamentos_bateria_hibrida;
CREATE POLICY "Baterias híbridas ativas públicas" ON public.equipamentos_bateria_hibrida FOR SELECT TO anon, authenticated USING (ativo = true);
DROP POLICY IF EXISTS "Distribuidoras visíveis para todos" ON public.distribuidoras;
CREATE POLICY "Distribuidoras públicas válidas" ON public.distribuidoras FOR SELECT TO anon, authenticated USING (nome IS NOT NULL AND valor_kwh >= 0);
DROP POLICY IF EXISTS "Kits visíveis para todos" ON public.equipamentos_kits;
CREATE POLICY "Kits ativos visíveis para todos" ON public.equipamentos_kits FOR SELECT TO anon, authenticated USING (ativo = true);
DROP POLICY IF EXISTS "Logos visíveis para todos" ON public.logos_parceiros;
CREATE POLICY "Logos ativos visíveis para todos" ON public.logos_parceiros FOR SELECT TO anon, authenticated USING (ativo = true);

-- Replace unrestricted authenticated reads with panel-access checks.
DROP POLICY IF EXISTS "Gestor vê movimentacoes" ON public.movimentacoes_estoque;
CREATE POLICY "Equipe vê movimentacoes" ON public.movimentacoes_estoque FOR SELECT TO authenticated USING (public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Placas visíveis para autenticados" ON public.equipamentos_placas;
CREATE POLICY "Equipe vê placas" ON public.equipamentos_placas FOR SELECT TO authenticated USING (public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Instaladores visíveis para autenticados" ON public.instaladores;
CREATE POLICY "Equipe vê instaladores" ON public.instaladores FOR SELECT TO authenticated USING (public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Gestor vê qtd padrao" ON public.materiais_quantidades_padrao;
CREATE POLICY "Equipe vê qtd padrao" ON public.materiais_quantidades_padrao FOR SELECT TO authenticated USING (public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Gestor vê fornecedores_materiais" ON public.fornecedores_materiais;
CREATE POLICY "Equipe vê fornecedores_materiais" ON public.fornecedores_materiais FOR SELECT TO authenticated USING (public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Gestor vê unidades_consumidoras" ON public.unidades_consumidoras;
CREATE POLICY "Equipe vê unidades_consumidoras" ON public.unidades_consumidoras FOR SELECT TO authenticated USING (public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Gestor vê custos_obra" ON public.custos_obra;
CREATE POLICY "Equipe vê custos_obra" ON public.custos_obra FOR SELECT TO authenticated USING (public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Gestor vê estoque" ON public.estoque;
CREATE POLICY "Equipe vê estoque" ON public.estoque FOR SELECT TO authenticated USING (public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Modelos visíveis para autenticados" ON public.modelos_documentos;
CREATE POLICY "Equipe vê modelos" ON public.modelos_documentos FOR SELECT TO authenticated USING (public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Gestor vê materiais" ON public.materiais;
CREATE POLICY "Equipe vê materiais" ON public.materiais FOR SELECT TO authenticated USING (public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Staff read whatsapp_templates" ON public.whatsapp_templates;
CREATE POLICY "Equipe lê whatsapp_templates" ON public.whatsapp_templates FOR SELECT TO authenticated USING (public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Equipe ve avaliacoes" ON public.avaliacoes_clientes;
CREATE POLICY "Equipe vê avaliações" ON public.avaliacoes_clientes FOR SELECT TO authenticated USING (public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Gestor vê cabos_obra" ON public.cabos_obra;
CREATE POLICY "Equipe vê cabos_obra" ON public.cabos_obra FOR SELECT TO authenticated USING (public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Vendedores visíveis para autenticados" ON public.vendedores;
CREATE POLICY "Equipe vê vendedores" ON public.vendedores FOR SELECT TO authenticated USING (public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Gestor vê cabos_padrao" ON public.cabos_padrao;
CREATE POLICY "Equipe vê cabos_padrao" ON public.cabos_padrao FOR SELECT TO authenticated USING (public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Inversores visíveis para autenticados" ON public.equipamentos_inversores;
CREATE POLICY "Equipe vê inversores" ON public.equipamentos_inversores FOR SELECT TO authenticated USING (public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Authenticated can view all faq" ON public.faq;
CREATE POLICY "Equipe vê todo faq" ON public.faq FOR SELECT TO authenticated USING (public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Configurações visíveis para autenticados" ON public.configuracoes;
CREATE POLICY "Equipe vê configurações" ON public.configuracoes FOR SELECT TO authenticated USING (public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Gestor vê lista_materiais_obra" ON public.lista_materiais_obra;
CREATE POLICY "Equipe vê lista_materiais_obra" ON public.lista_materiais_obra FOR SELECT TO authenticated USING (public.has_panel_access(auth.uid()));

-- Proposals are owner-scoped for staff; public links are handled separately by application-specific access.
DROP POLICY IF EXISTS "Propostas visíveis para autenticados" ON public.propostas;
CREATE POLICY "Criadores e equipe veem propostas" ON public.propostas FOR SELECT TO authenticated USING (criador_user_id = auth.uid() OR public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Propostas visíveis por link público" ON public.propostas;

-- Shared operational storage is writable only by staff. Public asset buckets retain read access through non-tautological bucket predicates.
DROP POLICY IF EXISTS "Autenticados deletam layouts" ON storage.objects;
CREATE POLICY "Equipe deleta layouts" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'layouts-obras' AND public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Autenticados atualizam layouts" ON storage.objects;
CREATE POLICY "Equipe atualiza layouts" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'layouts-obras' AND public.has_panel_access(auth.uid())) WITH CHECK (bucket_id = 'layouts-obras' AND public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Autenticados fazem upload de layouts" ON storage.objects;
CREATE POLICY "Equipe envia layouts" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'layouts-obras' AND public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Layouts públicos para leitura" ON storage.objects;
CREATE POLICY "Leitura pública de layouts válidos" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'layouts-obras' AND name IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated update templates" ON storage.objects;
CREATE POLICY "Equipe atualiza templates" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'templates' AND public.has_panel_access(auth.uid())) WITH CHECK (bucket_id = 'templates' AND public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Authenticated upload templates" ON storage.objects;
CREATE POLICY "Equipe envia templates" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'templates' AND public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Public read templates" ON storage.objects;
CREATE POLICY "Leitura pública de templates válidos" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'templates' AND name IS NOT NULL);

DROP POLICY IF EXISTS "Energia premios autenticado update" ON storage.objects;
CREATE POLICY "Equipe atualiza premios" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'energia-premios' AND public.has_panel_access(auth.uid())) WITH CHECK (bucket_id = 'energia-premios' AND public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Energia premios autenticado upload" ON storage.objects;
CREATE POLICY "Equipe envia premios" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'energia-premios' AND public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Energia premios autenticado delete" ON storage.objects;
CREATE POLICY "Equipe deleta premios" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'energia-premios' AND public.has_panel_access(auth.uid()));
DROP POLICY IF EXISTS "Energia premios publico leitura" ON storage.objects;
CREATE POLICY "Leitura pública de premios válidos" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'energia-premios' AND name IS NOT NULL);

DROP POLICY IF EXISTS "energia_audio_public_read" ON storage.objects;
CREATE POLICY "Leitura pública de áudios válidos" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'energia-audio' AND name IS NOT NULL);
DROP POLICY IF EXISTS "Public read site-content" ON storage.objects;
CREATE POLICY "Leitura pública de conteúdo válido" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'site-content' AND name IS NOT NULL);
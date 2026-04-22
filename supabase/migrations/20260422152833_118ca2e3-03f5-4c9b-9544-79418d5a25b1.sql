insert into storage.buckets (id, name, public) values ('templates', 'templates', true) on conflict (id) do nothing;

create policy "Public read templates" on storage.objects for select using (bucket_id = 'templates');
create policy "Authenticated upload templates" on storage.objects for insert to authenticated with check (bucket_id = 'templates');
create policy "Authenticated update templates" on storage.objects for update to authenticated using (bucket_id = 'templates');
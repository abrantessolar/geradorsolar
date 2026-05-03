
INSERT INTO storage.buckets (id, name, public) VALUES ('energia-audio', 'energia-audio', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DO $$ BEGIN
  CREATE POLICY "energia_audio_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'energia-audio');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

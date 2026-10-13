CREATE TABLE IF NOT EXISTS public.folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, path)
);
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  local_id text NOT NULL,
  name text NOT NULL DEFAULT '',
  folder text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'doc',
  tags text[] NOT NULL DEFAULT '{}',
  fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  client_updated_at bigint NOT NULL DEFAULT 0,
  UNIQUE (user_id, local_id)
);
CREATE TABLE IF NOT EXISTS public.pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  local_id text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  edit jsonb NOT NULL DEFAULT '{}'::jsonb,
  text text,
  orig_path text,
  src_path text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, local_id)
);
CREATE INDEX IF NOT EXISTS pages_document_idx ON public.pages(document_id, position);
CREATE INDEX IF NOT EXISTS documents_user_updated_idx ON public.documents(user_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS public.share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz,
  password_hash text,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS share_links_doc_idx ON public.share_links(document_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.folders, public.documents, public.pages, public.share_links TO authenticated;
GRANT ALL ON public.folders, public.documents, public.pages, public.share_links TO service_role;

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own folders" ON public.folders FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own documents" ON public.documents FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own pages" ON public.pages FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.user_id = auth.uid())
  );
CREATE POLICY "own share links" ON public.share_links FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.documents d WHERE d.id = document_id AND d.user_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER documents_touch BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER pages_touch BEFORE UPDATE ON public.pages FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "own page files read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'pages' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own page files write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pages' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own page files update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'pages' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own page files delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'pages' AND (storage.foldername(name))[1] = auth.uid()::text);
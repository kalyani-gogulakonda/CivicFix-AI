CREATE TABLE public.complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  location text NOT NULL,
  description text NOT NULL,
  photo_url text,
  language text NOT NULL DEFAULT 'en',
  summary text NOT NULL DEFAULT '',
  missing_info jsonb NOT NULL DEFAULT '[]'::jsonb,
  urgency text NOT NULL DEFAULT 'medium',
  urgency_reason text NOT NULL DEFAULT '',
  photo_observations text NOT NULL DEFAULT '',
  complaint_text text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  is_sample boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT status_chk CHECK (status IN ('draft','ready')),
  CONSTRAINT urgency_chk CHECK (urgency IN ('low','medium','high')),
  CONSTRAINT lang_chk CHECK (language IN ('en','te')),
  CONSTRAINT cat_chk CHECK (category IN ('pothole','garbage','streetlight','water_leakage','other'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.complaints TO anon, authenticated;
GRANT ALL ON public.complaints TO service_role;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public demo read" ON public.complaints FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public demo insert" ON public.complaints FOR INSERT TO anon, authenticated WITH CHECK (is_sample = false);
CREATE POLICY "public demo update" ON public.complaints FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public demo delete" ON public.complaints FOR DELETE TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER complaints_touch BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.complaints (category, location, description, summary, missing_info, urgency, urgency_reason, photo_observations, complaint_text, status, is_sample, created_at)
VALUES ('streetlight', 'Maple Avenue, near Greenfield Park gate (fictional)', 'Streetlight has been out for a week; the path is very dark at night.', 'Broken streetlight on Maple Avenue near the park gate.', '[]', 'medium', 'Dark path at night may pose a safety risk.', 'No photo provided', E'To the Municipal Services Department,\n\nThe streetlight on Maple Avenue near the Greenfield Park gate has not worked for about a week, leaving the path very dark at night. I kindly request that it be inspected and repaired.\n\nSincerely,\n[Your name]', 'ready', true, '2026-10-10T09:00:00Z');
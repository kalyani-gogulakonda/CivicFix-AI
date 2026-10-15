DROP POLICY "public demo update" ON public.complaints;
DROP POLICY "public demo delete" ON public.complaints;
CREATE POLICY "public demo update" ON public.complaints FOR UPDATE TO anon, authenticated USING (is_sample = false) WITH CHECK (is_sample = false);
CREATE POLICY "public demo delete" ON public.complaints FOR DELETE TO anon, authenticated USING (is_sample = false);

CREATE TABLE public.ai_daily_usage (day date PRIMARY KEY, count integer NOT NULL DEFAULT 0);
GRANT ALL ON public.ai_daily_usage TO service_role;
ALTER TABLE public.ai_daily_usage ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.claim_ai_generation(_limit integer DEFAULT 50)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c integer;
BEGIN
  INSERT INTO public.ai_daily_usage(day, count) VALUES ((now() AT TIME ZONE 'utc')::date, 1)
  ON CONFLICT (day) DO UPDATE SET count = ai_daily_usage.count + 1
  WHERE ai_daily_usage.count < LEAST(_limit, 50)
  RETURNING count INTO c;
  RETURN c IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public.claim_ai_generation(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_ai_generation(integer) TO anon, authenticated, service_role;
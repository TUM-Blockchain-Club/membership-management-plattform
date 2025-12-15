CREATE OR REPLACE VIEW public.members AS SELECT * FROM mmp.members;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.members TO anon, authenticated, service_role;

ALTER VIEW public.members OWNER TO postgres;

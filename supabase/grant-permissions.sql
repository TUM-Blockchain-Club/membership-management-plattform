GRANT USAGE ON SCHEMA mmp TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA mmp TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA mmp TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA mmp TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA mmp GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA mmp GRANT ALL ON ROUTINES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA mmp GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

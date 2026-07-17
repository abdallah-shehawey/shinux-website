import { config } from "dotenv";

// Tests run against a real Supabase project (RLS can't be meaningfully
// mocked), so pull the same credentials the app uses from .env.local.
config({ path: ".env.local" });

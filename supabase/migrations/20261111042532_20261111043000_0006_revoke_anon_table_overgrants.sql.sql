/*
# Revoke dangerous anon table grants

## Why
The original schema migration used broad `GRANT ... TO authenticated` statements, but
Supabase also gave the `anon` role full CRUD on every table by default. Since all RLS
policies target `TO authenticated` only (the app requires sign-in), the `anon` role
should have NO direct table access — otherwise anyone with the public anon key can
INSERT, UPDATE, or DELETE rows even though no `anon` policy exists (a table with RLS
enabled and no matching policy for a role denies all rows, but the grants are still
overly broad and violate least-privilege).

## Changes
1. Revoke SELECT, INSERT, UPDATE, DELETE from `anon` on all application tables:
   - game_logs, players, poker_tables, qr_codes, settings, sound_preferences,
     table_sessions, transactions, user_roles
2. `table_game_states` already has no anon grants (service-role only) — no change.
3. The `referral_code_exists` function intentionally stays callable by anon (used on
   the sign-up form before the user has a session).
4. Auth (supabase.auth.*) works via Supabase GoTrue, not table grants, so revoking
   anon table access does not affect sign-up/sign-in.

## Security
- `anon` retains: EXECUTE on `referral_code_exists` only.
- `authenticated` retains: its existing SELECT/INSERT/UPDATE/DELETE grants (unchanged).
- `service_role` retains: ALL on every table (unchanged).
- No data loss: REVOKE only removes privileges, never data.
*/

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.game_logs FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.players FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.poker_tables FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.qr_codes FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.settings FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.sound_preferences FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.table_sessions FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.transactions FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.user_roles FROM anon;

/*
# Revoke dangerous anon table grants

## Why
The original schema migration used broad GRANT ... TO authenticated statements, but
Supabase also gave the anon role full CRUD on every table by default. Since all RLS
policies target TO authenticated only (the app requires sign-in), the anon role
should have NO direct table access.

## Changes
1. Revoke SELECT, INSERT, UPDATE, DELETE from anon on all application tables:
   - game_logs, players, poker_tables, qr_codes, settings, sound_preferences,
     table_sessions, transactions, user_roles
2. table_game_states already has no anon grants (service-role only) - no change.
3. The referral_code_exists function intentionally stays callable by anon (used on
   the sign-up form before the user has a session).
4. Auth works via Supabase GoTrue, not table grants, so this does not affect sign-up/sign-in.

## Security
- anon retains: EXECUTE on referral_code_exists only.
- authenticated retains: its existing grants (unchanged).
- service_role retains: ALL on every table (unchanged).
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

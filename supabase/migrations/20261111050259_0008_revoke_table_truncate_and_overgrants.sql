/*
# Remove TRUNCATE, REFERENCES and TRIGGER privileges from browser roles

## Why
Row level security only filters SELECT, INSERT, UPDATE and DELETE. TRUNCATE is not
filtered by any policy, so any role holding it can empty a whole table. Supabase's
default grants gave the anon and authenticated roles these extra privileges on every
public table, and migration 0006 did not remove them.

## Changes
1. anon: all remaining table privileges are revoked on every public table. The browser
   never reads tables as anon; the only anon-callable function is referral_code_exists.
2. authenticated: TRUNCATE, REFERENCES and TRIGGER are revoked on every public table.
   SELECT, INSERT, UPDATE and DELETE stay, so existing row policies keep working.
3. service_role is unchanged.

## Security
- No data is deleted or altered; only privileges are removed.
- Idempotent: revoking a privilege that is already absent is a no-op.
*/

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM authenticated;

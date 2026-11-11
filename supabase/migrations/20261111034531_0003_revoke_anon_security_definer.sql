/*
# Lock down internal helper access

1. Modified Functions
- current_player_id(): removed from public and anonymous roles; signed-in players keep access.
- has_role(uuid, app_role): removed from public and anonymous roles; signed-in players keep access.

2. Security
- Anonymous visitors can no longer call these helpers through the Data API.
- Row level security policies that use them still work for signed-in users.

3. Notes
- Idempotent: REVOKE and GRANT can be re-run safely.
*/

REVOKE EXECUTE ON FUNCTION public.current_player_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_player_id() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

/*
# Speed up row policies and index foreign keys

1. Modified Policies (same names, same access rules)
- user_roles, players, transactions, table_sessions, game_logs, sound_preferences:
  the signed-in user id is now read once per query with (select auth.uid()) instead of once per row.

2. New Indexes
- game_logs(player_id), table_game_states(table_id), transactions(qr_code_id):
  cover foreign keys so deletes and joins on these links stay fast.

3. Security
- No access is granted or removed. Each policy keeps its original rule.

4. Notes
- Every statement is idempotent: policies are dropped with IF EXISTS before being recreated, and indexes use IF NOT EXISTS.
*/

DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()) OR public.has_role((select auth.uid()), 'admin'));

DROP POLICY IF EXISTS "Players read own row, admins read all" ON public.players;
CREATE POLICY "Players read own row, admins read all" ON public.players FOR SELECT TO authenticated
  USING (auth_id = (select auth.uid()) OR public.has_role((select auth.uid()), 'admin'));

DROP POLICY IF EXISTS "Players read own requests, admins read all" ON public.transactions;
CREATE POLICY "Players read own requests, admins read all" ON public.transactions FOR SELECT TO authenticated
  USING (player_id = public.current_player_id() OR public.has_role((select auth.uid()), 'admin'));

DROP POLICY IF EXISTS "Players read own sessions, admins read all" ON public.table_sessions;
CREATE POLICY "Players read own sessions, admins read all" ON public.table_sessions FOR SELECT TO authenticated
  USING (player_id = public.current_player_id() OR public.has_role((select auth.uid()), 'admin'));

DROP POLICY IF EXISTS "Admins read logs" ON public.game_logs;
CREATE POLICY "Admins read logs" ON public.game_logs FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'));

DROP POLICY IF EXISTS "Players read their own sound settings" ON public.sound_preferences;
CREATE POLICY "Players read their own sound settings" ON public.sound_preferences
  FOR SELECT TO authenticated USING (user_id = (select auth.uid()));
DROP POLICY IF EXISTS "Players create their own sound settings" ON public.sound_preferences;
CREATE POLICY "Players create their own sound settings" ON public.sound_preferences
  FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
DROP POLICY IF EXISTS "Players update their own sound settings" ON public.sound_preferences;
CREATE POLICY "Players update their own sound settings" ON public.sound_preferences
  FOR UPDATE TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));

CREATE INDEX IF NOT EXISTS game_logs_player_id_idx ON public.game_logs (player_id);
CREATE INDEX IF NOT EXISTS table_game_states_table_id_idx ON public.table_game_states (table_id);
CREATE INDEX IF NOT EXISTS transactions_qr_code_id_idx ON public.transactions (qr_code_id);

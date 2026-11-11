/*
# Master Poker core schema

1. New Tables
- user_roles (admin/moderator/user roles per auth account)
- players (one poker player per signed-in account: balance, status, avatar, referral code)
- qr_codes (owner payment QR details shown on the recharge screen)
- transactions (cash-in and cash-out requests, welcome bonuses)
- table_sessions (cash table buy-ins and cash-outs)
- game_logs (system and admin activity log)
- settings (house rake, bot aggression, buy-in limits, welcome bonus)
- poker_tables (cash tables and their blinds and buy-in ranges)
- table_game_states (server-held game state, service role only)

2. Functions
- Role check, referral code generation, new-account setup, admin actions, server-only buy-in and cash-out.

3. Security
- Row level security is enabled on every table.
- Browser roles can read only their own rows; admins can read all.
- Money changes happen only through ownership-checked database functions.
- Server-only functions are not callable by browser roles.
- Table game states are reachable only by the service role.

4. Notes
- Seeds default settings, twelve cash tables and one QR code.
- Storage policies for avatars and payment proofs are included.
*/

-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Players (one per signed-in account)
CREATE TABLE public.players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id uuid UNIQUE,
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 24),
  balance numeric(12,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'frozen')),
  avatar_url text,
  avatar_emoji text NOT NULL DEFAULT '🙂',
  referral_code text NOT NULL UNIQUE CHECK (referral_code ~ '^[A-Z0-9]{1,8}$'),
  referred_by uuid REFERENCES public.players(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX players_referred_by_idx ON public.players (referred_by);
GRANT SELECT ON public.players TO authenticated;
GRANT ALL ON public.players TO service_role;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_player_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.players WHERE auth_id = auth.uid()
$$;

CREATE POLICY "Players read own row, admins read all" ON public.players FOR SELECT TO authenticated
  USING (auth_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Payment QR codes
CREATE TABLE public.qr_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  method text NOT NULL CHECK (method IN ('qrph', 'gcash', 'maya', 'bank')),
  account_name text NOT NULL,
  account_number text NOT NULL,
  qr_payload text NOT NULL DEFAULT '',
  image_data text,
  is_active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.qr_codes TO authenticated;
GRANT ALL ON public.qr_codes TO service_role;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read QR codes" ON public.qr_codes FOR SELECT TO authenticated USING (true);

-- Wallet requests and bonuses
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('cash_in', 'cash_out', 'bonus')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  method text NOT NULL CHECK (method IN ('qrph', 'gcash', 'maya', 'bank', 'bonus')),
  account_details text NOT NULL CHECK (char_length(account_details) BETWEEN 1 AND 60),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note text,
  proof_url text,
  qr_code_id uuid REFERENCES public.qr_codes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX transactions_status_created_idx ON public.transactions (status, created_at DESC);
CREATE INDEX transactions_player_idx ON public.transactions (player_id);
GRANT SELECT ON public.transactions TO authenticated;
GRANT INSERT (player_id, type, amount, method, account_details, proof_url, qr_code_id) ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players read own requests, admins read all" ON public.transactions FOR SELECT TO authenticated
  USING (player_id = public.current_player_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Active players create own requests" ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (
    player_id = public.current_player_id()
    AND type IN ('cash_in', 'cash_out')
    AND method <> 'bonus'
    AND status = 'pending'
    AND admin_note IS NULL
    AND resolved_at IS NULL
    AND (type <> 'cash_in' OR proof_url IS NOT NULL)
    AND EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_id AND p.status = 'active')
  );

-- Table sessions
CREATE TABLE public.table_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  buy_in numeric(12,2) NOT NULL CHECK (buy_in > 0),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  cashed_out numeric(12,2),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);
CREATE INDEX table_sessions_player_idx ON public.table_sessions (player_id, status);
GRANT SELECT ON public.table_sessions TO authenticated;
GRANT ALL ON public.table_sessions TO service_role;
ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players read own sessions, admins read all" ON public.table_sessions FOR SELECT TO authenticated
  USING (player_id = public.current_player_id() OR public.has_role(auth.uid(), 'admin'));

-- System logs
CREATE TABLE public.game_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  level text NOT NULL CHECK (level IN ('info', 'warn', 'error', 'admin')),
  message text NOT NULL,
  player_id uuid REFERENCES public.players(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX game_logs_created_idx ON public.game_logs (created_at DESC);
GRANT SELECT ON public.game_logs TO authenticated;
GRANT ALL ON public.game_logs TO service_role;
ALTER TABLE public.game_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read logs" ON public.game_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Settings
CREATE TABLE public.settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read settings" ON public.settings FOR SELECT TO authenticated USING (true);

-- Poker tables. bot_level is fixed per table by the admin; players cannot pick it.
CREATE TABLE public.poker_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  min_bet numeric(12,2) NOT NULL CHECK (min_bet > 0),
  small_blind numeric(12,2) NOT NULL CHECK (small_blind > 0),
  big_blind numeric(12,2) NOT NULL CHECK (big_blind > 0),
  min_buy_in numeric(12,2) NOT NULL CHECK (min_buy_in > 0),
  max_buy_in numeric(12,2) NOT NULL CHECK (max_buy_in >= min_buy_in),
  display_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  bot_level text NOT NULL DEFAULT 'normal' CHECK (bot_level IN ('easy', 'normal', 'hard')),
  rake_percent numeric(5,2) CHECK (rake_percent IS NULL OR (rake_percent >= 0 AND rake_percent <= 20)),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.poker_tables TO authenticated;
GRANT ALL ON public.poker_tables TO service_role;
ALTER TABLE public.poker_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read tables" ON public.poker_tables FOR SELECT TO authenticated USING (true);

-- Server-held game state for cash tables (service role only).
CREATE TABLE public.table_game_states (
  session_id uuid PRIMARY KEY REFERENCES public.table_sessions(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  table_id uuid REFERENCES public.poker_tables(id) ON DELETE SET NULL,
  bot_level text NOT NULL DEFAULT 'normal' CHECK (bot_level IN ('easy', 'normal', 'hard')),
  state jsonb NOT NULL,
  version integer NOT NULL DEFAULT 0,
  next_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.table_game_states FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.table_game_states TO service_role;
ALTER TABLE public.table_game_states ENABLE ROW LEVEL SECURITY;
CREATE INDEX table_game_states_player_idx ON public.table_game_states (player_id);

-- Seed data
INSERT INTO public.settings (key, value) VALUES
  ('rake_percent', '5'),
  ('bot_aggression', '"balanced"'),
  ('min_buy_in', '500'),
  ('max_buy_in', '20000'),
  ('welcome_bonus', '20');

INSERT INTO public.poker_tables (name, min_bet, small_blind, big_blind, min_buy_in, max_buy_in, display_order) VALUES
  ('Beginner ₱1', 1, 0.50, 1, 20, 200, 1),
  ('Rookie ₱2', 2, 1, 2, 40, 400, 2),
  ('Rookie ₱3', 3, 1.5, 3, 60, 600, 3),
  ('Casual ₱5', 5, 2.5, 5, 100, 1000, 4),
  ('Casual ₱10', 10, 5, 10, 200, 2000, 5),
  ('Pro ₱20', 20, 10, 20, 400, 4000, 6),
  ('Pro ₱30', 30, 15, 30, 600, 6000, 7),
  ('Pro ₱40', 40, 20, 40, 800, 8000, 8),
  ('High Roller ₱50', 50, 25, 50, 1000, 10000, 9),
  ('High Roller ₱100', 100, 50, 100, 2000, 20000, 10),
  ('VIP ₱200', 200, 100, 200, 4000, 40000, 11),
  ('Whale ₱1000', 1000, 500, 1000, 20000, 200000, 12);

INSERT INTO public.qr_codes (label, method, account_name, account_number, display_order) VALUES
  ('Scan to Pay', 'qrph', 'Master Poker', 'Any bank, GCash or Maya app', 1);

-- Internal helpers
CREATE OR REPLACE FUNCTION public.log_event(p_level text, p_message text, p_player uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.game_logs (level, message, player_id) VALUES (p_level, p_message, p_player);
$$;
REVOKE EXECUTE ON FUNCTION public.log_event(text, text, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.assert_admin()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can do this';
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.assert_admin() FROM PUBLIC, anon, authenticated;

-- Referral codes: 8 random uppercase letters and digits
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..8 LOOP
      code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    -- Mix of letters and numbers
    IF code ~ '[A-Z]' AND code ~ '[0-9]' AND NOT EXISTS (SELECT 1 FROM public.players WHERE referral_code = code) THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM PUBLIC, anon, authenticated;

-- Public check used by the sign-up form
CREATE OR REPLACE FUNCTION public.referral_code_exists(p_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.players WHERE referral_code = upper(trim(coalesce(p_code, ''))))
$$;
REVOKE EXECUTE ON FUNCTION public.referral_code_exists(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.referral_code_exists(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.my_referral_count()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int FROM public.players WHERE referred_by = public.current_player_id()
$$;
REVOKE EXECUTE ON FUNCTION public.my_referral_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_referral_count() TO authenticated;

-- New account -> player row, referral link, welcome bonus, owner admin role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_name text;
  v_ref_code text;
  v_referrer uuid;
  v_bonus numeric;
  v_player uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.players WHERE auth_id = NEW.id) THEN
    RETURN NEW;
  END IF;
  v_name := left(trim(coalesce(
    nullif(trim(NEW.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(NEW.raw_user_meta_data ->> 'full_name'), ''),
    split_part(coalesce(NEW.email, ''), '@', 1)
  )), 24);
  IF char_length(v_name) < 2 THEN
    v_name := 'Player';
  END IF;

  v_ref_code := upper(trim(coalesce(NEW.raw_user_meta_data ->> 'referral_code', '')));
  IF v_ref_code <> '' THEN
    SELECT id INTO v_referrer FROM public.players WHERE referral_code = v_ref_code;
  END IF;

  SELECT coalesce((value #>> '{}')::numeric, 20) INTO v_bonus FROM public.settings WHERE key = 'welcome_bonus';
  v_bonus := coalesce(v_bonus, 20);

  INSERT INTO public.players (auth_id, display_name, referral_code, referred_by, balance)
  VALUES (NEW.id, v_name, public.generate_referral_code(), v_referrer, greatest(v_bonus, 0))
  RETURNING id INTO v_player;

  IF v_bonus > 0 THEN
    INSERT INTO public.transactions (player_id, type, amount, method, account_details, status, resolved_at)
    VALUES (v_player, 'bonus', v_bonus, 'bonus', 'Welcome bonus', 'approved', now());
  END IF;

  IF lower(coalesce(NEW.email, '')) = 'tahariabdulaziz@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;

  PERFORM public.log_event('info',
    format('%s joined%s', v_name, CASE WHEN v_referrer IS NOT NULL THEN ' with referral code ' || v_ref_code ELSE '' END),
    v_player);
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Admin actions
CREATE OR REPLACE FUNCTION public.resolve_transaction(p_id uuid, p_decision text, p_note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  tx public.transactions%ROWTYPE;
  pl public.players%ROWTYPE;
BEGIN
  PERFORM public.assert_admin();
  IF p_decision NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Invalid decision';
  END IF;
  SELECT * INTO tx FROM public.transactions WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction not found'; END IF;
  IF tx.status <> 'pending' THEN RAISE EXCEPTION 'Transaction was already resolved'; END IF;
  SELECT * INTO pl FROM public.players WHERE id = tx.player_id FOR UPDATE;

  IF p_decision = 'approve' THEN
    IF tx.type = 'cash_in' THEN
      UPDATE public.players SET balance = balance + tx.amount WHERE id = pl.id;
    ELSIF tx.type = 'cash_out' THEN
      IF pl.balance < tx.amount THEN
        RAISE EXCEPTION 'Player balance is lower than the requested cash-out';
      END IF;
      UPDATE public.players SET balance = balance - tx.amount WHERE id = pl.id;
    END IF;
    UPDATE public.transactions SET status = 'approved', resolved_at = now(), admin_note = p_note WHERE id = p_id;
  ELSE
    UPDATE public.transactions SET status = 'rejected', resolved_at = now(), admin_note = p_note WHERE id = p_id;
  END IF;

  PERFORM public.log_event('admin',
    format('%s %s request of PHP %s for %s',
      CASE WHEN p_decision = 'approve' THEN 'Approved' ELSE 'Rejected' END,
      tx.type, tx.amount, pl.display_name),
    pl.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_balance(p_player uuid, p_balance numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pl public.players%ROWTYPE;
BEGIN
  PERFORM public.assert_admin();
  IF p_balance IS NULL OR p_balance < 0 THEN RAISE EXCEPTION 'Balance must be zero or more'; END IF;
  UPDATE public.players SET balance = p_balance WHERE id = p_player RETURNING * INTO pl;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player not found'; END IF;
  PERFORM public.log_event('admin', format('Balance manually set to PHP %s for %s', p_balance, pl.display_name), pl.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_player_status(p_player uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pl public.players%ROWTYPE;
BEGIN
  PERFORM public.assert_admin();
  IF p_status NOT IN ('active', 'frozen') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  UPDATE public.players SET status = p_status WHERE id = p_player RETURNING * INTO pl;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player not found'; END IF;
  PERFORM public.log_event('admin', format('Account for %s set to %s', pl.display_name, p_status), pl.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_setting(p_key text, p_value jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  other_key text;
  other_value numeric;
BEGIN
  PERFORM public.assert_admin();
  IF p_key = 'rake_percent' THEN
    IF (p_value #>> '{}')::numeric NOT BETWEEN 0 AND 20 THEN
      RAISE EXCEPTION 'Rake must be between 0 and 20 percent';
    END IF;
  ELSIF p_key = 'bot_aggression' THEN
    IF (p_value #>> '{}') NOT IN ('passive', 'balanced', 'aggressive') THEN
      RAISE EXCEPTION 'Invalid bot aggression';
    END IF;
  ELSIF p_key = 'welcome_bonus' THEN
    IF (p_value #>> '{}')::numeric NOT BETWEEN 0 AND 10000 THEN
      RAISE EXCEPTION 'Welcome bonus must be between 0 and 10000';
    END IF;
  ELSIF p_key IN ('min_buy_in', 'max_buy_in') THEN
    IF (p_value #>> '{}')::numeric < 100 THEN
      RAISE EXCEPTION 'Buy-in limits must be at least 100';
    END IF;
    other_key := CASE WHEN p_key = 'min_buy_in' THEN 'max_buy_in' ELSE 'min_buy_in' END;
    SELECT (value #>> '{}')::numeric INTO other_value FROM public.settings WHERE key = other_key;
    IF p_key = 'min_buy_in' AND (p_value #>> '{}')::numeric > other_value THEN
      RAISE EXCEPTION 'Minimum buy-in cannot be above the maximum';
    END IF;
    IF p_key = 'max_buy_in' AND (p_value #>> '{}')::numeric < other_value THEN
      RAISE EXCEPTION 'Maximum buy-in cannot be below the minimum';
    END IF;
  ELSE
    RAISE EXCEPTION 'Unknown setting';
  END IF;
  INSERT INTO public.settings (key, value, updated_at) VALUES (p_key, p_value, now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  PERFORM public.log_event('admin', format('Setting %s changed to %s', p_key, p_value #>> '{}'), NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_qr_image(p_id uuid, p_image text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE qr public.qr_codes%ROWTYPE;
BEGIN
  PERFORM public.assert_admin();
  IF p_image IS NOT NULL AND (
    p_image !~ '^data:image/(png|jpeg|webp);base64,' OR char_length(p_image) > 500000
  ) THEN
    RAISE EXCEPTION 'QR image must be a PNG, JPEG or WebP file under 500 KB';
  END IF;
  UPDATE public.qr_codes SET image_data = p_image WHERE id = p_id RETURNING * INTO qr;
  IF NOT FOUND THEN RAISE EXCEPTION 'QR code not found'; END IF;
  PERFORM public.log_event('admin',
    format('QR image for %s %s', qr.label, CASE WHEN p_image IS NULL THEN 'removed' ELSE 'updated' END), NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_qr_details(p_id uuid, p_label text, p_account_name text, p_account_number text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE qr public.qr_codes%ROWTYPE;
BEGIN
  PERFORM public.assert_admin();
  IF char_length(trim(coalesce(p_label, ''))) NOT BETWEEN 1 AND 40 THEN RAISE EXCEPTION 'Label must be 1 to 40 characters'; END IF;
  IF char_length(trim(coalesce(p_account_name, ''))) NOT BETWEEN 1 AND 60 THEN RAISE EXCEPTION 'Account name must be 1 to 60 characters'; END IF;
  IF char_length(trim(coalesce(p_account_number, ''))) NOT BETWEEN 1 AND 60 THEN RAISE EXCEPTION 'Account number must be 1 to 60 characters'; END IF;
  UPDATE public.qr_codes SET label = trim(p_label), account_name = trim(p_account_name), account_number = trim(p_account_number)
  WHERE id = p_id RETURNING * INTO qr;
  IF NOT FOUND THEN RAISE EXCEPTION 'QR code not found'; END IF;
  PERFORM public.log_event('admin', format('QR details for %s updated', qr.label), NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_table_rules(p_table_id uuid, p_bot_level text, p_rake numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tbl public.poker_tables%ROWTYPE;
BEGIN
  PERFORM public.assert_admin();
  IF p_bot_level IS NULL OR p_bot_level NOT IN ('easy', 'normal', 'hard') THEN
    RAISE EXCEPTION 'Pick a bot skill level';
  END IF;
  IF p_rake IS NOT NULL AND (p_rake < 0 OR p_rake > 20) THEN RAISE EXCEPTION 'Rake must be between 0 and 20 percent'; END IF;
  UPDATE public.poker_tables SET bot_level = p_bot_level, rake_percent = p_rake WHERE id = p_table_id RETURNING * INTO tbl;
  IF NOT FOUND THEN RAISE EXCEPTION 'Table not found'; END IF;
  PERFORM public.log_event('admin', format('Rules for %s: bots %s, rake %s', tbl.name, p_bot_level, coalesce(p_rake::text, 'house default')), NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_profile(p_player uuid, p_display_name text DEFAULT NULL, p_avatar_url text DEFAULT NULL, p_avatar_emoji text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pl public.players%ROWTYPE;
BEGIN
  SELECT * INTO pl FROM public.players WHERE id = p_player FOR UPDATE;
  IF NOT FOUND OR pl.auth_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Player not found';
  END IF;
  IF p_display_name IS NOT NULL THEN
    IF char_length(p_display_name) < 2 OR char_length(p_display_name) > 24 THEN
      RAISE EXCEPTION 'Display name must be between 2 and 24 characters';
    END IF;
    UPDATE public.players SET display_name = p_display_name WHERE id = p_player;
    PERFORM public.log_event('info', format('%s changed their display name', pl.display_name), p_player);
  END IF;
  IF p_avatar_url IS NOT NULL THEN
    IF char_length(p_avatar_url) > 2000 THEN RAISE EXCEPTION 'Avatar link is too long'; END IF;
    UPDATE public.players SET avatar_url = nullif(p_avatar_url, '') WHERE id = p_player;
  END IF;
  IF p_avatar_emoji IS NOT NULL THEN
    IF char_length(p_avatar_emoji) > 16 THEN RAISE EXCEPTION 'Invalid avatar emoji'; END IF;
    UPDATE public.players SET avatar_emoji = p_avatar_emoji WHERE id = p_player;
  END IF;
END;
$$;

-- Server-only buy-in / cash-out (called by the app server with the service role)
CREATE OR REPLACE FUNCTION public.server_buy_in(p_auth uuid, p_amount numeric, p_table_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pl public.players%ROWTYPE;
  tbl public.poker_tables%ROWTYPE;
  session_id uuid;
BEGIN
  SELECT * INTO pl FROM public.players WHERE auth_id = p_auth FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player not found'; END IF;
  IF pl.status <> 'active' THEN RAISE EXCEPTION 'This account is frozen'; END IF;
  IF EXISTS (SELECT 1 FROM public.table_sessions WHERE player_id = pl.id AND status = 'open') THEN
    RAISE EXCEPTION 'You are already seated at a table';
  END IF;
  SELECT * INTO tbl FROM public.poker_tables WHERE id = p_table_id AND is_active = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Table not found or not active'; END IF;
  IF p_amount IS NULL OR p_amount < tbl.min_buy_in OR p_amount > tbl.max_buy_in THEN
    RAISE EXCEPTION 'Buy-in must be between PHP % and PHP %', tbl.min_buy_in, tbl.max_buy_in;
  END IF;
  IF pl.balance < p_amount THEN RAISE EXCEPTION 'Not enough balance for this buy-in'; END IF;

  UPDATE public.players SET balance = balance - p_amount WHERE id = pl.id;
  INSERT INTO public.table_sessions (player_id, buy_in) VALUES (pl.id, p_amount) RETURNING id INTO session_id;
  PERFORM public.log_event('info', format('%s bought in for PHP %s at %s', pl.display_name, p_amount, tbl.name), pl.id);
  RETURN session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.server_cash_out(p_session uuid, p_amount numeric)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ses public.table_sessions%ROWTYPE;
  pl public.players%ROWTYPE;
BEGIN
  IF p_amount IS NULL OR p_amount < 0 THEN RAISE EXCEPTION 'Invalid cash-out amount'; END IF;
  SELECT * INTO ses FROM public.table_sessions WHERE id = p_session FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Table session not found'; END IF;
  IF ses.status <> 'open' THEN RAISE EXCEPTION 'Table session is already closed'; END IF;

  UPDATE public.players SET balance = balance + p_amount WHERE id = ses.player_id RETURNING * INTO pl;
  UPDATE public.table_sessions SET status = 'closed', cashed_out = p_amount, closed_at = now() WHERE id = p_session;
  DELETE FROM public.table_game_states WHERE session_id = p_session;
  PERFORM public.log_event('info',
    format('%s left the table with PHP %s (bought in for PHP %s)', pl.display_name, p_amount, ses.buy_in), pl.id);
  RETURN pl.balance;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.server_buy_in(uuid, numeric, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.server_cash_out(uuid, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.server_buy_in(uuid, numeric, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.server_cash_out(uuid, numeric) TO service_role;

REVOKE EXECUTE ON FUNCTION public.resolve_transaction(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_balance(uuid, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_player_status(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_setting(text, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_qr_image(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_qr_details(uuid, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_update_table_rules(uuid, text, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_profile(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_transaction(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_balance(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_player_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_setting(text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_qr_image(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_qr_details(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_table_rules(uuid, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_profile(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Storage access: each user's own folder; admins can read payment proofs
CREATE POLICY "avatar_owner_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "avatar_owner_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatar_owner_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatar_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "proof_owner_or_admin_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "proof_owner_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "proof_owner_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poker_tables;

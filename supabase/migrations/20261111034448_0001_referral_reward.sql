/*
# Referral rewards

1. Modified Tables
- transactions: allows a new 'referral' type and a referred_player_id link to the invited player.

2. Security
- A unique index guarantees one referral reward per invited player.
- Admin setting functions gain referral_reward and referral_min_recharge settings.
- Referral earnings function is callable by signed-in players only.

3. Notes
- Referral rewards are paid inside resolve_transaction when a referred player's first approved recharge meets the minimum.
*/

ALTER TABLE public.transactions DROP CONSTRAINT transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check
  CHECK (type = ANY (ARRAY['cash_in'::text, 'cash_out'::text, 'bonus'::text, 'referral'::text]));

ALTER TABLE public.transactions ADD COLUMN referred_player_id uuid REFERENCES public.players(id);

-- One referral reward per referred player, ever.
CREATE UNIQUE INDEX transactions_one_referral_reward
  ON public.transactions (referred_player_id) WHERE type = 'referral';

CREATE OR REPLACE FUNCTION public.admin_set_setting(p_key text, p_value jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  ELSIF p_key = 'referral_reward' THEN
    IF (p_value #>> '{}')::numeric NOT BETWEEN 0 AND 10000 THEN
      RAISE EXCEPTION 'Referral reward must be between 0 and 10000';
    END IF;
  ELSIF p_key = 'referral_min_recharge' THEN
    IF (p_value #>> '{}')::numeric NOT BETWEEN 1 AND 1000000 THEN
      RAISE EXCEPTION 'Minimum recharge must be between 1 and 1000000';
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
$function$;

CREATE OR REPLACE FUNCTION public.resolve_transaction(p_id uuid, p_decision text, p_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  tx public.transactions%ROWTYPE;
  pl public.players%ROWTYPE;
  inviter public.players%ROWTYPE;
  v_min numeric;
  v_reward numeric;
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

  -- Referral reward: paid once to the inviter on the referred player's first approved recharge at or above the minimum.
  IF p_decision = 'approve' AND tx.type = 'cash_in' AND pl.referred_by IS NOT NULL AND pl.referred_by <> pl.id THEN
    SELECT coalesce((value #>> '{}')::numeric, 100) INTO v_min FROM public.settings WHERE key = 'referral_min_recharge';
    v_min := coalesce(v_min, 100);
    SELECT coalesce((value #>> '{}')::numeric, 20) INTO v_reward FROM public.settings WHERE key = 'referral_reward';
    v_reward := coalesce(v_reward, 20);
    IF v_reward > 0 AND tx.amount >= v_min
       AND NOT EXISTS (SELECT 1 FROM public.transactions WHERE type = 'referral' AND referred_player_id = pl.id) THEN
      UPDATE public.players SET balance = balance + v_reward WHERE id = pl.referred_by RETURNING * INTO inviter;
      IF FOUND THEN
        INSERT INTO public.transactions (player_id, type, amount, method, account_details, status, resolved_at, referred_player_id)
        VALUES (inviter.id, 'referral', v_reward, 'bonus', left('Referral reward: ' || pl.display_name, 60), 'approved', now(), pl.id);
        PERFORM public.log_event('info',
          format('%s earned a PHP %s referral reward from %s''s first recharge', inviter.display_name, v_reward, pl.display_name),
          inviter.id);
      END IF;
    END IF;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.my_referral_earnings()
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT coalesce(sum(amount), 0) FROM public.transactions
  WHERE player_id = public.current_player_id() AND type = 'referral' AND status = 'approved'
$function$;

REVOKE ALL ON FUNCTION public.my_referral_earnings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_referral_earnings() TO authenticated;

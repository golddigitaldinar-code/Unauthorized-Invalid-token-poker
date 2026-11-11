/*
# Allow the admin win-rate setting

1. Modified Functions
- admin_set_setting(): now accepts the 'player_win_rate' key, used by the admin Table settings slider.
  - The value must be a number from 0 to 100.
  - All other keys keep their existing rules.

2. Security
- The function still runs only for admins (assert_admin) and is not callable by anonymous visitors.

3. Notes
- Idempotent: CREATE OR REPLACE re-applies the same definition.
*/

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
  ELSIF p_key = 'player_win_rate' THEN
    IF (p_value #>> '{}')::numeric NOT BETWEEN 0 AND 100 THEN
      RAISE EXCEPTION 'Win rate must be between 0 and 100';
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

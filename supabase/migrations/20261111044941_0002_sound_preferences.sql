/*
# Sound preferences

1. New Tables
- sound_preferences: one row per signed-in player with mute and volume settings (card, chip, table), each 0-100.

2. Security
- Row level security is enabled.
- Players can read, create and update only their own row.
*/

CREATE TABLE IF NOT EXISTS public.sound_preferences (
  user_id uuid PRIMARY KEY,
  muted boolean NOT NULL DEFAULT false,
  card_volume smallint NOT NULL DEFAULT 80 CHECK (card_volume BETWEEN 0 AND 100),
  chip_volume smallint NOT NULL DEFAULT 80 CHECK (chip_volume BETWEEN 0 AND 100),
  table_volume smallint NOT NULL DEFAULT 80 CHECK (table_volume BETWEEN 0 AND 100),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.sound_preferences TO authenticated;
GRANT ALL ON public.sound_preferences TO service_role;

ALTER TABLE public.sound_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Players read their own sound settings" ON public.sound_preferences;
CREATE POLICY "Players read their own sound settings" ON public.sound_preferences
  FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Players create their own sound settings" ON public.sound_preferences;
CREATE POLICY "Players create their own sound settings" ON public.sound_preferences
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Players update their own sound settings" ON public.sound_preferences;
CREATE POLICY "Players update their own sound settings" ON public.sound_preferences
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

# Project memory

## Product intent & audience

- Web app with Supabase backend; requires user authentication (sign-in) to access data.
- Has a referral-code system used during signup (checks if a referral code exists before registration).
- Game-related functionality (tables include `table_game_states`).
- Deployed on Netlify.

## Brand personality & voice

- Error/fallback messaging is friendly and plain: "This page didn't load. Something went wrong on our end. You can try refreshing or head back home."
- CTA labels: "Try again", "Go home".

## Visual design & UX direction

- Has a dedicated error/fallback screen with two actions: retry and go home.
- App has a "home" route as the primary navigation fallback.

## Decisions, constraints & rationale

- **Env var naming:** Supabase client requires `VITE_SUPABASE_PUBLISHABLE_KEY` (newer Supabase naming), NOT `VITE_SUPABASE_ANON_KEY`. The Netlify build script explicitly validates this variable and fails if missing. This was the root cause of the blank-page deployment error.
- **Security posture:** All RLS policies target `TO authenticated` only. The `anon` role has zero direct table CRUD access (revoked from all tables). Only signed-in users and the server can read/write.
- **Exception:** `referral_code_exists` is a dedicated database function that intentionally allows `anon` access, because it's called on the signup form before the user is authenticated.
- Both standard Vite build and Netlify-preset build must pass with zero errors.
- Netlify environment variables must include `VITE_SUPABASE_PUBLISHABLE_KEY` (same value as the anon key).

## Open questions & assumptions

- Assumes the project may be distributed/restored from a zip archive (was reset and re-extracted during troubleshooting).
- Supabase URL and publishable key values live in `.env`; Netlify env vars must be configured separately and manually.
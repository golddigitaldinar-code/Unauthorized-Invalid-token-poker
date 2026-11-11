<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Signed-in pages live under `src/routes/_authenticated/` (client-only gate redirecting to `/auth`); `/`, `/auth` and `/reset-password` stay public. Why: the session lives in browser storage.
- Admin access is the `admin` row in `user_roles`, checked inside every admin database function via `has_role`. Why: never trust a client-side flag or shared password.
- Balance, buy-in, cash-out and approval changes only happen through ownership-checked database functions; browser roles have SELECT plus column-limited INSERT on wallet requests only. Why: players must not edit money directly.
- Cash tables are server-authoritative: `src/lib/table-game.functions.ts` verifies the signed-in player, then uses the service-role client (loaded inside handlers) to run the poker engine against `table_game_states` and the service-only `server_buy_in`/`server_cash_out`, filtering every row by that player; it returns a redacted view (`src/poker/session.ts`). Why: chip counts and cash-outs must never come from browser state, and no extra game key is needed on Lovable Cloud.
- Bot skill is a single admin-set `poker_tables.bot_level`; players never choose it. Why: players must not pick an easier win rate.
- New-account side effects (player row, referral code, referral link, welcome bonus, owner admin role) live in the `handle_new_user` trigger; amounts come from the `settings` table. Why: they must happen once, server-side, even if the browser closes.
- Referral rewards are paid inside `resolve_transaction` when a referred player's cash-in is approved; amount and minimum come from `settings`, and a unique index on `transactions.referred_player_id` (type `referral`) guarantees one payout per invited player. Why: the payout must be atomic with the approval and can never double-pay.
- Cash-in requests require an uploaded proof (RLS insert check); the payment QR image is the `qr_codes` row, falling back to the bundled owner QR asset. Why: admins approve recharges against a receipt.
- The poker engine (`src/poker/`) is shared by server and browser (free-play tournaments stay in the browser); satisfy strict TS flags with non-null assertions rather than changing game logic. Why: keep behavior identical to the original app.
- Product analytics use `window.__lovableEvents?.track?.('project.*')` at the success point of each flow, registered in `.lovable/events.json`. Why: the built-in pipeline needs no SDK.
- Embeds from `transactions` to `players` must name the FK (`players!transactions_player_id_fkey`). Why: `referred_player_id` is a second link to players, and an unnamed embed fails as ambiguous.
- Game sounds are synthesised in `src/lib/sounds.ts` (Web Audio, no audio files); cash-table sounds come from the pure state diff `src/poker/sound-events.ts`, played by `useTableSounds`. Why: server updates can bundle several moves, and a pure diff is testable.
- Netlify (Git and drag-and-drop) is a static site: `netlify.toml` runs `npm run build:netlify-drop`, whose `scripts/netlify-drop.mjs` renders a client-only `dist/index.html`, deletes the Netlify server function, and writes `_redirects` forwarding `/__l5e/*` and `/_serverFn/*` to the published Lovable app in `scripts/netlify-assets.mjs`. Why: only Lovable hosting has the game server key and Lovable image paths; server-function IDs are identical across builds.
- `src/start.ts` CSRF also accepts `*.netlify.app` origins. Why: Netlify forwards game requests to the Lovable app, and a proxy may drop the same-origin marker.
- AI player names are generated per seat by `src/poker/bot-names.ts`; the photo is tracked by `Seat.photoKey`, and AI seats keep the robot icon. Why: names stay unique per table while photos survive rebuilds, and players can always tell AI from people.

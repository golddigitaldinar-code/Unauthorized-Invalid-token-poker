/*
# Storage buckets for avatars and payment proofs

1. New Storage Buckets
- avatars: profile pictures, private (accessed through signed links only).
- payment-proofs: screenshots of recharge payments, private.

2. Security
- Both buckets are private; access is governed by the storage policies created in the core schema migration.

3. Notes
- Idempotent: rows are inserted only when missing.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', false), ('payment-proofs', 'payment-proofs', false)
ON CONFLICT (id) DO NOTHING;


-- Fix: add missing identity record for the test user
INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
)
SELECT
  id, id,
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
  'email', id::text, now(), now(), now()
FROM auth.users
WHERE email = 'onboarding-test@test.com';

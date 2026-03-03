
-- Clean up test user created via raw SQL
DELETE FROM auth.identities WHERE user_id = '690aed1d-c950-4065-9503-c53ce974400b';
DELETE FROM auth.users WHERE id = '690aed1d-c950-4065-9503-c53ce974400b';

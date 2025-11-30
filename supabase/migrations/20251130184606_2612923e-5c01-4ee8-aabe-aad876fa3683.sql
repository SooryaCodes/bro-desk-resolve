-- Completely remove admin@brodesk.com so it can be registered again

-- 1) Delete roles explicitly (in case ON DELETE CASCADE is not present)
DELETE FROM public.user_roles
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'admin@brodesk.com'
);

-- 2) Delete profile explicitly
DELETE FROM public.profiles
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'admin@brodesk.com'
);

-- 3) Delete the auth user
DELETE FROM auth.users
WHERE email = 'admin@brodesk.com';
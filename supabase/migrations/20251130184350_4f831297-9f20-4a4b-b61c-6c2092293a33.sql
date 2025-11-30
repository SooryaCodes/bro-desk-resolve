-- Fix admin@brodesk.com account - create missing profile and fix role

-- Create missing profile for admin@brodesk.com with email
INSERT INTO public.profiles (id, full_name, email, created_at)
VALUES (
  '0990ee4a-54f7-4928-92c4-e5bdf03bb521',
  'Super Administrator',
  'admin@brodesk.com',
  now()
)
ON CONFLICT (id) DO UPDATE 
SET full_name = 'Super Administrator',
    email = 'admin@brodesk.com';

-- Update role from student to super_admin
UPDATE public.user_roles 
SET role = 'super_admin'::public.app_role
WHERE user_id = '0990ee4a-54f7-4928-92c4-e5bdf03bb521';

-- Create trigger function to auto-create profiles on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email,
    NEW.created_at
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Fix student@brodesk.com user if it exists
DO $$
DECLARE
  student_user_id UUID;
  student_email TEXT;
BEGIN
  -- Check if student user exists
  SELECT id, email INTO student_user_id, student_email
  FROM auth.users
  WHERE email = 'student@brodesk.com';
  
  IF student_user_id IS NOT NULL THEN
    -- Create profile if missing
    INSERT INTO public.profiles (id, full_name, email, created_at)
    VALUES (student_user_id, 'Test Student', student_email, now())
    ON CONFLICT (id) DO UPDATE 
    SET full_name = 'Test Student',
        email = student_email;
    
    -- Ensure student role exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (student_user_id, 'student'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;
-- Add foreign key from tickets.student_id to profiles table
-- This will fix the Supabase query issue with the relationship lookup

ALTER TABLE public.tickets 
DROP CONSTRAINT IF EXISTS tickets_student_id_fkey;

ALTER TABLE public.tickets
ADD CONSTRAINT tickets_student_id_fkey 
FOREIGN KEY (student_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- Also add foreign key for assigned_user_id
ALTER TABLE public.tickets 
DROP CONSTRAINT IF EXISTS tickets_assigned_user_id_fkey;

ALTER TABLE public.tickets
ADD CONSTRAINT tickets_assigned_user_id_fkey 
FOREIGN KEY (assigned_user_id) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;

-- Add foreign key for resolved_by
ALTER TABLE public.tickets 
DROP CONSTRAINT IF EXISTS tickets_resolved_by_fkey;

ALTER TABLE public.tickets
ADD CONSTRAINT tickets_resolved_by_fkey 
FOREIGN KEY (resolved_by) 
REFERENCES public.profiles(id) 
ON DELETE SET NULL;
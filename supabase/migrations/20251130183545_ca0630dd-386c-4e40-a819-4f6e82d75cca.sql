-- Setup storage bucket and attachment table for file uploads

-- Create storage bucket for ticket attachments if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ticket-attachments', 'ticket-attachments', true, 10485760, ARRAY['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for ticket attachments
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'ticket-attachments');

DROP POLICY IF EXISTS "Anyone can view ticket attachments" ON storage.objects;
CREATE POLICY "Anyone can view ticket attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'ticket-attachments');

DROP POLICY IF EXISTS "Users can delete their own attachments" ON storage.objects;
CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'ticket-attachments' AND auth.uid()::text = (storage.foldername(name))[2]);

-- Create ticket_attachments table if not exists
CREATE TABLE IF NOT EXISTS public.ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies for ticket_attachments
DROP POLICY IF EXISTS "Users can view all attachments" ON public.ticket_attachments;
CREATE POLICY "Users can view all attachments"
ON public.ticket_attachments FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can upload attachments" ON public.ticket_attachments;
CREATE POLICY "Users can upload attachments"
ON public.ticket_attachments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = uploaded_by);

DROP POLICY IF EXISTS "Users can delete their own attachments" ON public.ticket_attachments;
CREATE POLICY "Users can delete their own attachments"
ON public.ticket_attachments FOR DELETE
TO authenticated
USING (auth.uid() = uploaded_by);
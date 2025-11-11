-- Create storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments', 'ticket-attachments', false);

-- RLS policies for ticket attachments storage
CREATE POLICY "Users can view attachments on accessible tickets"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'ticket-attachments' AND
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id::text = (storage.foldername(name))[1]
    AND (
      t.student_id = auth.uid() OR
      t.assigned_user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND (ur.role = 'admin' OR ur.role = 'super_admin')
      ) OR
      EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'team_member' 
        AND ur.team_id = t.team_id
      )
    )
  )
);

CREATE POLICY "Users can upload attachments to accessible tickets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ticket-attachments' AND
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id::text = (storage.foldername(name))[1]
    AND (
      t.student_id = auth.uid() OR
      t.assigned_user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND (ur.role = 'admin' OR ur.role = 'super_admin')
      ) OR
      EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'team_member' 
        AND ur.team_id = t.team_id
      )
    )
  )
);

CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'ticket-attachments' AND
  auth.uid()::text = (storage.foldername(name))[2]
);

-- Function to log ticket history
CREATE OR REPLACE FUNCTION log_ticket_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO ticket_history (ticket_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'status', OLD.status, NEW.status);
  END IF;
  
  -- Log priority changes
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO ticket_history (ticket_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'priority', OLD.priority, NEW.priority);
  END IF;
  
  -- Log assignment changes
  IF OLD.assigned_user_id IS DISTINCT FROM NEW.assigned_user_id THEN
    INSERT INTO ticket_history (ticket_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, auth.uid(), 'assigned_user_id', 
            COALESCE(OLD.assigned_user_id::text, 'unassigned'), 
            COALESCE(NEW.assigned_user_id::text, 'unassigned'));
  END IF;
  
  -- Set resolved_at timestamp
  IF OLD.status != 'resolved' AND NEW.status = 'resolved' THEN
    NEW.resolved_at = NOW();
  END IF;
  
  -- Set closed_at timestamp
  IF OLD.status != 'closed' AND NEW.status = 'closed' THEN
    NEW.closed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER ticket_change_logger
  BEFORE UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION log_ticket_change();

-- Enable realtime for tickets and comments
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_attachments;
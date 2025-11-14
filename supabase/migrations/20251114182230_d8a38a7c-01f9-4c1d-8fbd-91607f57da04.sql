-- Add resolved_by column to track who resolved tickets
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES auth.users(id);

-- Update the log_ticket_change function to track resolver
CREATE OR REPLACE FUNCTION public.log_ticket_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  
  -- Set resolved_at timestamp and resolved_by user
  IF OLD.status != 'resolved' AND NEW.status = 'resolved' THEN
    NEW.resolved_at = NOW();
    NEW.resolved_by = auth.uid();
  END IF;
  
  -- Set closed_at timestamp
  IF OLD.status != 'closed' AND NEW.status = 'closed' THEN
    NEW.closed_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$function$;
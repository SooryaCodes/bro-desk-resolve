-- Update auto-assignment logic to assign based on team member availability
-- This trigger will assign tickets to the team member with the least open tickets

CREATE OR REPLACE FUNCTION public.smart_auto_route_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_team_id uuid;
  v_assigned_user_id uuid;
BEGIN
  -- Set team_id based on category
  SELECT team_id INTO v_team_id
  FROM categories
  WHERE id = NEW.category_id;
  
  NEW.team_id := v_team_id;
  
  -- Find team member with least open tickets in this team
  IF v_team_id IS NOT NULL THEN
    SELECT ur.user_id INTO v_assigned_user_id
    FROM user_roles ur
    LEFT JOIN (
      SELECT assigned_user_id, COUNT(*) as ticket_count
      FROM tickets
      WHERE status IN ('open', 'in_progress', 'need_info')
      GROUP BY assigned_user_id
    ) t ON t.assigned_user_id = ur.user_id
    WHERE ur.team_id = v_team_id
      AND ur.role = 'team_member'
    ORDER BY COALESCE(t.ticket_count, 0) ASC, ur.created_at ASC
    LIMIT 1;
    
    NEW.assigned_user_id := v_assigned_user_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Replace the old auto_route_ticket trigger with the new smart one
DROP TRIGGER IF EXISTS auto_route_ticket_trigger ON tickets;

CREATE TRIGGER auto_route_ticket_trigger
  BEFORE INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION smart_auto_route_ticket();
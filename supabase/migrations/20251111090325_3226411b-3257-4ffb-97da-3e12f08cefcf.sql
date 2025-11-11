-- Fix search_path for trigger functions
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_number
  FROM tickets;
  
  NEW.ticket_number := 'BRO' || LPAD(next_number::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION auto_route_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set team_id based on category
  SELECT team_id INTO NEW.team_id
  FROM categories
  WHERE id = NEW.category_id;
  
  -- Set assigned_user_id to team lead if available
  IF NEW.team_id IS NOT NULL THEN
    SELECT team_lead_user_id INTO NEW.assigned_user_id
    FROM teams
    WHERE id = NEW.team_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
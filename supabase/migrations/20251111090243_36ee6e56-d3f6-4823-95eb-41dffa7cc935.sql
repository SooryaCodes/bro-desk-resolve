-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE app_role AS ENUM ('student', 'team_member', 'admin', 'super_admin');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'need_info', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  team_lead_user_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_roles table (security best practice)
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'student',
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create categories table
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tickets table
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number TEXT UNIQUE NOT NULL,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id),
  team_id UUID REFERENCES teams(id),
  assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  status ticket_status DEFAULT 'open',
  priority ticket_priority DEFAULT 'medium',
  sentiment_score DECIMAL(3,2),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ticket_comments table
CREATE TABLE ticket_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ticket_attachments table
CREATE TABLE ticket_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ticket_history table for audit trail
CREATE TABLE ticket_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_history ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for teams
CREATE POLICY "Everyone can view teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Admins can manage teams" ON teams FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role" ON user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can view all roles" ON user_roles FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can manage roles" ON user_roles FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Admins can manage all profiles" ON profiles FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- RLS Policies for categories
CREATE POLICY "Everyone can view categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON categories FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- RLS Policies for tickets
CREATE POLICY "Students can view their own tickets" ON tickets FOR SELECT USING (
  student_id = auth.uid() OR
  assigned_user_id = auth.uid() OR
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'super_admin') OR
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'team_member' 
    AND ur.team_id = tickets.team_id
  )
);

CREATE POLICY "Students can create tickets" ON tickets FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Team members can update assigned tickets" ON tickets FOR UPDATE USING (
  assigned_user_id = auth.uid() OR
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'super_admin') OR
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'team_member' 
    AND ur.team_id = tickets.team_id
  )
);

-- RLS Policies for ticket_comments
CREATE POLICY "Users can view comments on accessible tickets" ON ticket_comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = ticket_id AND (
      t.student_id = auth.uid() OR
      t.assigned_user_id = auth.uid() OR
      has_role(auth.uid(), 'admin') OR
      has_role(auth.uid(), 'super_admin') OR
      EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'team_member' 
        AND ur.team_id = t.team_id
      )
    )
  )
);

CREATE POLICY "Users can create comments on accessible tickets" ON ticket_comments FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = ticket_id AND (
      t.student_id = auth.uid() OR
      t.assigned_user_id = auth.uid() OR
      has_role(auth.uid(), 'admin') OR
      has_role(auth.uid(), 'super_admin') OR
      EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'team_member' 
        AND ur.team_id = t.team_id
      )
    )
  )
);

-- RLS Policies for ticket_attachments
CREATE POLICY "Users can view attachments on accessible tickets" ON ticket_attachments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = ticket_id AND (
      t.student_id = auth.uid() OR
      t.assigned_user_id = auth.uid() OR
      has_role(auth.uid(), 'admin') OR
      has_role(auth.uid(), 'super_admin') OR
      EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'team_member' 
        AND ur.team_id = t.team_id
      )
    )
  )
);

CREATE POLICY "Users can upload attachments to accessible tickets" ON ticket_attachments FOR INSERT WITH CHECK (
  uploaded_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = ticket_id AND (
      t.student_id = auth.uid() OR
      t.assigned_user_id = auth.uid() OR
      has_role(auth.uid(), 'admin') OR
      has_role(auth.uid(), 'super_admin') OR
      EXISTS (
        SELECT 1 FROM user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role = 'team_member' 
        AND ur.team_id = t.team_id
      )
    )
  )
);

-- RLS Policies for ticket_history
CREATE POLICY "Admins and team members can view history" ON ticket_history FOR SELECT USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'super_admin') OR
  EXISTS (
    SELECT 1 FROM tickets t
    INNER JOIN user_roles ur ON ur.team_id = t.team_id
    WHERE t.id = ticket_id AND ur.user_id = auth.uid() AND ur.role = 'team_member'
  )
);

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email
  );
  
  -- Assign default student role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to auto-generate ticket numbers
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_number
  FROM tickets;
  
  NEW.ticket_number := 'BRO' || LPAD(next_number::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_ticket_number
  BEFORE INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION generate_ticket_number();

-- Function to auto-route tickets to teams
CREATE OR REPLACE FUNCTION auto_route_ticket()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE TRIGGER route_ticket_on_create
  BEFORE INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION auto_route_ticket();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default teams
INSERT INTO teams (name, description) VALUES
  ('Facilities Team', 'Manages physical infrastructure and campus facilities'),
  ('Tech Support', 'Handles WiFi, networking, and technical issues'),
  ('Mentor Team', 'Addresses academic and mentor-related concerns'),
  ('Administration', 'Manages personal, behavioral, and sensitive issues');

-- Insert default categories with team mapping
INSERT INTO categories (name, description, team_id, icon) VALUES
  ('Facilities', 'Issues related to campus infrastructure, cleanliness, and physical environment', (SELECT id FROM teams WHERE name = 'Facilities Team'), 'Building2'),
  ('WiFi/Network', 'Internet connectivity and network-related problems', (SELECT id FROM teams WHERE name = 'Tech Support'), 'Wifi'),
  ('Academic/Mentor', 'Training content, mentor communication, and learning-related concerns', (SELECT id FROM teams WHERE name = 'Mentor Team'), 'GraduationCap'),
  ('Personal/Behavioral', 'Personal issues, behavioral concerns, and sensitive matters', (SELECT id FROM teams WHERE name = 'Administration'), 'User'),
  ('Hostel', 'Hostel facilities, cleanliness, and accommodation issues', (SELECT id FROM teams WHERE name = 'Facilities Team'), 'Home'),
  ('Technical Equipment', 'Computers, projectors, and other technical equipment', (SELECT id FROM teams WHERE name = 'Tech Support'), 'Laptop'),
  ('Other', 'Other concerns not covered by specific categories', (SELECT id FROM teams WHERE name = 'Administration'), 'MessageSquare');
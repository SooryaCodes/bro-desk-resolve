import { ReactNode, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, User as UserIcon } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useTicketNotifications } from "@/hooks/useTicketNotifications";

interface DashboardLayoutProps {
  children: ReactNode;
  user: {
    id?: string;
    email?: string;
    user_metadata?: {
      full_name?: string;
    };
  };
  userRole?: string;
}

const DashboardLayout = ({ children, user, userRole }: DashboardLayoutProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [teamId, setTeamId] = useState<string | null>(null);

  // Fetch team ID for notifications
  useEffect(() => {
    const fetchTeamId = async () => {
      if (userRole === "team_member" && user.id) {
        const { data } = await supabase
          .from("user_roles")
          .select("team_id")
          .eq("user_id", user.id)
          .single();
        setTeamId(data?.team_id || null);
      }
    };
    fetchTeamId();
  }, [user.id, userRole]);

  // Enable real-time notifications
  useTicketNotifications({
    userId: user.id || "",
    userRole: userRole || "student",
    teamId,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You've been successfully signed out.",
    });
    navigate('/auth');
  };

  const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  const initials = fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const getRoleBadge = () => {
    if (!userRole) return null;
    
    const roleColors = {
      student: 'bg-muted text-muted-foreground',
      team_member: 'bg-info/10 text-info',
      admin: 'bg-warning/10 text-warning',
      super_admin: 'bg-destructive/10 text-destructive'
    };

    const roleLabels = {
      student: 'Student',
      team_member: 'Team Member',
      admin: 'Admin',
      super_admin: 'Super Admin'
    };

    return (
      <span className={`text-xs px-2 py-0.5 rounded-full ${roleColors[userRole as keyof typeof roleColors]}`}>
        {roleLabels[userRole as keyof typeof roleLabels]}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold tracking-tight">BroDesk</h1>
            <nav className="hidden md:flex items-center gap-4">
              <NavLink to="/dashboard" end>
                Dashboard
              </NavLink>
              <NavLink to="/submit-ticket">
                Submit Ticket
              </NavLink>
              {(userRole === 'admin' || userRole === 'super_admin') && (
                <NavLink to="/admin">
                  Admin Panel
                </NavLink>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{fullName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    {userRole && <div className="pt-1">{getRoleBadge()}</div>}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container px-4 py-8">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;

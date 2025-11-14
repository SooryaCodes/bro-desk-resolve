import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  User as UserIcon,
  AlertCircle,
  Clock,
  CheckCircle2
} from "lucide-react";
import TicketComments from "@/components/ticket/TicketComments";
import TicketAttachments from "@/components/ticket/TicketAttachments";
import TicketTimeline from "@/components/ticket/TicketTimeline";
import TicketActions from "@/components/ticket/TicketActions";

interface TicketData {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  location: string | null;
  status: string;
  priority: string;
  is_anonymous: boolean;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  closed_at: string | null;
  student_id: string;
  assigned_user_id: string | null;
  categories: {
    name: string;
    icon: string;
  };
  profiles: {
    full_name: string;
    email: string;
  };
  assigned_to: {
    full_name: string;
    email: string;
  } | null;
  resolver: {
    full_name: string;
    email: string;
  } | null;
}

const TicketDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    if (user && id) {
      loadTicket();
      subscribeToTicketUpdates();
    }
  }, [user, id]);

  const initializeAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }

    setUser(session.user);

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    setUserRole(roleData?.role || 'student');
  };

  const loadTicket = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          categories (name, icon),
          profiles!tickets_student_id_fkey (full_name, email),
          assigned_to:profiles!tickets_assigned_user_id_fkey (full_name, email),
          resolver:profiles!tickets_resolved_by_fkey (full_name, email)
        `)
        .eq('id', id!)
        .single();

      if (error) throw error;
      setTicket(data as any);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load ticket details.",
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToTicketUpdates = () => {
    const channel = supabase
      .channel(`ticket-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets',
          filter: `id=eq.${id}`
        },
        (payload) => {
          setTicket(prev => prev ? { ...prev, ...payload.new } as TicketData : null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-primary text-primary-foreground',
      in_progress: 'bg-info text-info-foreground',
      need_info: 'bg-warning text-warning-foreground',
      resolved: 'bg-success text-success-foreground',
      closed: 'bg-muted text-muted-foreground',
    };
    return colors[status] || colors.open;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'text-muted-foreground',
      medium: 'text-foreground',
      high: 'text-warning',
      urgent: 'text-destructive',
    };
    return colors[priority] || colors.medium;
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-6 w-full max-w-4xl p-8">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!ticket) {
    return null;
  }

  const canTakeActions = 
    user?.id === ticket.assigned_user_id ||
    userRole === 'admin' ||
    userRole === 'super_admin';

  const isStudent = user?.id === ticket.student_id;

  return (
    <DashboardLayout user={user!} userRole={userRole || undefined}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="mb-2 -ml-3"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{ticket.ticket_number}</h1>
              <Badge className={getStatusColor(ticket.status)}>
                {ticket.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Created {new Date(ticket.created_at).toLocaleDateString()} at{' '}
              {new Date(ticket.created_at).toLocaleTimeString()}
            </p>
          </div>

          {canTakeActions && (
            <TicketActions
              ticket={ticket}
              onUpdate={loadTicket}
              userRole={userRole!}
            />
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ticket Details */}
            <Card>
              <CardHeader>
                <CardTitle>{ticket.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">Description</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {ticket.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline">{ticket.categories.name}</Badge>
                  </div>
                  
                  {ticket.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {ticket.location}
                    </div>
                  )}

                  <div className={`flex items-center gap-2 text-sm font-medium ${getPriorityColor(ticket.priority)}`}>
                    <AlertCircle className="h-4 w-4" />
                    {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)} Priority
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Comments */}
            <TicketComments ticketId={ticket.id} userId={user!.id} />

            {/* Attachments */}
            <TicketAttachments 
              ticketId={ticket.id} 
              userId={user!.id}
              canUpload={isStudent || canTakeActions}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Reported by</p>
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {ticket.is_anonymous ? 'Anonymous' : ticket.profiles.full_name}
                    </span>
                  </div>
                </div>

                {ticket.assigned_to && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Assigned to</p>
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {ticket.assigned_to.full_name}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Created</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {ticket.resolved_at && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Resolved</p>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span className="text-sm">
                        {new Date(ticket.resolved_at).toLocaleDateString()}
                      </span>
                    </div>
                    {ticket.resolver && (
                      <div className="flex items-center gap-2 mt-1">
                        <UserIcon className="h-4 w-4" />
                        <span className="text-xs text-muted-foreground">
                          by {ticket.resolver.full_name}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {ticket.closed_at && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Closed</p>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">
                        {new Date(ticket.closed_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <TicketTimeline ticketId={ticket.id} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TicketDetail;

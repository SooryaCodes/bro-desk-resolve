import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Clock, CheckCircle, AlertCircle, TrendingUp, Users, Timer, BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TicketStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  avg_resolution_hours: number;
}

interface TeamPerformance {
  team_id: string;
  team_name: string;
  total_tickets: number;
  open_tickets: number;
  resolved_tickets: number;
  avg_resolution_hours: number;
  member_count: number;
  tickets_per_member: number;
}

const Analytics = () => {
  const [stats, setStats] = useState<TicketStats>({
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
    avg_resolution_hours: 0,
  });
  const [categoryStats, setCategoryStats] = useState<any[]>([]);
  const [priorityStats, setPriorityStats] = useState<any[]>([]);
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    // Get overall stats
    const { data: tickets } = await supabase.from("tickets").select("*");

    if (tickets) {
      const resolvedTickets = tickets.filter(
        (t) => t.resolved_at && t.created_at
      );
      
      const avgResolutionMs =
        resolvedTickets.length > 0
          ? resolvedTickets.reduce((acc, t) => {
              const created = new Date(t.created_at).getTime();
              const resolved = new Date(t.resolved_at!).getTime();
              return acc + (resolved - created);
            }, 0) / resolvedTickets.length
          : 0;

      setStats({
        total: tickets.length,
        open: tickets.filter((t) => t.status === "open").length,
        in_progress: tickets.filter((t) => t.status === "in_progress").length,
        resolved: tickets.filter((t) => t.status === "resolved").length,
        closed: tickets.filter((t) => t.status === "closed").length,
        avg_resolution_hours: Math.round(avgResolutionMs / (1000 * 60 * 60) * 10) / 10,
      });

      // Category stats
      const { data: categories } = await supabase
        .from("categories")
        .select("id, name");

      const catStats = categories?.map((cat) => ({
        name: cat.name,
        count: tickets.filter((t) => t.category_id === cat.id).length,
      })) || [];

      setCategoryStats(catStats.filter((c) => c.count > 0));

      // Priority stats
      const priorities = ["low", "medium", "high", "urgent"];
      const priStats = priorities.map((pri) => ({
        name: pri,
        count: tickets.filter((t) => t.priority === pri).length,
      }));

      setPriorityStats(priStats.filter((p) => p.count > 0));

      // Team Performance Stats
      const { data: teams } = await supabase.from("teams").select("id, name");
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("user_id, team_id")
        .eq("role", "team_member");

      if (teams) {
        const teamStats = teams.map((team) => {
          const teamTickets = tickets.filter((t) => t.team_id === team.id);
          const resolvedTeamTickets = teamTickets.filter((t) => t.resolved_at && t.created_at);
          
          const teamAvgResolutionMs =
            resolvedTeamTickets.length > 0
              ? resolvedTeamTickets.reduce((acc, t) => {
                  const created = new Date(t.created_at).getTime();
                  const resolved = new Date(t.resolved_at!).getTime();
                  return acc + (resolved - created);
                }, 0) / resolvedTeamTickets.length
              : 0;

          const memberCount = userRoles?.filter((ur) => ur.team_id === team.id).length || 0;

          return {
            team_id: team.id,
            team_name: team.name,
            total_tickets: teamTickets.length,
            open_tickets: teamTickets.filter((t) => t.status === "open" || t.status === "in_progress").length,
            resolved_tickets: teamTickets.filter((t) => t.status === "resolved" || t.status === "closed").length,
            avg_resolution_hours: Math.round(teamAvgResolutionMs / (1000 * 60 * 60) * 10) / 10,
            member_count: memberCount,
            tickets_per_member: memberCount > 0 ? Math.round((teamTickets.length / memberCount) * 10) / 10 : 0,
          };
        });

        setTeamPerformance(teamStats.filter((ts) => ts.total_tickets > 0));
      }
    }
  };

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Analytics & Insights</h3>
        <p className="text-sm text-muted-foreground">
          Overview of ticket metrics and team performance
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="teams">Team Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.open + stats.in_progress}</div>
            <p className="text-xs text-muted-foreground">
              {stats.open} open, {stats.in_progress} in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resolved + stats.closed}</div>
            <p className="text-xs text-muted-foreground">
              {stats.resolved} resolved, {stats.closed} closed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avg_resolution_hours}h</div>
            <p className="text-xs text-muted-foreground">Average time to resolve</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tickets by Category</CardTitle>
            <CardDescription>Distribution across categories</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tickets by Priority</CardTitle>
            <CardDescription>Priority distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={priorityStats}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, count }) => `${name}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {priorityStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="teams" className="space-y-6">
          <div className="grid gap-4">
            {teamPerformance.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">No team data available yet</p>
                </CardContent>
              </Card>
            ) : (
              teamPerformance.map((team) => (
                <Card key={team.team_id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{team.team_name}</CardTitle>
                        <CardDescription>{team.member_count} team members</CardDescription>
                      </div>
                      <Badge variant="outline" className="text-lg">
                        {team.total_tickets} tickets
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Open Tickets</p>
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <span className="text-2xl font-bold">{team.open_tickets}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Resolved</p>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-2xl font-bold">{team.resolved_tickets}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Avg Resolution</p>
                        <div className="flex items-center gap-2">
                          <Timer className="h-4 w-4 text-muted-foreground" />
                          <span className="text-2xl font-bold">{team.avg_resolution_hours}h</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Per Member</p>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-2xl font-bold">{team.tickets_per_member}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;

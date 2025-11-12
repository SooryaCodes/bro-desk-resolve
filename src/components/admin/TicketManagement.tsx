import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, Filter, Eye, UserCog } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Ticket {
  id: string;
  ticket_number: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  student_id: string;
  assigned_user_id: string | null;
  team_id: string | null;
  category_id: string;
  profiles: { full_name: string };
  categories: { name: string };
}

interface Team {
  id: string;
  name: string;
}

interface TeamMember {
  id: string;
  full_name: string;
  team_id: string;
}

const TicketManagement = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [selectedAssignee, setSelectedAssignee] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ticketsRes, teamsRes] = await Promise.all([
        supabase
          .from("tickets")
          .select("*, profiles!tickets_student_id_fkey(full_name), categories(name)")
          .order("created_at", { ascending: false }),
        supabase.from("teams").select("*").order("name"),
      ]);

      if (ticketsRes.error) {
        console.error("Error fetching tickets:", ticketsRes.error);
        toast.error("Failed to load tickets");
      } else if (ticketsRes.data) {
        setTickets(ticketsRes.data as any);
      }

      if (teamsRes.data) setTeams(teamsRes.data);

      // Fetch all team members
      const { data: teamMembersData } = await supabase
        .from("user_roles")
        .select("user_id, team_id, profiles(id, full_name)")
        .eq("role", "team_member")
        .not("team_id", "is", null);

      if (teamMembersData) {
        const members = teamMembersData.map((tm: any) => ({
          id: tm.user_id,
          full_name: tm.profiles.full_name,
          team_id: tm.team_id,
        }));
        setTeamMembers(members);
      }
    } catch (error: any) {
      console.error("Error in fetchData:", error);
      toast.error("An error occurred while loading data");
    }
  };

  const handleReassign = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setSelectedTeam(ticket.team_id || "none");
    setSelectedAssignee(ticket.assigned_user_id || "none");
    setIsDialogOpen(true);
  };

  const handleUpdateTicket = async () => {
    if (!selectedTicket) return;

    try {
      await supabase
        .from("tickets")
        .update({
          team_id: selectedTeam === "none" ? null : selectedTeam,
          assigned_user_id: selectedAssignee === "none" ? null : selectedAssignee,
        })
        .eq("id", selectedTicket.id);

      toast.success("Ticket reassigned successfully");
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error("Failed to reassign ticket");
      console.error(error);
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.profiles?.full_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      open: "bg-blue-500/10 text-blue-700 border-blue-500/20",
      in_progress: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
      resolved: "bg-green-500/10 text-green-700 border-green-500/20",
      closed: "bg-gray-500/10 text-gray-700 border-gray-500/20",
    };
    return colors[status] || "bg-gray-500/10 text-gray-700 border-gray-500/20";
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      low: "bg-gray-500/10 text-gray-700 border-gray-500/20",
      medium: "bg-blue-500/10 text-blue-700 border-blue-500/20",
      high: "bg-orange-500/10 text-orange-700 border-orange-500/20",
      urgent: "bg-red-500/10 text-red-700 border-red-500/20",
    };
    return colors[priority] || "bg-gray-500/10 text-gray-700 border-gray-500/20";
  };

  const filteredTeamMembers = teamMembers.filter(
    (member) => selectedTeam === "none" || member.team_id === selectedTeam
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Ticket Management</h3>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tickets Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket #</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell className="font-mono text-sm">{ticket.ticket_number}</TableCell>
                <TableCell className="font-medium max-w-xs truncate">{ticket.title}</TableCell>
                <TableCell>{ticket.profiles?.full_name || "Unknown"}</TableCell>
                <TableCell>{ticket.categories?.name || "N/A"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={getStatusBadge(ticket.status)}>
                    {ticket.status.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getPriorityBadge(ticket.priority)}>
                    {ticket.priority}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/ticket/${ticket.id}`)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReassign(ticket)}
                  >
                    <UserCog className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Reassign Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign Ticket</DialogTitle>
            <DialogDescription>
              Change team assignment and assignee for {selectedTicket?.ticket_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Team</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Team</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select 
                value={selectedAssignee} 
                onValueChange={setSelectedAssignee}
                disabled={selectedTeam === "none"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {filteredTeamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleUpdateTicket} className="flex-1">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TicketManagement;

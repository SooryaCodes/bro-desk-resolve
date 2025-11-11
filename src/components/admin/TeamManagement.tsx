import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Users } from "lucide-react";

interface Team {
  id: string;
  name: string;
  description: string | null;
  team_lead_user_id: string | null;
  created_at: string;
}

interface User {
  id: string;
  full_name: string;
}

const TeamManagement = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    team_lead_user_id: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [teamsRes, usersRes] = await Promise.all([
      supabase.from("teams").select("*").order("name"),
      supabase.from("profiles").select("id, full_name").order("full_name"),
    ]);

    if (teamsRes.data) setTeams(teamsRes.data);
    if (usersRes.data) setUsers(usersRes.data);
  };

  const handleOpenDialog = (team?: Team) => {
    if (team) {
      setEditingTeam(team);
      setFormData({
        name: team.name,
        description: team.description || "",
        team_lead_user_id: team.team_lead_user_id || "none",
      });
    } else {
      setEditingTeam(null);
      setFormData({ name: "", description: "", team_lead_user_id: "none" });
    }
    setIsDialogOpen(true);
  };

  const handleSaveTeam = async () => {
    try {
      if (editingTeam) {
        await supabase
          .from("teams")
          .update({
            name: formData.name,
            description: formData.description || null,
            team_lead_user_id: formData.team_lead_user_id === "none" ? null : formData.team_lead_user_id || null,
          })
          .eq("id", editingTeam.id);
        toast.success("Team updated successfully");
      } else {
        await supabase.from("teams").insert({
          name: formData.name,
          description: formData.description || null,
          team_lead_user_id: formData.team_lead_user_id === "none" ? null : formData.team_lead_user_id || null,
        });
        toast.success("Team created successfully");
      }

      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error("Failed to save team");
      console.error(error);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm("Are you sure? This will unassign all team members and categories.")) return;

    try {
      await supabase.from("teams").delete().eq("id", teamId);
      toast.success("Team deleted successfully");
      fetchData();
    } catch (error: any) {
      toast.error("Failed to delete team");
      console.error(error);
    }
  };

  const getTeamLeadName = (teamLeadId: string | null) => {
    if (!teamLeadId) return "No lead assigned";
    return users.find((u) => u.id === teamLeadId)?.full_name || "Unknown";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Teams</h3>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Create Team
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Team Lead</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.map((team) => (
              <TableRow key={team.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {team.name}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {team.description || "-"}
                </TableCell>
                <TableCell>{getTeamLeadName(team.team_lead_user_id)}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(team.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(team)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTeam(team.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeam ? "Edit Team" : "Create New Team"}</DialogTitle>
            <DialogDescription>
              {editingTeam ? "Update team details" : "Add a new team to your organization"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Team Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., IT Support, Facilities"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the team's responsibilities"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Team Lead</Label>
              <Select
                value={formData.team_lead_user_id}
                onValueChange={(value) => setFormData({ ...formData, team_lead_user_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team lead" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Lead</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSaveTeam} className="flex-1">
                {editingTeam ? "Update" : "Create"} Team
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamManagement;

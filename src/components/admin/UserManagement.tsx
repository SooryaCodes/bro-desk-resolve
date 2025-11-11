import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserPlus, Edit, Trash2, Shield } from "lucide-react";

interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: string;
  team_id: string | null;
  teams: { name: string } | null;
}

interface Team {
  id: string;
  name: string;
}

interface UserManagementProps {
  userRole: string;
}

const UserManagement = ({ userRole }: UserManagementProps) => {
  const [users, setUsers] = useState<User[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("student");
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [usersRes, rolesRes, teamsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("*, teams(name)"),
      supabase.from("teams").select("*").order("name"),
    ]);

    if (usersRes.data) setUsers(usersRes.data);
    if (rolesRes.data) setUserRoles(rolesRes.data as any);
    if (teamsRes.data) setTeams(teamsRes.data);
  };

  const getUserRole = (userId: string) => {
    return userRoles.find((r) => r.user_id === userId);
  };

  // Filter users based on current user's role
  const filteredUsers = users.filter((user) => {
    const role = getUserRole(user.id);
    // Super admins can see everyone
    if (userRole === "super_admin") return true;
    // Regular admins cannot see super_admins
    return role?.role !== "super_admin";
  });

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    const userRole = getUserRole(user.id);
    setSelectedRole(userRole?.role || "student");
    setSelectedTeam(userRole?.team_id || "none");
    setIsDialogOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;

    try {
      const userRole = getUserRole(selectedUser.id);

      if (userRole) {
        await supabase
          .from("user_roles")
          .update({
            role: selectedRole as "admin" | "student" | "super_admin" | "team_member",
            team_id: selectedTeam === "none" ? null : selectedTeam || null,
          })
          .eq("id", userRole.id);
      } else {
        await supabase.from("user_roles").insert([{
          user_id: selectedUser.id,
          role: selectedRole as "admin" | "student" | "super_admin" | "team_member",
          team_id: selectedTeam === "none" ? null : selectedTeam || null,
        }]);
      }

      toast.success("User role updated successfully");
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error("Failed to update user role");
      console.error(error);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (!confirm("Are you sure you want to remove this role?")) return;

    try {
      await supabase.from("user_roles").delete().eq("id", roleId);
      toast.success("Role removed successfully");
      fetchData();
    } catch (error: any) {
      toast.error("Failed to remove role");
      console.error(error);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-red-500/10 text-red-700 border-red-500/20";
      case "admin":
        return "bg-purple-500/10 text-purple-700 border-purple-500/20";
      case "team_member":
        return "bg-blue-500/10 text-blue-700 border-blue-500/20";
      default:
        return "bg-gray-500/10 text-gray-700 border-gray-500/20";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Users & Roles</h3>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => {
              const userRole = getUserRole(user.id);
              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {userRole ? (
                      <Badge variant="outline" className={getRoleBadgeColor(userRole.role)}>
                        <Shield className="h-3 w-3 mr-1" />
                        {userRole.role.replace("_", " ")}
                      </Badge>
                    ) : (
                      <Badge variant="outline">No role</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {userRole?.teams?.name || "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditUser(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Role</DialogTitle>
            <DialogDescription>
              Assign a role and team to {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="team_member">Team Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  {userRole === "super_admin" && (
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {(selectedRole === "team_member" || selectedRole === "admin") && (
              <div className="space-y-2">
                <Label>Team (Optional)</Label>
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
            )}

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleUpdateRole} className="flex-1">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;

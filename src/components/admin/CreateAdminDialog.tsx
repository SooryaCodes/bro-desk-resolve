import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Loader2 } from "lucide-react";
import { z } from "zod";

const createAdminSchema = z.object({
  email: z.string().trim().email({ message: "Invalid email address" }).max(255),
  fullName: z.string().trim().min(2, { message: "Name must be at least 2 characters" }).max(100),
  role: z.enum(["admin", "team_member"], { required_error: "Please select a role" }),
  teamId: z.string().optional(),
});

interface Team {
  id: string;
  name: string;
}

export const CreateAdminDialog = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    role: "",
    teamId: "",
  });
  const { toast } = useToast();

  const loadTeams = async () => {
    const { data } = await supabase.from("teams").select("id, name").order("name");
    if (data) setTeams(data);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      loadTeams();
    } else {
      // Reset form
      setFormData({ email: "", fullName: "", role: "", teamId: "" });
    }
  };

  const generateSecurePassword = () => {
    const length = 16;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      password += charset[array[i] % charset.length];
    }
    return password;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate input
      const validatedData = createAdminSchema.parse(formData);

      // Generate secure password
      const temporaryPassword = generateSecurePassword();

      // Create user with Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: validatedData.email,
        password: temporaryPassword,
        options: {
          data: {
            full_name: validatedData.fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Failed to create user");

      // Wait a bit for the trigger to create the profile
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Assign role
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: authData.user.id,
        role: validatedData.role,
        team_id: validatedData.teamId || null,
      });

      if (roleError) throw roleError;

      // Get team name if applicable
      let teamName = null;
      if (validatedData.teamId) {
        const team = teams.find((t) => t.id === validatedData.teamId);
        teamName = team?.name;
      }

      // Send welcome email with credentials
      const { error: emailError } = await supabase.functions.invoke("send-notification", {
        body: {
          type: "user_created",
          recipientEmail: validatedData.email,
          recipientName: validatedData.fullName,
          data: {
            temporaryPassword,
            role: validatedData.role,
            team: teamName,
            appUrl: window.location.origin,
          },
        },
      });

      if (emailError) {
        console.error("Email notification failed:", emailError);
        // Don't throw - user was created successfully
        toast({
          title: "User created",
          description: `${validatedData.role} account created for ${validatedData.email}. Email notification failed - please share credentials manually: ${temporaryPassword}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "User created successfully!",
          description: `${validatedData.role} account created and welcome email sent to ${validatedData.email}`,
        });
      }

      setOpen(false);
      
      // Reload page to show new user
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: error.errors[0].message,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error creating user",
          description: error.message || "Please try again",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Create Admin/Team Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Create an admin or team member account. A welcome email with login credentials will be sent.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="John Doe"
              required
              disabled={loading}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="admin@example.com"
              required
              disabled={loading}
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
              disabled={loading}
              required
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="team_member">Team Member</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.role === "team_member" && (
            <div className="space-y-2">
              <Label htmlFor="team">Team (Optional)</Label>
              <Select
                value={formData.teamId}
                onValueChange={(value) => setFormData({ ...formData, teamId: value })}
                disabled={loading}
              >
                <SelectTrigger id="team">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Team</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="bg-muted p-3 rounded-lg text-sm">
            <p className="text-muted-foreground">
              📧 A secure temporary password will be generated and emailed to the user.
              They should change it after first login.
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Create User
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

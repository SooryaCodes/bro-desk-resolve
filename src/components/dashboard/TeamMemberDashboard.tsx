import { User } from "@supabase/supabase-js";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutGrid } from "lucide-react";

interface TeamMemberDashboardProps {
  user: User;
}

const TeamMemberDashboard = ({ user }: TeamMemberDashboardProps) => {
  return (
    <DashboardLayout user={user} userRole="team_member">
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Team Dashboard</h2>
          <p className="text-muted-foreground mt-2">
            Manage and resolve assigned tickets
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Kanban Board</CardTitle>
            <CardDescription>Drag and drop tickets to update their status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <LayoutGrid className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Kanban board coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TeamMemberDashboard;

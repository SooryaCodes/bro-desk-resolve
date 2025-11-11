import { User } from "@supabase/supabase-js";
import DashboardLayout from "@/components/layout/DashboardLayout";
import KanbanBoard from "@/components/kanban/KanbanBoard";

interface TeamMemberDashboardProps {
  user: User;
}

const TeamMemberDashboard = ({ user }: TeamMemberDashboardProps) => {
  return (
    <DashboardLayout user={user} userRole="team_member">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Team Dashboard</h2>
          <p className="text-muted-foreground mt-2">
            Drag and drop tickets to update their status
          </p>
        </div>

        <KanbanBoard userId={user.id} />
      </div>
    </DashboardLayout>
  );
};

export default TeamMemberDashboard;

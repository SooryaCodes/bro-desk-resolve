import { User } from "@supabase/supabase-js";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserManagement from "@/components/admin/UserManagement";
import TeamManagement from "@/components/admin/TeamManagement";
import CategoryRouting from "@/components/admin/CategoryRouting";
import Analytics from "@/components/admin/Analytics";
import TicketManagement from "@/components/admin/TicketManagement";
import KanbanBoard from "@/components/kanban/KanbanBoard";
import { BarChart3, Users, Shield, Tag, Ticket, LayoutGrid } from "lucide-react";

interface AdminDashboardProps {
  user: User;
  userRole: string;
}

const AdminDashboard = ({ user, userRole }: AdminDashboardProps) => {
  return (
    <DashboardLayout user={user} userRole={userRole}>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
          <p className="text-muted-foreground mt-2">
            Manage users, teams, categories, and view analytics
          </p>
        </div>

        <Tabs defaultValue="kanban" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="kanban" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="tickets" className="gap-2">
              <Ticket className="h-4 w-4" />
              Tickets
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Shield className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="teams" className="gap-2">
              <Users className="h-4 w-4" />
              Teams
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <Tag className="h-4 w-4" />
              Categories
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kanban">
            <KanbanBoard userId={user.id} />
          </TabsContent>

          <TabsContent value="tickets">
            <TicketManagement />
          </TabsContent>

          <TabsContent value="analytics">
            <Analytics />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement userRole={userRole} />
          </TabsContent>

          <TabsContent value="teams">
            <TeamManagement />
          </TabsContent>

          <TabsContent value="categories">
            <CategoryRouting />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;

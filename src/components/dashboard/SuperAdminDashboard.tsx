import { User } from "@supabase/supabase-js";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Users, Ticket } from "lucide-react";
import Analytics from "@/components/admin/Analytics";
import SuperAdminUserView from "@/components/admin/SuperAdminUserView";
import SuperAdminTicketView from "@/components/admin/SuperAdminTicketView";

interface SuperAdminDashboardProps {
  user: User;
  userRole: string;
}

const SuperAdminDashboard = ({ user, userRole }: SuperAdminDashboardProps) => {
  return (
    <DashboardLayout user={user} userRole={userRole}>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h2>
          <p className="text-muted-foreground mt-2">
            Oversee all system activity, users, and tickets
          </p>
        </div>

        <Tabs defaultValue="tickets" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tickets" className="gap-2">
              <Ticket className="h-4 w-4" />
              All Tickets
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users Overview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tickets">
            <SuperAdminTicketView />
          </TabsContent>

          <TabsContent value="users">
            <SuperAdminUserView />
          </TabsContent>

          <TabsContent value="analytics">
            <Analytics />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SuperAdminDashboard;

import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UseTicketNotificationsProps {
  userId: string;
  userRole: string;
  teamId?: string | null;
}

export const useTicketNotifications = ({ userId, userRole, teamId }: UseTicketNotificationsProps) => {
  useEffect(() => {
    // Only listen for team members, admins, and super_admins
    if (!["team_member", "admin", "super_admin"].includes(userRole)) {
      return;
    }

    const channel = supabase
      .channel("ticket-notifications")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tickets",
        },
        async (payload) => {
          const oldTicket = payload.old;
          const newTicket = payload.new;

          // Check if this user should be notified
          const shouldNotify =
            userRole === "admin" ||
            userRole === "super_admin" ||
            newTicket.assigned_user_id === userId ||
            (teamId && newTicket.team_id === teamId);

          if (!shouldNotify) return;

          // Fetch profile data for better notifications
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", newTicket.student_id)
            .single();

          const studentName = profileData?.full_name || "A student";

          // Notify on assignment
          if (oldTicket.assigned_user_id !== newTicket.assigned_user_id && newTicket.assigned_user_id === userId) {
            toast.info("New Ticket Assigned", {
              description: `${studentName} assigned ticket ${newTicket.ticket_number} to you`,
              duration: 5000,
            });
          }

          // Notify on status change
          if (oldTicket.status !== newTicket.status) {
            const statusMessages: Record<string, string> = {
              open: "opened",
              in_progress: "marked as in progress",
              resolved: "resolved",
              closed: "closed",
            };

            toast.success("Ticket Status Updated", {
              description: `Ticket ${newTicket.ticket_number} was ${statusMessages[newTicket.status] || "updated"}`,
              duration: 4000,
            });
          }

          // Notify on priority change to urgent
          if (oldTicket.priority !== "urgent" && newTicket.priority === "urgent") {
            toast.error("Urgent Ticket", {
              description: `Ticket ${newTicket.ticket_number} was marked as URGENT`,
              duration: 6000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, userRole, teamId]);
};

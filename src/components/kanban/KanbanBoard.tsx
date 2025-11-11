import { useEffect, useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import KanbanColumn from "./KanbanColumn";
import KanbanCard from "./KanbanCard";

type Ticket = Database["public"]["Tables"]["tickets"]["Row"] & {
  profiles: { full_name: string } | null;
  categories: { name: string } | null;
};

const STATUS_COLUMNS: { id: Database["public"]["Enums"]["ticket_status"]; title: string; color: string }[] = [
  { id: "open", title: "Open", color: "bg-blue-500/10 border-blue-500/20" },
  { id: "in_progress", title: "In Progress", color: "bg-yellow-500/10 border-yellow-500/20" },
  { id: "need_info", title: "Need Info", color: "bg-purple-500/10 border-purple-500/20" },
  { id: "resolved", title: "Resolved", color: "bg-green-500/10 border-green-500/20" },
  { id: "closed", title: "Closed", color: "bg-gray-500/10 border-gray-500/20" },
];

interface KanbanBoardProps {
  userId: string;
}

const KanbanBoard = ({ userId }: KanbanBoardProps) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetchTickets();

    // Real-time subscription
    const channel = supabase
      .channel("kanban-tickets")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
        },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchTickets = async () => {
    try {
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role, team_id")
        .eq("user_id", userId)
        .single();

      let query = supabase
        .from("tickets")
        .select(`
          *,
          profiles!tickets_student_id_fkey (full_name),
          categories (name)
        `)
        .order("created_at", { ascending: false });

      // Filter based on role
      if (userRole?.role === "team_member" && userRole.team_id) {
        query = query.eq("team_id", userRole.team_id);
      } else if (userRole?.role !== "admin" && userRole?.role !== "super_admin") {
        query = query.eq("assigned_user_id", userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTickets((data || []) as any);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const ticket = tickets.find((t) => t.id === event.active.id);
    setActiveTicket(ticket || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTicket(null);

    if (!over) return;

    const ticketId = active.id as string;
    const newStatus = over.id as Database["public"]["Enums"]["ticket_status"];

    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket || ticket.status === newStatus) return;

    // Optimistic update
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
    );

    try {
      const { error } = await supabase
        .from("tickets")
        .update({ status: newStatus })
        .eq("id", ticketId);

      if (error) throw error;

      toast.success(`Ticket moved to ${STATUS_COLUMNS.find((c) => c.id === newStatus)?.title}`);
    } catch (error) {
      console.error("Error updating ticket:", error);
      toast.error("Failed to update ticket status");
      // Revert optimistic update
      fetchTickets();
    }
  };

  const getTicketsByStatus = (status: Database["public"]["Enums"]["ticket_status"]) => {
    return tickets.filter((ticket) => ticket.status === status);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {STATUS_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            color={column.color}
            tickets={getTicketsByStatus(column.id)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTicket ? (
          <div className="opacity-50 rotate-3">
            <KanbanCard ticket={activeTicket} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;

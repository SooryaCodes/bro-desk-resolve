import { useEffect, useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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
  const [filteredTickets, setFilteredTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
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
    fetchCategories();

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

  useEffect(() => {
    filterTickets();
  }, [tickets, searchQuery, priorityFilter, categoryFilter]);

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
          student:profiles!tickets_student_id_fkey (full_name),
          categories (name)
        `)
        .order("created_at", { ascending: false });

      // Team members only see their team's tickets
      if (userRole?.role === "team_member" && userRole.team_id) {
        query = query.eq("team_id", userRole.team_id);
      } else if (userRole?.role === "student") {
        query = query.eq("student_id", userId);
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

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('id, name')
      .order('name');
    
    if (data) {
      setCategories(data);
    }
  };

  const filterTickets = () => {
    let filtered = [...tickets];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        t => 
          t.title.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.ticket_number.toLowerCase().includes(query) ||
          t.profiles?.full_name.toLowerCase().includes(query)
      );
    }

    // Priority filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter(t => t.priority === priorityFilter);
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(t => t.category_id === categoryFilter);
    }

    setFilteredTickets(filtered);
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
    return filteredTickets.filter((ticket) => ticket.status === status);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-card rounded-lg border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets by title, description, or ticket number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(searchQuery || priorityFilter !== "all" || categoryFilter !== "all") && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setSearchQuery("");
                setPriorityFilter("all");
                setCategoryFilter("all");
              }}
              title="Clear filters"
            >
              <Filter className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Active Filters Display */}
      {(searchQuery || priorityFilter !== "all" || categoryFilter !== "all") && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
          <Filter className="h-4 w-4" />
          <span>Showing {filteredTickets.length} of {tickets.length} tickets</span>
        </div>
      )}

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
    </div>
  );
};

export default KanbanBoard;

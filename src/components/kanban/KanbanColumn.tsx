import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Database } from "@/integrations/supabase/types";
import KanbanCard from "./KanbanCard";
import { cn } from "@/lib/utils";

type Ticket = Database["public"]["Tables"]["tickets"]["Row"] & {
  profiles: { full_name: string } | null;
  categories: { name: string } | null;
};

interface KanbanColumnProps {
  id: string;
  title: string;
  color: string;
  tickets: Ticket[];
}

const KanbanColumn = ({ id, title, color, tickets }: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-lg border-2 border-dashed transition-all",
        color,
        isOver && "ring-2 ring-primary ring-offset-2"
      )}
    >
      <div className="p-4 border-b border-border/50">
        <h3 className="font-semibold text-sm flex items-center justify-between">
          <span>{title}</span>
          <span className="text-xs bg-muted px-2 py-1 rounded-full">{tickets.length}</span>
        </h3>
      </div>

      <SortableContext items={tickets.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-300px)] overflow-y-auto">
          {tickets.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              No tickets
            </div>
          ) : (
            tickets.map((ticket) => <KanbanCard key={ticket.id} ticket={ticket} />)
          )}
        </div>
      </SortableContext>
    </div>
  );
};

export default KanbanColumn;

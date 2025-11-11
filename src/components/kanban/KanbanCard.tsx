import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, User, Tag, GripVertical } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

type Ticket = Database["public"]["Tables"]["tickets"]["Row"] & {
  profiles: { full_name: string } | null;
  categories: { name: string } | null;
};

interface KanbanCardProps {
  ticket: Ticket;
  isDragging?: boolean;
}

const PRIORITY_COLORS = {
  low: "bg-green-500/10 text-green-700 border-green-500/20",
  medium: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  high: "bg-orange-500/10 text-orange-700 border-orange-500/20",
  urgent: "bg-red-500/10 text-red-700 border-red-500/20",
};

const KanbanCard = ({ ticket, isDragging = false }: KanbanCardProps) => {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSortableDragging } = useSortable({
    id: ticket.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleClick = () => {
    if (!isDragging && !isSortableDragging) {
      navigate(`/ticket/${ticket.id}`);
    }
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging || isSortableDragging ? "opacity-50" : "")}>
      <Card
        className={cn(
          "cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group",
          isDragging && "rotate-3 shadow-lg"
        )}
        onClick={handleClick}
      >
        <CardHeader className="p-3 pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_number}</span>
                <Badge variant="outline" className={cn("text-xs", PRIORITY_COLORS[ticket.priority])}>
                  {ticket.priority}
                </Badge>
              </div>
              <h4 className="text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                {ticket.title}
              </h4>
            </div>
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-3 pt-0 space-y-2">
          <p className="text-xs text-muted-foreground line-clamp-2">{ticket.description}</p>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {ticket.categories && (
              <div className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                <span>{ticket.categories.name}</span>
              </div>
            )}
            {ticket.profiles && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span className="truncate max-w-[100px]">{ticket.profiles.full_name}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default KanbanCard;

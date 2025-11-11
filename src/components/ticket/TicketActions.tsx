import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  MoreVertical, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  AlertCircle,
  RefreshCw
} from "lucide-react";

interface TicketActionsProps {
  ticket: {
    id: string;
    status: string;
    priority: string;
  };
  onUpdate: () => void;
  userRole: string;
}

const TicketActions = ({ ticket, onUpdate, userRole }: TicketActionsProps) => {
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState(ticket.status);
  const [newPriority, setNewPriority] = useState(ticket.priority);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleStatusChange = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus as any })
        .eq('id', ticket.id);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `Ticket status changed to ${newStatus.replace('_', ' ')}`,
      });
      
      setStatusDialogOpen(false);
      onUpdate();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update status. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePriorityChange = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ priority: newPriority as any })
        .eq('id', ticket.id);

      if (error) throw error;

      toast({
        title: "Priority updated",
        description: `Ticket priority changed to ${newPriority}`,
      });
      
      setPriorityDialogOpen(false);
      onUpdate();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update priority. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const quickStatusUpdate = async (status: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: status as any })
        .eq('id', ticket.id);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `Ticket marked as ${status.replace('_', ' ')}`,
      });
      
      onUpdate();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update status. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        {/* Quick Actions */}
        {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
          <>
            {ticket.status === 'open' && (
              <Button
                onClick={() => quickStatusUpdate('in_progress')}
                disabled={loading}
                className="gap-2"
              >
                <ArrowRight className="h-4 w-4" />
                Start Working
              </Button>
            )}
            
            {(ticket.status === 'in_progress' || ticket.status === 'need_info') && (
              <Button
                onClick={() => quickStatusUpdate('resolved')}
                disabled={loading}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Mark Resolved
              </Button>
            )}
          </>
        )}

        {ticket.status === 'resolved' && (
          <Button
            onClick={() => quickStatusUpdate('closed')}
            disabled={loading}
            className="gap-2"
          >
            <XCircle className="h-4 w-4" />
            Close Ticket
          </Button>
        )}

        {ticket.status === 'closed' && (
          <Button
            onClick={() => quickStatusUpdate('open')}
            disabled={loading}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reopen
          </Button>
        )}

        {/* More Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setStatusDialogOpen(true)}>
              Change Status
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPriorityDialogOpen(true)}>
              <AlertCircle className="h-4 w-4 mr-2" />
              Change Priority
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Status</DialogTitle>
            <DialogDescription>
              Update the ticket status to reflect its current state
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="need_info">Need Info</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusChange} disabled={loading}>
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Priority Dialog */}
      <Dialog open={priorityDialogOpen} onOpenChange={setPriorityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Priority</DialogTitle>
            <DialogDescription>
              Adjust the priority level of this ticket
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newPriority} onValueChange={setNewPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPriorityDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePriorityChange} disabled={loading}>
              Update Priority
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TicketActions;

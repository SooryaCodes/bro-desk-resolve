import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface StatusUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  ticketNumber: string;
  newStatus: string;
  onConfirm: () => void;
}

const StatusUpdateDialog = ({
  open,
  onOpenChange,
  ticketId,
  ticketNumber,
  newStatus,
  onConfirm,
}: StatusUpdateDialogProps) => {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Add comment if message is provided
      if (message.trim()) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error: commentError } = await supabase
            .from("ticket_comments")
            .insert({
              ticket_id: ticketId,
              author_id: user.id,
              message: `Status updated to "${newStatus.replace('_', ' ')}"\n\n${message}`,
              is_internal: false,
            });

          if (commentError) throw commentError;
        }
      }

      toast({
        title: "Status updated",
        description: message.trim() 
          ? "Status updated and message sent to ticket submitter."
          : "Ticket status has been updated.",
      });

      onConfirm();
      onOpenChange(false);
      setMessage("");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add comment. Status was updated.",
      });
      onConfirm();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onConfirm();
    onOpenChange(false);
    setMessage("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update Status - {ticketNumber}</DialogTitle>
          <DialogDescription>
            Changing status to <span className="font-semibold text-foreground">{newStatus.replace('_', ' ')}</span>.
            Add an optional message to communicate with the ticket submitter.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a note or request more information..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              This message will be visible to the student who submitted the ticket.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={isSubmitting}
          >
            Skip
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {message.trim() ? "Update & Send Message" : "Update Status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StatusUpdateDialog;

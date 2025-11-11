import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Paperclip, Upload, Download, Trash2, Loader2, FileText, Image as ImageIcon, File } from "lucide-react";

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  created_at: string;
  uploaded_by: string;
  profiles: {
    full_name: string;
  };
}

interface TicketAttachmentsProps {
  ticketId: string;
  userId: string;
  canUpload: boolean;
}

const TicketAttachments = ({ ticketId, userId, canUpload }: TicketAttachmentsProps) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAttachments();
    subscribeToAttachments();
  }, [ticketId]);

  const loadAttachments = async () => {
    const { data, error } = await supabase
      .from('ticket_attachments')
      .select(`
        *,
        profiles (full_name)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAttachments(data as any);
    }
  };

  const subscribeToAttachments = () => {
    const channel = supabase
      .channel(`attachments-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_attachments',
          filter: `ticket_id=eq.${ticketId}`
        },
        async (payload) => {
          const { data } = await supabase
            .from('ticket_attachments')
            .select(`
              *,
              profiles (full_name)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setAttachments(prev => [data as any, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Maximum file size is 10MB.",
      });
      return;
    }

    setUploading(true);
    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${ticketId}/${userId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('ticket-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('ticket-attachments')
        .getPublicUrl(fileName);

      // Save to database
      const { error: dbError } = await supabase
        .from('ticket_attachments')
        .insert({
          ticket_id: ticketId,
          uploaded_by: userId,
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type
        });

      if (dbError) throw dbError;

      toast({
        title: "File uploaded",
        description: "Your attachment has been added.",
      });

      // Clear input
      e.target.value = '';
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message || "Failed to upload file. Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    if (attachment.uploaded_by !== userId) {
      toast({
        variant: "destructive",
        title: "Cannot delete",
        description: "You can only delete your own attachments.",
      });
      return;
    }

    try {
      // Delete from storage
      const path = new URL(attachment.file_url).pathname.split('/').slice(-3).join('/');
      await supabase.storage
        .from('ticket-attachments')
        .remove([path]);

      // Delete from database
      const { error } = await supabase
        .from('ticket_attachments')
        .delete()
        .eq('id', attachment.id);

      if (error) throw error;

      setAttachments(prev => prev.filter(a => a.id !== attachment.id));
      
      toast({
        title: "File deleted",
        description: "Attachment has been removed.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "Failed to delete attachment. Please try again.",
      });
    }
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <File className="h-4 w-4" />;
    
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="h-4 w-4" />;
    } else if (fileType.includes('pdf') || fileType.includes('document')) {
      return <FileText className="h-4 w-4" />;
    }
    return <File className="h-4 w-4" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Paperclip className="h-5 w-5" />
          Attachments
        </CardTitle>
        <CardDescription>
          Files and images related to this issue
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Section */}
        {canUpload && (
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
            <Input
              type="file"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
              id="file-upload"
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              {uploading ? (
                <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              )}
              <p className="text-sm text-muted-foreground">
                {uploading ? "Uploading..." : "Click to upload or drag and drop"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Max file size: 10MB
              </p>
            </label>
          </div>
        )}

        {/* Attachments List */}
        <div className="space-y-2">
          {attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No attachments yet
            </p>
          ) : (
            attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getFileIcon(attachment.file_type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {attachment.file_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Uploaded by {attachment.profiles.full_name} on{' '}
                      {new Date(attachment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(attachment.file_url, '_blank')}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {attachment.uploaded_by === userId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(attachment)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TicketAttachments;

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, User, AlertCircle, CheckCircle2 } from "lucide-react";

interface HistoryItem {
  id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  profiles: {
    full_name: string;
  };
}

interface TicketTimelineProps {
  ticketId: string;
}

const TicketTimeline = ({ ticketId }: TicketTimelineProps) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    loadHistory();
  }, [ticketId]);

  const loadHistory = async () => {
    const { data, error } = await supabase
      .from('ticket_history')
      .select(`
        *,
        profiles (full_name)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setHistory(data as any);
    }
  };

  const formatFieldName = (field: string) => {
    return field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatValue = (field: string, value: string | null) => {
    if (!value) return 'None';
    
    if (field === 'status') {
      return value.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    if (field === 'priority') {
      return value.charAt(0).toUpperCase() + value.slice(1);
    }
    
    if (field === 'assigned_user_id') {
      return value === 'unassigned' ? 'Unassigned' : 'Team Member';
    }
    
    return value;
  };

  const getIcon = (field: string) => {
    if (field === 'status') return <CheckCircle2 className="h-4 w-4" />;
    if (field === 'priority') return <AlertCircle className="h-4 w-4" />;
    if (field === 'assigned_user_id') return <User className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  if (history.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((item, index) => (
            <div key={item.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                  {getIcon(item.field_name)}
                </div>
                {index !== history.length - 1 && (
                  <div className="w-px h-full bg-border mt-2" />
                )}
              </div>
              <div className="flex-1 pb-4">
                <p className="text-sm font-medium">
                  {formatFieldName(item.field_name)} changed
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  From <span className="font-medium">{formatValue(item.field_name, item.old_value)}</span>
                  {' '} to <span className="font-medium">{formatValue(item.field_name, item.new_value)}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  By {item.profiles.full_name} on{' '}
                  {new Date(item.created_at).toLocaleDateString()} at{' '}
                  {new Date(item.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TicketTimeline;

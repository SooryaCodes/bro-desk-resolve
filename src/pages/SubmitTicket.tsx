import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send, Sparkles, AlertTriangle, Upload, X, Paperclip } from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const SubmitTicket = () => {
  const [user, setUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [predictedCategory, setPredictedCategory] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [sentiment, setSentiment] = useState<any>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    category_id: "",
    title: "",
    description: "",
    location: "",
    is_anonymous: false,
    priority: "medium"
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }

      setUser(session.user);
      loadCategories();
    };

    initializeAuth();
  }, [navigate]);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');

    if (!error && data) {
      setCategories(data);
    }
  };

  const runAIAnalysis = async () => {
    if (!formData.title || !formData.description) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please enter title and description first",
      });
      return;
    }

    setAiLoading(true);
    try {
      const [categoryResult, duplicateResult, sentimentResult] = await Promise.all([
        supabase.functions.invoke('ai-ticket-analysis', {
          body: { type: 'predict_category', title: formData.title, description: formData.description }
        }),
        supabase.functions.invoke('ai-ticket-analysis', {
          body: { type: 'check_duplicates', title: formData.title, description: formData.description }
        }),
        supabase.functions.invoke('ai-ticket-analysis', {
          body: { type: 'analyze_sentiment', title: formData.title, description: formData.description }
        })
      ]);

      if (categoryResult.data?.predicted_category_id) {
        setFormData({ ...formData, category_id: categoryResult.data.predicted_category_id });
        setPredictedCategory(categoryResult.data.predicted_category_name);
        toast({
          title: "AI Suggestion",
          description: `Suggested category: ${categoryResult.data.predicted_category_name}`,
        });
      }

      if (duplicateResult.data?.duplicates && duplicateResult.data.duplicates.length > 0) {
        setDuplicates(duplicateResult.data.duplicates);
        toast({
          variant: "destructive",
          title: "Similar Tickets Found",
          description: `Found ${duplicateResult.data.duplicates.length} similar ticket(s). Please review before submitting.`,
        });
      } else {
        setDuplicates([]);
      }

      if (sentimentResult.data?.sentiment) {
        setSentiment(sentimentResult.data.sentiment);
        const urgencyToPriority: any = {
          low: 'low',
          medium: 'medium',
          high: 'high',
          urgent: 'urgent'
        };
        setFormData({ ...formData, priority: urgencyToPriority[sentimentResult.data.sentiment.urgency] || 'medium' });
      }

    } catch (error: any) {
      console.error('AI analysis error:', error);
      toast({
        variant: "destructive",
        title: "AI Analysis Failed",
        description: "You can still submit the ticket manually.",
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file sizes
    const invalidFiles = files.filter(f => f.size > 10 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Maximum file size is 10MB per file.",
      });
      return;
    }

    setAttachments(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAttachments = async (ticketId: string) => {
    if (attachments.length === 0) return;

    setUploading(true);
    try {
      for (const file of attachments) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${ticketId}/${user!.id}/${Date.now()}-${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('ticket-attachments')
          .getPublicUrl(fileName);

        const { error: dbError } = await supabase
          .from('ticket_attachments')
          .insert({
            ticket_id: ticketId,
            uploaded_by: user!.id,
            file_name: file.name,
            file_url: publicUrl,
            file_type: file.type
          });

        if (dbError) throw dbError;
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const { data: ticket, error } = await supabase
        .from('tickets')
        .insert({
          student_id: user.id,
          category_id: formData.category_id,
          title: formData.title,
          description: formData.description,
          location: formData.location || null,
          is_anonymous: formData.is_anonymous,
          priority: formData.priority as 'low' | 'medium' | 'high' | 'urgent',
          ticket_number: '', // Will be auto-generated by trigger
        })
        .select()
        .single();

      if (error) throw error;

      // Upload attachments if any
      if (ticket && attachments.length > 0) {
        await uploadAttachments(ticket.id);
      }

      toast({
        title: "Issue submitted!",
        description: attachments.length > 0 
          ? `Your complaint with ${attachments.length} attachment(s) has been submitted.`
          : "Your complaint has been submitted and will be reviewed soon.",
      });

      navigate('/dashboard');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to submit issue. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout user={user}>
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Report an Issue</h2>
          <p className="text-muted-foreground mt-2">
            Submit your complaint and we'll route it to the right team
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Issue Details</CardTitle>
            <CardDescription>
              Use AI Assist to auto-categorize and check for duplicates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {duplicates.length > 0 && (
              <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-2">Similar Tickets Found</h4>
                    <div className="space-y-2">
                      {duplicates.map((dup) => (
                        <div key={dup.id} className="text-sm">
                          <a
                            href={`/ticket/${dup.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {dup.ticket_number}: {dup.title}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {sentiment && (
              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">AI Sentiment Analysis</h4>
                    <p className="text-sm text-muted-foreground">
                      Sentiment: <span className="font-medium capitalize">{sentiment.sentiment}</span> | 
                      Urgency: <span className="font-medium capitalize">{sentiment.urgency}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{sentiment.reasoning}</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="category">
                  Category *
                  {predictedCategory && (
                    <span className="ml-2 text-xs text-primary font-normal">
                      (AI suggested: {predictedCategory})
                    </span>
                  )}
                </Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  required
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.category_id && (
                  <p className="text-xs text-muted-foreground">
                    {categories.find(c => c.id === formData.category_id)?.description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Brief summary of the issue"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Provide detailed information about the issue..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  disabled={loading}
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location (Optional)</Label>
                <Input
                  id="location"
                  placeholder="e.g., Building A, Room 203"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger id="priority">
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

              <div className="space-y-2">
                <Label htmlFor="attachments">Attachments (Optional)</Label>
                <div className="border-2 border-dashed border-border rounded-lg p-4">
                  <Input
                    type="file"
                    id="attachments"
                    onChange={handleFileSelect}
                    disabled={loading || uploading}
                    className="hidden"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    multiple
                  />
                  <label htmlFor="attachments" className="cursor-pointer block text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload files
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Max 10MB per file
                    </p>
                  </label>
                  
                  {attachments.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {attachments.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex items-center gap-2">
                            <Paperclip className="h-4 w-4" />
                            <span className="text-sm truncate">{file.name}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(index)}
                            disabled={loading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 p-4 border border-border rounded-lg bg-muted/30">
                <Switch
                  id="anonymous"
                  checked={formData.is_anonymous}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_anonymous: checked })}
                />
                <div className="flex-1">
                  <Label htmlFor="anonymous" className="cursor-pointer">
                    Submit anonymously
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your identity will be hidden from team members (admins can still see it)
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={runAIAnalysis}
                  disabled={loading || aiLoading}
                  className="flex-1 gap-2"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      AI Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      AI Assist
                    </>
                  )}
                </Button>
                <Button type="submit" disabled={loading || aiLoading} className="flex-1 gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Submit Issue
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SubmitTicket;

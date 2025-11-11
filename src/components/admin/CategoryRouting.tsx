import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Tag, ArrowRight } from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  team_id: string | null;
  created_at: string;
}

interface Team {
  id: string;
  name: string;
}

const CategoryRouting = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "",
    team_id: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [categoriesRes, teamsRes] = await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("teams").select("*").order("name"),
    ]);

    if (categoriesRes.data) setCategories(categoriesRes.data);
    if (teamsRes.data) setTeams(teamsRes.data);
  };

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        description: category.description || "",
        icon: category.icon || "",
        team_id: category.team_id || "",
      });
    } else {
      setEditingCategory(null);
      setFormData({ name: "", description: "", icon: "📋", team_id: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    try {
      if (editingCategory) {
        await supabase
          .from("categories")
          .update({
            name: formData.name,
            description: formData.description || null,
            icon: formData.icon || null,
            team_id: formData.team_id || null,
          })
          .eq("id", editingCategory.id);
        toast.success("Category updated successfully");
      } else {
        await supabase.from("categories").insert({
          name: formData.name,
          description: formData.description || null,
          icon: formData.icon || null,
          team_id: formData.team_id || null,
        });
        toast.success("Category created successfully");
      }

      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error("Failed to save category");
      console.error(error);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("Are you sure? This may affect existing tickets.")) return;

    try {
      await supabase.from("categories").delete().eq("id", categoryId);
      toast.success("Category deleted successfully");
      fetchData();
    } catch (error: any) {
      toast.error("Failed to delete category");
      console.error(error);
    }
  };

  const getTeamName = (teamId: string | null) => {
    if (!teamId) return null;
    return teams.find((t) => t.id === teamId)?.name;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Category Routing</h3>
          <p className="text-sm text-muted-foreground">
            Configure which teams handle specific ticket categories
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Routed To</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => {
              const teamName = getTeamName(category.team_id);
              return (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{category.icon}</span>
                      <span>{category.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {category.description || "-"}
                  </TableCell>
                  <TableCell>
                    {teamName ? (
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline">{teamName}</Badge>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">No team assigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(category)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCategory(category.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Create New Category"}</DialogTitle>
            <DialogDescription>
              {editingCategory ? "Update category and routing" : "Add a new ticket category"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Category Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., IT Support, Facilities"
              />
            </div>

            <div className="space-y-2">
              <Label>Icon (Emoji)</Label>
              <Input
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="e.g., 💻, 🔧, 🏢"
                maxLength={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this category"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Route to Team</Label>
              <Select
                value={formData.team_id}
                onValueChange={(value) => setFormData({ ...formData, team_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Team</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Tickets in this category will be automatically assigned to this team
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSaveCategory} className="flex-1">
                {editingCategory ? "Update" : "Create"} Category
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryRouting;

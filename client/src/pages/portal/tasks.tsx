import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Loader2, ClipboardCheck, Eye, Calendar } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link, useSearch } from "wouter";
import type { InspectionTask, Unit, User, InspectionType, TaskStatus } from "@shared/schema";

export default function TasksPage() {
  const { toast } = useToast();
  const searchParams = useSearch();
  const urlParams = new URLSearchParams(searchParams);
  const initialStatus = urlParams.get("status") || "all";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: "FULL_INSPECTION" as InspectionType,
    unitId: "",
    assignedToUserId: "",
    responsiblePmId: "",
    scheduledAt: "",
  });

  const { data: tasks, isLoading } = useQuery<InspectionTask[]>({
    queryKey: ["/api/inspection-tasks"],
  });

  const { data: units } = useQuery<Unit[]>({
    queryKey: ["/api/units"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const cleaners = users?.filter((u) => u.role === "CLEANER" || u.role === "INSPECTOR") || [];
  const pms = users?.filter((u) => u.role === "PM" || u.role === "ADMIN") || [];

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/inspection-tasks", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspection-tasks"] });
      toast({ title: "Task Created", description: "The inspection task has been created." });
      handleCloseDialog();
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const filteredTasks = tasks?.filter((task) => {
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesType = typeFilter === "all" || task.type === typeFilter;
    return matchesStatus && matchesType;
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setFormData({
      type: "FULL_INSPECTION",
      unitId: "",
      assignedToUserId: "",
      responsiblePmId: "",
      scheduledAt: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const getStatusBadge = (status: TaskStatus) => {
    const variants: Record<TaskStatus, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      ASSIGNED: { variant: "secondary", label: "Assigned" },
      IN_PROGRESS: { variant: "default", label: "In Progress" },
      SUBMITTED: { variant: "outline", label: "Submitted" },
      REVIEWED: { variant: "secondary", label: "Reviewed" },
      ARCHIVED: { variant: "secondary", label: "Archived" },
    };
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getUnitName = (unitId: string) => {
    const unit = units?.find((u) => u.id === unitId);
    return unit ? `${unit.propertyName} - ${unit.unitNumber}` : unitId.slice(0, 8);
  };

  const getUserName = (userId: string) => {
    const user = users?.find((u) => u.id === userId);
    return user?.name || userId.slice(0, 8);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Inspection Tasks</h1>
          <p className="text-muted-foreground">Manage inspection assignments</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-task">
          <Plus className="mr-2 h-4 w-4" />
          Create Task
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
                data-testid="input-search"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-36" data-testid="select-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="ASSIGNED">Assigned</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="SUBMITTED">Submitted</SelectItem>
                  <SelectItem value="REVIEWED">Reviewed</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-40" data-testid="select-type">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="FULL_INSPECTION">Full Inspection</SelectItem>
                  <SelectItem value="ONBOARDING">Onboarding</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTasks?.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No tasks found</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="hidden md:table-cell">Assigned To</TableHead>
                    <TableHead className="hidden lg:table-cell">PM</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks?.map((task) => (
                    <TableRow key={task.id} data-testid={`task-row-${task.id}`}>
                      <TableCell>
                        <Badge variant="outline">
                          {task.type === "FULL_INSPECTION" ? "Full" : "Onboard"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{getUnitName(task.unitId)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {getUserName(task.assignedToUserId)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {task.responsiblePmId ? getUserName(task.responsiblePmId) : "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(task.status)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {new Date(task.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/portal/tasks/${task.id}`}>
                          <Button variant="ghost" size="icon" data-testid={`button-view-${task.id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Inspection Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Inspection Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v as InspectionType })}
              >
                <SelectTrigger data-testid="select-task-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FULL_INSPECTION">Full Inspection</SelectItem>
                  <SelectItem value="ONBOARDING">Onboarding</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unit *</Label>
              <Select
                value={formData.unitId}
                onValueChange={(v) => setFormData({ ...formData, unitId: v })}
              >
                <SelectTrigger data-testid="select-task-unit">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {units?.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.propertyName} - {unit.unitNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assign To *</Label>
              <Select
                value={formData.assignedToUserId}
                onValueChange={(v) => setFormData({ ...formData, assignedToUserId: v })}
              >
                <SelectTrigger data-testid="select-task-assignee">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {cleaners?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsible PM</Label>
              <Select
                value={formData.responsiblePmId}
                onValueChange={(v) => setFormData({ ...formData, responsiblePmId: v })}
              >
                <SelectTrigger data-testid="select-task-pm">
                  <SelectValue placeholder="Select PM (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {pms?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Scheduled Date</Label>
              <Input
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                data-testid="input-scheduled"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || !formData.unitId || !formData.assignedToUserId}
                data-testid="button-create-task"
              >
                {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

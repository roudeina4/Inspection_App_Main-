import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Settings2,
  Zap,
  CheckSquare,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import type { WorkflowPhase, WorkflowSubTask } from "@shared/schema";

type PhaseWithSubTasks = WorkflowPhase & { subTasks: WorkflowSubTask[] };

export default function WorkflowBuilderPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [expandedPhaseId, setExpandedPhaseId] = useState<string | null>(null);
  const [addPhaseOpen, setAddPhaseOpen] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");
  const [newPhaseType, setNewPhaseType] = useState<"MANUAL" | "SYSTEM">("MANUAL");
  const [addSubTaskPhaseId, setAddSubTaskPhaseId] = useState<string | null>(null);
  const [newSubTaskName, setNewSubTaskName] = useState("");
  const [editingPhase, setEditingPhase] = useState<PhaseWithSubTasks | null>(null);
  const [editPhaseName, setEditPhaseName] = useState("");

  const { data: phases = [], isLoading } = useQuery<PhaseWithSubTasks[]>({
    queryKey: ["/api/workflow-phases"],
  });

  const seedMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/workflow-phases/seed"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-phases"] });
      toast({ title: "Default phases created" });
    },
  });

  const createPhaseMutation = useMutation({
    mutationFn: (data: { name: string; phaseType: string; sortOrder: number }) =>
      apiRequest("POST", "/api/workflow-phases", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-phases"] });
      setAddPhaseOpen(false);
      setNewPhaseName("");
      toast({ title: "Phase created" });
    },
  });

  const updatePhaseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/workflow-phases/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-phases"] });
      setEditingPhase(null);
      toast({ title: "Phase updated" });
    },
  });

  const deletePhaseMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/workflow-phases/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-phases"] });
      toast({ title: "Phase deleted" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) =>
      apiRequest("PATCH", "/api/workflow-phases/reorder", { orderedIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-phases"] });
    },
  });

  const createSubTaskMutation = useMutation({
    mutationFn: ({ phaseId, name, sortOrder }: { phaseId: string; name: string; sortOrder: number }) =>
      apiRequest("POST", `/api/workflow-phases/${phaseId}/sub-tasks`, { name, sortOrder }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-phases"] });
      setAddSubTaskPhaseId(null);
      setNewSubTaskName("");
      toast({ title: "Sub-task added" });
    },
  });

  const deleteSubTaskMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/workflow-sub-tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflow-phases"] });
      toast({ title: "Sub-task deleted" });
    },
  });

  const movePhase = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= phases.length) return;
    const ids = phases.map(p => p.id);
    [ids[index], ids[newIndex]] = [ids[newIndex], ids[index]];
    reorderMutation.mutate(ids);
  };

  if (user?.role !== "ADMIN" && user?.role !== "PM") {
    return <div className="p-6 text-center">Access denied</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setLocation("/pm/dashboard")} data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold" data-testid="text-page-title">Workflow Phase Builder</h1>
                <p className="text-sm text-muted-foreground">Configure the onboarding workflow phases</p>
              </div>
            </div>
            <div className="flex gap-2">
              {phases.length === 0 && (
                <Button variant="outline" size="sm" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending} data-testid="button-seed-defaults">
                  <Zap className="w-4 h-4 mr-2" />
                  Load Defaults
                </Button>
              )}
              <Button size="sm" onClick={() => setAddPhaseOpen(true)} data-testid="button-add-phase">
                <Plus className="w-4 h-4 mr-2" />
                Add Phase
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-3">
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-lg" />)}
          </div>
        ) : phases.length === 0 ? (
          <Card className="p-8 text-center">
            <Settings2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <p className="font-medium">No workflow phases configured</p>
            <p className="text-sm text-muted-foreground mt-1">Click "Load Defaults" to start with the standard 7-phase workflow, or add custom phases.</p>
          </Card>
        ) : (
          phases.map((phase, index) => {
            const isExpanded = expandedPhaseId === phase.id;
            return (
              <Card key={phase.id} className="overflow-hidden" data-testid={`phase-card-${phase.id}`}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => movePhase(index, "up")}
                      disabled={index === 0}
                      className="p-0.5 hover:bg-muted rounded disabled:opacity-20"
                      data-testid={`button-move-up-${phase.id}`}
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => movePhase(index, "down")}
                      disabled={index === phases.length - 1}
                      className="p-0.5 hover:bg-muted rounded disabled:opacity-20"
                      data-testid={`button-move-down-${phase.id}`}
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-500/10 text-teal-600 font-bold text-sm shrink-0">
                    {index + 1}
                  </div>

                  <button
                    className="flex-1 text-left"
                    onClick={() => setExpandedPhaseId(isExpanded ? null : phase.id)}
                    data-testid={`button-expand-phase-${phase.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{phase.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {phase.phaseType === "SYSTEM" ? "Auto" : "Manual"}
                      </Badge>
                      {phase.systemKey && (
                        <Badge variant="secondary" className="text-[10px]">
                          {phase.systemKey}
                        </Badge>
                      )}
                    </div>
                    {phase.subTasks.length > 0 && (
                      <p className="text-[11px] text-muted-foreground">{phase.subTasks.length} sub-tasks</p>
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      className="p-1.5 hover:bg-muted rounded"
                      onClick={() => {
                        setEditingPhase(phase);
                        setEditPhaseName(phase.name);
                      }}
                      data-testid={`button-edit-phase-${phase.id}`}
                    >
                      <Settings2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      className="p-1.5 hover:bg-red-50 rounded text-red-500"
                      onClick={() => {
                        if (confirm("Delete this phase?")) deletePhaseMutation.mutate(phase.id);
                      }}
                      data-testid={`button-delete-phase-${phase.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t px-4 py-3 bg-muted/20">
                    {phase.phaseType === "SYSTEM" ? (
                      <p className="text-sm text-muted-foreground italic">This phase is auto-tracked by the system based on inspection/report status.</p>
                    ) : (
                      <>
                        <div className="space-y-2">
                          {phase.subTasks.map(st => (
                            <div key={st.id} className="flex items-center gap-2 py-1" data-testid={`subtask-row-${st.id}`}>
                              <CheckSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                              <span className="text-sm flex-1">{st.name}</span>
                              <button
                                className="p-1 hover:bg-red-50 rounded text-red-400"
                                onClick={() => {
                                  if (confirm("Delete this sub-task?")) deleteSubTaskMutation.mutate(st.id);
                                }}
                                data-testid={`button-delete-subtask-${st.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 text-teal-600"
                          onClick={() => {
                            setAddSubTaskPhaseId(phase.id);
                            setNewSubTaskName("");
                          }}
                          data-testid={`button-add-subtask-${phase.id}`}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Sub-task
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={addPhaseOpen} onOpenChange={setAddPhaseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Workflow Phase</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Phase Name</label>
              <Input
                value={newPhaseName}
                onChange={e => setNewPhaseName(e.target.value)}
                placeholder="e.g., Final Walkthrough"
                data-testid="input-phase-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Phase Type</label>
              <Select value={newPhaseType} onValueChange={(v: "MANUAL" | "SYSTEM") => setNewPhaseType(v)}>
                <SelectTrigger data-testid="select-phase-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">Manual (PM checks off sub-tasks)</SelectItem>
                  <SelectItem value="SYSTEM">System (auto-tracked)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddPhaseOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!newPhaseName.trim()) return;
                createPhaseMutation.mutate({ name: newPhaseName.trim(), phaseType: newPhaseType, sortOrder: phases.length });
              }}
              disabled={!newPhaseName.trim() || createPhaseMutation.isPending}
              data-testid="button-confirm-add-phase"
            >
              Add Phase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!addSubTaskPhaseId} onOpenChange={() => setAddSubTaskPhaseId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Sub-task</DialogTitle>
          </DialogHeader>
          <Input
            value={newSubTaskName}
            onChange={e => setNewSubTaskName(e.target.value)}
            placeholder="e.g., Schedule handyman"
            data-testid="input-subtask-name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSubTaskPhaseId(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!newSubTaskName.trim() || !addSubTaskPhaseId) return;
                const phase = phases.find(p => p.id === addSubTaskPhaseId);
                createSubTaskMutation.mutate({
                  phaseId: addSubTaskPhaseId,
                  name: newSubTaskName.trim(),
                  sortOrder: phase?.subTasks.length ?? 0,
                });
              }}
              disabled={!newSubTaskName.trim() || createSubTaskMutation.isPending}
              data-testid="button-confirm-add-subtask"
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingPhase} onOpenChange={() => setEditingPhase(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Phase</DialogTitle>
          </DialogHeader>
          <Input
            value={editPhaseName}
            onChange={e => setEditPhaseName(e.target.value)}
            data-testid="input-edit-phase-name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPhase(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!editPhaseName.trim() || !editingPhase) return;
                updatePhaseMutation.mutate({ id: editingPhase.id, data: { name: editPhaseName.trim() } });
              }}
              disabled={!editPhaseName.trim() || updatePhaseMutation.isPending}
              data-testid="button-confirm-edit-phase"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

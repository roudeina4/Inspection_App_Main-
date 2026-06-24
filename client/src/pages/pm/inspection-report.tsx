import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { StatusPill } from "@/components/portal";
import {
  ArrowLeft,
  CheckCircle2,
  FileWarning,
  Download,
  MoreVertical,
  CheckSquare,
  Send,
  MessageSquarePlus,
  Play,
  Image,
  MapPin,
  Hash,
  ChevronRight,
  Home,
  Key,
  Link as LinkIcon,
  Copy,
  ClipboardList,
  Loader2,
  Calendar,
  Wifi,
  Building,
  Car,
  FileText,
  Thermometer,
  Shield,
  Bed,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { OwnerReportBuilderContent } from "./owner-report-builder";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type {
  InspectionTask,
  Unit,
  ChecklistResponse,
  Media,
  InspectionTemplate,
  TemplateRoom,
  PmNote,
  OwnerOnboarding,
  WorkflowPhase,
  WorkflowSubTask,
  UnitOnboardingChecklist,
} from "@shared/schema";
import WorkflowSidebar, { MobileWorkflowTrigger } from "@/components/workflow-sidebar";
import { derivePhaseStatuses } from "@/lib/workflow-phases";
import type { PhaseWithStatus, AnnotatedSubTask } from "@/lib/workflow-phases";

interface InspectorInfo {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface InspectionDetails {
  task: InspectionTask;
  unit: Unit | null;
  responses: ChecklistResponse[];
  media: Media[];
  inspector: InspectorInfo | null;
  pm: InspectorInfo | null;
  template: InspectionTemplate | null;
}

function ManualPhaseContent({ phase, unitId }: { phase: PhaseWithStatus; unitId: string }) {
  const toggleMutation = useMutation({
    mutationFn: async ({ subTaskId, completed }: { subTaskId: string; completed: boolean }) => {
      return apiRequest("PATCH", `/api/units/${unitId}/onboarding-checklist/${subTaskId}`, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units", unitId, "onboarding-checklist"] });
    },
  });

  const completedCount = phase.phase.subTasks.filter((st: AnnotatedSubTask) => st._completed).length;
  const totalCount = phase.phase.subTasks.length;

  return (
    <section data-testid={`manual-phase-content-${phase.phase.id}`}>
      <div className="mb-6">
        <h2 className="text-lg font-semibold">{phase.phase.name}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {completedCount} of {totalCount} tasks completed
        </p>
        {totalCount > 0 && (
          <div className="relative h-2 w-full max-w-md rounded-full bg-muted overflow-hidden mt-3">
            <div
              className="absolute left-0 top-0 h-full bg-teal-500 rounded-full transition-all"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        )}
      </div>

      <div className="space-y-2 max-w-lg">
        {phase.phase.subTasks.map((st: AnnotatedSubTask, idx: number) => (
          <Card key={st.id} className={`p-4 transition-colors ${st._completed ? "bg-muted/30" : ""}`} data-testid={`manual-task-${st.id}`}>
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={st._completed}
                onCheckedChange={(checked) => {
                  toggleMutation.mutate({ subTaskId: st.id, completed: !!checked });
                }}
                disabled={toggleMutation.isPending}
                className="shrink-0"
                data-testid={`checkbox-manual-task-${st.id}`}
              />
              <span className={`text-sm font-medium ${st._completed ? "line-through text-muted-foreground" : ""}`}>
                {st.name}
              </span>
            </label>
          </Card>
        ))}
      </div>

      {totalCount === 0 && (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground text-center">No tasks configured for this phase.</p>
        </Card>
      )}
    </section>
  );
}

export default function InspectionReportPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/pm/inspection/:inspectionId");
  const inspectionId = params?.inspectionId;
  const [addNoteOpen, setAddNoteOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [showCreateOnboarding, setShowCreateOnboarding] = useState(false);
  const [onboardingOwnerName, setOnboardingOwnerName] = useState("");
  const [onboardingOwnerEmail, setOnboardingOwnerEmail] = useState("");
  const { toast } = useToast();
  const [expandedRooms, setExpandedRooms] = useState<Record<string, boolean>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const phaseFromUrl = urlParams.get("phase");
  const [activePhase, setActivePhase] = useState<number>(
    phaseFromUrl ? parseInt(phaseFromUrl, 10) || 0 : 0
  );

  const changePhase = (phase: number) => {
    setActivePhase(phase);
    const url = new URL(window.location.href);
    url.searchParams.set("phase", String(phase));
    window.history.replaceState({}, "", url.toString());
  };

  // Fetch inspection details
  const { data: details, isLoading } = useQuery<InspectionDetails>({
    queryKey: ["/api/inspection-tasks", inspectionId, "details"],
    enabled: !!inspectionId,
  });

  // Fetch PM notes for the unit
  const { data: pmNotes } = useQuery<PmNote[]>({
    queryKey: ["/api/units", details?.unit?.id, "pm-notes"],
    enabled: !!details?.unit?.id,
  });

  // Update task status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      return apiRequest("PATCH", `/api/inspection-tasks/${inspectionId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspection-tasks", inspectionId, "details"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inspection-tasks"] });
    },
  });

  // Add PM note mutation
  const addNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/units/${details?.unit?.id}/pm-notes`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units", details?.unit?.id, "pm-notes"] });
      setNewNote("");
      setAddNoteOpen(false);
    },
  });

  // Owner Onboarding (only for ONBOARDING inspections)
  const unitId = details?.unit?.id;
  const { data: onboardings, isLoading: onboardingsLoading } = useQuery<OwnerOnboarding[]>({
    queryKey: ["/api/owner-onboardings/unit", unitId],
    enabled: !!unitId && details?.task?.type === "ONBOARDING",
  });

  const createOnboardingMutation = useMutation({
    mutationFn: async (data: { unitId: string; ownerName: string; ownerEmail: string }) => {
      return apiRequest("POST", "/api/owner-onboardings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner-onboardings/unit", unitId] });
      setShowCreateOnboarding(false);
      setOnboardingOwnerName("");
      setOnboardingOwnerEmail("");
      toast({ title: "Onboarding link created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create onboarding link", variant: "destructive" });
    },
  });

  const copyOnboardingLink = (token: string) => {
    const url = `${window.location.origin}/onboarding/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "Link copied to clipboard" });
    });
  };

  const { data: ownerReportData } = useQuery<any>({
    queryKey: ["/api/owner-reports/by-inspection", inspectionId],
    enabled: !!inspectionId,
  });
  const ownerReport = ownerReportData?.report;
  const ownerReportCategories = ownerReportData?.categories || [];
  const goodCategoryId = ownerReportCategories.find((c: any) => c.name === "Good")?.id;
  const ownerReportItems = (ownerReportData?.items || []).filter((item: any) => item.categoryId !== goodCategoryId);

  const isOnboarding = details?.task?.type === "ONBOARDING";

  const { data: workflowPhasesRaw } = useQuery<(WorkflowPhase & { subTasks: WorkflowSubTask[] })[]>({
    queryKey: ["/api/workflow-phases"],
    enabled: !!isOnboarding,
  });

  const { data: unitChecklist } = useQuery<UnitOnboardingChecklist[]>({
    queryKey: ["/api/units", unitId, "onboarding-checklist"],
    enabled: !!unitId && !!isOnboarding,
  });

  useEffect(() => {
    if (isOnboarding && workflowPhasesRaw && workflowPhasesRaw.length === 0) {
      apiRequest("POST", "/api/workflow-phases/seed").then(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/workflow-phases"] });
      }).catch(() => {});
    }
  }, [isOnboarding, workflowPhasesRaw]);

  const workflowPhases = workflowPhasesRaw && unitChecklist
    ? derivePhaseStatuses({
        phases: workflowPhasesRaw,
        checklist: unitChecklist || [],
        task: details?.task || null,
        ownerReport: ownerReport || null,
        ownerReportItems: ownerReportItems || [],
        onboardings: onboardings || [],
      })
    : [];

  const isPhaseAccessible = (phaseIndex: number): boolean => {
    if (!isOnboarding || workflowPhases.length === 0) return phaseIndex === 0;
    const phase = workflowPhases[phaseIndex];
    if (!phase) return false;
    return phase.status !== "locked";
  };

  useEffect(() => {
    if (isLoading || !details) return;
    if (!isPhaseAccessible(activePhase)) {
      changePhase(0);
    }
  }, [workflowPhases, activePhase, isLoading, details]);

  const handlePhaseClick = (phaseIndex: number) => {
    if (isPhaseAccessible(phaseIndex)) {
      changePhase(phaseIndex);
    }
  };

  const publishMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/owner-reports/${ownerReport?.id}/publish`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner-reports/by-inspection", inspectionId] });
      toast({ title: "Report published to owner" });
    },
    onError: () => {
      toast({ title: "Failed to publish report", variant: "destructive" });
    },
  });

  const updateItemStatusMutation = useMutation({
    mutationFn: async ({ itemId, issueStatus, pmNote }: { itemId: string; issueStatus: string; pmNote?: string }) => {
      return apiRequest("PATCH", `/api/owner-report-items/${itemId}/status`, { issueStatus, pmNote });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner-reports/by-inspection", inspectionId] });
      toast({ title: "Issue status updated" });
    },
  });

  if (!user || (user.role !== "PM" && user.role !== "ADMIN")) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Access denied. PM or Admin role required.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!details?.task) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Inspection not found.</p>
        <Button variant="ghost" onClick={() => setLocation("/pm/dashboard")} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const { task, unit, responses, media, inspector, template } = details;

  // Calculate summary stats
  const goodCount = responses.filter((r) => r.result === "GOOD" || r.result === "PASS").length;
  const replacementCount = responses.filter((r) => r.result === "NEED_REPLACEMENT").length;
  const missingCount = responses.filter((r) => r.result === "MISSING").length;
  const damagesCount = responses.filter((r) => r.result === "FAIL").length;

  // Check completion status
  // All responses have been recorded (at least one response exists)
  const hasResponses = responses.length > 0;
  // Check if all responses have a valid result (not just empty)
  const allItemsAnswered = responses.every((r) => r.result && r.result !== "NA");
  const checklistComplete = hasResponses && allItemsAnswered;
  
  // Media is complete if all responses that require media have it satisfied
  // requiredMediaSatisfied = true means required media has been uploaded
  const mediaComplete = responses.every((r) => r.requiredMediaSatisfied === true);

  // Get media for a specific response
  const getMediaForResponse = (responseId: string) => {
    return media.filter((m) => m.checklistResponseId === responseId);
  };

  // Get room name from template or key
  const getRoomName = (roomKey: string) => {
    if (template?.rooms) {
      const room = (template.rooms as TemplateRoom[]).find((r) => r.key === roomKey);
      if (room) return room.name;
    }
    return roomKey.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Get item label from template or key
  const getItemLabel = (roomKey: string, itemKey: string) => {
    if (template?.rooms) {
      const room = (template.rooms as TemplateRoom[]).find((r) => r.key === roomKey);
      if (room) {
        const item = room.items.find((i) => i.key === itemKey);
        if (item) return item.label;
      }
    }
    return itemKey.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Get status color for result
  const getResultColor = (result: string) => {
    switch (result) {
      case "GOOD":
      case "PASS":
      case "YES":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
      case "NEED_REPLACEMENT":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "MISSING":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "FAIL":
      case "NO":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "NA":
        return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const parseNoteField = (notes: string, field: string): string | null => {
    const knownFields = ["Condition", "Exists", "Count", "Issues", "Action", "Model#", "Location", "Notes"];
    const fieldPattern = knownFields.filter((f) => f !== field).map((f) => `${f}:`).join("|");
    const regex = new RegExp(`${field.replace("#", "\\#")}:\\s*(.+?)(?:\\s*(?:${fieldPattern})\\s*|$)`);
    const match = notes?.match(regex);
    if (!match) return null;
    const val = match[1].replace(/\.\s*$/, "").trim();
    return val || null;
  };

  const damageItems = responses.filter((r) => r.result === "FAIL");
  const missingItems = responses.filter((r) => r.result === "MISSING");
  const replacementItems = responses.filter((r) => r.result === "NEED_REPLACEMENT");
  const goodItems = responses.filter((r) => r.result === "GOOD" || r.result === "PASS");
  const locationItems = responses.filter((r) => r.notes && parseNoteField(r.notes, "Location"));
  const modelNumberItems = responses.filter((r) => r.notes && parseNoteField(r.notes, "Model#"));

  const toggleRoom = (key: string) => {
    setExpandedRooms((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const roomGroups = (() => {
    const groups: Record<string, ChecklistResponse[]> = {};
    responses.forEach((r) => {
      if (!groups[r.roomKey]) groups[r.roomKey] = [];
      groups[r.roomKey].push(r);
    });
    return Object.entries(groups).map(([roomKey, items]) => {
      const issueCount = items.filter(
        (r) => r.result === "FAIL" || r.result === "MISSING" || r.result === "NEED_REPLACEMENT" || r.result === "NO"
      ).length;
      const allGood = issueCount === 0;
      return { roomKey, roomName: getRoomName(roomKey), items, issueCount, allGood };
    });
  })();

  const keyTypeLabels: Record<string, string> = {
    front_door: "Front Door",
    fob: "Fob",
    parking_clicker: "Parking Clicker",
    mail_key: "Mail Key",
  };
  const parsedKeyTypes: string[] = (() => {
    try { return task.keyTypes ? JSON.parse(task.keyTypes) : []; } catch { return []; }
  })();
  const parsedBathroomTypes: string[] = (() => {
    try { return task.bathroomTypes ? JSON.parse(task.bathroomTypes) : []; } catch { return []; }
  })();

  const canDownloadPdf = task.status === "SUBMITTED" || task.status === "REVIEWED" || task.status === "ARCHIVED";
  const canMarkReviewed = task.status === "SUBMITTED";
  const canMarkSent = task.status === "REVIEWED";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="w-full px-3 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/pm/dashboard")}
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold" data-testid="text-inspection-title">
                  {task.type === "FULL_INSPECTION" ? "Full Inspection" : "Onboarding Inspection"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {unit ? `${unit.propertyName} - ${unit.unitNumber}` : "Unknown Unit"}
                </p>
              </div>
            </div>

            {/* PM Controls */}
            <div className="flex items-center gap-2">
              {canDownloadPdf && (
                <>
                  {ownerReport?.publishedAt && (
                    <Badge variant="outline" className="border-teal-300 text-teal-700 bg-teal-50 px-3 py-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                      Published
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/api/pm/inspections/${inspectionId}/pdf`, "_blank")}
                    data-testid="button-download-pdf"
                  >
                    <Download className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Download PDF</span>
                  </Button>
                </>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" data-testid="button-actions">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canMarkReviewed && (
                    <DropdownMenuItem
                      onClick={() => updateStatusMutation.mutate("REVIEWED")}
                      data-testid="action-mark-reviewed"
                    >
                      <CheckSquare className="w-4 h-4 mr-2" />
                      Mark Reviewed
                    </DropdownMenuItem>
                  )}
                  {canMarkSent && (
                    <DropdownMenuItem
                      onClick={() => updateStatusMutation.mutate("ARCHIVED")}
                      data-testid="action-mark-sent"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Mark Sent
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => setAddNoteOpen(true)}
                    data-testid="action-add-note"
                  >
                    <MessageSquarePlus className="w-4 h-4 mr-2" />
                    Add PM Note
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className={isOnboarding && workflowPhases.length > 0 ? "flex h-[calc(100vh-73px)]" : ""}>
        {isOnboarding && workflowPhases.length > 0 && unitId && (
          <div className="hidden md:block shrink-0 h-full">
            <WorkflowSidebar
              phases={workflowPhases}
              unitId={unitId}
              activePhase={activePhase}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
              onPhaseClick={handlePhaseClick}
            />
          </div>
        )}

      <div className={`${isOnboarding && workflowPhases.length > 0 ? (activePhase === 2 || activePhase === 3 ? "flex-1 overflow-hidden flex flex-col" : "flex-1 overflow-y-auto") : ""} w-full px-1 py-2 md:px-2 md:py-3 space-y-3 md:space-y-4`}>
        {isOnboarding && workflowPhases.length > 0 && unitId && (
          <MobileWorkflowTrigger phases={workflowPhases} unitId={unitId} activePhase={activePhase} onPhaseClick={handlePhaseClick} />
        )}

        {activePhase === 0 && (
          <div className="flex-1 overflow-y-auto">
            {task.type === "ONBOARDING" && (
              <section data-testid="section-owner-questionnaire-phase" className="space-y-5">
                {onboardingsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !onboardings || onboardings.length === 0 ? (
                  <Card className="p-6">
                    <div className="text-center py-6 text-muted-foreground">
                      <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-40" />
                      <p className="text-base font-medium">No onboarding links created yet</p>
                      <p className="text-sm mt-1.5">Create a link to send to the property owner for unit onboarding.</p>
                      <Button
                        className="mt-4"
                        onClick={() => setShowCreateOnboarding(true)}
                        data-testid="button-create-onboarding-phase1"
                      >
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Create Onboarding Link
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <>
                    {onboardings.map((ob) => {
                      const hasResponses = ob.responses && Object.keys(ob.responses as Record<string, any>).length > 0;
                      return (
                        <div key={ob.id} className="space-y-4" data-testid={`onboarding-card-phase1-${ob.id}`}>
                          <Card className="p-4">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center shrink-0">
                                  <ClipboardList className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-base font-semibold">{ob.ownerName || "No name provided"}</span>
                                    <Badge
                                      variant={ob.status === "COMPLETED" ? "default" : ob.status === "IN_PROGRESS" ? "secondary" : "outline"}
                                      className={ob.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0" : ""}
                                    >
                                      {ob.status === "COMPLETED" ? "Completed" : ob.status === "IN_PROGRESS" ? "In Progress" : "Pending"}
                                    </Badge>
                                    {ob.propertyType && (
                                      <Badge variant="outline" className="text-xs">
                                        {ob.propertyType === "HOUSE" ? "House" : "Unit"}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Created {new Date(ob.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                    {ob.completedAt && (
                                      <> &middot; Completed {new Date(ob.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyOnboardingLink(ob.shareToken)}
                                >
                                  <Copy className="h-4 w-4 sm:mr-1.5" />
                                  <span className="hidden sm:inline">Copy Link</span>
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowCreateOnboarding(true)}
                                  data-testid="button-create-onboarding-phase1"
                                >
                                  <LinkIcon className="h-4 w-4 sm:mr-1.5" />
                                  <span className="hidden sm:inline">New Link</span>
                                </Button>
                              </div>
                            </div>

                            {ob.status === "IN_PROGRESS" && (
                              <div className="mt-3">
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                  <div
                                    className="bg-teal-500 h-1.5 rounded-full transition-all"
                                    style={{ width: `${Math.min(100, ((ob.currentStep + 1) / (ob.propertyType === "HOUSE" ? 13 : 12)) * 100)}%` }}
                                  />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Step {ob.currentStep + 1} of {ob.propertyType === "HOUSE" ? 13 : 12}</p>
                              </div>
                            )}
                          </Card>

                          {hasResponses ? (
                            <OwnerResponsesView responses={ob.responses as Record<string, any>} propertyType={ob.propertyType} />
                          ) : (
                            <Card className="p-5">
                              <div className="text-center text-muted-foreground py-3">
                                <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                <p className="text-sm">No responses yet. The owner hasn't started the questionnaire.</p>
                              </div>
                            </Card>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </section>
            )}
          </div>
        )}

        {activePhase === 2 && inspectionId && (
          <div className="flex-1 min-h-0">
            <OwnerReportBuilderContent inspectionId={inspectionId} initialTab="review" embedded splitView />
          </div>
        )}
        {activePhase === 3 && inspectionId && (
          <OwnerReportBuilderContent inspectionId={inspectionId} initialTab="responses" embedded />
        )}

        {activePhase >= 4 && isOnboarding && workflowPhases.length > activePhase && unitId && (
          <ManualPhaseContent phase={workflowPhases[activePhase]} unitId={unitId} />
        )}

        {(activePhase === 1 || !isOnboarding) && (
        <>
        {/* 1. Executive Summary */}
        <section data-testid="section-executive-summary">
          <div className="flex flex-wrap gap-6 text-sm mb-4">
            <div>
              <span className="text-muted-foreground">Unit:</span>{" "}
              <span className="font-medium">{unit ? `${unit.propertyName} - ${unit.unitNumber}` : "N/A"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Date:</span>{" "}
              <span className="font-medium">{new Date(task.createdAt).toLocaleDateString()}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Inspector:</span>{" "}
              <span className="font-medium">{inspector?.name || "N/A"}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Status:</span>{" "}
              <StatusPill status={task.status} />
            </div>
          </div>

          <div data-testid="summary-stats">
            <div className="flex items-center justify-between gap-4 mb-2 flex-wrap">
              <div className="flex gap-4 flex-wrap text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="font-semibold" data-testid="count-good">{goodCount}</span> Good
                </span>
                {damagesCount > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                    <span className="font-semibold" data-testid="count-damages">{damagesCount}</span> Damages
                  </span>
                )}
                {missingCount > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    <span className="font-semibold" data-testid="count-missing">{missingCount}</span> Missing
                  </span>
                )}
                {replacementCount > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    <span className="font-semibold" data-testid="count-replacement">{replacementCount}</span> Replacement
                  </span>
                )}
              </div>
              <span className="text-sm text-muted-foreground">{responses.length} items total</span>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground" data-testid="text-progress-ratio">
                Good / No Issues &middot; {responses.length > 0 ? Math.round((goodCount / responses.length) * 100) : 0}%
              </p>
              <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden" data-testid="progress-bar">
                <div
                  className="absolute left-0 top-0 h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${responses.length > 0 ? (goodCount / responses.length) * 100 : 0}%` }}
                />
                {damagesCount > 0 && (
                  <div
                    className="absolute top-0 h-full bg-orange-500 transition-all"
                    style={{
                      left: `${responses.length > 0 ? (goodCount / responses.length) * 100 : 0}%`,
                      width: `${responses.length > 0 ? (damagesCount / responses.length) * 100 : 0}%`,
                    }}
                  />
                )}
                {missingCount > 0 && (
                  <div
                    className="absolute top-0 h-full bg-red-500 transition-all"
                    style={{
                      left: `${responses.length > 0 ? ((goodCount + damagesCount) / responses.length) * 100 : 0}%`,
                      width: `${responses.length > 0 ? (missingCount / responses.length) * 100 : 0}%`,
                    }}
                  />
                )}
                {replacementCount > 0 && (
                  <div
                    className="absolute top-0 h-full bg-amber-500 rounded-r-full transition-all"
                    style={{
                      left: `${responses.length > 0 ? ((goodCount + damagesCount + missingCount) / responses.length) * 100 : 0}%`,
                      width: `${responses.length > 0 ? (replacementCount / responses.length) * 100 : 0}%`,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 2. Unit Documentation */}
        {task.type === "ONBOARDING" && (
          <section data-testid="section-unit-documentation">
            <h2 className="text-lg font-semibold mb-4">Unit Documentation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4" data-testid="card-unit-config">
                <div className="flex items-center gap-2 mb-3">
                  <Home className="w-4 h-4 text-primary" />
                  <h3 className="font-medium text-sm">Unit Configuration</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bedrooms</span>
                    <span className="font-medium">{task.bedroomCount || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Den</span>
                    <span className="font-medium">{task.hasDen == null ? "N/A" : task.hasDen ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bathrooms</span>
                    <span className="font-medium">{task.bathroomCount || "N/A"}</span>
                  </div>
                  {parsedBathroomTypes.length > 0 && (
                    <div className="pl-4 space-y-1">
                      {parsedBathroomTypes.map((bt, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Bathroom {i + 1}</span>
                          <Badge variant="secondary" className="text-xs capitalize">{bt}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-4" data-testid="card-keys">
                <div className="flex items-center gap-2 mb-3">
                  <Key className="w-4 h-4 text-primary" />
                  <h3 className="font-medium text-sm">Keys Provided</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sets of Keys</span>
                    <span className="font-medium">{task.keySetsProvided || "N/A"}</span>
                  </div>
                  {parsedKeyTypes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {parsedKeyTypes.map((kt) => (
                        <Badge key={kt} variant="secondary" className="text-xs">
                          {keyTypeLabels[kt] || kt}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-4" data-testid="card-locations">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <h3 className="font-medium text-sm">Locations</h3>
                  {locationItems.length > 0 && (
                    <Badge variant="secondary" className="text-xs ml-auto">{locationItems.length}</Badge>
                  )}
                </div>
                {locationItems.length > 0 ? (
                  <div className="space-y-1.5 text-sm">
                    {locationItems.map((r) => (
                      <div key={r.id} className="flex justify-between gap-2" data-testid={`loc-item-${r.id}`}>
                        <span className="text-muted-foreground truncate">{getItemLabel(r.roomKey, r.itemKey)}</span>
                        <span className="font-medium text-right shrink-0">{parseNoteField(r.notes!, "Location")}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">None recorded</p>
                )}
              </Card>

              <Card className="p-4" data-testid="card-model-numbers">
                <div className="flex items-center gap-2 mb-3">
                  <Hash className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <h3 className="font-medium text-sm">Model Numbers</h3>
                  {modelNumberItems.length > 0 && (
                    <Badge variant="secondary" className="text-xs ml-auto">{modelNumberItems.length}</Badge>
                  )}
                </div>
                {modelNumberItems.length > 0 ? (
                  <div className="space-y-1.5 text-sm">
                    {modelNumberItems.slice(0, 5).map((r) => (
                      <div key={r.id} className="flex justify-between gap-2" data-testid={`model-item-${r.id}`}>
                        <span className="text-muted-foreground truncate">{getItemLabel(r.roomKey, r.itemKey)}</span>
                        <span className="font-medium text-right shrink-0">{parseNoteField(r.notes!, "Model#")}</span>
                      </div>
                    ))}
                    {modelNumberItems.length > 5 && (
                      <p className="text-xs text-muted-foreground pt-1">and {modelNumberItems.length - 5} more...</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">None recorded</p>
                )}
              </Card>
            </div>
          </section>
        )}


        </>
        )}

      </div>

      {/* Create Onboarding Dialog */}
      <Dialog open={showCreateOnboarding} onOpenChange={setShowCreateOnboarding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Owner Onboarding Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium">Owner Name</Label>
              <Input
                value={onboardingOwnerName}
                onChange={(e) => setOnboardingOwnerName(e.target.value)}
                placeholder="Property owner's name"
                className="mt-1.5"
                data-testid="input-owner-name"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Owner Email (optional)</Label>
              <Input
                value={onboardingOwnerEmail}
                onChange={(e) => setOnboardingOwnerEmail(e.target.value)}
                placeholder="owner@email.com"
                className="mt-1.5"
                data-testid="input-owner-email"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateOnboarding(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!unitId) return;
                createOnboardingMutation.mutate({
                  unitId,
                  ownerName: onboardingOwnerName,
                  ownerEmail: onboardingOwnerEmail,
                });
              }}
              disabled={createOnboardingMutation.isPending}
              data-testid="button-confirm-create-onboarding"
            >
              {createOnboardingMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Link"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add PM Note Dialog */}
      <Dialog open={addNoteOpen} onOpenChange={setAddNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add PM Note</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Enter your internal note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={4}
            data-testid="input-pm-note"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddNoteOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addNoteMutation.mutate(newNote)}
              disabled={!newNote.trim() || addNoteMutation.isPending}
              data-testid="button-save-note"
            >
              {addNoteMutation.isPending ? "Saving..." : "Save Note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
    </div>
  );
}

function OwnerResponsesView({ responses, propertyType }: { responses: Record<string, any>; propertyType: string | null }) {
  const sections = [
    {
      title: "Scheduling",
      icon: Calendar,
      items: [
        { label: "Available Dates", value: (responses.scheduling_dates || []).map((d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })) },
        { label: "Time Windows", value: (responses.scheduling_timeSlots || []).map((s: any) => ({ date: new Date(s.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), windows: s.timeWindows || [] })) },
      ],
    },
    {
      title: "Bedrooms & Linens",
      icon: Bed,
      items: [
        { label: "Bedroom Count", value: responses.bedroom_count },
        { label: "Notes", value: responses.linens_notes },
      ],
    },
    {
      title: "WiFi",
      icon: Wifi,
      items: [
        { label: "Network (SSID)", value: responses.wifi_ssid },
        { label: "Password", value: responses.wifi_password },
        { label: "Provider", value: responses.wifi_provider },
        { label: "Account #", value: responses.wifi_account },
        { label: "Modem Location", value: responses.wifi_modem_location },
      ],
    },
    {
      title: "Building & Stay",
      icon: Building,
      items: [
        { label: "Minimum Stay", value: responses.minimum_stay },
        { label: "Selling Points", value: responses.selling_points },
      ],
    },
    {
      title: "Access & Parking",
      icon: Car,
      items: [
        { label: "Mailbox Access", value: responses.mailbox_access },
        { label: "Parking Info", value: responses.parking_info },
      ],
    },
    {
      title: "Special Instructions",
      icon: FileText,
      items: [
        { label: "Instructions", value: responses.special_instructions },
        { label: "Building Management", value: responses.building_management_contact },
      ],
    },
    {
      title: "AC & Smoke Detectors",
      icon: Shield,
      items: [
        { label: "AC Filter Location", value: responses.ac_filter_location },
        { label: "AC Filter Qty", value: responses.ac_filter_quantity },
        { label: "Smoke Detector Locations", value: responses.smoke_detector_locations },
        { label: "Smoke Detector Qty", value: responses.smoke_detector_quantity },
        { label: "Smoke Detector Type", value: responses.smoke_detector_type },
        { label: "Installation Company", value: responses.smoke_detector_company },
      ],
    },
    {
      title: "Thermostat & Fusebox",
      icon: Thermometer,
      items: [
        { label: "Thermostat Location", value: responses.thermostat_location },
        { label: "Thermostat Notes", value: responses.thermostat_notes },
        { label: "Fusebox Location", value: responses.fusebox_location },
      ],
    },
    {
      title: "Warranty",
      icon: ClipboardList,
      items: [
        { label: "Has Warranty", value: responses.has_warranty },
        { label: "Details", value: responses.warranty_details },
      ],
    },
  ];

  if (propertyType === "HOUSE") {
    sections.push({
      title: "Bins Service",
      icon: Trash2,
      items: [
        { label: "Number of Bins", value: responses.bins_count },
        { label: "Service Confirmed", value: responses.bins_confirm },
      ],
    });
  }

  const filledSections = sections.filter((s) =>
    s.items.some((i) => i.value !== undefined && i.value !== null && i.value !== "" && !(Array.isArray(i.value) && i.value.length === 0))
  );

  if (filledSections.length === 0) {
    return <p className="text-sm text-muted-foreground">No responses yet</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="owner-responses-grid">
      {filledSections.map((section) => {
        const SectionIcon = section.icon;
        const filledItems = section.items.filter(
          (i) => i.value !== undefined && i.value !== null && i.value !== "" && !(Array.isArray(i.value) && i.value.length === 0)
        );
        return (
          <Card key={section.title} className="p-4" data-testid={`response-card-${section.title.toLowerCase().replace(/\s+/g, "-")}`}>
            <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b">
              <div className="flex items-center justify-center h-8 w-8 rounded-md bg-teal-500/10 dark:bg-teal-400/10 shrink-0">
                <SectionIcon className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              </div>
              <h4 className="text-sm font-semibold">{section.title}</h4>
            </div>
            <div className="space-y-2.5">
              {section.title === "Scheduling" ? (
                <>
                  {filledItems.map((item) => (
                    <div key={item.label} data-testid={`response-item-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
                      <p className="text-xs text-muted-foreground mb-1.5">{item.label}</p>
                      {item.label === "Available Dates" && Array.isArray(item.value) ? (
                        <div className="flex flex-wrap gap-1.5">
                          {(item.value as string[]).map((date, i) => (
                            <Badge key={i} variant="secondary" className="text-xs font-medium px-2.5 py-1" data-testid={`date-chip-${i}`}>
                              <Calendar className="w-3 h-3 mr-1 opacity-60" />
                              {date}
                            </Badge>
                          ))}
                        </div>
                      ) : item.label === "Time Windows" && Array.isArray(item.value) ? (
                        <div className="space-y-2">
                          {(item.value as { date: string; windows: string[] }[]).map((slot, i) => (
                            <div key={i} className="rounded-lg border bg-muted/30 p-2.5" data-testid={`time-slot-${i}`}>
                              <p className="text-xs font-semibold mb-1.5">{slot.date}</p>
                              <div className="flex flex-wrap gap-1">
                                {slot.windows.length > 0 ? slot.windows.map((w, wi) => (
                                  <Badge key={wi} variant="outline" className="text-xs font-normal">{w}</Badge>
                                )) : (
                                  <span className="text-xs text-muted-foreground italic">None selected</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm font-medium break-words">{String(item.value)}</p>
                      )}
                    </div>
                  ))}
                </>
              ) : (
                filledItems.map((item) => (
                  <div key={item.label} data-testid={`response-item-${item.label.toLowerCase().replace(/\s+/g, "-")}`}>
                    <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
                    <p className="text-sm font-medium break-words">{String(item.value)}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

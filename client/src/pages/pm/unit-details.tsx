import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { StatusPill } from "@/components/portal";
import { MediaLibrary } from "@/components/media-library";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileWarning,
  ExternalLink,
  Play,
  Image,
  Send,
  Trash2,
  Edit2,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Unit, InspectionTask, QuickReport, ChecklistResponse, Media, PmNote, User } from "@shared/schema";

export default function UnitDetailsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/pm/unit/:unitId");
  const unitId = params?.unitId;
  const [activeTab, setActiveTab] = useState("overview");
  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const { toast } = useToast();

  // Fetch unit details
  const { data: units } = useQuery<Unit[]>({
    queryKey: ["/api/units"],
  });
  const unit = units?.find((u) => u.id === unitId);

  // Fetch inspection tasks for this unit
  const { data: allTasks } = useQuery<InspectionTask[]>({
    queryKey: ["/api/inspection-tasks"],
  });
  const unitTasks = allTasks?.filter((t) => t.unitId === unitId) || [];
  const latestOnboarding = unitTasks
    .filter((t) => t.type === "ONBOARDING" && t.status !== "ASSIGNED")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  // Fetch quick reports for this unit
  const { data: allQuickReports } = useQuery<QuickReport[]>({
    queryKey: ["/api/quick-reports"],
  });
  const unitQuickReports = allQuickReports?.filter((r) => {
    const unitDisplay = unit ? `${unit.propertyName} - ${unit.unitNumber}` : "";
    return r.unitNumber === unit?.unitNumber || r.unitNumber === unitDisplay;
  }) || [];

  // Fetch checklist responses for latest onboarding
  const { data: checklistResponses } = useQuery<ChecklistResponse[]>({
    queryKey: ["/api/inspection-tasks", latestOnboarding?.id, "responses"],
    enabled: !!latestOnboarding?.id,
    queryFn: async () => {
      if (!latestOnboarding?.id) return [];
      const res = await fetch(`/api/inspection-tasks/${latestOnboarding.id}`);
      const data = await res.json();
      return data.responses || [];
    },
  });

  // Fetch media for this unit
  const { data: allMedia } = useQuery<Media[]>({
    queryKey: ["/api/media"],
  });
  const unitMedia = allMedia?.filter((m) => {
    const taskIds = unitTasks.map((t) => t.id);
    return m.inspectionTaskId && taskIds.includes(m.inspectionTaskId);
  }) || [];

  // Fetch PM notes
  const { data: pmNotes, isLoading: notesLoading } = useQuery<PmNote[]>({
    queryKey: ["/api/units", unitId, "pm-notes"],
    enabled: !!unitId,
  });

  // Fetch users for names
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Mutations for PM Notes
  const createNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/units/${unitId}/pm-notes`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units", unitId, "pm-notes"] });
      setNewNote("");
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      return apiRequest("PATCH", `/api/pm-notes/${id}`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units", unitId, "pm-notes"] });
      setEditingNoteId(null);
      setEditContent("");
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/pm-notes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units", unitId, "pm-notes"] });
    },
  });

  // Helper functions
  const getUserName = (userId: string) => {
    const foundUser = users?.find((u) => u.id === userId);
    return foundUser?.name || "Unknown";
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatShortDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Calculate summary stats from checklist responses
  const calculateStats = () => {
    if (!checklistResponses || checklistResponses.length === 0) {
      return { good: 0, needReplacement: 0, missing: 0, issues: 0 };
    }
    let good = 0;
    let needReplacement = 0;
    let missing = 0;
    let issues = 0;

    checklistResponses.forEach((r) => {
      if (r.result === "GOOD" || r.result === "PASS" || r.result === "YES") good++;
      else if (r.result === "NEED_REPLACEMENT") needReplacement++;
      else if (r.result === "MISSING") missing++;
      else if (r.result === "FAIL" || r.result === "NO") issues++;
    });

    return { good, needReplacement, missing, issues };
  };

  const stats = calculateStats();

  // Group responses by room
  const groupedResponses = () => {
    if (!checklistResponses) return {};
    const grouped: Record<string, ChecklistResponse[]> = {};
    checklistResponses.forEach((r) => {
      if (!grouped[r.roomKey]) grouped[r.roomKey] = [];
      grouped[r.roomKey].push(r);
    });
    return grouped;
  };

  const roomResponses = groupedResponses();

  // Get issues (FAIL, NEED_REPLACEMENT, MISSING)
  const issueResponses = checklistResponses?.filter(
    (r) => r.result === "FAIL" || r.result === "NEED_REPLACEMENT" || r.result === "MISSING"
  ) || [];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "HIGH":
      case "SEVERE":
        return "bg-red-100 text-red-700";
      case "MED":
      case "MODERATE":
        return "bg-amber-100 text-amber-700";
      default:
        return "bg-blue-100 text-blue-700";
    }
  };

  const getLocationLabel = (location: string) => {
    return location.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (!unit) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-gray-500">
          <ArrowLeft className="h-4 w-4" />
          <button onClick={() => setLocation("/pm/dashboard")} className="text-violet-600 hover:underline">
            Back to Dashboard
          </button>
        </div>
        <div className="mt-8 text-center text-gray-500">Unit not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLocation("/pm/dashboard")}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900" data-testid="text-unit-title">
              {unit.propertyName} - {unit.unitNumber}
            </h1>
            <p className="text-sm text-gray-500">{unit.address}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-1 rounded-xl flex flex-wrap gap-1 h-auto" data-testid="tabs-list">
          <TabsTrigger value="overview" data-testid="tab-overview" className="data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700 rounded-lg px-4 py-2">
            Overview
          </TabsTrigger>
          <TabsTrigger value="inspection" data-testid="tab-inspection" className="data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700 rounded-lg px-4 py-2">
            Unit Inspection
          </TabsTrigger>
          <TabsTrigger value="quick-reports" data-testid="tab-quick-reports" className="data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700 rounded-lg px-4 py-2">
            Quick Reports
          </TabsTrigger>
          <TabsTrigger value="media" data-testid="tab-media" className="data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700 rounded-lg px-4 py-2">
            Media Library
          </TabsTrigger>
          <TabsTrigger value="notes" data-testid="tab-notes" className="data-[state=active]:bg-violet-100 data-[state=active]:text-violet-700 rounded-lg px-4 py-2">
            PM Notes
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6" data-testid="content-overview">
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4 bg-emerald-50 border-emerald-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-700" data-testid="stat-good">{stats.good}</div>
                  <div className="text-sm text-emerald-600">Good</div>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-amber-50 border-amber-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-700" data-testid="stat-replacement">{stats.needReplacement}</div>
                  <div className="text-sm text-amber-600">Need Replacement</div>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-red-50 border-red-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-700" data-testid="stat-missing">{stats.missing}</div>
                  <div className="text-sm text-red-600">Missing</div>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-blue-50 border-blue-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileWarning className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-700" data-testid="stat-issues">{unitQuickReports.length}</div>
                  <div className="text-sm text-blue-600">Issues Logged</div>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Room-by-room condition preview */}
            <div className="md:col-span-2">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Room Conditions</h3>
                {Object.keys(roomResponses).length === 0 ? (
                  <p className="text-gray-500 text-sm">No inspection data available</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(roomResponses).map(([roomKey, responses]) => {
                      const roomIssues = responses.filter(
                        (r) => r.result === "FAIL" || r.result === "NEED_REPLACEMENT" || r.result === "MISSING"
                      );
                      const roomGood = responses.filter(
                        (r) => r.result === "GOOD" || r.result === "PASS" || r.result === "YES"
                      );
                      return (
                        <button
                          key={roomKey}
                          className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors text-left"
                          onClick={() => setActiveTab("inspection")}
                          data-testid={`room-${roomKey}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-gray-900 capitalize">
                              {roomKey.replace(/_/g, " ")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {roomGood.length > 0 && (
                              <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700">
                                {roomGood.length} Good
                              </span>
                            )}
                            {roomIssues.length > 0 && (
                              <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">
                                {roomIssues.length} Issues
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>

            {/* Issues & Damages Panel */}
            <div className="md:col-span-1">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Issues & Damages</h3>
                {issueResponses.length === 0 && unitQuickReports.length === 0 ? (
                  <p className="text-gray-500 text-sm">No issues found</p>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {issueResponses.map((issue) => (
                      <div
                        key={issue.id}
                        className="flex items-start gap-3 p-3 rounded-lg border border-gray-100"
                      >
                        <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 capitalize">
                            {issue.itemKey.replace(/_/g, " ")}
                          </div>
                          <div className="text-xs text-gray-500 capitalize">
                            {issue.roomKey.replace(/_/g, " ")}
                          </div>
                          <span
                            className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                              issue.result === "MISSING"
                                ? "bg-red-100 text-red-700"
                                : issue.result === "NEED_REPLACEMENT"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {issue.result.replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                    ))}
                    {unitQuickReports.slice(0, 3).map((report) => (
                      <div
                        key={report.id}
                        className="flex items-start gap-3 p-3 rounded-lg border border-gray-100"
                      >
                        <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <FileWarning className="h-4 w-4 text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-gray-900 truncate">
                            {report.description.slice(0, 50)}...
                          </div>
                          <div className="text-xs text-gray-500">
                            {getLocationLabel(report.location)}
                          </div>
                          <span
                            className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${getSeverityColor(report.severity)}`}
                          >
                            {report.severity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Unit Inspection Tab */}
        <TabsContent value="inspection" className="space-y-6" data-testid="content-inspection">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Latest Onboarding Inspection</h3>
                {latestOnboarding && (
                  <p className="text-sm text-gray-500">
                    Completed on {formatShortDate(latestOnboarding.createdAt)}
                  </p>
                )}
              </div>
              {latestOnboarding && (
                <Button
                  onClick={() => window.open(`/api/tasks/${latestOnboarding.id}/pdf`, "_blank")}
                  data-testid="button-open-report"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Full Report
                </Button>
              )}
            </div>

            {!latestOnboarding ? (
              <p className="text-gray-500">No onboarding inspection found for this unit</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(roomResponses).map(([roomKey, responses]) => (
                  <div key={roomKey} className="border border-gray-100 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 capitalize mb-3">
                      {roomKey.replace(/_/g, " ")}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {responses.map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                        >
                          <span className="text-sm text-gray-700 capitalize">
                            {r.itemKey.replace(/_/g, " ")}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full ${
                              r.result === "GOOD" || r.result === "PASS" || r.result === "YES"
                                ? "bg-emerald-100 text-emerald-700"
                                : r.result === "MISSING"
                                ? "bg-red-100 text-red-700"
                                : r.result === "NEED_REPLACEMENT"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {r.result.replace(/_/g, " ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Quick Reports Tab */}
        <TabsContent value="quick-reports" className="space-y-6" data-testid="content-quick-reports">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Reports (Damage)</h3>
            {unitQuickReports.length === 0 ? (
              <p className="text-gray-500">No quick reports for this unit</p>
            ) : (
              <div className="space-y-3">
                {unitQuickReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
                    data-testid={`quick-report-${report.id}`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <span
                        className={`px-3 py-1 text-xs font-medium rounded-full flex-shrink-0 ${getSeverityColor(report.severity)}`}
                      >
                        {report.severity}
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900">
                          {getLocationLabel(report.location)}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {report.description}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0 flex-wrap">
                      <span className="text-sm text-gray-500">
                        {formatShortDate(report.createdAt)}
                      </span>
                      <StatusPill status={report.status === "NEW" ? "SUBMITTED" : report.status === "ACKNOWLEDGED" ? "REVIEWED" : "ARCHIVED"} />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/api/quick-reports/${report.id}/pdf`, "_blank")}
                        data-testid={`button-open-${report.id}`}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Media Library Tab */}
        <TabsContent value="media" className="space-y-6" data-testid="content-media">
          {unitId && (
            <MediaLibrary 
              unitId={unitId} 
              unitName={unit ? `${unit.propertyName} ${unit.unitNumber}` : undefined}
              compact
            />
          )}
        </TabsContent>

        {/* PM Notes Tab */}
        <TabsContent value="notes" className="space-y-6" data-testid="content-notes">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Internal PM Notes</h3>
            <p className="text-sm text-gray-500 mb-4">
              These notes are only visible to Property Managers and Admins.
            </p>

            {/* Add new note */}
            <div className="mb-6">
              <Textarea
                placeholder="Add a new note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="mb-2"
                data-testid="input-new-note"
              />
              <Button
                onClick={() => createNoteMutation.mutate(newNote)}
                disabled={!newNote.trim() || createNoteMutation.isPending}
                data-testid="button-add-note"
              >
                <Send className="h-4 w-4 mr-2" />
                Add Note
              </Button>
            </div>

            {/* Notes list */}
            {notesLoading ? (
              <p className="text-gray-500">Loading notes...</p>
            ) : !pmNotes || pmNotes.length === 0 ? (
              <p className="text-gray-500">No notes yet</p>
            ) : (
              <div className="space-y-4">
                {pmNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-4 border border-gray-100 rounded-lg"
                    data-testid={`note-${note.id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-violet-100 text-violet-700 text-xs">
                            {getUserName(note.createdById).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-medium text-gray-900 text-sm">
                            {getUserName(note.createdById)}
                          </span>
                          <span className="text-gray-400 text-sm ml-2">
                            {formatDate(note.createdAt)}
                          </span>
                        </div>
                      </div>
                      {note.createdById === user?.id && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingNoteId(note.id);
                              setEditContent(note.content);
                            }}
                            data-testid={`button-edit-${note.id}`}
                          >
                            <Edit2 className="h-4 w-4 text-gray-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => deleteNoteMutation.mutate(note.id)}
                            data-testid={`button-delete-${note.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {editingNoteId === note.id ? (
                      <div>
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="mb-2"
                          data-testid={`input-edit-${note.id}`}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              updateNoteMutation.mutate({ id: note.id, content: editContent })
                            }
                            disabled={updateNoteMutation.isPending}
                            data-testid={`button-save-${note.id}`}
                          >
                            Save
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingNoteId(null);
                              setEditContent("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}


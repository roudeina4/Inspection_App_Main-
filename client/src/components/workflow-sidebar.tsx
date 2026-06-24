import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Check, ChevronDown, ChevronRight, PanelLeftClose, PanelLeft, ListChecks, Clock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { PhaseWithStatus, AnnotatedSubTask, PhaseStatus } from "@/lib/workflow-phases";
import { getOverallProgress } from "@/lib/workflow-phases";

interface WorkflowSidebarProps {
  phases: PhaseWithStatus[];
  unitId: string;
  activePhase?: number;
  onPhaseClick?: (phaseIndex: number) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

function getSystemPhaseDetail(systemKey: string | null, status: string): string | null {
  if (!systemKey) return null;
  switch (systemKey) {
    case "inspection_submitted":
      if (status === "complete") return "Inspection submitted";
      if (status === "in_progress") return "Inspection in progress";
      return "Awaiting inspection";
    case "report_reviewed":
      if (status === "complete") return "Report reviewed by PM";
      if (status === "in_progress") return "Report pending review";
      return "Awaiting report review";
    case "owner_report_published":
      if (status === "complete") return "Report sent to owner";
      if (status === "in_progress") return "Report draft in progress";
      return "Owner report not created";
    case "owner_responses_complete":
      if (status === "complete") return "All items responded";
      if (status === "in_progress") return "Owner response pending";
      return "Awaiting owner responses";
    default:
      return null;
  }
}

function PhaseItem({ phase, index, unitId, isSelected, onPhaseClick, displayNumber, overrideStatus, overrideDetail }: {
  phase: PhaseWithStatus; index: number; unitId: string; isSelected: boolean; onPhaseClick?: (i: number) => void; displayNumber?: number; overrideStatus?: PhaseStatus; overrideDetail?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const isManual = phase.phase.phaseType === "MANUAL" && phase.phase.subTasks.length > 0;

  const toggleMutation = useMutation({
    mutationFn: async ({ subTaskId, completed }: { subTaskId: string; completed: boolean }) => {
      return apiRequest("PATCH", `/api/units/${unitId}/onboarding-checklist/${subTaskId}`, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units", unitId, "onboarding-checklist"] });
    },
  });

  const effectiveStatus = overrideStatus ?? phase.status;
  const isLocked = effectiveStatus === "locked";
  const isActive = effectiveStatus === "in_progress";

  const phaseNumber = displayNumber ?? (index + 1);
  const isPendingSystem = !isActive && effectiveStatus !== "complete" && phase.phase.phaseType === "SYSTEM";
  const isPendingManual = !isActive && effectiveStatus !== "complete" && isManual;

  const iconElement = effectiveStatus === "complete" ? (
    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-teal-500 shrink-0 mt-0.5" data-testid={`phase-icon-${index}`}>
      <span className="text-xs font-bold text-white">{phaseNumber}</span>
    </div>
  ) : isActive ? (
    <div className="flex items-center justify-center w-8 h-8 rounded-full ring-2 ring-blue-200 dark:ring-blue-800 ring-offset-1 ring-offset-transparent shrink-0" data-testid={`phase-icon-${index}`}>
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-500">
        <span className="text-xs font-bold text-white">{phaseNumber}</span>
      </div>
    </div>
  ) : isPendingSystem ? (
    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shrink-0 mt-0.5" data-testid={`phase-icon-${index}`}>
      <span className="text-xs font-bold text-gray-400 dark:text-gray-500">{phaseNumber}</span>
    </div>
  ) : isPendingManual ? (
    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shrink-0 mt-0.5" data-testid={`phase-icon-${index}`}>
      <span className="text-xs font-bold text-gray-400 dark:text-gray-500">{phaseNumber}</span>
    </div>
  ) : (
    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0 mt-0.5" data-testid={`phase-icon-${index}`}>
      <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{phaseNumber}</span>
    </div>
  );

  const systemDetail = overrideDetail !== undefined ? overrideDetail : getSystemPhaseDetail(phase.phase.systemKey, phase.status);

  const rowBg = isActive && !isLocked
    ? "bg-blue-50 dark:bg-blue-950/30 border-l-2 border-l-blue-500"
    : isSelected && !isLocked
    ? "bg-teal-50 dark:bg-teal-950/30 ring-1 ring-teal-200 dark:ring-teal-800"
    : isLocked
    ? "opacity-50 cursor-not-allowed"
    : "hover:bg-muted/50";

  return (
    <div data-testid={`workflow-phase-${index}`}>
      <button
        className={`flex items-start gap-2.5 w-full text-left py-2 px-2.5 rounded-lg transition-colors group ${rowBg}`}
        onClick={() => {
          if (isLocked) return;
          if (isManual) setExpanded(!expanded);
          onPhaseClick?.(index);
        }}
        data-testid={`button-phase-${index}`}
      >
        {iconElement}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-tight ${
            isActive ? "text-blue-700 dark:text-blue-300 font-semibold" :
            isSelected && !isLocked ? "text-teal-700 dark:text-teal-300 font-semibold" :
            effectiveStatus === "complete" ? "text-foreground" :
            "text-muted-foreground"
          }`}>
            {phase.phase.systemKey === "report_reviewed" ? "Review & Build Report" : phase.phase.name}
          </p>
          {phase.phase.phaseType === "SYSTEM" && systemDetail && (
            <p className={`text-[11px] mt-0.5 ${isActive ? "text-blue-600/70 dark:text-blue-400/70" : isSelected ? "text-teal-600/70 dark:text-teal-400/70" : "text-muted-foreground"}`}>{systemDetail}</p>
          )}
          {isManual && (
            <p className={`text-[11px] mt-0.5 ${isActive ? "text-blue-600/70 dark:text-blue-400/70" : isSelected ? "text-teal-600/70 dark:text-teal-400/70" : "text-muted-foreground"}`}>
              {phase.totalSubTasks} tasks
            </p>
          )}
        </div>
        {isManual && !isLocked && (
          <div className="mt-1 text-muted-foreground">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        )}
      </button>

      {isManual && expanded && !isLocked && (
        <div className="ml-10 space-y-1.5 pb-2 pt-1" data-testid={`subtasks-phase-${index}`}>
          {phase.phase.subTasks.map((st: AnnotatedSubTask) => (
            <label
              key={st.id}
              className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted/30 cursor-pointer text-sm"
              data-testid={`subtask-${st.id}`}
            >
              <Checkbox
                checked={st._completed}
                onCheckedChange={(checked) => {
                  toggleMutation.mutate({ subTaskId: st.id, completed: !!checked });
                }}
                disabled={toggleMutation.isPending}
                data-testid={`checkbox-subtask-${st.id}`}
              />
              <span className={st._completed ? "line-through text-muted-foreground" : ""}>{st.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function getMergeInfo(phases: PhaseWithStatus[]) {
  const reviewIdx = phases.findIndex(p => p.phase.systemKey === "report_reviewed");
  const publishIdx = phases.findIndex(p => p.phase.systemKey === "owner_report_published");
  if (reviewIdx === -1 || publishIdx === -1) return null;
  return { reviewIdx, publishIdx };
}

function getMergedPhaseDetail(phases: PhaseWithStatus[], mergeInfo: { reviewIdx: number; publishIdx: number }): string | null {
  const r = phases[mergeInfo.reviewIdx].status;
  const p = phases[mergeInfo.publishIdx].status;
  if (r === "complete" && p === "complete") return "Reviewed & sent to owner";
  if (r === "complete" && p === "in_progress") return "Reviewed — building owner report";
  if (r === "complete") return "Reviewed — report not yet published";
  if (r === "in_progress") return "Categorizing inspection items";
  return "Awaiting review";
}

function getMergedPhaseStatus(phases: PhaseWithStatus[], mergeInfo: { reviewIdx: number; publishIdx: number }): PhaseStatus {
  const r = phases[mergeInfo.reviewIdx].status;
  const p = phases[mergeInfo.publishIdx].status;
  if (r === "complete" && p === "complete") return "complete";
  if (r === "locked" && p === "locked") return "locked";
  if (r === "in_progress" || p === "in_progress" || r === "complete") return "in_progress";
  return "not_started";
}

function getMergedProgress(phases: PhaseWithStatus[], progress: { completed: number; total: number }, mergeInfo: { reviewIdx: number; publishIdx: number } | null) {
  if (!mergeInfo) return progress;
  const r = phases[mergeInfo.reviewIdx].status === "complete";
  const p = phases[mergeInfo.publishIdx].status === "complete";
  const mergedTotal = progress.total - 1;
  const completedWithoutMerge = progress.completed - (r ? 1 : 0) - (p ? 1 : 0);
  const mergedCompleted = completedWithoutMerge + (r && p ? 1 : 0);
  return { completed: mergedCompleted, total: mergedTotal };
}

function SidebarContent({ phases, unitId, activePhase, progress, onPhaseClick, onToggleCollapse, showCollapseButton = true }: {
  phases: PhaseWithStatus[];
  unitId: string;
  activePhase: number;
  progress: { completed: number; total: number; percentage: number };
  onPhaseClick?: (i: number) => void;
  onToggleCollapse?: () => void;
  showCollapseButton?: boolean;
}) {
  const mergeInfo = getMergeInfo(phases);
  const mergedProgress = getMergedProgress(phases, progress, mergeInfo);
  const mergedPhaseStatus = mergeInfo ? getMergedPhaseStatus(phases, mergeInfo) : null;

  return (
    <>
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground">Onboarding Workflow</h3>
            <p className="text-xl font-bold mt-0.5" data-testid="text-progress-count">{mergedProgress.completed}/{mergedProgress.total} <span className="text-xs font-normal text-muted-foreground">phases</span></p>
          </div>
          {showCollapseButton && onToggleCollapse && (
            <button onClick={onToggleCollapse} className="p-1 rounded-md hover:bg-muted" data-testid="button-collapse-sidebar">
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 px-2 pb-2 space-y-0.5">
        {(() => {
          let displayIndex = 0;
          return phases.map((p, i) => {
            if (mergeInfo && i === mergeInfo.publishIdx) return null;
            const isMergedPhase = mergeInfo && i === mergeInfo.reviewIdx;
            const isSelected = isMergedPhase
              ? (activePhase === mergeInfo.reviewIdx || activePhase === mergeInfo.publishIdx)
              : activePhase === i;
            const currentDisplayIndex = displayIndex;
            displayIndex++;
            return (
              <PhaseItem
                key={p.phase.id}
                phase={p}
                index={i}
                unitId={unitId}
                isSelected={isSelected}
                onPhaseClick={onPhaseClick}
                displayNumber={currentDisplayIndex + 1}
                overrideStatus={isMergedPhase ? mergedPhaseStatus ?? undefined : undefined}
                overrideDetail={isMergedPhase && mergeInfo ? getMergedPhaseDetail(phases, mergeInfo) : undefined}
              />
            );
          });
        })()}
      </div>
    </>
  );
}

export function MobileWorkflowTrigger({ phases, unitId, activePhase = 0, onPhaseClick }: {
  phases: PhaseWithStatus[];
  unitId: string;
  activePhase?: number;
  onPhaseClick?: (i: number) => void;
}) {
  const progress = getOverallProgress(phases);
  const mergeInfo = getMergeInfo(phases);
  const mergedProgress = getMergedProgress(phases, progress, mergeInfo);
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden" data-testid="mobile-workflow-trigger">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2" data-testid="button-open-workflow-mobile">
            <ListChecks className="w-4 h-4" />
            <span>Workflow</span>
            <span className="bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300 px-1.5 py-0.5 rounded text-xs font-medium">
              {mergedProgress.completed}/{mergedProgress.total}
            </span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0 overflow-y-auto flex flex-col">
          <SheetTitle className="sr-only">Unit Onboarding Workflow</SheetTitle>
          <SheetDescription className="sr-only">Track onboarding progress through workflow phases</SheetDescription>
          <SidebarContent
            phases={phases}
            unitId={unitId}
            activePhase={activePhase}
            progress={progress}
            onPhaseClick={(i) => { onPhaseClick?.(i); setOpen(false); }}
            showCollapseButton={false}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function WorkflowSidebar({ phases, unitId, activePhase = 0, onPhaseClick, collapsed, onToggleCollapse }: WorkflowSidebarProps) {
  const progress = getOverallProgress(phases);

  const mergeInfo = getMergeInfo(phases);
  const mergedProgress = getMergedProgress(phases, progress, mergeInfo);
  const mergedPhaseStatus = mergeInfo ? getMergedPhaseStatus(phases, mergeInfo) : null;

  if (collapsed) {
    return (
      <div className="w-14 border-r bg-card flex flex-col items-center pt-4 gap-3 shrink-0 h-full overflow-y-auto" data-testid="workflow-sidebar-collapsed">
        <button onClick={onToggleCollapse} className="p-1.5 rounded-md hover:bg-muted" data-testid="button-expand-sidebar">
          <PanelLeft className="w-4 h-4" />
        </button>
        <p className="text-xs font-bold" data-testid="text-progress-collapsed">{mergedProgress.completed}/{mergedProgress.total}</p>
        <div className="flex flex-col gap-1.5 mt-1">
          {phases.map((p, i) => {
            if (mergeInfo && i === mergeInfo.publishIdx) return null;
            const isMergedPhase = mergeInfo && i === mergeInfo.reviewIdx;
            const isSelected = isMergedPhase
              ? (activePhase === mergeInfo.reviewIdx || activePhase === mergeInfo.publishIdx)
              : activePhase === i;
            const effectiveStatus = isMergedPhase && mergedPhaseStatus ? mergedPhaseStatus : p.status;
            return (
              <button
                key={p.phase.id}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors
                  ${isSelected && effectiveStatus !== "locked" ? "ring-2 ring-teal-400 ring-offset-1" : ""}
                  ${effectiveStatus === "complete" ? "bg-teal-500 text-white" :
                    effectiveStatus === "in_progress" ? "border-2 border-blue-500 bg-white dark:bg-blue-950" :
                    effectiveStatus === "locked" ? "bg-gray-200 dark:bg-gray-700 opacity-50 cursor-not-allowed" :
                    "bg-gray-200 dark:bg-gray-700"}`}
                onClick={() => { if (effectiveStatus !== "locked") onPhaseClick?.(i); }}
                data-testid={`collapsed-phase-${i}`}
              >
                {effectiveStatus === "complete" ? <Check className="w-3 h-3" /> :
                 effectiveStatus === "in_progress" ? <div className="w-2 h-2 rounded-full bg-blue-500" /> :
                 <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 border-r bg-card flex flex-col shrink-0 h-full overflow-y-auto" data-testid="workflow-sidebar">
      <SidebarContent
        phases={phases}
        unitId={unitId}
        activePhase={activePhase}
        progress={progress}
        onPhaseClick={onPhaseClick}
        onToggleCollapse={onToggleCollapse}
      />
    </div>
  );
}

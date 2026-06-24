import type { WorkflowPhase, WorkflowSubTask, UnitOnboardingChecklist, InspectionTask } from "@shared/schema";

export type PhaseStatus = "not_started" | "in_progress" | "complete" | "locked";

export interface AnnotatedSubTask extends WorkflowSubTask {
  _completed: boolean;
}

export interface PhaseWithStatus {
  phase: WorkflowPhase & { subTasks: AnnotatedSubTask[] };
  status: PhaseStatus;
  completedSubTasks: number;
  totalSubTasks: number;
}

interface DeriveStatusInput {
  phases: (WorkflowPhase & { subTasks: WorkflowSubTask[] })[];
  checklist: UnitOnboardingChecklist[];
  task: InspectionTask | null;
  ownerReport: any | null;
  ownerReportItems?: any[];
  onboardings?: any[];
}

export function derivePhaseStatuses(input: DeriveStatusInput): PhaseWithStatus[] {
  const { phases, checklist, task, ownerReport, ownerReportItems, onboardings } = input;
  const checklistMap = new Map<string, boolean>();
  checklist.forEach(c => checklistMap.set(c.subTaskId, c.completed));

  const sortedPhases = [...phases].sort((a, b) => a.sortOrder - b.sortOrder);

  const rawResults = sortedPhases.map(phase => {
    let status: PhaseStatus = "not_started";
    let completedSubTasks = 0;

    const annotatedSubTasks: AnnotatedSubTask[] = phase.subTasks.map(st => ({
      ...st,
      _completed: checklistMap.get(st.id) ?? false,
    }));

    const totalSubTasks = annotatedSubTasks.length;

    if (phase.phaseType === "SYSTEM" && phase.systemKey) {
      status = deriveSystemPhaseStatus(phase.systemKey, task, ownerReport, ownerReportItems, onboardings);
      completedSubTasks = status === "complete" ? 1 : 0;
    } else {
      completedSubTasks = annotatedSubTasks.filter(st => st._completed).length;
      if (totalSubTasks === 0) {
        status = "not_started";
      } else if (completedSubTasks === totalSubTasks) {
        status = "complete";
      } else if (completedSubTasks > 0) {
        status = "in_progress";
      }
    }

    return {
      phase: { ...phase, subTasks: annotatedSubTasks },
      status,
      completedSubTasks,
      totalSubTasks: phase.phaseType === "SYSTEM" ? 1 : totalSubTasks,
    };
  });

  const independentKeys = new Set([
    "owner_questionnaire_complete",
    "inspection_submitted",
    "report_reviewed",
  ]);

  for (let i = 1; i < rawResults.length; i++) {
    const currentKey = rawResults[i].phase.systemKey;
    if (currentKey && independentKeys.has(currentKey)) continue;

    let allPriorComplete = true;
    for (let j = 0; j < i; j++) {
      const priorKey = rawResults[j].phase.systemKey;
      if (priorKey && independentKeys.has(priorKey) && rawResults[j].status !== "complete") {
        continue;
      }
      if (rawResults[j].status !== "complete") {
        allPriorComplete = false;
        break;
      }
    }
    if (!allPriorComplete) {
      rawResults[i].status = "locked";
    }
  }

  return rawResults;
}

function deriveSystemPhaseStatus(
  systemKey: string,
  task: InspectionTask | null,
  ownerReport: any | null,
  ownerReportItems?: any[],
  onboardings?: any[],
): PhaseStatus {
  switch (systemKey) {
    case "owner_questionnaire_complete":
      if (!onboardings || onboardings.length === 0) return "not_started";
      if (onboardings.some((o: any) => o.status === "COMPLETED")) return "complete";
      if (onboardings.length > 0) return "in_progress";
      return "not_started";

    case "inspection_submitted":
      if (!task) return "not_started";
      if (task.status === "SUBMITTED" || task.status === "REVIEWED" || task.status === "ARCHIVED") return "complete";
      if (task.status === "IN_PROGRESS") return "in_progress";
      return "not_started";

    case "report_reviewed":
      if (!task) return "not_started";
      if (task.status === "REVIEWED" || task.status === "ARCHIVED") return "complete";
      if (task.status === "SUBMITTED") return "in_progress";
      return "not_started";

    case "owner_report_published":
      if (!ownerReport) return "not_started";
      if (ownerReport.publishedAt) return "complete";
      return "in_progress";

    case "owner_responses_complete":
      if (!ownerReport?.publishedAt) return "not_started";
      if (!ownerReportItems || ownerReportItems.length === 0) return "not_started";
      const responded = ownerReportItems.filter((i: any) => i.ownerResponse);
      if (responded.length === ownerReportItems.length) return "complete";
      if (responded.length > 0) return "in_progress";
      return "not_started";

    default:
      return "not_started";
  }
}

export function getOverallProgress(phasesWithStatus: PhaseWithStatus[]): { completed: number; total: number; percentage: number } {
  const completed = phasesWithStatus.filter(p => p.status === "complete").length;
  const total = phasesWithStatus.length;
  return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
}

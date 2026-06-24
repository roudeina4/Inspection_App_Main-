import { Badge } from "@/components/ui/badge";
import { Wrench } from "lucide-react";

interface ParsedDescription {
  condition: string | null;
  count: number | null;
  damaged: number | null;
  issues: string[];
  action: string | null;
  notes: string | null;
  exists: string | null;
  spare: string | null;
  remainder: string | null;
}

export function parseDescription(description: string): ParsedDescription {
  const result: ParsedDescription = {
    condition: null,
    count: null,
    damaged: null,
    issues: [],
    action: null,
    notes: null,
    exists: null,
    spare: null,
    remainder: null,
  };

  let text = description;

  const conditionMatch = text.match(/Condition:\s*([^.]+)\./);
  if (conditionMatch) {
    result.condition = conditionMatch[1].trim();
    text = text.replace(conditionMatch[0], "");
  }

  const countDamagedMatch = text.match(/Count:\s*(\d+),?\s*Damaged:\s*(\d+)\.?/);
  if (countDamagedMatch) {
    result.count = parseInt(countDamagedMatch[1]);
    result.damaged = parseInt(countDamagedMatch[2]);
    text = text.replace(countDamagedMatch[0], "");
  } else {
    const countOnlyMatch = text.match(/Count:\s*(\d+)\.?/);
    if (countOnlyMatch) {
      result.count = parseInt(countOnlyMatch[1]);
      text = text.replace(countOnlyMatch[0], "");
    }
    const damagedOnlyMatch = text.match(/Damaged:\s*(\d+)\.?/);
    if (damagedOnlyMatch) {
      result.damaged = parseInt(damagedOnlyMatch[1]);
      text = text.replace(damagedOnlyMatch[0], "");
    }
  }

  const issuesMatch = text.match(/Issues:\s*([^.]+)\.?/);
  if (issuesMatch) {
    result.issues = issuesMatch[1].split(",").map((s) => s.trim()).filter(Boolean);
    text = text.replace(issuesMatch[0], "");
  }

  const actionMatch = text.match(/Action:\s*([^.]+)\.?/);
  if (actionMatch) {
    result.action = actionMatch[1].trim();
    text = text.replace(actionMatch[0], "");
  }

  const existsMatch = text.match(/Exists:\s*(Yes|No)\.?/i);
  if (existsMatch) {
    result.exists = existsMatch[1].trim();
    text = text.replace(existsMatch[0], "");
  }

  const spareMatch = text.match(/Spare:\s*(\d+)\.?/);
  if (spareMatch) {
    result.spare = spareMatch[1].trim();
    text = text.replace(spareMatch[0], "");
  }

  const notesMatch = text.match(/Notes:\s*(.+)/);
  if (notesMatch) {
    result.notes = notesMatch[1].trim().replace(/\.+$/, "") || null;
    text = text.replace(notesMatch[0], "");
  }

  const remaining = text.replace(/[.,\s]+/g, " ").trim();
  if (remaining && remaining.length > 2) {
    result.remainder = remaining;
  }

  return result;
}

function getConditionStyle(condition: string): { bg: string; text: string; border: string } {
  const lower = condition.toLowerCase();
  if (lower === "good" || lower === "excellent" || lower === "new") {
    return { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800" };
  }
  if (lower === "fair" || lower === "worn" || lower === "aging") {
    return { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800" };
  }
  return { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-700 dark:text-red-400", border: "border-red-200 dark:border-red-800" };
}

export function StructuredDescription({ description, variant = "default" }: { description: string; variant?: "default" | "compact" }) {
  const parsed = parseDescription(description);

  const hasStructuredData = parsed.condition || parsed.issues.length > 0 || parsed.action ||
    parsed.count !== null || parsed.exists !== null || parsed.spare !== null || parsed.notes !== null;

  if (!hasStructuredData) {
    return <p className="text-sm text-gray-700 dark:text-gray-300 mt-1" data-testid="structured-description-plain">{description}</p>;
  }

  const condStyle = parsed.condition ? getConditionStyle(parsed.condition) : null;

  return (
    <div className={`mt-2 space-y-1.5 ${variant === "compact" ? "text-xs" : "text-sm"}`} data-testid="structured-description">
      {parsed.condition && condStyle && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-gray-500 dark:text-gray-400 font-medium min-w-[70px]">Condition</span>
          <Badge className={`${condStyle.bg} ${condStyle.text} border ${condStyle.border} text-xs font-medium`}>
            {parsed.condition}
          </Badge>
          {parsed.count !== null && (
            <span className="text-gray-500 dark:text-gray-400 text-xs">
              {parsed.count} total{parsed.damaged !== null && parsed.damaged > 0 ? `, ${parsed.damaged} damaged` : ""}
            </span>
          )}
        </div>
      )}

      {parsed.count !== null && !parsed.condition && (
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-gray-400 font-medium min-w-[70px]">Count</span>
          <span className="text-gray-700 dark:text-gray-300">
            {parsed.count} total{parsed.damaged !== null && parsed.damaged > 0 ? `, ${parsed.damaged} damaged` : ""}
          </span>
        </div>
      )}

      {parsed.exists && (
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-gray-400 font-medium min-w-[70px]">Present</span>
          <span className={parsed.exists === "Yes" ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-red-600 dark:text-red-400 font-medium"}>
            {parsed.exists}
          </span>
        </div>
      )}

      {parsed.spare !== null && (
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-gray-400 font-medium min-w-[70px]">Spare</span>
          <span className="text-gray-700 dark:text-gray-300">{parsed.spare}</span>
        </div>
      )}

      {parsed.issues.length > 0 && (
        <div className="flex items-start gap-2">
          <span className="text-gray-500 dark:text-gray-400 font-medium min-w-[70px] pt-0.5">Issues</span>
          <ul className="space-y-0.5">
            {parsed.issues.map((issue, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 dark:bg-red-500 shrink-0" />
                <span className="text-gray-700 dark:text-gray-300">{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {parsed.action && (
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-gray-400 font-medium min-w-[70px]">Action</span>
          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium">
            <Wrench className="w-3 h-3" />
            {parsed.action}
          </span>
        </div>
      )}

      {parsed.notes && (
        <div className="flex items-start gap-2">
          <span className="text-gray-500 dark:text-gray-400 font-medium min-w-[70px] pt-0.5">Notes</span>
          <span className="text-gray-600 dark:text-gray-400 italic">{parsed.notes}</span>
        </div>
      )}

      {parsed.remainder && (
        <p className="text-gray-600 dark:text-gray-400">{parsed.remainder}</p>
      )}
    </div>
  );
}

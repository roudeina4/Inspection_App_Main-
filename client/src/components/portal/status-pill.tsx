interface StatusPillProps {
  status: string;
}

const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  ASSIGNED: { 
    bg: "bg-gray-50", 
    text: "text-gray-500",
    dot: "bg-gray-300",
    label: "Draft" 
  },
  IN_PROGRESS: { 
    bg: "bg-gray-50", 
    text: "text-gray-500",
    dot: "bg-gray-300",
    label: "Draft" 
  },
  SUBMITTED: { 
    bg: "bg-amber-50", 
    text: "text-amber-600",
    dot: "bg-amber-400",
    label: "Submitted" 
  },
  REVIEWED: { 
    bg: "bg-emerald-50", 
    text: "text-emerald-600",
    dot: "bg-emerald-400",
    label: "Reviewed" 
  },
  ARCHIVED: { 
    bg: "bg-sky-50", 
    text: "text-sky-600",
    dot: "bg-sky-400",
    label: "Sent to Owner" 
  },
};

export function StatusPill({ status }: StatusPillProps) {
  const normalizedStatus = status.toUpperCase().replace(/-/g, "_");
  const config = statusConfig[normalizedStatus] || { 
    bg: "bg-gray-50", 
    text: "text-gray-500",
    dot: "bg-gray-300",
    label: status 
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium ${config.bg} ${config.text}`}
      data-testid={`status-pill-${status.toLowerCase()}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

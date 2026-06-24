import { CheckCircle2, XCircle, AlertTriangle, FileText } from "lucide-react";

interface SummaryCardsProps {
  good: number;
  missing: number;
  needReplacement: number;
  issuesLogged: number;
}

export function SummaryCards({ good, missing, needReplacement, issuesLogged }: SummaryCardsProps) {
  const cards = [
    {
      label: "Good",
      value: good,
      icon: CheckCircle2,
      iconColor: "text-emerald-500",
      bgColor: "bg-white",
      valueColor: "text-gray-900",
      accent: "border-l-emerald-400",
      testId: "card-summary-good",
    },
    {
      label: "Missing",
      value: missing,
      icon: XCircle,
      iconColor: "text-rose-400",
      bgColor: "bg-white",
      valueColor: "text-gray-900",
      accent: "border-l-rose-400",
      testId: "card-summary-missing",
    },
    {
      label: "Need Replacement",
      value: needReplacement,
      icon: AlertTriangle,
      iconColor: "text-amber-400",
      bgColor: "bg-white",
      valueColor: "text-gray-900",
      accent: "border-l-amber-400",
      testId: "card-summary-replacement",
    },
    {
      label: "Issues Logged",
      value: issuesLogged,
      icon: FileText,
      iconColor: "text-slate-400",
      bgColor: "bg-white",
      valueColor: "text-gray-900",
      accent: "border-l-slate-400",
      testId: "card-summary-issues",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.testId}
          className={`${card.bgColor} rounded-xl border border-gray-100 border-l-[3px] ${card.accent} p-5 transition-all hover:shadow-sm`}
          data-testid={card.testId}
        >
          <div className="flex items-center justify-between mb-3">
            <card.icon className={`h-5 w-5 ${card.iconColor}`} />
          </div>
          <p className={`text-2xl font-semibold ${card.valueColor} tracking-tight`}>{card.value}</p>
          <p className="text-xs text-gray-400 mt-1 font-medium uppercase tracking-wider">{card.label}</p>
        </div>
      ))}
    </div>
  );
}

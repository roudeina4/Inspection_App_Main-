import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { SummaryCards, InspectionInboxTable } from "@/components/portal";
import { CalendarDays, TrendingUp } from "lucide-react";
import type { InspectionTask, User, Unit } from "@shared/schema";

export default function DashboardPage() {
  const { user } = useAuth();

  const { data: tasks, isLoading: tasksLoading } = useQuery<InspectionTask[]>({
    queryKey: ["/api/inspection-tasks"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: units } = useQuery<Unit[]>({
    queryKey: ["/api/units"],
  });

  const stats = {
    good: 24,
    missing: 3,
    needReplacement: 5,
    issuesLogged: 8,
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 tracking-tight" data-testid="text-dashboard-title">
            Welcome back, {user?.name?.split(" ")[0]}
          </h1>
          <div className="flex items-center gap-1.5 mt-1">
            <CalendarDays className="h-3.5 w-3.5 text-gray-300" />
            <p className="text-sm text-gray-400">{today}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-white rounded-lg border border-gray-100 px-3 py-2">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
          <span>{units?.length || 0} units</span>
          <span className="text-gray-200">|</span>
          <span>{tasks?.length || 0} inspections</span>
        </div>
      </div>

      <SummaryCards
        good={stats.good}
        missing={stats.missing}
        needReplacement={stats.needReplacement}
        issuesLogged={stats.issuesLogged}
      />

      <InspectionInboxTable
        tasks={tasks || []}
        users={users || []}
        units={units || []}
        isLoading={tasksLoading}
      />
    </div>
  );
}

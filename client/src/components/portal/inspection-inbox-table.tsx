import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FileText } from "lucide-react";
import { StatusPill } from "./status-pill";
import { ActionsDropdown } from "./actions-dropdown";
import type { InspectionTask, User, Unit } from "@shared/schema";

interface InspectionInboxTableProps {
  tasks: InspectionTask[];
  users: User[];
  units: Unit[];
  isLoading?: boolean;
}

export function InspectionInboxTable({ tasks, users, units, isLoading }: InspectionInboxTableProps) {
  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user?.name || "Unknown";
  };

  const getUnitDisplay = (unitId: string) => {
    const unit = units.find((u) => u.id === unitId);
    return unit ? `${unit.propertyName} - ${unit.unitNumber}` : `Unit ${unitId}`;
  };

  const getUnitInitial = (unitId: string) => {
    const unit = units.find((u) => u.id === unitId);
    return unit?.propertyName?.charAt(0).toUpperCase() || "U";
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatType = (type: string) => {
    return type === "FULL_INSPECTION" ? "Full Inspection" : "Onboarding";
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-5 md:px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900" data-testid="text-inbox-title">Inspection Inbox</h2>
          <p className="text-xs text-gray-400 mt-0.5">{tasks.length} total</p>
        </div>
      </div>

      {isLoading ? (
        <div className="px-6 py-16 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-5 w-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-400">Loading inspections...</span>
          </div>
        </div>
      ) : !tasks || tasks.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center">
              <FileText className="h-5 w-5 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">No inspections found</p>
          </div>
        </div>
      ) : (
        <>
          <div className="hidden md:block">
            <table className="w-full" data-testid="table-inspection-inbox">
              <thead>
                <tr className="border-t border-gray-50">
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Inspector
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, idx) => (
                  <tr 
                    key={task.id} 
                    className={`transition-colors hover:bg-gray-50/60 ${idx !== tasks.length - 1 ? "border-b border-gray-50" : ""}`}
                    data-testid={`row-task-${task.id}`}
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-semibold">
                            {getUnitInitial(task.unitId)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-gray-800 text-sm">
                          {getUnitDisplay(task.unitId)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-gray-500 text-sm">
                        {getUserName(task.assignedToUserId)}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-gray-500 text-sm">
                        {formatType(task.type)}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <StatusPill status={task.status} />
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-gray-400 text-sm">
                        {formatDate(task.createdAt)}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <ActionsDropdown taskId={task.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-gray-50" data-testid="mobile-inspection-inbox">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="px-4 py-3.5 space-y-2"
                data-testid={`card-task-${task.id}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar className="h-7 w-7 flex-shrink-0">
                      <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-semibold">
                        {getUnitInitial(task.unitId)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-gray-800 text-sm truncate">
                      {getUnitDisplay(task.unitId)}
                    </span>
                  </div>
                  <ActionsDropdown taskId={task.id} />
                </div>
                <div className="flex items-center flex-wrap gap-2 text-sm pl-[38px]">
                  <StatusPill status={task.status} />
                  <span className="text-gray-400 text-xs">{formatType(task.type)}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs text-gray-400 pl-[38px]">
                  <span>{getUserName(task.assignedToUserId)}</span>
                  <span>{formatDate(task.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

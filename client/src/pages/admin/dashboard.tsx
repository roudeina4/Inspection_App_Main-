import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { StatusPill, ActionsDropdown } from "@/components/portal";
import { useLocation } from "wouter";
import { Plus } from "lucide-react";
import type { InspectionTask, QuickReport, User, Unit } from "@shared/schema";

type InboxItem = {
  id: string;
  sourceType: "inspection" | "quick_report";
  unitId: string;
  unitNumber: string;
  inspectorId: string;
  responsiblePmId: string | null;
  type: string;
  status: string;
  dateSubmitted: Date;
};

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Filters state
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [pmFilter, setPmFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Create Unit dialog state
  const [createUnitOpen, setCreateUnitOpen] = useState(false);
  const [newUnitData, setNewUnitData] = useState({
    propertyName: "",
    unitNumber: "",
    address: "",
  });

  // Fetch data
  const { data: tasks, isLoading: tasksLoading } = useQuery<InspectionTask[]>({
    queryKey: ["/api/inspection-tasks"],
  });

  const { data: quickReports, isLoading: reportsLoading } = useQuery<QuickReport[]>({
    queryKey: ["/api/quick-reports"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: units } = useQuery<Unit[]>({
    queryKey: ["/api/units"],
  });

  const isLoading = tasksLoading || reportsLoading;

  // Mutation for updating task status
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      return apiRequest("PATCH", `/api/inspection-tasks/${taskId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inspection-tasks"] });
    },
  });

  // Mutation for creating unit
  const createUnitMutation = useMutation({
    mutationFn: async (data: { propertyName: string; unitNumber: string; address: string }) => {
      return apiRequest("POST", "/api/units", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      setCreateUnitOpen(false);
      setNewUnitData({ propertyName: "", unitNumber: "", address: "" });
    },
  });

  // Helper functions
  const getUserName = (userId: string) => {
    const foundUser = users?.find((u) => u.id === userId);
    return foundUser?.name || "Unknown";
  };

  const getUnitDisplay = (unitId: string) => {
    const unit = units?.find((u) => u.id === unitId);
    return unit ? `${unit.propertyName} - ${unit.unitNumber}` : `Unit`;
  };

  const getUnitInitial = (unitId: string) => {
    const unit = units?.find((u) => u.id === unitId);
    return unit?.propertyName?.charAt(0).toUpperCase() || "U";
  };

  // Get PM users for filter
  const pmUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((u) => u.role === "PM" || u.role === "ADMIN");
  }, [users]);

  // Combine ALL inspections and quick reports (not filtered by PM)
  const inboxItems = useMemo((): InboxItem[] => {
    const items: InboxItem[] = [];

    // Add ALL inspection tasks
    if (tasks) {
      tasks.forEach((task) => {
        items.push({
          id: task.id,
          sourceType: "inspection",
          unitId: task.unitId,
          unitNumber: getUnitDisplay(task.unitId),
          inspectorId: task.assignedToUserId,
          responsiblePmId: task.responsiblePmId,
          type: task.type === "FULL_INSPECTION" ? "Full Inspection" : "Onboarding",
          status: task.status,
          dateSubmitted: new Date(task.createdAt),
        });
      });
    }

    // Add ALL quick reports
    if (quickReports) {
      quickReports.forEach((report) => {
        const mappedStatus = report.status === "NEW" ? "SUBMITTED" : 
                             report.status === "ACKNOWLEDGED" ? "REVIEWED" : "ARCHIVED";
        items.push({
          id: report.id,
          sourceType: "quick_report",
          unitId: "",
          unitNumber: report.unitNumber,
          inspectorId: report.createdById,
          responsiblePmId: report.responsiblePmId,
          type: "Quick Report",
          status: mappedStatus,
          dateSubmitted: new Date(report.createdAt),
        });
      });
    }

    // Sort by date descending
    return items.sort((a, b) => b.dateSubmitted.getTime() - a.dateSubmitted.getTime());
  }, [tasks, quickReports, users, units]);

  // Apply filters
  const filteredItems = useMemo(() => {
    return inboxItems.filter((item) => {
      // Status filter
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }

      // Unit filter
      if (unitFilter !== "all") {
        if (item.unitId && item.unitId !== unitFilter) return false;
        if (!item.unitId && item.unitNumber !== unitFilter) return false;
      }

      // PM filter
      if (pmFilter !== "all") {
        if (item.responsiblePmId !== pmFilter) return false;
      }

      // Date from filter
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        if (item.dateSubmitted < fromDate) return false;
      }

      // Date to filter
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (item.dateSubmitted > toDate) return false;
      }

      return true;
    });
  }, [inboxItems, statusFilter, unitFilter, pmFilter, dateFrom, dateTo]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleView = (item: InboxItem) => {
    if (item.sourceType === "quick_report") {
      setLocation(`/portal/quick-reports`);
    } else {
      setLocation(`/pm/inspection/${item.id}`);
    }
  };

  const handleMarkReviewed = (itemId: string) => {
    updateTaskMutation.mutate({ taskId: itemId, status: "REVIEWED" });
  };

  const handleMarkSent = (itemId: string) => {
    updateTaskMutation.mutate({ taskId: itemId, status: "ARCHIVED" });
  };

  const handleCreateUnit = () => {
    if (!newUnitData.propertyName || !newUnitData.unitNumber || !newUnitData.address) {
      return;
    }
    createUnitMutation.mutate(newUnitData);
  };

  // Get unique units for filter dropdown
  const unitOptions = useMemo(() => {
    if (!units) return [];
    return units.map((unit) => ({
      id: unit.id,
      label: `${unit.propertyName} - ${unit.unitNumber}`,
    }));
  }, [units]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm font-medium mb-1">Overview</p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight" data-testid="text-page-title">
            Admin Dashboard
          </h1>
        </div>
        <Button onClick={() => setCreateUnitOpen(true)} data-testid="button-create-unit" className="shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          Create Unit
        </Button>
      </div>

      {/* Filters Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-4 bg-card p-4 md:p-5 rounded-2xl shadow-sm border">
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Status:</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px]" data-testid="filter-status">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="ASSIGNED">Draft</SelectItem>
              <SelectItem value="SUBMITTED">Submitted</SelectItem>
              <SelectItem value="REVIEWED">Reviewed</SelectItem>
              <SelectItem value="ARCHIVED">Sent to Owner</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Unit Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Unit:</label>
          <Select value={unitFilter} onValueChange={setUnitFilter}>
            <SelectTrigger className="w-full sm:w-[200px]" data-testid="filter-unit">
              <SelectValue placeholder="All Units" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Units</SelectItem>
              {unitOptions.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  {unit.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Assigned PM Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">Assigned PM:</label>
          <Select value={pmFilter} onValueChange={setPmFilter}>
            <SelectTrigger className="w-full sm:w-[180px]" data-testid="filter-pm">
              <SelectValue placeholder="All PMs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All PMs</SelectItem>
              {pmUsers.map((pm) => (
                <SelectItem key={pm.id} value={pm.id}>
                  {pm.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">From:</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full sm:w-[150px]"
            data-testid="filter-date-from"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">To:</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full sm:w-[150px]"
            data-testid="filter-date-to"
          />
        </div>

        {/* Clear Filters */}
        {(statusFilter !== "all" || unitFilter !== "all" || pmFilter !== "all" || dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter("all");
              setUnitFilter("all");
              setPmFilter("all");
              setDateFrom("");
              setDateTo("");
            }}
            data-testid="button-clear-filters"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Inspection Inbox Table */}
      <div className="bg-card rounded-2xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="table-inspection-inbox">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-3 py-3 md:px-6 md:py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Unit
                </th>
                <th className="px-3 py-3 md:px-6 md:py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Inspector
                </th>
                <th className="px-3 py-3 md:px-6 md:py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Assigned PM
                </th>
                <th className="px-3 py-3 md:px-6 md:py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Type
                </th>
                <th className="px-3 py-3 md:px-6 md:py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 py-3 md:px-6 md:py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Date Submitted
                </th>
                <th className="px-3 py-3 md:px-6 md:py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 md:px-6 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Loading inspections...
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 md:px-6 text-center text-muted-foreground">
                    No inspections found
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={`${item.sourceType}-${item.id}`}
                    className="hover:bg-muted/30 transition-colors"
                    data-testid={`row-inspection-${item.id}`}
                  >
                    {/* Unit Column */}
                    <td className="px-3 py-3 md:px-6 md:py-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gradient-to-br from-chart-3 to-chart-5 text-white text-xs font-semibold">
                            {item.unitId ? getUnitInitial(item.unitId) : item.unitNumber.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">
                          {item.unitNumber}
                        </span>
                      </div>
                    </td>

                    {/* Inspector Column */}
                    <td className="px-3 py-3 md:px-6 md:py-4">
                      <span className="text-sm">{getUserName(item.inspectorId)}</span>
                    </td>

                    {/* Assigned PM Column */}
                    <td className="px-3 py-3 md:px-6 md:py-4">
                      <span className="text-sm">
                        {item.responsiblePmId ? getUserName(item.responsiblePmId) : "-"}
                      </span>
                    </td>

                    {/* Type Column */}
                    <td className="px-3 py-3 md:px-6 md:py-4">
                      <span className="text-sm">{item.type}</span>
                    </td>

                    {/* Status Column */}
                    <td className="px-3 py-3 md:px-6 md:py-4">
                      <StatusPill status={item.status} />
                    </td>

                    {/* Date Column */}
                    <td className="px-3 py-3 md:px-6 md:py-4">
                      <span className="text-muted-foreground text-sm">
                        {formatDate(item.dateSubmitted)}
                      </span>
                    </td>

                    {/* Actions Column */}
                    <td className="px-3 py-3 md:px-6 md:py-4 text-right">
                      <ActionsDropdown
                        taskId={item.id}
                        status={item.status}
                        onView={() => handleView(item)}
                        onMarkReviewed={item.sourceType === "inspection" ? () => handleMarkReviewed(item.id) : undefined}
                        onMarkSent={item.sourceType === "inspection" ? () => handleMarkSent(item.id) : undefined}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Unit Dialog */}
      <Dialog open={createUnitOpen} onOpenChange={setCreateUnitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Unit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="propertyName">Property Name</Label>
              <Input
                id="propertyName"
                value={newUnitData.propertyName}
                onChange={(e) => setNewUnitData({ ...newUnitData, propertyName: e.target.value })}
                placeholder="Enter property name"
                data-testid="input-property-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitNumber">Unit Number</Label>
              <Input
                id="unitNumber"
                value={newUnitData.unitNumber}
                onChange={(e) => setNewUnitData({ ...newUnitData, unitNumber: e.target.value })}
                placeholder="Enter unit number"
                data-testid="input-unit-number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={newUnitData.address}
                onChange={(e) => setNewUnitData({ ...newUnitData, address: e.target.value })}
                placeholder="Enter address"
                data-testid="input-address"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateUnitOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateUnit} 
              disabled={createUnitMutation.isPending || !newUnitData.propertyName || !newUnitData.unitNumber || !newUnitData.address}
              data-testid="button-submit-create-unit"
            >
              {createUnitMutation.isPending ? "Creating..." : "Create Unit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

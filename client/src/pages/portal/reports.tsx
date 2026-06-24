import { PageHeader } from "@/components/portal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, FileText, Download, Calendar, TrendingUp, ClipboardCheck, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { InspectionTask, QuickReport } from "@shared/schema";
import { useState } from "react";

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState("30");

  const { data: tasks } = useQuery<InspectionTask[]>({
    queryKey: ["/api/inspection-tasks"],
  });

  const { data: quickReports } = useQuery<QuickReport[]>({
    queryKey: ["/api/quick-reports"],
  });

  const stats = {
    totalInspections: tasks?.length || 0,
    completedInspections: tasks?.filter((t) => t.status === "REVIEWED" || t.status === "ARCHIVED").length || 0,
    totalQuickReports: quickReports?.length || 0,
    resolvedReports: quickReports?.filter((r) => r.status === "RESOLVED").length || 0,
  };

  const completionRate = stats.totalInspections > 0 
    ? Math.round((stats.completedInspections / stats.totalInspections) * 100) 
    : 0;

  const resolutionRate = stats.totalQuickReports > 0 
    ? Math.round((stats.resolvedReports / stats.totalQuickReports) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Analytics and reporting dashboard"
        action={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full sm:w-40" data-testid="select-date-range">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-inspections">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Total Inspections</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalInspections}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card data-testid="card-completion-rate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{completionRate}%</div>
            <p className="text-xs text-muted-foreground">{stats.completedInspections} of {stats.totalInspections} completed</p>
          </CardContent>
        </Card>

        <Card data-testid="card-quick-reports">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Quick Reports</CardTitle>
            <AlertTriangle className="h-4 w-4 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalQuickReports}</div>
            <p className="text-xs text-muted-foreground">Issues reported</p>
          </CardContent>
        </Card>

        <Card data-testid="card-resolution-rate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{resolutionRate}%</div>
            <p className="text-xs text-muted-foreground">{stats.resolvedReports} of {stats.totalQuickReports} resolved</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Inspection Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BarChart3 className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">Activity Chart</p>
              <p className="text-sm text-center">
                Interactive charts will display inspection trends and patterns over time
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Report Types Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  <span className="text-sm">Full Inspections</span>
                </div>
                <span className="font-medium">{tasks?.filter((t) => t.type === "FULL_INSPECTION").length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-chart-2" />
                  <span className="text-sm">Onboarding Inspections</span>
                </div>
                <span className="font-medium">{tasks?.filter((t) => t.type === "ONBOARDING").length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-chart-4" />
                  <span className="text-sm">Quick Reports</span>
                </div>
                <span className="font-medium">{stats.totalQuickReports}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ReportCard
              title="Inspection Summary"
              description="Overview of all inspections with status breakdown"
              icon={ClipboardCheck}
            />
            <ReportCard
              title="Issue Report"
              description="Summary of all reported issues and their resolution status"
              icon={AlertTriangle}
            />
            <ReportCard
              title="Property Report"
              description="Inspection history grouped by property unit"
              icon={FileText}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ReportCard({ title, description, icon: Icon }: { title: string; description: string; icon: typeof FileText }) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-lg border hover-elevate cursor-pointer" data-testid={`report-card-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="p-2 rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1">
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button size="sm" variant="ghost">
        <Download className="h-4 w-4" />
      </Button>
    </div>
  );
}

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Search, Loader2, AlertTriangle, Eye, Check } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import type { QuickReport, User, QuickReportStatus } from "@shared/schema";

export default function QuickReportsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: reports, isLoading } = useQuery<QuickReport[]>({
    queryKey: ["/api/quick-reports"],
  });


  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: QuickReportStatus }) => {
      return apiRequest("PATCH", `/api/quick-reports/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-reports"] });
      toast({ title: "Status Updated" });
    },
    onError: (error) => {
      toast({ variant: "destructive", title: "Error", description: error.message });
    },
  });

  const filteredReports = reports?.filter((report) => {
    const matchesStatus = statusFilter === "all" || report.status === statusFilter;
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      report.description.toLowerCase().includes(searchLower) ||
      report.unitNumber.toLowerCase().includes(searchLower) ||
      report.location.toLowerCase().includes(searchLower);
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: QuickReportStatus) => {
    const variants: Record<QuickReportStatus, { variant: "default" | "secondary" | "destructive"; label: string }> = {
      NEW: { variant: "destructive", label: "New" },
      ACKNOWLEDGED: { variant: "default", label: "Acknowledged" },
      RESOLVED: { variant: "secondary", label: "Resolved" },
    };
    const config = variants[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive"; label: string }> = {
      MINOR: { variant: "secondary", label: "Minor" },
      MODERATE: { variant: "default", label: "Moderate" },
      SEVERE: { variant: "destructive", label: "Severe" },
    };
    const config = variants[severity] || { variant: "secondary", label: severity };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getLocationLabel = (location: string) => {
    return location?.replace(/_/g, " ") || "Unknown";
  };

  const getUserName = (userId: string) => {
    const user = users?.find((u) => u.id === userId);
    return user?.name || userId.slice(0, 8);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Quick Reports</h1>
        <p className="text-muted-foreground">View and manage issue reports</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-sm"
                data-testid="input-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40" data-testid="select-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="NEW">New</SelectItem>
                <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredReports?.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No reports found</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unit</TableHead>
                    <TableHead className="hidden md:table-cell">Location</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead className="hidden lg:table-cell">Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports?.map((report) => (
                    <TableRow key={report.id} data-testid={`report-row-${report.id}`}>
                      <TableCell className="font-medium">{report.unitNumber}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {getLocationLabel(report.location)}
                      </TableCell>
                      <TableCell>{getSeverityBadge(report.severity)}</TableCell>
                      <TableCell className="hidden lg:table-cell max-w-xs truncate">{report.description}</TableCell>
                      <TableCell>{getStatusBadge(report.status)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {report.status === "NEW" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => updateStatusMutation.mutate({ id: report.id, status: "ACKNOWLEDGED" })}
                              title="Acknowledge"
                              data-testid={`button-ack-${report.id}`}
                            >
                              <Check className="h-4 w-4 text-chart-2" />
                            </Button>
                          )}
                          <Link href={`/portal/quick-reports/${report.id}`}>
                            <Button variant="ghost" size="icon" data-testid={`button-view-${report.id}`}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

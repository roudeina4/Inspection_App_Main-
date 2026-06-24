import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { OwnerReportContent } from "./report-view";
import PublicOnboardingPage from "@/pages/public-onboarding";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import tbaLogo from "@assets/TBA-Logo-1024x1024_1773458605605.webp";
import {
  Building2,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  LogOut,
  CalendarDays,
  TrendingUp,
  Shield,
  Eye,
  BarChart3,
  Loader2,
  LayoutDashboard,
  Menu,
  X,
  Filter,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

interface PropertyWithStats {
  id: string;
  nickname: string;
  title: string;
  address: string;
  photoUrl?: string;
  reportCount: number;
  openIssues: number;
  latestReport: any;
}

interface MonthlySummary {
  month: string;
  totalReports: number;
  totalIssues: number;
  completedIssues: number;
  openIssues: number;
  highSeverityIssues: number;
  completionRate: number;
}

function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    options.push({ value, label });
  }
  return options;
}

type OwnerView = "dashboard" | "inspections" | "onboarding" | "summary" | "report";

export default function OwnerDashboard() {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [, reportParams] = useRoute("/owner/report/:id");
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<OwnerView>("dashboard");
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const prevViewRef = useRef(activeView);

  useEffect(() => {
    if (activeView === "report" && prevViewRef.current !== "report") {
      setSidebarCollapsed(true);
    }
    prevViewRef.current = activeView;
  }, [activeView]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMd, setIsMd] = useState(typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : true);

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const handler = (e: MediaQueryListEvent) => setIsMd(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  const [selectedMonth, setSelectedMonth] = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
  );

  const { data: properties, isLoading: propertiesLoading } = useQuery<PropertyWithStats[]>({
    queryKey: ["/api/owner/properties"],
  });

  const { data: pendingOnboardings, isLoading: onboardingsLoading } = useQuery<any[]>({
    queryKey: ["/api/owner/my-onboarding"],
  });

  const hasPendingOnboarding = pendingOnboardings && pendingOnboardings.length > 0;

  const activePropertyId = selectedProperty || (properties?.length === 1 ? properties[0].id : null);

  const { data: reports, isLoading: reportsLoading } = useQuery<any[]>({
    queryKey: ["/api/owner/properties", activePropertyId, "reports"],
    enabled: !!activePropertyId,
    queryFn: async () => {
      const res = await fetch(`/api/owner/properties/${activePropertyId}/reports`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("jwt_token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json();
    },
  });

  const { data: monthlySummary } = useQuery<MonthlySummary>({
    queryKey: ["/api/owner/monthly-summary", selectedMonth],
    queryFn: async () => {
      const res = await fetch(`/api/owner/monthly-summary?month=${selectedMonth}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("jwt_token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch summary");
      return res.json();
    },
  });

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const postStayReports = reports?.filter((r: any) => r.task?.type === "FULL_INSPECTION") || [];
  const onboardingReports = reports?.filter((r: any) => r.task?.type === "ONBOARDING") || [];
  const activeProperty = properties?.find((p) => p.id === activePropertyId);
  const totalOpenIssues = properties?.reduce((sum, p) => sum + p.openIssues, 0) || 0;
  const totalReports = properties?.reduce((sum, p) => sum + p.reportCount, 0) || 0;

  useEffect(() => {
    if (reportParams?.id) {
      setActiveReportId(reportParams.id);
      setActiveView("report");
    } else if (activeView === "report") {
      setActiveReportId(null);
      setActiveView("inspections");
    }
  }, [reportParams?.id]);

  useEffect(() => {
    if (mobileMenuOpen) setMobileMenuOpen(false);
  }, [activeView]);

  if (propertiesLoading || onboardingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f2f4f8]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-6 w-6 animate-spin text-[#6b7280]" />
          <p className="text-[13px] text-[#9ca3af]">Loading...</p>
        </div>
      </div>
    );
  }

  if (hasPendingOnboarding) {
    const onboarding = pendingOnboardings[0];
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={tbaLogo} alt="TBA" className="h-8 w-8 rounded-lg object-contain" />
            <div>
              <h1 className="text-sm font-bold text-slate-900">Welcome, {user?.name}</h1>
              <p className="text-xs text-slate-500">
                {onboarding.unit?.propertyName} — Unit {onboarding.unit?.unitNumber}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            data-testid="button-logout-onboarding"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </header>
        <div className="flex-1 overflow-auto">
          <PublicOnboardingPage
            token={onboarding.shareToken}
            onComplete={() => {
              queryClient.invalidateQueries({ queryKey: ["/api/owner/my-onboarding"] });
            }}
          />
        </div>
      </div>
    );
  }

  const navItems = [
    { key: "dashboard" as OwnerView, label: "Dashboard", icon: LayoutDashboard },
    { key: "inspections" as OwnerView, label: "Inspections", icon: Eye, count: postStayReports.length },
    { key: "onboarding" as OwnerView, label: "Onboarding", icon: Shield, count: onboardingReports.length },
    { key: "summary" as OwnerView, label: "Summary", icon: BarChart3 },
  ];

  const showLabels = !sidebarCollapsed;
  const sidebarWidth = sidebarCollapsed ? 72 : 250;

  const renderSidebarContent = (isMobile: boolean) => {
    const labels = isMobile || showLabels;
    return (
      <>
        <div className={`pt-5 pb-3 flex items-center ${labels ? "px-5 justify-between" : "px-3 justify-center"}`}>
          <div className={`flex items-center ${labels ? "gap-3" : "justify-center"}`}>
            <img src={tbaLogo} alt="TBA" className="h-9 w-9 rounded-lg object-contain bg-white/10 p-0.5 flex-shrink-0" />
            {labels && (
              <div className="flex flex-col">
                <span className="font-semibold text-[14px] text-white tracking-tight leading-tight" data-testid="text-owner-title">TBA Owner</span>
                <span className="text-[10px] text-slate-400 tracking-wider uppercase">Portal</span>
              </div>
            )}
          </div>
          {isMobile && (
            <button type="button" onClick={() => setMobileMenuOpen(false)} className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {!isMobile && (
          <div className={`px-3 mb-1 ${sidebarCollapsed ? "flex justify-center" : ""}`}>
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="h-7 w-7 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              data-testid="button-toggle-sidebar"
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}

        {labels && activeProperty && (
          <div className="px-4 mb-2">
            <div className="rounded-lg px-3 py-2.5 bg-white/[0.06]">
              <p className="text-[10px] text-slate-500 mb-0.5">Current Property</p>
              <p className="text-[13px] font-medium text-white truncate">{activeProperty.title || activeProperty.nickname}</p>
              {properties && properties.length > 1 && (
                <button
                  type="button"
                  onClick={() => { setSelectedProperty(null); setActiveView("dashboard"); if (isMobile) setMobileMenuOpen(false); }}
                  className="text-[10px] text-teal-400 hover:text-teal-300 mt-1 transition-colors"
                  data-testid="button-switch-property"
                >
                  Switch property
                </button>
              )}
            </div>
          </div>
        )}

        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeView === item.key || (activeView === "report" && item.key === "inspections");
            return (
              <button
                type="button"
                key={item.key}
                onClick={() => { setActiveView(item.key); setActiveReportId(null); if (isMobile) setMobileMenuOpen(false); if (location !== "/owner") setLocation("/owner"); }}
                className={`w-full flex items-center px-3 py-2 rounded-lg transition-all ${
                  labels ? "gap-2.5" : "justify-center"
                } ${isActive ? "bg-white/[0.12] text-white" : "text-slate-400 hover:text-white hover:bg-white/[0.06]"}`}
                data-testid={isMobile ? `nav-mobile-${item.key}` : `nav-${item.key}`}
              >
                <item.icon className={`h-[16px] w-[16px] flex-shrink-0 ${isActive ? "text-teal-400" : ""}`} />
                {labels && (
                  <>
                    <span className={`text-[13px] flex-1 text-left ${isActive ? "font-semibold" : "font-medium"}`}>
                      {item.label}
                    </span>
                    {item.count !== undefined && item.count > 0 && (
                      <span className={`text-[10px] min-w-[18px] text-center px-1.5 py-0.5 rounded-full ${
                        isActive ? "bg-teal-500/20 text-teal-300" : "bg-white/10 text-slate-500"
                      }`}>{item.count}</span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        <div className={`py-4 ${labels ? "px-4" : "px-2"}`} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className={`flex items-center ${labels ? "gap-3 px-1" : "justify-center"}`}>
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-teal-500 to-teal-600 text-white font-semibold text-[11px]">
                {user?.name?.charAt(0).toUpperCase() || "O"}
              </AvatarFallback>
            </Avatar>
            {labels && (
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-white truncate">{user?.name || "Owner"}</p>
                <p className="text-[10px] text-slate-500">Owner</p>
              </div>
            )}
          </div>
          {labels && (
            <button
              type="button"
              onClick={handleLogout}
              className="w-full mt-3 flex items-center gap-2 px-3 py-1.5 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors text-[12px]"
              data-testid={isMobile ? "button-logout-mobile" : "button-logout"}
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f2f4f8]">
      <aside
        className="hidden md:flex fixed left-0 top-0 bottom-0 flex-col z-50 transition-all duration-300"
        style={{
          width: sidebarWidth,
          background: "linear-gradient(180deg, #111827 0%, #1a2332 100%)",
          borderRight: "1px solid rgba(255,255,255,0.04)",
        }}
        data-testid="owner-sidebar"
      >
        {renderSidebarContent(false)}
      </aside>

      <div className="md:hidden">
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setMobileMenuOpen(false)} />
        )}
        <aside
          className={`fixed left-0 top-0 bottom-0 w-[270px] flex flex-col z-50 transition-transform duration-300 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
          style={{ background: "linear-gradient(180deg, #111827 0%, #1a2332 100%)" }}
        >
          {renderSidebarContent(true)}
        </aside>
      </div>

      <div
        className="flex flex-col flex-1 relative z-10 transition-all duration-300"
        style={{ marginLeft: isMd ? sidebarWidth : 0 }}
      >
        <header className="sticky top-0 z-30 h-12 flex items-center px-4 md:px-6 bg-[#f2f4f8]/80 backdrop-blur-md" style={{ borderBottom: "1px solid #e5e7eb" }}>
          <div className="flex items-center gap-3 flex-1">
            <button
              type="button"
              className="md:hidden h-8 w-8 flex items-center justify-center text-[#6b7280] hover:bg-black/[0.04] rounded-lg"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-[15px] font-semibold text-[#1f2937] tracking-tight">
              {activeView === "dashboard" && "Dashboard"}
              {activeView === "inspections" && "Inspections"}
              {activeView === "onboarding" && "Onboarding"}
              {activeView === "summary" && "Summary"}
              {activeView === "report" && "Report"}
            </h1>
            {activeProperty && (
              <span className="text-[13px] text-[#9ca3af] hidden sm:inline">· {activeProperty.title || activeProperty.nickname}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLogout}
              className="md:hidden h-8 w-8 flex items-center justify-center text-[#9ca3af] hover:text-[#6b7280] rounded-lg"
              data-testid="button-logout-header"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto" style={{ scrollbarGutter: "stable" }}>
          <div className="w-full px-4 md:px-6 py-6">
            {!properties?.length ? (
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="max-w-sm w-full rounded-2xl bg-white p-12 text-center shadow-sm border border-[#e5e7eb]">
                  <div className="h-14 w-14 rounded-2xl bg-[#f3f4f6] flex items-center justify-center mx-auto mb-5">
                    <Building2 className="h-7 w-7 text-[#9ca3af]" />
                  </div>
                  <h2 className="text-[17px] font-semibold text-[#1f2937] mb-2">No Properties Found</h2>
                  <p className="text-[13px] text-[#9ca3af] leading-relaxed">No properties are linked to your account. Please contact your property manager.</p>
                </div>
              </div>
            ) : !activePropertyId ? (
              <PropertyPicker
                properties={properties}
                totalReports={totalReports}
                totalOpenIssues={totalOpenIssues}
                onSelect={(id) => { setSelectedProperty(id); setActiveView("dashboard"); }}
              />
            ) : (
              <>
                {activeView === "dashboard" && (
                  <DashboardView
                    property={activeProperty!}
                    reports={reports || []}
                    reportsLoading={reportsLoading}
                    postStayReports={postStayReports}
                    onboardingReports={onboardingReports}
                    monthlySummary={monthlySummary || null}
                    selectedMonth={selectedMonth}
                    onMonthChange={setSelectedMonth}
                    onViewReport={(id) => { setActiveReportId(id); setActiveView("report"); setLocation(`/owner/report/${id}`); }}
                    onViewAll={(view) => setActiveView(view)}
                  />
                )}
                {activeView === "inspections" && (
                  <InspectionsTableView
                    reports={postStayReports}
                    loading={reportsLoading}
                    onViewReport={(id) => { setActiveReportId(id); setActiveView("report"); setLocation(`/owner/report/${id}`); }}
                  />
                )}
                {activeView === "onboarding" && (
                  <ReportListView
                    title="Onboarding Reports"
                    subtitle="Property onboarding inspection reports"
                    icon={<Shield className="h-5 w-5 text-indigo-500" />}
                    reports={onboardingReports}
                    loading={reportsLoading}
                    emptyIcon={<Shield className="h-8 w-8 text-[#d1d5db]" />}
                    emptyText="No published onboarding reports yet"
                    onViewReport={(id) => { setActiveReportId(id); setActiveView("report"); setLocation(`/owner/report/${id}`); }}
                  />
                )}
                {activeView === "summary" && (
                  <SummaryView
                    monthlySummary={monthlySummary || null}
                    selectedMonth={selectedMonth}
                    onMonthChange={setSelectedMonth}
                  />
                )}
                {activeView === "report" && activeReportId && (
                  <OwnerReportContent
                    reportId={activeReportId}
                    onBack={() => { setActiveReportId(null); setActiveView("inspections"); setLocation("/owner"); }}
                    sidebarWidth={isMd ? `${sidebarWidth}px` : undefined}
                  />
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function PropertyPicker({ properties, totalReports, totalOpenIssues, onSelect }: {
  properties: PropertyWithStats[];
  totalReports: number;
  totalOpenIssues: number;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-[24px] font-bold text-[#1f2937] tracking-tight">Your Properties</h2>
        <p className="text-[14px] text-[#9ca3af] mt-1">Select a property to view reports and details</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Properties" value={properties.length} color="text-[#6b7280]" />
        <StatCard label="Total Reports" value={totalReports} color="text-[#6b7280]" />
        <StatCard label="Open Issues" value={totalOpenIssues} color="text-amber-500" />
        <StatCard label="All Clear" value={properties.filter(p => p.openIssues === 0).length} color="text-emerald-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {properties.map((property) => (
          <button
            type="button"
            key={property.id}
            className="group rounded-2xl bg-white p-5 text-left border border-[#e5e7eb] transition-all duration-200 hover:shadow-md hover:border-[#d1d5db] cursor-pointer"
            onClick={() => onSelect(property.id)}
            data-testid={`card-property-${property.id}`}
          >
            <div className="flex items-start gap-4">
              <div className="h-11 w-11 rounded-xl bg-[#f3f4f6] flex items-center justify-center flex-shrink-0">
                <Building2 className="h-5 w-5 text-[#6b7280]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-[14px] text-[#1f2937] truncate group-hover:text-teal-600 transition-colors">
                  {property.title || property.nickname}
                </h3>
                <p className="text-[12px] text-[#9ca3af] mt-0.5 truncate">{property.address}</p>
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-[12px] text-[#9ca3af] flex items-center gap-1">
                    <FileText className="h-3 w-3" /> {property.reportCount}
                  </span>
                  {property.openIssues > 0 ? (
                    <span className="text-[12px] text-amber-500 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3" /> {property.openIssues} open
                    </span>
                  ) : (
                    <span className="text-[12px] text-emerald-500 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="h-3 w-3" /> All clear
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[#d1d5db] group-hover:text-teal-500 transition-colors mt-1" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function DashboardView({ property, reports, reportsLoading, postStayReports, onboardingReports, monthlySummary, selectedMonth, onMonthChange, onViewReport, onViewAll }: {
  property: PropertyWithStats;
  reports: any[];
  reportsLoading: boolean;
  postStayReports: any[];
  onboardingReports: any[];
  monthlySummary: MonthlySummary | null;
  selectedMonth: string;
  onMonthChange: (m: string) => void;
  onViewReport: (id: string) => void;
  onViewAll: (view: OwnerView) => void;
}) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Reports" value={property.reportCount} color="text-[#6b7280]" />
        <StatCard label="Open Issues" value={property.openIssues} color="text-amber-500" />
        <StatCard label="Inspections" value={postStayReports.length} color="text-[#6b7280]" />
        <StatCard label="Onboarding" value={onboardingReports.length} color="text-indigo-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-[#9ca3af] uppercase tracking-wider">Recent Reports</h3>
            {reports.length > 5 && (
              <button type="button" className="text-[13px] text-teal-600 font-medium hover:text-teal-700 transition-colors" onClick={() => onViewAll("inspections")}>
                View All
              </button>
            )}
          </div>
          {reportsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-5 w-5 animate-spin text-[#9ca3af]" />
            </div>
          ) : reports.length === 0 ? (
            <div className="rounded-2xl bg-white p-12 text-center border border-[#e5e7eb]">
              <FileText className="h-8 w-8 mx-auto text-[#d1d5db] mb-3" />
              <p className="text-[13px] text-[#9ca3af]">No published reports yet</p>
              <p className="text-[12px] text-[#d1d5db] mt-1">Reports will appear here once your property manager publishes them</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reports.slice(0, 6).map((report: any) => (
                <ReportRow key={report.id} report={report} onView={() => onViewReport(report.id)} />
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="rounded-2xl bg-white overflow-hidden border border-[#e5e7eb]">
            <div className="px-5 py-4 border-b border-[#f3f4f6]">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-teal-600" />
                <h3 className="text-[13px] font-semibold text-[#1f2937]">Monthly Summary</h3>
              </div>
            </div>
            <div className="p-5 space-y-4">
              <Select value={selectedMonth} onValueChange={onMonthChange}>
                <SelectTrigger className="h-9 text-[13px] rounded-lg" data-testid="select-month">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getMonthOptions().map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <MonthlySummaryContent summary={monthlySummary} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type DateFilterMode = "all" | "month" | "date" | "range";

function InspectionsTableView({ reports, loading, onViewReport }: {
  reports: any[];
  loading: boolean;
  onViewReport: (id: string) => void;
}) {
  const [filterMode, setFilterMode] = useState<DateFilterMode>("all");
  const [filterMonth, setFilterMonth] = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
  );
  const [filterDate, setFilterDate] = useState("");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");

  const filteredReports = useMemo(() => {
    if (filterMode === "all") return reports;
    return reports.filter((report: any) => {
      const d = report.publishedAt ? new Date(report.publishedAt) : new Date(report.createdAt);
      if (filterMode === "month" && filterMonth) {
        const [y, m] = filterMonth.split("-").map(Number);
        return d.getFullYear() === y && d.getMonth() + 1 === m;
      }
      if (filterMode === "date" && filterDate) {
        const target = new Date(filterDate + "T00:00:00");
        return d.getFullYear() === target.getFullYear() && d.getMonth() === target.getMonth() && d.getDate() === target.getDate();
      }
      if (filterMode === "range") {
        if (filterStart && filterEnd) return d >= new Date(filterStart + "T00:00:00") && d <= new Date(filterEnd + "T23:59:59");
        if (filterStart) return d >= new Date(filterStart + "T00:00:00");
        if (filterEnd) return d <= new Date(filterEnd + "T23:59:59");
      }
      return true;
    });
  }, [reports, filterMode, filterMonth, filterDate, filterStart, filterEnd]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[20px] font-bold text-[#1f2937] tracking-tight" data-testid="text-inspections-title">Post-Stay Inspections</h2>
        <p className="text-[13px] text-[#9ca3af] mt-0.5">Reports from completed guest stays</p>
      </div>

      <div className="rounded-xl bg-white p-4 border border-[#e5e7eb]">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[#9ca3af]" />
            <Select value={filterMode} onValueChange={(v) => setFilterMode(v as DateFilterMode)}>
              <SelectTrigger className="w-[150px] rounded-lg text-[13px]" data-testid="select-filter-mode">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="date">Specific Date</SelectItem>
                <SelectItem value="range">Date Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {filterMode === "month" && (
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-[200px] rounded-lg text-[13px]" data-testid="select-filter-month"><SelectValue /></SelectTrigger>
              <SelectContent>{getMonthOptions().map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent>
            </Select>
          )}
          {filterMode === "date" && (
            <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-[180px] rounded-lg text-[13px]" data-testid="input-filter-date" />
          )}
          {filterMode === "range" && (
            <div className="flex items-center gap-2 flex-wrap">
              <Input type="date" value={filterStart} onChange={(e) => setFilterStart(e.target.value)} className="w-[160px] rounded-lg text-[13px]" data-testid="input-filter-start" />
              <span className="text-[12px] text-[#9ca3af]">to</span>
              <Input type="date" value={filterEnd} onChange={(e) => setFilterEnd(e.target.value)} className="w-[160px] rounded-lg text-[13px]" data-testid="input-filter-end" />
            </div>
          )}
          <span className="ml-auto text-[12px] font-medium text-[#6b7280] bg-[#f3f4f6] px-2.5 py-1 rounded-full" data-testid="badge-inspections-count">{filteredReports.length}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-[#9ca3af]" />
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="rounded-2xl bg-white p-14 text-center border border-[#e5e7eb]">
          <Search className="h-8 w-8 mx-auto text-[#d1d5db] mb-3" />
          <p className="text-[13px] text-[#9ca3af]">
            {reports.length === 0 ? "No published post-stay inspections yet" : "No inspections match your date filter"}
          </p>
          {reports.length > 0 && filterMode !== "all" && (
            <button type="button" className="mt-3 text-[13px] text-teal-600 font-medium" onClick={() => setFilterMode("all")} data-testid="button-clear-filter">
              Clear filter
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="hidden md:block rounded-xl bg-white overflow-hidden border border-[#e5e7eb]">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f9fafb]">
                  <TableHead className="font-semibold text-[12px] text-[#6b7280]">Date</TableHead>
                  <TableHead className="font-semibold text-[12px] text-[#6b7280]">Unit</TableHead>
                  <TableHead className="font-semibold text-[12px] text-[#6b7280]">Type</TableHead>
                  <TableHead className="font-semibold text-[12px] text-[#6b7280]">Issues</TableHead>
                  <TableHead className="font-semibold text-[12px] text-[#6b7280]">Status</TableHead>
                  <TableHead className="w-[40px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report: any) => {
                  const openCount = report.openIssues || 0;
                  const totalCount = report.totalIssues || 0;
                  const publishedDate = report.publishedAt ? new Date(report.publishedAt) : new Date(report.createdAt);
                  const unitName = report.unit?.unitNumber || report.unit?.propertyName || "Unit";
                  const inspectionType = report.task?.type === "ONBOARDING" ? "Onboarding" : "Post-Stay";
                  return (
                    <TableRow
                      key={report.id}
                      className="cursor-pointer hover:bg-[#f9fafb] transition-colors"
                      onClick={() => onViewReport(report.id)}
                      data-testid={`row-inspection-${report.id}`}
                    >
                      <TableCell className="text-[13px] font-medium text-[#1f2937]" data-testid={`text-date-${report.id}`}>
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-3.5 w-3.5 text-[#9ca3af]" />
                          {publishedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </TableCell>
                      <TableCell className="text-[13px] text-[#374151]" data-testid={`text-unit-${report.id}`}>{unitName}</TableCell>
                      <TableCell>
                        <span className="text-[11px] font-medium text-[#6b7280] bg-[#f3f4f6] px-2 py-0.5 rounded-full" data-testid={`badge-type-${report.id}`}>{inspectionType}</span>
                      </TableCell>
                      <TableCell data-testid={`text-issues-${report.id}`}>
                        {totalCount > 0 ? (
                          <span className="text-[13px] text-[#6b7280]">
                            <span className={openCount > 0 ? "text-amber-500 font-semibold" : "text-emerald-500 font-semibold"}>{openCount}</span>
                            <span className="text-[#d1d5db] mx-0.5">/</span>{totalCount}
                          </span>
                        ) : <span className="text-[12px] text-[#d1d5db]">--</span>}
                      </TableCell>
                      <TableCell>
                        {openCount === 0 && totalCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600" data-testid={`badge-status-${report.id}`}><CheckCircle2 className="h-3 w-3" /> Resolved</span>
                        ) : openCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600" data-testid={`badge-status-${report.id}`}><AlertCircle className="h-3 w-3" /> {openCount} Open</span>
                        ) : (
                          <span className="text-[11px] text-[#9ca3af]" data-testid={`badge-status-${report.id}`}>No Issues</span>
                        )}
                      </TableCell>
                      <TableCell><ChevronRight className="h-4 w-4 text-[#d1d5db]" /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="md:hidden space-y-2">
            {filteredReports.map((report: any) => (
              <ReportRow key={report.id} report={report} onView={() => onViewReport(report.id)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ReportListView({ title, subtitle, icon, reports, loading, emptyIcon, emptyText, onViewReport }: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  reports: any[];
  loading: boolean;
  emptyIcon: React.ReactNode;
  emptyText: string;
  onViewReport: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          {icon}
          <h2 className="text-[20px] font-bold text-[#1f2937] tracking-tight">{title}</h2>
          <span className="text-[12px] font-medium text-[#6b7280] bg-[#f3f4f6] px-2.5 py-1 rounded-full">{reports.length}</span>
        </div>
        <p className="text-[13px] text-[#9ca3af] mt-0.5">{subtitle}</p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-[#9ca3af]" /></div>
      ) : reports.length === 0 ? (
        <div className="rounded-2xl bg-white p-14 text-center border border-[#e5e7eb]">
          {emptyIcon}
          <p className="text-[13px] text-[#9ca3af] mt-3">{emptyText}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((report: any) => (
            <ReportRow key={report.id} report={report} onView={() => onViewReport(report.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryView({ monthlySummary, selectedMonth, onMonthChange }: {
  monthlySummary: MonthlySummary | null;
  selectedMonth: string;
  onMonthChange: (m: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[20px] font-bold text-[#1f2937] tracking-tight">Monthly Summary</h2>
        <p className="text-[13px] text-[#9ca3af] mt-0.5">Overview of property activity by month</p>
      </div>
      <div className="max-w-lg">
        <Select value={selectedMonth} onValueChange={onMonthChange}>
          <SelectTrigger className="h-10 rounded-lg text-[13px]" data-testid="select-month-full"><SelectValue /></SelectTrigger>
          <SelectContent>{getMonthOptions().map((opt) => (<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>))}</SelectContent>
        </Select>
      </div>
      <div className="max-w-lg">
        <div className="rounded-2xl bg-white p-6 border border-[#e5e7eb]">
          <MonthlySummaryContent summary={monthlySummary} expanded />
        </div>
      </div>
    </div>
  );
}

function MonthlySummaryContent({ summary, expanded }: { summary: MonthlySummary | null; expanded?: boolean }) {
  if (!summary) {
    return (
      <div className="text-center py-6">
        <CalendarDays className="h-7 w-7 mx-auto text-[#d1d5db] mb-2" />
        <p className="text-[12px] text-[#9ca3af]">No data for this month</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className={`grid ${expanded ? "grid-cols-2" : "grid-cols-1"} gap-3`}>
        <SummaryRow label="Reports" value={summary.totalReports} icon={<FileText className="h-3.5 w-3.5 text-teal-600" />} />
        <SummaryRow label="Total Issues" value={summary.totalIssues} icon={<AlertCircle className="h-3.5 w-3.5 text-amber-500" />} />
        <SummaryRow label="Completed" value={summary.completedIssues} icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />} />
        <SummaryRow label="Still Open" value={summary.openIssues} icon={<Clock className="h-3.5 w-3.5 text-amber-500" />} />
      </div>
      {summary.totalIssues > 0 && (
        <div className="pt-3 space-y-2 border-t border-[#f3f4f6]">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-[#9ca3af]">Resolution rate</span>
            <span className="font-semibold text-[#1f2937]">{summary.completionRate}%</span>
          </div>
          <Progress value={summary.completionRate} className="h-1.5" />
        </div>
      )}
      {summary.highSeverityIssues > 0 && (
        <div className="flex items-center gap-2 text-[12px] bg-red-50 text-red-600 rounded-lg px-3 py-2.5 font-medium">
          <TrendingUp className="h-3.5 w-3.5" />
          {summary.highSeverityIssues} high priority issue{summary.highSeverityIssues > 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 border border-[#e5e7eb]">
      <p className="text-[11px] text-[#9ca3af] font-medium uppercase tracking-wider mb-1.5">{label}</p>
      <p className={`text-[26px] font-bold tracking-tight ${color}`}>{value}</p>
    </div>
  );
}

function ReportRow({ report, onView }: { report: any; onView: () => void }) {
  const openCount = report.openIssues || 0;
  const totalCount = report.totalIssues || 0;
  const completedCount = totalCount - openCount;
  const publishedDate = report.publishedAt ? new Date(report.publishedAt) : new Date(report.createdAt);
  const unitName = report.unit?.unitNumber || report.unit?.propertyName || "Unit";
  const inspectionType = report.task?.type === "ONBOARDING" ? "Onboarding" : "Post-Stay";

  return (
    <button
      type="button"
      className="w-full group rounded-xl bg-white p-4 text-left border border-[#e5e7eb] transition-all duration-150 hover:shadow-sm hover:border-[#d1d5db] cursor-pointer"
      onClick={onView}
      data-testid={`card-report-${report.id}`}
    >
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-[#f3f4f6] flex items-center justify-center flex-shrink-0">
          {report.task?.type === "ONBOARDING" ? (
            <Shield className="h-4 w-4 text-indigo-500" />
          ) : (
            <Eye className="h-4 w-4 text-teal-600" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-[13px] font-semibold text-[#1f2937] truncate">{unitName}</h4>
            <span className="text-[10px] font-medium text-[#6b7280] bg-[#f3f4f6] px-2 py-0.5 rounded-full">{inspectionType}</span>
            {openCount === 0 && totalCount > 0 ? (
              <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Resolved</span>
            ) : openCount > 0 ? (
              <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{openCount} Open</span>
            ) : null}
          </div>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-[#9ca3af]">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              {publishedDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <span>{totalCount} items</span>
            {completedCount > 0 && <span className="text-emerald-600">{completedCount} resolved</span>}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-[#d1d5db] group-hover:text-teal-500 transition-colors flex-shrink-0" />
      </div>
    </button>
  );
}

function SummaryRow({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-[13px] text-[#6b7280]">{icon}{label}</div>
      <span className="text-[13px] font-semibold text-[#1f2937]">{value}</span>
    </div>
  );
}

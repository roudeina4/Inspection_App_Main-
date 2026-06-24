import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import QuickReportPage from "@/pages/quick-report";
import FullInspectionPage from "@/pages/full-inspection";
import OnboardingInspectionPage from "@/pages/onboarding-inspection";
import NotificationsPage from "@/pages/notifications";
import PortalLayout from "@/pages/portal/layout";
import DashboardPage from "@/pages/portal/dashboard";
import UnitsPage from "@/pages/portal/units";
import UsersPage from "@/pages/portal/users";
import TasksPage from "@/pages/portal/tasks";
import QuickReportsPage from "@/pages/portal/quick-reports";
import MediaLibraryPage from "@/pages/portal/media-library";
import ReportsPage from "@/pages/portal/reports";
import SettingsPage from "@/pages/portal/settings";
import PropertiesPage from "@/pages/portal/properties";
import PropertyDetailPage from "@/pages/portal/property-detail";
import ImportPropertyPage from "@/pages/portal/import-property";
import PMDashboardPage from "@/pages/pm/dashboard";
import UnitDetailsPage from "@/pages/pm/unit-details";
import InspectionReportPage from "@/pages/pm/inspection-report";
import PMMediaLibraryPage from "@/pages/pm/media-library";
import AdminDashboardPage from "@/pages/admin/dashboard";
import AdminUsersPage from "@/pages/admin/users";
import PortalFullInspectionsPage from "@/pages/portal/inspections/full";
import PortalOnboardingInspectionsPage from "@/pages/portal/inspections/onboarding";
import FormTemplatePage from "@/pages/portal/form-template";
import OwnerReportBuilderPage from "@/pages/pm/owner-report-builder";
import WorkflowBuilderPage from "@/pages/pm/workflow-builder";
import PublicOwnerReportPage from "@/pages/public-owner-report";
import PublicOnboardingPage from "@/pages/public-onboarding";
import MobileHomePage from "@/pages/mobile-home";
import OwnerDashboard from "@/pages/owner/dashboard";

import { Loader2 } from "lucide-react";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

function PortalRoute({ children, fullWidth }: { children: React.ReactNode; fullWidth?: boolean }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (user.role !== "ADMIN" && user.role !== "PM") {
    return <Redirect to="/home" />;
  }

  return <PortalLayout fullWidth={fullWidth}>{children}</PortalLayout>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (user.role !== "ADMIN") {
    return <Redirect to="/portal/dashboard" />;
  }

  return <PortalLayout>{children}</PortalLayout>;
}

function OwnerRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (user.role !== "OWNER") {
    return <Redirect to="/" />;
  }

  return <>{children}</>;
}

function RoleBasedRedirect() {
  const { user } = useAuth();
  if (user?.role === "ADMIN" || user?.role === "PM") {
    return <Redirect to="/portal/dashboard" />;
  }
  if (user?.role === "OWNER") {
    return <Redirect to="/owner" />;
  }
  return <Redirect to="/home" />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      
      <Route path="/home">
        <ProtectedRoute>
          <MobileHomePage />
        </ProtectedRoute>
      </Route>

      <Route path="/quick-report">
        <ProtectedRoute>
          <QuickReportPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/full-inspection">
        <ProtectedRoute>
          <FullInspectionPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/onboarding-inspection">
        <ProtectedRoute>
          <OnboardingInspectionPage />
        </ProtectedRoute>
      </Route>
      
      <Route path="/notifications">
        <ProtectedRoute>
          <NotificationsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/portal/dashboard">
        <PortalRoute>
          <DashboardPage />
        </PortalRoute>
      </Route>

      <Route path="/portal/units">
        <PortalRoute>
          <UnitsPage />
        </PortalRoute>
      </Route>
      
      <Route path="/portal/users">
        <PortalRoute>
          <UsersPage />
        </PortalRoute>
      </Route>
      
      <Route path="/portal/tasks">
        <PortalRoute>
          <TasksPage />
        </PortalRoute>
      </Route>
      
      <Route path="/portal/quick-reports">
        <PortalRoute>
          <QuickReportsPage />
        </PortalRoute>
      </Route>

      <Route path="/portal/properties/:id">
        <PortalRoute>
          <PropertyDetailPage />
        </PortalRoute>
      </Route>

      <Route path="/portal/properties">
        <PortalRoute>
          <PropertiesPage />
        </PortalRoute>
      </Route>

      <Route path="/portal/import-property">
        <PortalRoute>
          <ImportPropertyPage />
        </PortalRoute>
      </Route>

      <Route path="/portal/media">
        <PortalRoute>
          <MediaLibraryPage />
        </PortalRoute>
      </Route>

      <Route path="/portal/reports">
        <PortalRoute>
          <ReportsPage />
        </PortalRoute>
      </Route>

      <Route path="/portal/settings">
        <PortalRoute>
          <SettingsPage />
        </PortalRoute>
      </Route>

      <Route path="/portal/inspections/full">
        <PortalRoute>
          <PortalFullInspectionsPage />
        </PortalRoute>
      </Route>

      <Route path="/portal/inspections/onboarding">
        <PortalRoute>
          <PortalOnboardingInspectionsPage />
        </PortalRoute>
      </Route>

      <Route path="/portal/form-template">
        <PortalRoute>
          <FormTemplatePage />
        </PortalRoute>
      </Route>

      <Route path="/portal">
        <PortalRoute>
          <DashboardPage />
        </PortalRoute>
      </Route>

      {/* PM Routes */}
      <Route path="/pm/dashboard">
        <PortalRoute>
          <PMDashboardPage />
        </PortalRoute>
      </Route>

      <Route path="/pm/inspection/:inspectionId">
        <PortalRoute fullWidth>
          <InspectionReportPage />
        </PortalRoute>
      </Route>

      <Route path="/pm/unit/:unitId">
        <PortalRoute>
          <UnitDetailsPage />
        </PortalRoute>
      </Route>

      <Route path="/pm/owner-report/:inspectionId">
        <PortalRoute>
          <OwnerReportBuilderPage />
        </PortalRoute>
      </Route>

      <Route path="/pm/media-library">
        <PortalRoute>
          <PMMediaLibraryPage />
        </PortalRoute>
      </Route>

      <Route path="/pm/workflow-builder">
        <PortalRoute>
          <WorkflowBuilderPage />
        </PortalRoute>
      </Route>

      {/* Owner Routes */}
      <Route path="/owner/report/:id">
        <OwnerRoute>
          <OwnerDashboard />
        </OwnerRoute>
      </Route>

      <Route path="/owner">
        <OwnerRoute>
          <OwnerDashboard />
        </OwnerRoute>
      </Route>

      {/* Public Routes (no auth) */}
      <Route path="/report/:token">
        <PublicOwnerReportPage />
      </Route>

      <Route path="/onboarding/:token">
        <PublicOnboardingPage />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin/dashboard">
        <AdminRoute>
          <AdminDashboardPage />
        </AdminRoute>
      </Route>

      <Route path="/admin/users">
        <AdminRoute>
          <AdminUsersPage />
        </AdminRoute>
      </Route>

      <Route path="/">
        <ProtectedRoute>
          <RoleBasedRedirect />
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

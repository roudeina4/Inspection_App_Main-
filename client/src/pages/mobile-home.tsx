import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardCheck,
  FileSearch,
  LogOut,
  Globe,
  ChevronRight,
  Clock,
  CheckCircle2,
  Sparkles,
  FilePlus2,
  FolderOpen,
  CheckCircle,
} from "lucide-react";

export default function MobileHomePage() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { t, lang, setLang } = useI18n();

  const [showOnboardingOptions, setShowOnboardingOptions] = useState(false);

  const { data: recentTasks } = useQuery<any[]>({
    queryKey: ["/api/inspection-tasks/assigned"],
  });

  const { data: drafts } = useQuery<any[]>({
    queryKey: ["/api/inspection-drafts"],
  });

  const hasOnboardingDraft = drafts?.some((d: any) => d.inspectionType === "ONBOARDING") ||
    !!localStorage.getItem("onboardingInspectionDraftV4");

  const recentCount = recentTasks?.length || 0;

  const isInspector = user?.role === "INSPECTOR" || user?.role === "PM" || user?.role === "ADMIN";
  const isCleaner = user?.role === "CLEANER" || user?.role === "PM" || user?.role === "ADMIN";

  const inspectionTypes = [];

  if (isCleaner) {
    inspectionTypes.push({
      id: "full-inspection",
      title: t("fullInspection"),
      description: t("fullInspectionDesc"),
      icon: FileSearch,
      path: "/full-inspection",
      gradient: "from-blue-500 to-indigo-600",
      iconBg: "bg-white/20",
      textColor: "text-white",
    });
  }

  const toggleLang = () => {
    setLang(lang === "en" ? "es" : "en");
  };

  const firstName = user?.name?.split(" ")[0] || "Inspector";
  const roleLabel = user?.role === "INSPECTOR" ? t("inspector") : user?.role === "CLEANER" ? t("cleaner") : user?.role || "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
      <header className="sticky top-0 z-50 p-4 pb-2 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-bold text-lg flex-shrink-0">
                {firstName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h1 className="font-semibold text-base truncate" data-testid="text-welcome">
                  {t("greeting")}, {firstName}
                </h1>
                <p className="text-xs text-muted-foreground">{roleLabel}</p>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={toggleLang}
            data-testid="button-language"
            title={lang === "en" ? "Cambiar a Español" : "Switch to English"}
          >
            <Globe className="h-4 w-4" />
          </Button>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => logout()}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={toggleLang}
            className="text-[11px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium flex items-center gap-1"
            data-testid="button-language-chip"
          >
            <Globe className="h-3 w-3" />
            {lang === "en" ? "EN" : "ES"}
          </button>
          {recentCount > 0 && (
            <div className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              {recentCount} {t("recentActivity").toLowerCase()}
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4 pb-8">
        <p className="text-sm font-medium text-muted-foreground px-1">
          {t("selectInspection")}
        </p>

        <div className="space-y-3">
          {isInspector && (
            <>
              <button
                className="w-full rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 p-0.5 shadow-lg shadow-black/5 active:scale-[0.98] transition-transform"
                onClick={() => setShowOnboardingOptions(!showOnboardingOptions)}
                data-testid="card-onboarding"
              >
                <div className="rounded-[14px] bg-gradient-to-r p-4 relative overflow-hidden" style={{ background: 'inherit' }}>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
                  <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-8 -translate-x-8" />
                  <div className="relative flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                      <ClipboardCheck className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <h2 className="font-bold text-lg text-white leading-tight">{t("onboardingInspection")}</h2>
                      <p className="text-white/75 text-sm mt-1 leading-snug">{t("onboardingInspectionDesc")}</p>
                    </div>
                    <ChevronRight className={`h-5 w-5 text-white/60 mt-1 flex-shrink-0 transition-transform ${showOnboardingOptions ? "rotate-90" : ""}`} />
                  </div>
                </div>
              </button>

              {showOnboardingOptions && (
                <div className="grid grid-cols-2 gap-3 pl-2" data-testid="onboarding-options">
                  <button
                    className="rounded-xl border-2 border-amber-200 dark:border-amber-800 bg-card p-4 text-left active:scale-[0.97] transition-all shadow-sm hover:shadow-md"
                    onClick={() => {
                      if (hasOnboardingDraft) {
                        setLocation("/onboarding-inspection");
                      }
                    }}
                    data-testid="button-continue-inspection"
                  >
                    <div className="flex flex-col items-center text-center gap-2">
                      {hasOnboardingDraft ? (
                        <>
                          <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                            <FolderOpen className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">Continue Incomplete</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Resume where you left off</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-emerald-700 dark:text-emerald-400">All caught up!</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">No incomplete inspections</p>
                          </div>
                        </>
                      )}
                    </div>
                  </button>

                  <button
                    className="rounded-xl border-2 border-teal-200 dark:border-teal-800 bg-card p-4 text-left active:scale-[0.97] transition-all shadow-sm hover:shadow-md"
                    onClick={async () => {
                      localStorage.removeItem("onboardingInspectionDraftV4");
                      try {
                        const headers: Record<string, string> = {};
                        const token = localStorage.getItem("jwt_token");
                        if (token) headers["Authorization"] = `Bearer ${token}`;
                        await fetch("/api/inspection-drafts/ONBOARDING", {
                          method: "DELETE",
                          credentials: "include",
                          headers,
                        });
                      } catch {}
                      setLocation("/onboarding-inspection?fresh=1");
                    }}
                    data-testid="button-new-inspection"
                  >
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
                        <FilePlus2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">New Inspection</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Start fresh</p>
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </>
          )}

          {inspectionTypes.map((type) => (
            <button
              key={type.id}
              className={`w-full rounded-2xl bg-gradient-to-r ${type.gradient} p-0.5 shadow-lg shadow-black/5 active:scale-[0.98] transition-transform`}
              onClick={() => setLocation(type.path)}
              data-testid={`card-${type.id}`}
            >
              <div className="rounded-[14px] bg-gradient-to-r p-4 relative overflow-hidden" style={{ background: 'inherit' }}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
                <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-8 -translate-x-8" />

                <div className="relative flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${type.iconBg} flex items-center justify-center flex-shrink-0 backdrop-blur-sm`}>
                    <type.icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <h2 className="font-bold text-lg text-white leading-tight">{type.title}</h2>
                    <p className="text-white/75 text-sm mt-1 leading-snug">{type.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-white/60 mt-1 flex-shrink-0" />
                </div>
              </div>
            </button>
          ))}
        </div>

        {recentCount > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-foreground px-1 mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {t("recentActivity")}
            </h3>
            <div className="space-y-2">
              {recentTasks?.slice(0, 3).map((task: any) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 shadow-sm"
                  data-testid={`recent-task-${task.id}`}
                >
                  <div className="h-8 w-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <FileSearch className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t("fullInspection")}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {task.unit?.propertyName} - {task.unit?.unitNumber}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {task.status === "SUBMITTED" ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-amber-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

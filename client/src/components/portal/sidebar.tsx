import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  AlertTriangle,
  Settings,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  FileSearch,
  ClipboardList,
  PanelLeftClose,
  PanelLeftOpen,
  GitBranch,
  X,
  Upload,
  Home,
} from "lucide-react";
import type { User } from "@shared/schema";

interface SidebarProps {
  user: User | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface MenuItem {
  title: string;
  url?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { title: string; url: string }[];
  adminOnly?: boolean;
}

interface MenuSection {
  label: string;
  items: MenuItem[];
}

const menuSections: MenuSection[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/portal", icon: LayoutDashboard },
      { title: "Properties", url: "/portal/properties", icon: Home },
      { title: "Users", url: "/portal/users", icon: Users, adminOnly: true },
    ],
  },
  {
    label: "Onboarding",
    items: [
      { title: "Onboarding Inspection", url: "/portal/inspections/onboarding", icon: ClipboardList },
      { title: "Import Property", url: "/portal/import-property", icon: Upload },
    ],
  },
  
  {
    label: "Post Stay",
    items: [
      { title: "Post Stay Inspection", url: "/portal/inspections/full", icon: FileSearch },
      { title: "Tasks", url: "/portal/tasks", icon: ClipboardCheck },
      { title: "Quick Reports", url: "/portal/quick-reports", icon: AlertTriangle },
    ],
  },
  {
    label: "Tools",
    items: [
      { title: "Form Templates", url: "/portal/form-template", icon: ClipboardList },
      { title: "Workflow Phases", url: "/pm/workflow-builder", icon: GitBranch },
      { title: "Settings", url: "/portal/settings", icon: Settings },
    ],
  },
];

const adminMenuItems = [
  { title: "Admin Dashboard", url: "/admin/dashboard", icon: ShieldCheck },
  { title: "Admin Users", url: "/admin/users", icon: Users },
];

export function PortalSidebar({ user, collapsed, onToggleCollapse, mobileOpen, onMobileClose }: SidebarProps) {
  const [location] = useLocation();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    Inspections: location.startsWith("/portal/inspections"),
  });

  useEffect(() => {
    if (mobileOpen && onMobileClose) {
      onMobileClose();
    }
  }, [location]);

  const toggleMenu = (title: string) => {
    if (collapsed && !mobileOpen) return;
    setExpandedMenus(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const handleNavClick = () => {
    if (mobileOpen && onMobileClose) {
      onMobileClose();
    }
  };

  const showLabels = !collapsed || mobileOpen;

  const renderSidebarInner = (isMobile: boolean) => {
    const sidebarWidth = isMobile ? "w-[270px]" : collapsed ? "w-[72px]" : "w-[250px]";
    const mobileTranslate = isMobile
      ? (mobileOpen ? "translate-x-0" : "-translate-x-full")
      : "";

    return (
      <aside
        className={`fixed left-0 top-0 bottom-0 flex flex-col z-50 transition-all duration-300 ${sidebarWidth} ${mobileTranslate} border-r border-gray-100`}
        style={{
          background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
        }}
        data-testid="portal-sidebar"
      >
        <div className={`py-6 flex items-center justify-between ${!showLabels ? "px-4" : "px-5"}`}>
          <Link href="/portal" onClick={handleNavClick}>
            <div className={`flex items-center cursor-pointer ${!showLabels ? "justify-center" : "gap-3"}`}>
              <div className="h-9 w-9 rounded-lg bg-teal-500/20 flex items-center justify-center flex-shrink-0 ring-1 ring-teal-500/30">
                <ClipboardCheck className="h-4.5 w-4.5 text-teal-400" />
              </div>
              {showLabels && (
                <div className="flex flex-col">
                  <span className="font-semibold text-[15px] text-white tracking-tight leading-tight">TBA Portal</span>
                  <span className="text-[10px] text-slate-400 font-normal tracking-wider uppercase">Property Management</span>
                </div>
              )}
            </div>
          </Link>
          {isMobile && onMobileClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMobileClose}
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10"
              data-testid="button-close-mobile-sidebar"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {!isMobile && (
          <div className={`px-3 mb-1 ${collapsed ? "flex justify-center" : ""}`}>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="h-7 w-7 text-slate-500 hover:text-white hover:bg-white/10"
              data-testid="button-toggle-sidebar"
            >
              {collapsed ? (
                <PanelLeftOpen className="h-3.5 w-3.5" />
              ) : (
                <PanelLeftClose className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        )}

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {user?.role === "ADMIN" && adminMenuItems.map((item) => {
            const isActive = location === item.url || location.startsWith(item.url);
            
            const menuContent = (
              <Link key={item.title} href={item.url} onClick={handleNavClick}>
                <div
                  className={`flex items-center px-3 py-2 rounded-lg cursor-pointer transition-all ${
                    !showLabels ? "justify-center" : "gap-3"
                  } ${isActive ? "bg-teal-500/15 text-teal-400" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                  data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <item.icon className={`h-[18px] w-[18px] flex-shrink-0 ${isActive ? "text-teal-400" : ""}`} />
                  {showLabels && (
                    <span className={`text-[13px] ${isActive ? "font-semibold" : "font-medium"}`}>
                      {item.title}
                    </span>
                  )}
                </div>
              </Link>
            );

            if (!showLabels) {
              return (
                <Tooltip key={item.title} delayDuration={0}>
                  <TooltipTrigger asChild>{menuContent}</TooltipTrigger>
                  <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700 text-xs">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return menuContent;
          })}

          {user?.role === "ADMIN" && (
            <div className="border-t border-white/[0.06] my-2" />
          )}

          {menuSections.map((section, sectionIdx) => {
            const visibleItems = section.items.filter(item => !item.adminOnly || user?.role === "ADMIN");
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.label}>
                {(sectionIdx > 0) && (
                  <div className="border-t border-white/[0.06] my-2" />
                )}
                {showLabels && (
                  <div className="px-3 pt-1 pb-2">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{section.label}</span>
                  </div>
                )}
                {!showLabels && sectionIdx > 0 && (
                  <div className="my-1" />
                )}
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive = item.url
                      ? (location === item.url || (item.url !== "/portal" && location.startsWith(item.url)))
                      : false;

                    const menuContent = (
                      <Link key={item.title} href={item.url!} onClick={handleNavClick}>
                        <div
                          className={`flex items-center px-3 py-2 rounded-lg cursor-pointer transition-all ${
                            !showLabels ? "justify-center" : "gap-3"
                          } ${isActive ? "bg-teal-500/15 text-teal-400" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
                          data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <item.icon className={`h-[18px] w-[18px] flex-shrink-0 ${isActive ? "text-teal-400" : ""}`} />
                          {showLabels && (
                            <span className={`text-[13px] ${isActive ? "font-semibold" : "font-medium"}`}>
                              {item.title}
                            </span>
                          )}
                        </div>
                      </Link>
                    );

                    if (!showLabels) {
                      return (
                        <Tooltip key={item.title} delayDuration={0}>
                          <TooltipTrigger asChild>{menuContent}</TooltipTrigger>
                          <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700 text-xs">
                            {item.title}
                          </TooltipContent>
                        </Tooltip>
                      );
                    }

                    return menuContent;
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className={`py-4 border-t border-white/[0.06] ${!showLabels ? "px-2" : "px-4"}`}>
          <div className={`flex items-center ${!showLabels ? "justify-center" : "gap-3 px-1"}`}>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Avatar className="h-9 w-9 flex-shrink-0 cursor-pointer ring-2 ring-white/10">
                  <AvatarFallback className="bg-gradient-to-br from-teal-500 to-teal-600 text-white font-semibold text-sm">
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              {!showLabels && (
                <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700 text-xs">
                  <p className="font-medium">{user?.name || "User"}</p>
                  <p className="text-slate-400">{user?.role || "USER"}</p>
                </TooltipContent>
              )}
            </Tooltip>
            {showLabels && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name || "User"}</p>
                <p className="text-[11px] text-slate-500">{user?.role || "USER"}</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    );
  };

  return (
    <>
      <div className="hidden md:block">
        {renderSidebarInner(false)}
      </div>

      <div className="md:hidden">
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onMobileClose}
            data-testid="mobile-sidebar-backdrop"
          />
        )}
        {renderSidebarInner(true)}
      </div>
    </>
  );
}

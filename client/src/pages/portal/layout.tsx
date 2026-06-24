import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PortalSidebar, PortalTopBar } from "@/components/portal";
import type { Notification as NotificationType } from "@shared/schema";

interface PortalLayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
}

export default function PortalLayout({ children, fullWidth }: PortalLayoutProps) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: notifications } = useQuery<NotificationType[]>({
    queryKey: ["/api/notifications/unread"],
  });

  const unreadCount = notifications?.length || 0;

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <PortalSidebar
        user={user}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className={`flex flex-col flex-1 relative z-10 transition-all duration-300 ml-0 ${
        sidebarCollapsed ? "md:ml-[72px]" : "md:ml-[250px]"
      }`}>
        <PortalTopBar 
          user={user} 
          unreadCount={unreadCount} 
          onLogout={handleLogout}
          onMobileMenuToggle={() => setMobileMenuOpen(prev => !prev)}
        />

        <main className="flex-1 overflow-auto bg-[#f8f9fc]">
          <div className="w-full h-full px-5 py-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

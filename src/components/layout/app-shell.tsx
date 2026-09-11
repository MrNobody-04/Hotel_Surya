"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { SessionUser } from "@/types";
import { Toaster } from "@/components/ui/sonner";

interface AppShellProps {
  user: SessionUser | null;
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!user && pathname !== "/login") {
      router.replace("/login");
    }
  }, [user, pathname, router]);

  // If on /login page, render clean login view without sidebar
  if (pathname === "/login") {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center">
        {children}
        <Toaster position="top-right" richColors />
      </div>
    );
  }

  // If unauthenticated on any other page, block UI completely
  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30">
        <Sidebar user={user} />
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-card z-50">
            <Sidebar user={user} onNavigate={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 md:pl-64 h-full overflow-hidden">
        <Header
          user={user}
          onMobileMenuToggle={() => setMobileMenuOpen(true)}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden overscroll-x-none p-4 md:p-6 lg:p-8 flex flex-col justify-between">
          <div className="mx-auto max-w-7xl w-full overflow-x-hidden">{children}</div>
          <footer className="mt-12 pt-6 pb-2 border-t text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} NEW HOTEL SURYA. All Rights Reserved. • Developed by <span className="font-semibold text-foreground">SujanGC</span>
          </footer>
        </main>
      </div>

      <Toaster position="top-right" richColors />
    </div>
  );
}

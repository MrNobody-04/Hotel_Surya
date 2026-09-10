"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bed,
  UserPlus,
  Users,
  UserCheck,
  History,
  Receipt,
  BarChart3,
  FileSpreadsheet,
  ShieldAlert,
  UserCog,
  Hotel,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionUser } from "@/types";

interface SidebarProps {
  user: SessionUser | null;
  onNavigate?: () => void;
}

export function Sidebar({ user, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const role = user?.role;

  const navItems = [
    {
      title: "Operations",
      items: [
        {
          label: "Dashboard",
          href: "/",
          icon: LayoutDashboard,
          show: true,
        },
        {
          label: "Rooms (7)",
          href: "/rooms",
          icon: Bed,
          show: true,
        },
        {
          label: "New Check-in",
          href: "/check-in",
          icon: UserPlus,
          show: true,
        },
        {
          label: "Current Guests",
          href: "/guests",
          icon: UserCheck,
          show: true,
        },
        {
          label: "Customers",
          href: "/customers",
          icon: Users,
          show: true,
        },
        {
          label: "Stay History",
          href: "/stays",
          icon: History,
          show: true,
        },
      ],
    },
    {
      title: "Finance & Records",
      items: [
        {
          label: "Hotel Expenses",
          href: "/expenses",
          icon: Receipt,
          show: true,
        },
        {
          label: "Analytics",
          href: "/analytics",
          icon: BarChart3,
          show: role === "OWNER" || role === "MANAGER",
        },
        {
          label: "Reports & CSV",
          href: "/reports",
          icon: FileSpreadsheet,
          show: role === "OWNER" || role === "MANAGER",
        },
      ],
    },
    {
      title: "Administration",
      items: [
        {
          label: "Staff Members",
          href: "/staff",
          icon: UserCog,
          show: role === "OWNER",
        },
        {
          label: "Audit Logs",
          href: "/audit-logs",
          icon: ShieldAlert,
          show: role === "OWNER" || role === "MANAGER",
        },
      ],
    },
  ];

  return (
    <aside className="w-64 border-r bg-card flex flex-col h-full shrink-0 select-none">
      {/* Hotel Surya Brand Header */}
      <div className="h-14 flex items-center gap-3 px-6 border-b">
        <div className="p-1.5 rounded-lg bg-primary text-primary-foreground">
          <Hotel className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-tight text-foreground">
            HOTEL SURYA
          </h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            Operations Platform
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {navItems.map((section, idx) => {
          const visibleItems = section.items.filter((i) => i.show);
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-1">
              <div className="px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {section.title}
              </div>
              {visibleItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Hotel Surya Status Footer */}
      <div className="p-4 border-t bg-muted/20">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Operational</span>
          </span>
          <span className="font-mono text-[11px]">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
}

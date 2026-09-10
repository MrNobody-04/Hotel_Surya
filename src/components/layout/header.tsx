"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ShieldCheck, UserCheck, KeyRound, Clock, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CommandPalette } from "./command-palette";
import { ThemeToggle } from "./theme-toggle";
import { SessionUser } from "@/types";

interface HeaderProps {
  user: SessionUser | null;
  onMobileMenuToggle?: () => void;
}

export function Header({ user, onMobileMenuToggle }: HeaderProps) {
  const router = useRouter();
  const [nepalTime, setNepalTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kathmandu",
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(now);
      setNepalTime(`${formatted} (NPT)`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "OWNER":
        return <Badge variant="purple" className="text-[10px] font-bold">OWNER</Badge>;
      case "MANAGER":
        return <Badge variant="info" className="text-[10px] font-bold">MANAGER</Badge>;
      case "RECEPTIONIST":
      default:
        return <Badge variant="success" className="text-[10px] font-bold">RECEPTIONIST</Badge>;
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "HS";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/95 px-4 md:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden h-8 w-8 shrink-0"
        onClick={onMobileMenuToggle}
      >
        <Menu className="h-4 w-4" />
        <span className="sr-only">Toggle navigation menu</span>
      </Button>

      <div className="flex items-center gap-2 md:hidden">
        <span className="font-bold text-sm tracking-tight text-primary">
          HOTEL SURYA
        </span>
      </div>

      <div className="flex-1 flex items-center gap-4">
        <CommandPalette />
      </div>

      <div className="flex items-center gap-3">
        {/* Nepal Time Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 text-muted-foreground text-xs font-mono">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span>{nepalTime || "Loading Nepal Time..."}</span>
        </div>

        <ThemeToggle />

        {/* User Profile Dropdown */}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold leading-none">{user.name}</p>
                    {getRoleBadge(user.role)}
                  </div>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button size="sm" onClick={() => router.push("/login")}>
            Sign In
          </Button>
        )}
      </div>
    </header>
  );
}

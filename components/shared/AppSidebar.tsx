"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Shield, BarChart3, UserPlus, FileText,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import LogoutButton from "@/components/dashboard/LogoutButton";
import ThemeToggle from "@/components/dashboard/ThemeToggle";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/onboarding", label: "Onboarding", icon: UserPlus },
  { href: "/briefs", label: "Briefs", icon: FileText },
  { href: "/dashboard", label: "Content Approval", icon: LayoutDashboard },
  { href: "/hitl", label: "HITL", icon: Shield },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export default function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-[var(--bg)] border-r border-[var(--border)] flex flex-col z-40",
        collapsed ? "w-[52px]" : "w-[220px]"
      )}
    >
      <div className="px-4 pt-5 pb-6">
        {collapsed ? (
          <span className="text-sm font-bold text-[var(--text)] block text-center">G</span>
        ) : (
          <>
            <h1 className="text-sm font-bold text-[var(--text)] tracking-tight">Greenlit</h1>
            <p className="text-[10px] text-[var(--muted)] opacity-50 mt-0.5">by ruskaruma</p>
          </>
        )}
      </div>

      <nav className="px-2 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded text-xs",
                isActive
                  ? "bg-[var(--surface-elevated)] text-[var(--text)] font-medium"
                  : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-elevated)]",
                collapsed && "justify-center"
              )}
            >
              <Icon size={14} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className={cn(
        "px-3 py-3 border-t border-[var(--border)] flex items-center",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <LogoutButton />
            <ThemeToggle />
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-[var(--muted)] hover:text-[var(--text)] p-1"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </aside>
  );
}

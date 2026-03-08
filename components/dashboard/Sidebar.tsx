"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Shield, BarChart3, UserPlus,
  ChevronLeft, ChevronRight, Plus, MoreHorizontal, Trash2, Pencil,
  Mail, Phone, Eye,
} from "lucide-react";
import LogoutButton from "./LogoutButton";
import ThemeToggle from "./ThemeToggle";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/ToastProvider";
import type { ClientItem } from "./DashboardShell";

interface SidebarProps {
  clients: ClientItem[];
  onClientFilter: (clientId: string | null) => void;
  activeClientId: string | null;
  onClientsChange: () => void;
  onEditClient: (clientId: string) => void;
}

const navItems = [
  { href: "/onboarding", label: "Onboarding", icon: UserPlus },
  { href: "/dashboard", label: "Content Approval", icon: LayoutDashboard },
  { href: "/hitl", label: "HITL", icon: Shield },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export default function Sidebar({ clients, onClientFilter, activeClientId, onClientsChange, onEditClient }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const pathname = usePathname();
  const { toast } = useToast();

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

      {!collapsed && (
        <div className="flex-1 px-3 pt-6 pb-3 overflow-hidden flex flex-col">
          <p className="text-[10px] uppercase tracking-widest text-[var(--muted)] opacity-50 mb-2 px-1">
            Clients
          </p>
          <div className="space-y-0.5 flex-1 overflow-y-auto">
            <button
              onClick={() => onClientFilter(null)}
              className={cn(
                "w-full text-left px-2 py-1.5 rounded text-[11px]",
                activeClientId === null
                  ? "bg-[var(--surface-elevated)] text-[var(--text)] font-medium"
                  : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-elevated)]"
              )}
            >
              All clients
            </button>
            {clients.map((client) => (
              <ClientRow
                key={client.id}
                client={client}
                isActive={activeClientId === client.id}
                isMenuOpen={menuOpenId === client.id}
                onSelect={() => onClientFilter(client.id)}
                onMenuToggle={() => setMenuOpenId(menuOpenId === client.id ? null : client.id)}
                onEdit={() => {
                  setMenuOpenId(null);
                  onEditClient(client.id);
                }}
                onDelete={async () => {
                  try {
                    const res = await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
                    if (!res.ok) throw new Error("Failed");
                    setMenuOpenId(null);
                    if (activeClientId === client.id) onClientFilter(null);
                    onClientsChange();
                    toast("success", `${client.name} deleted`);
                  } catch {
                    toast("error", "Failed to delete client");
                  }
                }}
              />
            ))}
          </div>

          <Link
            href="/onboarding"
            className="flex items-center gap-1.5 px-2 py-1.5 mt-2 rounded text-[11px] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-elevated)] w-full"
          >
            <Plus size={12} />
            Add Client
          </Link>
        </div>
      )}

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

function ClientRow({
  client,
  isActive,
  isMenuOpen,
  onSelect,
  onMenuToggle,
  onEdit,
  onDelete,
}: {
  client: ClientItem;
  isActive: boolean;
  isMenuOpen: boolean;
  onSelect: () => void;
  onMenuToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onMenuToggle();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isMenuOpen, onMenuToggle]);

  return (
    <div className="relative group">
      <button
        onClick={onSelect}
        className={cn(
          "w-full text-left px-2 py-1.5 rounded text-[11px] truncate pr-6 flex items-center gap-1.5",
          isActive
            ? "bg-[var(--surface-elevated)] text-[var(--text)] font-medium"
            : "text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-elevated)]"
        )}
      >
        <span className="truncate">{client.name}</span>
        <span className="flex items-center gap-0.5 shrink-0 ml-auto mr-4">
          {client.email && <Mail size={9} className="text-[var(--muted)] opacity-40" />}
          {client.whatsapp_number && <Phone size={9} className="text-[var(--muted)] opacity-40" />}
        </span>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onMenuToggle(); }}
        className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 text-[var(--muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--text)]"
      >
        <MoreHorizontal size={12} />
      </button>
      {isMenuOpen && (
        <div ref={menuRef} className="absolute right-0 top-full mt-1 z-50 bg-[var(--card)] border border-[var(--border)] rounded shadow-lg py-1 min-w-[120px]">
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-[var(--text)] hover:bg-[var(--surface-elevated)] w-full text-left"
          >
            <Pencil size={11} />
            Edit client
          </button>
          <Link
            href={`/clients/${client.id}`}
            className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-[var(--text)] hover:bg-[var(--surface-elevated)] w-full text-left"
          >
            <Eye size={11} />
            View details
          </Link>
          <button
            onClick={onDelete}
            className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-red-400 hover:bg-[var(--surface-elevated)] w-full text-left"
          >
            <Trash2 size={11} />
            Delete client
          </button>
        </div>
      )}
    </div>
  );
}

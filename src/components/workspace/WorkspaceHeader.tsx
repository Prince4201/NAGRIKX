import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  LayoutDashboard,
  Bell,
  UserRound,
  ShieldCheck,
  Shield,
  LogOut,
  Menu,
  X,
  PlusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/site/Logo";
import { workspaceQuery } from "@/lib/workspace-query";
import { supabase } from "@/integrations/supabase/client";
import { clearDevToken } from "@/lib/dev-auth";

export function WorkspaceHeader() {
  const navigate = useNavigate();
  const { data } = useSuspenseQuery(workspaceQuery);
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  const role = data.role.role;
  const isOfficer = role === "department_officer";
  const isAdmin = role === "admin";
  const isCitizen = role === "citizen";

  // Officer department resolution
  const officerDept = isOfficer
    ? data.departments.find((d) => d.id === data.role.department_id)
    : null;
  const deptName = officerDept?.name || "Department Officer";

  // Unread notifications count
  const unreadCount = data.notifications.filter((n) => !n.read_at).length;

  const handleSignOut = async () => {
    clearDevToken();
    await supabase.auth.signOut();
    await navigate({ to: "/", replace: true });
  };

  // Dedicated workspace navigation items
  const navItems = [
    {
      to: "/dashboard" as const,
      label: isOfficer ? "Department Queue" : isAdmin ? "Overview & Queue" : "My Reports",
      icon: LayoutDashboard,
      exact: true,
    },
    ...(isCitizen
      ? [
          {
            to: "/report" as const,
            label: "Report Grievance",
            icon: PlusCircle,
            exact: false,
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            to: "/admin" as const,
            label: "Administration",
            icon: ShieldCheck,
            exact: false,
          },
        ]
      : []),
    {
      to: "/notifications" as const,
      label: "Updates",
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined,
      exact: false,
    },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-ivory/95 px-4 backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 py-3">
        {/* Left: Brand + Workspace context chip */}
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to="/dashboard"
            aria-label="Workspace dashboard"
            className="flex shrink-0 items-center gap-2 group"
          >
            <LogoMark className="h-7 w-7 transition-transform group-hover:scale-105" />
            <span className="font-sans text-lg font-bold tracking-tight">
              NAGRIK<span className="text-ember">X</span>
            </span>
          </Link>

          <span className="hidden h-4 w-px bg-ink/15 sm:inline-block" aria-hidden="true" />

          {/* Role / Department context indicator */}
          <div className="hidden sm:flex items-center">
            {isOfficer ? (
              <span className="inline-flex max-w-[240px] items-center gap-1.5 truncate rounded-full border border-forest/20 bg-forest/10 px-2.5 py-1 text-xs font-semibold text-forest">
                <Shield className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{deptName}</span>
              </span>
            ) : isAdmin ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-900">
                <ShieldCheck className="h-3.5 w-3.5 text-amber-700" />
                <span>Admin Console</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-forest/20 bg-forest/10 px-2.5 py-1 text-xs font-semibold text-forest">
                <UserRound className="h-3.5 w-3.5" />
                <span>Citizen Workspace</span>
              </span>
            )}
          </div>
        </div>

        {/* Center: Workspace Navigation Tabs (Desktop) */}
        <nav
          aria-label="Workspace navigation"
          className="hidden items-center gap-1 lg:flex"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.exact }}
                activeProps={{
                  className:
                    "bg-forest text-white font-medium shadow-xs hover:text-white",
                }}
                inactiveProps={{
                  className:
                    "text-muted-foreground hover:bg-ink/5 hover:text-foreground",
                }}
                className="relative flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
                {typeof item.badge === "number" && item.badge > 0 && (
                  <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-ember px-1.5 text-[10px] font-bold text-white shadow-xs">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right: Profile Chip & Sign Out */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {/* User profile button (name + avatar) */}
          <Link
            to="/profile"
            activeOptions={{ exact: false }}
            activeProps={{
              className: "border-forest/40 bg-forest/10 font-semibold text-forest shadow-xs ring-1 ring-forest/20",
            }}
            inactiveProps={{
              className: "border-ink/10 bg-paper hover:border-forest/40 hover:bg-forest/5 text-foreground",
            }}
            className="hidden sm:flex items-center gap-2 rounded-full border py-1 pl-1.5 pr-3 transition-colors"
            title="View your profile"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-forest text-xs font-bold text-white uppercase shadow-xs">
              {data.profile.full_name?.charAt(0) || "U"}
            </div>
            <span className="max-w-[120px] truncate text-xs font-medium">
              {data.profile.full_name?.split(" ")[0] || "User"}
            </span>
          </Link>

          {/* Sign Out */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="hidden sm:inline-flex text-xs text-muted-foreground hover:text-destructive gap-1.5 h-8 px-2.5"
            title="Sign out of your workspace"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign out</span>
          </Button>

          {/* Mobile Menu Hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label={open ? "Close workspace menu" : "Open workspace menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            aria-label="Mobile workspace menu"
            initial={reduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="mx-auto mb-3 max-w-7xl rounded-xl border border-ink/10 bg-paper p-4 shadow-lift lg:hidden space-y-4"
          >
            {/* Identity section in mobile (links to profile) */}
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between border-b pb-3 transition-opacity hover:opacity-80"
              title="View your profile"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-forest text-sm font-bold text-white uppercase shadow-xs">
                  {data.profile.full_name?.charAt(0) || "U"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {data.profile.full_name || "Workspace User"}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {isOfficer ? deptName : role.replaceAll("_", " ")}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-forest/10 px-2.5 py-0.5 text-[11px] font-semibold text-forest uppercase">
                {role.replaceAll("_", " ")}
              </span>
            </Link>

            {/* Navigation tabs */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setOpen(false)}
                    activeOptions={{ exact: item.exact }}
                    activeProps={{
                      className:
                        "bg-forest text-white font-medium hover:text-white",
                    }}
                    inactiveProps={{
                      className:
                        "text-foreground hover:bg-muted font-normal",
                    }}
                    className="flex items-center justify-between rounded-lg px-3.5 py-2.5 text-sm transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </div>
                    {typeof item.badge === "number" && item.badge > 0 && (
                      <span className="rounded-full bg-ember px-2 py-0.5 text-xs font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Sign Out in mobile drawer */}
            <div className="border-t pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  void handleSignOut();
                }}
                className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive flex items-center justify-center gap-1.5"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign out</span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

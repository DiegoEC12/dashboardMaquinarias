import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Scale,
  Building2,
  ListChecks,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  LogOut,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import logoAsset from "@/assets/logo-maquinarias.png.asset.json";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Resumen Ejecutivo", icon: LayoutDashboard, exact: true },
  { to: "/benchmark", label: "Benchmark", icon: Scale, exact: false },
  { to: "/concesionarias", label: "Concesionarias", icon: Building2, exact: false },
  { to: "/indicadores", label: "Indicadores", icon: ListChecks, exact: false },
] as const;

function NavLinks({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV_ITEMS.map((item) => {
        const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to as any}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={cn(
              "transition-ui group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_0_var(--color-sidebar-primary)]"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              collapsed && "justify-center px-0",
            )}
          >
            <item.icon
              className={cn(
                "h-[18px] w-[18px] shrink-0",
                active ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground",
              )}
            />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cn("flex flex-row gap-3 px-4 pt-5 pb-4", collapsed && "items-center justify-center px-2")}>
      <div className={cn(" p-2", collapsed ? "w-10 overflow-hidden p-0" : "")}>
        <img
          src={logoAsset.url}
          alt="Maquinarias — Comprometidos de por vida"
          className={cn("h-auto", collapsed ? "w-16 " : "w-full")}
        />
      </div>
      {!collapsed && (
        <div className="border-t border-sidebar-border pt-3">
          <p className="text-[13px] font-bold tracking-[0.18em] text-sidebar-foreground">
            MYSTERY INSIGHTS
          </p>
          <p className="mt-0.5 text-[11px] font-medium tracking-[0.3em] text-sidebar-primary">
            MAQUINARIAS
          </p>
        </div>
      )}
    </div>
  );
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    setIsLoggingOut(true);
    // Show a brief message to the user
    alert("Cerrando sesión...");
    setTimeout(() => {
      window.location.href = "https://factor-iq.com/pages/servicio_nube.html";
    }, 1000);
  };

  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          "transition-ui border-2 sticky top-0 hidden h-screen shrink-0 flex-col bg-sidebar lg:flex",
          collapsed ? "w-[68px]" : "w-60",
        )}
      >
        <Brand collapsed={collapsed} />
        <div className="mt-2 flex-1">
          <NavLinks collapsed={collapsed} />
        </div>
        <div className="border-t border-sidebar-border p-3 space-y-1">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            title={collapsed ? (isLoggingOut ? "Cerrando sesión..." : "Cerrar sesión") : undefined}
            className={cn(
              "transition-ui flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-destructive/85 hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-70",
              collapsed && "justify-center px-0",
            )}
            aria-label="Cerrar sesión"
          >
            {isLoggingOut ? (
              <Loader2 className="h-4 w-4 animate-spin text-destructive shrink-0" />
            ) : (
              <LogOut className="h-4 w-4 shrink-0" />
            )}
            {!collapsed && (
              <span className="truncate">
                {isLoggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
              </span>
            )}
          </button>

          <button
            onClick={() => setCollapsed((c) => !c)}
            className="transition-ui flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                <span>Contraer menú</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile / tablet: top bar + drawer */}
      <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-sidebar-border bg-sidebar px-4 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-2 text-sidebar-foreground hover:bg-sidebar-accent"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <p className="text-[11px] font-bold tracking-[0.18em] text-sidebar-foreground">
            MYSTERY INSIGHTS
          </p>
          <p className="text-[9px] font-medium tracking-[0.3em] text-sidebar-primary">
            MAQUINARIAS
          </p>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !isLoggingOut && setMobileOpen(false)}
          />
          <aside className="absolute top-0 left-0 flex h-full w-64 flex-col bg-sidebar">
            <div className="flex items-start justify-between pr-2">
              <Brand collapsed={false} />
              <button
                onClick={() => setMobileOpen(false)}
                className="mt-4 rounded-md p-2 text-sidebar-foreground/60 hover:bg-sidebar-accent"
                aria-label="Cerrar menú"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1">
              <NavLinks collapsed={false} onNavigate={() => setMobileOpen(false)} />
            </div>
            <div className="border-t border-sidebar-border p-3">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="transition-ui flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-destructive/85 hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-70"
                aria-label="Cerrar sesión"
              >
                {isLoggingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin text-destructive shrink-0" />
                ) : (
                  <LogOut className="h-4 w-4 shrink-0" />
                )}
                <span>
                  {isLoggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
                </span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

import { Link } from "@tanstack/react-router";
import { Camera, FolderOpen, Home, UserRound, Wrench } from "lucide-react";
import { useEffect, type ReactNode } from "react";

/** Fired once the page frame has hydrated; first-run dialogs wait for it (see onboarding.tsx). */
export const SHELL_HYDRATED = "gn:shell-hydrated";
export function isShellHydrated() { return typeof window !== "undefined" && Boolean((window as unknown as { __gnShell?: boolean }).__gnShell); }

/** Phone-only frame: centered 430px column with a thumb-reach bottom bar. */
export function AppShell({ children, title, action }: { children: ReactNode; title?: string; action?: ReactNode }) {
  useEffect(() => { (window as unknown as { __gnShell?: boolean }).__gnShell = true; window.dispatchEvent(new Event(SHELL_HYDRATED)); }, []);
  return (
    <main className="app-shell min-h-dvh bg-background text-foreground">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <div className="phone-frame relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col pb-[calc(96px+env(safe-area-inset-bottom))]">
        {title && (
          <header className="rise grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
            <h1 className="font-display truncate text-xl font-semibold">{title}</h1>
            {action}
          </header>
        )}
        {children}
      </div>
      <nav className="bottom-nav fixed inset-x-0 bottom-0 z-30 mx-auto grid w-full max-w-[430px] grid-cols-5 items-end px-2 pb-[env(safe-area-inset-bottom)] pt-1.5">
        <NavItem to="/" icon={<Home />} label="Trang chủ" />
        <NavItem to="/documents" icon={<FolderOpen />} label="Tài liệu" />
        <Link to="/scan" aria-label="Quét tài liệu" className="camera-button mx-auto mb-3 grid size-[60px] -translate-y-3 place-items-center rounded-full bg-primary text-primary-foreground active:scale-95">
          <Camera className="size-7" />
        </Link>
        <NavItem to="/tools" icon={<Wrench />} label="Công cụ" />
        <NavItem to="/me" icon={<UserRound />} label="Tôi" />
      </nav>
    </main>
  );
}

function NavItem({ to, icon, label }: { to: "/" | "/documents" | "/tools" | "/me"; icon: ReactNode; label: string }) {
  return (
    <Link to={to} activeOptions={{ exact: true }} className="flex h-14 min-w-0 flex-col items-center justify-center gap-1 text-[0.625rem] font-semibold text-muted-foreground [&_svg]:size-5" activeProps={{ className: "text-primary" }}>
      {icon}<span className="truncate">{label}</span>
    </Link>
  );
}

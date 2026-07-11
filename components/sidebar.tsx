"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Item = { href: string; label: string; icon: string };

const groups: { title: string | null; items: Item[] }[] = [
  {
    title: null,
    items: [
      { href: "/", label: "Overview", icon: "📊" },
      { href: "/ingest", label: "Ingest", icon: "📥" },
      { href: "/report", label: "Reports", icon: "📄" },
      { href: "/archive", label: "Board Pack", icon: "📑" },
    ],
  },
  {
    title: "Financial model",
    items: [
      { href: "/model", label: "Forecast", icon: "📈" },
      { href: "/model/scenarios", label: "Scenarios", icon: "🔀" },
      { href: "/model/assumptions", label: "Drivers", icon: "🎚️" },
    ],
  },
  {
    title: "Setup & assumptions",
    items: [
      { href: "/budget", label: "Budget", icon: "💷" },
      { href: "/account-map", label: "Account Map", icon: "🗺️" },
      { href: "/settings", label: "Settings", icon: "⚙️" },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/ingest-log", label: "Audit Log", icon: "🕑" },
      { href: "/guide", label: "Guide", icon: "📖" },
    ],
  },
];

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-2 py-1">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--brand)] text-base font-semibold text-white">
        £
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold">my-fin-app</span>
        <span className="block text-[11px] text-[var(--muted)]">
          Management Reporting
        </span>
      </span>
    </Link>
  );
}

function NavList({ pathname }: { pathname: string }) {
  // Longest-prefix match so /model doesn't also light up on /model/scenarios.
  const allHrefs = groups.flatMap((g) => g.items.map((i) => i.href));
  const activeHref =
    pathname === "/"
      ? "/"
      : allHrefs
          .filter((h) => h !== "/" && (pathname === h || pathname.startsWith(h + "/")))
          .sort((a, b) => b.length - a.length)[0];
  const isActive = (href: string) => href === activeHref;
  return (
    <nav className="flex flex-col gap-5 px-3 py-4">
      {groups.map((group, gi) => (
        <div key={gi} className="flex flex-col gap-1">
          {group.title && (
            <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {group.title}
            </div>
          )}
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition ${
                isActive(item.href)
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[var(--border)] bg-white md:flex">
        <div className="border-b border-[var(--border)] px-3 py-3">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavList pathname={pathname} />
        </div>
        <div className="border-t border-[var(--border)] px-4 py-3 text-[11px] text-[var(--muted)]">
          FP&amp;A · actuals vs budget
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-[var(--border)] bg-white/90 px-3 backdrop-blur md:hidden">
        <button
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <Brand />
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-[var(--border)] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-3">
              <Brand />
              <button
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavList pathname={pathname} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

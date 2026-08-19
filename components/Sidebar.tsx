"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV_TREE, NavGroup, NavLeaf } from "@/lib/nav";

function ComingSoonBadge() {
  return (
    <span
      title="Bald verfügbar"
      className="ml-auto shrink-0 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-neutral-400"
    >
      Bald verfügbar
    </span>
  );
}

function LeafItem({ item, active }: { item: NavLeaf; active: boolean }) {
  if (item.enabled && item.href) {
    return (
      <Link
        href={item.href}
        className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
          active
            ? "bg-phoenix-gold/10 font-medium text-neutral-900"
            : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
        }`}
      >
        {active && (
          <span className="h-1.5 w-1.5 rounded-full bg-phoenix-gold" aria-hidden />
        )}
        {item.label}
      </Link>
    );
  }

  return (
    <div
      aria-disabled
      title="Bald verfügbar"
      className="flex cursor-not-allowed items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-neutral-300"
    >
      <span>{item.label}</span>
      <ComingSoonBadge />
    </div>
  );
}

function GroupItem({ group, pathname }: { group: NavGroup; pathname: string }) {
  const hasChildren = !!group.children?.length;
  const containsActive =
    hasChildren && group.children!.some((c) => c.href === pathname);
  const hasEnabledChild = hasChildren && group.children!.some((c) => c.enabled);
  const [open, setOpen] = useState(containsActive);

  // Top-level leaf (no children), e.g. Overview / Operations.
  if (!hasChildren) {
    return <LeafItem item={group} active={group.href === pathname} />;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm font-medium text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
      >
        <span className="flex-1">{group.label}</span>
        {!hasEnabledChild && (
          <span className="text-[9px] uppercase tracking-wide text-neutral-300">
            Bald verfügbar
          </span>
        )}
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform ${open ? "rotate-90" : ""}`}
        >
          <path
            fillRule="evenodd"
            d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {open && (
        <div className="ml-2 mt-0.5 space-y-0.5 border-l border-neutral-100 pl-2.5">
          {group.children!.map((child) => (
            <LeafItem key={child.label} item={child} active={child.href === pathname} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div className="flex h-14 items-center gap-2 border-b border-neutral-200 px-4">
        <span className="flex h-6 w-6 items-center justify-center rounded bg-neutral-900 text-xs font-bold text-phoenix-gold">
          P
        </span>
        <span className="text-sm font-semibold tracking-wide text-neutral-900">
          CONTROL CENTER
        </span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        {NAV_TREE.map((group) => (
          <GroupItem key={group.label} group={group} pathname={pathname} />
        ))}
      </nav>
    </aside>
  );
}

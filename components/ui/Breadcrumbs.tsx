import Link from "next/link";
import { Fragment } from "react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const all: BreadcrumbItem[] = [{ label: "Control Center", href: "/overview" }, ...items];

  return (
    <nav aria-label="Breadcrumb" className="mb-1 flex flex-wrap items-center gap-1 text-xs text-neutral-400">
      {all.map((item, i) => {
        const isLast = i === all.length - 1;
        return (
          <Fragment key={`${item.label}-${i}`}>
            {i > 0 && <span aria-hidden>›</span>}
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-neutral-600 hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "text-neutral-500" : ""}>{item.label}</span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}

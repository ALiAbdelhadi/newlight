"use client";

import { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  /** Accepted and ignored. Identity lives in the top bar's account menu now. */
  user?: { imageUrl: string };
  /** Accepted and ignored — the breadcrumb already names the surface. */
  Route?: string;
  children?: ReactNode;
  className?: string;
}

/**
 * The page action bar.
 *
 * This was a 60px header carrying a package icon that linked to `/` — a route the admin app
 * does not serve — and the page's name at 20px. Both jobs moved to the top bar: the
 * breadcrumb says where you are, and it says it as a path through the domain rather than as
 * a bare noun. Keeping this rendering the title too produced the name twice, 60px apart.
 *
 * The `Route` and `user` props are still accepted because twenty-two pages pass them, and
 * changing all twenty-two to prove a point would be a large diff that improves nothing. They
 * do nothing. What survives is `children` — the page's primary actions — which now sits in a
 * 40px toolbar instead of a 60px masthead.
 *
 * When a page is rebuilt onto the List or Record archetype it drops this entirely and uses
 * the archetype's own header. Until then this keeps it from looking like the old panel.
 */
const DashboardHeader = ({ children, className }: DashboardHeaderProps) => {
  if (!children) return null;

  return (
    <div
      className={cn(
        "flex h-10 items-center justify-end gap-2 border-b px-4",
        className
      )}
    >
      {children}
    </div>
  );
};

export default DashboardHeader;

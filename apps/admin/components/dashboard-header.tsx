"use client";
import { Package2Icon } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

interface DashboardHeaderProps {
  user?: { imageUrl: string };
  Route?: string;
  children?: ReactNode;
}

const DashboardHeader = ({ user, Route, children }: DashboardHeaderProps) => (
  <header className="flex h-14 lg:h-[60px] items-center gap-4 border-b  shadow-sm px-4 lg:px-6">
    <Link href="/">
      <Package2Icon className="h-6 w-6" />
    </Link>
    <div className="flex-1">
      <h1 className="font-semibold text-xl">{Route}</h1>
    </div>
    {children}
  </header>
);

export default DashboardHeader;

"use client";

import { useState } from "react";
import type { ReactNode } from "react";

import FooterCredit from "../components/layout/FooterCredit";
import Sidebar from "../components/layout/Sidebar";

export default function MainLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100dvh",
        overflow: "hidden",
      }}
      className="bg-slate-100"
    >
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() =>
          setSidebarCollapsed((previous) => !previous)
        }
        isFullAccessTeam={true}
        isSuperadmin={true}
        canViewReport={true}
      />

      <div className="relative z-0 flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <main className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </main>

        <div className="shrink-0">
          <FooterCredit />
        </div>
      </div>
    </div>
  );
}
"use client";

import FooterCredit from "../components/layout/FooterCredit";
import Sidebar from "../components/layout/Sidebar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar
        isFullAccessTeam={true}
        isSuperadmin={true}
        canViewReport={true}
      />

      <div className="flex h-screen flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        <FooterCredit />
      </div>
    </div>
  );
}
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Truck, Clock3, Route, Shield, LogOut, Settings, Inbox } from "lucide-react";

import { PATHS } from "../../lib/paths";

interface MenuItem {
  label: string;
  path: string;
  icon: any;
}

interface SidebarUser {
  id?: string;
  em_id?: string;
  employee_id?: string;
  EMPLOYEE_ID?: string;

  name?: string;
  NAME?: string;

  surname?: string;
  SURNAME?: string;

  user_type?: string;
  ROLE?: string;
  role?: string;
  POSITION?: string;

  department?: string;
  DEPARTMENT?: string;

  warehouse?: string;
  WAREHOUSE?: string;

  team?: string;
  TEAM?: string;
}

interface SelectedDC {
  DC_CODE?: string;
  DC_NAME?: string;
  DC_TYPE?: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [userInfo, setUserInfo] = useState<SidebarUser | null>(null);
  const [selectedDC, setSelectedDC] = useState<SelectedDC | null>(null);

  useEffect(() => {
    const loadSidebarData = () => {
      const savedUser = localStorage.getItem("user");
      const savedSelectedDC = localStorage.getItem("selected_dc");

      if (!savedUser) {
        setUserInfo(null);
        setSelectedDC(null);
        return;
      }

      try {
        const parsedUser = JSON.parse(savedUser);
        console.log("SIDEBAR USER:", parsedUser);
        setUserInfo(parsedUser);
      } catch (error) {
        console.error("อ่านข้อมูล user จาก localStorage ไม่ได้:", error);
        localStorage.removeItem("user");
        setUserInfo(null);
      }

      if (savedSelectedDC) {
        try {
          const parsedDC = JSON.parse(savedSelectedDC);
          console.log("SIDEBAR SELECTED DC:", parsedDC);
          setSelectedDC(parsedDC);
        } catch (error) {
          console.error("อ่านข้อมูล selected_dc จาก localStorage ไม่ได้:", error);
          localStorage.removeItem("selected_dc");
          setSelectedDC(null);
        }
      } else {
        setSelectedDC(null);
      }
    };

    loadSidebarData();

    window.addEventListener("selectedDCChanged", loadSidebarData);

    return () => {
      window.removeEventListener("selectedDCChanged", loadSidebarData);
    };
  }, []);

  const displayName = useMemo(() => {
    const upperName = userInfo?.NAME;
    const lowerName = userInfo?.name;
    const upperSurname = userInfo?.SURNAME;
    const lowerSurname = userInfo?.surname;

    const fullName = `${lowerName || upperName || ""} ${lowerSurname || upperSurname || ""
      }`.trim();

    return fullName || "User";
  }, [userInfo]);

  const displayPosition = useMemo(() => {
    return (
      userInfo?.POSITION ||
      userInfo?.ROLE ||
      userInfo?.role ||
      userInfo?.user_type ||
      "Position"
    );
  }, [userInfo]);

  const displayTeam = useMemo(() => {
    const warehouse =
      userInfo?.warehouse ||
      userInfo?.WAREHOUSE ||
      userInfo?.team ||
      userInfo?.TEAM ||
      "";

    const department =
      userInfo?.department ||
      userInfo?.DEPARTMENT ||
      "";

    // ถ้า user เป็น WAREHOUSE และเลือก DC แล้ว ให้แสดง DC ที่เลือก
    const upperWarehouse = warehouse.toUpperCase();

    if (
      (upperWarehouse === "WAREHOUSE" || upperWarehouse === "GM") &&
      selectedDC?.DC_CODE
    ) {
      return selectedDC.DC_CODE;
    }

    // ถ้าเป็น CENTER ให้แสดง department
    if (warehouse.toUpperCase() === "CENTER") {
      return department || "CENTER";
    }

    return warehouse || department || "-";
  }, [userInfo, selectedDC]);

  const displayInitials = useMemo(() => {
    if (!displayName || displayName === "User") return "U";

    return displayName
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [displayName]);

  const menuItems: MenuItem[] = useMemo(() => {
    return [
      {
        label: "ขอเพิ่มกองรถ",
        path: PATHS.main.addFleet,
        icon: Truck,
      },
      {
        label: "คำขอจากคลัง",
        path: PATHS.main.gm,
        icon: Inbox,
      },
      {
        label: "รอประเมินกองรถ",
        path: PATHS.main.waitingFleet,
        icon: Clock3,
      },
      {
        label: "ติดตามกองรถออกใหม่/ทดแทน",
        path: PATHS.main.trackFleet,
        icon: Route,
      },
      {
        label: "จัดการกระบวนการทำงาน",
        path: PATHS.main.manageProcess,
        icon: Settings,
      },
      {
        label: "จัดการการใช้งาน",
        path: PATHS.main.manageUser,
        icon: Shield,
      },
    ];
  }, []);

  const handleChangeWarehouse = () => {
    localStorage.removeItem("selected_dc");
    router.push(PATHS.auth.selectDC);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("selected_dc");
    router.push("/");
  };

  const canChangeWarehouse = useMemo(() => {
    const warehouse =
      userInfo?.warehouse ||
      userInfo?.WAREHOUSE ||
      userInfo?.team ||
      userInfo?.TEAM ||
      "";

    const upperWarehouse = warehouse.toUpperCase();

    return upperWarehouse === "WAREHOUSE" || upperWarehouse === "GM";
  }, [userInfo]);

  return (
    <aside className="flex h-screen w-[220px] flex-col overflow-hidden border-r border-white/10 bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950 text-white shadow-xl">
      {/* TOP USER CARD */}
      <div className="p-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 text-xs font-bold text-white">
              {displayInitials}
            </div>

            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-white">
                {displayName}
              </p>

              <p className="truncate text-[10px] text-blue-200/70">
                {displayPosition}
              </p>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-blue-500/10 px-2.5 py-1.5 text-[10px] text-blue-100">
            <div className="min-w-0">
              <span className="text-blue-200/70">Team : </span>
              <span className="font-semibold text-blue-50">
                {displayTeam}
              </span>
            </div>

            {canChangeWarehouse && (
              <button
                type="button"
                onClick={handleChangeWarehouse}
                title="เลือก Warehouse / DC ใหม่"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/10 text-blue-100 transition hover:bg-white/20 hover:text-white"
              >
                <Settings size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TITLE */}
      <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-300/45">
        Main Menu
      </div>

      {/* MENU */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2">
        <div className="flex flex-col gap-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;

            return (
              <Link
                key={item.label}
                href={item.path}
                className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12px] transition ${isActive
                  ? "bg-white text-blue-900"
                  : "text-blue-100 hover:bg-white/[0.08] hover:text-white"
                  }`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${isActive
                    ? "bg-blue-100 text-blue-700"
                    : "bg-white/[0.06] text-blue-200"
                    }`}
                >
                  <Icon size={14} />
                </div>

                <span className="font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* LOGOUT */}
      <div className="border-t border-white/10 p-2.5">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12px] font-semibold text-red-100 hover:bg-red-500/10"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10">
            <LogOut size={14} />
          </div>
          Logout
        </button>
      </div>
    </aside>
  );
}
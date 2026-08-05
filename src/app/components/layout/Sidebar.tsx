"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";

import {
  Truck,
  Clock3,
  Route,
  Shield,
  LogOut,
  Settings,
  Inbox,
} from "lucide-react";

import { PATHS } from "../../lib/paths";

interface MenuItem {
  label: string;
  path: string;
  icon: LucideIcon;
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

  department?: string | null;
  DEPARTMENT?: string | null;

  warehouse?: string | null;
  WAREHOUSE?: string | null;

  team?: string | null;
  TEAM?: string | null;
}

interface SelectedDC {
  DC_CODE?: string;
  DC_NAME?: string;
  DC_TYPE?: string;
}

interface SidebarProps {
  isFullAccessTeam?: boolean;
  isSuperadmin?: boolean;
  canViewReport?: boolean;
}

const normalizeValue = (
  value?: string | null
): string => {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s_-]/g, "");
};

export default function Sidebar(
  _props: SidebarProps
) {
  const pathname = usePathname();
  const router = useRouter();

  const [userInfo, setUserInfo] =
    useState<SidebarUser | null>(null);

  const [selectedDC, setSelectedDC] =
    useState<SelectedDC | null>(null);

  useEffect(() => {
    const loadSidebarData = () => {
      const savedUser =
        localStorage.getItem("user");

      const savedSelectedDC =
        localStorage.getItem("selected_dc");

      if (savedUser) {
        try {
          const parsedUser =
            JSON.parse(savedUser) as SidebarUser;

          console.log(
            "SIDEBAR USER:",
            parsedUser
          );

          setUserInfo(parsedUser);
        } catch (error) {
          console.error(
            "อ่านข้อมูล user ไม่สำเร็จ:",
            error
          );

          localStorage.removeItem("user");
          setUserInfo(null);
        }
      } else {
        setUserInfo(null);
      }

      const hasValidSelectedDC =
        savedSelectedDC &&
        savedSelectedDC !== '""' &&
        savedSelectedDC !== "null" &&
        savedSelectedDC !== "undefined";

      if (hasValidSelectedDC) {
        try {
          const parsedDC =
            JSON.parse(
              savedSelectedDC
            ) as SelectedDC;

          if (
            parsedDC &&
            typeof parsedDC === "object"
          ) {
            console.log(
              "SIDEBAR SELECTED DC:",
              parsedDC
            );

            setSelectedDC(parsedDC);
          } else {
            localStorage.removeItem(
              "selected_dc"
            );

            setSelectedDC(null);
          }
        } catch (error) {
          console.error(
            "อ่านข้อมูล selected_dc ไม่สำเร็จ:",
            error
          );

          localStorage.removeItem(
            "selected_dc"
          );

          setSelectedDC(null);
        }
      } else {
        if (savedSelectedDC) {
          localStorage.removeItem(
            "selected_dc"
          );
        }

        setSelectedDC(null);
      }
    };

    loadSidebarData();

    window.addEventListener(
      "userChanged",
      loadSidebarData
    );

    window.addEventListener(
      "selectedDCChanged",
      loadSidebarData
    );

    window.addEventListener(
      "storage",
      loadSidebarData
    );

    return () => {
      window.removeEventListener(
        "userChanged",
        loadSidebarData
      );

      window.removeEventListener(
        "selectedDCChanged",
        loadSidebarData
      );

      window.removeEventListener(
        "storage",
        loadSidebarData
      );
    };
  }, []);

  const displayName = useMemo(() => {
    const firstName =
      userInfo?.name ||
      userInfo?.NAME ||
      "";

    const surname =
      userInfo?.surname ||
      userInfo?.SURNAME ||
      "";

    const fullName =
      `${firstName} ${surname}`.trim();

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

  const normalizedRole = useMemo(() => {
    return normalizeValue(
      userInfo?.ROLE ||
        userInfo?.role ||
        userInfo?.user_type ||
        userInfo?.POSITION
    );
  }, [userInfo]);

  const normalizedDepartment =
    useMemo(() => {
      return normalizeValue(
        userInfo?.department ||
          userInfo?.DEPARTMENT
      );
    }, [userInfo]);

  const normalizedWarehouse =
    useMemo(() => {
      return normalizeValue(
        userInfo?.warehouse ||
          userInfo?.WAREHOUSE
      );
    }, [userInfo]);

  const normalizedTeam = useMemo(() => {
    return normalizeValue(
      userInfo?.team ||
        userInfo?.TEAM
    );
  }, [userInfo]);

  const hasSuperadminAccess =
    useMemo(() => {
      return (
        normalizedRole === "SUPERADMIN"
      );
    }, [normalizedRole]);

  const displayTeam = useMemo(() => {
    const warehouse =
      userInfo?.warehouse ||
      userInfo?.WAREHOUSE ||
      "";

    const team =
      userInfo?.team ||
      userInfo?.TEAM ||
      "";

    const department =
      userInfo?.department ||
      userInfo?.DEPARTMENT ||
      "";

    const upperWarehouse =
      normalizeValue(warehouse);

    if (
      (upperWarehouse === "WAREHOUSE" ||
        upperWarehouse === "GM") &&
      selectedDC?.DC_CODE
    ) {
      return selectedDC.DC_CODE;
    }

    if (team) {
      return team;
    }

    if (upperWarehouse === "CENTER") {
      return department || "CENTER";
    }

    return (
      department ||
      warehouse ||
      "-"
    );
  }, [userInfo, selectedDC]);

  const displayInitials = useMemo(() => {
    if (
      !displayName ||
      displayName === "User"
    ) {
      return "U";
    }

    return displayName
      .split(" ")
      .filter(Boolean)
      .map((name) => name[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [displayName]);

  const menuItems =
    useMemo<MenuItem[]>(() => {
      const items: MenuItem[] = [];

      const accessValues = new Set([
        normalizedRole,
        normalizedDepartment,
        normalizedWarehouse,
        normalizedTeam,
      ]);

      const hasAccess = (
        ...allowedValues: string[]
      ) => {
        return allowedValues.some(
          (value) =>
            accessValues.has(
              normalizeValue(value)
            )
        );
      };

      const isGM = hasAccess("GM");
      const isFBP = hasAccess("FBP");
      const isIMP = hasAccess("IMP");
      const isTCAS = hasAccess("TCAS");

      items.push({
        label: "ขอเพิ่มกองรถ",
        path: PATHS.main.addFleet,
        icon: Truck,
      });

      if (
        hasSuperadminAccess ||
        isGM
      ) {
        items.push({
          label: "คำขอจากคลัง",
          path: PATHS.main.gm,
          icon: Inbox,
        });
      }

      if (
        hasSuperadminAccess ||
        isFBP ||
        isIMP
      ) {
        items.push({
          label: "รอประเมินกองรถ",
          path:
            PATHS.main.waitingFleet,
          icon: Clock3,
        });
      }

      if (
        hasSuperadminAccess ||
        isTCAS ||
        isIMP
      ) {
        items.push({
          label:
            "ติดตามกองรถออกใหม่/ทดแทน",
          path:
            PATHS.main.trackFleet,
          icon: Route,
        });
      }

      if (hasSuperadminAccess || isIMP) {
        items.push({
          label: "จัดการกระบวนการทำงาน",
          path: PATHS.main.manageProcess,
          icon: Settings,
        });
      }
      
      if (hasSuperadminAccess) {
        items.push({
          label: "จัดการการใช้งาน",
          path: PATHS.main.manageUser,
          icon: Shield,
        });
      }

      return items;
    }, [
      normalizedRole,
      normalizedDepartment,
      normalizedWarehouse,
      normalizedTeam,
      hasSuperadminAccess,
    ]);

  const canChangeWarehouse =
    useMemo(() => {
      return (
        normalizedWarehouse ===
          "WAREHOUSE" ||
        normalizedWarehouse === "GM" ||
        normalizedDepartment === "GM" ||
        normalizedTeam === "GM" ||
        hasSuperadminAccess
      );
    }, [
      normalizedWarehouse,
      normalizedDepartment,
      normalizedTeam,
      hasSuperadminAccess,
    ]);

  useEffect(() => {
    if (!userInfo) {
      return;
    }

    console.log("SIDEBAR ACCESS:", {
      role: normalizedRole,
      department:
        normalizedDepartment,
      warehouse:
        normalizedWarehouse,
      team: normalizedTeam,
      hasSuperadminAccess,
      selectedDC,
      menuItems: menuItems.map(
        (item) => item.label
      ),
    });
  }, [
    userInfo,
    normalizedRole,
    normalizedDepartment,
    normalizedWarehouse,
    normalizedTeam,
    hasSuperadminAccess,
    selectedDC,
    menuItems,
  ]);

  const handleChangeWarehouse = () => {
    localStorage.removeItem(
      "selected_dc"
    );

    setSelectedDC(null);

    window.dispatchEvent(
      new Event("selectedDCChanged")
    );

    router.push(
      PATHS.auth.selectDC
    );
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem(
      "selected_dc"
    );

    setUserInfo(null);
    setSelectedDC(null);

    window.dispatchEvent(
      new Event("userChanged")
    );

    window.dispatchEvent(
      new Event("selectedDCChanged")
    );

    router.push("/");
  };

  return (
    <aside className="flex h-screen w-[220px] flex-col overflow-hidden border-r border-white/10 bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950 text-white shadow-xl">
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
            <div className="min-w-0 truncate">
              <span className="text-blue-200/70">
                Team :{" "}
              </span>

              <span className="font-semibold text-blue-50">
                {displayTeam}
              </span>
            </div>

            {canChangeWarehouse && (
              <button
                type="button"
                onClick={
                  handleChangeWarehouse
                }
                title="เลือก Warehouse / DC ใหม่"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/10 text-blue-100 transition hover:bg-white/20 hover:text-white"
              >
                <Settings size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-300/45">
        Main Menu
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 py-2">
        <div className="flex flex-col gap-1">
          {menuItems.map((item) => {
            const Icon = item.icon;

            const isActive =
              pathname === item.path ||
              pathname.startsWith(
                `${item.path}/`
              );

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12px] transition ${
                  isActive
                    ? "bg-white text-blue-900"
                    : "text-blue-100 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition ${
                    isActive
                      ? "bg-blue-100 text-blue-700"
                      : "bg-white/[0.06] text-blue-200"
                  }`}
                >
                  <Icon size={14} />
                </div>

                <span className="font-semibold">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="border-t border-white/10 p-2.5">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-[12px] font-semibold text-red-100 transition hover:bg-red-500/10"
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
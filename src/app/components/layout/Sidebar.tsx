"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  usePathname,
  useRouter,
} from "next/navigation";
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

interface SidebarProps {
  isFullAccessTeam?: boolean;
  isSuperadmin?: boolean;
  canViewReport?: boolean;
}

/**
 * ทำให้ค่า role / department / warehouse
 * สามารถเปรียบเทียบได้ง่าย
 *
 * ตัวอย่าง:
 * "super admin"  -> "SUPERADMIN"
 * "SUPER_ADMIN"  -> "SUPERADMIN"
 * "Super-Admin"  -> "SUPERADMIN"
 */
const normalizeValue = (
  value?: string | null
): string => {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s_-]/g, "");
};

export default function Sidebar({
  isSuperadmin = false,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [userInfo, setUserInfo] =
    useState<SidebarUser | null>(null);

  const [selectedDC, setSelectedDC] =
    useState<SelectedDC | null>(null);

  /*
   * อ่านข้อมูลจาก localStorage
   */
  useEffect(() => {
    const loadSidebarData = () => {
      const savedUser =
        localStorage.getItem("user");

      const savedSelectedDC =
        localStorage.getItem("selected_dc");

      /*
       * อ่านข้อมูล User
       */
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
            "อ่านข้อมูล user จาก localStorage ไม่ได้:",
            error
          );

          localStorage.removeItem("user");
          setUserInfo(null);
        }
      } else {
        setUserInfo(null);
      }

      /*
       * อ่านข้อมูล DC ที่เลือก
       *
       * ป้องกันกรณี localStorage เป็น:
       * ""
       * null
       * undefined
       */
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
            "อ่านข้อมูล selected_dc จาก localStorage ไม่ได้:",
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

    /*
     * Event สำหรับอัปเดต Sidebar
     * เมื่อ Login หรือเปลี่ยน DC
     */
    window.addEventListener(
      "userChanged",
      loadSidebarData
    );

    window.addEventListener(
      "selectedDCChanged",
      loadSidebarData
    );

    /*
     * ทำงานเมื่อ localStorage เปลี่ยน
     * จาก Browser Tab อื่น
     */
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

  /*
   * ชื่อผู้ใช้งาน
   */
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

  /*
   * ตำแหน่ง / Role ที่แสดงบน Sidebar
   */
  const displayPosition = useMemo(() => {
    return (
      userInfo?.POSITION ||
      userInfo?.ROLE ||
      userInfo?.role ||
      userInfo?.user_type ||
      "Position"
    );
  }, [userInfo]);

  /*
   * อ่าน Role สำหรับตรวจสิทธิ์
   */
  const normalizedRole = useMemo(() => {
    return normalizeValue(
      userInfo?.ROLE ||
        userInfo?.role ||
        userInfo?.user_type ||
        userInfo?.POSITION
    );
  }, [userInfo]);

  /*
   * อ่าน Department สำหรับตรวจสิทธิ์เมนู
   */
  const normalizedDepartment =
    useMemo(() => {
      return normalizeValue(
        userInfo?.department ||
          userInfo?.DEPARTMENT
      );
    }, [userInfo]);

  /*
   * อ่าน Warehouse
   */
  const normalizedWarehouse =
    useMemo(() => {
      return normalizeValue(
        userInfo?.warehouse ||
          userInfo?.WAREHOUSE
      );
    }, [userInfo]);

  /*
   * อ่าน Team
   */
  const normalizedTeam = useMemo(() => {
    return normalizeValue(
      userInfo?.team ||
        userInfo?.TEAM
    );
  }, [userInfo]);

  /*
   * ตรวจสอบ Superadmin
   *
   * รองรับทั้ง:
   * 1. ค่า isSuperadmin ที่ส่งมาจาก Parent
   * 2. ค่า ROLE / role / user_type จาก localStorage
   */
  const hasSuperadminAccess =
    useMemo(() => {
      return (
        isSuperadmin ||
        normalizedRole === "SUPERADMIN"
      );
    }, [
      isSuperadmin,
      normalizedRole,
    ]);

  /*
   * ข้อมูล Team ที่แสดง
   */
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

    /*
     * ถ้าเป็นผู้ใช้ Warehouse หรือ GM
     * ให้แสดง DC ที่เลือก
     */
    if (
      (upperWarehouse === "WAREHOUSE" ||
        upperWarehouse === "GM") &&
      selectedDC?.DC_CODE
    ) {
      return selectedDC.DC_CODE;
    }

    /*
     * ถ้า Warehouse เป็น CENTER
     * ให้แสดง Department
     */
    if (upperWarehouse === "CENTER") {
      return (
        department ||
        team ||
        "CENTER"
      );
    }

    return (
      warehouse ||
      team ||
      department ||
      "-"
    );
  }, [
    userInfo,
    selectedDC,
  ]);

  /*
   * ตัวอักษรย่อของชื่อ
   */
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

  /*
   * กำหนดสิทธิ์เมนู
   */
  const menuItems =
    useMemo<MenuItem[]>(() => {
      const items: MenuItem[] = [];

      const isGM =
        normalizedDepartment === "GM";

      const isFBP =
        normalizedDepartment === "FBP";

      const isIMP =
        normalizedDepartment === "IMP";

      const isTCAS =
        normalizedDepartment === "TCAS";

      /*
       * ขอเพิ่มกองรถ
       * ทุกคนเห็น
       */
      items.push({
        label: "ขอเพิ่มกองรถ",
        path: PATHS.main.addFleet,
        icon: Truck,
      });

      /*
       * คำขอจากคลัง
       * Superadmin หรือ Department = GM
       */
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

      /*
       * รอประเมินกองรถ
       * Superadmin หรือ Department = FBP / IMP
       */
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

      /*
       * ติดตามกองรถออกใหม่/ทดแทน
       * Superadmin หรือ Department = TCAS / IMP
       */
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

      /*
       * จัดการกระบวนการทำงาน
       * Superadmin หรือ Department = IMP
       */
      if (
        hasSuperadminAccess ||
        isIMP
      ) {
        items.push({
          label:
            "จัดการกระบวนการทำงาน",
          path:
            PATHS.main.manageProcess,
          icon: Settings,
        });

        /*
         * จัดการการใช้งาน
         * Superadmin หรือ Department = IMP
         */
        items.push({
          label: "จัดการการใช้งาน",
          path:
            PATHS.main.manageUser,
          icon: Shield,
        });
      }

      return items;
    }, [
      normalizedDepartment,
      hasSuperadminAccess,
    ]);

  /*
   * ผู้ที่สามารถเปลี่ยน Warehouse / DC
   */
  const canChangeWarehouse =
    useMemo(() => {
      return (
        normalizedWarehouse ===
          "WAREHOUSE" ||
        normalizedWarehouse === "GM" ||
        normalizedDepartment === "GM" ||
        hasSuperadminAccess
      );
    }, [
      normalizedWarehouse,
      normalizedDepartment,
      hasSuperadminAccess,
    ]);

  /*
   * Log ตรวจสอบค่าที่ Sidebar ใช้งานจริง
   */
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
      isSuperadminFromProps:
        isSuperadmin,
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
    isSuperadmin,
    hasSuperadminAccess,
    selectedDC,
    menuItems,
  ]);

  /*
   * เปลี่ยน Warehouse / DC
   */
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

  /*
   * Logout
   */
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
      {/* User information */}
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

      {/* Menu title */}
      <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-300/45">
        Main Menu
      </div>

      {/* Menu list */}
      <div className="flex-1 overflow-y-auto px-2.5 py-2">
        <div className="flex flex-col gap-1">
          {menuItems.map(
            (item) => {
              const Icon =
                item.icon;

              const isActive =
                pathname ===
                  item.path ||
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
            }
          )}
        </div>
      </div>

      {/* Logout */}
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
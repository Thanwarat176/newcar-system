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

interface SelectedDepartment {
  value: string;
  label: string;
  type?: string;
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

  const [
    selectedDepartments,
    setSelectedDepartments,
  ] = useState<SelectedDepartment[]>([]);

  /*
   * โหลดข้อมูล User, DC และฝ่ายส่วนกลาง
   */
  useEffect(() => {
    const loadSidebarData = () => {
      const savedUser =
        localStorage.getItem("user");

      const savedSelectedDC =
        localStorage.getItem("selected_dc");

      const savedSelectedDepartments =
        localStorage.getItem(
          "selected_departments"
        );

      /*
       * อ่านข้อมูล User
       */
      if (savedUser) {
        try {
          const parsedUser =
            JSON.parse(
              savedUser
            ) as SidebarUser;

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

      /*
       * อ่าน DC ที่เลือก
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

      /*
       * อ่านฝ่ายส่วนกลางที่เลือก
       */
      if (savedSelectedDepartments) {
        try {
          const parsedDepartments =
            JSON.parse(
              savedSelectedDepartments
            ) as SelectedDepartment[];

          if (Array.isArray(parsedDepartments)) {
            const validDepartments =
              parsedDepartments.filter(
                (item) =>
                  item &&
                  typeof item === "object" &&
                  item.value
              );

            console.log(
              "SIDEBAR SELECTED DEPARTMENTS:",
              validDepartments
            );

            setSelectedDepartments(
              validDepartments
            );
          } else {
            setSelectedDepartments([]);
          }
        } catch (error) {
          console.error(
            "อ่านข้อมูล selected_departments ไม่สำเร็จ:",
            error
          );

          localStorage.removeItem(
            "selected_departments"
          );

          localStorage.removeItem(
            "selected_department_codes"
          );

          setSelectedDepartments([]);
        }
      } else {
        setSelectedDepartments([]);
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
   * ตำแหน่งผู้ใช้งาน
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
   * Normalize ข้อมูลสำหรับตรวจสอบสิทธิ์
   */
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

  /*
   * ตรวจสอบว่าเป็น CENTER หรือไม่
   * รองรับทั้ง warehouse = CENTER และ team = CENTER
   */
  const isCenterUser = useMemo(() => {
    return (
      normalizedWarehouse === "CENTER" ||
      normalizedTeam === "CENTER"
    );
  }, [
    normalizedWarehouse,
    normalizedTeam,
  ]);

  /*
   * รายการฝ่ายส่วนกลางที่เลือก
   * เช่น ["TCAS", "FBP"]
   */
  const normalizedSelectedDepartments =
    useMemo(() => {
      return selectedDepartments
        .map((item) =>
          normalizeValue(item.value)
        )
        .filter(Boolean);
    }, [selectedDepartments]);

  /*
   * สิทธิ์ Superadmin
   */
  const hasSuperadminAccess =
    useMemo(() => {
      return (
        normalizedRole === "SUPERADMIN"
      );
    }, [normalizedRole]);

  /*
   * แสดงข้อมูลตรง Team
   */
  const displayTeam = useMemo(() => {
    /*
     * CENTER ต้องตรวจสอบก่อน team
     * เพราะค่า team ของ User เป็น CENTER
     */
    if (isCenterUser) {
      if (selectedDepartments.length > 0) {
        return selectedDepartments
          .map((item) => item.value)
          .filter(Boolean)
          .join(", ");
      }

      return (
        userInfo?.department ||
        userInfo?.DEPARTMENT ||
        "CENTER"
      );
    }

    /*
     * Warehouse หรือ GM แสดง DC ที่เลือก
     */
    if (
      (normalizedWarehouse ===
        "WAREHOUSE" ||
        normalizedWarehouse === "GM") &&
      selectedDC?.DC_CODE
    ) {
      return selectedDC.DC_CODE;
    }

    return (
      userInfo?.team ||
      userInfo?.TEAM ||
      userInfo?.department ||
      userInfo?.DEPARTMENT ||
      userInfo?.warehouse ||
      userInfo?.WAREHOUSE ||
      "-"
    );
  }, [
    userInfo,
    isCenterUser,
    normalizedWarehouse,
    selectedDC,
    selectedDepartments,
  ]);

  /*
   * ตัวอักษรหน้ารูป User
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
   * สร้างรายการเมนูตามสิทธิ์
   */
  const menuItems = useMemo<MenuItem[]>(() => {
    const items: MenuItem[] = [];
  
    /*
     * CENTER:
     * ใช้เฉพาะฝ่ายที่เลือกจาก selected_departments
     *
     * ผู้ใช้งานทั่วไป:
     * ใช้ Department, Warehouse และ Team ตาม User
     */
    const accessValues = new Set<string>();
  
    /*
     * Role สามารถใช้ตรวจ Superadmin ได้
     */
    if (normalizedRole) {
      accessValues.add(normalizedRole);
    }
  
    if (isCenterUser) {
      /*
       * สำคัญ:
       * CENTER ไม่ใส่ normalizedDepartment เดิม
       * เพราะข้อมูล User อาจเป็น IMP แต่ผู้ใช้เลือก KEY_ACCOUNT
       */
      normalizedSelectedDepartments.forEach(
        (department) => {
          accessValues.add(department);
        }
      );
    } else {
      /*
       * ผู้ใช้งานที่ไม่ใช่ CENTER
       */
      if (normalizedDepartment) {
        accessValues.add(normalizedDepartment);
      }
  
      if (normalizedWarehouse) {
        accessValues.add(normalizedWarehouse);
      }
  
      if (normalizedTeam) {
        accessValues.add(normalizedTeam);
      }
    }
  
    const hasAccess = (
      ...allowedValues: string[]
    ) => {
      return allowedValues.some((value) =>
        accessValues.has(
          normalizeValue(value)
        )
      );
    };
  
    const isGM = hasAccess("GM");
    const isFBP = hasAccess("FBP");
    const isIMP = hasAccess("IMP");
    const isTCAS = hasAccess("TCAS");
    const isTCIA = hasAccess("TCIA");
    const isTSC = hasAccess("TSC");
  
    /*
     * normalizeValue จะเปลี่ยน
     * KEY_ACCOUNT เป็น KEYACCOUNT
     */
    const isKEYACCOUNT = hasAccess(
      "KEY_ACCOUNT",
      "KEYACCOUNT"
    );
  
    /*
     * ทุกคนเห็นเมนูขอเพิ่มกองรถ
     */
    items.push({
      label: "ขอเพิ่มกองรถ",
      path: PATHS.main.addFleet,
      icon: Truck,
    });
  
    /*
     * เฉพาะ GM
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
     * เฉพาะ FBP หรือ IMP
     *
     * KEY_ACCOUNT จะไม่เห็นเมนูนี้
     */
    if (
      hasSuperadminAccess ||
      isFBP ||
      isIMP
    ) {
      items.push({
        label: "รอประเมินกองรถ",
        path: PATHS.main.waitingFleet,
        icon: Clock3,
      });
    }
  
    /*
     * TCAS, FBP, KEY_ACCOUNT และ IMP
     */
    if (
      hasSuperadminAccess ||
      isTCAS ||
      isFBP ||
      isKEYACCOUNT ||
      isIMP
    ) {
      items.push({
        label:
          "ติดตามกองรถออกใหม่/ทดแทน",
        path: PATHS.main.trackFleet,
        icon: Route,
      });
    }
  
    /*
     * เฉพาะ IMP
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
    }
  
    /*
     * เฉพาะ Superadmin
     */
    if (hasSuperadminAccess) {
      items.push({
        label: "จัดการการใช้งาน",
        path: PATHS.main.manageUser,
        icon: Shield,
      });
    }
  
    /*
     * ตอนนี้ TCIA และ TSC
     * ยังไม่มีเมนูเฉพาะ
     */
    void isTCIA;
    void isTSC;
  
    return items;
  }, [
    normalizedRole,
    normalizedDepartment,
    normalizedWarehouse,
    normalizedTeam,
    normalizedSelectedDepartments,
    isCenterUser,
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
        isCenterUser ||
        hasSuperadminAccess
      );
    }, [
      normalizedWarehouse,
      normalizedDepartment,
      normalizedTeam,
      isCenterUser,
      hasSuperadminAccess,
    ]);

  /*
   * Console ตรวจสอบสิทธิ์
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
      isCenterUser,
      selectedDC,
      selectedDepartments,
      selectedDepartmentCodes:
        normalizedSelectedDepartments,
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
    isCenterUser,
    selectedDC,
    selectedDepartments,
    normalizedSelectedDepartments,
    menuItems,
  ]);

  /*
   * เปลี่ยน DC หรือฝ่าย
   */
  const handleChangeWarehouse = () => {
    localStorage.removeItem("selected_dc");

    localStorage.removeItem(
      "selected_dcs"
    );

    localStorage.removeItem(
      "selected_departments"
    );

    localStorage.removeItem(
      "selected_department_codes"
    );

    setSelectedDC(null);
    setSelectedDepartments([]);

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

    localStorage.removeItem(
      "selected_dcs"
    );

    localStorage.removeItem(
      "selected_departments"
    );

    localStorage.removeItem(
      "selected_department_codes"
    );

    setUserInfo(null);
    setSelectedDC(null);
    setSelectedDepartments([]);

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
      {/* ข้อมูลผู้ใช้งาน */}
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

          {/* Team / DC / Department */}
          <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-blue-500/10 px-2.5 py-1.5 text-[10px] text-blue-100">
            <div
              className="min-w-0 flex-1"
              title={displayTeam}
            >
              <span className="text-blue-200/70">
                Team:{" "}
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
                title={
                  isCenterUser
                    ? "เลือกฝ่ายใหม่"
                    : "เลือก Warehouse / DC ใหม่"
                }
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/10 text-blue-100 transition hover:bg-white/20 hover:text-white"
              >
                <Settings size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* หัวข้อเมนู */}
      <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-300/45">
        Main Menu
      </div>

      {/* รายการเมนู */}
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
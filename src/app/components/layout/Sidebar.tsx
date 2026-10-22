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
  LayoutDashboard,
  ChevronLeft,
  ChevronDown,
} from "lucide-react";

import { PATHS } from "../../lib/paths";

interface SubMenuItem {
  label: string;
  path?: string;
  disabled?: boolean;
  tooltip?: string;
}

interface MenuItem {
  label: string;
  path: string;
  icon: LucideIcon;
  children?: SubMenuItem[];
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
  collapsed: boolean;
  onToggle: () => void;
  isFullAccessTeam?: boolean;
  isSuperadmin?: boolean;
  canViewReport?: boolean;
}

interface SidebarData {
  user: SidebarUser | null;
  selectedDC: SelectedDC | null;
  selectedDCs: SelectedDC[];
  selectedDepartments: SelectedDepartment[];
}

const EMPTY_DATA: SidebarData = {
  user: null,
  selectedDC: null,
  selectedDCs: [],
  selectedDepartments: [],
};

const STORAGE_KEYS = [
  "user",
  "selected_dc",
  "selected_dcs",
  "selected_departments",
  "selected_department_codes",
];

const normalizeValue = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s_-]/g, "");

function getText(...values: unknown[]): string {
  for (const value of values) {
    const text = String(value ?? "").trim();

    if (text && text !== "-") {
      return text;
    }
  }

  return "";
}

const isRecord = (
  value: unknown
): value is Record<string, unknown> =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value);

function readStoredValue(key: string): unknown {
  try {
    const value = localStorage.getItem(key);

    if (!value || value === "undefined") {
      return null;
    }

    return JSON.parse(value);
  } catch (error) {
    console.error(`อ่าน ${key} ไม่สำเร็จ:`, error);
    return null;
  }
}

function uniqueCodes(codes: string[]): string[] {
  const result = new Map<string, string>();

  for (const value of codes) {
    const code = getText(value);

    if (code) {
      result.set(normalizeValue(code), code);
    }
  }

  return [...result.values()];
}

const matchesPath = (
  pathname: string,
  path?: string
): boolean =>
  Boolean(
    path &&
      (pathname === path || pathname.startsWith(`${path}/`))
  );

export default function Sidebar({
  collapsed,
  onToggle,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarData, setSidebarData] =
    useState<SidebarData>(EMPTY_DATA);

  const [openGroups, setOpenGroups] = useState<
    Record<string, boolean>
  >({
    [PATHS.main.trackFleet]: true,
  });

  const {
    user: userInfo,
    selectedDC,
    selectedDCs,
    selectedDepartments,
  } = sidebarData;

  // โหลดใหม่ทั้งเมื่อเปลี่ยนหน้าและเมื่อยืนยันการเลือก
  useEffect(() => {
    const loadSidebarData = () => {
      const user = readStoredValue("user");
      const dc = readStoredValue("selected_dc");
      const dcs = readStoredValue("selected_dcs");
      const departments = readStoredValue(
        "selected_departments"
      );

      const validDCs: SelectedDC[] = [];

      if (Array.isArray(dcs)) {
        for (const item of dcs) {
          if (!isRecord(item)) continue;

          const code = getText(item.DC_CODE);

          if (!code) continue;

          validDCs.push({
            DC_CODE: code,
            DC_NAME: getText(item.DC_NAME),
            DC_TYPE: getText(item.DC_TYPE),
          });
        }
      }

      const validDepartments: SelectedDepartment[] = [];

      if (Array.isArray(departments)) {
        for (const item of departments) {
          if (!isRecord(item)) continue;

          const code = getText(item.value);

          if (!code) continue;

          validDepartments.push({
            value: code,
            label: getText(item.label) || code,
            type: getText(item.type) || "CENTER",
          });
        }
      }

      const validDC: SelectedDC | null =
        isRecord(dc) && getText(dc.DC_CODE)
          ? {
              DC_CODE: getText(dc.DC_CODE),
              DC_NAME: getText(dc.DC_NAME),
              DC_TYPE: getText(dc.DC_TYPE),
            }
          : null;

      setSidebarData({
        user: isRecord(user)
          ? (user as SidebarUser)
          : null,
        selectedDC: validDC,
        selectedDCs: validDCs,
        selectedDepartments: validDepartments,
      });
    };

    loadSidebarData();

    const events = [
      "userChanged",
      "selectedDCChanged",
      "selectedDepartmentsChanged",
      "storage",
    ];

    events.forEach((event) => {
      window.addEventListener(event, loadSidebarData);
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, loadSidebarData);
      });
    };
  }, [pathname]);

  useEffect(() => {
    if (matchesPath(pathname, PATHS.main.trackFleet)) {
      setOpenGroups((previous) => ({
        ...previous,
        [PATHS.main.trackFleet]: true,
      }));
    }
  }, [pathname]);

  const displayName =
    [
      getText(userInfo?.name, userInfo?.NAME),
      getText(userInfo?.surname, userInfo?.SURNAME),
    ]
      .filter(Boolean)
      .join(" ") || "User";

  const displayPosition =
    getText(
      userInfo?.POSITION,
      userInfo?.ROLE,
      userInfo?.role,
      userInfo?.user_type
    ) || "ผู้ใช้งาน";

  const originalDepartment = getText(
    userInfo?.department,
    userInfo?.DEPARTMENT
  );

  const originalWarehouse = getText(
    userInfo?.warehouse,
    userInfo?.WAREHOUSE
  );

  const originalTeam = getText(
    userInfo?.team,
    userInfo?.TEAM
  );

  const normalizedDepartment =
    normalizeValue(originalDepartment);

  const normalizedWarehouse =
    normalizeValue(originalWarehouse);

  const normalizedUserType =
    normalizeValue(userInfo?.user_type);

  const loginUser = getText(
    userInfo?.em_id,
    userInfo?.employee_id,
    userInfo?.EMPLOYEE_ID
  ).toUpperCase();

  const isCenterUser =
    loginUser === "CENTER" ||
    normalizedWarehouse === "CENTER" ||
    normalizeValue(originalTeam) === "CENTER";

  const normalizedSelectedDepartments = useMemo(
    () =>
      uniqueCodes(
        selectedDepartments.map((item) => item.value)
      ).map(normalizeValue),
    [selectedDepartments]
  );

  const selectedWarehouseCodes = useMemo(
    () =>
      uniqueCodes([
        ...selectedDCs.map(
          (item) => item.DC_CODE || ""
        ),
        selectedDC?.DC_CODE || "",
      ]),
    [selectedDCs, selectedDC]
  );

  const hasSelectedDepartments =
    isCenterUser &&
    normalizedSelectedDepartments.length > 0;

  const hasSelectedWarehouse =
    selectedWarehouseCodes.length > 0;

  // เลือกเฉพาะคลัง ให้แสดงมุมมองคลัง
  // หากเลือกฝ่ายร่วมด้วย ให้ใช้เงื่อนไขฝ่ายที่เลือก
  const isWarehouseView =
    isCenterUser &&
    !hasSelectedDepartments &&
    hasSelectedWarehouse;

  const activeDepartments = useMemo(() => {
    // เลือกฝ่าย เช่น KA ให้ใช้ฝ่ายที่เลือก
    if (hasSelectedDepartments) {
      return normalizedSelectedDepartments;
    }

    // เลือกเฉพาะคลัง ไม่ใช้ IMP เดิมปน
    if (isWarehouseView) {
      return [];
    }

    // ไม่เลือกอะไร กลับไปใช้ฝ่ายเดิมจาก user
    return normalizedDepartment
      ? [normalizedDepartment]
      : [];
  }, [
    hasSelectedDepartments,
    normalizedSelectedDepartments,
    isWarehouseView,
    normalizedDepartment,
  ]);

  const displayTeam = useMemo(() => {
    if (isCenterUser) {
      const codes = uniqueCodes([
        ...selectedDepartments.map(
          (item) => item.value
        ),
        ...selectedWarehouseCodes,
      ]);

      if (codes.length > 0) {
        return codes.join(", ");
      }

      return (
        originalDepartment ||
        originalTeam ||
        originalWarehouse ||
        "CENTER"
      );
    }

    return (
      selectedWarehouseCodes.join(", ") ||
      originalTeam ||
      originalDepartment ||
      originalWarehouse ||
      "-"
    );
  }, [
    isCenterUser,
    selectedDepartments,
    selectedWarehouseCodes,
    originalDepartment,
    originalTeam,
    originalWarehouse,
  ]);

  const displayInitials =
    displayName === "User"
      ? "U"
      : displayName
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((name) => Array.from(name)[0])
          .join("")
          .toUpperCase();

  const isIMP = activeDepartments.includes("IMP");
  const isFBP = activeDepartments.includes("FBP");

  // Role ยังคงมาจากบัญชีจริง
  const isAdmin = normalizedUserType === "ADMIN";
  const isSuperadmin =
    normalizedUserType === "SUPERADMIN";

  const menuItems = useMemo<MenuItem[]>(() => {
    const items: MenuItem[] = [
      {
        label: "Dashboard",
        path: PATHS.main.dashboard,
        icon: LayoutDashboard,
      },
      {
        label: "ขอเพิ่มกองรถ",
        path: PATHS.main.addFleet,
        icon: Truck,
      },
    ];

    if (isWarehouseView) {
      return items;
    }

    if (isIMP || normalizedWarehouse === "GM") {
      items.push({
        label: "คำขอจากคลัง",
        path: PATHS.main.gm,
        icon: Inbox,
      });
    }

    if (isIMP || isFBP) {
      items.push({
        label: "รอประเมินกองรถ",
        path: PATHS.main.waitingFleet,
        icon: Clock3,
      });
    }

    if (isAdmin || isSuperadmin) {
      items.push({
        label: "ติดตามกองรถ",
        path: PATHS.main.trackFleet,
        icon: Route,
        children: [
          {
            label: "รถออกใหม่/ทดแทน",
            path: PATHS.main.trackFleet,
          },
          {
            label: "รถเสริม",
            disabled: true,
            tooltip: "กำลังพัฒนา",
          },
        ],
      });
    }

    if (isIMP || isSuperadmin) {
      items.push(
        {
          label: "จัดการกระบวนการทำงาน",
          path: PATHS.main.manageProcess,
          icon: Settings,
        },
        {
          label: "จัดการการใช้งาน",
          path: PATHS.main.manageUser,
          icon: Shield,
        }
      );
    }

    return items;
  }, [
    isWarehouseView,
    isIMP,
    isFBP,
    isAdmin,
    isSuperadmin,
    normalizedWarehouse,
  ]);

  // ใช้ฝ่ายต้นฉบับ เพื่อให้เปลี่ยนกลับได้
  // แม้เลือกฝ่ายอื่นหรือเลือกคลังอยู่
  const canChangeWarehouse =
    normalizedDepartment === "IMP";

  const handleChangeWarehouse = () => {
    router.push(PATHS.auth.selectDC);
  };

  const handleLogout = () => {
    STORAGE_KEYS.forEach((key) => {
      localStorage.removeItem(key);
    });

    setSidebarData(EMPTY_DATA);

    window.dispatchEvent(new Event("userChanged"));
    window.dispatchEvent(
      new Event("selectedDCChanged")
    );

    router.push("/");
  };

  const handleGroupClick = (path: string) => {
    if (collapsed) {
      setOpenGroups((previous) => ({
        ...previous,
        [path]: true,
      }));

      onToggle();
      return;
    }

    setOpenGroups((previous) => ({
      ...previous,
      [path]: !previous[path],
    }));
  };

  return (
    <div
      className="fleet-sidebar"
      data-collapsed={collapsed ? "true" : "false"}
      style={{ width: collapsed ? 72 : 240 }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-controls="fleet-sidebar-content"
        aria-expanded={!collapsed}
        aria-label={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
        title={collapsed ? "ขยายเมนู" : "ย่อเมนู"}
        className="sidebar-toggle"
      >
        <span className="toggle-arrow">
          <ChevronLeft size={16} />
        </span>
      </button>

      <aside
        id="fleet-sidebar-content"
        aria-label="เมนูหลัก"
        className="sidebar-surface"
      >
        <header className="profile-header">
          <div className="profile-card">
            <div className="profile-top">
              <div
                className="profile-avatar"
                title={`${displayName} · ${displayPosition} · ${displayTeam}`}
              >
                {displayInitials}
              </div>

              <div
                className="profile-info fade-content"
                aria-hidden={collapsed}
              >
                <p
                  className="profile-name"
                  title={displayName}
                >
                  {displayName}
                </p>

                <p
                  className="profile-position"
                  title={displayPosition}
                >
                  {displayPosition}
                </p>
              </div>
            </div>

            <div
              className="profile-team fade-content"
              aria-hidden={collapsed}
            >
              <p
                className="profile-team-text"
                title={displayTeam}
              >
                <span className="profile-team-label">
                  Team:{" "}
                </span>
                <span className="profile-team-value">
                  {displayTeam}
                </span>
              </p>

              {canChangeWarehouse && (
                <button
                  type="button"
                  onClick={handleChangeWarehouse}
                  disabled={collapsed}
                  aria-label="เปลี่ยนฝ่ายหรือ Warehouse"
                  title="เปลี่ยนฝ่าย / Warehouse"
                  className="profile-settings"
                >
                  <Settings size={14} />
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="sidebar-divider" />

        <div className="menu-caption">
          <span
            className="fade-content"
            aria-hidden={collapsed}
          >
            MAIN MENU
          </span>
          <span className="caption-mark" />
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = matchesPath(
              pathname,
              item.path
            );

            const isGroupOpen =
              !collapsed &&
              Boolean(openGroups[item.path]);

            const submenuId = `sidebar-submenu-${index}`;

            const content = (
              <span className="menu-content">
                <span className="menu-icon">
                  <Icon size={17} />
                </span>

                <span
                  className="menu-label fade-content"
                  aria-hidden={collapsed}
                >
                  {item.label}
                </span>

                {item.children && (
                  <span
                    className={`group-arrow fade-content ${
                      isGroupOpen ? "is-open" : ""
                    }`}
                    aria-hidden="true"
                  >
                    <ChevronDown size={14} />
                  </span>
                )}
              </span>
            );

            return (
              <div
                key={item.path}
                className="menu-group"
              >
                {item.children ? (
                  <button
                    type="button"
                    onClick={() =>
                      handleGroupClick(item.path)
                    }
                    aria-label={item.label}
                    aria-expanded={isGroupOpen}
                    aria-controls={submenuId}
                    title={
                      collapsed
                        ? item.label
                        : undefined
                    }
                    className={`menu-item ${
                      isActive ? "is-active" : ""
                    }`}
                  >
                    {content}
                  </button>
                ) : (
                  <Link
                    href={item.path}
                    aria-label={item.label}
                    aria-current={
                      isActive ? "page" : undefined
                    }
                    title={
                      collapsed
                        ? item.label
                        : undefined
                    }
                    className={`menu-item ${
                      isActive ? "is-active" : ""
                    }`}
                  >
                    {content}
                  </Link>
                )}

                {item.children && (
                  <div
                    id={submenuId}
                    aria-hidden={!isGroupOpen}
                    className={`submenu-motion ${
                      isGroupOpen ? "is-open" : ""
                    }`}
                  >
                    <div className="submenu-clip">
                      <div className="submenu-list">
                        {item.children.map((child) => {
                          if (
                            child.disabled ||
                            !child.path
                          ) {
                            return (
                              <div
                                key={child.label}
                                className="disabled-item-wrap"
                              >
                                <button
                                  type="button"
                                  tabIndex={
                                    isGroupOpen ? 0 : -1
                                  }
                                  aria-disabled="true"
                                  title={
                                    child.tooltip ||
                                    "กำลังพัฒนา"
                                  }
                                  className="submenu-item is-disabled"
                                >
                                  <span className="submenu-dot" />
                                  {child.label}
                                </button>

                                <span
                                  role="tooltip"
                                  className="dev-tooltip"
                                >
                                  {child.tooltip ||
                                    "กำลังพัฒนา"}
                                </span>
                              </div>
                            );
                          }

                          const isChildActive =
                            matchesPath(
                              pathname,
                              child.path
                            );

                          return (
                            <Link
                              key={child.label}
                              href={child.path}
                              tabIndex={
                                isGroupOpen ? 0 : -1
                              }
                              aria-current={
                                isChildActive
                                  ? "page"
                                  : undefined
                              }
                              className={`submenu-item ${
                                isChildActive
                                  ? "is-active"
                                  : ""
                              }`}
                            >
                              <span className="submenu-dot" />
                              {child.label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <footer className="sidebar-footer">
          <button
            type="button"
            onClick={handleLogout}
            aria-label="ออกจากระบบ"
            title={
              collapsed ? "ออกจากระบบ" : undefined
            }
            className="menu-item logout-item"
          >
            <span className="menu-content">
              <span className="menu-icon">
                <LogOut size={17} />
              </span>

              <span
                className="menu-label fade-content"
                aria-hidden={collapsed}
              >
                ออกจากระบบ
              </span>
            </span>
          </button>
        </footer>
      </aside>

      <style jsx>{`
        .fleet-sidebar {
          --sidebar-ease: cubic-bezier(0.22, 1, 0.36, 1);
          position: relative;
          z-index: 40;
          height: 100%;
          min-width: 0;
          flex: 0 0 auto;
          transition: width 380ms var(--sidebar-ease);
        }

        .sidebar-surface {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          overflow: hidden;
          border-right: 1px solid rgba(255, 255, 255, 0.1);
          background: linear-gradient(
            180deg,
            #020617 0%,
            #172554 52%,
            #020617 100%
          );
          color: white;
          box-shadow: 5px 0 22px rgba(15, 23, 42, 0.08);
        }

        .sidebar-toggle {
          position: absolute;
          top: 28px;
          right: -14px;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: 1px solid #dbeafe;
          border-radius: 50%;
          background: white;
          color: #1d4ed8;
          box-shadow: 0 3px 12px rgba(15, 23, 42, 0.14);
          cursor: pointer;
          transition: transform 180ms ease;
        }

        .sidebar-toggle:hover {
          background: #eff6ff;
          transform: scale(1.08);
        }

        .toggle-arrow {
          display: flex;
          transition: transform 380ms var(--sidebar-ease);
        }

        [data-collapsed="true"] .toggle-arrow {
          transform: rotate(180deg);
        }

        .profile-header {
          flex-shrink: 0;
          padding: 14px 8px 12px;
        }

        .profile-card {
          position: relative;
          width: 100%;
          height: 118px;
          overflow: hidden;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.055);
          box-shadow: inset 0 0 0 1px
            rgba(255, 255, 255, 0.12);
        }

        .profile-top {
          display: flex;
          align-items: center;
          gap: 11px;
          width: 224px;
          height: 64px;
          padding: 14px 14px 9px;
          box-sizing: border-box;
        }

        .profile-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 40px;
          height: 40px;
          border-radius: 13px;
          background: linear-gradient(
            135deg,
            #60a5fa,
            #2563eb
          );
          color: white;
          font-size: 12px;
          font-weight: 700;
          transition: transform 380ms var(--sidebar-ease);
        }

        .profile-info {
          flex: 1;
          min-width: 0;
        }

        .profile-name,
        .profile-position {
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .profile-name {
          color: white;
          font-size: 13px;
          font-weight: 600;
          line-height: 20px;
        }

        .profile-position {
          margin-top: 1px;
          color: #93b4e2;
          font-size: 10px;
          line-height: 16px;
        }

        .profile-team {
          position: absolute;
          top: 64px;
          left: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          width: 196px;
          height: 40px;
          padding: 0 11px;
          box-sizing: border-box;
          border-radius: 13px;
          background: rgba(59, 94, 174, 0.18);
        }

        .profile-team-text {
          min-width: 0;
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 10px;
          line-height: 18px;
        }

        .profile-team-label {
          color: #93b4e2;
        }

        .profile-team-value {
          color: #eff6ff;
          font-weight: 600;
        }

        .profile-settings {
          display: flex;
          align-items: center;
          justify-content: center;
          flex: 0 0 27px;
          height: 27px;
          border: 0;
          border-radius: 9px;
          background: rgba(148, 180, 235, 0.13);
          color: #dbeafe;
          cursor: pointer;
        }

        .profile-settings:hover {
          background: rgba(148, 180, 235, 0.25);
        }

        [data-collapsed="true"] .profile-card {
          background: transparent;
          box-shadow: none;
        }

        [data-collapsed="true"] .profile-avatar {
          transform: translateX(-6px);
        }

        .fade-content {
          opacity: 1;
          transform: translateX(0);
          visibility: visible;
          transition:
            opacity 180ms ease 90ms,
            transform 300ms var(--sidebar-ease),
            visibility 0s;
        }

        [data-collapsed="true"] .fade-content {
          opacity: 0;
          transform: translateX(-6px);
          visibility: hidden;
          pointer-events: none;
          transition:
            opacity 100ms ease,
            transform 180ms ease,
            visibility 0s linear 100ms;
        }

        .sidebar-divider {
          height: 1px;
          margin: 0 16px;
          flex-shrink: 0;
          background: rgba(255, 255, 255, 0.08);
        }

        .menu-caption {
          position: relative;
          height: 38px;
          margin: 0 12px;
          flex-shrink: 0;
          overflow: hidden;
        }

        .menu-caption > .fade-content {
          position: absolute;
          top: 14px;
          left: 12px;
          white-space: nowrap;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.16em;
          color: rgba(147, 197, 253, 0.45);
        }

        .caption-mark {
          position: absolute;
          top: 18px;
          left: 16px;
          width: 16px;
          height: 3px;
          border-radius: 4px;
          background: rgba(147, 197, 253, 0.25);
          opacity: 0;
        }

        [data-collapsed="true"] .caption-mark {
          opacity: 1;
        }

        .sidebar-nav {
          min-height: 0;
          flex: 1;
          overflow-x: hidden;
          overflow-y: auto;
          padding: 0 12px 16px;
          scrollbar-width: thin;
          scrollbar-color: #1e40af transparent;
        }

        .menu-group + .menu-group {
          margin-top: 6px;
        }

        .fleet-sidebar :global(.menu-item) {
          display: flex;
          align-items: center;
          width: 100%;
          height: 44px;
          padding: 0;
          overflow: hidden;
          border: 0;
          border-radius: 12px;
          background: transparent;
          color: #dbeafe;
          text-decoration: none;
          text-align: left;
          cursor: pointer;
          transition:
            background-color 180ms ease,
            color 180ms ease;
        }

        .fleet-sidebar :global(.menu-item:hover) {
          background: rgba(255, 255, 255, 0.08);
          color: white;
        }

        .fleet-sidebar :global(.menu-item.is-active) {
          background: white;
          color: #1e3a8a;
          box-shadow: 0 3px 12px rgba(2, 6, 23, 0.1);
        }

        .menu-content {
          display: flex;
          flex: 0 0 216px;
          align-items: center;
          gap: 10px;
          width: 216px;
          height: 44px;
          padding: 0 8px;
          box-sizing: border-box;
        }

        .menu-icon {
          display: flex;
          flex: 0 0 32px;
          align-items: center;
          justify-content: center;
          height: 32px;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.06);
          color: #bfdbfe;
        }

        .fleet-sidebar
          :global(.menu-item.is-active)
          .menu-icon {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .menu-label {
          min-width: 0;
          flex: 1;
          white-space: nowrap;
          font-size: 12px;
          font-weight: 600;
        }

        .group-arrow {
          display: flex;
          margin-right: 4px;
          flex-shrink: 0;
        }

        .group-arrow :global(svg) {
          transition: transform 280ms var(--sidebar-ease);
        }

        .group-arrow.is-open :global(svg) {
          transform: rotate(180deg);
        }

        .submenu-motion {
          display: grid;
          grid-template-rows: 0fr;
          opacity: 0;
          visibility: hidden;
          transition:
            grid-template-rows 300ms var(--sidebar-ease),
            opacity 160ms ease,
            visibility 0s linear 300ms;
        }

        .submenu-motion.is-open {
          grid-template-rows: 1fr;
          opacity: 1;
          visibility: visible;
          transition:
            grid-template-rows 340ms var(--sidebar-ease),
            opacity 220ms ease,
            visibility 0s;
        }

        .submenu-clip {
          min-height: 0;
          overflow: hidden;
        }

        .submenu-list {
          width: 174px;
          margin: 8px 0 4px 40px;
          padding-left: 12px;
          box-sizing: border-box;
          border-left: 1px solid
            rgba(191, 219, 254, 0.16);
        }

        .fleet-sidebar :global(.submenu-item) {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          min-height: 38px;
          margin-top: 3px;
          padding: 8px 10px;
          box-sizing: border-box;
          border: 0;
          border-radius: 9px;
          background: transparent;
          color: rgba(191, 219, 254, 0.75);
          font-size: 11px;
          font-weight: 500;
          white-space: nowrap;
          text-align: left;
          text-decoration: none;
        }

        .fleet-sidebar :global(.submenu-item:hover) {
          background: rgba(255, 255, 255, 0.06);
          color: white;
        }

        .fleet-sidebar :global(.submenu-item.is-active) {
          background: rgba(96, 165, 250, 0.15);
          color: #dbeafe;
          box-shadow: inset 0 0 0 1px
            rgba(147, 197, 253, 0.12);
        }

        .submenu-dot {
          width: 5px;
          height: 5px;
          flex-shrink: 0;
          border-radius: 50%;
          background: rgba(147, 197, 253, 0.4);
        }

        .disabled-item-wrap {
          position: relative;
        }

        .fleet-sidebar :global(.submenu-item.is-disabled) {
          background: transparent;
          color: #64748b;
          cursor: not-allowed;
        }

        .dev-tooltip {
          position: absolute;
          right: 0;
          bottom: 100%;
          z-index: 20;
          margin-bottom: 4px;
          padding: 7px 10px;
          border-radius: 8px;
          background: #1e293b;
          color: white;
          font-size: 10px;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
        }

        .disabled-item-wrap:hover .dev-tooltip,
        .disabled-item-wrap:focus-within .dev-tooltip {
          opacity: 1;
        }

        .sidebar-footer {
          flex-shrink: 0;
          padding: 12px;
          border-top: 1px solid
            rgba(255, 255, 255, 0.1);
        }

        .fleet-sidebar :global(.logout-item) {
          color: #fee2e2;
        }

        .fleet-sidebar :global(.logout-item:hover) {
          background: rgba(239, 68, 68, 0.1);
          color: #fecaca;
        }

        .logout-item .menu-icon {
          background: rgba(239, 68, 68, 0.1);
          color: #fecaca;
        }

        .fleet-sidebar :global(button:focus-visible),
        .fleet-sidebar :global(a:focus-visible) {
          outline: 2px solid #60a5fa;
          outline-offset: -2px;
        }

        @media (prefers-reduced-motion: reduce) {
          .fleet-sidebar,
          .fleet-sidebar *,
          .fleet-sidebar :global(a),
          .fleet-sidebar :global(svg) {
            transition-duration: 0ms !important;
            transition-delay: 0ms !important;
          }
        }
      `}</style>
    </div>
  );
}
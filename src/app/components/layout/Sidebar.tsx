"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
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
  LayoutDashboard,
  ChevronLeft,
  ChevronDown,
} from "lucide-react";

import { PATHS } from "../../lib/paths";

const SUMMARY_API_URL =
  "http://192.168.158.210/api_new_truck/api/sidebar_summary.php";

interface SubMenuItem {
  label: string;
  path?: string;
  disabled?: boolean;
  tooltip?: string;
  badge?: number;
}

interface MenuItem {
  label: string;
  path: string;
  icon: LucideIcon;
  children?: SubMenuItem[];
  badge?: number;
}

interface SidebarSummary {
  gm: number;
  fbp: number;
  tcas: {
    new_replacement: number;
    supplement: number;
  };
  user: number;
}

interface SidebarUser {
  id?: string | number;
  em_id?: string | number;
  employee_id?: string | number;
  EMPLOYEE_ID?: string | number;
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

const EMPTY_SUMMARY: SidebarSummary = {
  gm: 0,
  fbp: 0,
  tcas: {
    new_replacement: 0,
    supplement: 0,
  },
  user: 0,
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
  } catch {
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

function toCount(value: unknown): number {
  const count = Number(value);

  return Number.isFinite(count)
    ? Math.max(0, Math.floor(count))
    : 0;
}

function matchesPath(
  pathname: string,
  path?: string
): boolean {
  if (!path) return false;

  const targetPath = path.split("?")[0];

  return (
    pathname === targetPath ||
    pathname.startsWith(`${targetPath}/`)
  );
}

function matchesMenuPath(
  pathname: string,
  currentSearch: string,
  path?: string
): boolean {
  if (!path || !matchesPath(pathname, path)) {
    return false;
  }

  const queryIndex = path.indexOf("?");

  if (queryIndex === -1) {
    return true;
  }

  const targetParams = new URLSearchParams(
    path.slice(queryIndex + 1)
  );

  const currentParams = new URLSearchParams(
    currentSearch
  );

  if (!currentParams.has("fleet_group")) {
    currentParams.set(
      "fleet_group",
      "new-replacement"
    );
  }

  let matches = true;

  targetParams.forEach((value, key) => {
    if (currentParams.get(key) !== value) {
      matches = false;
    }
  });

  return matches;
}

function SidebarContent({
  collapsed,
  onToggle,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.toString();

  const [sidebarData, setSidebarData] =
    useState<SidebarData>(EMPTY_DATA);

  const [summary, setSummary] =
    useState<SidebarSummary>(EMPTY_SUMMARY);

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

  // อ่านข้อมูลรูปแบบเดียวกับที่ SelectDCPage บันทึก
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

      const validDepartments: SelectedDepartment[] =
        [];

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

      const nextData: SidebarData = {
        user: isRecord(user)
          ? (user as SidebarUser)
          : null,
        selectedDC: validDC,
        selectedDCs: validDCs,
        selectedDepartments: validDepartments,
      };

      // ไม่เปลี่ยน state ถ้าข้อมูลเหมือนเดิม
      setSidebarData((previous) =>
        JSON.stringify(previous) ===
        JSON.stringify(nextData)
          ? previous
          : nextData
      );
    };

    loadSidebarData();

    const events = [
      "userChanged",
      "selectedDCChanged",
      "selectedDepartmentsChanged",
      "storage",
      "focus",
    ];

    events.forEach((event) => {
      window.addEventListener(
        event,
        loadSidebarData
      );
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(
          event,
          loadSidebarData
        );
      });
    };
  }, [pathname]);

  const displayName =
    [
      getText(userInfo?.name, userInfo?.NAME),
      getText(
        userInfo?.surname,
        userInfo?.SURNAME
      ),
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

  const normalizedDepartment = normalizeValue(
    originalDepartment
  );

  const normalizedWarehouse = normalizeValue(
    originalWarehouse
  );

  const loginUser = getText(
    userInfo?.em_id,
    userInfo?.employee_id,
    userInfo?.EMPLOYEE_ID
  ).toUpperCase();

  // ใช้เงื่อนไขเดียวกับ SelectDCPage
  const isCenterUser =
    loginUser === "CENTER" ||
    normalizedWarehouse === "CENTER";

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

  const selectedTeamCodes = useMemo(
    () =>
      uniqueCodes(
        selectedDepartments.map(
          (item) => item.value
        )
      ).map((code) => normalizeValue(code)),
    [selectedDepartments]
  );

  const hasSelectedContext =
    selectedTeamCodes.length > 0 ||
    selectedWarehouseCodes.length > 0;

  // CENTER เลือกฝ่าย: ใช้ฝ่ายที่เลือก
  // CENTER เลือกเฉพาะคลัง: ไม่ใช้ฝ่ายเดิม
  // ไม่เลือกอะไร: ใช้ฝ่ายเดิมจาก user
  // ผู้ใช้ทั่วไป: ใช้ฝ่ายเดิม เพราะเลือกได้เฉพาะคลัง
  const activeDepartments = isCenterUser
    ? hasSelectedContext
      ? selectedTeamCodes
      : [normalizedDepartment]
    : [normalizedDepartment];

  const hasFullAccess =
    isCenterUser &&
    activeDepartments.includes("IMP");

  const isGM = activeDepartments.includes("GM");
  const isFBP = activeDepartments.includes("FBP");
  const isTCAS =
    activeDepartments.includes("TCAS");
  const isKA = activeDepartments.includes("KA");

  const normalizedRole = normalizeValue(
    getText(
      userInfo?.ROLE,
      userInfo?.role,
      userInfo?.user_type
    )
  );

  const isSuperadmin =
    normalizedRole === "SUPERADMIN";

  // อิงฝ่ายเดิมเพื่อให้กลับไปเปลี่ยนการเลือกได้
  const canChangeWarehouse =
    normalizedDepartment === "IMP";

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

  // โหลดจำนวนแจ้งเตือนทั้งสองกลุ่มจาก API
  useEffect(() => {
    if (!userInfo) {
      setSummary(EMPTY_SUMMARY);
      return;
    }

    const controller = new AbortController();
    let loading = false;

    const loadSummary = async () => {
      if (
        loading ||
        controller.signal.aborted
      ) {
        return;
      }

      loading = true;

      try {
        const url = new URL(SUMMARY_API_URL);
        url.searchParams.set(
          "fleet_group",
          "all"
        );

        const response = await fetch(
          url.toString(),
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
            headers: {
              Accept: "application/json",
            },
          }
        );

        const responseText =
          await response.text();

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status} ${response.statusText}\n` +
              `URL: ${url.toString()}\n` +
              `Response: ${responseText.slice(0, 1000)}`
          );
        }

        let result: unknown;

        try {
          result = JSON.parse(responseText);
        } catch {
          throw new Error(
            "API ไม่ได้ส่งข้อมูล JSON:\n" +
              responseText.slice(0, 1000)
          );
        }

        if (
          !isRecord(result) ||
          result.status !== "success" ||
          !isRecord(result.summary) ||
          !isRecord(result.summary.tcas)
        ) {
          throw new Error(
            "รูปแบบข้อมูล Summary ไม่ถูกต้อง"
          );
        }

        const data = result.summary;
        const tcas = result.summary.tcas;

        if (!controller.signal.aborted) {
          setSummary({
            gm: toCount(data.gm),
            fbp: toCount(data.fbp),
            tcas: {
              new_replacement: toCount(
                tcas.new_replacement
              ),
              supplement: toCount(
                tcas.supplement
              ),
            },
            user: toCount(data.user),
          });
        }
      } catch (error) {
        if (controller.signal.aborted) return;

        console.error(
          "โหลดจำนวนแจ้งเตือนไม่สำเร็จ:",
          error instanceof Error
            ? error.message
            : String(error)
        );
      } finally {
        loading = false;
      }
    };

    // ล้างเมื่อบัญชีเปลี่ยน
    setSummary(EMPTY_SUMMARY);

    const refreshSummary = () => {
      void loadSummary();
    };

    refreshSummary();

    const interval = window.setInterval(
      refreshSummary,
      60_000
    );

    window.addEventListener(
      "focus",
      refreshSummary
    );

    window.addEventListener(
      "sidebarSummaryChanged",
      refreshSummary
    );

    return () => {
      controller.abort();
      window.clearInterval(interval);

      window.removeEventListener(
        "focus",
        refreshSummary
      );

      window.removeEventListener(
        "sidebarSummaryChanged",
        refreshSummary
      );
    };
  }, [pathname, currentSearch, userInfo]);

  useEffect(() => {
    if (
      matchesPath(
        pathname,
        PATHS.main.trackFleet
      )
    ) {
      setOpenGroups((previous) => ({
        ...previous,
        [PATHS.main.trackFleet]: true,
      }));
    }
  }, [pathname, currentSearch]);

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

    if (hasFullAccess || isGM) {
      items.push({
        label: "คำขอจากคลัง",
        path: PATHS.main.gm,
        icon: Inbox,
        badge: summary.gm,
      });
    }

    if (hasFullAccess || isFBP) {
      items.push({
        label: "รอประเมินกองรถ",
        path: PATHS.main.waitingFleet,
        icon: Clock3,
        badge: summary.fbp,
      });
    }

    if (
      hasFullAccess ||
      isFBP ||
      isTCAS ||
      isKA
    ) {
      const newReplacementPath =
        `${PATHS.main.trackFleet}?fleet_group=new-replacement`;

      const supplementPath =
        `${PATHS.main.trackFleet}?fleet_group=supplement`;

      const children: SubMenuItem[] = [
        {
          label: "รถออกใหม่/ทดแทน",
          path: newReplacementPath,
          badge:
            summary.tcas.new_replacement,
        },
      ];

      if (hasFullAccess || isFBP) {
        children.push({
          label: "รถเสริม",
          path: supplementPath,
          badge: summary.tcas.supplement,
        });
      }

      items.push({
        label: "ติดตามกองรถ",
        path: newReplacementPath,
        icon: Route,
        children,
      });
    }

    if (
      hasFullAccess ||
      isFBP ||
      isTCAS
    ) {
      items.push({
        label: "จัดการกระบวนการทำงาน",
        path: PATHS.main.manageProcess,
        icon: Settings,
      });
    }

    if (hasFullAccess) {
      items.push({
        label: "จัดการการใช้งาน",
        path: PATHS.main.manageUser,
        icon: Shield,
        badge: summary.user,
      });
    }

    return items;
  }, [
    hasFullAccess,
    isGM,
    isFBP,
    isTCAS,
    isKA,
    isSuperadmin,
    summary,
  ]);

  const handleChangeWarehouse = () => {
    router.push(PATHS.auth.selectDC);
  };

  const handleLogout = () => {
    STORAGE_KEYS.forEach((key) => {
      localStorage.removeItem(key);
    });

    setSidebarData(EMPTY_DATA);
    setSummary(EMPTY_SUMMARY);

    window.dispatchEvent(
      new Event("userChanged")
    );

    window.dispatchEvent(
      new Event("selectedDCChanged")
    );

    window.dispatchEvent(
      new Event("selectedDepartmentsChanged")
    );

    router.push("/");
  };

  const handleGroupClick = (
    groupKey: string
  ) => {
    if (collapsed) {
      setOpenGroups((previous) => ({
        ...previous,
        [groupKey]: true,
      }));

      onToggle();
      return;
    }

    setOpenGroups((previous) => ({
      ...previous,
      [groupKey]: !previous[groupKey],
    }));
  };

  return (
    <div
      className="fleet-sidebar"
      data-collapsed={
        collapsed ? "true" : "false"
      }
      style={{
        width: collapsed ? 72 : 240,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-controls="fleet-sidebar-content"
        aria-expanded={!collapsed}
        aria-label={
          collapsed
            ? "ขยายเมนู"
            : "ย่อเมนู"
        }
        title={
          collapsed
            ? "ขยายเมนู"
            : "ย่อเมนู"
        }
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
                  onClick={
                    handleChangeWarehouse
                  }
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

            const groupKey =
              item.path.split("?")[0];

            const isGroupOpen =
              !collapsed &&
              Boolean(
                openGroups[groupKey]
              );

            const submenuId =
              `sidebar-submenu-${index}`;

            const itemLabel =
              (item.badge ?? 0) > 0
                ? `${item.label} ${item.badge} รายการ`
                : item.label;

            const content = (
              <span className="menu-content">
                <span className="menu-icon">
                  <Icon size={17} />

                  {collapsed &&
                    (item.badge ?? 0) > 0 && (
                      <span
                        className="collapsed-notification-dot"
                        aria-hidden="true"
                      />
                    )}
                </span>

                <span
                  className="menu-label fade-content"
                  aria-hidden={collapsed}
                >
                  {item.label}
                </span>

                {!collapsed &&
                  (item.badge ?? 0) > 0 && (
                    <span
                      className="notification-badge"
                      aria-hidden="true"
                    >
                      {item.badge}
                    </span>
                  )}

                {item.children && (
                  <span
                    className={`group-arrow fade-content ${
                      isGroupOpen
                        ? "is-open"
                        : ""
                    }`}
                    aria-hidden="true"
                  >
                    <ChevronDown
                      size={14}
                    />
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
                      handleGroupClick(
                        groupKey
                      )
                    }
                    aria-label={itemLabel}
                    aria-expanded={
                      isGroupOpen
                    }
                    aria-controls={
                      submenuId
                    }
                    title={itemLabel}
                    className={`menu-item ${
                      isActive
                        ? "is-active"
                        : ""
                    }`}
                  >
                    {content}
                  </button>
                ) : (
                  <Link
                    href={item.path}
                    aria-label={itemLabel}
                    aria-current={
                      isActive
                        ? "page"
                        : undefined
                    }
                    title={itemLabel}
                    className={`menu-item ${
                      isActive
                        ? "is-active"
                        : ""
                    }`}
                  >
                    {content}
                  </Link>
                )}

                {item.children && (
                  <div
                    id={submenuId}
                    aria-hidden={
                      !isGroupOpen
                    }
                    className={`submenu-motion ${
                      isGroupOpen
                        ? "is-open"
                        : ""
                    }`}
                  >
                    <div className="submenu-clip">
                      <div className="submenu-list">
                        {item.children.map(
                          (child) => {
                            if (
                              child.disabled ||
                              !child.path
                            ) {
                              return (
                                <div
                                  key={
                                    child.label
                                  }
                                  className="disabled-item-wrap"
                                >
                                  <button
                                    type="button"
                                    tabIndex={
                                      isGroupOpen
                                        ? 0
                                        : -1
                                    }
                                    aria-disabled="true"
                                    title={
                                      child.tooltip ||
                                      "กำลังพัฒนา"
                                    }
                                    className="submenu-item is-disabled"
                                  >
                                    <span className="submenu-dot" />

                                    <span className="submenu-label">
                                      {
                                        child.label
                                      }
                                    </span>
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
                              matchesMenuPath(
                                pathname,
                                currentSearch,
                                child.path
                              );

                            const childLabel =
                              (child.badge ??
                                0) > 0
                                ? `${child.label} ${child.badge} รายการ`
                                : child.label;

                            return (
                              <Link
                                key={
                                  child.label
                                }
                                href={
                                  child.path
                                }
                                tabIndex={
                                  isGroupOpen
                                    ? 0
                                    : -1
                                }
                                aria-label={
                                  childLabel
                                }
                                title={
                                  childLabel
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

                                <span className="submenu-label">
                                  {
                                    child.label
                                  }
                                </span>

                                {(child.badge ??
                                  0) > 0 && (
                                  <span
                                    className="notification-badge"
                                    aria-hidden="true"
                                  >
                                    {
                                      child.badge
                                    }
                                  </span>
                                )}
                              </Link>
                            );
                          }
                        )}
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
              collapsed
                ? "ออกจากระบบ"
                : undefined
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
          gap: 8px;
          width: 216px;
          height: 44px;
          padding: 0 8px;
          box-sizing: border-box;
        }

        .menu-icon {
          position: relative;
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
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
          font-weight: 600;
        }

        .notification-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          min-width: 23px;
          height: 20px;
          padding: 0 6px;
          box-sizing: border-box;
          border-radius: 999px;
          background: #ef4444;
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          line-height: 1;
          font-variant-numeric: tabular-nums;
          box-shadow: 0 2px 6px
            rgba(239, 68, 68, 0.25);
        }

        .collapsed-notification-dot {
          position: absolute;
          top: 1px;
          right: 1px;
          width: 7px;
          height: 7px;
          border: 1.5px solid #172554;
          border-radius: 50%;
          background: #ef4444;
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
          width: calc(100% - 28px);
          margin: 8px 0 4px 28px;
          padding-left: 8px;
          box-sizing: border-box;
          border-left: 1px solid
            rgba(191, 219, 254, 0.16);
        }

        .fleet-sidebar :global(.submenu-item) {
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
          min-height: 38px;
          margin-top: 3px;
          padding: 8px;
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

        .submenu-label {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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

export default function Sidebar(props: SidebarProps) {
  return (
    <Suspense fallback={null}>
      <SidebarContent {...props} />
    </Suspense>
  );
}

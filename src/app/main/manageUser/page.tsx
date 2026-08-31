"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCcw,
  Users,
  Building2,
  Warehouse,
  XCircle,
  RotateCcw,
  KeyRound,
  ShieldCheck,
  UserRoundCog,
  UserCheck,
  Clock3,
  Ban,
  SlidersHorizontal,
  ChevronDown,
} from "lucide-react";

import AlertPopup from "../../components/alertPopup/AlertPopup";
import ConfirmModal from "../manageUser/components/ConfirmModal";

type AlertType = "success" | "error" | "warning" | "info";

type UserRole = "superadmin" | "admin" | "user";
type UserStatus = "active" | "blocked" | "pending";

interface AlertState {
  type: AlertType;
  message: string;
}

interface UserItem {
  id: number | string;
  em_id?: string;
  name?: string;
  surname?: string;
  user_type?: UserRole | string;
  department?: string;
  warehouse?: string;
  status?: UserStatus | string;
  approved_at?: string | null;
  approved_by?: string | null;
  created_at?: string | null;
  created_by?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
}

type ConfirmAction =
  | {
    type: "role";
    user: UserItem;
    newRole: UserRole;
  }
  | {
    type: "status";
    user: UserItem;
    newStatus: UserStatus;
  }
  | {
    type: "resetPassword";
    user: UserItem;
  };

export default function ManageUsersPage() {
  const API_BASE = "http://192.168.158.210/api_new_truck/api";

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const [alertState, setAlertState] = useState<AlertState | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null
  );

  const [search, setSearch] = useState("");
  const [userType, setUserType] = useState("");
  const [status, setStatus] = useState("");
  const [department, setDepartment] = useState("");
  const [warehouse, setWarehouse] = useState("");

  const showAlert = (type: AlertType, message: string) => {
    setAlertState({ type, message });
  };

  useEffect(() => {
    if (!alertState) return;

    const timer = setTimeout(() => {
      setAlertState(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [alertState]);

  const normalizeStatus = (value?: string) => {
    const statusValue = String(value || "").toLowerCase();

    if (statusValue === "active" || statusValue === "approved") {
      return "active";
    }

    if (statusValue === "pending") {
      return "pending";
    }

    if (
      statusValue === "blocked" ||
      statusValue === "block" ||
      statusValue === "ban" ||
      statusValue === "inactive" ||
      statusValue === "disabled"
    ) {
      return "blocked";
    }

    return statusValue || "pending";
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/get_user.php`, {
        method: "GET",
      });

      const text = await res.text();

      let data: {
        status?: string;
        message?: string;
        data?: UserItem[];
      };

      try {
        data = JSON.parse(text);
      } catch (error) {
        console.error("API RAW RESPONSE:", text);
        console.error("JSON Parse Error:", error);

        showAlert("error", "API ไม่ได้ส่ง JSON กลับมา กรุณาเช็ก get_user.php");
        return;
      }

      if (!res.ok || data.status !== "success") {
        showAlert("error", data.message || "ดึงข้อมูลผู้ใช้งานไม่สำเร็จ");
        return;
      }

      setUsers(data.data || []);
    } catch (error) {
      console.error(error);
      showAlert("error", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const departments = useMemo(() => {
    const list = users
      .map((user) => user.department)
      .filter((item): item is string => Boolean(item));

    return Array.from(new Set(list));
  }, [users]);

  const warehouses = useMemo(() => {
    const list = users
      .map((user) => user.warehouse)
      .filter((item): item is string => Boolean(item));

    return Array.from(new Set(list));
  }, [users]);

  const statusSummary = useMemo(() => {
    const active = users.filter(
      (user) => normalizeStatus(user.status) === "active"
    ).length;

    const pending = users.filter(
      (user) => normalizeStatus(user.status) === "pending"
    ).length;

    const blocked = users.filter(
      (user) => normalizeStatus(user.status) === "blocked"
    ).length;

    return {
      active,
      pending,
      blocked,
      total: users.length,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const searchValue = search.trim().toLowerCase();

      const emId = String(user.em_id || "").toLowerCase();
      const name = String(user.name || "").toLowerCase();
      const surname = String(user.surname || "").toLowerCase();
      const fullName = `${name} ${surname}`.trim();
      const role = String(user.user_type || "").toLowerCase();
      const dept = String(user.department || "").toLowerCase();
      const wh = String(user.warehouse || "").toLowerCase();

      const matchSearch =
        !searchValue ||
        emId.includes(searchValue) ||
        name.includes(searchValue) ||
        surname.includes(searchValue) ||
        fullName.includes(searchValue) ||
        role.includes(searchValue) ||
        dept.includes(searchValue) ||
        wh.includes(searchValue);

      const matchRole = userType ? user.user_type === userType : true;

      const matchStatus = status
        ? normalizeStatus(user.status) === status
        : true;

      const matchDepartment = department
        ? user.department === department
        : true;

      const matchWarehouse = warehouse ? user.warehouse === warehouse : true;

      return (
        matchSearch &&
        matchRole &&
        matchStatus &&
        matchDepartment &&
        matchWarehouse
      );
    });
  }, [users, search, userType, status, department, warehouse]);

  const groupedRows = useMemo(() => {
    const warehouseGroups = new Map<string, Map<string, UserItem[]>>();

    filteredUsers.forEach((user) => {
      const warehouseName = String(user.warehouse || "ไม่ระบุ Warehouse").trim();
      const departmentName = String(user.department || "ไม่ระบุหน่วยงาน").trim();

      if (!warehouseGroups.has(warehouseName)) {
        warehouseGroups.set(warehouseName, new Map());
      }

      const departmentGroups = warehouseGroups.get(warehouseName)!;

      if (!departmentGroups.has(departmentName)) {
        departmentGroups.set(departmentName, []);
      }

      departmentGroups.get(departmentName)!.push(user);
    });

    return Array.from(warehouseGroups.entries())
      .sort(([warehouseA], [warehouseB]) =>
        warehouseA.localeCompare(warehouseB, "th")
      )
      .flatMap(([warehouseName, departmentGroups]) => {
        const warehouseUserCount = Array.from(departmentGroups.values()).reduce(
          (total, departmentUsers) => total + departmentUsers.length,
          0
        );

        return [
          {
            type: "warehouse" as const,
            key: `warehouse-${warehouseName}`,
            name: warehouseName,
            count: warehouseUserCount,
          },
          ...Array.from(departmentGroups.entries())
            .sort(([departmentA], [departmentB]) =>
              departmentA.localeCompare(departmentB, "th")
            )
            .flatMap(([departmentName, departmentUsers]) => [
              {
                type: "department" as const,
                key: `department-${warehouseName}-${departmentName}`,
                name: departmentName,
                count: departmentUsers.length,
              },
              ...departmentUsers.map((user) => ({
                type: "user" as const,
                key: `user-${user.id}`,
                user,
              })),
            ]),
        ];
      });
  }, [filteredUsers]);

  const handleSearch = () => {
    // ค้นหาฝั่งหน้าเว็บจาก users ที่โหลดมาแล้ว
  };

  const handleClearFilter = () => {
    setSearch("");
    setUserType("");
    setStatus("");
    setDepartment("");
    setWarehouse("");
  };

  const handleQuickStatusFilter = (newStatus: "" | UserStatus) => {
    setStatus(newStatus);
  };

  const handleUpdateUserRole = (targetUser: UserItem, newRole: UserRole) => {
    if (!targetUser?.id && !targetUser?.em_id) {
      showAlert("error", "ไม่พบข้อมูลผู้ใช้งานที่ต้องการเปลี่ยนบทบาท");
      return;
    }

    if (targetUser.user_type === newRole) {
      showAlert("info", "บทบาทนี้เป็นค่าเดิมอยู่แล้ว");
      return;
    }

    setConfirmAction({
      type: "role",
      user: targetUser,
      newRole,
    });
  };

  const handleUpdateUserStatus = (
    targetUser: UserItem,
    newStatus: UserStatus
  ) => {
    if (!targetUser?.id && !targetUser?.em_id) {
      showAlert("error", "ไม่พบข้อมูลผู้ใช้งานที่ต้องการเปลี่ยนสถานะ");
      return;
    }

    if (normalizeStatus(targetUser.status) === newStatus) {
      showAlert("info", "สถานะนี้เป็นค่าเดิมอยู่แล้ว");
      return;
    }

    setConfirmAction({
      type: "status",
      user: targetUser,
      newStatus,
    });
  };

  const confirmResetUserPassword = async (targetUser: UserItem) => {
    try {
      setUpdatingUserId(String(targetUser.id));
  
      const updatedBy = getCurrentUserUpdater();
  
      const res = await fetch(`${API_BASE}/reset_user_password.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: targetUser.id,
          em_id: targetUser.em_id,
          password: "0000", 
          updated_by: updatedBy,
        }),
      });
  
      const text = await res.text();
  
      let data: {
        status?: string;
        message?: string;
        data?: unknown;
      };
  
      try {
        data = JSON.parse(text);
      } catch (error) {
        console.error("API RAW RESPONSE:", text);
        console.error("JSON Parse Error:", error);
  
        showAlert(
          "error",
          "API ไม่ได้ส่ง JSON กลับมา กรุณาเช็ก reset_user_password.php"
        );
        return;
      }
  
      if (!res.ok || data.status !== "success") {
        showAlert("error", data.message || "รีเซ็ตรหัสผ่านไม่สำเร็จ");
        return;
      }
  
      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          String(user.id) === String(targetUser.id)
            ? {
                ...user,
                updated_by: updatedBy,
                updated_at: new Date().toISOString(),
              }
            : user
        )
      );
  
      showAlert("success", "รีเซ็ตรหัสผ่านเป็น 0000 สำเร็จ");
      setConfirmAction(null);
    } catch (error) {
      console.error(error);
      showAlert("error", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;

    if (confirmAction.type === "role") {
      await confirmUpdateUserRole(confirmAction.user, confirmAction.newRole);
      return;
    }

    if (confirmAction.type === "status") {
      await confirmUpdateUserStatus(
        confirmAction.user,
        confirmAction.newStatus
      );
      return;
    }

    if (confirmAction.type === "resetPassword") {
      await confirmResetUserPassword(confirmAction.user);
    }
  };

  const handleResetPassword = (targetUser: UserItem) => {
    if (!targetUser?.id && !targetUser?.em_id) {
      showAlert("error", "ไม่พบข้อมูลผู้ใช้งานที่ต้องการรีเซ็ตรหัสผ่าน");
      return;
    }

    setConfirmAction({
      type: "resetPassword",
      user: targetUser,
    });
  };

  const getCurrentUserUpdater = () => {
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

    return (
      currentUser?.em_id ||
      currentUser?.EM_ID ||
      currentUser?.employee_id ||
      currentUser?.EMPLOYEE_ID ||
      currentUser?.id ||
      currentUser?.ID ||
      ""
    );
  };

  const confirmUpdateUserRole = async (
    targetUser: UserItem,
    newRole: UserRole
  ) => {
    try {
      setUpdatingUserId(String(targetUser.id));

      const updatedBy = getCurrentUserUpdater();

      const res = await fetch(`${API_BASE}/update_user_role.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: targetUser.id,
          em_id: targetUser.em_id,
          user_type: newRole,
          updated_by: updatedBy,
        }),
      });

      const text = await res.text();

      let data: {
        status?: string;
        message?: string;
        data?: unknown;
      };

      try {
        data = JSON.parse(text);
      } catch (error) {
        console.error("API RAW RESPONSE:", text);
        console.error("JSON Parse Error:", error);

        showAlert(
          "error",
          "API ไม่ได้ส่ง JSON กลับมา กรุณาเช็ก update_user_role.php"
        );
        return;
      }

      if (!res.ok || data.status !== "success") {
        showAlert("error", data.message || "เปลี่ยนบทบาทไม่สำเร็จ");
        return;
      }

      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          String(user.id) === String(targetUser.id)
            ? {
              ...user,
              user_type: newRole,
              updated_by: updatedBy,
              updated_at: new Date().toISOString(),
            }
            : user
        )
      );

      showAlert("success", "เปลี่ยนบทบาทผู้ใช้งานสำเร็จ");
      setConfirmAction(null);
    } catch (error) {
      console.error(error);
      showAlert("error", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const confirmUpdateUserStatus = async (
    targetUser: UserItem,
    newStatus: UserStatus
  ) => {
    try {
      setUpdatingUserId(String(targetUser.id));

      const updatedBy = getCurrentUserUpdater();

      const res = await fetch(`${API_BASE}/update_user_status.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: targetUser.id,
          em_id: targetUser.em_id,
          status: newStatus,
          updated_by: updatedBy,
        }),
      });

      const text = await res.text();

      let data: {
        status?: string;
        message?: string;
        data?: unknown;
      };

      try {
        data = JSON.parse(text);
      } catch (error) {
        console.error("API RAW RESPONSE:", text);
        console.error("JSON Parse Error:", error);

        showAlert(
          "error",
          "API ไม่ได้ส่ง JSON กลับมา กรุณาเช็ก update_user_status.php"
        );
        return;
      }

      if (!res.ok || data.status !== "success") {
        showAlert("error", data.message || "เปลี่ยนสถานะไม่สำเร็จ");
        return;
      }

      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          String(user.id) === String(targetUser.id)
            ? {
              ...user,
              status: newStatus,
              updated_by: updatedBy,
              updated_at: new Date().toISOString(),
            }
            : user
        )
      );

      showAlert("success", "เปลี่ยนสถานะผู้ใช้งานสำเร็จ");
      setConfirmAction(null);
    } catch (error) {
      console.error(error);
      showAlert("error", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setUpdatingUserId(null);
    }
  };



  const getRoleBadgeClass = (role?: string) => {
    switch (role) {
      case "superadmin":
        return "border-purple-200 bg-purple-50 text-purple-700";
      case "admin":
        return "border-blue-200 bg-blue-50 text-blue-700";
      case "user":
        return "border-slate-200 bg-slate-50 text-slate-700";
      default:
        return "border-gray-200 bg-gray-50 text-gray-600";
    }
  };

  const getStatusBadgeClass = (userStatus?: string) => {
    switch (normalizeStatus(userStatus)) {
      case "active":
        return "border-green-200 bg-green-50 text-green-700";
      case "pending":
        return "border-yellow-200 bg-yellow-50 text-yellow-700";
      case "blocked":
        return "border-red-200 bg-red-50 text-red-700";
      default:
        return "border-slate-200 bg-slate-50 text-slate-600";
    }
  };

  const getRowStatusClass = (userStatus?: string) => {
    switch (normalizeStatus(userStatus)) {
      case "active":
        return "border-green-100 bg-green-50/30 hover:bg-green-50";
      case "pending":
        return "border-yellow-100 bg-yellow-50/40 hover:bg-yellow-50";
      case "blocked":
        return "border-red-100 bg-red-50/40 hover:bg-red-50";
      default:
        return "border-slate-100 hover:bg-slate-50";
    }
  };

  const displayStatusText = (userStatus?: string) => {
    switch (normalizeStatus(userStatus)) {
      case "active":
        return "ใช้งานได้";
      case "pending":
        return "รออนุมัติ";
      case "blocked":
        return "ถูกบล็อก";
      default:
        return userStatus || "-";
    }
  };

  const displayRoleText = (role?: string) => {
    switch (role) {
      case "superadmin":
        return "Super Admin";
      case "admin":
        return "Admin";
      case "user":
        return "User";
      default:
        return role || "-";
    }
  };

  const getUserInitials = (user: UserItem) => {
    const firstName = String(user.name || "").trim();
    const surname = String(user.surname || "").trim();

    const initials = `${firstName.charAt(0)}${surname.charAt(0)}`
      .trim()
      .toUpperCase();

    return initials || String(user.em_id || "U").charAt(0).toUpperCase();
  };

  const getAvatarClass = (role?: string) => {
    switch (role) {
      case "superadmin":
        return "bg-violet-100 text-violet-700 ring-violet-200";
      case "admin":
        return "bg-blue-100 text-blue-700 ring-blue-200";
      default:
        return "bg-slate-100 text-slate-600 ring-slate-200";
    }
  };

  const getStatusDotClass = (userStatus?: string) => {
    switch (normalizeStatus(userStatus)) {
      case "active":
        return "bg-emerald-500";
      case "pending":
        return "bg-amber-500";
      case "blocked":
        return "bg-rose-500";
      default:
        return "bg-slate-400";
    }
  };

  const hasActiveFilters = Boolean(
    search || userType || status || department || warehouse
  );

  const getConfirmTitle = () => {
    if (!confirmAction) return "";

    if (confirmAction.type === "role") {
      return "ยืนยันการเปลี่ยนบทบาท";
    }

    if (confirmAction.type === "status") {
      return "ยืนยันการเปลี่ยนสถานะ";
    }

    return "ยืนยันการรีเซ็ตรหัสผ่าน";
  };

  const getConfirmMessage = () => {
    if (!confirmAction) return "";

    const fullName = `${confirmAction.user.name || ""} ${confirmAction.user.surname || ""
      }`.trim();

    const userName = fullName || confirmAction.user.em_id || "ผู้ใช้งานนี้";

    if (confirmAction.type === "role") {
      return `ต้องการเปลี่ยนบทบาทของ ${userName}\nจาก ${displayRoleText(
        confirmAction.user.user_type
      )} เป็น ${displayRoleText(confirmAction.newRole)} ใช่ไหม?`;
    }

    if (confirmAction.type === "status") {
      return `ต้องการเปลี่ยนสถานะของ ${userName}\nจาก ${displayStatusText(
        confirmAction.user.status
      )} เป็น ${displayStatusText(confirmAction.newStatus)} ใช่ไหม?`;
    }

    return `ต้องการรีเซ็ตรหัสผ่านของ ${userName}\nเป็นรหัสผ่านเริ่มต้น 0000 ใช่ไหม?`;
  };

  const getConfirmVariant = (): "primary" | "danger" => {
    if (!confirmAction) return "primary";

    if (
      confirmAction.type === "status" &&
      confirmAction.newStatus === "blocked"
    ) {
      return "danger";
    }

    if (confirmAction.type === "resetPassword") {
      return "danger";
    }

    return "primary";
  };

  return (
    <main className="min-h-screen bg-slate-100/80 px-3 py-4 sm:px-5 lg:px-6">
      {alertState && (
        <AlertPopup type={alertState.type} message={alertState.message} />
      )}

      {confirmAction && (
        <ConfirmModal
          title={getConfirmTitle()}
          message={getConfirmMessage()}
          confirmText="ยืนยัน"
          cancelText="ยกเลิก"
          loading={updatingUserId === String(confirmAction.user.id)}
          variant={getConfirmVariant()}
          onCancel={() => setConfirmAction(null)}
          onConfirm={handleConfirmAction}
        />
      )}

      <div className="mx-auto w-full max-w-[1540px] space-y-3">
        {/* Dashboard header */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 px-4 py-4 text-white shadow-[0_18px_50px_-24px_rgba(15,23,42,0.75)] sm:px-5">
          <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-indigo-400/10 blur-3xl" />

          <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-inner backdrop-blur-sm">
                <Users size={21} />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-bold tracking-tight sm:text-xl">
                    จัดการผู้ใช้งาน
                  </h1>
                  <span className="rounded-full border border-blue-300/20 bg-blue-400/10 px-2 py-0.5 text-[10px] font-semibold text-blue-100">
                    User Administration
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  จัดการบทบาท สถานะบัญชี และสิทธิ์การเข้าใช้งานจากหน้าจอเดียว
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:w-[570px]">
              {[
                {
                  label: "ทั้งหมด",
                  value: statusSummary.total,
                  icon: Users,
                  active: status === "",
                  onClick: () => handleQuickStatusFilter(""),
                  tone: "text-blue-200",
                },
                {
                  label: "ใช้งานได้",
                  value: statusSummary.active,
                  icon: UserCheck,
                  active: status === "active",
                  onClick: () => handleQuickStatusFilter("active"),
                  tone: "text-emerald-300",
                },
                {
                  label: "รออนุมัติ",
                  value: statusSummary.pending,
                  icon: Clock3,
                  active: status === "pending",
                  onClick: () => handleQuickStatusFilter("pending"),
                  tone: "text-amber-300",
                },
                {
                  label: "ถูกบล็อก",
                  value: statusSummary.blocked,
                  icon: Ban,
                  active: status === "blocked",
                  onClick: () => handleQuickStatusFilter("blocked"),
                  tone: "text-rose-300",
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.onClick}
                    className={`group rounded-xl border px-3 py-2.5 text-left backdrop-blur-sm transition ${
                      item.active
                        ? "border-white/30 bg-white/15 shadow-lg"
                        : "border-white/10 bg-white/[0.06] hover:border-white/20 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-medium text-slate-300">
                        {item.label}
                      </span>
                      <Icon size={14} className={item.tone} />
                    </div>
                    <p className="mt-1 text-lg font-bold leading-none">
                      {item.value}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Filter toolbar */}
        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-3 px-0.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <SlidersHorizontal size={14} />
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-800">ค้นหาและตัวกรอง</h2>
                <p className="text-[10px] text-slate-400">
                  ผลลัพธ์จะเปลี่ยนทันทีเมื่อเลือกเงื่อนไข
                </p>
              </div>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilter}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50"
              >
                <RotateCcw size={12} />
                ล้างตัวกรอง
              </button>
            )}
          </div>

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(270px,1.7fr)_repeat(4,minmax(125px,0.72fr))_auto]">
            <div className="relative">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ค้นหารหัสพนักงาน ชื่อ นามสกุล หรือหน่วยงาน"
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100/70"
              />
            </div>

            {[
              {
                value: userType,
                setValue: setUserType,
                label: "ทุกบทบาท",
                options: [
                  ["superadmin", "Super Admin"],
                  ["admin", "Admin"],
                  ["user", "User"],
                ],
              },
              {
                value: status,
                setValue: setStatus,
                label: "ทุกสถานะ",
                options: [
                  ["active", "ใช้งานได้"],
                  ["pending", "รออนุมัติ"],
                  ["blocked", "ถูกบล็อก"],
                ],
              },
              {
                value: department,
                setValue: setDepartment,
                label: "ทุกแผนก",
                options: departments.map((item) => [item, item]),
              },
              {
                value: warehouse,
                setValue: setWarehouse,
                label: "ทุก Warehouse",
                options: warehouses.map((item) => [item, item]),
              },
            ].map((filter) => (
              <div key={filter.label} className="relative">
                <select
                  value={filter.value}
                  onChange={(event) => filter.setValue(event.target.value)}
                  aria-label={filter.label}
                  className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 px-3 pr-8 text-xs font-medium text-slate-700 outline-none transition hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100/70"
                >
                  <option value="">{filter.label}</option>
                  {filter.options.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            ))}

            <button
              type="button"
              onClick={fetchUsers}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
              รีเฟรช
            </button>
          </div>
        </section>

        {/* Users table */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">รายชื่อผู้ใช้งาน</h2>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                  {filteredUsers.length} รายการ
                </span>
              </div>
              <p className="mt-0.5 text-[10px] text-slate-400">
                เลือกบทบาทหรือสถานะจากตารางเพื่อแก้ไขข้อมูล
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-1 font-semibold text-violet-700">
                <ShieldCheck size={11} />
                Super Admin {users.filter((user) => user.user_type === "superadmin").length}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 font-semibold text-blue-700">
                <UserRoundCog size={11} />
                Admin {users.filter((user) => user.user_type === "admin").length}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 font-semibold text-slate-600">
                <Users size={11} />
                User {users.filter((user) => user.user_type === "user").length}
              </span>
            </div>
          </div>

          <div className="max-h-[calc(100vh-315px)] min-h-[360px] overflow-auto">
            <table className="w-full min-w-[920px] border-separate border-spacing-0">
              <thead className="sticky top-0 z-10">
                <tr className="bg-slate-50/95 text-left text-[10px] uppercase tracking-[0.08em] text-slate-500 backdrop-blur">
                  <th className="border-b border-slate-200 px-4 py-3 font-bold">ผู้ใช้งาน</th>
                  <th className="w-[135px] border-b border-slate-200 px-3 py-3 font-bold">รหัสพนักงาน</th>
                  <th className="w-[155px] border-b border-slate-200 px-3 py-3 font-bold">บทบาท</th>
                  <th className="w-[225px] border-b border-slate-200 px-3 py-3 font-bold">หน่วยงาน</th>
                  <th className="w-[145px] border-b border-slate-200 px-3 py-3 font-bold">สถานะ</th>
                  <th className="w-[82px] border-b border-slate-200 px-3 py-3 text-center font-bold">จัดการ</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                          <RefreshCcw size={18} className="animate-spin" />
                        </div>
                        <span className="text-xs font-medium">กำลังโหลดข้อมูลผู้ใช้งาน...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100">
                          <XCircle size={21} />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-600">ไม่พบข้อมูลผู้ใช้งาน</p>
                          <p className="mt-1 text-[10px]">ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  groupedRows.map((row) => {
                    if (row.type === "warehouse") {
                      return (
                        <tr key={row.key}>
                          <td
                            colSpan={6}
                            className="border-b border-blue-200 bg-blue-950 px-4 py-3 text-white"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="flex items-center gap-2 text-xs font-extrabold tracking-wide">
                                <Warehouse size={15} />
                                Warehouse: {row.name}
                              </span>
                              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold">
                                {row.count} ผู้ใช้งาน
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    if (row.type === "department") {
                      return (
                        <tr key={row.key}>
                          <td
                            colSpan={6}
                            className="border-b border-blue-100 bg-blue-50 px-6 py-2"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="flex items-center gap-2 text-[11px] font-bold text-blue-800">
                                <Building2 size={13} />
                                Department: {row.name}
                              </span>
                              <span className="text-[10px] font-semibold text-blue-500">
                                {row.count} รายการ
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    const user = row.user;
                    const isUpdating = updatingUserId === String(user.id);
                    const currentStatus = normalizeStatus(user.status);

                    return (
                      <tr
                        key={row.key}
                        className="group bg-white text-xs transition hover:bg-blue-50/35"
                      >
                        <td className="border-b border-slate-100 px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-extrabold ring-1 ${getAvatarClass(user.user_type)}`}>
                                {getUserInitials(user)}
                              </div>
                              <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${getStatusDotClass(user.status)}`} />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-bold text-slate-800">
                                {user.name || "-"} {user.surname || ""}
                              </p>
                              <p className="mt-0.5 truncate text-[10px] text-slate-400">
                                อัปเดตโดย {user.updated_by || user.created_by || "-"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="border-b border-slate-100 px-3 py-2.5">
                          <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] font-semibold text-slate-700">
                            {user.em_id || "-"}
                          </span>
                        </td>

                        <td className="border-b border-slate-100 px-3 py-2.5">
                          <div className="relative">
                            <select
                              value={user.user_type || "user"}
                              disabled={isUpdating}
                              onChange={(event) =>
                                handleUpdateUserRole(user, event.target.value as UserRole)
                              }
                              className={`h-8 w-full appearance-none rounded-lg border px-2.5 pr-7 text-[10px] font-bold outline-none transition focus:ring-4 focus:ring-blue-100/70 disabled:cursor-not-allowed disabled:opacity-60 ${getRoleBadgeClass(user.user_type)}`}
                            >
                              <option value="superadmin">Super Admin</option>
                              <option value="admin">Admin</option>
                              <option value="user">User</option>
                            </select>
                            <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 opacity-60" />
                          </div>
                        </td>

                        <td className="border-b border-slate-100 px-3 py-2.5 text-slate-600">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                              <Warehouse size={13} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[11px] font-semibold text-slate-700">
                                {user.warehouse || "-"}
                              </p>
                              <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-slate-400">
                                <Building2 size={10} />
                                {user.department || "-"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="border-b border-slate-100 px-3 py-2.5">
                          <div className="relative">
                            <select
                              value={currentStatus}
                              disabled={isUpdating}
                              onChange={(event) =>
                                handleUpdateUserStatus(user, event.target.value as UserStatus)
                              }
                              className={`h-8 w-full appearance-none rounded-lg border px-2.5 pr-7 text-[10px] font-bold outline-none transition focus:ring-4 focus:ring-blue-100/70 disabled:cursor-not-allowed disabled:opacity-60 ${getStatusBadgeClass(user.status)}`}
                            >
                              <option value="active">ใช้งานได้</option>
                              <option value="pending">รออนุมัติ</option>
                              <option value="blocked">ถูกบล็อก</option>
                            </select>
                            <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 opacity-60" />
                          </div>
                        </td>

                        <td className="border-b border-slate-100 px-3 py-2.5 text-center">
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleResetPassword(user)}
                            title="รีเซ็ตรหัสผ่านเป็น 0000"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-amber-100 hover:shadow disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <KeyRound size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <footer className="flex flex-col gap-1 border-t border-slate-200 bg-slate-50/80 px-4 py-2 text-[10px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>
              แสดง {filteredUsers.length} จากทั้งหมด {users.length} บัญชี
            </span>
            <span>การเปลี่ยนแปลงจะมีหน้าต่างยืนยันก่อนบันทึกทุกครั้ง</span>
          </footer>
        </section>
      </div>
    </main>
  );
}

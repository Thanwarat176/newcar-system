"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCcw,
  Users,
  Shield,
  Building2,
  Warehouse,
  XCircle,
  Filter,
  RotateCcw,
  CheckCircle,
  Clock3,
  Ban,
  KeyRound,
} from "lucide-react";

import AlertPopup from "../../components/alertPopup/page";
import ConfirmModal from "../manageUser/components/ConfirmModal/page";

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
          password: "$2y$10$A8hWu0kWO4/fQx20SKy2Yeq6nTwF8GfAsj0k3kawO9OYP0mxh/.Vi", 
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
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
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

      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white">
                <Users size={24} />
              </div>

              <div>
                <h1 className="text-xl font-bold text-slate-800">
                  จัดการผู้ใช้งาน
                </h1>
                <p className="text-sm text-slate-500">
                  ค้นหา กรองข้อมูล เปลี่ยนบทบาท และดูสถานะบัญชีได้ง่ายขึ้น
                </p>
              </div>
            </div>

            <button
              onClick={fetchUsers}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
              {loading ? "กำลังโหลด..." : "รีเฟรช"}
            </button>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800">
                ภาพรวมสถานะผู้ใช้งาน
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                แสดง {filteredUsers.length} รายการ จากทั้งหมด {users.length} รายการ
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleQuickStatusFilter("")}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${status === ""
                  ? "border-blue-300 bg-blue-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
              >
                ทั้งหมด {statusSummary.total}
              </button>

              <button
                onClick={() => handleQuickStatusFilter("active")}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${status === "active"
                  ? "border-green-300 bg-green-600 text-white shadow-sm"
                  : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                  }`}
              >
                Active {statusSummary.active}
              </button>

              <button
                onClick={() => handleQuickStatusFilter("pending")}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${status === "pending"
                  ? "border-yellow-300 bg-yellow-500 text-white shadow-sm"
                  : "border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                  }`}
              >
                Pending {statusSummary.pending}
              </button>

              <button
                onClick={() => handleQuickStatusFilter("blocked")}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${status === "blocked"
                  ? "border-red-300 bg-red-600 text-white shadow-sm"
                  : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                  }`}
              >
                Blocked {statusSummary.blocked}
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-4">

            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">ผลลัพธ์ที่แสดง</p>
              <p className="mt-1 text-xl font-bold text-slate-800">
                {filteredUsers.length}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">Superadmin</p>
              <p className="mt-1 text-xl font-bold text-slate-800">
                {users.filter((user) => user.user_type === "superadmin").length}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">Admin</p>
              <p className="mt-1 text-xl font-bold text-slate-800">
                {users.filter((user) => user.user_type === "admin").length}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500">User</p>
              <p className="mt-1 text-xl font-bold text-slate-800">
                {users.filter((user) => user.user_type === "user").length}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Search size={18} className="text-slate-500" />
            <h2 className="font-semibold text-slate-800">
              ค้นหาและกรองข้อมูล
            </h2>
          </div>

          <div className="grid gap-3 md:grid-cols-6">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-600">
                ค้นหา
              </label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                placeholder="รหัสพนักงาน / ชื่อ / นามสกุล"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                บทบาท
              </label>
              <select
                value={userType}
                onChange={(e) => setUserType(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">ทั้งหมด</option>
                <option value="superadmin">superadmin</option>
                <option value="admin">admin</option>
                <option value="user">user</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                สถานะ
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">ทั้งหมด</option>
                <option value="active">ใช้งานได้</option>
                <option value="pending">รออนุมัติ</option>
                <option value="blocked">ถูกบล็อก</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                แผนก
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">ทั้งหมด</option>
                {departments.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">
                Warehouse
              </label>
              <select
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">ทั้งหมด</option>
                {warehouses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-slate-500">
              แสดง {filteredUsers.length} รายการ จากข้อมูลทั้งหมด{" "}
              {users.length} รายการ
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleClearFilter}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <RotateCcw size={15} />
                ล้างตัวกรอง
              </button>

              <button
                onClick={handleSearch}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Search size={15} />
                ค้นหา
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-800">รายชื่อผู้ใช้งาน</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse">
              <thead>
                <tr className="bg-slate-100 text-left text-sm text-slate-600">
                  <th className="px-4 py-3 font-semibold">รหัสพนักงาน</th>
                  <th className="px-4 py-3 font-semibold">ชื่อ - นามสกุล</th>
                  <th className="px-4 py-3 font-semibold">บทบาท</th>
                  <th className="px-4 py-3 font-semibold">Warehouse / แผนก</th>
                  <th className="px-4 py-3 font-semibold">สถานะ</th>
                  <th className="px-4 py-3 font-semibold">จัดการ</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center">
                      <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
                        <RefreshCcw size={28} className="animate-spin" />
                        <span>กำลังโหลดข้อมูลผู้ใช้งาน...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center">
                      <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
                        <XCircle size={32} />
                        <span>ไม่พบข้อมูลผู้ใช้งาน</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const isUpdating = updatingUserId === String(user.id);

                    return (
                      <tr
                        key={user.id}
                        className={`border-t text-sm transition ${getRowStatusClass(
                          user.status
                        )}`}
                      >
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {user.em_id || "-"}
                        </td>

                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">
                            {user.name || "-"} {user.surname || ""}
                          </p>
                        </td>

                        <td className="px-4 py-3">
                          <select
                            value={user.user_type || "user"}
                            disabled={isUpdating}
                            onChange={(e) =>
                              handleUpdateUserRole(
                                user,
                                e.target.value as UserRole
                              )
                            }
                            className={`rounded-xl border px-3 py-2 text-xs font-bold outline-none transition focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 ${getRoleBadgeClass(
                              user.user_type
                            )}`}
                          >
                            <option value="superadmin">superadmin</option>
                            <option value="admin">admin</option>
                            <option value="user">user</option>
                          </select>
                        </td>

                        <td className="px-4 py-3 text-slate-700">
                          <div className="flex items-center gap-2">
                            <Warehouse size={15} className="text-slate-400" />
                            {user.warehouse || "-"}
                          </div>

                          <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                            <Building2 size={14} className="text-slate-400" />
                            {user.department || "-"}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <select
                            value={normalizeStatus(user.status)}
                            disabled={isUpdating}
                            onChange={(e) =>
                              handleUpdateUserStatus(
                                user,
                                e.target.value as UserStatus
                              )
                            }
                            className={`rounded-xl border px-3 py-2 text-xs font-bold outline-none transition focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 ${getStatusBadgeClass(
                              user.status
                            )}`}
                          >
                            <option value="active">ใช้งานได้</option>
                            <option value="pending">รออนุมัติ</option>
                            <option value="blocked">ถูกบล็อก</option>
                          </select>
                        </td>

                        <td className="px-4 py-3">
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleResetPassword(user)}
                            title="รีเซ็ตรหัสผ่านเป็น 0000"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 text-orange-700 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <KeyRound size={17} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
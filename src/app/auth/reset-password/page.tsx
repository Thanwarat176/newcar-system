"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AlertPopup from "../../components/alertPopup/AlertPopup";
import { PATHS } from "../../lib/paths";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);

  const [alertState, setAlertState] = useState<{
    type: "success" | "error" | "warning" | "info";
    message: string;
  } | null>(null);

  // โหลด user
  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      router.push("/");
      return;
    }

    setUser(JSON.parse(savedUser));
  }, [router]);

  // auto hide alert
  useEffect(() => {
    if (!alertState) return;

    const timer = setTimeout(() => {
      setAlertState(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [alertState]);

  // submit
  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setAlertState({
        type: "warning",
        message: "กรุณากรอกรหัสผ่านให้ครบ",
      });
      return;
    }
  
    if (newPassword.length < 4) {
      setAlertState({
        type: "warning",
        message: "รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร",
      });
      return;
    }
  
    if (newPassword !== confirmPassword) {
      setAlertState({
        type: "error",
        message: "รหัสผ่านไม่ตรงกัน",
      });
      return;
    }
  
    const emId =
      user?.em_id ||
      user?.EM_ID ||
      user?.employee_id ||
      user?.EMPLOYEE_ID ||
      user?.id ||
      user?.ID;
  
    if (!emId) {
      setAlertState({
        type: "error",
        message: "ไม่พบรหัสพนักงาน กรุณาเข้าสู่ระบบใหม่",
      });
      return;
    }
  
    try {
      setLoading(true);
  
      const res = await fetch(
        "http://192.168.158.210/api_new_truck/api/change_password.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            em_id: emId,
            old_password: "0000",
            new_password: newPassword,
          }),
        }
      );
  
      const data = await res.json();
  
      if (!res.ok) {
        setAlertState({
          type: "error",
          message: data.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ",
        });
        return;
      }
  
      setAlertState({
        type: "success",
        message: "เปลี่ยนรหัสผ่านสำเร็จ",
      });
  
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...user,
          PASSWORD: newPassword,
          password: newPassword,
        })
      );
  
      setTimeout(() => {
        router.push(PATHS.auth.auth);
      }, 1200);
    } catch (error) {
      console.error(error);
  
      setAlertState({
        type: "error",
        message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-blue-200 px-4">
      
      {/* ALERT */}
      {alertState && (
        <AlertPopup
          type={alertState.type}
          message={alertState.message}
        />
      )}

      {/* CARD */}
      <div className="w-full max-w-[460px] rounded-[30px] border border-blue-100 bg-white p-8 shadow-[0_25px_70px_rgba(0,0,0,0.12)]">
        
        {/* HEADER */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
            
            <svg
              className="h-8 w-8 text-blue-700"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m6-6V9a6 6 0 10-12 0v2m-2 0h16v8H4v-8z"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-blue-700">
            เปลี่ยนรหัสผ่าน
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            กรุณาตั้งรหัสผ่านใหม่ก่อนเข้าใช้งานระบบ
          </p>
        </div>

        {/* FORM */}
        <div className="mt-8 space-y-4">
          
          {/* PASSWORD */}
          <PasswordBox
            label="รหัสผ่านใหม่"
            value={newPassword}
            show={showPassword}
            onToggle={() =>
              setShowPassword(!showPassword)
            }
            onChange={setNewPassword}
          />

          {/* CONFIRM */}
          <PasswordBox
            label="ยืนยันรหัสผ่านใหม่"
            value={confirmPassword}
            show={showConfirmPassword}
            onToggle={() =>
              setShowConfirmPassword(
                !showConfirmPassword
              )
            }
            onChange={setConfirmPassword}
          />

          {/* BUTTON */}
          <button
            onClick={handleResetPassword}
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(37,99,235,0.28)] transition hover:scale-[1.01] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading
              ? "กำลังบันทึก..."
              : "บันทึกรหัสผ่านใหม่"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- PASSWORD BOX ---------------- */

function PasswordBox({
  label,
  value,
  show,
  onToggle,
  onChange,
}: {
  label: string;
  value: string;
  show: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>

      <div className="flex items-center rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 transition focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100">
        
        <input
          type={show ? "text" : "password"}
          value={value}
          placeholder="••••••••"
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
        />

        <button
          type="button"
          onClick={onToggle}
          className="text-sm font-medium text-blue-700 hover:text-blue-900 transition"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}
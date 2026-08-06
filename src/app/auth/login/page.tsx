"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { PATHS, IMAGE_PATHS } from "../../lib/paths";
import AlertPopup from "../../components/alertPopup/page";


type SelectOption = {
  value: string;
  label: string;
};

interface WarehouseItem {
  DC_CODE?: string;
  dc_code?: string;
  DC_NAME?: string;
  dc_name?: string;
  DC_TYPE?: string;
  dc_type?: string;
  [key: string]: any;
}

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);

  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [warehouses, setWarehouses] = useState<SelectOption[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);

  const [alertState, setAlertState] = useState<{
    type: "success" | "error" | "warning" | "info";
    message: string;
  } | null>(null);

  const router = useRouter();

  const [registerData, setRegisterData] = useState<{
    em_id: string;
    name: string;
    surname: string;
    password: string;
    confirmPassword: string;
    team: string;
    department: string | null;
    termsAccepted: boolean;
  }>({
    em_id: "",
    name: "",
    surname: "",
    password: "",
    confirmPassword: "",
    team: "",
    department: null,
    termsAccepted: false,
  });

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        setLoadingWarehouses(true);

        const res = await fetch(
          "http://192.168.158.210/api_new_truck/api/warehouses.php",
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          }
        );

        const data = await res.json();

        if (!res.ok || data.status !== "success" || !Array.isArray(data.data)) {
          throw new Error("ไม่สามารถโหลดข้อมูล Warehouse ได้");
        }

        const warehouseOptions: SelectOption[] = [
          {
            value: "CENTER",
            label: "CENTER - ส่วนกลาง",
          },
          {
            value: "GM",
            label: "GM คลัง",
          },
          ...data.data
            .filter((item: WarehouseItem) => item.DC_CODE)
            .map((item: WarehouseItem) => ({
              value: item.DC_CODE,
              label: item.DC_CODE,
            })),
        ];

        setWarehouses(warehouseOptions);
      } catch (error) {
        console.error("FETCH WAREHOUSES ERROR:", error);

        setAlertState({
          type: "error",
          message: "ไม่สามารถโหลดข้อมูล Warehouse ได้",
        });
      } finally {
        setLoadingWarehouses(false);
      }
    };

    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (!alertState) return;

    const timer = setTimeout(() => {
      setAlertState(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [alertState]);

  const handleLogin = async () => {
    if (!employeeId || !password) {
      setAlertState({
        type: "warning",
        message: "กรุณากรอกข้อมูลให้ครบ",
      });
      return;
    }

    try {
      const res = await fetch(
        "http://192.168.158.210/api_new_truck/api/login.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            employee_id: employeeId,
            password: password,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setAlertState({
          type: "error",
          message: data.message || "เข้าสู่ระบบไม่สำเร็จ",
        });
        return;
      }

      console.log("USER:", data.user);

      localStorage.setItem("user", JSON.stringify(data.user));

      if (password === "0000") {
        router.push(PATHS.auth.resetpassword);
        return;
      }

      setAlertState({
        type: "success",
        message: `ยินดีต้อนรับ ${data.user.NAME || data.user.name || ""}`,
      });

      setTimeout(() => {
        const userWarehouse =
          data.user.warehouse ||
          data.user.WAREHOUSE ||
          data.user.team ||
          data.user.TEAM ||
          "";

        if (userWarehouse.toUpperCase() === "WAREHOUSE") {
          router.push(PATHS.auth.selectDC);
          return;
        }

        router.push(PATHS.main.addFleet);
      }, 1000);

    } catch (error) {
      console.error(error);

      setAlertState({
        type: "error",
        message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้",
      });
    }
  };

  const handleRegister = async () => {
    if (
      !registerData.em_id ||
      !registerData.name ||
      !registerData.surname ||
      !registerData.password ||
      !registerData.confirmPassword ||
      !registerData.team ||
      (registerData.team === "CENTER" && !registerData.department)
    ) {
      setAlertState({
        type: "warning",
        message: "กรุณากรอกข้อมูลให้ครบ",
      });
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      setAlertState({
        type: "warning",
        message: "รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน",
      });
      return;
    }

    if (!registerData.termsAccepted) {
      setAlertState({
        type: "warning",
        message: "กรุณายอมรับข้อกำหนดและเงื่อนไข",
      });
      return;
    }

    try {
      const res = await fetch(
        "http://192.168.158.210/api_new_truck/api/register.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            em_id: registerData.em_id,
            name: registerData.name,
            surname: registerData.surname,
            password: registerData.password,
            user_type: "admin",
            warehouse: registerData.team,
            department:
              registerData.team === "CENTER" ? registerData.department : null,
            created_by: registerData.em_id,
            updated_at: null,
            updated_by: null,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setAlertState({
          type: "error",
          message: data.message || "สร้างบัญชีผู้ใช้งานไม่สำเร็จ",
        });
        return;
      }

      setAlertState({
        type: "success",
        message: "สร้างบัญชีผู้ใช้งานสำเร็จ",
      });

      setRegisterData({
        em_id: "",
        name: "",
        surname: "",
        password: "",
        confirmPassword: "",
        team: "",
        department: null,
        termsAccepted: false,
      });

      setIsRegister(false);
    } catch (error) {
      console.error(error);

      setAlertState({
        type: "error",
        message: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้",
      });
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#eef4ff] px-4 py-6">

      {/* Decorative Background */}
      <div className="fixed -top-32 -left-32 z-0 h-96 w-96 rounded-full bg-blue-300/30 blur-3xl" />
      <div className="fixed -bottom-40 -right-32 z-0 h-[420px] w-[420px] rounded-full bg-cyan-300/30 blur-3xl" />
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-white/80 via-blue-50/80 to-slate-100/90" />

      {alertState && (
        <div className="relative z-50">
          <AlertPopup type={alertState.type} message={alertState.message} />
        </div>
      )}

      <div className="relative z-10 flex min-h-[calc(100vh-48px)] items-center justify-center">
        <div className="grid w-full max-w-[1040px] overflow-hidden rounded-[28px] border border-white/80 bg-white/70 shadow-[0_24px_70px_rgba(15,23,42,0.14)] backdrop-blur-xl md:grid-cols-2">
          {/* LEFT PANEL */}
          <div className="relative min-h-[620px] overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-sky-700 p-6 text-white">
            <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-blue-300/20 blur-3xl" />

            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] text-blue-50 backdrop-blur-md">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]" />
                  New Vehicle Release Platform
                </div>

                <h1 className="text-3xl font-black leading-tight tracking-tight">
                  New Vehicle System
                </h1>

                <div className="mt-6 rounded-[24px] border border-white/20 bg-white/12 p-4 shadow-2xl backdrop-blur-md">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] text-blue-100">
                        Vehicle Management
                      </p>

                      <h2 className="mt-1 text-lg font-black">
                        ระบบจัดการออกรถใหม่
                      </h2>

                      <p className="mt-1 text-[11px] leading-5 text-blue-100">
                        ใช้สำหรับตรวจสอบข้อมูล เอกสาร และขั้นตอนการส่งมอบรถ
                        โดยไม่แสดงข้อมูลตัวอย่างที่อาจทำให้เข้าใจผิด
                      </p>
                    </div>

                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-xl shadow-lg">
                      🚘
                    </div>
                  </div>

                  <div className="relative mb-4 h-24 overflow-hidden rounded-2xl bg-gradient-to-r from-white/10 to-white/5">
                    <div className="absolute inset-x-6 bottom-4 h-1 rounded-full bg-white/20" />

                    <svg
                      viewBox="0 0 420 180"
                      className="absolute left-1/2 top-1/2 h-[128px] w-[310px] -translate-x-1/2 -translate-y-1/2"
                    >
                      <path
                        d="M95 105 L125 67 C134 56 148 50 163 50 H255 C271 50 286 59 296 72 L322 105 H348 C358 105 366 113 366 123 V139 C366 146 360 152 353 152 H333 C329 135 315 123 297 123 C279 123 265 135 261 152 H161 C157 135 143 123 125 123 C107 123 93 135 89 152 H67 C60 152 54 146 54 139 V126 C54 114 63 105 75 105 H95Z"
                        fill="white"
                        opacity="0.95"
                      />
                      <path
                        d="M136 70 H181 V102 H112 L136 70Z"
                        fill="#dbeafe"
                        opacity="0.95"
                      />
                      <path
                        d="M193 70 H253 C264 70 274 76 281 86 L292 102 H193 V70Z"
                        fill="#dbeafe"
                        opacity="0.95"
                      />
                      <circle cx="125" cy="152" r="23" fill="#0f172a" />
                      <circle cx="125" cy="152" r="10" fill="#93c5fd" />
                      <circle cx="297" cy="152" r="23" fill="#0f172a" />
                      <circle cx="297" cy="152" r="10" fill="#93c5fd" />
                      <rect
                        x="220"
                        y="113"
                        width="28"
                        height="6"
                        rx="3"
                        fill="#2563eb"
                      />
                    </svg>
                  </div>

                  <div className="grid grid-cols-1 gap-2 text-[11px]">
                    <InfoBox text="บันทึกข้อมูลการออกรถใหม่" />
                    <InfoBox text="ติดตามสถานะเอกสารและขั้นตอนการทำงาน" />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
                  <StepCard title="บันทึกข้อมูล" />
                  <StepCard title="ตรวจเอกสาร" />
                  <StepCard title="ส่งมอบรถ" />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between text-[11px] text-blue-100">
                <p>
                  Powered by{" "}
                  <span className="font-semibold">Improvement Team</span>
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL */}
          <div className="min-h-[620px] bg-white/95 p-6">
            <div className="h-full min-h-[572px] perspective-[1200px]">
              <motion.div
                animate={{ rotateY: isRegister ? 180 : 0 }}
                transition={{ duration: 0.6 }}
                className="relative h-full min-h-[572px] w-full"
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* LOGIN */}
                <div className="absolute inset-0 backface-hidden text-black">
                  <Card>
                    <div className="mb-5 text-center">
                      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-2xl shadow-[0_16px_40px_rgba(37,99,235,0.35)]">
                        🚘
                      </div>

                      <Title text="เข้าสู่ระบบ" />

                      <p className="mt-2 text-xs text-slate-500">
                        เข้าสู่ระบบเพื่อจัดการข้อมูลการออกรถใหม่
                      </p>
                    </div>

                    <Input
                      label="รหัสพนักงาน"
                      value={employeeId}
                      onChange={setEmployeeId}
                      placeholder="Employee ID"
                    />

                    <PasswordBox
                      label="รหัสผ่าน"
                      value={password}
                      show={showPassword}
                      onToggle={() => setShowPassword(!showPassword)}
                      onChange={setPassword}
                    />

                    <button
                      onClick={handleLogin}
                      className="mt-5 w-full rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 py-3 text-sm font-bold text-white shadow-[0_18px_40px_rgba(37,99,235,0.32)] transition hover:scale-[1.01] active:scale-[0.98]"
                    >
                      เข้าสู่ระบบ
                    </button>

                    <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-3">
                      <p className="text-xs font-semibold text-blue-800">
                        ระบบนี้ใช้สำหรับ
                      </p>

                      <p className="mt-1 text-[11px] leading-5 text-slate-600">
                        จัดการรายการจองรถใหม่ ตรวจสอบข้อมูลลูกค้า
                        ติดตามสถานะเอกสาร และสถานะการส่งมอบรถ
                      </p>
                    </div>

                    <SwitchText
                      text="ยังไม่มีบัญชี?"
                      action="สร้างบัญชีผู้ใช้งาน"
                      onClick={() => setIsRegister(true)}
                    />
                  </Card>
                </div>

                {/* REGISTER */}
                <div
                  className="absolute inset-0 overflow-y-auto rounded-[24px] border border-blue-100 bg-white p-5 shadow-xl backface-hidden"
                  style={{ transform: "rotateY(180deg)" }}
                >
                  <div className="mb-4 text-center">
                    <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-xl shadow-[0_14px_32px_rgba(37,99,235,0.25)]">
                      📝
                    </div>

                    <h2 className="text-lg font-black text-blue-800">
                      สร้างบัญชีผู้ใช้งาน
                    </h2>
                  </div>

                  <form
                    className="space-y-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleRegister();
                    }}
                  >
                    <InputBox
                      label="รหัสพนักงาน"
                      value={registerData.em_id}
                      onChange={(value) =>
                        setRegisterData({
                          ...registerData,
                          em_id: value,
                        })
                      }
                      placeholder="กรอกรหัสพนักงาน"
                    />

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <InputBox
                        label="ชื่อ"
                        value={registerData.name}
                        onChange={(value) =>
                          setRegisterData({
                            ...registerData,
                            name: value,
                          })
                        }
                        placeholder="กรอกชื่อ"
                      />

                      <InputBox
                        label="นามสกุล"
                        value={registerData.surname}
                        onChange={(value) =>
                          setRegisterData({
                            ...registerData,
                            surname: value,
                          })
                        }
                        placeholder="กรอกนามสกุล"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <PasswordBox
                        label="รหัสผ่าน"
                        value={registerData.password}
                        show={showPassword}
                        onToggle={() => setShowPassword(!showPassword)}
                        onChange={(value) =>
                          setRegisterData({
                            ...registerData,
                            password: value,
                          })
                        }
                      />

                      <PasswordBox
                        label="ยืนยันรหัสผ่าน"
                        value={registerData.confirmPassword}
                        show={showConfirmPassword}
                        onToggle={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        onChange={(value) =>
                          setRegisterData({
                            ...registerData,
                            confirmPassword: value,
                          })
                        }
                      />
                    </div>

                    <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-3 shadow-[0_10px_30px_rgba(37,99,235,0.08)]">
                      <div className="space-y-3">
                        <SearchableSelectBox
  label="Warehouse / Team"
  value={registerData.team}
  onChange={(value) =>
    setRegisterData({
      ...registerData,
      team: value,
      department:
        value === "CENTER"
          ? registerData.department || ""
          : null,
    })
  }
  options={warehouses}
  isLoading={loadingWarehouses}
  disabled={loadingWarehouses || warehouses.length === 0}
  placeholder={
    loadingWarehouses
      ? "กำลังโหลด Warehouse..."
      : "เลือกหรือพิมพ์ Warehouse"
  }
/>

                        {registerData.team === "CENTER" && (
                          <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <SelectBox
                              label="Department"
                              value={registerData.department || ""}
                              onChange={(value) =>
                                setRegisterData({
                                  ...registerData,
                                  department: value,
                                })
                              }
                              options={[
                                {
                                  value: "TCIA",
                                  label:
                                    "ฝ่ายพัฒนาศักยภาพการขนส่งและวิเคราะห์ข้อมูลเชิงลึก (TCIA)",
                                },
                                {
                                  value: "KEY_ACCOUNT",
                                  label:
                                    "ฝ่ายสื่อสารระบบกระจายสินค้าระบบงานขนส่ง (KEY ACCOUNT)",
                                },
                                {
                                  value: "IMP",
                                  label:
                                    "ฝ่ายพัฒนาและเพิ่มประสิทธิภาพระบบงานขนส่ง (IMP)",
                                },
                                {
                                  value: "TCAS",
                                  label:
                                    "ฝ่ายสัญญาและสนับสนุนงานบริการระบบงานขนส่ง (TCAS)",
                                },
                                {
                                  value: "FBP",
                                  label:
                                    "ฝ่ายดูแลและพัฒนาคู่ค้าระบบงานขนส่ง (FBP)",
                                },
                                {
                                  value: "TSC",
                                  label: "ฝ่ายบริการระบบงานขนส่ง (TSC)",
                                },
                              ]}
                              placeholder="เลือก Department"
                            />
                          </motion.div>
                        )}

                      </div>
                    </div>

                    <label className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50/70 p-3 text-[11px] text-slate-600">
                      <input
                        type="checkbox"
                        checked={registerData.termsAccepted}
                        onChange={(e) =>
                          setRegisterData({
                            ...registerData,
                            termsAccepted: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded border-gray-300 bg-white accent-blue-600"
                      />
                      ฉันยอมรับข้อกำหนดและเงื่อนไขการใช้งานระบบ
                    </label>

                    <button
                      type="submit"
                      className="w-full rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-500 py-3 text-sm font-bold text-white shadow-[0_18px_40px_rgba(37,99,235,0.30)] transition hover:scale-[1.01] active:scale-[0.98]"
                    >
                      สร้างบัญชีผู้ใช้งาน
                    </button>

                    <p className="text-center text-xs text-slate-600">
                      มีบัญชีผู้ใช้งานอยู่แล้ว?{" "}
                      <button
                        type="button"
                        onClick={() => setIsRegister(false)}
                        className="font-bold text-blue-700 hover:underline"
                      >
                        กลับไปเข้าสู่ระบบ
                      </button>
                    </p>
                  </form>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .backface-hidden {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }

        .perspective-\\[1200px\\] {
          perspective: 1200px;
        }
      `}</style>
    </div>
  );
}

/* ---------------- COMPONENTS ---------------- */

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full flex-col justify-center rounded-[24px] border border-blue-100 bg-white p-5 shadow-[0_20px_55px_rgba(15,23,42,0.08)]">
      {children}
    </div>
  );
}

function Title({ text }: { text: string }) {
  return (
    <h2 className="text-center text-xl font-black text-slate-900">{text}</h2>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="mb-3">
      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
      />
    </div>
  );
}

function InputBox({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
      />
    </div>
  );
}

function SelectBox({
  label,
  value,
  onChange,
  options,
  placeholder = "เลือกข้อมูล",
  disabled = false,
  isLoading = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  options: {
    value: string;
    label: string;
  }[];
}) {
  return (
    <div className="group">
      <label className="mb-1 block text-[11px] font-bold text-slate-700">
        {label}
      </label>

      <div className="relative">
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={`
            w-full appearance-none rounded-2xl border px-3 py-2.5 pr-9 text-xs outline-none transition
            ${value
              ? "border-blue-300 bg-white text-slate-800 shadow-[0_8px_20px_rgba(37,99,235,0.08)]"
              : "border-blue-100 bg-white/80 text-slate-500"
            }
            ${disabled
              ? "cursor-not-allowed opacity-60"
              : "cursor-pointer group-hover:border-blue-300"
            }
            focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100
          `}
        >
          <option value="">{placeholder}</option>

          {options.map((item) => (
            <option key={`${item.value}-${item.label}`} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <div className="pointer-events-none absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
          {isLoading ? (
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-300 border-t-blue-700" />
          ) : (
            <svg
              width="13"
              height="13"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5 7.5L10 12.5L15 7.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

function PasswordBox({
  label,
  value,
  show,
  onToggle,
  onChange,
  placeholder = "••••••••",
}: {
  label: string;
  value: string;
  show: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
        {label}
      </label>

      <div className="flex items-center rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-2.5 transition focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100">
        <input
          type={show ? "text" : "password"}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
        />

        <button
          type="button"
          onClick={onToggle}
          className="text-xs font-bold text-blue-700 transition hover:text-blue-900"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}

function SwitchText({
  text,
  action,
  onClick,
}: {
  text: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <p className="mt-4 text-center text-xs text-slate-600">
      {text}{" "}
      <button
        type="button"
        onClick={onClick}
        className="font-bold text-blue-700 hover:underline"
      >
        {action}
      </button>
    </p>
  );
}

function InfoBox({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/15 px-3 py-2.5 text-blue-50">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-300/20 text-[10px] text-emerald-100">
        ✓
      </span>
      <span>{text}</span>
    </div>
  );
}

function StepCard({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 p-2.5 text-center backdrop-blur-md">
      <p className="font-semibold text-white">{title}</p>
    </div>
  );
}

function SearchableSelectBox({
  label,
  value,
  onChange,
  options,
  placeholder = "เลือกหรือพิมพ์ข้อมูล",
  disabled = false,
  isLoading = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  options: {
    value: string;
    label: string;
  }[];
}) {
  const listId = `searchable-${label.replace(/\s+/g, "-")}`;

  return (
    <div className="group">
      <label className="mb-1 block text-[11px] font-bold text-slate-700">
        {label}
      </label>

      <div className="relative">
        <input
          list={listId}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`
            w-full rounded-2xl border px-3 py-2.5 pr-9 text-xs outline-none transition
            ${
              value
                ? "border-blue-300 bg-white text-slate-800 shadow-[0_8px_20px_rgba(37,99,235,0.08)]"
                : "border-blue-100 bg-white/80 text-slate-500"
            }
            ${
              disabled
                ? "cursor-not-allowed opacity-60"
                : "cursor-text group-hover:border-blue-300"
            }
            focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100
          `}
        />

        <datalist id={listId}>
          {options.map((item) => (
            <option key={`${item.value}-${item.label}`} value={item.value}>
              {item.label}
            </option>
          ))}
        </datalist>

        <div className="pointer-events-none absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
          {isLoading ? (
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-300 border-t-blue-700" />
          ) : (
            <svg
              width="13"
              height="13"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5 7.5L10 12.5L15 7.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
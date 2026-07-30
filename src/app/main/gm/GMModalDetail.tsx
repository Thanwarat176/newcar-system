"use client";

import { useEffect, useState } from "react";
import CheckDC, {
  type IssuePeriodItem,
  type RequestItem,
} from "../component/CheckDC";

interface GMModalDetailProps {
  open?: boolean;
  onClose?: () => void;
  data: RequestItem;
  allRequests?: RequestItem[];
  issuePeriods?: IssuePeriodItem[];
  onSuccess?: () => void | Promise<void>;
}

type GmDecision = "fbp_pending" | "reject_by_gm";

function normalizeStatus(value?: string): string {
  return String(value ?? "").trim().toLowerCase();
}

function formatNumber(value?: number | string | null): string {
  if (value === null || value === undefined || value === "") return "-";

  const numberValue = Number(value);
  return Number.isNaN(numberValue)
    ? String(value)
    : numberValue.toLocaleString("en-US");
}

function getStatusText(status?: string): string {
  const value = normalizeStatus(status);

  if (
    [
      "pending",
      "waiting approve",
      "waiting approval",
      "pending approve",
      "pending approval",
      "รออนุมัติ",
    ].includes(value)
  ) {
    return "รออนุมัติ";
  }

  if (
    [
      "wait fleet",
      "waiting fleet",
      "รอประเมินกองรถ",
      "รอกองรถประเมิน",
    ].includes(value)
  ) {
    return "รอประเมินกองรถ";
  }

  if (
    [
      "confirm request",
      "confirmed request",
      "confirm",
      "confirmed",
      "in fbp_pending",
      "processing",
      "fbp_pending",
      "กำลังดำเนินการ",
    ].includes(value)
  ) {
    return "กำลังดำเนินการ";
  }

  if (["approved", "approve", "success", "สำเร็จ", "อนุมัติ"].includes(value)) {
    return "อนุมัติ";
  }

  if (
    [
      "rejected",
      "reject",
      "reject_by_gm",
      "not approved",
      "ไม่อนุมัติ",
    ].includes(value)
  ) {
    return "ไม่อนุมัติ";
  }

  return status || "-";
}

function getStatusClass(status?: string): string {
  const text = getStatusText(status);

  if (text === "รออนุมัติ") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (text === "กำลังดำเนินการ" || text === "รอประเมินกองรถ") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (text === "อนุมัติ") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (text === "ไม่อนุมัติ") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function getCurrentUserText(): string {
  try {
    const rawUser =
      localStorage.getItem("userInfo") ||
      localStorage.getItem("user") ||
      localStorage.getItem("authUser");

    if (!rawUser) return "";

    const user = JSON.parse(rawUser) as Record<string, unknown>;
    const name = String(user.name || user.NAME || "").trim();
    const surname = String(user.surname || user.SURNAME || "").trim();
    const employeeId = String(
      user.em_id ||
      user.employee_id ||
      user.EMPLOYEE_ID ||
      user.id ||
      "",
    ).trim();

    const fullName = `${name} ${surname}`.trim();

    if (fullName && employeeId) return `${fullName} (${employeeId})`;
    return fullName || employeeId;
  } catch {
    return "";
  }
}

export default function GMModalDetail({
  open = true,
  onClose,
  data,
  allRequests = [],
  issuePeriods = [],
  onSuccess = () => { },
}: GMModalDetailProps) {
  const [remark, setRemark] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDecision, setConfirmDecision] =
    useState<GmDecision | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, saving]);

  if (!open) return null;

  const updateGmDecision = async (status: GmDecision) => {
    if (!data.id) {
      setMessage({
        type: "error",
        text: "ไม่พบ ID ของรายการนี้",
      });
      return;
    }

    if (status === "reject_by_gm" && !remark.trim()) {
      setMessage({
        type: "error",
        text: "กรุณาระบุเหตุผลที่ไม่อนุมัติคำขอ",
      });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const payload = {
        id: Number(data.id),
        status,
        approved_by: getCurrentUserText(),
        reject_reason:
          status === "reject_by_gm" ? remark.trim() : "",
        status_details:
          remark.trim() ||
          (status === "fbp_pending"
            ? "GM อนุมัติคำขอ ส่งต่อให้ FBP พิจารณา"
            : "GM ไม่อนุมัติคำขอ"),
      };

      const response = await fetch(
        "http://192.168.158.210/api_new_truck/api/request_gm_update.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const responseText = await response.text();
      let result: unknown = null;

      try {
        result = responseText ? JSON.parse(responseText) : null;
      } catch {
        throw new Error(
          `API ไม่ได้ส่งข้อมูล JSON กลับมา: ${responseText}`,
        );
      }

      const resultObject =
        result && typeof result === "object"
          ? (result as Record<string, unknown>)
          : {};

      if (!response.ok) {
        throw new Error(
          String(
            resultObject.message ||
            `HTTP Error ${response.status}`,
          ),
        );
      }

      if (
        resultObject.status === "error" ||
        resultObject.success === false
      ) {
        throw new Error(
          String(resultObject.message || "อัปเดตสถานะไม่สำเร็จ"),
        );
      }

      setMessage({
        type: "success",
        text:
          status === "fbp_pending"
            ? "อนุมัติคำขอและส่งต่อให้ FBP เรียบร้อยแล้ว"
            : "ไม่อนุมัติคำขอเรียบร้อยแล้ว",
      });

      setConfirmDecision(null);
      await Promise.resolve(onSuccess());
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "เกิดข้อผิดพลาดในการอัปเดตสถานะ",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/55 p-2 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="รายละเอียดคำขอรถ"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose?.();
        }
      }}
    >
      <div
        className="relative flex h-[92vh] w-full max-w-[1200px] flex-col overflow-hidden rounded-3xl border border-white/70 bg-slate-100 shadow-[0_32px_120px_rgba(15,23,42,0.45)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="relative shrink-0 overflow-hidden border-b border-slate-200 bg-white">

<div className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
    <div className="flex min-w-0 items-start gap-3">
    </div>

    <button
        type="button"
        onClick={onClose}
        disabled={saving}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl font-medium text-slate-400 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="ปิด"
    >
        ×
    </button>
</div>
</header>

        <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-h-0 overflow-y-auto py-2 sm:p-2">
            <CheckDC
              data={data}
              allRequests={allRequests}
              issuePeriods={issuePeriods}
            />
          </div>

          <aside className="min-h-0 space-y-4 overflow-y-auto border-t border-slate-200 bg-slate-100 p-3 sm:p-5 xl:border-l xl:border-t-0">
            <section className="overflow-hidden rounded-3xl border border-blue-200 bg-white shadow-sm">
              <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-5 py-4 text-white">
                <h2 className="text-sm font-black">อัปเดตสถานะคำขอ</h2>
                <p className="mt-1 text-[11px] font-medium text-white/75">
                  ตรวจสอบข้อมูลแล้วเลือกผลการพิจารณา
                </p>
              </div>

              <div className="space-y-4 p-5">
                {message && (
                  <div
                    className={`rounded-xl border px-3 py-2.5 text-xs font-bold ${message.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                      }`}
                  >
                    {message.text}
                  </div>
                )}

                <div className="space-y-2 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  {[
                    ["เลขที่เอกสาร", data.running_doc || "-"],
                    ["DC", data.dc_code || "-"],
                    ["ประเภทรถ", data.fleet_truck_type || "-"],
                    ["จำนวน", `${formatNumber(data.qty)} คัน`],
                    ["สถานะ", getStatusText(data.status)],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-start justify-between gap-3 text-xs"
                    >
                      <span className="font-semibold text-slate-500">
                        {label}
                      </span>
                      <span className="break-words text-right font-black text-slate-800">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-slate-600">
                    หมายเหตุ / เหตุผล
                  </span>
                  <textarea
                    rows={4}
                    value={remark}
                    disabled={saving}
                    onChange={(event) => {
                      setRemark(event.target.value);
                      setMessage(null);
                    }}
                    placeholder="ระบุหมายเหตุ หรือเหตุผลกรณีไม่อนุมัติคำขอ"
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                  />
                  <span className="mt-1.5 block text-[10px] font-medium text-slate-400">
                    ต้องระบุเหตุผลเมื่อเลือกไม่อนุมัติคำขอ
                  </span>
                </label>

                {!confirmDecision ? (
                  <div className="grid gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMessage(null);
                        setConfirmDecision("fbp_pending");
                      }}
                      disabled={saving}
                      className="h-11 rounded-xl bg-blue-700 px-3 text-sm font-black text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800 disabled:opacity-50"
                    >
                      อนุมัติคำขอ
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setMessage(null);
                        setConfirmDecision("reject_by_gm");
                      }}
                      disabled={saving}
                      className="h-11 rounded-xl border border-rose-200 bg-rose-50 px-3 text-sm font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                    >
                      ไม่อนุมัติคำขอ
                    </button>
                  </div>
                ) : (
                  <div
                    className={`rounded-2xl border p-4 ${confirmDecision === "fbp_pending"
                      ? "border-blue-200 bg-blue-50"
                      : "border-rose-200 bg-rose-50"
                      }`}
                  >
                    <h3
                      className={`text-sm font-black ${confirmDecision === "fbp_pending"
                        ? "text-blue-800"
                        : "text-rose-800"
                        }`}
                    >
                      {confirmDecision === "fbp_pending"
                        ? "ยืนยันอนุมัติคำขอ?"
                        : "ยืนยันไม่อนุมัติคำขอ?"}
                    </h3>

                    {confirmDecision === "reject_by_gm" &&
                      !remark.trim() && (
                        <p className="mt-1 text-[10px] font-bold text-rose-600">
                          กรุณาระบุเหตุผลก่อนยืนยัน
                        </p>
                      )}

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmDecision(null)}
                        disabled={saving}
                        className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-black text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                      >
                        ย้อนกลับ
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void updateGmDecision(confirmDecision)
                        }
                        disabled={
                          saving ||
                          (confirmDecision === "reject_by_gm" &&
                            !remark.trim())
                        }
                        className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-xs font-black text-white disabled:opacity-50 ${confirmDecision === "fbp_pending"
                          ? "bg-blue-700 hover:bg-blue-800"
                          : "bg-rose-600 hover:bg-rose-700"
                          }`}
                      >
                        {saving && (
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        )}
                        {saving ? "กำลังบันทึก..." : "ยืนยัน"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

          </aside>
        </div>
      </div>
    </div>
  );
}
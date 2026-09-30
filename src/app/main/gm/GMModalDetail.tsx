"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
const GM_PENDING_STATUSES = new Set([
  "gm_pending",
  "pending",
  "waiting approve",
  "waiting approval",
  "pending approve",
  "pending approval",
  "รอ gm อนุมัติ",
  "รออนุมัติ",
]);
function canGmDecide(status?: string): boolean {
  return GM_PENDING_STATUSES.has(normalizeStatus(status));
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
      "gm_pending",
      "pending",
      "waiting approve",
      "waiting approval",
      "pending approve",
      "pending approval",
      "รอ gm อนุมัติ",
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
function DecisionPopup({ children, label, busy = false, onDismiss }: {
  children: ReactNode;
  label: string;
  busy?: boolean;
  onDismiss: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      dialog?.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, []);
  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
      aria-busy={busy}
      className="m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-2xl border-0 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-950/40 backdrop:backdrop-blur-sm"
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!busy) onDismiss();
      }}
      onKeyDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {children}
    </dialog>
  );
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
  const [approvedQty, setApprovedQty] = useState("");
  const [saving, setSaving] = useState(false);
  const [decisionCompleted, setDecisionCompleted] = useState(false);
  const [confirmDecision, setConfirmDecision] =
    useState<GmDecision | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const canMakeDecision =
    !decisionCompleted && canGmDecide(data.status);
  useEffect(() => {
    if (!open) return;
    setRemark("");
    setApprovedQty(String(Math.max(0, Math.floor(Number(data.qty) || 0))));
    setConfirmDecision(null);
    setMessage(null);
    setDecisionCompleted(false);
  }, [open, data.id, data.qty]);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving && !message && !confirmDecision) {
        onClose?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, saving, message, confirmDecision]);
  if (!open) return null;
  const currentStatusText = getStatusText(data.status);
  const requestedQty = Math.max(0, Math.floor(Number(data.qty) || 0));
  const approveQtyGm = Math.max(
    0,
    Math.floor(
      Number(
        (
          data as RequestItem & {
            approve_qty_gm?: number | string | null;
          }
        ).approve_qty_gm,
      ) || 0,
    ),
  );
  const rejectedQty =
  normalizeStatus(data.status) === "gm_pending"
    ? 0
    : Math.max(requestedQty - approveQtyGm, 0);
  const approvedQtyNumber = Number(approvedQty);
  const isApprovedQtyValid =
    Number.isInteger(approvedQtyNumber) &&
    approvedQtyNumber >= 1 &&
    approvedQtyNumber <= requestedQty;
  const dismissMessage = () => {
    const succeeded = message?.type === "success";
    setMessage(null);
    if (succeeded) {
      void Promise.resolve().then(onSuccess).catch(() => {
        setMessage({ type: "error", text: "บันทึกผลแล้ว แต่โหลดข้อมูลล่าสุดไม่สำเร็จ กรุณารีเฟรชหน้า" });
      });
    }
  };

  const updateGmDecision = async (status: GmDecision) => {
    if (saving) return;
    if (!canMakeDecision) {
      setConfirmDecision(null);
      setMessage({
        type: "error",
        text: "รายการนี้ได้รับการพิจารณาแล้ว ไม่สามารถดำเนินการซ้ำได้",
      });
      return;
    }
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
    if (status === "fbp_pending" && !isApprovedQtyValid) {
      setMessage({
        type: "error",
        text: `จำนวนรถที่อนุมัติต้องเป็นจำนวนเต็มตั้งแต่ 1 ถึง ${requestedQty} คัน และห้ามมากกว่าจำนวนที่ขอ`,
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
        approve_qty_gm:
          status === "fbp_pending" ? approvedQtyNumber : 0,
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
      setDecisionCompleted(true);
      setConfirmDecision(null);

    } catch (error) {
      setConfirmDecision(null);
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
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 p-2 backdrop-blur-sm sm:p-4"
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
        className="relative flex h-[94vh] w-full max-w-[1280px] flex-col overflow-hidden rounded-3xl border border-white/70 bg-slate-100 shadow-[0_24px_80px_rgba(15,23,42,0.24)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* HEADER */}
        <header className="relative shrink-0 overflow-hidden border-b border-slate-200/70 bg-white">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-400 to-sky-400" />
          <div className="flex items-start justify-between gap-4 px-4 pb-4 pt-5 sm:px-6">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-500 text-sm font-semibold text-white shadow-[0_4px_18px_rgba(15,23,42,0.035)] shadow-blue-600/10">
                GM
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-base font-semibold text-slate-900 sm:text-lg">
                    พิจารณาคำขอรถ
                  </h1>
                </div>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  ตรวจสอบรายละเอียดคำขอและเลือกผลการพิจารณา
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200/60">
                    เลขที่เอกสาร: {data.running_doc || "-"}
                  </span>
                  <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                    {data.dc_code || "-"}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/70 bg-white text-xl font-medium text-slate-500 shadow-[0_4px_18px_rgba(15,23,42,0.035)] transition-colors duration-200 hover:border-rose-100 hover:bg-rose-50 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="ปิด"
            >
              ×
            </button>
          </div>
        </header>
        {/* CONTENT */}
        <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* LEFT SIDE */}
          <div className="min-h-0 overflow-y-auto bg-slate-50 p-2 sm:p-4">
            <CheckDC
              data={data}
              allRequests={allRequests}
              issuePeriods={issuePeriods}
            />
          </div>
          {/* RIGHT SIDE */}
          <aside className="min-h-0 overflow-y-auto border-t border-slate-200/70 bg-white p-3 sm:p-5 lg:border-l lg:border-t-0">
            <div className="space-y-5">
              {/* SUMMARY */}
              <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.035)]">
                <div className="border-b border-slate-200/70 bg-gradient-to-br from-slate-700 via-slate-800 to-blue-900 px-5 py-4 text-white">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold">
                        สรุปข้อมูลคำขอ
                      </h2>
                      <p className="mt-0.5 text-xs font-medium text-white/65">
                        ข้อมูลสำหรับประกอบการพิจารณา
                      </p>
                    </div>
                    <span className="rounded-lg bg-white/10 px-2 py-1 text-xs font-semibold text-white ring-1 ring-white/15">
                      REQUEST
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-slate-100/80 px-5">
                  {[
                    ["เลขที่เอกสาร", data.running_doc || "-"],
                    ["DC", data.dc_code || "-"],
                    ["ประเภทรถ", data.fleet_truck_type || "-"],
                    ["จำนวนที่ขอ", `${formatNumber(data.qty)} คัน`],
                    [
                      "จำนวนที่ GM อนุมัติ",
                      `${formatNumber(approveQtyGm)} คัน`,
                    ],
                    [
                      "จำนวนที่ไม่อนุมัติ",
                      `${formatNumber(rejectedQty)} คัน`,
                    ],
                    ["สถานะ", currentStatusText],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-start justify-between gap-4 py-3.5 text-sm"
                    >
                      <span className="shrink-0 font-semibold text-slate-500">
                        {label}
                      </span>
                      <span className="break-words text-right font-semibold text-slate-800">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
              {/* ALREADY DECIDED */}
              {!canMakeDecision ? (
                <section className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_4px_18px_rgba(15,23,42,0.035)]">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-semibold text-emerald-600 ring-1 ring-emerald-100">
                      ✓
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-800">
                            พิจารณารายการแล้ว
                          </h3>
                          <p className="mt-0.5 text-xs font-medium text-slate-500">
                            ไม่สามารถแก้ไขผลการพิจารณาซ้ำได้
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClass(
                            data.status,
                          )}`}
                        >
                          {currentStatusText}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={onClose}
                        className="mt-4 h-10 w-full rounded-xl border border-slate-200/70 bg-slate-50 text-xs font-semibold text-slate-600 transition-colors duration-200 hover:border-slate-200 hover:bg-slate-100"
                      >
                        ปิดหน้าต่าง
                      </button>
                    </div>
                  </div>
                </section>
              ) : (
                /* DECISION AREA */
                <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_4px_18px_rgba(15,23,42,0.035)]">
                  <div className="border-b border-blue-100 bg-blue-50 px-5 py-4">
                    <h2 className="text-sm font-semibold text-blue-900">
                      ผลการพิจารณา
                    </h2>
                    <p className="mt-0.5 text-xs font-medium text-blue-600">
                      เลือกอนุมัติหรือไม่อนุมัติคำขอนี้
                    </p>
                  </div>
                  <div className="space-y-5 p-5">
                    {/* APPROVED QUANTITY */}
                    <label className="block">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-slate-600">
                          จำนวนรถที่อนุมัติ
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          ขอทั้งหมด {formatNumber(data.qty)} คัน
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min={1}
                          max={requestedQty}
                          step={1}
                          inputMode="numeric"
                          value={approvedQty}
                          disabled={saving}
                          onChange={(event) => {
                            setApprovedQty(event.target.value);
                            setMessage(null);
                          }}
                          className={`h-12 w-full rounded-xl border bg-white px-3 pr-14 text-sm font-semibold text-slate-700 outline-none transition-colors duration-200 hover:border-blue-300 focus:bg-white focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 ${
                            approvedQty && !isApprovedQtyValid
                              ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
                              : "border-slate-200 focus:border-blue-500 focus:ring-blue-100"
                          }`}
                        />
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-slate-500">
                          คัน
                        </span>
                      </div>

                    </label>
                    {/* REMARK */}
                    <label className="block">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-slate-600">
                          หมายเหตุ / เหตุผล
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          ไม่บังคับสำหรับการอนุมัติ
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        value={remark}
                        disabled={saving}
                        onChange={(event) => {
                          setRemark(event.target.value);
                          setMessage(null);
                        }}
                        placeholder="ระบุหมายเหตุ หรือเหตุผลกรณีไม่อนุมัติคำขอ"
                        className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none transition-colors duration-200 placeholder:text-slate-500 hover:border-blue-300 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                      />
                      <span className="mt-1.5 block text-xs font-medium text-slate-500">
                        กรณีไม่อนุมัติ จำเป็นต้องระบุเหตุผล
                      </span>
                    </label>

                      <div className="space-y-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setMessage(null);
                            if (!isApprovedQtyValid) {
                              setMessage({
                                type: "error",
                                text: `จำนวนรถที่อนุมัติต้องเป็นจำนวนเต็มตั้งแต่ 1 ถึง ${requestedQty} คัน และห้ามมากกว่าจำนวนที่ขอ`,
                              });
                              return;
                            }
                            setConfirmDecision("fbp_pending");
                          }}
                          disabled={saving}
                          className="group flex min-h-14 w-full items-center justify-between rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-left text-white shadow-[0_4px_18px_rgba(15,23,42,0.035)] shadow-blue-600/10 transition-colors duration-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span>
                            <span className="block text-sm font-semibold">
                              อนุมัติคำขอ
                            </span>
                            <span className="mt-0.5 block text-xs font-medium text-white/70">
                              ส่งรายการต่อให้ทีม FBP พิจารณา
                            </span>
                          </span>
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-sm font-semibold">
                            ✓
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMessage(null);
                            if (!remark.trim()) {
                              setMessage({ type: "error", text: "กรุณาระบุเหตุผลที่ไม่อนุมัติคำขอ" });
                              return;
                            }
                            setConfirmDecision("reject_by_gm");
                          }}
                          disabled={saving}
                          className="group flex min-h-14 w-full items-center justify-between rounded-xl border border-rose-100 bg-white px-4 text-left text-rose-700 transition-colors duration-200  hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span>
                            <span className="block text-sm font-semibold">
                              ไม่อนุมัติคำขอ
                            </span>
                            <span className="mt-0.5 block text-xs font-medium text-rose-500">
                              ปฏิเสธรายการและบันทึกเหตุผล
                            </span>
                          </span>
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-200/70 text-sm font-semibold">
                            ×
                          </span>
                        </button>
                      </div>

                  </div>
                </section>
              )}
            </div>
          </aside>
        </div>
      </div>

      {message ? (
        <DecisionPopup
          key="message"
          label={message.type === "success" ? "บันทึกสำเร็จ" : "แจ้งเตือน"}
          busy={saving}
          onDismiss={dismissMessage}
        >
          <div className="p-6 text-center">
            <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-2xl font-medium ${message.type === "success" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
              {message.type === "success" ? "✓" : "!"}
            </div>
            <h2 className="text-lg font-medium">{message.type === "success" ? "บันทึกสำเร็จ" : "แจ้งเตือน"}</h2>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">{message.text}</p>
            <button type="button" disabled={saving} onClick={dismissMessage} className="mt-6 h-11 w-full rounded-xl bg-blue-700 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">
              ตกลง
            </button>
          </div>
        </DecisionPopup>
      ) : confirmDecision ? (
        <DecisionPopup key="confirmation" label={confirmDecision === "fbp_pending" ? "ยืนยันอนุมัติคำขอ" : "ยืนยันไม่อนุมัติคำขอ"} busy={saving} onDismiss={() => setConfirmDecision(null)}>


                      <div
                        className={`overflow-hidden rounded-2xl border ${confirmDecision === "fbp_pending"
                          ? "border-blue-100 bg-blue-50"
                          : "border-rose-100 bg-rose-50"
                          }`}
                      >
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white ${confirmDecision === "fbp_pending"
                                ? "bg-blue-700"
                                : "bg-rose-600"
                                }`}
                            >
                              {confirmDecision === "fbp_pending" ? "✓" : "!"}
                            </span>
                            <div>
                              <h3
                                className={`text-sm font-semibold ${confirmDecision === "fbp_pending"
                                  ? "text-blue-900"
                                  : "text-rose-900"
                                  }`}
                              >
                                {confirmDecision === "fbp_pending"
                                  ? "ยืนยันอนุมัติคำขอ?"
                                  : "ยืนยันไม่อนุมัติคำขอ?"}
                              </h3>
                              <p
                                className={`mt-1 text-xs font-medium leading-relaxed ${confirmDecision === "fbp_pending"
                                  ? "text-blue-600"
                                  : "text-rose-600"
                                  }`}
                              >
                                {confirmDecision === "fbp_pending"
                                  ? `จำนวนที่ขอ ${requestedQty} คัน อนุมัติ ${approvedQtyNumber} คัน และส่งต่อให้ทีม FBP`
                                  : "เมื่อยืนยันแล้ว รายการจะถูกบันทึกว่าไม่อนุมัติ"}
                              </p>
                            </div>
                          </div>
                          {confirmDecision === "reject_by_gm" &&
                            !remark.trim() && (
                              <div className="mt-3 rounded-xl border border-rose-100 bg-white px-3 py-2 text-xs font-medium text-rose-600">
                                กรุณาระบุเหตุผลก่อนยืนยันไม่อนุมัติ
                              </div>
                            )}
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setConfirmDecision(null)}
                              disabled={saving}
                              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors duration-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
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
                                !canMakeDecision ||
                                (confirmDecision === "fbp_pending" &&
                                  !isApprovedQtyValid) ||
                                (confirmDecision === "reject_by_gm" &&
                                  !remark.trim())
                              }
                              className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold text-white shadow-[0_4px_18px_rgba(15,23,42,0.035)] transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${confirmDecision === "fbp_pending"
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
                      </div>

        </DecisionPopup>
      ) : null}
    </div>
  );
}
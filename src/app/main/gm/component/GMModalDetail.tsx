"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import CheckDC, {
  type IssuePeriodItem,
  type RequestItem,
} from "../../component/CheckDC";

interface GMModalDetailProps {
  open?: boolean;
  onClose?: () => void;
  data: RequestItem;
  allRequests?: RequestItem[];
  issuePeriods?: IssuePeriodItem[];
  onSuccess?: () => void | Promise<void>;
}

type GmDecision = "progress" | "fbp_pending" | "reject_by_gm";
type Notice = { type: "success" | "error"; text: string };

const GM_API_BASE = "http://192.168.158.210/api_new_truck/api";

function getGmUpdateUrl(status?: string) {
  const endpoint =
    normalizeStatus(status) === "gm_checking"
      ? "request_gm_update_tc.php"
      : "request_gm_update.php";
  return GM_API_BASE + "/" + endpoint;
}

const GM_PENDING_STATUSES = new Set([
  "gm_pending",
  "gm_checking",
  "pending",
  "waiting approve",
  "waiting approval",
  "pending approve",
  "pending approval",
  "รอ gm อนุมัติ",
  "รออนุมัติ",
]);

function normalizeStatus(value?: string) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function canGmDecide(status?: string) {
  return GM_PENDING_STATUSES.has(normalizeStatus(status));
}

function getApprovalStatus(status?: string): "progress" | "fbp_pending" {
  return normalizeStatus(status) === "gm_checking" ? "progress" : "fbp_pending";
}

function formatNumber(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return "-";
  const numberValue = Number(value);
  return Number.isNaN(numberValue)
    ? String(value)
    : numberValue.toLocaleString("en-US");
}

function getStatusText(status?: string) {
  const value = normalizeStatus(status);
  if (value === "gm_pending") return "รอ GM อนุมัติคำขอจากคลัง";
  if (value === "gm_checking") return "รอ GM อนุมัติคำขอจากส่วนกลาง";
  if (value === "reject_by_gm") return "GM ไม่อนุมัติ";
  if (value === "fbp_pending" || value === "progress") return "GM อนุมัติแล้ว";
  if (canGmDecide(status)) return "รออนุมัติ";
  if (
    [
      "wait fleet",
      "waiting fleet",
      "รอสรรหาผู้ประกอบการ",
      "รอกองรถประเมิน",
    ].includes(value)
  ) {
    return "รอสรรหาผู้ประกอบการ";
  }
  if (
    [
      "confirm request",
      "confirmed request",
      "confirm",
      "confirmed",
      "in fbp_pending",
      "processing",
      "กำลังดำเนินการ",
    ].includes(value)
  ) {
    return "กำลังดำเนินการ";
  }
  if (["approved", "approve", "success", "สำเร็จ", "อนุมัติ"].includes(value))
    return "อนุมัติ";
  if (["rejected", "reject", "not approved", "ไม่อนุมัติ"].includes(value))
    return "ไม่อนุมัติ";
  return status || "-";
}

function getStatusClass(status?: string) {
  if (canGmDecide(status)) return "border-amber-200 bg-amber-50 text-amber-700";

  const text = getStatusText(status);
  if (text === "กำลังดำเนินการ" || text === "รอสรรหาผู้ประกอบการ") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (text === "อนุมัติ" || text === "GM อนุมัติแล้ว") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (text === "ไม่อนุมัติ" || text === "GM ไม่อนุมัติ") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function getCurrentUserText() {
  try {
    const rawUser =
      localStorage.getItem("userInfo") ||
      localStorage.getItem("user_info") ||
      localStorage.getItem("user") ||
      localStorage.getItem("authUser");
    if (!rawUser) return "";

    const user = JSON.parse(rawUser) as Record<string, unknown>;
    const name = String(user.name || user.NAME || "").trim();
    const surname = String(user.surname || user.SURNAME || "").trim();
    const employeeId = String(
      user.em_id || user.employee_id || user.EMPLOYEE_ID || user.id || "",
    ).trim();
    const fullName = [name, surname].filter(Boolean).join(" ");
    return fullName && employeeId
      ? fullName + " (" + employeeId + ")"
      : fullName || employeeId;
  } catch {
    return "";
  }
}

function decisionDescription(status: GmDecision) {
  if (status === "progress") return "GM อนุมัติคำขอจากส่วนกลาง";
  if (status === "fbp_pending") return "GM อนุมัติคำขอ ส่งต่อให้ FBP พิจารณา";
  return "GM ไม่อนุมัติคำขอ";
}

function DecisionPopup({
  children,
  label,
  busy = false,
  onDismiss,
}: {
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
  onSuccess = () => {},
}: GMModalDetailProps) {
  const [remark, setRemark] = useState("");
  const [approvedQty, setApprovedQty] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedStatus, setSavedStatus] = useState<GmDecision | null>(null);
  const [savedQty, setSavedQty] = useState<number | null>(null);
  const [confirmDecision, setConfirmDecision] = useState<GmDecision | null>(
    null,
  );
  const [message, setMessage] = useState<Notice | null>(null);
  const busyRef = useRef(false);

  const canMakeDecision = savedStatus === null && canGmDecide(data.status);
  const approvalStatus = getApprovalStatus(data.status);
  const isConfirmingApproval =
    confirmDecision !== null && confirmDecision !== "reject_by_gm";

  useEffect(() => {
    if (!open) return;
    setRemark("");
    setApprovedQty(String(Math.max(0, Math.floor(Number(data.qty) || 0))));
    setConfirmDecision(null);
    setMessage(null);
    setSavedStatus(null);
    setSavedQty(null);
  }, [open, data.id, data.qty]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving && !message && !confirmDecision)
        onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose, saving, message, confirmDecision]);

  if (!open) return null;

  const currentStatus = savedStatus ?? data.status;
  const currentStatusText = getStatusText(currentStatus);
  const requestedQty = Math.max(0, Math.floor(Number(data.qty) || 0));
  const previousApprovedQty = (
    data as RequestItem & {
      approve_qty_gm?: number | string | null;
    }
  ).approve_qty_gm;
  const approveQtyGm =
    savedQty ?? Math.max(0, Math.floor(Number(previousApprovedQty) || 0));
  const rejectedQty = canGmDecide(currentStatus)
    ? 0
    : Math.max(requestedQty - approveQtyGm, 0);
  const approvedQtyNumber = Number(approvedQty);
  const isApprovedQtyValid =
    Number.isInteger(approvedQtyNumber) &&
    approvedQtyNumber >= 1 &&
    approvedQtyNumber <= requestedQty;
  const approvalQtyError =
    "จำนวนรถที่อนุมัติต้องเป็นจำนวนเต็มตั้งแต่ 1 ถึง " +
    requestedQty +
    " คัน และห้ามมากกว่าจำนวนที่ขอ";
  const rejectReasonError = "กรุณาระบุเหตุผลที่ไม่อนุมัติคำขอ";

  function dismissMessage() {
    const succeeded = message?.type === "success";
    setMessage(null);
    if (succeeded) {
      void Promise.resolve()
        .then(onSuccess)
        .catch(() => {
          setMessage({
            type: "error",
            text: "บันทึกผลแล้ว แต่โหลดข้อมูลล่าสุดไม่สำเร็จ กรุณารีเฟรชหน้า",
          });
        });
    }
  }

  function validationError(status: GmDecision) {
    if (status === "reject_by_gm")
      return remark.trim() ? "" : rejectReasonError;
    return isApprovedQtyValid ? "" : approvalQtyError;
  }

  function requestConfirmation(status: GmDecision) {
    const error = validationError(status);
    if (error) {
      setMessage({ type: "error", text: error });
      return;
    }
    setMessage(null);
    setConfirmDecision(status);
  }

  async function updateGmDecision(status: GmDecision) {
    if (busyRef.current) return;
    if (
      !canMakeDecision ||
      (status !== "reject_by_gm" && status !== approvalStatus)
    ) {
      setConfirmDecision(null);
      setMessage({
        type: "error",
        text: "ไม่สามารถบันทึกผลสำหรับสถานะปัจจุบัน กรุณารีเฟรชรายการ",
      });
      return;
    }

    const id = Number(data.id);
    const error =
      !Number.isSafeInteger(id) || id < 1
        ? "ไม่พบ ID ของรายการนี้"
        : validationError(status);
    if (error) {
      setConfirmDecision(null);
      setMessage({ type: "error", text: error });
      return;
    }

    const isApproval = status !== "reject_by_gm";
    const quantity = isApproval ? approvedQtyNumber : 0;
    const payload = {
      id,
      status,
      approved_by: getCurrentUserText(),
      approve_qty_gm: quantity,
      reject_reason: isApproval ? "" : remark.trim(),
      status_details: remark.trim() || decisionDescription(status),
    };

    busyRef.current = true;
    setSaving(true);
    try {
      const response = await fetch(getGmUpdateUrl(data.status), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responseText = await response.text();
      let result: {
        status?: string;
        success?: boolean;
        message?: string;
      } | null = null;
      try {
        result = responseText ? JSON.parse(responseText) : null;
      } catch {
        throw new Error(
          "API ส่งข้อมูลกลับมาในรูปแบบที่ไม่ถูกต้อง กรุณารีเฟรชเพื่อตรวจสอบสถานะ",
        );
      }
      if (
        !response.ok ||
        result?.success === false ||
        result?.status === "error"
      ) {
        throw new Error(
          result?.message ||
            "อัปเดตสถานะไม่สำเร็จ (HTTP " + response.status + ")",
        );
      }

      setSavedStatus(status);
      setSavedQty(quantity);
      setMessage({
        type: "success",
        text:
          status === "progress"
            ? "อนุมัติคำขอจากส่วนกลางเรียบร้อยแล้ว"
            : status === "fbp_pending"
              ? "อนุมัติคำขอและส่งต่อให้ FBP เรียบร้อยแล้ว"
              : "ไม่อนุมัติคำขอเรียบร้อยแล้ว",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "เกิดข้อผิดพลาดในการอัปเดตสถานะ",
      });
    } finally {
      setConfirmDecision(null);
      busyRef.current = false;
      setSaving(false);
    }
  }

  const summaryRows = [
    ["เลขที่เอกสาร", data.running_doc || "-"],
    ["DC", data.dc_code || "-"],
    ["ประเภทรถ", data.fleet_truck_type || "-"],
    ["จำนวนที่ขอ", formatNumber(data.qty) + " คัน"],
    ["จำนวนที่ GM อนุมัติ", formatNumber(approveQtyGm) + " คัน"],
    ["จำนวนที่ไม่อนุมัติ", formatNumber(rejectedQty) + " คัน"],
    ["สถานะ", currentStatusText],
  ];
  const confirmTitle = isConfirmingApproval
    ? "ยืนยันอนุมัติคำขอ"
    : "ยืนยันไม่อนุมัติคำขอ";
  const confirmDescription = isConfirmingApproval
    ? "จำนวนที่ขอ " +
      requestedQty +
      " คัน อนุมัติ " +
      approvedQtyNumber +
      " คัน" +
      (confirmDecision === "fbp_pending" ? " และส่งต่อให้ทีม FBP" : "")
    : "เมื่อยืนยันแล้ว รายการจะถูกบันทึกว่าไม่อนุมัติ";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 p-2 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="รายละเอียดคำขอรถ"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose?.();
      }}
    >
      <div className="relative flex h-[94vh] w-full max-w-[1280px] flex-col overflow-hidden rounded-3xl border border-white/70 bg-slate-100 shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
        <header className="relative shrink-0 overflow-hidden border-b border-slate-200/70 bg-white">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-400 to-sky-400" />
          <div className="flex items-start justify-between gap-4 px-4 pb-4 pt-5 sm:px-6">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-500 text-sm font-semibold text-white">
                GM
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-semibold text-slate-900 sm:text-lg">
                  พิจารณาคำขอรถ
                </h1>
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
              aria-label="ปิด"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/70 bg-white text-xl text-slate-500 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50"
            >
              ×
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_380px] lg:overflow-hidden">
          <div className="min-h-0 bg-slate-50 p-2 sm:p-4 lg:overflow-y-auto">
            <CheckDC
              data={data}
              allRequests={allRequests}
              issuePeriods={issuePeriods}
            />
          </div>
          <aside className="min-h-0 space-y-5 border-t border-slate-200/70 bg-white p-3 sm:p-5 lg:overflow-y-auto lg:border-l lg:border-t-0">
            <section className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 bg-gradient-to-br from-slate-700 via-slate-800 to-blue-900 px-5 py-4 text-white">
                <div>
                  <h2 className="text-sm font-semibold">สรุปข้อมูลคำขอ</h2>
                  <p className="mt-0.5 text-xs font-medium text-white/65">
                    ข้อมูลสำหรับประกอบการพิจารณา
                  </p>
                </div>
                <span className="rounded-lg bg-white/10 px-2 py-1 text-xs font-semibold ring-1 ring-white/15">
                  REQUEST
                </span>
              </div>
              <div className="divide-y divide-slate-100/80 px-5">
                {summaryRows.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-4 py-3.5 text-sm"
                  >
                    <span className="shrink-0 font-semibold text-slate-500">
                      {label}
                    </span>
                    <span className="min-w-0 break-words text-right font-semibold text-slate-800">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {canMakeDecision ? (
              <section className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
                <div className="border-b border-blue-100 bg-blue-50 px-5 py-4">
                  <h2 className="text-sm font-semibold text-blue-900">
                    ผลการพิจารณา
                  </h2>
                  <p className="mt-0.5 text-xs font-medium text-blue-600">
                    เลือกอนุมัติหรือไม่อนุมัติคำขอนี้
                  </p>
                </div>
                <div className="space-y-5 p-5">
                  <label className="block">
                    <span className="mb-1.5 flex items-center justify-between gap-2 text-xs font-medium text-slate-600">
                      <span>จำนวนรถที่อนุมัติ</span>
                      <span>ขอทั้งหมด {formatNumber(data.qty)} คัน</span>
                    </span>
                    <span className="relative block">
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
                        className={
                          "h-12 w-full rounded-xl border bg-white px-3 pr-14 text-sm font-semibold text-slate-700 outline-none focus:ring-2 disabled:bg-slate-100 " +
                          (approvedQty && !isApprovedQtyValid
                            ? "border-rose-400 focus:ring-rose-100"
                            : "border-slate-200 focus:border-blue-500 focus:ring-blue-100")
                        }
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">
                        คัน
                      </span>
                    </span>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 flex items-center justify-between gap-2 text-xs font-medium text-slate-600">
                      <span>หมายเหตุ</span>
                      <span>ไม่บังคับสำหรับการอนุมัติ</span>
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
                      className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                    />
                    <span className="mt-1.5 block text-xs text-slate-500">
                      กรณีไม่อนุมัติ จำเป็นต้องระบุเหตุผล
                    </span>
                  </label>
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => requestConfirmation(approvalStatus)}
                      className="flex min-h-14 w-full items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 text-left text-white hover:shadow-md disabled:opacity-50"
                    >
                      <span>
                        <span className="block text-sm font-semibold">
                          อนุมัติคำขอ
                        </span>
                        <span className="mt-0.5 block text-xs font-medium text-white/80">
                          {approvalStatus === "progress"
                            ? "อนุมัติให้คำขอส่วนกลางดำเนินการต่อ"
                            : "ส่งรายการต่อให้ทีม FBP พิจารณา"}
                        </span>
                      </span>
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15">
                        ✓
                      </span>
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => requestConfirmation("reject_by_gm")}
                      className="flex min-h-14 w-full items-center justify-between gap-2 rounded-xl border border-rose-100 bg-white px-4 text-left text-rose-700 hover:border-rose-300 hover:bg-rose-50 disabled:opacity-50"
                    >
                      <span>
                        <span className="block text-sm font-semibold">
                          ไม่อนุมัติคำขอ
                        </span>
                        <span className="mt-0.5 block text-xs font-medium text-rose-500">
                          ปฏิเสธรายการและบันทึกเหตุผล
                        </span>
                      </span>
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-200/70">
                        ×
                      </span>
                    </button>
                  </div>
                </div>
              </section>
            ) : (
              <section className="rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                    ✓
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800">
                          พิจารณารายการแล้ว
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-500">
                          ไม่สามารถแก้ไขผลการพิจารณาซ้ำได้
                        </p>
                      </div>
                      <span
                        className={
                          "rounded-full border px-2.5 py-1 text-xs font-semibold " +
                          getStatusClass(currentStatus)
                        }
                      >
                        {currentStatusText}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="mt-4 h-10 w-full rounded-xl border border-slate-200/70 bg-slate-50 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      ปิดหน้าต่าง
                    </button>
                  </div>
                </div>
              </section>
            )}
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
            <div
              className={
                "mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-2xl " +
                (message.type === "success"
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-rose-50 text-rose-600")
              }
            >
              {message.type === "success" ? "✓" : "!"}
            </div>
            <h2 className="text-lg font-medium">
              {message.type === "success" ? "บันทึกสำเร็จ" : "แจ้งเตือน"}
            </h2>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">
              {message.text}
            </p>
            <button
              type="button"
              disabled={saving}
              onClick={dismissMessage}
              className="mt-6 h-11 w-full rounded-xl bg-blue-700 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
            >
              ตกลง
            </button>
          </div>
        </DecisionPopup>
      ) : confirmDecision ? (
        <DecisionPopup
          key="confirmation"
          label={confirmTitle}
          busy={saving}
          onDismiss={() => setConfirmDecision(null)}
        >
          <div
            className={
              "rounded-2xl border p-4 " +
              (isConfirmingApproval
                ? "border-blue-100 bg-blue-50"
                : "border-rose-100 bg-rose-50")
            }
          >
            <div className="flex items-start gap-3">
              <span
                className={
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-semibold text-white " +
                  (isConfirmingApproval ? "bg-blue-700" : "bg-rose-600")
                }
              >
                {isConfirmingApproval ? "✓" : "!"}
              </span>
              <div>
                <h3
                  className={
                    "text-sm font-semibold " +
                    (isConfirmingApproval ? "text-blue-900" : "text-rose-900")
                  }
                >
                  {confirmTitle}?
                </h3>
                <p
                  className={
                    "mt-1 text-xs leading-relaxed " +
                    (isConfirmingApproval ? "text-blue-600" : "text-rose-600")
                  }
                >
                  {confirmDescription}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmDecision(null)}
                disabled={saving}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                ย้อนกลับ
              </button>
              <button
                type="button"
                onClick={() => void updateGmDecision(confirmDecision)}
                disabled={
                  saving ||
                  !canMakeDecision ||
                  Boolean(validationError(confirmDecision))
                }
                className={
                  "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold text-white disabled:opacity-50 " +
                  (isConfirmingApproval
                    ? "bg-blue-700 hover:bg-blue-800"
                    : "bg-rose-600 hover:bg-rose-700")
                }
              >
                {saving && (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                )}
                {saving ? "กำลังบันทึก..." : "ยืนยัน"}
              </button>
            </div>
          </div>
        </DecisionPopup>
      ) : null}
    </div>
  );
}

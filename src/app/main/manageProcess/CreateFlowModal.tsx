"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  FilePlus2,
  Hash,
  Layers3,
  LoaderCircle,
  Plus,
  Route,
  Text,
  Truck,
  X,
} from "lucide-react";

export interface FlowItem {
  id?: number | string;
  flow_id?: number | string;
  fleet_type?: string;
  process_level?: number | string;
  process?: string;
  detail?: string;
  created_at?: string;
  create_by?: string;
  updated_at?: string;
  updated_by?: string;
}

interface CreateFlowModalProps {
  open: boolean;
  flowData: FlowItem[];
  fleetTypes: string[];
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

interface FlowSaveResponse {
  status?: boolean | string;
  success?: boolean;
  message?: string;
  id?: number | string;
}

const FLOW_SAVE_API_URL =
  "http://192.168.158.210/api_new_truck/api/flow_save.php";

export default function CreateFlowModal({
  open,
  flowData,
  fleetTypes,
  onClose,
  onSuccess,
}: CreateFlowModalProps) {
  const [fleetType, setFleetType] = useState("");
  const [flowId, setFlowId] = useState("");
  const [processName, setProcessName] = useState("");
  const [detail, setDetail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const availableFleetTypes = useMemo(() => {
    const values = new Set<string>();

    fleetTypes.forEach((item) => {
      const value = String(item ?? "").trim();

      if (value) {
        values.add(value);
      }
    });

    flowData.forEach((item) => {
      const value = String(item.fleet_type ?? "").trim();

      if (value) {
        values.add(value);
      }
    });

    return Array.from(values).sort((a, b) =>
      a.localeCompare(b, "th")
    );
  }, [fleetTypes, flowData]);

  const nextProcessLevel = useMemo(() => {
    if (!fleetType) {
      return 1;
    }

    const levels = flowData
      .filter(
        (item) =>
          String(item.fleet_type ?? "").trim() ===
          fleetType
      )
      .map((item) => Number(item.process_level))
      .filter((level) => Number.isFinite(level));

    if (levels.length === 0) {
      return 1;
    }

    return Math.max(...levels) + 1;
  }, [flowData, fleetType]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setFleetType(availableFleetTypes[0] || "");
    setFlowId("");
    setProcessName("");
    setDetail("");
    setError("");
  }, [open, availableFleetTypes]);

  const closeModal = () => {
    if (submitting) {
      return;
    }

    setFleetType("");
    setFlowId("");
    setProcessName("");
    setDetail("");
    setError("");

    onClose();
  };

  const getCurrentUser = () => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      return "System";
    }

    try {
      const userData = JSON.parse(storedUser);

      const fullName = [
        userData.name,
        userData.surname,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();

      const employeeId =
        userData.em_id ||
        userData.employee_id ||
        userData.username ||
        "";

      if (employeeId) {
        return `${fullName || "ไม่ระบุชื่อ"} (${employeeId})`;
      }

      return fullName || "System";
    } catch {
      return storedUser;
    }
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!fleetType.trim()) {
      setError("กรุณาเลือกประเภทใบคำขอออกรถ");
      return;
    }

    if (!processName.trim()) {
      setError("กรุณาระบุชื่อขั้นตอนกระบวนการทำงาน");
      return;
    }

    if (flowId.trim()) {
      const numericId = Number(flowId);

      if (
        !Number.isInteger(numericId) ||
        numericId <= 0
      ) {
        setError(
          "รหัสขั้นตอนต้องเป็นจำนวนเต็มที่มากกว่า 0"
        );
        return;
      }

      const duplicateId = flowData.some(
        (item) =>
          Number(item.id ?? item.flow_id) === numericId
      );

      if (duplicateId) {
        setError(
          `รหัสขั้นตอน ${numericId} มีอยู่ในระบบแล้ว`
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      setError("");

      const payload = {
        mode: "add",
        original_id: null,
        id:
          flowId.trim() === ""
            ? null
            : Number(flowId),
        fleet_type: fleetType.trim(),
        process: processName.trim(),
        detail: detail.trim(),
        process_level: nextProcessLevel,
        user: getCurrentUser(),
      };

      console.log("Create flow payload:", payload);

      const response = await fetch(
        FLOW_SAVE_API_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const responseText = await response.text();

      let result: FlowSaveResponse = {};

      if (responseText.trim()) {
        try {
          result = JSON.parse(responseText);
        } catch {
          throw new Error(
            "API ส่งข้อมูลกลับมาไม่ใช่รูปแบบ JSON"
          );
        }
      }

      const failed =
        !response.ok ||
        result.success === false ||
        result.status === false ||
        result.status === "error";

      if (failed) {
        throw new Error(
          result.message || "เพิ่มข้อมูลไม่สำเร็จ"
        );
      }

      await onSuccess();

      setFleetType("");
      setFlowId("");
      setProcessName("");
      setDetail("");
      setError("");

      onClose();
    } catch (err) {
      console.error("Create flow error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "เกิดข้อผิดพลาดในการเพิ่มข้อมูล"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <button
        type="button"
        aria-label="ปิดหน้าต่าง"
        disabled={submitting}
        onClick={closeModal}
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm disabled:cursor-not-allowed"
      />

      {/* Modal */}
      <div className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-teal-500 px-6 py-5 text-white">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 backdrop-blur-sm">
                <FilePlus2 className="h-5 w-5" />
              </span>

              <div>
                <h2 className="text-lg font-bold">
                  เพิ่มขั้นตอนกระบวนการใหม่
                </h2>

                <p className="mt-1 text-sm text-blue-50">
                  ระบุข้อมูลขั้นตอนการดำเนินงาน
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={closeModal}
              aria-label="ปิด"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6"
        >
          <div className="space-y-5">
            {/* Fleet type */}
            <div>
              <label
                htmlFor="create-fleet-type"
                className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"
              >
                <Truck className="h-4 w-4 text-blue-600" />

                ประเภทใบคำขอออกรถ
                <span className="text-red-500">*</span>
              </label>

              <select
                id="create-fleet-type"
                value={fleetType}
                disabled={submitting}
                onChange={(event) => {
                  setFleetType(event.target.value);
                  setError("");
                }}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                <option value="">
                  เลือกประเภทใบคำขอออกรถ
                </option>

                {availableFleetTypes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <p className="mt-1 text-xs text-slate-500">
                Fleet Type
              </p>
            </div>

            {/* Process level */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Layers3 className="h-4 w-4 text-blue-600" />

                ระดับขั้นตอน
                <span className="text-red-500">*</span>
              </label>

              <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-teal-50 p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-teal-500 text-base font-bold text-white shadow-md shadow-blue-200/60">
                  {nextProcessLevel}
                </span>

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    Process Level {nextProcessLevel}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {fleetType
                      ? `ลำดับถัดไปของประเภท “${fleetType}”`
                      : "เลือกประเภทใบคำขอออกรถเพื่อคำนวณลำดับ"}
                  </p>
                </div>
              </div>
            </div>

            {/* Process name */}
            <div>
              <label
                htmlFor="create-process-name"
                className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"
              >
                <Route className="h-4 w-4 text-blue-600" />

                ชื่อขั้นตอนกระบวนการทำงาน
                <span className="text-red-500">*</span>
              </label>

              <input
                id="create-process-name"
                type="text"
                value={processName}
                disabled={submitting}
                onChange={(event) => {
                  setProcessName(event.target.value);
                  setError("");
                }}
                placeholder="เช่น พิจารณาอนุมัติคำขอ, จัดหารถยนต์"
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              />

              <p className="mt-1 text-xs text-slate-500">
                Process Name
              </p>
            </div>

            {/* Detail */}
            <div>
              <label
                htmlFor="create-process-detail"
                className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"
              >
                <Text className="h-4 w-4 text-blue-600" />
                รายละเอียดเพิ่มเติม
              </label>

              <textarea
                id="create-process-detail"
                rows={4}
                value={detail}
                disabled={submitting}
                onChange={(event) => {
                  setDetail(event.target.value);
                  setError("");
                }}
                placeholder="ระบุรายละเอียดเพิ่มเติมของกระบวนการ..."
                className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              />

              <p className="mt-1 text-xs text-slate-500">
                Process Details
              </p>
            </div>

            {/* Preview */}
            {fleetType && processName.trim() && (
              <div className="rounded-2xl border border-teal-100 bg-teal-50/70 p-4">
                <p className="text-xs font-semibold text-teal-800">
                  ตัวอย่างข้อมูลที่จะบันทึก
                </p>

                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">
                      ประเภท
                    </span>

                    <span className="text-right font-semibold text-slate-900">
                      {fleetType}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">
                      ระดับ
                    </span>

                    <span className="font-semibold text-teal-700">
                      Level {nextProcessLevel}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-slate-500">
                      กระบวนการ
                    </span>

                    <span className="text-right font-semibold text-slate-900">
                      {processName.trim()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                <p className="text-sm leading-6 text-red-700">
                  {error}
                </p>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={closeModal}
              className="h-11 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              disabled={
                submitting ||
                !fleetType.trim() ||
                !processName.trim()
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blue-600 to-teal-500 px-4 text-sm font-semibold text-white shadow-md shadow-blue-200/60 transition hover:from-blue-700 hover:to-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}

              {submitting
                ? "กำลังบันทึก..."
                : "เพิ่มกระบวนการ"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
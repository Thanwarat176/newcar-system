"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  AlertCircle,
  Hash,
  Layers3,
  LoaderCircle,
  Pencil,
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
  updated_at?: string;
  updated_by?: string;
}

interface EditFlowModalProps {
  open: boolean;
  item: FlowItem | null;
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

export default function EditFlowModal({
  open,
  item,
  fleetTypes,
  onClose,
  onSuccess,
}: EditFlowModalProps) {
  const [fleetType, setFleetType] = useState("");
  const [processName, setProcessName] = useState("");
  const [detail, setDetail] = useState("");
  const [processLevel, setProcessLevel] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !item) {
      return;
    }

    setFleetType(
      String(item.fleet_type ?? "").trim()
    );

    setProcessName(
      String(item.process ?? "")
    );

    setDetail(
      String(item.detail ?? "")
    );

    setProcessLevel(
      String(item.process_level ?? "")
    );

    setError("");
  }, [open, item]);

  const closeModal = () => {
    if (submitting) {
      return;
    }

    setError("");
    onClose();
  };

  const getCurrentUser = () => {
    const storedUser =
      localStorage.getItem("user");

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

      return employeeId
        ? `${fullName || "ไม่ระบุชื่อ"} (${employeeId})`
        : fullName || "System";
    } catch {
      return storedUser;
    }
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!item) {
      return;
    }

    const flowId =
      item.id ?? item.flow_id;

    if (
      flowId === undefined ||
      flowId === null ||
      flowId === ""
    ) {
      setError("ไม่พบ ID ของข้อมูล");
      return;
    }

    if (!fleetType.trim()) {
      setError(
        "กรุณาเลือกประเภทใบคำขอออกรถ"
      );
      return;
    }

    if (!processName.trim()) {
      setError(
        "กรุณาระบุชื่อขั้นตอนกระบวนการทำงาน"
      );
      return;
    }

    const numericLevel =
      Number(processLevel);

    if (
      !Number.isInteger(numericLevel) ||
      numericLevel <= 0
    ) {
      setError(
        "ระดับขั้นตอนต้องเป็นจำนวนเต็มที่มากกว่า 0"
      );
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const payload = {
        mode: "edit",
        original_id: Number(flowId),

        // ส่งได้ แต่ PHP ห้ามนำไป SET id
        id: Number(flowId),

        fleet_type: fleetType.trim(),
        process: processName.trim(),
        detail: detail.trim(),
        process_level: numericLevel,
        user: getCurrentUser(),
      };

      console.log(
        "Edit flow payload:",
        payload
      );

      const response = await fetch(
        FLOW_SAVE_API_URL,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const responseText =
        await response.text();

      let result: FlowSaveResponse = {};

      if (responseText.trim()) {
        try {
          result = JSON.parse(
            responseText
          );
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
          result.message ||
            "แก้ไขข้อมูลไม่สำเร็จ"
        );
      }

      await onSuccess();

      onClose();
    } catch (err) {
      console.error(
        "Edit flow error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "เกิดข้อผิดพลาดในการแก้ไขข้อมูล"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !item) {
    return null;
  }

  const flowId =
    item.id ?? item.flow_id ?? "-";

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="ปิดหน้าต่าง"
        disabled={submitting}
        onClick={closeModal}
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm disabled:cursor-not-allowed"
      />

      <div className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-teal-500 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15">
                <Pencil className="h-5 w-5" />
              </span>

              <div>
                <h2 className="text-lg font-bold">
                  แก้ไขขั้นตอนกระบวนการ
                </h2>

                <p className="mt-1 text-sm text-blue-50">
                  แก้ไขข้อมูลขั้นตอนการดำเนินงาน
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={closeModal}
              aria-label="ปิด"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 transition hover:bg-white/20 disabled:opacity-50"
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
            {/* ID */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Hash className="h-4 w-4 text-blue-600" />
                รหัสขั้นตอน
              </label>

              <input
                type="text"
                value={flowId}
                disabled
                className="h-11 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-600"
              />

              <p className="mt-1 text-xs text-slate-500">
                ID ใช้ระบุรายการและไม่สามารถแก้ไขได้
              </p>
            </div>

            {/* Fleet type */}
            <div>
              <label
                htmlFor="edit-fleet-type"
                className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"
              >
                <Truck className="h-4 w-4 text-blue-600" />
                ประเภทใบคำขอออกรถ
                <span className="text-red-500">*</span>
              </label>

              <select
                id="edit-fleet-type"
                value={fleetType}
                disabled={submitting}
                onChange={(event) => {
                  setFleetType(
                    event.target.value
                  );
                  setError("");
                }}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:bg-slate-50"
              >
                <option value="">
                  เลือกประเภทใบคำขอออกรถ
                </option>

                {fleetTypes.map(
                  (fleetTypeOption) => (
                    <option
                      key={fleetTypeOption}
                      value={fleetTypeOption}
                    >
                      {fleetTypeOption}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* Process level */}
            <div>
              <label
                htmlFor="edit-process-level"
                className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"
              >
                <Layers3 className="h-4 w-4 text-blue-600" />
                ระดับขั้นตอน
                <span className="text-red-500">*</span>
              </label>

              <input
                id="edit-process-level"
                type="number"
                min={1}
                step={1}
                value={processLevel}
                disabled={submitting}
                onChange={(event) => {
                  setProcessLevel(
                    event.target.value
                  );
                  setError("");
                }}
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:bg-slate-50"
              />
            </div>

            {/* Process name */}
            <div>
              <label
                htmlFor="edit-process-name"
                className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"
              >
                <Route className="h-4 w-4 text-blue-600" />
                ชื่อขั้นตอนกระบวนการทำงาน
                <span className="text-red-500">*</span>
              </label>

              <input
                id="edit-process-name"
                type="text"
                value={processName}
                disabled={submitting}
                onChange={(event) => {
                  setProcessName(
                    event.target.value
                  );
                  setError("");
                }}
                placeholder="ชื่อกระบวนการ"
                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:bg-slate-50"
              />
            </div>

            {/* Detail */}
            <div>
              <label
                htmlFor="edit-process-detail"
                className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"
              >
                <Text className="h-4 w-4 text-blue-600" />
                รายละเอียดเพิ่มเติม
              </label>

              <textarea
                id="edit-process-detail"
                rows={4}
                value={detail}
                disabled={submitting}
                onChange={(event) => {
                  setDetail(
                    event.target.value
                  );
                  setError("");
                }}
                placeholder="ระบุรายละเอียดเพิ่มเติม..."
                className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:bg-slate-50"
              />
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

                <p className="text-sm leading-6 text-red-700">
                  {error}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={closeModal}
              className="h-11 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
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
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blue-600 to-teal-500 px-4 text-sm font-semibold text-white transition hover:from-blue-700 hover:to-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Pencil className="h-4 w-4" />
              )}

              {submitting
                ? "กำลังบันทึก..."
                : "บันทึกการแก้ไข"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
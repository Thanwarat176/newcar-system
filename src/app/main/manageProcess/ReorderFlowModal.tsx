"use client";

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

export interface ReorderModalState {
  open: boolean;
  item: FlowItem | null;
  targetItem: FlowItem | null;
  replacementItem: FlowItem | null;
  fleetType: string;
  oldLevel: number;
  newLevel: number;
}

export interface AffectedProcess extends FlowItem {
  oldLevel: number;
  newLevel: number;
}

interface ReorderFlowModalProps {
  modal: ReorderModalState;
  affectedProcesses: AffectedProcess[];
  remark: string;
  reordering: boolean;
  onRemarkChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export default function ReorderFlowModal({
  modal,
  affectedProcesses,
  remark,
  reordering,
  onRemarkChange,
  onClose,
  onConfirm,
}: ReorderFlowModalProps) {
  if (!modal.open || !modal.item) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <button
        type="button"
        aria-label="ปิดหน้าต่าง"
        disabled={reordering}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm disabled:cursor-not-allowed"
      />

      {/* Modal */}
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-teal-500 px-6 py-5 text-white">
          <h2 className="text-lg font-bold">
            ยืนยันการเปลี่ยนลำดับ
          </h2>

          <p className="mt-1 text-sm text-blue-50">
            ตรวจสอบลำดับที่เปลี่ยนแปลงก่อนบันทึก
          </p>
        </div>

        <div className="p-5">
          {/* Fleet type */}
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-teal-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs text-slate-500">
                  ประเภทรถ
                </p>

                <p className="mt-1 truncate font-bold text-slate-900">
                  {modal.fleetType}
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 shadow-sm">
                {affectedProcesses.length + 1} รายการเปลี่ยนแปลง
              </span>
            </div>

            <div className="my-3 h-px bg-blue-100" />

            <p className="text-xs text-slate-500">
              กระบวนการที่ต้องการย้าย
            </p>

            <p className="mt-1 font-semibold text-slate-900">
              {modal.item.process || "-"}
            </p>
          </div>

          {/* Main process */}
          <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50 p-4">
            <p className="text-xs font-semibold text-teal-800">
              กระบวนการหลัก
            </p>

            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="min-w-0 flex-1 text-sm font-semibold text-slate-900">
                {modal.item.process || "-"}
              </p>

              <div className="flex shrink-0 items-center gap-2">
                <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-white px-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200">
                  {modal.oldLevel}
                </span>

                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4 text-teal-600"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 12h14m-5-5 5 5-5 5"
                  />
                </svg>

                <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-teal-500 px-2 text-sm font-bold text-white">
                  {modal.newLevel}
                </span>
              </div>
            </div>
          </div>

          {/* Affected processes */}
          {affectedProcesses.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50">
              <div className="border-b border-amber-200 px-4 py-3">
                <p className="text-sm font-semibold text-amber-900">
                  กระบวนการที่เปลี่ยนลำดับตาม
                </p>

                <p className="mt-0.5 text-xs text-amber-700">
                  ระบบจะปรับลำดับรายการต่อไปนี้อัตโนมัติ
                </p>
              </div>

              <div className="divide-y divide-amber-200/70">
                {affectedProcesses.map((item, index) => (
                  <div
                    key={
                      item.id ??
                      item.flow_id ??
                      `${item.process}-${item.oldLevel}-${index}`
                    }
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {item.process || "-"}
                      </p>

                      {item.detail && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                          {item.detail}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-white px-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200">
                        {item.oldLevel}
                      </span>

                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-4 w-4 text-amber-600"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 12h14m-5-5 5 5-5 5"
                        />
                      </svg>

                      <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-amber-200 px-2 text-sm font-bold text-amber-900">
                        {item.newLevel}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm leading-6 text-slate-700">
              ยืนยันย้าย{" "}
              <span className="font-semibold text-blue-700">
                “{modal.item.process || "-"}”
              </span>{" "}
              ของประเภทรถ{" "}
              <span className="font-semibold text-slate-900">
                “{modal.fleetType}”
              </span>{" "}
              จากลำดับ{" "}
              <span className="font-bold text-slate-900">
                {modal.oldLevel}
              </span>{" "}
              ไปเป็นลำดับ{" "}
              <span className="font-bold text-teal-700">
                {modal.newLevel}
              </span>
            </p>
          </div>

          {/* Remark */}
          <div className="mt-4">
            <label
              htmlFor="reorder-remark"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Remark
            </label>

            <textarea
              id="reorder-remark"
              value={remark}
              disabled={reordering}
              onChange={(event) =>
                onRemarkChange(event.target.value)
              }
              rows={3}
              placeholder="ระบุเหตุผลหรือรายละเอียดการเปลี่ยนลำดับ..."
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
          </div>

          {/* Buttons */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={reordering}
              onClick={onClose}
              className="h-11 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              ยกเลิก
            </button>

            <button
              type="button"
              disabled={reordering}
              onClick={() => void onConfirm()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blue-600 to-teal-500 text-sm font-semibold text-white transition hover:from-blue-700 hover:to-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {reordering && (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-4 w-4 animate-spin"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    d="M20 12a8 8 0 1 1-2.34-5.66"
                  />
                </svg>
              )}

              {reordering ? "กำลังบันทึก..." : "ยืนยัน"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
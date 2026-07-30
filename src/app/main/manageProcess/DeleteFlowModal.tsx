"use client";

import {
  AlertTriangle,
  LoaderCircle,
  Trash2,
  X,
} from "lucide-react";

export interface FlowItem {
  id?: number | string;
  flow_id?: number | string;
  fleet_type?: string;
  process_level?: number | string;
  process?: string;
  detail?: string;
}

interface DeleteFlowModalProps {
  open: boolean;
  item: FlowItem | null;
  deleting: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export default function DeleteFlowModal({
  open,
  item,
  deleting,
  error = "",
  onClose,
  onConfirm,
}: DeleteFlowModalProps) {
  if (!open || !item) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Overlay */}
      <button
        type="button"
        aria-label="ปิดหน้าต่าง"
        disabled={deleting}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm disabled:cursor-not-allowed"
      />

      {/* Modal */}
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-red-100 bg-red-50 px-6 py-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <AlertTriangle className="h-5 w-5" />
            </span>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                ยืนยันการลบข้อมูล
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                กรุณาตรวจสอบข้อมูลก่อนดำเนินการ
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={deleting}
            onClick={onClose}
            aria-label="ปิด"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm leading-6 text-slate-700">
            คุณต้องการลบข้อมูลนี้ใช่หรือไม่?
          </p>

          {/* Detail */}
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <div className="divide-y divide-slate-200">
              <div className="flex items-start justify-between gap-4 px-4 py-3">
                <span className="text-sm text-slate-500">
                  รหัสขั้นตอน
                </span>

                <span className="text-right text-sm font-semibold text-slate-900">
                  {item.id ?? item.flow_id ?? "-"}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4 px-4 py-3">
                <span className="text-sm text-slate-500">
                  ประเภทรถ
                </span>

                <span className="text-right text-sm font-semibold text-slate-900">
                  {item.fleet_type || "-"}
                </span>
              </div>

              <div className="flex items-start justify-between gap-4 px-4 py-3">
                <span className="text-sm text-slate-500">
                  ระดับขั้นตอน
                </span>

                <span className="text-right text-sm font-semibold text-slate-900">
                  Level {item.process_level || "-"}
                </span>
              </div>

              <div className="px-4 py-3">
                <span className="text-sm text-slate-500">
                  ชื่อกระบวนการ
                </span>

                <p className="mt-1 text-sm font-semibold leading-6 text-slate-900">
                  {item.process || "-"}
                </p>
              </div>

            </div>
          </div>

          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm leading-6 text-red-700">
              เมื่อลบแล้ว ข้อมูลนี้จะไม่สามารถเรียกคืนได้
            </p>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm leading-6 text-red-700">
                {error}
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={deleting}
              onClick={onClose}
              className="h-11 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              ยกเลิก
            </button>

            <button
              type="button"
              disabled={deleting}
              onClick={() => void onConfirm()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}

              {deleting ? "กำลังลบ..." : "ยืนยันการลบ"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
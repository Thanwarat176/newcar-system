"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Clock, X } from "lucide-react";

export default function SystemUpdateModal() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="system-update-title"
        aria-describedby="system-update-description"
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="h-1.5 bg-amber-400" />

        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="ปิดแจ้งเตือน"
          className="absolute right-3 top-4 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={18} />
        </button>

        <div className="p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <AlertTriangle size={25} />
          </div>

          <h2
            id="system-update-title"
            className="pr-6 text-lg font-semibold text-slate-900"
          >
            แจ้งปรับปรุงข้อมูลภายในระบบ
          </h2>

          <p
            id="system-update-description"
            className="mt-3 text-sm leading-7 text-slate-600"
          >
            ขณะนี้ระบบอยู่ระหว่างการปรับปรุงข้อมูล
            ส่งผลให้ข้อมูลที่แสดงในหน้านี้อาจยังไม่เป็นปัจจุบัน
            และยังไม่สามารถอัปเดตได้ชั่วคราว
          </p>

          <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Clock size={18} className="mt-0.5 shrink-0 text-amber-600" />

            <div>
              <p className="text-xs font-medium text-amber-700">
                กำหนดอัปเดตข้อมูล
              </p>
              <p className="mt-1 text-sm font-semibold text-amber-950">
                วันนี้ 21/10/2569 เวลา 18:00 น.
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs leading-6 text-slate-400">
            ขออภัยในความไม่สะดวก
            กรุณาตรวจสอบข้อมูลอีกครั้งหลังจากเวลาดังกล่าว
          </p>

          <button
            type="button"
            autoFocus
            onClick={() => setOpen(false)}
            className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
          >
            รับทราบ
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
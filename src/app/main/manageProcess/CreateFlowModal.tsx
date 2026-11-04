"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { AlertCircle, FilePlus2, LoaderCircle, Plus, Trash2, X } from "lucide-react";

export interface FlowItem {
  id?: number | string;
  flow_id?: number | string;
  type?: number | string;
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
interface DraftRow { key: number; process: string; detail: string; sla: string }
interface SaveResponse { status?: boolean | string; success?: boolean; message?: string }
const API_BASE = "http://192.168.158.210/api_new_truck/api";

function getCurrentUser(): string {
  const stored = localStorage.getItem("user");
  if (!stored) return "System";
  try {
    const user = JSON.parse(stored);
    if (!user || typeof user !== "object") return "System";
    const name = [user.name, user.surname].filter(Boolean).join(" ").trim();
    const id = user.em_id || user.employee_id || user.username;
    return id ? `${name || "ไม่ระบุชื่อ"} (${id})` : name || "System";
  } catch { return stored; }
}

export default function CreateFlowModal({ open, flowData, fleetTypes, onClose, onSuccess }: CreateFlowModalProps) {
  const [typeRoles, setTypeRoles] = useState<Record<string, string>>({});
  const [roleChanges, setRoleChanges] = useState<Record<string, string>>({});
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [rows, setRows] = useState<DraftRow[]>([{ key: 1, process: "", detail: "", sla: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [uncertain, setUncertain] = useState(false);
  const [completed, setCompleted] = useState(false);
  const nextKey = useRef(2);
  const busy = useRef(false);
  const savedLevels = useRef<Record<string, number>>({});
  const availableFleetTypes = useMemo(() => Array.from(new Set([
    ...fleetTypes, ...flowData.map(item => item.fleet_type || ""),
  ].map(value => value.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "th")), [fleetTypes, flowData]);
  const nextLevels = useMemo(() => Object.fromEntries(selectedTypes.map(type => {
    const levels = flowData.filter(item => item.fleet_type?.trim() === type)
      .map(item => Number(item.process_level)).filter(level => Number.isSafeInteger(level) && level > 0);
    return [type, Math.max(0, ...levels) + 1];
  })), [selectedTypes, flowData]);
  useEffect(() => {
    if (!open) return;
    setSelectedTypes([]);
    setRoleChanges({});
    setRows([{ key: 1, process: "", detail: "", sla: "" }]);
    nextKey.current = 2;
    savedLevels.current = {};
    setError(""); setNotice(""); setUncertain(false); setCompleted(false);
    setProgress({ done: 0, total: 0 });
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setRolesLoading(true); setRolesError(""); setTypeRoles({});
    void (async () => {
      try {
        const response = await fetch(`${API_BASE}/master_type.php`, { cache: "no-store", signal: controller.signal });
        const result = await response.json();
        if (!response.ok || result.status !== "success" || !Array.isArray(result.data)) throw new Error("โหลด Role ของประเภทคำขอไม่สำเร็จ");
        if (!controller.signal.aborted) setTypeRoles(Object.fromEntries(result.data.map((item: {type: string; role?: string | null}) => [item.type, item.role || ""])));
      } catch (err) { if (!controller.signal.aborted) setRolesError(err instanceof Error ? err.message : "โหลด Role ไม่สำเร็จ"); }
      finally { if (!controller.signal.aborted) setRolesLoading(false); }
    })();
    return () => controller.abort();
  }, [open]);
  const locked = submitting || uncertain || completed;
  const closeModal = () => { if (!busy.current) onClose(); };
  const updateRow = (key: number, field: "process" | "detail" | "sla", value: string) => {
    setRows(current => current.map(row => row.key === key ? { ...row, [field]: value } : row));
    setError("");
  };
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy.current || locked) return;
    if (!selectedTypes.length || selectedTypes.some(type => !availableFleetTypes.includes(type))) { setError("กรุณาเลือกประเภทคำขอ"); return; }
    const emptyIndex = rows.findIndex(row => !row.process.trim());
    if (emptyIndex !== -1) { setError(`กรุณาระบุชื่อขั้นตอนแถวที่ ${emptyIndex + 1} หรือลบแถวนั้น`); return; }
    if (rows.some(row => row.sla.trim() !== "" && (!Number.isSafeInteger(Number(row.sla)) || Number(row.sla) < 1 || Number(row.sla) > 1000))) { setError("SLA ต้องเป็นจำนวนเต็ม 1–1000 หรือเว้นว่าง"); return; }
    for (const type of selectedTypes) {
      if (roleChanges[type] !== undefined && (!roleChanges[type].trim() || roleChanges[type].split(",").some(role => !["DC", "TC", "CT"].includes(role.trim().toUpperCase())))) { setError(`Role ของ ${type} ต้องเป็น DC, TC หรือ CT คั่นด้วยจุลภาค`); return; }
    }
    if (!rows.length) return;
    busy.current = true; setSubmitting(true); setError(""); setNotice("");
    const batch = rows.map(row => ({ ...row }));
    const confirmed = new Set<string>();
    const total = batch.length * selectedTypes.length;
    let currentType = "";
    setProgress({ done: 0, total });
    let requestPending = false;
    try {
      for (const fleetType of selectedTypes) {
      currentType = fleetType;
      // อ่านลำดับล่าสุดก่อนเริ่มชุด เพื่อไม่ใช้ข้อมูลเก่าจากหน้าหลัก
      const latestResponse = await fetch(`${API_BASE}/flow_get.php?fleet_type=${encodeURIComponent(fleetType)}`, { cache: "no-store", headers: { Accept: "application/json" } });
      const latest = await latestResponse.json();
      if (!latestResponse.ok || latest.status === "error" || latest.success === false || !Array.isArray(latest.data)) throw new Error(latest.message || "ตรวจสอบลำดับขั้นตอนล่าสุดไม่สำเร็จ");
      const levels = (latest.data as FlowItem[]).map(item => Number(item.process_level)).filter(level => Number.isSafeInteger(level) && level > 0);
      const firstLevel = Math.max(0, savedLevels.current[fleetType] || 0, ...levels) + 1;
      const user = getCurrentUser();

      for (let index = 0; index < batch.length; index++) {
        const row = batch[index];
        requestPending = true;
        const response = await fetch(`${API_BASE}/flow_save.php`, {
          method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ mode: "add", original_id: null, id: null, fleet_type: fleetType,
            process: row.process.trim(), detail: row.detail.trim(),
            ...(row.sla.trim() !== "" ? { sla: Number(row.sla) } : {}),
            ...(index === 0 && roleChanges[fleetType] !== undefined ? { role: roleChanges[fleetType] } : {}), process_level: firstLevel + index, user }),
        });
        const result: SaveResponse = await response.json();
        const success = result.success === true || result.status === true || result.status === "success";
        if (!response.ok || !success || result.success === false || result.status === false || result.status === "error") {
          // บาง API อาจเขียนข้อมูลแล้วจึงส่งข้อผิดพลาด จึงไม่ส่งซ้ำอัตโนมัติ
          throw new Error(result.message || "API ไม่ยืนยันการบันทึกสำเร็จ");
        }
        requestPending = false;
        confirmed.add(`${fleetType}:${row.key}`);
        savedLevels.current[fleetType] = firstLevel + index;

        setProgress({ done: confirmed.size, total });
      }
      }
      setCompleted(true);
      setNotice(`เพิ่มสำเร็จ ${selectedTypes.length} ประเภท × ${batch.length} ขั้นตอน รวม ${total} รายการ`);
    } catch (err) {
      if (requestPending || confirmed.size > 0) setUncertain(true);
      const reason = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      setError(`บันทึกสำเร็จ ${confirmed.size} จาก ${total} รายการ (ประเภท ${currentType}): ${reason}${requestPending || confirmed.size > 0 ? " — กรุณาปิดและตรวจสอบข้อมูลก่อนเพิ่มซ้ำ เพื่อไม่ให้ซ้ำกับรายการที่บันทึกแล้ว" : ""}`);
    } finally {
      if (confirmed.size > 0) {
        try { await onSuccess(); }
        catch { setNotice(`บันทึกสำเร็จ ${confirmed.size} ขั้นตอน แต่รีเฟรชไม่สำเร็จ กรุณารีเฟรชหน้าหลัก`); }
      }
      busy.current = false; setSubmitting(false);
    }
  };
  if (!open) return null;
  const inputClass = "w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100";
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
      <button type="button" aria-label="ปิดหน้าต่าง" disabled={submitting} onClick={closeModal} className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" />
      <section role="dialog" aria-modal="true" aria-labelledby="create-flow-title" aria-busy={submitting} className="relative w-full overflow-hidden rounded-2xl bg-white shadow-2xl" style={{ width: "min(760px, 100%)", maxWidth: 760, height: "85dvh", maxHeight: "calc(100dvh - 24px)", display: "grid", gridTemplateRows: "auto minmax(0, 1fr)" }}>
        <header className="flex shrink-0 items-start justify-between gap-3 bg-white px-5 py-4 text-slate-800 shadow-sm">
          <div><h2 id="create-flow-title" className="flex items-center gap-2 text-base font-semibold"><FilePlus2 className="h-5 w-5" />เพิ่มหลายขั้นตอนพร้อมกัน</h2><p className="mt-1 text-xs text-slate-500">เลือกประเภท เพิ่มแถว และกรอกขั้นตอนตามลำดับที่ต้องการ</p></div>
          <button type="button" disabled={submitting} onClick={closeModal} aria-label="ปิด" className="rounded-lg p-1 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </header>
        <form onSubmit={handleSubmit} className="min-h-0 overflow-hidden text-black" style={{ display: "grid", gridTemplateRows: "minmax(0, 1fr) auto" }}>
          <div className="min-h-0" style={{ overflowY: "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}>
          <div className="space-y-2 border-b border-slate-100 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <p id="create-fleet-type-label" className="text-xs font-semibold text-slate-700">ประเภทใบคำขอออกรถ <span className="text-blue-600">({selectedTypes.length} / {availableFleetTypes.length})</span></p>
              <button type="button" disabled={locked} onClick={() => { setSelectedTypes(selectedTypes.length === availableFleetTypes.length ? [] : [...availableFleetTypes]); setError(""); }} className="text-xs font-medium text-blue-600 disabled:opacity-40">{selectedTypes.length === availableFleetTypes.length ? "ยกเลิกทั้งหมด" : "เลือกทั้งหมด"}</button>
            </div>
            <div role="group" aria-labelledby="create-fleet-type-label" className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {availableFleetTypes.map(type => <label key={type} className={`flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-xs leading-5 ${selectedTypes.includes(type) ? "bg-blue-50 text-blue-800 shadow-sm" : "bg-slate-50 text-slate-600"}`}>
                <input type="checkbox" checked={selectedTypes.includes(type)} disabled={locked} onChange={() => { setSelectedTypes(current => current.includes(type) ? current.filter(value => value !== type) : [...current, type]); setError(""); }} className="mt-1 h-3.5 w-3.5 shrink-0 accent-blue-600" />
                <span className="min-w-0 break-words">{type}<span className="block text-[10px] text-slate-400">เริ่มลำดับ {nextLevels[type] ?? Math.max(0, ...flowData.filter(flow => flow.fleet_type?.trim() === type).map(flow => Number(flow.process_level)).filter(Number.isFinite)) + 1}</span></span>
              </label>)}
            </div>
            <p className="text-[11px] text-slate-500">ใช้ชุดขั้นตอนเดียวกันกับทุกประเภทที่เลือก โดยต่อท้ายลำดับเดิมของแต่ละประเภท</p>
          </div>
          <div className="px-4 py-3">
            {rolesLoading && <p className="mb-2 text-xs text-slate-500">กำลังโหลด Role...</p>}
            {rolesError && <p role="alert" className="mb-2 text-xs text-red-600">{rolesError} (หากไม่แก้ Role ระบบจะคงค่าเดิม)</p>}
            {selectedTypes.length > 0 && <div className="mb-4 space-y-2 rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-700">Role ของแต่ละประเภท</p>
              <p className="text-[11px] text-slate-500">เลือกคลังขอ ส่วนกลางขอ หรือขอได้ทั้งคู่ — การเปลี่ยนมีผลกับประเภทนี้ทั้งระบบ</p>
              {selectedTypes.map(type => <label key={type} className="grid items-center gap-2 text-xs sm:grid-cols-[minmax(0,1fr)_150px]"><span>{type}</span><select aria-label={`Role ${type}`} value={roleChanges[type] ?? ((typeRoles[type]?.split(",").map(value => value.trim()).sort().join(",") === "DC,TC" ? "TC,DC" : typeRoles[type] || ""))} disabled={locked || rolesLoading || !!rolesError} onChange={event => setRoleChanges(current => ({ ...current, [type]: event.target.value }))} className={inputClass}>
                  <option value="" disabled>เลือกการใช้งาน</option>
                  <option value="DC">คลังขอ</option>
                  <option value="CT">ส่วนกลางขอ</option>
                  <option value="TC,DC">ขอได้ทั้งคู่</option>
                  {typeRoles[type] && !["DC", "CT", "DC,TC"].includes(typeRoles[type].split(",").map(value => value.trim()).sort().join(",")) && <option value={typeRoles[type]} disabled>ค่าเดิม: {typeRoles[type]} (กรุณาเลือกใหม่)</option>}
                </select></label>)}
            </div>}

            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 bg-blue-50 px-3 py-2.5"><h3 className="text-xs font-semibold text-blue-900">ขั้นตอนใหม่ ({rows.length})</h3><span className="text-[11px] text-slate-500">ใช้ชุดนี้กับทุกประเภทที่เลือก</span></div>
              <div style={{ overflowX: "auto" }}><table className="w-full table-fixed text-left text-xs" style={{ minWidth: 680 }}>
                <colgroup><col style={{ width: 48 }} /><col style={{ width: "32%" }} /><col /><col style={{ width: 85 }} /><col style={{ width: 42 }} /></colgroup>
                <thead className="bg-slate-50 text-[11px] text-slate-500"><tr><th className="px-2 py-2 font-medium">ลำดับ</th><th className="px-2 py-2 font-medium">ชื่อขั้นตอน *</th><th className="px-2 py-2 font-medium">คำที่ใช้แจ้งเตือนเมื่อจะครบกำหนด SLA</th><th className="px-2 py-2 font-medium">SLA (วัน)</th><th className="px-2 py-2 font-medium">ลบ</th></tr></thead>
                <tbody>{rows.map((row, index) => <tr key={row.key} className="border-t border-slate-100">
                  <td className="px-2 py-2 text-center text-slate-500">{index + 1}</td>
                  <td className="px-2 py-2"><input aria-label={`ชื่อขั้นตอนแถว ${index + 1}`} value={row.process} disabled={locked} onChange={event => updateRow(row.key, "process", event.target.value)} placeholder="ชื่อขั้นตอน" className={inputClass} /></td>
                  <td className="px-2 py-2"><input aria-label={`ข้อความแจ้งเตือนแถว ${index + 1}`} value={row.detail} disabled={locked} onChange={event => updateRow(row.key, "detail", event.target.value)} placeholder="ข้อความแจ้งเตือน" className={inputClass} /></td>
                  <td className="px-2 py-2"><input aria-label={`SLA แถว ${index + 1}`} type="number" min={1} max={1000} step={1} value={row.sla} disabled={locked} onChange={event => updateRow(row.key, "sla", event.target.value)} placeholder="วัน" className={`${inputClass} text-center`} /></td>
                  <td className="px-1 py-2"><button type="button" disabled={locked || rows.length <= 1} onClick={() => setRows(current => current.filter(item => item.key !== row.key))} aria-label={`ลบแถวที่ ${index + 1}`} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button></td>
                </tr>)}</tbody>
              </table></div>
            </div>
            {!completed && <button type="button" disabled={locked} onClick={() => { const key = nextKey.current++; setRows(current => [...current, { key, process: "", detail: "", sla: "" }]); }} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-blue-300 py-3 text-xs font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-40"><Plus className="h-4 w-4" />เพิ่มแถวขั้นตอน</button>}
          </div>
          </div>
          <footer className="shrink-0 border-t border-slate-200 px-5 py-3">
            {error && <div role="alert" className="mb-3 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-xs leading-5 text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><p>{error}</p></div>}
            {notice && <p role="status" className="mb-3 rounded-lg bg-teal-50 p-3 text-xs text-teal-800">{notice}</p>}
            <div className="flex flex-wrap items-center justify-between gap-3"><p aria-live="polite" className="text-xs text-slate-500">{submitting ? `กำลังบันทึก ${progress.done} / ${progress.total} ขั้นตอน` : completed ? "บันทึกเรียบร้อย" : `${selectedTypes.length} ประเภท × ${rows.length} ขั้นตอน = ${selectedTypes.length * rows.length} รายการ`}</p><div className="flex gap-2"><button type="button" disabled={submitting} onClick={closeModal} className="rounded-lg border border-slate-300 px-4 py-2 text-xs text-slate-600">{completed || uncertain ? "ปิด" : "ยกเลิก"}</button><button type="submit" disabled={locked || !selectedTypes.length || !rows.length || rows.some(row => !row.process.trim())} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">{submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}บันทึกทุกขั้นตอน</button></div></div>
          </footer>
        </form>
      </section>
    </div>
  );
}

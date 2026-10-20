"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Check, ChevronDown, ChevronUp, LoaderCircle, Pencil, X } from "lucide-react";

export interface FlowItem {
  id?: number | string;
  flow_id?: number | string;
  type?: number | string;
  fleet_type?: string;
  process_level?: number | string;
  process?: string;
  detail?: string;
  sla?: number | string | null;
  sla_unit?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
}
interface EditFlowModalProps {
  open: boolean;
  item: FlowItem | null;
  flowData: FlowItem[];
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}
type EditField = "process" | "detail" | "sla";
type FieldValue = string | number | null;
interface ProcessGroup { level: number; items: FlowItem[] }
interface SaveResponse { success?: boolean; status?: boolean | string; message?: string }
interface LevelUpdate {
  process_level: number;
  changes: Partial<Record<EditField, string | number>>;
  targets: { id: number; original_values: Partial<Record<EditField, FieldValue>> }[];
}
const SAVE_URL = "http://192.168.158.210/api_new_truck/api/flow_save.php";
const FIELDS: { key: EditField; label: string }[] = [
  { key: "process", label: "ชื่อกระบวนการ" },
  { key: "detail", label: "รายละเอียด / ข้อความวิกฤต" },
  { key: "sla", label: "SLA (วัน)" },
];
const getFlowId = (item: FlowItem) => item.id ?? item.flow_id;
const getFleetType = (item: FlowItem) => String(item.fleet_type ?? "").trim() || "ไม่ระบุประเภท";
function getOriginalValue(item: FlowItem, field: EditField): FieldValue {
  if (field === "sla") return item.sla == null || String(item.sla).trim() === "" ? null : Number(item.sla);
  return String(item[field] ?? "");
}
function getCurrentUser(): string {
  const stored = localStorage.getItem("user");
  if (!stored) return "System";
  try {
    const user = JSON.parse(stored);
    if (!user || typeof user !== "object") return "System";
    const name = [user.name, user.surname].filter(Boolean).join(" ").trim();
    const id = user.em_id || user.employee_id || user.username || "";
    return id ? `${name || "ไม่ระบุชื่อ"} (${id})` : name || "System";
  } catch { return stored; }
}

export default function EditFlowModal({ open, item, flowData, onClose, onSuccess }: EditFlowModalProps) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<number[]>([]);
  const [typesExpanded, setTypesExpanded] = useState(true);
  const [enabledFields, setEnabledFields] = useState<EditField[]>(["process", "detail"]);
  const [drafts, setDrafts] = useState<Record<EditField, Record<number, string>>>({ process: {}, detail: {}, sla: {} });
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    setSelectedTypes(item ? [getFleetType(item)] : []);
    setSelectedLevels([]);
    setTypesExpanded(true);
    setEnabledFields(["process", "detail"]);
    setDrafts({ process: {}, detail: {}, sla: {} });
    setSaved(false);
    setError("");
  }, [open, item]);
  const fleetTypes = useMemo(() => Array.from(new Set(flowData.map(getFleetType))).sort((a, b) => a.localeCompare(b, "th")), [flowData]);
  const activeTypes = fleetTypes.filter(type => selectedTypes.includes(type));
  const groups = useMemo<ProcessGroup[]>(() => {
    const map = new Map<number, FlowItem[]>();
    for (const flow of flowData) {
      if (!selectedTypes.includes(getFleetType(flow))) continue;
      const level = Number(flow.process_level);
      if (!Number.isInteger(level) || level <= 0) continue;
      const items = map.get(level) ?? [];
      items.push(flow);
      map.set(level, items);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b).map(([level, items]) => ({ level, items }));
  }, [flowData, selectedTypes]);
  const selectedGroups = groups.filter(group => selectedLevels.includes(group.level));
  function getValues(group: ProcessGroup, field: EditField): FieldValue[] {
    return Array.from(new Set(group.items.map(flow => getOriginalValue(flow, field))));
  }
  function getDraft(group: ProcessGroup, field: EditField): string {
    const draft = drafts[field][group.level];
    if (draft !== undefined) return draft;
    const values = getValues(group, field);
    return values.length === 1 ? String(values[0] ?? "") : "";
  }
  function unresolved(group: ProcessGroup, field: EditField): boolean {
    return getValues(group, field).length > 1 && drafts[field][group.level] === undefined;
  }
  function fieldValid(group: ProcessGroup, field: EditField): boolean {
    if (unresolved(group, field)) return false;
    const value = getDraft(group, field).trim();
    if (field === "process") return value !== "";
    if (field === "sla") return value !== "" && Number.isSafeInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 2147483647;
    return true;
  }
  function getChanges(group: ProcessGroup): Partial<Record<EditField, string | number>> {
    const changes: Partial<Record<EditField, string | number>> = {};
    for (const field of enabledFields) {
      if (!fieldValid(group, field)) continue;
      const text = getDraft(group, field).trim();
      const value = field === "sla" ? Number(text) : text;
      if (group.items.some(flow => getOriginalValue(flow, field) !== value)) changes[field] = value;
    }
    return changes;
  }
  const changedGroups = selectedGroups.filter(group => Object.keys(getChanges(group)).length > 0);
  const changedItemCount = changedGroups.reduce((total, group) => {
    const changes = getChanges(group);
    const fields = Object.keys(changes) as EditField[];
    return total + group.items.filter(flow => fields.some(field => getOriginalValue(flow, field) !== changes[field])).length;
  }, 0);
  const hasInvalidFields = selectedGroups.some(group => enabledFields.some(field => !fieldValid(group, field)));
  const allTypesSelected = fleetTypes.length > 0 && fleetTypes.every(type => selectedTypes.includes(type));
  const allLevelsSelected = groups.length > 0 && groups.every(group => selectedLevels.includes(group.level));
  const locked = submitting || saved;
  const closeModal = () => { if (!submitting) onClose(); };
  const changeTypes = (types: string[]) => {
    setSelectedTypes(types); setSelectedLevels([]); setDrafts({ process: {}, detail: {}, sla: {} }); setError("");
  };
  const toggleType = (type: string) => changeTypes(selectedTypes.includes(type) ? selectedTypes.filter(value => value !== type) : [...selectedTypes, type]);
  const toggleLevel = (level: number) => {
    setSelectedLevels(current => current.includes(level) ? current.filter(value => value !== level) : [...current, level]); setError("");
  };
  const toggleField = (field: EditField) => {
    setEnabledFields(current => current.includes(field) ? current.filter(value => value !== field) : [...current, field]); setError("");
  };
  const updateDraft = (level: number, field: EditField, value: string) => {
    setDrafts(current => ({ ...current, [field]: { ...current[field], [level]: value } })); setError("");
  };
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (locked) return;
    if (!activeTypes.length || !selectedGroups.length) { setError("กรุณาเลือกประเภทรถและระดับ"); return; }
    if (!enabledFields.length) { setError("กรุณาติ๊กหัวข้อที่ต้องการบันทึก"); return; }
    if (hasInvalidFields) { setError("กรุณาตรวจสอบช่องที่เลือก ชื่อห้ามว่าง และ SLA ต้องเป็นจำนวนเต็มตั้งแต่ 0 ถึง 2147483647"); return; }
    if (!changedGroups.length) { setError("ยังไม่มีข้อมูลที่เปลี่ยนแปลง"); return; }
    const updates: LevelUpdate[] = changedGroups.map(group => {
      const changes = getChanges(group);
      const fields = Object.keys(changes) as EditField[];
      return {
        process_level: group.level, changes,
        targets: group.items.map(flow => {
          const originalValues: Partial<Record<EditField, FieldValue>> = {};
          for (const field of fields) originalValues[field] = getOriginalValue(flow, field);
          return { id: Number(getFlowId(flow)), original_values: originalValues };
        }),
      };
    });
    const ids = updates.flatMap(update => update.targets.map(target => target.id));
    if (ids.some(id => !Number.isSafeInteger(id) || id <= 0) || new Set(ids).size !== ids.length) { setError("พบ ID ไม่ถูกต้องหรือซ้ำ กรุณารีเฟรชข้อมูล"); return; }
    try {
      setSubmitting(true); setError("");
      const response = await fetch(SAVE_URL, {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ mode: "bulk_edit_fields", updates, user: getCurrentUser() }),
      });
      const text = await response.text();
      let result: SaveResponse;
      try {
        const parsed: unknown = JSON.parse(text);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
        result = parsed as SaveResponse;
      } catch { throw new Error("API ส่งข้อมูลกลับมาไม่ใช่ JSON ที่ถูกต้อง"); }
      const success = result.success === true || result.status === true || result.status === "success";
      if (!response.ok || !success || result.success === false || result.status === false || result.status === "error") throw new Error(result.message || "บันทึกไม่สำเร็จ");
      setSaved(true);
      try { await onSuccess(); onClose(); }
      catch { setError("บันทึกสำเร็จแล้ว แต่รีเฟรชไม่สำเร็จ กรุณาปิดและรีเฟรชหน้า"); }
    } catch (err) { setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก"); }
    finally { setSubmitting(false); }
  };
  if (!open || typeof document === "undefined") return null;
  const inputClass = "block w-full min-w-0 rounded-lg border bg-white px-2.5 py-2 text-xs leading-5 text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4" style={{ zIndex: 2147483000 }}>
      <button type="button" aria-label="ปิดหน้าต่าง" disabled={submitting} onClick={closeModal} className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" />
      <section
  role="dialog"
  aria-modal="true"
  aria-labelledby="bulk-edit-title"
  aria-busy={submitting}
  className="relative flex min-h-0 flex-col overflow-hidden rounded-xl bg-white text-slate-800 shadow-2xl"
  style={{
    width: "min(850px, calc(100vw - 32px))",
    maxWidth: "850px",
    height: "auto",
    maxHeight: "75dvh",
  }}
>
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-blue-50 px-4 py-3">
          <div className="min-w-0"><h2 id="bulk-edit-title" className="flex items-center gap-2 text-sm font-semibold"><Pencil className="h-4 w-4 shrink-0 text-blue-600" />แก้ไขหลายประเภท / หลายขั้นตอน</h2><p className="mt-1 text-xs text-slate-500">เลือกแถวและติ๊กหัวข้อที่จะบันทึก แล้วแก้ข้อมูลในตาราง</p></div>
          <button type="button" aria-label="ปิด" disabled={submitting} onClick={closeModal} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-100 disabled:opacity-50"><X className="h-4 w-4" /></button>
        </header>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button type="button" onClick={() => setTypesExpanded(current => !current)} aria-expanded={typesExpanded} aria-controls="bulk-fleet-types" className="inline-flex items-center gap-2 py-1 text-xs font-semibold text-slate-700">{typesExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}ประเภทรถที่เลือก <span className="rounded bg-blue-50 px-2 py-0.5 text-blue-700">{activeTypes.length} / {fleetTypes.length}</span></button>
              <button type="button" disabled={locked || !fleetTypes.length} onClick={() => changeTypes(allTypesSelected ? [] : fleetTypes)} className="text-xs font-medium text-blue-600 disabled:opacity-40">{allTypesSelected ? "ยกเลิกทุกประเภท" : "เลือกทุกประเภท"}</button>
            </div>
            <div id="bulk-fleet-types" hidden={!typesExpanded} className="mt-2 max-h-[18dvh] overflow-y-auto">
              <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">{fleetTypes.map(type => <label key={type} className={`flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 text-xs leading-4 ${selectedTypes.includes(type) ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-600"}`}><input type="checkbox" checked={selectedTypes.includes(type)} disabled={locked} onChange={() => toggleType(type)} className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-blue-600" /><span className="min-w-0 [overflow-wrap:anywhere]">{type}</span></label>)}</div>
              <p className="my-2 text-[11px] text-slate-500 pt-2">เปลี่ยนประเภทรถจะล้างระดับและข้อความร่าง</p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px]"><p className="text-slate-500">ติ๊กหัวคอลัมน์เพื่อเปิดแก้ไข ช่องที่ไม่ติ๊กจะคงค่าเดิม</p><button type="button" disabled={locked || !groups.length} onClick={() => { setSelectedLevels(allLevelsSelected ? [] : groups.map(group => group.level)); setError(""); }} className="font-medium text-blue-600 disabled:opacity-40">{allLevelsSelected ? "ยกเลิกทุกระดับ" : "เลือกทุกระดับ"}</button></div>
          <div className="min-h-0 overflow-auto">
            <table className="w-full table-fixed border-separate border-spacing-0 text-xs">
              <caption className="sr-only">แก้ไขชื่อกระบวนการ รายละเอียด และ SLA แยกตามระดับ</caption>
              <colgroup><col style={{ width: "13%" }} /><col style={{ width: "31%" }} /><col style={{ width: "40%" }} /><col style={{ width: "16%" }} /></colgroup>
              <thead className="sticky top-0 z-10 bg-slate-100"><tr><th scope="col" className="border-b border-r border-slate-200 px-2 py-3 text-left font-semibold">ขั้นตอน</th>{FIELDS.map(({ key, label }) => <th key={key} scope="col" className="border-b border-r border-slate-200 px-2 py-3 text-left last:border-r-0"><label className="flex cursor-pointer items-start gap-1.5"><input type="checkbox" checked={enabledFields.includes(key)} disabled={locked} onChange={() => toggleField(key)} className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-blue-600" /><span className="font-semibold [overflow-wrap:anywhere]">{label}</span></label><span className="mt-1 block text-[11px] font-normal text-slate-500">{enabledFields.includes(key) ? "เลือกบันทึก" : "คงค่าเดิม"}</span></th>)}</tr></thead>
              <tbody>{!groups.length ? <tr><td colSpan={4} className="px-3 py-12 text-center text-xs text-slate-500">เลือกประเภทรถเพื่อแสดงกระบวนการ</td></tr> : groups.map(group => {
                const selected = selectedLevels.includes(group.level);
                const presentTypes = new Set(group.items.map(getFleetType));
                const missingTypes = activeTypes.filter(type => !presentTypes.has(type));
                return <tr key={group.level} className={selected ? "bg-blue-50/40" : "bg-white"}>
                  <th scope="row" className="border-b border-r border-slate-200 px-2 py-3 text-left align-top font-normal"><label className="flex cursor-pointer flex-wrap items-center gap-1.5"><input type="checkbox" checked={selected} disabled={locked} onChange={() => toggleLevel(group.level)} aria-label={`เลือกขั้นตอนที่ ${group.level}`} className="h-4 w-4 shrink-0 accent-blue-600" /><span className="font-semibold text-slate-800">{group.level}</span></label><p className="mt-2 text-[11px] leading-4 text-slate-500 [overflow-wrap:anywhere]">{presentTypes.size} ประเภท</p>{missingTypes.length > 0 && <details className="mt-1 text-[11px] font-normal text-amber-700"><summary className="cursor-pointer">ข้าม {missingTypes.length}</summary><p className="mt-1 leading-4 [overflow-wrap:anywhere]">ไม่มีระดับนี้: {missingTypes.join(", ")}</p></details>}</th>
                  {FIELDS.map(({ key, label }) => {
                    const enabled = enabledFields.includes(key);
                    const values = getValues(group, key);
                    const invalid = selected && enabled && !fieldValid(group, key);
                    const inputId = `bulk-${group.level}-${key}`;
                    return <td key={key} className="border-b border-r border-slate-200 p-2 align-top last:border-r-0"><label htmlFor={inputId} className="sr-only">{label} ขั้นตอนที่ {group.level}</label>{key === "sla" ? <input id={inputId} type="number" min={0} max={2147483647} step={1} value={getDraft(group, key)} disabled={locked || !selected || !enabled} onChange={event => updateDraft(group.level, key, event.target.value)} placeholder={values.length > 1 ? "ต่างกัน" : "วัน"} aria-invalid={invalid} className={`${inputClass} ${invalid ? "border-amber-400" : "border-slate-300"}`} /> : <textarea id={inputId} rows={2} value={getDraft(group, key)} disabled={locked || !selected || !enabled} onChange={event => updateDraft(group.level, key, event.target.value)} placeholder={values.length > 1 ? "ค่าเดิมต่างกัน ระบุค่าใหม่" : label} aria-invalid={invalid} className={`${inputClass} resize-y ${invalid ? "border-amber-400" : "border-slate-300"}`} />}{invalid && <p className="mt-1 text-[11px] leading-4 text-amber-700 [overflow-wrap:anywhere]">{unresolved(group, key) ? "ค่าเดิมต่างกัน กรุณาระบุค่าใหม่" : key === "sla" ? "ระบุจำนวนเต็ม 0–2147483647" : "กรุณาระบุชื่อ"}</p>}{selected && <details className="mt-1"><summary className="cursor-pointer text-[11px] text-slate-500">ค่าเดิม{values.length > 1 ? ` (${values.length})` : ""}</summary><div className="mt-1 space-y-1">{values.map((value, index) => <p key={index} className="whitespace-pre-wrap text-[11px] leading-4 text-slate-500 [overflow-wrap:anywhere]">{value === null ? "(ยังไม่ระบุ)" : key === "sla" ? `${value} วัน` : value || "(ไม่มีข้อความ)"}</p>)}</div></details>}</td>;
                  })}
                </tr>;
              })}</tbody>
            </table>
          </div>
          <footer className="shrink-0 border-t border-slate-200 bg-white px-3 py-3">
            {error && <div role="alert" className="mb-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs leading-5 text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><p className="[overflow-wrap:anywhere]">{error}</p></div>}
            <div className="flex flex-wrap items-center justify-between gap-3"><div aria-live="polite" className="text-[11px] leading-5 text-slate-500"><p>เลือก {activeTypes.length} ประเภท / {selectedGroups.length} ระดับ · เปลี่ยนจริง <span className="font-semibold text-blue-700">{changedItemCount}</span> รายการ</p><p>แต่ละระดับใช้ค่าเดียวกันในประเภทที่เลือก</p></div><div className="flex items-center gap-2"><button type="button" disabled={submitting} onClick={closeModal} className="h-9 rounded-lg border border-slate-300 px-4 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50">{saved ? "ปิด" : "ยกเลิก"}</button><button type="submit" disabled={locked || !enabledFields.length || !changedGroups.length || hasInvalidFields} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{submitting ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}{saved ? "บันทึกสำเร็จแล้ว" : submitting ? "กำลังบันทึก..." : "Save พร้อมกัน"}</button></div></div>
          </footer>
        </form>
      </section>
    </div>, document.body
  );
}

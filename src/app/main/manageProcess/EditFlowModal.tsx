"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface MasterType {
  id: number | string;
  type: string;
  role?: string | null;
}

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
interface ProcessGroup { key: string; name: string; items: FlowItem[] }
interface TypeGroup { key: string; types: string[]; steps: ProcessGroup[] }
interface SaveResponse { success?: boolean; status?: boolean | string; message?: string }
interface LevelUpdate {
  process_level: number;
  changes: Partial<Record<EditField, string | number>>;
  targets: { id: number; original_values: Partial<Record<EditField, FieldValue>> }[];
}
const MASTER_TYPES_URL = "http://192.168.158.210/api_new_truck/api/master_type.php";
const SAVE_URL = "http://192.168.158.210/api_new_truck/api/flow_save.php";
const FIELDS: { key: EditField; label: string }[] = [
  { key: "process", label: "ชื่อกระบวนการ" },
  { key: "detail", label: "คำที่ใช้แจ้งเตือนเมื่อจะครบกำหนด SLA" },
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
  const [masterTypes, setMasterTypes] = useState<MasterType[]>([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [typesError, setTypesError] = useState("");
  const [typesReload, setTypesReload] = useState(0);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedGroupsKeys, setSelectedGroupsKeys] = useState<string[]>([]);
  const [enabledFields, setEnabledFields] = useState<EditField[]>(["process", "detail"]);
  const [drafts, setDrafts] = useState<Record<EditField, Record<string, string>>>({ process: {}, detail: {}, sla: {} });
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState(false);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  useEffect(() => {
    if (!open) return;
    setSelectedTypes(item ? [getFleetType(item)] : []);
    setSelectedGroupsKeys([]);
    setReview(false); setExcludedIds([]);
    setEnabledFields(["process", "detail"]);
    setDrafts({ process: {}, detail: {}, sla: {} });
    setSaved(false);
    setError("");
  }, [open, item]);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const loadTypes = async () => {
      setTypesLoading(true);
      setTypesError("");
      setMasterTypes([]);
      try {
        const response = await fetch(MASTER_TYPES_URL, {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`โหลดประเภทคำขอไม่สำเร็จ HTTP ${response.status}`);
        const result = await response.json();
        if (result.status !== "success" || !Array.isArray(result.data)) {
          throw new Error(result.message || "รูปแบบข้อมูลประเภทคำขอไม่ถูกต้อง");
        }
        const types: MasterType[] = result.data;
        if (types.some(type => type.id == null || typeof type.type !== "string" || !type.type.trim())) {
          throw new Error("ข้อมูลประเภทคำขอไม่มี ID หรือชื่อประเภทที่ถูกต้อง");
        }
        if (!controller.signal.aborted) setMasterTypes(types);
      } catch (err) {
        if (!controller.signal.aborted) setTypesError(err instanceof Error ? err.message : "โหลดประเภทคำขอไม่สำเร็จ");
      } finally {
        if (!controller.signal.aborted) setTypesLoading(false);
      }
    };
    void loadTypes();
    return () => controller.abort();
  }, [open, typesReload]);
  const normalizedFlowData = useMemo(() => {
    const names = new Map(masterTypes.map(type => [String(type.id), type.type]));
    return flowData.map(flow => ({ ...flow, fleet_type: names.get(String(flow.type)) ?? flow.fleet_type }));
  }, [flowData, masterTypes]);
  const fleetTypes = useMemo(() => Array.from(new Set(masterTypes.map(type => type.type))).sort((a, b) => a.localeCompare(b, "th")), [masterTypes]);
  const activeTypes = fleetTypes.filter(type => selectedTypes.includes(type));
  const typeGroups = useMemo<TypeGroup[]>(() => {
    const bundles = new Map<string, TypeGroup>();
    for (const type of activeTypes) {
      const rows = normalizedFlowData.filter(flow => getFleetType(flow) === type);
      if (!rows.length) continue;
      const signatureOf = (flow: FlowItem) => JSON.stringify([
        Number(flow.process_level), getOriginalValue(flow, "process"),
        getOriginalValue(flow, "detail"), getOriginalValue(flow, "sla"),
      ]);
      // Compare the complete ordered set, including duplicate rows and row count.
      rows.sort((a, b) => Number(a.process_level) - Number(b.process_level)
        || signatureOf(a).localeCompare(signatureOf(b)));
      const signature = JSON.stringify(rows.map(signatureOf));
      const existing = bundles.get(signature);
      if (existing) {
        existing.types.push(type);
        rows.forEach((flow, index) => existing.steps[index].items.push(flow));
      } else {
        bundles.set(signature, {
          key: signature, types: [type],
          steps: rows.map((flow, index) => ({
            key: JSON.stringify([signature, index]),
            name: String(flow.process ?? "").trim() || "ไม่มีชื่อกระบวนการ",
            items: [flow],
          })),
        });
      }
    }
    return Array.from(bundles.values());
  }, [normalizedFlowData, selectedTypes, fleetTypes]);
  const groups = typeGroups.flatMap(group => group.steps);
  const typesWithoutFlow = activeTypes.filter(type => !normalizedFlowData.some(flow => getFleetType(flow) === type));
  const selectedGroups = groups.filter(group => selectedGroupsKeys.includes(group.key));
  function targetItems(group: ProcessGroup) {
    return group.items.filter(flow => !excludedIds.includes(String(getFlowId(flow))));
  }
  function getValues(group: ProcessGroup, field: EditField): FieldValue[] {
    return Array.from(new Set(targetItems(group).map(flow => getOriginalValue(flow, field))));
  }
  function getDraft(group: ProcessGroup, field: EditField): string {
    const draft = drafts[field][group.key];
    if (draft !== undefined) return draft;
    const values = getValues(group, field);
    return values.length === 1 ? String(values[0] ?? "") : "";
  }
  function unresolved(group: ProcessGroup, field: EditField): boolean {
    return getValues(group, field).length > 1 && drafts[field][group.key] === undefined;
  }
  function fieldValid(group: ProcessGroup, field: EditField): boolean {
    if (unresolved(group, field)) return false;
    const value = getDraft(group, field).trim();
    if (field === "process") return value !== "";
    if (field === "sla") return value !== "" && Number.isSafeInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 1000;
    return true;
  }
  function getChanges(group: ProcessGroup): Partial<Record<EditField, string | number>> {
    const changes: Partial<Record<EditField, string | number>> = {};
    for (const field of enabledFields) {
      if (!fieldValid(group, field)) continue;
      const text = getDraft(group, field).trim();
      const value = field === "sla" ? Number(text) : text;
      if (targetItems(group).some(flow => getOriginalValue(flow, field) !== value)) changes[field] = value;
    }
    return changes;
  }
  const changedGroups = selectedGroups.filter(group => Object.keys(getChanges(group)).length > 0);
  const changedItemCount = changedGroups.reduce((total, group) => {
    const changes = getChanges(group);
    const fields = Object.keys(changes) as EditField[];
    return total + targetItems(group).filter(flow => fields.some(field => getOriginalValue(flow, field) !== changes[field])).length;
  }, 0);
  const hasInvalidFields = selectedGroups.some(group => enabledFields.some(field => !fieldValid(group, field)));
  const allTypesSelected = fleetTypes.length > 0 && fleetTypes.every(type => selectedTypes.includes(type));
  const allLevelsSelected = groups.length > 0 && groups.every(group => selectedGroupsKeys.includes(group.key));
  const locked = submitting || saved || typesLoading || !!typesError;
  const closeModal = () => { if (!submitting) onClose(); };
  const changeTypes = (types: string[]) => {
    setSelectedTypes(types); setExcludedIds([]); setSelectedGroupsKeys([]); setDrafts({ process: {}, detail: {}, sla: {} }); setError("");
  };
  const toggleType = (type: string) => changeTypes(selectedTypes.includes(type) ? selectedTypes.filter(value => value !== type) : [...selectedTypes, type]);
  const toggleLevel = (level: string) => {
    setSelectedGroupsKeys(current => current.includes(level) ? current.filter(value => value !== level) : [...current, level]); setError("");
  };
  const toggleField = (field: EditField) => {
    setEnabledFields(current => current.includes(field) ? current.filter(value => value !== field) : [...current, field]); setError("");
  };
  const updateDraft = (level: string, field: EditField, value: string) => {
    setDrafts(current => ({ ...current, [field]: { ...current[field], [level]: value } })); setError("");
  };
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (locked || !masterTypes.length) return;
    if (!activeTypes.length || !selectedGroups.length) { setError("กรุณาเลือกประเภทและกลุ่มกระบวนการ"); return; }
    if (!enabledFields.length) { setError("กรุณาติ๊กหัวข้อที่ต้องการบันทึก"); return; }
    if (hasInvalidFields) { setError("กรุณาตรวจสอบช่องที่เลือก ชื่อห้ามว่าง และ SLA ต้องเป็นจำนวนเต็มตั้งแต่ 1 ถึง 1000"); return; }
    if (!changedGroups.length) { setError("ยังไม่มีข้อมูลที่เปลี่ยนแปลง"); return; }
    if (changedGroups.some(group => targetItems(group).some(flow => !Number.isSafeInteger(Number(flow.process_level)) || Number(flow.process_level) <= 0))) { setError("ระดับขั้นตอนไม่ถูกต้อง กรุณารีเฟรชข้อมูล"); return; }
    if (!review) { setReview(true); return; }
    const updates: LevelUpdate[] = changedGroups.flatMap(group => {
      const changes = getChanges(group);
      const fields = Object.keys(changes) as EditField[];
      const byLevel = new Map<number, LevelUpdate>();
      for (const flow of targetItems(group)) {
        if (!fields.some(field => getOriginalValue(flow, field) !== changes[field])) continue;
        const level = Number(flow.process_level);
        const update = byLevel.get(level) ?? { process_level: level, changes, targets: [] };
        const original_values: Partial<Record<EditField, FieldValue>> = {};
        fields.forEach(field => { original_values[field] = getOriginalValue(flow, field); });
        update.targets.push({ id: Number(getFlowId(flow)), original_values });
        byLevel.set(level, update);
      }
      return Array.from(byLevel.values());
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
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  if (!open || typeof document === "undefined") return null;
  const inputClass = "block w-full min-w-0 rounded-lg border bg-white px-2.5 py-2 text-xs leading-5 text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-sm" style={{ zIndex: 2147483000 }}>
      <section role="dialog" aria-modal="true" aria-labelledby="bulk-edit-title" className="w-full max-w-6xl overflow-hidden rounded-2xl bg-slate-50 text-slate-800 shadow-2xl" style={{ height: "85dvh", display: "grid", gridTemplateRows: "auto minmax(0,1fr)" }}>
        <header className="flex items-center justify-between gap-3 bg-white px-5 py-4 shadow-sm">
          <div><h2 id="bulk-edit-title" className="text-sm font-semibold">{review ? "ตรวจสอบก่อนบันทึก" : "แก้ไขกระบวนการเป็นกลุ่ม"}</h2><p className="mt-1 text-xs text-slate-500">แต่ละกลุ่มรวมทุกขั้นตอน • รวมประเภทเมื่อชุดขั้นตอนเหมือนกันทั้งหมด</p></div>
          <button type="button" disabled={submitting} onClick={closeModal} aria-label="ปิด" className="rounded-lg p-2 hover:bg-slate-100"><X size={18} /></button>
        </header>
        <form onSubmit={handleSubmit} className="min-h-0" style={{ display: "grid", gridTemplateRows: "minmax(0,1fr) auto" }}>
          <div className="min-h-0 overflow-y-auto p-4" style={{ overscrollBehavior: "contain" }}>
            {typesError && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">{typesError} <button type="button" onClick={() => setTypesReload(value => value + 1)} className="underline">ลองใหม่</button></p>}
            {!review && <>
              <details open className="mb-3 rounded-xl bg-white p-3 shadow-sm"><summary className="cursor-pointer text-xs font-semibold">กรองประเภทคำขอ ({activeTypes.length}/{fleetTypes.length})</summary>
                <div className="mb-3 flex justify-between gap-3"><h3 className="text-xs font-semibold">กรองประเภทคำขอ</h3><button type="button" disabled={locked} onClick={() => changeTypes(allTypesSelected ? [] : fleetTypes)} className="text-xs text-blue-600">{allTypesSelected ? "ยกเลิกทุกประเภท" : "เลือกทุกประเภท"}</button></div>
                {typesLoading && <p className="text-xs text-slate-500">กำลังโหลด…</p>}
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{fleetTypes.map(type => <label key={type} className="flex items-start gap-2 rounded-lg bg-slate-50 p-2 text-xs leading-5"><input type="checkbox" disabled={locked} checked={selectedTypes.includes(type)} onChange={() => toggleType(type)} /><span>{type}</span></label>)}</div>
                <p className="mt-2 text-[11px] text-slate-500">เปลี่ยนตัวกรองจะล้างการเลือกกลุ่มและข้อความร่าง</p>
              </details>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">พบ {typeGroups.length} กลุ่ม • ติ๊กเฉพาะช่องที่ต้องการใช้ค่าใหม่ร่วมกัน</p><button type="button" disabled={locked} className="text-xs text-blue-600" onClick={() => setSelectedGroupsKeys(allLevelsSelected ? [] : groups.map(group => group.key))}>{allLevelsSelected ? "ยกเลิกทุกกลุ่ม" : "เลือกทุกกลุ่ม"}</button></div>
              <div className="mb-4 flex flex-wrap gap-4">{FIELDS.map(field => <label key={field.key} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={enabledFields.includes(field.key)} disabled={locked} onChange={() => toggleField(field.key)} />{field.label}</label>)}</div>
              {typesWithoutFlow.length > 0 && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">ข้าม — ยังไม่มีกระบวนการ: {typesWithoutFlow.join(", ")} จึงไม่มีรายการบันทึกสำหรับประเภทเหล่านี้</p>}
              {!groups.length && <p className="py-10 text-center text-xs text-slate-500">เลือกประเภทเพื่อแสดงกลุ่มกระบวนการ</p>}
              {typeGroups.map((bundle, bundleIndex) => <details key={bundle.key} open className="mb-3 overflow-hidden rounded-xl bg-white shadow-sm">
                <summary className="cursor-pointer bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-900">
                  Group {bundleIndex + 1} · {bundle.types.join(" / ")}
                  <span className="ml-3 text-[11px] font-normal text-slate-500">{bundle.steps.length} ขั้นตอน · แก้ไข {bundle.steps.filter(step => changedGroups.includes(step)).length} ขั้นตอน</span>
                </summary>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 text-[11px]">
                  <span className="text-slate-500">ใช้ค่าร่วมกับ:</span>
                  {bundle.types.map(type => {
                    const ids = bundle.steps.flatMap(step => step.items.filter(flow => getFleetType(flow) === type).map(flow => String(getFlowId(flow))));
                    const included = ids.every(id => !excludedIds.includes(id));
                    return <label key={type} className="flex items-center gap-1.5"><input type="checkbox" disabled={locked} checked={included} onChange={event => setExcludedIds(current => event.target.checked ? current.filter(id => !ids.includes(id)) : Array.from(new Set([...current, ...ids])))} />{type}</label>;
                  })}
                </div>
                <div className="overflow-x-auto"><table className="w-full table-fixed text-left text-xs" style={{ minWidth: 720 }}>
                  <colgroup><col style={{ width: 55 }} /><col style={{ width: 52 }} /><col style={{ width: "32%" }} /><col /><col style={{ width: 90 }} /></colgroup>
                  <thead className="bg-slate-50 text-[11px] text-slate-500"><tr>
                    <th className="px-3 py-2"><input type="checkbox" aria-label={`เลือกทุกขั้นตอนใน Group ${bundleIndex + 1}`} disabled={locked} checked={bundle.steps.every(step => selectedGroupsKeys.includes(step.key))} onChange={event => {
                      const keys = bundle.steps.map(step => step.key);
                      setSelectedGroupsKeys(current => event.target.checked ? Array.from(new Set([...current, ...keys])) : current.filter(key => !keys.includes(key)));
                    }} /></th><th className="py-2">ระดับ</th>{FIELDS.map(field => <th key={field.key} className="px-2 py-2 font-medium">{field.label}</th>)}
                  </tr></thead>
                  <tbody>{bundle.steps.map(group => {
                    const selected = selectedGroupsKeys.includes(group.key);
                    return <tr key={group.key} className={`border-t border-slate-100 ${selected ? "bg-blue-50/30" : ""}`}>
                      <td className="px-3 py-2 align-top"><input type="checkbox" aria-label={`เลือก ${group.name} ระดับ ${group.items[0].process_level}`} disabled={locked} checked={selected} onChange={() => toggleLevel(group.key)} /></td>
                      <td className="py-3 align-top text-slate-500">{group.items[0].process_level}</td>
                      {FIELDS.map(field => <td key={field.key} className="px-2 py-2 align-top">
                        <input aria-label={`${field.label} ${group.name}`} type={field.key === "sla" ? "number" : "text"} min={field.key === "sla" ? 1 : undefined} max={field.key === "sla" ? 1000 : undefined} step={field.key === "sla" ? 1 : undefined} value={getDraft(group, field.key)} disabled={locked || !enabledFields.includes(field.key) || !targetItems(group).length} onChange={event => {
                          if (!selected) setSelectedGroupsKeys(current => [...current, group.key]);
                          updateDraft(group.key, field.key, event.target.value);
                        }} className={`${inputClass} border-slate-200 !px-2 !py-1.5`} />
                        {selected && enabledFields.includes(field.key) && !fieldValid(group, field.key) && <p className="mt-1 text-[10px] text-amber-700">{field.key === "sla" ? "จำนวนเต็ม 1–1000" : "กรุณาระบุค่า"}</p>}
                      </td>)}
                    </tr>;
                  })}</tbody>
                </table></div>
                <details className="px-4 py-2 text-[11px] text-slate-500"><summary className="cursor-pointer">ดูรายละเอียดและ ID รายการเดิม</summary>
                  <div className="mt-2 space-y-1">{bundle.steps.flatMap(step => step.items).map(flow => <p key={String(getFlowId(flow))} className="break-words">{getFleetType(flow)} · ระดับ {flow.process_level} · {flow.process} · {flow.detail || "ไม่มีข้อความ"} · SLA {flow.sla ?? "ไม่ระบุ"} · ID {getFlowId(flow)}</p>)}</div>
                </details>
              </details>)}
            </>}
            {review && changedGroups.map(group => {
              const changes = getChanges(group);
              const changedFields = Object.keys(changes) as EditField[];
              return <article key={group.key} className="mb-4 rounded-2xl bg-white p-4 shadow-sm"><h3 className="mb-3 text-sm font-semibold">{group.name}</h3>{targetItems(group).filter(flow => changedFields.some(field => getOriginalValue(flow, field) !== changes[field])).map(flow => <div key={String(getFlowId(flow))} className="mb-3 rounded-xl bg-slate-50 p-3"><p className="text-xs font-semibold">{getFleetType(flow)} · ระดับ {flow.process_level} · ID {getFlowId(flow)}</p><div className="mt-2 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="text-slate-400"><th className="p-2">ช่อง</th><th className="p-2">ก่อนบันทึก</th><th className="p-2">หลังบันทึก</th></tr></thead><tbody>{changedFields.map(field => <tr key={field}><th className="p-2 align-top font-medium">{FIELDS.find(value => value.key === field)?.label}</th><td className="whitespace-pre-wrap break-words p-2 align-top text-slate-500">{String(getOriginalValue(flow, field) ?? "—") || "—"}</td><td className="whitespace-pre-wrap break-words p-2 align-top text-blue-700">{String(changes[field]) || "—"}</td></tr>)}</tbody></table></div></div>)}</article>;
            })}
          </div>
          <footer className="bg-white px-5 py-4 shadow-[0_-4px_16px_-12px_rgba(15,23,42,0.3)]">
            {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
            <div className="flex flex-wrap items-center justify-between gap-3"><div className="text-xs"><p className="font-semibold">รอบันทึก {changedItemCount} รายการ · {typeGroups.filter(bundle => bundle.steps.some(step => changedGroups.includes(step))).length} กลุ่ม</p><p className="mt-1 text-[11px] text-slate-500">ใช้ค่าใหม่เฉพาะช่องและรายการที่เลือก ระดับเดิมไม่เปลี่ยน</p></div><div className="flex gap-2"><button type="button" disabled={submitting} onClick={() => review && !saved ? setReview(false) : closeModal()} className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs">{review && !saved ? "กลับไปแก้ไข" : "ปิด"}</button><button type="submit" disabled={locked || !enabledFields.length || !changedGroups.length || hasInvalidFields} className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40">{saved ? "บันทึกสำเร็จแล้ว" : submitting ? "กำลังบันทึก…" : review ? `ยืนยันบันทึก ${changedItemCount} รายการ` : `ตรวจสอบ ${changedItemCount} รายการ`}</button></div></div>
          </footer>
        </form>
      </section>
    </div>, document.body
  );
}

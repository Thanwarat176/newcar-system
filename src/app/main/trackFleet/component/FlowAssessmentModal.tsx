"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Calendar } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { th } from "date-fns/locale";
import { Ban, Building2, CalendarDays, CheckCircle2, ChevronRight, ClipboardList, Clock3, FileWarning, LoaderCircle, RefreshCw, Save, Truck, Undo2, X } from "lucide-react";
import ProvinceDatalist from "../../component/thaiProvinces";

const API_BASE = "http://192.168.158.210/api_new_truck/api";
const FLOW_API_URL = `${API_BASE}/flow_data_get.php`;
const FLOW_UPDATE_API_URL = `${API_BASE}/flow_data_update.php`;
const FLOW_ROLLBACK_API_URL = `${API_BASE}/flow_data_rollback.php`;
const VEHICLE_WAREHOUSE_INFO_API_URL = `${API_BASE}/vehicle_warehouse_info.php`;

type Id = string | number;
interface FlowAssessmentModalProps {
  open: boolean; requestId: Id | null; vehicleNo: Id | null;
  documentNo?: string;
  documentMode?: boolean; referenceVehicleNo?: Id | null;
  replacedOldLicenses?: string[]; onClose: () => void;
}
type MemoFileKey = "number_fbp" | "number_tis" | "number_til" | "number_ask" | "number_kleasing" | "number_ttb" | "number_thaiolix";
type ExtraKey = MemoFileKey | `date_${MemoFileKey}` | "warehouse_plan_date" | "remark" | "car_model" | "car_brand" | "supplier_alloc" | "car_chassis" | "car_engine" | "car_license" | "car_province";
type VehicleExtraForm = Record<ExtraKey, string>;
type ExtraInfo = Partial<Record<ExtraKey | "number_feb" | "date_number_feb", string | null>>;
interface VehicleWarehouseInfoData extends ExtraInfo { id?: Id; request_id?: Id; vehicle_no?: Id; }
interface RequestVehicleDetail extends ExtraInfo {
  id?: Id; license?: string | null; province?: string | null; truck_type?: string | null;
  company_id?: Id | null; company_name?: string | null;
  license_replace?: string | null; province_replace?: string | null;
  truck_type_replace?: string | null; company_name_replace?: string | null;
  warehouse_info?: VehicleWarehouseInfoData | null;
}
interface RequestInfo {
  id: Id; running_doc?: string; dc_type?: string; dc_code?: string; fleet_type?: string; fleet_truck_type?: string;
  qty?: Id; usage_date?: string; request_date?: string; request_by?: string; approved_by?: string | null;
  company_id?: Id | null; company_name?: string | null; approved_company_id?: Id | null;
  approved_qty?: Id | null; approved_company_name?: string | null; approved_truck_type?: string | null;
  workload?: Id; truckturn?: Id; remark?: string; status?: string;
  details?: RequestVehicleDetail[]; vehicle_warehouse_info?: VehicleWarehouseInfoData[];
}
interface CarItem extends ExtraInfo {
  vehicle_no: Id; unit_code?: string | null; license: string; province?: string; truck_type?: string;
  company_master_code?: Id | null; company_master_name?: string | null; company_rating?: string | null;
  company_id?: Id | null; company_name?: string | null; detail_id?: string | null;
  warehouse_info?: VehicleWarehouseInfoData | null;
}
interface StepItem { id: Id; process: string; detail: string | null; process_level: Id; sla?: Id | null; }
interface FlowItem {
  id: Id; request_id: Id; process_id: Id; vehicle_no: Id; unit_code?: Id | null;
  str_date: string | null; end_date: string | null; sla: Id | null; license?: string;
  created_by?: string | null; updated_by?: string | null; created_at?: string | null; updated_at?: string | null;
  request_truck_detail_id?: Id | null;
}
interface DisplayFlowRow extends FlowItem { process: string; detail: string | null; process_level: string; target_sla: Id | null; }
interface FlowResponseData { request: RequestInfo; steps: StepItem[]; cars: CarItem[]; flow_data: FlowItem[]; is_initialized: boolean; }
interface ApiResponse extends Partial<FlowResponseData> { status?: string; message?: string; data?: FlowResponseData; }
interface ActionResponse {
  status?: string; message?: string;
  data?: { id?: Id; file_name?: string; file_url?: string | null };
}
interface FlowLoadResult { car: CarItem | undefined; initialized: boolean; flowCount: number; }
interface FlowDateDraft { str_date: string; end_date: string; }
interface CalendarPosition { top: number; left: number; }
type Picker = { kind: "flow"; flowId: string; field: keyof FlowDateDraft; position: CalendarPosition } | { kind: "warehouse"; position: CalendarPosition };
const key = (value: unknown) => String(value ?? "").trim();
const same = (a: unknown, b: unknown) => key(a) === key(b);
const hasDate = (flow?: FlowItem | null) => Boolean(flow?.str_date || flow?.end_date);
const hasId = (value: unknown) => key(value) !== "";
const emptyData: FlowResponseData = { request: { id: "" }, steps: [], cars: [], flow_data: [], is_initialized: false };
const MEMO_FIELDS: { key: MemoFileKey; dateKey: `date_${MemoFileKey}`; label: string }[] = [
  { key: "number_fbp", dateKey: "date_number_fbp", label: "เลขบันทึกแจ้ง FBP" },
  { key: "number_tis", dateKey: "date_number_tis", label: "เลขบันทึกแจ้ง TIS" },
  { key: "number_til", dateKey: "date_number_til", label: "เลขบันทึกแจ้ง TIL" },
  { key: "number_ask", dateKey: "date_number_ask", label: "เลขบันทึกแจ้ง ASK" },
  { key: "number_kleasing", dateKey: "date_number_kleasing", label: "เลขบันทึกแจ้ง Kleasing" },
  { key: "number_ttb", dateKey: "date_number_ttb", label: "เลขบันทึกแจ้ง TTB" },
  { key: "number_thaiolix", dateKey: "date_number_thaiolix", label: "เลขบันทึกแจ้ง THAIOLIX" },
];
const VEHICLE_FIELDS: { key: ExtraKey; label: string }[] = [
  { key: "warehouse_plan_date", label: "แผนวันที่จะเข้าคลังได้" }, { key: "car_model", label: "รุ่น" },
  { key: "car_brand", label: "ยี่ห้อ" }, { key: "supplier_alloc", label: "จัดสรรผู้ผลิต" },
  { key: "car_chassis", label: "เลขที่ตัวถัง" }, { key: "car_engine", label: "เลขที่เครื่อง" },
  { key: "car_license", label: "ทะเบียนรถ" }, { key: "car_province", label: "จังหวัด" },
];
const emptyVehicleExtraForm = Object.fromEntries([
  ...VEHICLE_FIELDS.map(f => [f.key, ""]), ["remark", ""],
  ...MEMO_FIELDS.flatMap(f => [[f.key, ""], [f.dateKey, ""]]),
]) as VehicleExtraForm;
function dateInput(value?: string | null) { const v = key(value).split(/[ T]/)[0]; return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : ""; }
function formatDate(value?: string | null) { const v = dateInput(value); return v ? v.split("-").reverse().join("/") : value || "-"; }
function formatDateTime(value?: string | null) { return value ? `${formatDate(value)} ${key(value).split(/[ T]/)[1]?.slice(0, 8) || ""}`.trim() : "-"; }
function formatNumber(value?: Id | null) { return value == null || value === "" ? "-" : Number.isFinite(Number(value)) ? Number(value).toLocaleString("en-US") : String(value); }
function toDateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function parseDate(value?: string) { return value ? new Date(`${value}T00:00:00`) : new Date(); }
function dayNumber(value: string) { const [y, m, d] = value.split("-").map(Number); return Date.UTC(y, m - 1, d) / 86400000; }
function calculateSla(start: string, end: string) { return start && end && end >= start ? dayNumber(end) - dayNumber(start) + 1 : 0; }
function dueDate(start: string, days: number) { if (!start || days <= 0) return ""; const d = parseDate(start); d.setDate(d.getDate() + days - 1); return toDateKey(d); }
function remaining(value?: string | null) { const d = dateInput(value); if (!d) return "ไม่ระบุวันที่"; const n = dayNumber(d) - dayNumber(toDateKey(new Date())); return n > 0 ? `เหลืออีก ${n} วัน` : n === 0 ? "ถึงกำหนดวันนี้" : `เกินกำหนดแล้ว ${Math.abs(n)} วัน`; }
function toExtra(info?: ExtraInfo | null): VehicleExtraForm {
  const form = { ...emptyVehicleExtraForm };
  for (const name of Object.keys(form) as ExtraKey[]) {
    const value = info?.[name] || "";
    form[name] = name.startsWith("date_") || name === "warehouse_plan_date" ? dateInput(value) : value;
  }
  form.number_fbp ||= info?.number_feb || "";
  form.date_number_fbp ||= dateInput(info?.date_number_feb);
  return form;
}
function matchesCar(flow: FlowItem, car: CarItem) {
  return hasId(flow.unit_code) && hasId(car.unit_code)
    ? same(flow.unit_code, car.unit_code) : same(flow.vehicle_no, car.vehicle_no);
}
function normalizeApiData(result: ApiResponse): FlowResponseData {
  const source = result.data ?? result;
  if (!source.request) throw new Error("รูปแบบข้อมูลจาก API ไม่ถูกต้อง");
  const request = source.request, details = request.details || [], warehouses = request.vehicle_warehouse_info || [];
  const sourceCars: CarItem[] = source.cars?.length ? source.cars : details.map((d, i) => ({
    vehicle_no: d.warehouse_info?.vehicle_no ?? i + 1, detail_id: d.id == null ? null : String(d.id),
    license: d.license_replace || d.license || "-", province: d.province_replace || d.province || "-",
    truck_type: d.truck_type_replace || d.truck_type || "-", company_id: d.company_id, company_name: d.company_name,
  }));
  const cars = sourceCars.map((car, i) => {
    const detail = details.find(d => d.id != null && same(d.id, car.detail_id)) || details[i];
    const warehouse = detail?.warehouse_info || warehouses.find(w => same(w.vehicle_no, car.vehicle_no)) || warehouses[i] || car.warehouse_info;
    const merged = { ...car, company_id: car.company_id ?? detail?.company_id, company_name: car.company_name ?? detail?.company_name, warehouse_info: warehouse };
    for (const name of Object.keys(emptyVehicleExtraForm) as ExtraKey[]) merged[name] = warehouse?.[name] ?? detail?.[name] ?? car[name] ?? null;
    merged.number_fbp = warehouse?.number_fbp ?? warehouse?.number_feb ?? car.number_fbp ?? null;
    merged.date_number_fbp = warehouse?.date_number_fbp ?? warehouse?.date_number_feb ?? car.date_number_fbp ?? null;
    return merged;
  });
  return { request, cars, steps: source.steps || [], flow_data: source.flow_data || [], is_initialized: source.is_initialized === true };
}
function getUserInfo(): Record<string, unknown> {
  try { return JSON.parse(localStorage.getItem("user_info") || localStorage.getItem("user") || localStorage.getItem("userInfo") || "{}"); } catch { return {}; }
}
function getCreatedBy() { const u = getUserInfo(); return [u.name, u.surname].map(key).filter(Boolean).join(" "); }
function getDepartment() { const u = getUserInfo(); return key(u.department || u.DEPARTMENT || u.department_name || u.DEPARTMENT_NAME).toUpperCase(); }
function canManageDocuments() { const department = getDepartment(); return Boolean(department) && department !== "FBP" && department !== "KA"; }
function canEditProcessLevel(level: Id) {
  const department = getDepartment(), processLevel = Number(level);
  if (!department || !Number.isInteger(processLevel) || processLevel < 1 || processLevel > 10) return false;
  if (department === "FBP") return processLevel === 7;
  if (department === "KA") return processLevel === 8;
  return true;
}
function calendarPosition(target: HTMLElement): CalendarPosition {
  const r = target.getBoundingClientRect(), w = Math.min(340, window.innerWidth - 24), h = Math.min(470, window.innerHeight - 24);
  const above = window.innerHeight - r.bottom < h + 8 && r.top > window.innerHeight - r.bottom;
  return { top: Math.max(12, Math.min(above ? r.top - h - 8 : r.bottom + 8, window.innerHeight - h - 12)), left: Math.max(12, Math.min(r.left, window.innerWidth - w - 12)) };
}
async function readResponse<T extends { status?: string; message?: string }>(response: Response): Promise<T> {
  let result: T;
  try { result = JSON.parse(await response.text()) as T; } catch { throw new Error(`API ไม่ได้ส่ง JSON (${response.status})`); }
  if (!response.ok || result.status === "error") throw new Error(result.message || `ดำเนินการไม่สำเร็จ (${response.status})`);
  return result;
}
async function postAction(url: string, payload: unknown) {
  const result = await readResponse<ActionResponse>(await fetch(url, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(payload) }));
  if (result.status !== "success") throw new Error(result.message || "API ไม่ยืนยันผลสำเร็จ");
  return result;
}
const buttonBase = "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
const inputClass = "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100";

interface CompanyAttachment {
  attachment_id: string | number;
  approval_detail_id: string | number;
  document_no: string;
  file_name: string;
  company_id?: string | number | null;
  company_name?: string | null;
}

export default function FlowAssessmentModal({ open, requestId, vehicleNo, documentNo = "", documentMode = false, referenceVehicleNo = null, replacedOldLicenses = [], onClose }: FlowAssessmentModalProps) {
  const visibleOldLicenses = Array.from(new Set(replacedOldLicenses.map(key).filter(v => v && !["-", "—", "ไม่มีข้อมูลทะเบียนเก่า"].includes(v))));
  const [data, setData] = useState<FlowResponseData>(emptyData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""), [actionMessage, setActionMessage] = useState("");
  const [savingFlowId, setSavingFlowId] = useState<string | null>(null);
  const [dateDrafts, setDateDrafts] = useState<Record<string, FlowDateDraft>>({});
  const [vehicleExtraForm, setVehicleExtraForm] = useState<VehicleExtraForm>({ ...emptyVehicleExtraForm });
  const [supplierOptions, setSupplierOptions] = useState<string[]>([]);
  const [savingMemoKey, setSavingMemoKey] = useState<MemoFileKey | null>(null);
  const [savingWarehouseInfo, setSavingWarehouseInfo] = useState(false);
  const [picker, setPicker] = useState<Picker | null>(null);
  const busyRef = useRef(false), loadVersion = useRef(0);
  const busy = loading || savingFlowId !== null || savingMemoKey !== null || savingWarehouseInfo;
  const [companyFiles, setCompanyFiles] = useState<CompanyAttachment[]>([]);
  const [companyFilesLoading, setCompanyFilesLoading] = useState(false);
  const [companyFilesError, setCompanyFilesError] = useState("");
  const [companyFilesRefresh, setCompanyFilesRefresh] = useState(0);
  const selectedCar = data.cars[0];
  const displayDocumentNo = key(documentNo) || key(data.request.running_doc);
  const supplierChoices = Array.from(new Set([
    ...supplierOptions, vehicleExtraForm.supplier_alloc,
    ...data.cars.map(car => car.supplier_alloc ?? car.warehouse_info?.supplier_alloc ?? ""),
    ...(data.request.vehicle_warehouse_info ?? []).map(info => info.supplier_alloc ?? ""),
  ].map(key).filter(Boolean))).sort((a, b) => a.localeCompare(b, "th"));
  const approvedCompanyId = key(selectedCar?.company_master_code) || key(selectedCar?.company_id) || key(data.request.approved_company_id) || key(data.request.company_id);
  const approvedCompanyName = key(selectedCar?.company_master_name) || key(selectedCar?.company_name) || key(data.request.approved_company_name) || key(data.request.company_name);
  const companyRatingLabels: Record<string, string> = { E: "E (Excellent)", G: "G (Good)", P: "P (Pass)", I: "I (Improvement Required)" };
  const approvedCompanyRating = companyRatingLabels[key(selectedCar?.company_rating).toUpperCase()] || "ยังไม่มีข้อมูลเกรด";

  useEffect(() => {
    setCompanyFiles([]);
    setCompanyFilesError("");
    setCompanyFilesLoading(false);
    if (!open || !hasId(requestId)) return;
    const controller = new AbortController();
    setCompanyFilesLoading(true);
    void (async () => {
      try {
        const response = await fetch(`${API_BASE}/fleet_attachments.php?request_id=${encodeURIComponent(String(requestId))}`, {
          cache: "no-store", signal: controller.signal, headers: { Accept: "application/json" },
        });
        const result = await response.json();
        if (!response.ok || result.success === false || !Array.isArray(result.data)) {
          throw new Error(result.message || "โหลดเอกสารแนบไม่สำเร็จ");
        }
        if (!controller.signal.aborted) setCompanyFiles(result.data);
      } catch (error) {
        if (!controller.signal.aborted) setCompanyFilesError(error instanceof Error ? error.message : "โหลดเอกสารแนบไม่สำเร็จ");
      } finally {
        if (!controller.signal.aborted) setCompanyFilesLoading(false);
      }
    })();
    return () => controller.abort();
  }, [open, requestId, companyFilesRefresh]);

  // เอกสารระดับบริษัทภายในคำขอ รวมไฟล์ที่ใช้ซ้ำไว้รายการเดียว
  const approvedCompanyFiles = useMemo(() => {
    const normalize = (value: unknown) => String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
    const companyId = normalize(approvedCompanyId);
    const companyName = normalize(approvedCompanyName);
    const seen = new Set<string>();
    return companyFiles.filter(item => {
      const itemId = normalize(item.company_id);
      const matches = companyId && itemId
        ? companyId === itemId
        : Boolean(companyName && companyName === normalize(item.company_name));
      const fileId = String(item.attachment_id);
      if (!matches || seen.has(fileId)) return false;
      seen.add(fileId);
      return true;
    });
  }, [companyFiles, approvedCompanyId, approvedCompanyName]);

  async function fetchFlowData(): Promise<FlowLoadResult> {
    if (!hasId(requestId)) throw new Error("ไม่พบ Request ID");
    const version = loadVersion.current;
    const params = new URLSearchParams({ request_id: String(requestId) });
    if (!documentMode && hasId(vehicleNo)) params.set("vehicle_no", String(vehicleNo));
    const result = await readResponse<ApiResponse>(await fetch(`${FLOW_API_URL}?${params}`, { cache: "no-store", headers: { Accept: "application/json" } }));
    const normalized = normalizeApiData(result), allCars = normalized.cars;
    const exact = hasId(vehicleNo) ? allCars.find(c => same(c.vehicle_no, vehicleNo) || (hasId(c.unit_code) && same(c.unit_code, vehicleNo))) : undefined;
    const byOrdinal = hasId(referenceVehicleNo) ? allCars.find(c => same(c.vehicle_no, referenceVehicleNo)) : undefined;
    const collator = new Intl.Collator("th", { numeric: true, sensitivity: "base" });
    const ordered = [...allCars].sort((a, b) => {
      const na = Number(a.vehicle_no), nb = Number(b.vehicle_no);
      const ra = Number.isFinite(na) && na > 0 ? na : Number.MAX_SAFE_INTEGER;
      const rb = Number.isFinite(nb) && nb > 0 ? nb : Number.MAX_SAFE_INTEGER;
      return ra - rb || collator.compare(key(a.unit_code || a.vehicle_no), key(b.unit_code || b.vehicle_no));
    });
    const selected = documentMode
      ? exact || byOrdinal || (!hasId(vehicleNo) && !hasId(referenceVehicleNo)
        ? allCars.find(c => /-N01$/i.test(key(c.unit_code))) || allCars.find(c => key(c.vehicle_no) === "1") || ordered[0] : undefined)
      : exact;
    if ((documentMode || hasId(vehicleNo)) && !selected) throw new Error("ไม่พบรถอ้างอิงที่ส่งจากหน้าเอกสารใน Flow API กรุณารีเฟรชข้อมูลหรือตรวจการจับคู่ unit_code/vehicle_no");
    if (selected) {
      normalized.cars = [selected];
      normalized.flow_data = normalized.flow_data.filter(f => same(f.request_id, normalized.request.id) && matchesCar(f, selected));
    }
    // เก็บสถานะประวัติจากข้อมูลจริง แต่ไม่ใช้กั้นการแสดงขั้นตอนจาก steps
    normalized.is_initialized = normalized.flow_data.some(f =>
      hasId(f.id) && same(f.request_id, normalized.request.id) &&
      normalized.cars.some(car => matchesCar(f, car)) &&
      normalized.steps.some(step => same(step.id, f.process_id))
    );
    if (version !== loadVersion.current) throw new Error("รายการอ้างอิงเปลี่ยนแล้ว กรุณาโหลดข้อมูลอีกครั้ง");
    setData(normalized);
    setDateDrafts(Object.fromEntries(normalized.flow_data.map(f => [key(f.id), { str_date: dateInput(f.str_date), end_date: dateInput(f.end_date) }])));
    setVehicleExtraForm(toExtra(normalized.cars[0]));
    return { car: normalized.cars[0], initialized: normalized.is_initialized, flowCount: normalized.flow_data.length };
  }
  async function fetchVehicleWarehouseInfo(car = selectedCar) {
    if (!hasId(requestId) || !car) return;
    const version = loadVersion.current;
    const params = new URLSearchParams({ request_id: String(requestId), vehicle_no: String(car.unit_code || car.vehicle_no), include_supplier_options: "1" });
    const result = await readResponse<{ status?: string; message?: string; data?: VehicleWarehouseInfoData | null; supplier_options?: string[] }>(await fetch(`${VEHICLE_WAREHOUSE_INFO_API_URL}?${params}`, { cache: "no-store" }));
    if (version !== loadVersion.current) return;
    if (result.data) setVehicleExtraForm(toExtra(result.data));
    if (Array.isArray(result.supplier_options)) setSupplierOptions(result.supplier_options.filter((v): v is string => typeof v === "string"));
  }
  async function handleRefreshData() {
    if (busyRef.current || busy) return;
    setLoading(true); setError(""); setActionMessage("");
    try {
      const { car } = await fetchFlowData();
      await fetchVehicleWarehouseInfo(car);
    } catch (e) { setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ"); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    if (!open) return;
    const version = ++loadVersion.current;
    setData(emptyData); setSupplierOptions([]); setDateDrafts({}); setPicker(null);
    setActionMessage(""); setError(""); setLoading(true);
    void (async () => {
      try { const { car } = await fetchFlowData(); if (loadVersion.current === version) await fetchVehicleWarehouseInfo(car); }
      catch (e) { if (loadVersion.current === version) setError(e instanceof Error ? e.message : "โหลดข้อมูลไม่สำเร็จ"); }
      finally { if (loadVersion.current === version) setLoading(false); }
    })();
    return () => { ++loadVersion.current; };
  }, [open, requestId, vehicleNo, documentMode, referenceVehicleNo]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow; document.body.style.overflow = "hidden";
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape" && !busyRef.current) onClose(); };
    window.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", escape); };
  }, [open, onClose]);

  const stepMap = useMemo(() => new Map(data.steps.map(s => [key(s.id), s])), [data.steps]);
  const flowRows = useMemo<DisplayFlowRow[]>(() => data.cars.flatMap(car => {
    const flows = data.flow_data.filter(f => same(f.request_id, data.request.id) && matchesCar(f, car));
    return [...data.steps].sort((a, b) => Number(a.process_level) - Number(b.process_level)).map(step => {
      const flow = flows.find(f => same(f.process_id, step.id));
      return {
        ...flow, id: flow?.id ?? `missing-${key(car.vehicle_no)}-${key(step.id)}`, request_id: data.request.id,
        process_id: step.id, vehicle_no: car.vehicle_no, unit_code: car.unit_code, license: flow?.license || car.license,
        str_date: flow?.str_date ?? null, end_date: flow?.end_date ?? null, sla: flow?.sla ?? null,
        request_truck_detail_id: flow?.request_truck_detail_id ?? car.detail_id, process: step.process,
        detail: step.detail, process_level: key(step.process_level), target_sla: step.sla ?? null
      };
    });
  }), [data]);
  const flowRowsByVehicle = useMemo(() => data.cars.map(car => {
    const rows = flowRows.filter(f => matchesCar(f, car));
    return {
      vehicle_no: car.vehicle_no, license: car.license, rows: rows.filter(f => ![9, 10].includes(Number(f.process_level))),
      cancelDocumentFlow: rows.find(f => Number(f.process_level) === 9) ?? null,
      expiredDocumentFlow: rows.find(f => Number(f.process_level) === 10) ?? null
    };
  }), [data.cars, flowRows]);
  function documentLocked(flow: DisplayFlowRow) {
    return flowRows.some(f => (hasId(f.unit_code) && hasId(flow.unit_code) ? same(f.unit_code, flow.unit_code) : same(f.vehicle_no, flow.vehicle_no)) && [9, 10].includes(Number(f.process_level)) && hasDate(f));
  }
  function updateExtra(field: ExtraKey, value: string) { setVehicleExtraForm(p => ({ ...p, [field]: value })); }
  function getDraft(flow: DisplayFlowRow): FlowDateDraft { return dateDrafts[key(flow.id)] || { str_date: dateInput(flow.str_date), end_date: dateInput(flow.end_date) }; }
  function handleFlowDateChange(flow: DisplayFlowRow, field: keyof FlowDateDraft, value: string) {
    setDateDrafts(p => ({ ...p, [key(flow.id)]: Number(flow.process_level) === 8 ? { str_date: value, end_date: value } : { ...getDraft(flow), [field]: value } }));
  }
  async function runFlowAction(flow: DisplayFlowRow, rollback: boolean, dates?: FlowDateDraft) {
    if (busyRef.current || busy) return;
    if ((rollback || [9, 10].includes(Number(flow.process_level))) && !canManageDocuments()) { setError("ติดต่อทีมสัญญาเพื่อแก้ไข"); return; }
    if (!canEditProcessLevel(flow.process_level)) { setError("คุณไม่มีสิทธิ์แก้ไขขั้นตอนนี้"); return; }
    const level = Number(flow.process_level), special = [9, 10].includes(level), user = getCreatedBy();
    if (!user) { setError("ไม่พบข้อมูลผู้ใช้งานใน localStorage"); return; }
    if (rollback && (!special || !/^\d+$/.test(key(flow.id)) || !hasDate(flow))) { setError("ไม่พบรายการระดับ 9 หรือ 10 ที่บันทึกไว้สำหรับย้อนกลับ"); return; }
    if (!rollback && documentLocked(flow)) { setError("เอกสารถูกยกเลิกหรือหมดอายุ กรุณาย้อนกลับสถานะก่อน"); return; }
    if (!rollback && flow.str_date && flow.end_date) { setError("ขั้นตอนนี้บันทึกครบแล้ว ไม่สามารถแก้ไขซ้ำได้"); return; }
    const draft = dates || getDraft(flow);
    if (!rollback && (!draft.str_date || (draft.end_date && draft.end_date < draft.str_date))) { setError("กรุณาเลือกวันเริ่มและวันสิ้นสุดให้ถูกต้อง"); return; }
    if ((rollback || special) && !window.confirm(rollback
      ? `ยืนยันย้อนกลับ “${flow.process}” ของรถคันที่ ${flow.vehicle_no} หรือไม่?\nระบบจะลบขั้นตอนนี้และตรวจสอบเพื่อคืนสถานะคำขอ`
      : `ยืนยันบันทึก “${flow.process}” ของรถคันที่ ${flow.vehicle_no} หรือไม่?`)) return;
    busyRef.current = true; setSavingFlowId(key(flow.id)); setError(""); setActionMessage(""); setPicker(null);
    try {
      const identity = { request_id: key(flow.request_id), process_id: key(flow.process_id), vehicle_no: key(flow.vehicle_no), unit_code: hasId(flow.unit_code) ? key(flow.unit_code) : null, user };
      const result = await postAction(rollback ? FLOW_ROLLBACK_API_URL : FLOW_UPDATE_API_URL, rollback
        ? { ...identity, flow_id: key(flow.id) }
        : { ...identity, process_level: level, str_date: draft.str_date, end_date: draft.end_date || null, sla: draft.end_date ? calculateSla(draft.str_date, draft.end_date) : 0 });
      setActionMessage(result.message || (rollback ? "ย้อนกลับสถานะเรียบร้อยแล้ว" : "บันทึกขั้นตอนเรียบร้อยแล้ว"));
      try { await fetchFlowData(); } catch (e) { setError(`บันทึกสำเร็จ แต่โหลดข้อมูลล่าสุดไม่สำเร็จ: ${e instanceof Error ? e.message : "กรุณารีเฟรช"}`); }
    } catch (e) { setError(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ"); }
    finally { busyRef.current = false; setSavingFlowId(null); }
  }
  async function handleSaveWarehouseInfo() {
    if (busyRef.current || busy || !selectedCar) return;
    busyRef.current = true; setSavingWarehouseInfo(true); setError(""); setActionMessage("");
    try {
      const user = getCreatedBy(); if (!user) throw new Error("ไม่พบข้อมูลผู้ใช้งาน");
      const payload: Record<string, unknown> = { action: "warehouse_info", request_id: key(requestId), vehicle_no: selectedCar.unit_code || key(selectedCar.vehicle_no), user };
      for (const f of [...VEHICLE_FIELDS, { key: "remark" as ExtraKey }]) payload[f.key] = vehicleExtraForm[f.key].trim() || (f.key === "warehouse_plan_date" ? null : "");
      const result = await postAction(VEHICLE_WAREHOUSE_INFO_API_URL, payload);
      setActionMessage(result.message || "บันทึกรายละเอียดรถแล้ว"); await fetchVehicleWarehouseInfo();
    } catch (e) { setError(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ"); }
    finally { busyRef.current = false; setSavingWarehouseInfo(false); }
  }
  async function handleSaveMemo(field: typeof MEMO_FIELDS[number]) {
    if (busyRef.current || busy || !selectedCar) return;
    const memoNumber = vehicleExtraForm[field.key].trim(), memoDate = vehicleExtraForm[field.dateKey];
    if (!memoNumber || !memoDate) { setError(`กรุณากรอกเลขและวันที่ของ${field.label}`); return; }
    busyRef.current = true; setSavingMemoKey(field.key); setError(""); setActionMessage("");
    try {
      const user = getCreatedBy(); if (!user) throw new Error("ไม่พบข้อมูลผู้ใช้งาน");
      const identity = { request_id: key(requestId), vehicle_no: selectedCar.unit_code || key(selectedCar.vehicle_no), memo_type: field.key, memo_number: memoNumber, memo_date: memoDate };
      await postAction(VEHICLE_WAREHOUSE_INFO_API_URL, { ...identity, action: "memo", user });
      setActionMessage(`บันทึก${field.label}เรียบร้อยแล้ว`); await fetchVehicleWarehouseInfo();
    } catch (e) { setError(e instanceof Error ? e.message : "บันทึกเลขบันทึกไม่สำเร็จ"); }
    finally { busyRef.current = false; setSavingMemoKey(null); }
  }

  if (!open) return null;
  const request = data.request;
  const activeFlow = picker?.kind === "flow" ? flowRows.find(f => same(f.id, picker.flowId)) : undefined;
  const selectedDate = picker?.kind === "warehouse" ? vehicleExtraForm.warehouse_plan_date : activeFlow && picker?.kind === "flow" ? getDraft(activeFlow)[picker.field] : "";
  function close() { if (!busy && !busyRef.current) onClose(); }
  return (
    <div className="flow-modal-polished fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-5">
      <button type="button" aria-label="ปิดหน้าต่าง" className="absolute inset-0 cursor-default" disabled={busy} onClick={close} />
      <style>{`.flow-modal-polished{font-family:inherit;font-size:11px;line-height:1.55;scrollbar-color:#cbd5e1 #f8fafc}.flow-modal-polished :is(button,input,textarea){font-family:inherit}.flow-modal-polished :is(button,input,textarea):focus-visible{outline:2px solid #2563eb;outline-offset:2px}.flow-modal-polished button{font-weight:600}@media(prefers-reduced-motion:reduce){.flow-modal-polished *{transition:none!important}}`}</style>
      <section className="relative flex max-h-[96vh] w-full max-w-[1440px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl sm:max-h-[94vh]">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-blue-50/70 via-white to-white px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400"><ClipboardList size={17} />Fleet Process Tracking</div><h2 className="mt-1 truncate text-base font-semibold text-slate-900 sm:text-lg">{displayDocumentNo || `Request ID: ${requestId}`}</h2><p className="mt-1 text-[11px] text-slate-400">รายละเอียดคำขอ รถ และขั้นตอนการดำเนินงาน</p></div>
          <div className="flex shrink-0 items-center gap-2">
            {data.steps.length > 0 && <button type="button" disabled={busy} onClick={() => document.getElementById("flow-assessment-table")?.scrollIntoView({ behavior: "smooth", block: "start" })} className={`${buttonBase} bg-blue-600 text-white`}><CheckCircle2 size={15} />ประเมิน</button>}
            <button type="button" disabled={busy} onClick={handleRefreshData} className={`${buttonBase} border border-blue-100 bg-blue-50 text-blue-700`}><RefreshCw size={15} className={loading ? "animate-spin" : ""} /><span className="hidden sm:inline">รีเฟรช</span></button>
            <button type="button" aria-label="ปิดหน้าต่าง" disabled={busy} onClick={close} className={`${buttonBase} bg-slate-100 text-slate-500`}><X size={18} /></button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {error && <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700"><span>{error}</span><button type="button" aria-label="ปิดข้อความผิดพลาด" onClick={() => setError("")}><X size={15} /></button></div>}
          {actionMessage && <div role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700"><CheckCircle2 size={17} />{actionMessage}</div>}
          {loading ? <div className="flex min-h-[430px] flex-col items-center justify-center gap-3 text-blue-600"><LoaderCircle size={34} className="animate-spin" />กำลังโหลดข้อมูล Request ID {requestId}...</div>
            : !hasId(request.id) ? <div className="py-16 text-center"><button type="button" onClick={handleRefreshData} className={`${buttonBase} bg-blue-700 text-white`}>ลองใหม่</button></div> : (
              <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <InfoCard icon={<ClipboardList size={17} />} label="เลขที่เอกสาร" value={displayDocumentNo || "-"} subValue={`Request ID: ${request.id}`} />
                  <InfoCard icon={<Building2 size={17} />} label="DC" value={request.dc_code || "-"} subValue={request.dc_type || "-"} />
                  <InfoCard icon={<Truck size={17} />} label="ประเภทรถ" value={`${request.fleet_truck_type || "-"} | ${request.fleet_type || "-"} · ${formatNumber(request.qty)} คัน`} subValue="" />
                  <InfoCard icon={<CalendarDays size={17} />} label="วันที่ต้องการใช้งาน" value={formatDate(request.usage_date)} subValue={remaining(request.usage_date)} />
                </div>
                {documentMode && visibleOldLicenses.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><SectionTitle>ทดแทนทะเบียนเก่า</SectionTitle><ul style={{ margin: "12px 0 0", paddingLeft: 18, listStyleType: "disc" }}>{visibleOldLicenses.map(license => <li key={license} style={{ marginBottom: 6 }}>{license}</li>)}</ul><p className="mt-3 text-[10px] leading-5 text-slate-500">ใช้แบบประเมินชุดเดียว อ้างอิง {selectedCar?.unit_code || `รถคันที่ ${selectedCar?.vehicle_no || "-"}`} การบันทึกขั้นตอนและรายละเอียดรถจะบันทึกที่รายการอ้างอิงนี้</p></section>}
                <section
                  aria-labelledby="request-information-title"
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3.5 sm:px-5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-white text-blue-600">
                      <ClipboardList size={18} />
                    </span>

                    <div className="min-w-0">
                      <h3
                        id="request-information-title"
                        className="text-xs font-semibold text-slate-800"
                      >
                        ข้อมูลคำขอ
                      </h3>
                      <p className="mt-1 break-words text-xs text-slate-500">
                        {displayDocumentNo || "ไม่ระบุเลขที่เอกสาร"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 p-4 sm:p-5">
                    {/* ผู้ดำเนินการ */}
                    <div className="grid grid-cols-1 gap-4 border-b border-slate-100 pb-4 sm:grid-cols-3">
                      {[
                        ["วันที่ขอ", formatDateTime(request.request_date)],
                        ["ผู้ขอ", request.request_by],
                        ["ผู้อนุมัติ", request.approved_by],
                      ].map(([label, value]) => (
                        <div key={label} className="min-w-0">
                          <DetailItem label={label || ""} value={value} />
                        </div>
                      ))}
                    </div>

                    {/* บริษัทและประเภทรถ */}
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                        <h4 className="text-xs font-semibold text-slate-800">
                          ผู้ให้บริการที่อนุมัติ
                        </h4>
                      </div>

                      <div className="space-y-4 p-4">
                        <div className="min-w-0">
                          {approvedCompanyId && (
                            <span className="mb-2 inline-flex rounded-md bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
                              รหัสผู้ให้บริการ {approvedCompanyId}
                            </span>
                          )}

                          <p className="break-words text-sm font-semibold leading-relaxed text-slate-900">
                            {approvedCompanyName || "ไม่ระบุบริษัท"}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                          <div className="min-w-0">
                            <p className="mb-2 text-[10px] text-slate-500">
                              เกรดผู้ให้บริการ
                            </p>
                            <span
                              className={`inline-flex rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ring-1 ring-inset ${(
                                  {
                                    E: "bg-emerald-50 text-emerald-700 ring-emerald-200",
                                    G: "bg-blue-50 text-blue-700 ring-blue-200",
                                    P: "bg-amber-50 text-amber-700 ring-amber-200",
                                    I: "bg-rose-50 text-rose-700 ring-rose-200",
                                  } as Record<string, string>
                                )[key(selectedCar?.company_rating).toUpperCase()] ||
                                "bg-slate-50 text-slate-500 ring-slate-200"
                                }`}
                            >
                              {approvedCompanyRating}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <p className="mb-2 text-[10px] text-slate-500">
                              ประเภทรถที่อนุมัติ
                            </p>
                            <p className="text-xs font-semibold text-slate-800">
                              {request.approved_truck_type || "-"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* เอกสารอยู่ภายในกลุ่มบริษัท */}
                      <div className="space-y-3 border-t border-slate-200 bg-slate-50/50 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-semibold text-slate-800">
                            เอกสารแนบของบริษัท
                          </h4>

                          {!companyFilesLoading && !companyFilesError && (
                            <span className="text-[10px] text-slate-500">
                              {approvedCompanyFiles.length} เอกสาร
                            </span>
                          )}
                        </div>

                        {companyFilesLoading && (
                          <p role="status" className="text-xs text-slate-500">
                            กำลังโหลดเอกสารแนบ...
                          </p>
                        )}

                        {companyFilesError && (
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                            <p>{companyFilesError}</p>
                            <button
                              type="button"
                              onClick={() => setCompanyFilesRefresh(value => value + 1)}
                              className="font-semibold underline underline-offset-2"
                            >
                              ลองใหม่
                            </button>
                          </div>
                        )}

                        {!companyFilesLoading &&
                          !companyFilesError &&
                          approvedCompanyFiles.length === 0 && (
                            <p className="rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-400">
                              ไม่มีเอกสารแนบของบริษัทนี้
                            </p>
                          )}

                        {!companyFilesLoading &&
                          !companyFilesError &&
                          approvedCompanyFiles.map(file => (
                            <div
                              key={file.attachment_id}
                              className="rounded-xl border border-slate-200 bg-white p-3"
                            >
                              <div className="flex items-start gap-3">
                                <span
                                  aria-hidden="true"
                                  className="flex h-12 w-10 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg bg-rose-50 text-rose-600"
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    className="h-5 w-5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.7"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                                    <path d="M14 2v6h6M8 13h8M8 17h5" />
                                  </svg>
                                  <span className="text-[8px] font-bold">PDF</span>
                                </span>

                                <div className="min-w-0 flex-1">
                                  <p className="break-words text-xs font-semibold leading-relaxed text-slate-900">
                                    {file.document_no || "เอกสารแนบ"}
                                  </p>
                                  <p className="mt-1 break-all text-[11px] leading-relaxed text-slate-500">
                                    ({file.file_name})
                                  </p>

                                  {file.company_name &&
                                    file.company_name !== approvedCompanyName && (
                                      <p className="mt-1 break-words text-[10px] leading-relaxed text-slate-500">
                                        {file.company_name}
                                      </p>
                                    )}
                                </div>
                              </div>

                              <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
                                <a
                                  href={`${API_BASE}/fleet_attachments.php?action=file&id=${encodeURIComponent(String(file.attachment_id))}&download=1`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50"
                                >
                                  ดาวน์โหลด ↓
                                </a>
                                <a
                                  href={`${API_BASE}/fleet_attachments.php?action=file&id=${encodeURIComponent(String(file.attachment_id))}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center rounded-lg bg-blue-700 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-blue-700"
                                >
                                  เปิด PDF ↗
                                </a>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* ข้อมูลการใช้งาน */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        ["Workload", formatNumber(request.workload)],
                        ["Truck Turn", formatNumber(request.truckturn)],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3"
                        >
                          <p className="text-[10px] text-slate-500">{label}</p>
                          <p className="mt-1.5 break-words text-sm font-semibold tabular-nums text-slate-800">
                            {value}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                      <p className="text-[10px] font-medium text-slate-500">หมายเหตุ</p>
                      <p className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-700">
                        {request.remark || "-"}
                      </p>
                    </div>
                  </div>
                </section>
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                    <section className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/60 p-4"><h4 className="text-xs font-semibold text-slate-800">ข้อมูลเพิ่มเติมของรถ</h4><p className="mb-3 mt-1 text-[10px] text-slate-400">รถคันที่ {selectedCar?.vehicle_no || "-"} · {selectedCar?.unit_code || displayDocumentNo || "-"}</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
                      {VEHICLE_FIELDS.map(field => <div key={field.key}><label htmlFor={`vehicle-${field.key}`} className="mb-1.5 block text-[10px] text-slate-500">{field.label}</label>{field.key === "warehouse_plan_date" ? <button id={`vehicle-${field.key}`} type="button" disabled={busy} onClick={e => setPicker({ kind: "warehouse", position: calendarPosition(e.currentTarget) })} className={`${inputClass} flex items-center gap-2 text-left`}><CalendarDays size={14} className="text-blue-500" />{vehicleExtraForm.warehouse_plan_date ? formatDate(vehicleExtraForm.warehouse_plan_date) : "เลือกวันที่จะเข้าคลัง"}</button> : <><input id={`vehicle-${field.key}`} type="text" list={field.key === "car_province" ? "vehicle-provinces" : field.key === "supplier_alloc" ? "vehicle-supplier-options" : undefined} disabled={busy} value={vehicleExtraForm[field.key]} onChange={e => updateExtra(field.key, e.target.value)} placeholder={field.key === "supplier_alloc" ? "พิมพ์หรือเลือกจัดสรรผู้ผลิต" : `กรอก${field.label}`} className={inputClass} />{field.key === "supplier_alloc" && <datalist id="vehicle-supplier-options">{supplierChoices.map(value => <option key={value} value={value} />)}</datalist>}{field.key === "car_province" && <ProvinceDatalist id="vehicle-provinces" />}</>}</div>)}
                      <div className="sm:col-span-2 lg:col-span-1 2xl:col-span-2"><label className="mb-1.5 block text-[10px] text-slate-500" htmlFor="vehicle-remark">หมายเหตุ</label><textarea id="vehicle-remark" rows={3} disabled={busy} value={vehicleExtraForm.remark} onChange={e => updateExtra("remark", e.target.value)} className={`${inputClass} h-auto py-2.5`} /></div>
                    </div><div className="mt-4 flex justify-end border-t border-slate-200 pt-4"><button type="button" disabled={busy || !selectedCar} onClick={handleSaveWarehouseInfo} className={`${buttonBase} bg-blue-700 text-white shadow-sm`}>{savingWarehouseInfo ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}บันทึกรายละเอียดรถ</button></div></section>
                    <section className="min-w-0 rounded-xl border border-slate-200 bg-slate-50/60 p-4"><h4 className="text-xs font-semibold text-slate-800">ข้อมูลเลขบันทึกเอกสาร</h4><p className="mb-3 mt-1 text-[10px] text-slate-400">กรอกเลขบันทึก และบันทึกแยกรายการ</p><div className="space-y-3">
                      {MEMO_FIELDS.map(field => {
                        const number = vehicleExtraForm[field.key], date = vehicleExtraForm[field.dateKey];
                        return <div key={field.key} className="rounded-xl border border-slate-200 bg-white p-3"><div className="mb-1.5 flex justify-between gap-2"><span className="text-[10px] text-slate-500">{field.label}</span>{(number || date) && <span className="rounded-full bg-emerald-50 px-2 text-[10px] text-emerald-600">มีข้อมูลแล้ว</span>}</div>
                          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px_100px] lg:grid-cols-1 xl:grid-cols-[minmax(0,1fr)_140px_100px]">
                            <input aria-label={field.label} disabled={busy} value={number} placeholder={`กรอก${field.label}`} className={inputClass} onChange={e => { const value = e.target.value; setVehicleExtraForm(p => ({ ...p, [field.key]: value, [field.dateKey]: value.trim() && !p[field.key].trim() && !p[field.dateKey] ? toDateKey(new Date()) : p[field.dateKey] })); }} />
                            <div className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3"><CalendarDays size={14} className="text-blue-500" /><div>{date ? formatDate(date) : "รอกรอกเลขบันทึก"}{date && <p className="text-[8px] text-slate-400">วันที่เพิ่มเลขบันทึก</p>}</div></div>
                            <button type="button" disabled={busy || !number.trim() || !date} onClick={() => handleSaveMemo(field)} className={`${buttonBase} bg-blue-700 px-3 text-white`}>{savingMemoKey === field.key ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}{savingMemoKey === field.key ? "กำลังบันทึก" : "บันทึก"}</button>
                          </div></div>;
                      })}
                    </div></section>
                  </div>
                </section>
                <section id="flow-assessment-table" className="scroll-mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3"><div><SectionTitle>ขั้นตอนการดำเนินงาน</SectionTitle><p className="mt-1 text-[10px] text-slate-400">เลือกวันที่และบันทึกได้ทันที ระบบจะสร้างข้อมูลขั้นตอนเมื่อบันทึกครั้งแรก</p></div><div className="flex gap-2"><span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-[10px] text-blue-600"><Clock3 size={12} />SLA จาก Master Flow</span><span className={`rounded-full px-3 py-1 text-[10px] ${data.is_initialized ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"}`}>{data.is_initialized ? "มีข้อมูลขั้นตอนที่บันทึกแล้ว" : "พร้อมบันทึกขั้นตอน"}</span></div></div>
                  {!data.steps.length ? <p className="py-10 text-center text-amber-600">ไม่พบขั้นตอนจาก Master Flow สำหรับคำขอนี้</p>
                    : !flowRows.length ? <p className="py-10 text-center text-slate-400">ไม่พบรถอ้างอิงสำหรับแสดงขั้นตอน</p> : flowRowsByVehicle.map(vehicle => {
                      const finals = [vehicle.cancelDocumentFlow, vehicle.expiredDocumentFlow].filter((f): f is DisplayFlowRow => f !== null);
                      const locked = finals.some(hasDate);
                      return <section key={key(vehicle.vehicle_no)} className="border-b border-slate-200">
                        <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-700 text-white">{vehicle.vehicle_no}</span><div><p className="font-semibold text-slate-800">{documentMode ? "แบบประเมินเอกสาร" : `รถคันที่ ${vehicle.vehicle_no}`}</p><p className="text-[10px] text-slate-400">{vehicle.license} · {vehicle.rows.length} ขั้นตอน</p></div></div><span className="text-[10px] text-slate-400">เลื่อนแนวนอน →</span></div>
                        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-semibold text-slate-500">การดำเนินการหนังสือ</p><p className="mt-0.5 text-[10px] text-slate-400">ยกเลิกหนังสือ กำหนดหนังสือหมดอายุ หรือย้อนกลับสถานะที่บันทึกไว้</p></div>
                          <div className="flex flex-wrap items-center gap-2">{finals.map(flow => {
                            const saved = hasDate(flow), cancel = Number(flow.process_level) === 9, Icon = cancel ? Ban : FileWarning;
                            if (locked && !saved) return null;
                            const saving = savingFlowId === key(flow.id), allowed = canManageDocuments(), hintId = `document-action-hint-${key(flow.id)}`;
                            return <div key={key(flow.id)} className="group relative inline-flex items-center gap-2" tabIndex={!allowed ? 0 : undefined} aria-label={!allowed ? "ติดต่อทีมสัญญาเพื่อแก้ไข" : undefined} aria-describedby={!allowed ? hintId : undefined} title={!allowed ? "ติดต่อทีมสัญญาเพื่อแก้ไข" : undefined}>
                              {saved ? <><span className={`${buttonBase} ring-1 ${cancel ? "bg-rose-100 text-rose-700 ring-rose-200" : "bg-amber-100 text-amber-700 ring-amber-200"}`}><Icon size={15} />{cancel ? "ยกเลิกหนังสือแล้ว" : "หนังสือหมดอายุแล้ว"}</span><button type="button" disabled={busy || !allowed} onClick={() => void runFlowAction(flow, true)} className={`${buttonBase} border ${allowed ? "border-blue-200 bg-white text-blue-700 hover:bg-blue-50" : "pointer-events-none border-slate-200 bg-slate-100 text-slate-400"}`}>{saving ? <LoaderCircle size={14} className="animate-spin" /> : <Undo2 size={14} />}{saving ? "กำลังย้อนกลับ..." : "ย้อนกลับสถานะ"}</button></>
                                : <button type="button" disabled={busy || !allowed} onClick={() => { const today = toDateKey(new Date()); void runFlowAction(flow, false, { str_date: today, end_date: today }); }} className={`${buttonBase} ${!allowed ? "pointer-events-none bg-slate-100 text-slate-400 ring-1 ring-slate-200" : `text-white shadow-sm ${cancel ? "bg-rose-600 hover:bg-rose-700" : "bg-amber-500 hover:bg-amber-600"}`}`}>{saving ? <LoaderCircle size={14} className="animate-spin" /> : <Icon size={15} />}{cancel ? "ยกเลิกหนังสือ" : "หนังสือหมดอายุ"}</button>}
                              {!allowed && <span id={hintId} role="tooltip" className="pointer-events-none absolute right-0 top-full z-50 mt-2 w-max max-w-[240px] rounded-lg bg-slate-800 px-3 py-2 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus:opacity-100 group-focus-within:opacity-100">ติดต่อทีมสัญญาเพื่อแก้ไข</span>}
                            </div>;
                          })}{!finals.length && <span className="text-[10px] text-slate-400">ไม่พบ Process ระดับ 9 หรือ 10 ใน Master Flow</span>}</div>
                        </div>
                        <div className="overflow-x-auto px-4 py-5"><div className="flex min-w-max items-stretch">{vehicle.rows.map((flow, index) => {
                          const draft = getDraft(flow), invalid = Boolean(draft.str_date && draft.end_date && draft.end_date < draft.str_date), startSaved = Boolean(flow.str_date && !flow.end_date), saved = Boolean(flow.str_date && flow.end_date), started = Boolean(draft.str_date), complete = Boolean(draft.str_date && draft.end_date && !invalid);
                          const allowed = canEditProcessLevel(flow.process_level), target = Math.max(0, Math.ceil(Number(stepMap.get(key(flow.process_id))?.sla ?? flow.target_sla) || 0)), due = dueDate(draft.str_date, target), actual = calculateSla(draft.str_date, draft.end_date);
                          const daysLeft = due ? dayNumber(due) - dayNumber(toDateKey(new Date())) : null, overdue = target > 0 && (complete ? actual > target : daysLeft !== null && daysLeft < 0);
                          const slaText = complete ? actual === target ? "เสร็จตรงตามกำหนด" : actual > target ? `เสร็จเกินกำหนด ${actual - target} วัน` : `เสร็จก่อนกำหนด ${target - actual} วัน` : daysLeft === null ? "" : daysLeft > 0 ? `เหลืออีก ${daysLeft} วันจะครบกำหนด` : daysLeft === 0 ? "ครบกำหนดวันนี้" : `เกินกำหนด ${Math.abs(daysLeft)} วันแล้ว`;
                          return <div key={key(flow.id)} className="flex shrink-0 items-stretch"><article className={`flex h-full w-[270px] flex-col rounded-2xl border p-4 shadow-sm ${locked ? "border-slate-300 bg-slate-100" : saved ? "border-emerald-300 bg-emerald-50" : invalid ? "border-rose-300 bg-rose-50" : started ? "border-blue-200 bg-blue-50/40" : "border-slate-200 bg-white"}`}>
                            <div className="flex items-start justify-between gap-3"><span className={`flex h-8 w-8 items-center justify-center rounded-full ${locked ? "bg-slate-300 text-slate-600" : complete ? "bg-emerald-600 text-white" : started ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>{flow.process_level}</span><span className="rounded-full bg-white/70 px-2 py-1 text-[10px] text-slate-500">{locked ? "ไม่สามารถแก้ไขได้" : saved ? "บันทึกครบแล้ว" : startSaved ? "บันทึกวันเริ่มแล้ว" : complete ? "พร้อมบันทึก" : started ? "เลือกวันเริ่มแล้ว" : "รอดำเนินการ"}</span></div>
                            <div className="mt-3 min-h-[58px]"><p className="font-semibold leading-5 text-slate-800">{flow.process}</p>{flow.detail && <p className="mt-1 line-clamp-2 text-[10px] text-slate-400">{flow.detail}</p>}</div>
                            <div className="mt-4 space-y-3">{(["str_date", "end_date"] as const).map(field => <div key={field}><span className="mb-1.5 block text-[10px] text-slate-400">{field === "str_date" ? "วันที่เริ่ม" : "วันที่สิ้นสุด"}</span><button type="button" disabled={busy || !allowed || locked || saved || (field === "str_date" ? startSaved : !draft.str_date)} title={!allowed ? "ไม่มีสิทธิ์แก้ไขขั้นตอนนี้" : undefined} onClick={e => setPicker({ kind: "flow", flowId: key(flow.id), field, position: calendarPosition(e.currentTarget) })} className={`${inputClass} flex items-center gap-2 text-left disabled:text-slate-400`}><CalendarDays size={14} className="text-blue-500" />{draft[field] ? formatDate(draft[field]) : field === "str_date" ? "เลือกวันที่เริ่ม" : "เลือกวันที่สิ้นสุด"}</button></div>)}</div>
                            {invalid && <p className="mt-2 text-[10px] text-rose-600">วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่ม</p>}
                            {locked && <div className="mt-3 rounded-xl border border-slate-300 bg-slate-200 p-3 text-[10px] text-slate-600">เอกสารถูกยกเลิกหรือหมดอายุ สามารถกด “ย้อนกลับสถานะ” เพื่อดำเนินการต่อ</div>}
                            <div className={`mt-4 rounded-xl p-3 ${overdue ? "bg-rose-50 ring-1 ring-rose-200" : complete ? "bg-emerald-50" : "bg-blue-50"}`}><div className="flex justify-between gap-3"><span className="text-[10px] text-slate-500">SLA กำหนด</span><span className="text-blue-700">{target > 0 ? `${target} วัน` : "ไม่ได้กำหนด"}</span></div>{draft.str_date && target > 0 && !invalid && <div className="mt-2 space-y-2 border-t border-black/5 pt-2"><div className="flex justify-between gap-3"><span className="text-[10px] text-slate-400">วันครบกำหนด</span><span>{formatDate(due)}</span></div><div className="flex justify-between gap-3"><span className="text-[10px] text-slate-400">สถานะ SLA</span><span className={`max-w-[145px] text-right text-[10px] ${overdue ? "text-rose-600" : complete ? "text-emerald-600" : "text-blue-700"}`}>{slaText}</span></div>{complete && <div className="flex justify-between"><span className="text-[10px] text-slate-400">ใช้จริง</span><span>{actual} วัน</span></div>}</div>}</div>
                            <div className="min-h-3 flex-1" /><button type="button" disabled={busy || !allowed || locked || saved || !draft.str_date || invalid} onClick={() => runFlowAction(flow, false)} className={`${buttonBase} mt-auto w-full ${saved ? "bg-emerald-100 text-emerald-700" : locked ? "bg-slate-300 text-slate-500" : "bg-blue-700 text-white"}`}>{savingFlowId === key(flow.id) ? <LoaderCircle size={14} className="animate-spin" /> : saved ? <CheckCircle2 size={14} /> : locked ? <Ban size={14} /> : <Save size={14} />}{savingFlowId === key(flow.id) ? "กำลังบันทึก..." : !allowed ? "ไม่มีสิทธิ์แก้ไข" : locked ? "ไม่สามารถแก้ไขได้" : saved ? "บันทึกครบแล้ว" : startSaved ? "บันทึกวันสิ้นสุด" : draft.end_date ? "บันทึกวันที่" : "บันทึกวันเริ่ม"}</button><p className="mt-3 truncate text-[10px] text-slate-400">{flow.updated_by || flow.created_by || "ยังไม่มีผู้แก้ไข"}</p>
                          </article>{index < vehicle.rows.length - 1 && <div className="flex w-10 shrink-0 items-center justify-center"><div className="h-0.5 w-5 bg-slate-200" /><ChevronRight size={15} className="-ml-1 text-slate-300" /></div>}</div>;
                        })}</div></div>
                      </section>;
                    })}
                </section>
              </div>
            )}
        </div>
      </section>
      {picker && (picker.kind === "warehouse" || activeFlow) && <div className="fixed inset-0 z-[100002]" onMouseDown={() => setPicker(null)}><div className="fixed max-h-[calc(100vh-24px)] w-[340px] max-w-[calc(100vw-24px)] overflow-y-auto rounded-2xl border border-blue-100 bg-white shadow-2xl" style={picker.position} onMouseDown={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 bg-blue-50 px-4 py-3"><div><p className="font-semibold text-blue-700">{picker.kind === "warehouse" ? "เลือกวันที่จะเข้าคลัง" : picker.field === "str_date" ? "เลือกวันที่เริ่ม" : "เลือกวันที่สิ้นสุด"}</p><p className="mt-0.5 text-[10px] text-slate-400">{activeFlow?.process || `รถคันที่ ${selectedCar?.vehicle_no || "-"}`}</p></div><button type="button" aria-label="ปิดปฏิทิน" onClick={() => setPicker(null)}><X size={15} /></button></div>
        <Calendar locale={th} date={parseDate(selectedDate)} minDate={picker.kind === "flow" && picker.field === "end_date" && activeFlow && getDraft(activeFlow).str_date ? parseDate(getDraft(activeFlow).str_date) : undefined} onChange={(date: Date) => { if (picker.kind === "warehouse") updateExtra("warehouse_plan_date", toDateKey(date)); else if (activeFlow) handleFlowDateChange(activeFlow, picker.field, toDateKey(date)); setPicker(null); }} showMonthAndYearPickers color="#2563eb" />
        <div className="border-t border-slate-100 p-4"><p className="text-[10px] text-slate-400">วันที่ที่เลือก</p><p className="mt-1 text-blue-700">{selectedDate ? formatDate(selectedDate) : "ยังไม่ได้เลือกวันที่"}</p><button type="button" disabled={!selectedDate} className={`${buttonBase} mt-3 border border-rose-200 text-rose-600`} onClick={() => { if (picker.kind === "warehouse") updateExtra("warehouse_plan_date", ""); else if (activeFlow) handleFlowDateChange(activeFlow, picker.field, ""); setPicker(null); }}><X size={13} />ล้างวันที่</button></div>
      </div></div>}
    </div>
  );
}
function SectionTitle({ children }: { children: ReactNode }) { return <h3 className="flex items-center gap-2 border-b border-slate-100 pb-2.5 text-xs font-semibold text-slate-800 before:h-4 before:w-1 before:rounded-full before:bg-blue-600 before:content-['']">{children}</h3>; }
function InfoCard({ icon, label, value, subValue }: { icon: ReactNode; label: string; value: string; subValue: string }) { return <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-blue-50/40 p-4 shadow-sm"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-white text-blue-600">{icon}</span><div className="min-w-0"><p className="text-[10px] text-slate-500">{label}</p><p className="mt-1 break-words text-xs font-semibold leading-5 text-slate-800">{value}</p>{subValue && <p className="mt-1 break-words text-[10px] text-slate-400">{subValue}</p>}</div></div></div>; }
function DetailItem({ label, value }: { label: string; value?: string | null }) { return <div><p className="text-[10px] text-slate-400">{label}</p><p className="mt-1 break-words font-semibold text-slate-700">{value || "-"}</p></div>; }

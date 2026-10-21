"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DateRange } from "react-date-range";
import type { RangeKeyDict } from "react-date-range";
import { th } from "date-fns/locale";
import { ArrowUpDown, CalendarDays, ChevronDown, ChevronUp, CircleCheck, CircleX, ClipboardList, Clock, Download, Eraser, Eye, Filter, PencilLine, RefreshCw, Search, SlidersHorizontal, Truck, Warehouse, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import FleetModalDetail from "./components/FleetModalDetail";
import ExportWaitingFleetModal from "./components/ExportWaitingFleetModal";

interface SelectedDC {
  DC_CODE?: string; DC_NAME?: string; DC_TYPE?: string;
  dc_code?: string; dc_name?: string; dc_type?: string;
}
interface UserInfo { warehouse?: string; WAREHOUSE?: string; team?: string; TEAM?: string }
interface RequestDetailItem { id?: string | number; request_id?: string | number; status?: string | null }
interface RequestItem {
  id: number | null; running_doc: string; dc_type: string; dc_code: string;
  date: string; request_date?: string; fleet_type: string; fleet_truck_type: string;
  license_replace: string[] | string; qty: number;
  approve_qty_gm?: number | string | null; approved_qty?: number | string | null;
  usage_date: string; workload: number; truckturn: number; status: string;
  request_by: string; remark: string; details?: RequestDetailItem[];
  summary?: { total_requested: number; total_approved: number; total_rejected: number };
  approved_trucks?: { old_license: string; new_truck_type: string; new_vendor_name: string; new_vendor_id: string }[];
  rejected_trucks?: { old_license: string; reason: string }[];
}
type StatusFilter = "all" | "fbp_pending" | "reject_by_fbp" | "approved";
type SortKey = "request_date" | "running_doc" | "usage_date";
type SortDirection = "asc" | "desc";
interface DateSelection { startDate: Date; endDate: Date; key: "selection" }
interface Row {
  item: RequestItem; status: string; requestedQty: number;
  licenses: string[]; requestDate: string; searchText: string;
}
type Counts = Record<StatusFilter, { qty: number; items: number }>;
const API_URL = "http://192.168.158.210/api_new_truck/api/waiting_fleet_get.php";
const NO_DATE = "ไม่ระบุวันที่";
const text = (value: unknown) => String(value ?? "").trim();
const code = (value: unknown) => text(value).toUpperCase();
const quantity = (value: unknown) => Number.isFinite(Number(value)) ? Math.max(Number(value), 0) : 0;
const number = (value: unknown) => value == null || value === "" ? "-" : Number.isFinite(Number(value)) ? Number(value).toLocaleString("en-US") : String(value);
const INPUT = "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const CELL = "whitespace-nowrap px-3 py-3";
const LABELS: Record<StatusFilter, string> = { all: "ทั้งหมด", fbp_pending: "รอทีม FBP ประเมินข้อมูล", reject_by_fbp: "ทีม FBP ไม่อนุมัติ", approved: "อนุมัติแล้ว" };
const CARDS: { key: StatusFilter; icon: LucideIcon; active: string; inactive: string }[] = [
  { key: "all", icon: ClipboardList, active: "bg-slate-800 text-white ring-slate-700", inactive: "bg-white text-slate-800 ring-slate-200" },
  { key: "fbp_pending", icon: Clock, active: "bg-amber-500 text-white ring-amber-400", inactive: "bg-amber-50 text-amber-800 ring-amber-100" },
  { key: "reject_by_fbp", icon: CircleX, active: "bg-rose-600 text-white ring-rose-500", inactive: "bg-rose-50 text-rose-800 ring-rose-100" },
  { key: "approved", icon: CircleCheck, active: "bg-emerald-600 text-white ring-emerald-500", inactive: "bg-emerald-50 text-emerald-800 ring-emerald-100" },
];
const COLUMNS: { label: string; sort?: SortKey }[] = [
  { label: "ลำดับ" }, { label: "เลขที่เอกสาร", sort: "running_doc" },
  { label: "DC Type" }, { label: "DC" }, { label: "ประเภทคำขอ" },
  { label: "ประเภทรถ" }, { label: "ทะเบียนทดแทน" }, { label: "จำนวน" },
  { label: "วันที่ใช้งาน", sort: "usage_date" }, { label: "ผู้ขอ" },
  { label: "สถานะ" }, { label: "รายละเอียด" },
];

// Only these three raw API statuses belong to the approved card.
function normalizeStatus(value: unknown): string {
  const status = text(value).toLowerCase();
  return ["process", "progress", "succes"].includes(status) ? "approved" : status === "approved" ? "unmapped_approved" : status;
}
function statusLabel(raw: string): string {
  const status = normalizeStatus(raw);
  if (status === "fbp_pending" || status === "reject_by_fbp" || status === "approved") return LABELS[status];
  return raw || "-";
}
function statusClass(status: string): string {
  if (status === "fbp_pending") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (status === "reject_by_fbp") return "bg-rose-50 text-rose-700 ring-rose-200";
  if (status === "approved") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}
function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function normalizeDate(value: unknown): string {
  const raw = text(value);
  if (!raw || raw === NO_DATE) return NO_DATE;
  const only = raw.split(/[T ]/)[0];
  let parts: string[];
  if (/^\d{4}-\d{2}-\d{2}$/.test(only)) parts = only.split("-");
  else if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(only)) {
    const [day, month, year] = only.split(/[/-]/); parts = [year, month, day];
  } else {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? NO_DATE : dateKey(parsed);
  }
  const year = Number(parts[0]);
  return `${year > 2400 ? year - 543 : year}-${parts[1]}-${parts[2]}`;
}
function formatDate(value: unknown): string {
  const key = normalizeDate(value);
  if (key === NO_DATE) return NO_DATE;
  const [year, month, day] = key.split("-"); return `${day}/${month}/${year}`;
}
function timestamp(value: unknown): number {
  const result = new Date(normalizeDate(value)).getTime();
  return Number.isFinite(result) ? result : 0;
}
function newSelection(): DateSelection { const today = new Date(); return { startDate: today, endDate: today, key: "selection" }; }
function licensesOf(value: string[] | string): string[] {
  if (Array.isArray(value)) return value.map(text).filter(Boolean);
  const raw = text(value); if (!raw) return [];
  try { const parsed: unknown = JSON.parse(raw); return Array.isArray(parsed) ? parsed.map(text).filter(Boolean) : [raw]; }
  catch { return raw.split(",").map(text).filter(Boolean); }
}
function makeRow(item: RequestItem): Row {
  const licenses = licensesOf(item.license_replace);
  // Count requested vehicles consistently for every status card.
  const requestedQty = item.summary?.total_requested != null
    ? quantity(item.summary.total_requested)
    : quantity(item.approve_qty_gm) > 0 ? quantity(item.approve_qty_gm) : quantity(item.qty);
  return { item, status: normalizeStatus(item.status), requestedQty, licenses,
    requestDate: normalizeDate(item.request_date || item.date),
    searchText: [item.running_doc, item.dc_type, item.dc_code, item.fleet_type, item.fleet_truck_type, item.request_by, item.remark, licenses.join(" ")].map(text).join(" ").toLowerCase() };
}
function optionsOf(values: string[]): string[] { return [...new Set(values.map(text).filter(Boolean))].sort((a, b) => a.localeCompare(b, "th", { numeric: true })); }
function stored<T>(keys: string[]): T | null {
  for (const key of keys) { const raw = localStorage.getItem(key); if (!raw) continue;
    try { return JSON.parse(raw) as T; } catch { console.error(`อ่าน ${key} ไม่ได้`); }
  } return null;
}
function FilterSelect({ label, value, options, onChange, icon: Icon, className = "" }: {
  label: string; value: string; options: string[]; onChange: (value: string) => void; icon: LucideIcon; className?: string;
}) {
  return <label className={`block ${className}`}><span className="mb-1.5 block text-[11px] font-bold text-slate-400">{label}</span>
    <span className="relative block"><Icon size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
      <select value={value} onChange={e => onChange(e.target.value)} className={`${INPUT} appearance-none pl-9 pr-7`}><option value="all">ทั้งหมด</option>{options.map(option => <option key={option} value={option}>{option}</option>)}</select>
      <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" />
    </span></label>;
}
function QuantityCell({ row }: { row: Row }) {
  const { item } = row;
  const approved = quantity(item.summary?.total_approved);
  const rejected = quantity(item.summary?.total_rejected);
  if (!approved && !rejected) return <span className="rounded-lg bg-slate-100 px-3 py-1 font-semibold">{number(row.requestedQty)}</span>;
  return <div className="space-y-2">
    <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 text-center">
      <div className="p-2"><p className="text-[11px] text-slate-400">จำนวนขอ</p><strong>{number(row.requestedQty)}</strong></div>
      <div className="bg-emerald-50 p-2 text-emerald-700"><p className="text-[11px]">อนุมัติ</p><strong>{number(approved)}</strong></div>
      <div className="bg-rose-50 p-2 text-rose-700"><p className="text-[11px]">ไม่อนุมัติ</p><strong>{number(rejected)}</strong></div>
    </div>
    {!!item.approved_trucks?.length && <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-2"><p className="mb-1 font-semibold text-emerald-700">รายการที่อนุมัติ:</p><ul className="space-y-1">{item.approved_trucks.map((truck, index) => <li key={index} className="text-[11px] text-slate-600"><strong>{truck.old_license}</strong> → {truck.new_truck_type} ({truck.new_vendor_name || "ไม่ระบุ Vendor"})</li>)}</ul></div>}
    {!!item.rejected_trucks?.length && <div className="rounded-lg border border-rose-100 bg-rose-50/50 p-2"><p className="mb-1 font-semibold text-rose-700">รายการที่ไม่อนุมัติ:</p><ul className="space-y-1">{item.rejected_trucks.map((truck, index) => <li key={index} className="text-[11px] text-slate-600"><strong>{truck.old_license}</strong> ({truck.reason})</li>)}</ul></div>}
  </div>;
}

export default function WaitingFleetPage() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [selectedDC, setSelectedDC] = useState<SelectedDC | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openExportModal, setOpenExportModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchText, setSearchText] = useState("");
  const [requestTypeFilter, setRequestTypeFilter] = useState("all");
  const [truckTypeFilter, setTruckTypeFilter] = useState("all");
  const [dcTypeFilter, setDcTypeFilter] = useState("all");
  const [dcFilter, setDcFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({ key: "request_date", direction: "desc" });
  const [requestDateRange, setRequestDateRange] = useState<DateSelection[]>(() => [newSelection()]);
  const [hasRequestDateRange, setHasRequestDateRange] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
  const dateButtonRef = useRef<HTMLButtonElement | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const fetchIdRef = useRef(0);
  const previousDetailOpenRef = useRef(false);
  const detailOpen = selectedRequest !== null;
  const [showSystemUpdateModal, setShowSystemUpdateModal] = useState(true);

  const fetchRequests = useCallback(async (): Promise<boolean> => {
    const id = ++fetchIdRef.current; setLoading(true); setError("");
    try {
      const response = await fetch(`${API_URL}?_refresh=${Date.now()}-${id}`, { method: "GET", cache: "no-store" });
      if (!response.ok) throw new Error("ไม่สามารถดึงข้อมูลได้");
      const data = await response.json();
      if (data?.status === "error" || data?.success === false) throw new Error(data.message || "ไม่สามารถดึงข้อมูลได้");
      const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.result) ? data.result : null;
      if (!list) throw new Error("รูปแบบข้อมูลจาก API ไม่ถูกต้อง");
      if (id === fetchIdRef.current) setRequests(list);
      return true;
    } catch (err) {
      if (id === fetchIdRef.current) setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการดึงข้อมูล");
      return false;
    } finally { if (id === fetchIdRef.current) setLoading(false); }
  }, []);
  useEffect(() => { void fetchRequests(); return () => { fetchIdRef.current += 1; }; }, [fetchRequests]);
  useEffect(() => {
    const wasOpen = previousDetailOpenRef.current; previousDetailOpenRef.current = detailOpen;
    if (wasOpen && !detailOpen) void fetchRequests();
  }, [detailOpen, fetchRequests]);
  useEffect(() => {
    setPortalTarget(document.body); setUserInfo(stored<UserInfo>(["user_info", "user", "userInfo"]));
    const loadDC = () => setSelectedDC(stored<SelectedDC>(["selected_dc"])); loadDC();
    window.addEventListener("selectedDCChanged", loadDC);
    return () => window.removeEventListener("selectedDCChanged", loadDC);
  }, []);
  useEffect(() => {
    if (!showPicker) return;
    const outside = (event: MouseEvent) => { const target = event.target as Node; if (!dateButtonRef.current?.contains(target) && !pickerRef.current?.contains(target)) setShowPicker(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setShowPicker(false); };
    const close = () => setShowPicker(false);
    document.addEventListener("mousedown", outside); document.addEventListener("keydown", escape); window.addEventListener("resize", close);
    return () => { document.removeEventListener("mousedown", outside); document.removeEventListener("keydown", escape); window.removeEventListener("resize", close); };
  }, [showPicker]);

  const selectedDcCode = code(selectedDC?.DC_CODE || selectedDC?.dc_code);
  const userWarehouse = code(userInfo?.warehouse || userInfo?.WAREHOUSE || userInfo?.team || userInfo?.TEAM);
  const isCenterUser = userWarehouse === "CENTER" || selectedDcCode === "CENTER";
  const scopeCode = selectedDcCode || userWarehouse;
  const dcName = text(selectedDC?.DC_NAME || selectedDC?.dc_name);
  const dcType = text(selectedDC?.DC_TYPE || selectedDC?.dc_type);
  const dcLabel = isCenterUser ? "CENTER - ส่วนกลาง / แสดงข้อมูลทั้งหมด" : scopeCode ? `${scopeCode}${dcName ? ` - ${dcName}` : ""}${dcType ? ` (${dcType})` : ""}` : "ไม่พบข้อมูล DC ของผู้ใช้งาน";
  const scopedRequests = useMemo(() => isCenterUser ? requests : scopeCode ? requests.filter(item => code(item.dc_code) === scopeCode) : [], [requests, isCenterUser, scopeCode]);
  const rows = useMemo(() => scopedRequests.map(makeRow), [scopedRequests]);
  const requestTypes = useMemo(() => optionsOf(scopedRequests.map(item => item.fleet_type)), [scopedRequests]);
  const truckTypes = useMemo(() => optionsOf(scopedRequests.filter(item => requestTypeFilter === "all" || text(item.fleet_type) === requestTypeFilter).map(item => item.fleet_truck_type)), [scopedRequests, requestTypeFilter]);
  const dcTypes = useMemo(() => optionsOf(scopedRequests.map(item => item.dc_type)), [scopedRequests]);
  const dcOptions = useMemo(() => optionsOf(scopedRequests.filter(item => dcTypeFilter === "all" || code(item.dc_type) === code(dcTypeFilter)).map(item => item.dc_code)), [scopedRequests, dcTypeFilter]);

  const filteredRows = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    const start = dateKey(requestDateRange[0].startDate), end = dateKey(requestDateRange[0].endDate);
    return rows.filter(row => {
      const { item } = row;
      // all does not exclude any API status.
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      // Raw 'approved' is not one of the three approved API statuses.
      if (statusFilter === "approved" && !["process", "progress", "succes"].includes(text(item.status).toLowerCase())) return false;
      if (requestTypeFilter !== "all" && text(item.fleet_type) !== requestTypeFilter) return false;
      if (truckTypeFilter !== "all" && text(item.fleet_truck_type) !== truckTypeFilter) return false;
      if (dcTypeFilter !== "all" && code(item.dc_type) !== code(dcTypeFilter)) return false;
      if (dcFilter !== "all" && code(item.dc_code) !== code(dcFilter)) return false;
      if (keyword && !row.searchText.includes(keyword)) return false;
      return !hasRequestDateRange || (row.requestDate !== NO_DATE && row.requestDate >= start && row.requestDate <= end);
    });
  }, [rows, statusFilter, searchText, requestTypeFilter, truckTypeFilter, dcTypeFilter, dcFilter, hasRequestDateRange, requestDateRange]);
  const sortedRows = useMemo(() => [...filteredRows].sort((a, b) => {
    const comparison = sortConfig.key === "running_doc" ? text(a.item.running_doc).localeCompare(text(b.item.running_doc), "th", { numeric: true, sensitivity: "base" }) : sortConfig.key === "usage_date" ? timestamp(a.item.usage_date) - timestamp(b.item.usage_date) : timestamp(a.requestDate) - timestamp(b.requestDate);
    return sortConfig.direction === "asc" ? comparison : -comparison;
  }), [filteredRows, sortConfig]);
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const activePage = Math.min(Math.max(currentPage, 1), totalPages);
  const pageStart = (activePage - 1) * pageSize;
  useEffect(() => { setCurrentPage(1); }, [statusFilter, searchText, requestTypeFilter, truckTypeFilter, dcTypeFilter, dcFilter, hasRequestDateRange, requestDateRange, selectedDcCode, userWarehouse, pageSize, sortConfig]);
  useEffect(() => { setCurrentPage(page => Math.min(Math.max(page, 1), totalPages)); }, [totalPages]);
  const pageRows = useMemo(() => sortedRows.slice(pageStart, pageStart + pageSize), [sortedRows, pageStart, pageSize]);
  const groups = useMemo(() => {
    // Adjacent date groups preserve the selected document/usage-date sort order.
    const result: { date: string; offset: number; rows: Row[] }[] = [];
    pageRows.forEach((row, index) => {
      const last = result[result.length - 1];
      if (last && last.date === row.requestDate) last.rows.push(row);
      else result.push({ date: row.requestDate, offset: index, rows: [row] });
    }); return result;
  }, [pageRows]);
  const statusCounts = useMemo<Counts>(() => {
    const counts: Counts = { all: { qty: 0, items: 0 }, fbp_pending: { qty: 0, items: 0 }, reject_by_fbp: { qty: 0, items: 0 }, approved: { qty: 0, items: 0 } };
    for (const row of pageRows) {
      counts.all.items++; counts.all.qty += row.requestedQty;
      const raw = text(row.item.status).toLowerCase();
      const key = raw === "fbp_pending" ? "fbp_pending" : raw === "reject_by_fbp" ? "reject_by_fbp" : ["process", "progress", "succes"].includes(raw) ? "approved" : null;
      if (key) { counts[key].items++; counts[key].qty += row.requestedQty; }
    } return counts;
  }, [pageRows]);

  const clearDates = () => { setHasRequestDateRange(false); setRequestDateRange([newSelection()]); };
  const clearFilters = () => { setStatusFilter("all"); setSearchText(""); setRequestTypeFilter("all"); setTruckTypeFilter("all"); setDcTypeFilter("all"); setDcFilter("all"); setShowPicker(false); clearDates(); };
  const sort = (key: SortKey) => setSortConfig(old => ({ key, direction: old.key === key && old.direction === "asc" ? "desc" : "asc" }));
  const togglePicker = () => {
    if (showPicker) { setShowPicker(false); return; }
    const rect = dateButtonRef.current?.getBoundingClientRect(); if (!rect) return;
    const width = Math.min(330, window.innerWidth - 32);
    setPickerPosition({ top: Math.max(16, Math.min(rect.bottom + 8, window.innerHeight - 406)), left: Math.max(16, Math.min(rect.right - width, window.innerWidth - width - 16)) }); setShowPicker(true);
  };
  const changeDate = (ranges: RangeKeyDict) => { const selection = ranges.selection; if (!selection) return; const startDate = selection.startDate || new Date(); setRequestDateRange([{ startDate, endDate: selection.endDate || startDate, key: "selection" }]); setHasRequestDateRange(true); };
  const dateLabel = hasRequestDateRange ? `${formatDate(dateKey(requestDateRange[0].startDate))} - ${formatDate(dateKey(requestDateRange[0].endDate))}` : "เลือกช่วงวันที่ขอ";
  const title = statusFilter === "all" ? "รายการกองรถทั้งหมด" : `รายการ${LABELS[statusFilter]}`;

  return <div className="min-h-screen bg-slate-50 text-slate-800"><main className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-4 lg:px-5">
    <header className="mb-4 flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
      <div><p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Fleet Management</p><h1 className="mt-2 flex items-center gap-2 text-lg font-semibold"><Truck size={20} className="text-blue-600" />รอประเมินกองรถ</h1>
        <div className="mt-2 flex flex-wrap gap-2"><span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold"><Warehouse size={12} />{dcLabel}</span><span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-600">{LABELS[statusFilter]}</span></div></div>
      <div className="flex gap-2"><button type="button" onClick={() => setOpenExportModal(true)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-semibold hover:bg-blue-50"><Download size={15} />ดึงรายงาน</button><button type="button" onClick={() => void fetchRequests()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><RefreshCw size={15} className={loading ? "animate-spin" : ""} />{loading ? "กำลังโหลด..." : "รีเฟรชข้อมูล"}</button></div>
    </header>
    {error && <div role="alert" className="mb-4 rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-600">{error}</div>}
    <div className="mb-2 flex justify-between text-[11px] text-slate-500"><span>สรุปเฉพาะรายการในตารางหน้าปัจจุบัน</span><span>หน้า {activePage} / {totalPages}</span></div>
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">{CARDS.map(card => {
      const Icon = card.icon, active = statusFilter === card.key, count = statusCounts[card.key];
      return <button key={card.key} type="button" aria-pressed={active} onClick={() => setStatusFilter(card.key)} className={`relative overflow-hidden rounded-xl p-3 text-left shadow-sm ring-1 transition hover:shadow-md ${active ? card.active : card.inactive}`}>
        <Icon size={82} aria-hidden="true" className="pointer-events-none absolute right-2 top-3 opacity-10" /><div className="relative"><p className="text-[11px] font-semibold">{LABELS[card.key]}</p><p className="mt-1 text-[11px] opacity-60">เฉพาะตารางหน้านี้</p><div className="mt-4 flex items-end justify-between gap-2"><p className="text-2xl font-semibold">{number(count.qty)}<span className="ml-1 text-xs opacity-60">คัน</span></p><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${active ? "bg-white/15" : "bg-white/80"}`}>{number(count.items)} รายการ</span></div></div></button>;
    })}</div>
    <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-4 flex items-center gap-2"><SlidersHorizontal size={17} className="text-blue-600" /><h2 className="text-xs font-semibold">ค้นหาและตัวกรอง</h2></div>
      <div className="grid gap-3 lg:grid-cols-12">
        <label className="block lg:col-span-3"><span className="mb-1.5 block text-[11px] font-bold text-slate-400">ค้นหา</span><span className="relative block"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" /><input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="เลขเอกสาร, DC, ผู้ขอ, ทะเบียน..." className={`${INPUT} pl-9 pr-8`} />{searchText && <button type="button" aria-label="ล้างคำค้นหา" onClick={() => setSearchText("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={13} /></button>}</span></label>
        <FilterSelect label="ประเภทคำขอ" value={requestTypeFilter} options={requestTypes} icon={Filter} className="lg:col-span-2" onChange={value => { setRequestTypeFilter(value); setTruckTypeFilter("all"); }} />
        <FilterSelect label="ประเภทรถ" value={truckTypeFilter} options={truckTypes} icon={Truck} className="lg:col-span-2" onChange={setTruckTypeFilter} />
        <FilterSelect label="DC Type" value={dcTypeFilter} options={dcTypes} icon={Filter} className="lg:col-span-1" onChange={value => { setDcTypeFilter(value); setDcFilter("all"); }} />
        <FilterSelect label="DC" value={dcFilter} options={dcOptions} icon={Warehouse} className="lg:col-span-1" onChange={setDcFilter} />
        <div className="lg:col-span-2"><span className="mb-1.5 block text-[11px] font-bold text-slate-400">วันที่ขอ</span><div className="relative"><button ref={dateButtonRef} type="button" aria-expanded={showPicker} onClick={togglePicker} title={dateLabel} className={`${INPUT} truncate pl-8 pr-7 text-left`}><CalendarDays size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-blue-400" />{dateLabel}</button>{hasRequestDateRange && <button type="button" aria-label="ล้างวันที่" onClick={clearDates} className="absolute right-2 top-1/2 -translate-y-1/2"><X size={13} /></button>}</div></div>
        <div className="flex items-end lg:col-span-1"><button type="button" onClick={clearFilters} className={`${INPUT} flex items-center justify-center gap-1 hover:bg-rose-50`}><Eraser size={14} />ล้าง</button></div>
      </div></section>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3"><div><h2 className="text-xs font-semibold">{title}</h2><p className="mt-1 text-[11px] text-slate-400">หน้านี้ {number(pageRows.length)} รายการ · พบทั้งหมด {number(filteredRows.length)} รายการ</p></div><span className="text-[11px] text-blue-600">เลือกปุ่มท้ายรายการเพื่อดูรายละเอียด</span></div>
      <div className="max-h-[70vh] min-h-[360px] overflow-auto"><table className="w-full min-w-[1080px] border-separate border-spacing-0 text-left text-xs"><thead className="sticky top-0 z-20"><tr>{COLUMNS.map((column, index) => {
        const key = column.sort;
        return <th key={column.label} aria-sort={key ? sortConfig.key === key ? sortConfig.direction === "asc" ? "ascending" : "descending" : "none" : undefined} className={`${CELL} bg-blue-800 text-[11px] font-semibold text-white ${index === 0 ? "sticky left-0 z-30 text-center" : ""}`}>{key ? <button type="button" onClick={() => sort(key)} className="inline-flex items-center gap-1">{column.label}{sortConfig.key !== key ? <ArrowUpDown size={13} /> : sortConfig.direction === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</button> : column.label}</th>;
      })}</tr></thead><tbody>
        {loading ? <tr><td colSpan={12} className="py-12 text-center text-slate-400"><RefreshCw size={22} className="mx-auto mb-2 animate-spin text-blue-500" />กำลังโหลดข้อมูล...</td></tr> : !pageRows.length ? <tr><td colSpan={12} className="py-12 text-center text-slate-400"><Search size={24} className="mx-auto mb-2" />ไม่พบข้อมูลตามเงื่อนไขนี้</td></tr> : groups.map(group => <Fragment key={`${group.date}-${group.offset}`}>
          <tr><td colSpan={12} className="bg-blue-50 px-4 py-2 text-[11px] font-semibold text-blue-600"><span className="inline-flex items-center gap-2"><CalendarDays size={13} />วันที่ขอ: {formatDate(group.date)}<span className="text-slate-400">· {group.rows.length} รายการ</span></span></td></tr>
          {group.rows.map((row, index) => { const { item } = row; const pending = row.status === "fbp_pending"; return <tr key={`${item.id ?? item.running_doc}-${group.offset + index}`} className="group hover:bg-blue-50/30">
            <td className={`${CELL} sticky left-0 z-10 bg-white text-center group-hover:bg-blue-50`}>{pageStart + group.offset + index + 1}</td>
            <td className={CELL}><p className="font-semibold">{item.running_doc || "-"}</p><p className="mt-1 text-[11px] text-slate-400">ขอ: {formatDate(row.requestDate)}</p></td>
            <td className={CELL}><span className="rounded-md bg-blue-50 px-2 py-1 text-blue-600">{item.dc_type || "-"}</span></td>
            <td className={CELL}><span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-600">{item.dc_code || "-"}</span></td>
            <td className={CELL}>{item.fleet_type || "-"}</td><td className={CELL}>{item.fleet_truck_type || "-"}</td>
            <td className="max-w-[160px] px-3 py-3"><div className="flex flex-wrap gap-1">{row.licenses.length ? <>{row.licenses.slice(0, 2).map((license, i) => <span key={i} title={license} className="max-w-[90px] truncate rounded bg-slate-100 px-2 py-1 text-[11px]">{license}</span>)}{row.licenses.length > 2 && <span title={row.licenses.slice(2).join(", ")} className="rounded bg-blue-50 px-2 py-1 text-[11px] text-blue-600">+{row.licenses.length - 2}</span>}</> : "-"}</div></td>
            <td className="min-w-[280px] px-3 py-3"><QuantityCell row={row} /></td><td className={CELL}>{formatDate(item.usage_date)}</td><td className={CELL}>{item.request_by || "-"}</td>
            <td className={CELL}><span title={`API status: ${item.status}`} className={`rounded-full px-3 py-1 text-[11px] font-semibold ring-1 ${statusClass(row.status)}`}>{statusLabel(item.status)}</span></td>
            <td className={`${CELL} text-right`}><button type="button" onClick={() => setSelectedRequest(item)} className={`inline-flex h-9 min-w-[130px] items-center justify-center gap-2 rounded-xl px-3 text-[11px] font-semibold ${pending ? "bg-blue-700 text-white hover:bg-blue-800" : "border border-slate-200 hover:bg-blue-50"}`}>{pending ? <><PencilLine size={14} />อัปเดตสถานะ</> : <><Eye size={14} />ดูรายละเอียด</>}</button></td>
          </tr>; })}
        </Fragment>)}
      </tbody></table></div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-xs"><div className="flex flex-wrap items-center gap-2"><span>แสดง</span><select aria-label="จำนวนรายการต่อหน้า" value={pageSize} disabled={loading} onChange={e => setPageSize(Number(e.target.value))} className="h-9 rounded-lg border border-slate-200 px-2">{[20, 25, 50, 100].map(size => <option key={size} value={size}>{size} รายการ</option>)}</select><span className="text-slate-400">{sortedRows.length ? pageStart + 1 : 0}–{Math.min(pageStart + pageSize, sortedRows.length)} จากทั้งหมด {number(sortedRows.length)} รายการ</span></div><div className="flex items-center gap-2"><button type="button" disabled={loading || activePage <= 1} onClick={() => setCurrentPage(activePage - 1)} className="h-9 rounded-lg border px-3 disabled:opacity-40">ก่อนหน้า</button><span>หน้า</span><select aria-label="เลือกหน้าตาราง" value={activePage} disabled={loading || !sortedRows.length} onChange={e => setCurrentPage(Number(e.target.value))} className="h-9 rounded-lg border px-2">{Array.from({ length: totalPages }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select><span>/ {totalPages}</span><button type="button" disabled={loading || activePage >= totalPages} onClick={() => setCurrentPage(activePage + 1)} className="h-9 rounded-lg bg-blue-600 px-3 text-white disabled:opacity-40">ถัดไป</button></div></div>
    </section>
    {portalTarget && showPicker && createPortal(<div ref={pickerRef} style={pickerPosition} className="fixed z-[99999] max-h-[calc(100vh-32px)] w-[330px] max-w-[calc(100vw-32px)] overflow-auto rounded-2xl border border-blue-100 bg-white shadow-2xl"><div className="flex items-center justify-between bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-700"><span>เลือกช่วงวันที่ขอ</span><button type="button" onClick={clearDates}>ล้าง</button></div><DateRange locale={th} ranges={requestDateRange} onChange={changeDate} editableDateInputs={false} moveRangeOnFirstSelection={false} showDateDisplay={false} showPreview={false} maxDate={new Date()} rangeColors={["#2563eb"]} /><div className="flex items-center justify-between gap-2 border-t p-3"><span className="truncate text-[11px] text-blue-600">{dateLabel}</span><button type="button" onClick={() => setShowPicker(false)} className="rounded-lg bg-blue-600 px-3 py-2 text-[11px] text-white">เสร็จสิ้น</button></div></div>, portalTarget)}
    {portalTarget && createPortal(<div style={{ position: "relative", zIndex: 100000 }}><ExportWaitingFleetModal open={openExportModal} onClose={() => setOpenExportModal(false)} requests={scopedRequests} dcLabel={dcLabel} />{selectedRequest && <FleetModalDetail open={detailOpen} onClose={() => setSelectedRequest(null)} data={selectedRequest} allRequests={requests} onSuccess={async () => { if (!(await fetchRequests())) throw new Error("โหลดรายการล่าสุดไม่สำเร็จ"); }} />}</div>, portalTarget)}
    {portalTarget &&
  showSystemUpdateModal &&
  createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      style={{ zIndex: 2147483647 }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="system-update-title"
        aria-describedby="system-update-description"
        className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="h-1 bg-amber-400" />

        <div className="p-5 sm:p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="25"
              height="25"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="text-amber-600"
            >
              <path d="m10.3 3.9-8.1 14a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3l-8.1-14a2 2 0 0 0-3.4 0Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-600">
            แจ้งเตือนจากระบบ
          </p>

          <h2
            id="system-update-title"
            className="mt-2 text-base font-semibold text-slate-900"
          >
            อยู่ระหว่างปรับปรุงข้อมูล
          </h2>

          <p
            id="system-update-description"
            className="mt-3 text-xs leading-6 text-slate-600"
          >
            ขณะนี้กำลังปรับปรุงข้อมูลภายในระบบ
            ซึ่งส่งผลต่อข้อมูลที่แสดงในหน้านี้
            ทำให้ข้อมูลอาจยังไม่เป็นปัจจุบัน
            และยังไม่สามารถอัปเดตได้ชั่วคราว
          </p>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-[11px] font-medium text-amber-700">
              กำหนดอัปเดตข้อมูล
            </p>

            <p className="mt-1 text-sm font-semibold text-amber-950">
              26/10/2569 เวลา 10:00 น.
            </p>

            <p className="mt-1 text-[11px] text-amber-700">
              ตามเวลาประเทศไทย
            </p>
          </div>

          <p className="mt-4 text-[11px] leading-5 text-slate-400">
            ขออภัยในความไม่สะดวก
            กรุณาตรวจสอบข้อมูลอีกครั้งหลังจากเวลาดังกล่าว
          </p>

          <button
            type="button"
            autoFocus
            onKeyDown={event => {
              // เก็บโฟกัสไว้ใน Modal ซึ่งมีปุ่มเดียว
              if (event.key === "Tab") event.preventDefault();
              if (event.key === "Escape") {
                setShowSystemUpdateModal(false);
              }
            }}
            onClick={() => setShowSystemUpdateModal(false)}
            className="mt-5 flex h-10 w-full items-center justify-center rounded-xl bg-blue-600 text-xs font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            รับทราบ
          </button>
        </div>
      </section>
    </div>,
    portalTarget,
  )}
    <style jsx>{`main :global(button:focus-visible), main :global(select:focus-visible), main :global(input:focus-visible) { outline: 2px solid #2563eb; outline-offset: 3px; } @media (prefers-reduced-motion: reduce) { main :global(*) { animation: none !important; transition: none !important; } }`}</style>
  </main></div>;
}

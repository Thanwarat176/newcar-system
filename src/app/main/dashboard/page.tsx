"use client";
import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import FlowAssessmentModal from "../trackFleet/component/FlowAssessmentModal";
import { createPortal } from "react-dom";

interface UserInfo {
  warehouse?: string;
  WAREHOUSE?: string;
  team?: string;
  TEAM?: string;
}

interface SelectedDC {
  DC_CODE?: string;
  DC_NAME?: string;
  DC_TYPE?: string;
}

type FleetId = number | string | null;
interface WarehouseRecord {
  request_id?: FleetId;
  vehicle_no: number | string | null;
  warehouse_plan_date?: string | null;
  supplier_alloc?: string | null;
}
interface FlowRecord {
  request_id?: FleetId;
  vehicle_no: number | string | null;
  process_id?: FleetId;
  process_level?: number | string | null;
  str_date?: string | null;
}
interface ProcessDefinition {
  id: number | string;
  process_level: number | string;
  process?: string;
  fleet_type?: string | null;
}
interface FleetRequest {
  running_doc?: string | null;
  raw_unit_code?: unknown;
  incoming_truck_id?: FleetId;
  id: FleetId;
  vehicle_no?: FleetId;
  unit_code?: string | null;
  dc_code: string | null;
  dc_type?: string | null;
  fleet_type?: string | null;
  status: string | null;
  qty: number | string | null;
  request_date?: string | null;
  area?: string | null;
  fbp?: string | null;
  approved_company_id?: number | string | null;
  approved_company_name?: string | null;
  approved_company_short_name?: string | null;
  approved_company_display_name?: string | null;
  workload?: number | string | null;
  latest_process_name?: string | null;
  latest_process_level?: number | string | null;
  new_truck_type?: string | null;
  new_vendor_name?: string | null;
  supplier_alloc?: string | null;
  vehicle_info?: WarehouseRecord | WarehouseRecord[] | null;
  vehicle_warehouse_info?: WarehouseRecord | WarehouseRecord[] | null;
  flow_data?: FlowRecord | FlowRecord[] | null;
}
interface DcSummary {
  dcCode: string;
  green: number;
  red: number;
  total: number;
}
interface TimelinePoint {
  /** For a manual timeline, use YYYY-MM-DD. Values are cumulative. */
  label: string;
  planned: number;
  actual: number | null;
}
interface DashboardRecords {
  warehouseRecords: WarehouseRecord[];
  flowRecords: FlowRecord[];
}
interface Props {
  initialFleetType?: string;
  timeline?: TimelinePoint[];
  warehouseRecords?: WarehouseRecord[];
  flowRecords?: FlowRecord[];
  processes?: ProcessDefinition[];
  title?: string;
  requests?: FleetRequest[];
  apiUrl?: string;
  dashboardApiUrl?: string;
}
type DashboardSummaryKey = "all" | "gm" | "fbp" | "tcas" | "success" | "cancel";
type DashboardSummary = Record<DashboardSummaryKey, { qty: number; items: number }>;
const DASHBOARD_SUMMARY_CARDS = [
  { key: "all", label: "ทั้งหมด", detail: "คำขอทุกสถานะ", color: "#2563eb", tint: "#eff6ff" },
  { key: "gm", label: "GM พิจารณาใบตำขอ", detail: "GM พิจารณาตามความเหมาะสม", color: "#d97706", tint: "#fffbeb" },
  { key: "fbp", label: "ประเมินกองรถ (FBP)", detail: "พิจารณาจากส่วนการ", color: "#7c3aed", tint: "#f5f3ff" },
  { key: "tcas", label: "ติดตามกองรถออกใหม่/\n รถทดแทน (TCAS)", detail: "อยู่ระหว่างดำเนินการตามกระบวนการออกรถ", color: "#0891b2", tint: "#ecfeff" },
  { key: "success", label: "ส่งมอบเข้าคลังแล้ว", detail: "ส่งมอบรถเข้าคลังแล้ว", color: "#059669", tint: "#ecfdf5" },
  { key: "cancel", label: "ยกเลิกหนังสือ", detail: "รายการคำขอที่โดนยกเลิกทุกสถานะ", color: "#e11d48", tint: "#fff1f2" },
] as const;
function matchesDashboardStatus(value: string | null, filter: string): boolean {
  return filter === "all" || dashboardStatusGroup(value) === filter;
}
function DashboardStatusIcon({ status }: { status: DashboardSummaryKey }) {
  const paths: Record<DashboardSummaryKey, string> = {
    all: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
    gm: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M16 11l2 2 4-4",
    fbp: "M3 7h12v10H3z M15 10h4l3 4v3h-7 M5 17v1a2 2 0 0 0 4 0v-1 M16 17v1a2 2 0 0 0 4 0v-1 M6 4h6",
    tcas: "M20 7a9 9 0 0 0-15-2L2 8 M2 3v5h5 M4 17a9 9 0 0 0 15 2l3-3 M22 21v-5h-5 M12 8v4l3 2",
    success: "M22 11v1a10 10 0 1 1-6-9 M22 4l-10 10-3-3",
    cancel: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M8 8l8 8 M16 8l-8 8",
  };
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[status]} /></svg>;
}
const FLEET_STATUSES = DASHBOARD_SUMMARY_CARDS.filter(card => card.key !== "all");
function dashboardStatusGroup(value: string | null): string {
  const status = String(value ?? "").trim().toLowerCase();
  if (status === "gm_pending") return "gm";
  if (status === "fbp_pending" || status === "partial_approved") return "fbp";
  if (status === "process" || status === "progress") return "tcas";
  if (["cancel", "reject_by_gm", "reject_by_fbp"].includes(status)) return "cancel";
  return status;
}
const MONTH_NAMES = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const MONTH_SHORT_NAMES = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const EMPTY_WAREHOUSE: WarehouseRecord[] = [];
const EMPTY_FLOW: FlowRecord[] = [];
const EMPTY_PROCESSES: ProcessDefinition[] = [];
const formatNumber = (value: number) => value.toLocaleString("en-US");
const percentage = (value: number, total: number) =>
  total > 0 ? (value / total) * 100 : 0;
function calendarDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/.exec(value.trim());
  if (!match) return null;
  const day = `${match[1]}-${match[2]}-${match[3]}`;
  const date = new Date(`${day}T00:00:00Z`);
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === day
    ? day
    : null;
}

function vehicleKey(
  requestId: FleetId | undefined,
  vehicleNo: number | string | null,
): string | null {
  const id = String(requestId ?? "").trim();
  const no = String(vehicleNo ?? "").trim();
  return id && no ? JSON.stringify([id, no]) : null;
}
function asRecords<T>(value: T | T[] | null | undefined): T[] {
  return value == null ? [] : Array.isArray(value) ? value : [value];
}
function groupFleetByDc(requests: FleetRequest[]): DcSummary[] {
  const groups = new Map<string, DcSummary>();
  for (const item of requests) {
    const dcCode = String(item.dc_code || "").trim() || "ไม่ระบุคลัง";
    const qty = Number(item.qty);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const current = groups.get(dcCode) ?? {
      dcCode,
      green: 0,
      red: 0,
      total: 0,
    };
    if (item.status === "success") {
      current.green += qty;
    } else {
      current.red += qty;
    }
    current.total += qty;
    groups.set(dcCode, current);
  }
  return Array.from(groups.values()).sort((a, b) =>
    b.red - a.red || a.dcCode.localeCompare(b.dcCode, "th"),
  );
}
function isRequest(value: unknown): value is FleetRequest {
  return typeof value === "object" && value !== null &&
    "dc_code" in value && "qty" in value && "status" in value;
}

function isTemporaryFleet(value: unknown): boolean {
  const name = String(value ?? "").replace(/\s+/g, " ").trim();
  return name === "รถเสริมชั่วคราว" ||
    name === "รถเสริมชั่วคราว (รถที่ไม่ใช่ฟลีทหลัก)";
}

function normalizeFleetRow(value: unknown): FleetRequest {
  if (typeof value !== "object" || value === null) {
    throw new Error("รายการรถไม่ถูกต้อง");
  }
  const row = value as Record<string, unknown>;
  const isIncoming = "incoming_truck_id" in row ||
    ("request_id" in row && "new_truck_type" in row);
  if (!isIncoming) {
    if (isRequest(value)) return value;
    const missing = ["dc_code", "qty", "status"].filter(key => !(key in row));
    throw new Error(`รายการข้อมูลขาดช่อง: ${missing.join(", ")}`);
  }
  const requestId = row.request_id;
  if ((typeof requestId !== "string" && typeof requestId !== "number") || !("dc_code" in row)) {
    throw new Error("รายการรถเข้าใหม่ต้องมี request_id และ dc_code");
  }
  const info = row.vehicle_warehouse_info ?? row.warehouse_info ?? row.vehicle_info;
  const infoRows = asRecords(info as WarehouseRecord | WarehouseRecord[] | null | undefined);
  const infoRow = (infoRows[0] ?? {}) as unknown as Record<string, unknown>;
  const supplierAlloc = String(row.supplier_alloc ?? infoRow.supplier_alloc ?? "").trim() || null;
  const vehicleNo = row.warehouse_vehicle_no ?? infoRow.vehicle_no;
  const validVehicleNo = typeof vehicleNo === "string" || typeof vehicleNo === "number"
    ? vehicleNo : null;
  const plan = infoRow.warehouse_plan_date ?? row.warehouse_plan_date;
  const level = String(row.latest_process_level ?? "").trim();
  // API request status is authoritative; a process level must not overwrite it.
  const status = String(row.request_status ?? row.status ?? "").trim().toLowerCase();
  return {
    // Dashboard records are joined by the original request ID, not incoming_truck_id.
    id: requestId,
    running_doc: row.running_doc == null ? null : String(row.running_doc).trim(),
    incoming_truck_id: typeof (row.incoming_truck_id ?? row.id) === "number" || typeof (row.incoming_truck_id ?? row.id) === "string" ? (row.incoming_truck_id ?? row.id) as number | string : null,
    vehicle_no: validVehicleNo,
    raw_unit_code: row.unit_code,
    unit_code: row.unit_code == null ? null : String(row.unit_code).trim(),
    dc_code: row.dc_code == null ? null : String(row.dc_code),
    dc_type: row.dc_type == null ? null : String(row.dc_type),
    fleet_type: row.fleet_type == null ? null : String(row.fleet_type),
    qty: 1,
    request_date: typeof row.request_date === "string" ? row.request_date : null,
    area: row.dc_code == null ? null : String(row.dc_code).trim(),
    approved_company_id: row.approved_company_id == null ? null : String(row.approved_company_id).trim(),
    approved_company_name: row.approved_company_name == null ? null : String(row.approved_company_name).trim(),
    approved_company_short_name: row.approved_company_short_name == null ? null : String(row.approved_company_short_name).trim(),
    approved_company_display_name: row.approved_company_display_name == null ? null : String(row.approved_company_display_name).trim(),
    status,
    workload: typeof row.workload === "string" || typeof row.workload === "number" ? row.workload : null,
    latest_process_name: row.latest_process_name == null ? null : String(row.latest_process_name),
    latest_process_level: level || null,
    new_truck_type: row.new_truck_type == null ? null : String(row.new_truck_type),
    new_vendor_name: row.new_vendor_name == null ? null : String(row.new_vendor_name),
    supplier_alloc: supplierAlloc,
    vehicle_warehouse_info: {
      request_id: requestId,
      vehicle_no: validVehicleNo,
      warehouse_plan_date: typeof plan === "string" ? plan : null,
      supplier_alloc: supplierAlloc,
    },
    // Actual dates still come from stage-8 flow records; do not substitute updated_at.
    flow_data: row.flow_data as FlowRecord | FlowRecord[] | null | undefined,
  };
}

function readFleetRequests(value: unknown): FleetRequest[] {
  if (Array.isArray(value)) return value.map(normalizeFleetRow);
  if (typeof value === "object" && value !== null) {
    const data = value as Record<string, unknown>;
    if (data.status === "error" || data.success === false) {
      throw new Error(typeof data.message === "string" ? data.message : "โหลดข้อมูลคำขอไม่สำเร็จ");
    }
    if ("incoming_truck_id" in data || ("request_id" in data && "new_truck_type" in data) || isRequest(value)) return [normalizeFleetRow(value)];
    for (const key of ["data", "result", "requests", "request", "items", "results"]) {
      if (data[key] !== undefined && data[key] !== null) return readFleetRequests(data[key]);
    }
  }
  throw new Error("รูปแบบข้อมูล API ไม่ตรงกับที่รองรับ");
}

function readFleetRawRows(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.map(row => {
      if (typeof row !== "object" || row === null) throw new Error("รายการรถไม่ถูกต้อง");
      return row as Record<string, unknown>;
    });
  }
  if (typeof value === "object" && value !== null) {
    const root = value as Record<string, unknown>;
    if (root.status === "error" || root.success === false) {
      throw new Error(typeof root.message === "string" ? root.message : "โหลดข้อมูลไม่สำเร็จ");
    }
    if ("incoming_truck_id" in root || isRequest(value)) return [root];
    for (const key of ["data", "result", "requests", "request", "items", "results"]) {
      if (root[key] !== undefined && root[key] !== null) return readFleetRawRows(root[key]);
    }
  }
  throw new Error("รูปแบบข้อมูล API ไม่ตรงกับที่รองรับ");
}

async function fetchAllFleetRequests(apiUrl: string, signal: AbortSignal, onFleetTypes?: (types: string[]) => void, onProcesses?: (definitions: ProcessDefinition[]) => void): Promise<FleetRequest[]> {
  const baseUrl = new URL(apiUrl, window.location.href);
  const results: FleetRequest[] = [];
  const seen = new Set<string>();
  let page = 1;
  while (true) {
    signal.throwIfAborted();
    const url = new URL(baseUrl.toString());
    {
      url.searchParams.set("page", String(page));
      // Keep the supported page size and load every page, rather than assuming limit=0 means all.
      url.searchParams.set("limit", baseUrl.searchParams.get("limit") || "20");
    }
    const response = await fetch(url.toString(), { method: "GET", cache: "no-store", signal });
    if (!response.ok) throw new Error(`ไม่สามารถดึงข้อมูลหน้า ${page} ได้ (HTTP ${response.status})`);
    const payload: unknown = await response.json();
    if (typeof payload === "object" && payload !== null) {
      const definitions = (payload as Record<string, unknown>).processes;
      if (Array.isArray(definitions)) {
        onProcesses?.(definitions.filter((item): item is ProcessDefinition => {
          if (typeof item !== "object" || item === null) return false;
          const row = item as Record<string, unknown>;
          return (typeof row.id === "string" || typeof row.id === "number") &&
            (typeof row.process_level === "string" || typeof row.process_level === "number") &&
            typeof row.process === "string";
        }));
      }
    }

    if (typeof payload === "object" && payload !== null) {
      const filters = (payload as Record<string, unknown>).filters;
      if (typeof filters === "object" && filters !== null) {
        const types = (filters as Record<string, unknown>).fleet_types;
        if (Array.isArray(types)) onFleetTypes?.(types.filter((v): v is string => typeof v === "string").map(v => v.trim()).filter(Boolean));
      }
    }
    const rows = readFleetRawRows(payload);
    if (rows.length === 0) break;
    let added = 0;
    for (const row of rows) {
      const incomingId = String(row.incoming_truck_id ?? row.id ?? "").trim();
      const key = incomingId || JSON.stringify([row.request_id, row.warehouse_vehicle_no, row.unit_code]);
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(normalizeFleetRow(row));
      added += 1;
    }
    if (added === 0) {
      throw new Error(`API ส่งข้อมูลซ้ำที่หน้า ${page} กรุณาตรวจสอบการแบ่งหน้า จึงยังยืนยันยอดทั้งหมดไม่ได้`);
    }
    const root = typeof payload === "object" && payload !== null ? payload as Record<string, unknown> : {};
    const pagination = typeof root.pagination === "object" && root.pagination !== null
      ? root.pagination as Record<string, unknown> : {};
    // Support pagination metadata at the root or inside pagination/meta.
    // Without metadata, keep loading until the API returns an empty page.
    const meta = typeof root.meta === "object" && root.meta !== null
      ? root.meta as Record<string, unknown> : {};
    const totalPages = Number(pagination.total_pages ?? pagination.last_page ?? root.total_pages ?? meta.total_pages ?? meta.last_page);
    const hasNext = pagination.has_next ?? pagination.has_more ?? root.has_next ?? meta.has_next;
    if (Number.isInteger(totalPages) && totalPages > 0 && page >= totalPages) break;
    if (hasNext === false || hasNext === 0 || hasNext === "false" || hasNext === "0") break;
    page += 1;
  }
  return results;
}

function readDashboardRecords(value: unknown): DashboardRecords {
  if (typeof value !== "object" || value === null) {
    throw new Error("ข้อมูล Dashboard ไม่ถูกต้อง");
  }
  const root = value as Record<string, unknown>;
  if (root.status === "error" || root.success === false) {
    throw new Error(
      typeof root.message === "string"
        ? root.message
        : "โหลด Dashboard ไม่สำเร็จ",
    );
  }
  const candidate = root.data ?? root;
  if (typeof candidate !== "object" || candidate === null) {
    throw new Error("ข้อมูล Dashboard ไม่ถูกต้อง");
  }
  const data = candidate as Record<string, unknown>;
  if (
    !Array.isArray(data.warehouse_records) ||
    !Array.isArray(data.flow_records)
  ) {
    throw new Error(
      "get_dashboard.php ต้องส่ง data.warehouse_records และ data.flow_records",
    );
  }
  const validRow = (row: unknown): row is Record<string, unknown> =>
    typeof row === "object" &&
    row !== null &&
    "request_id" in row &&
    "vehicle_no" in row;
  if (
    !data.warehouse_records.every(
      row =>
        validRow(row) &&
        (row.warehouse_plan_date == null ||
          typeof row.warehouse_plan_date === "string"),
    ) ||
    !data.flow_records.every(
      row =>
        validRow(row) &&
        (row.str_date == null || typeof row.str_date === "string") &&
        (typeof row.process_level === "string" ||
          typeof row.process_level === "number" ||
          typeof row.process_id === "string" ||
          typeof row.process_id === "number"),
    )
  ) {
    throw new Error(
      "รายการ Dashboard ต้องมี request_id, vehicle_no และ process_level หรือ process_id สำหรับข้อมูลจริง",
    );
  }
  return {
    warehouseRecords: data.warehouse_records as WarehouseRecord[],
    flowRecords: data.flow_records as FlowRecord[],
  };
}
/** Count each vehicle once using request_id + vehicle_no. */
function buildDeliveryTimeline(
  requests: FleetRequest[],
  warehouseRecords: WarehouseRecord[] = EMPTY_WAREHOUSE,
  flowRecords: FlowRecord[] = EMPTY_FLOW,
  processes: ProcessDefinition[] = EMPTY_PROCESSES,
): TimelinePoint[] {
  const requestIds = new Set(
    requests.map(row => String(row.id ?? "").trim()).filter(Boolean),
  );
  const levels = new Map(
    processes.map(row => [
      String(row.id).trim(),
      String(row.process_level).trim(),
    ]),
  );
  const plannedDates = new Map<string, string>();
  const actualDates = new Map<string, string>();
  const warehouses = requests
    .flatMap<WarehouseRecord>(request =>
      asRecords(
        request.vehicle_warehouse_info ?? request.vehicle_info,
      ).map(row => ({
        ...row,
        request_id: row.request_id ?? request.id,
      })),
    )
    .concat(warehouseRecords);
  const flows = requests
    .flatMap<FlowRecord>(request =>
      asRecords(request.flow_data).map(row => ({
        ...row,
        request_id: row.request_id ?? request.id,
      })),
    )
    .concat(flowRecords);
  for (const row of warehouses) {
    if (!requestIds.has(String(row.request_id ?? "").trim())) continue;
    const key = vehicleKey(row.request_id, row.vehicle_no);
    const day = calendarDate(row.warehouse_plan_date);
    if (key && day) plannedDates.set(key, day);
  }
  for (const row of flows) {
    if (!requestIds.has(String(row.request_id ?? "").trim())) continue;
    const level =
      row.process_level == null
        ? levels.get(String(row.process_id ?? "").trim())
        : String(row.process_level).trim();
    if (level !== "8") continue;
    const key = vehicleKey(row.request_id, row.vehicle_no);
    const day = calendarDate(row.str_date);
    if (
      key &&
      day &&
      (!actualDates.has(key) || day < actualDates.get(key)!)
    ) {
      actualDates.set(key, day);
    }
  }
  const plannedByDay = new Map<string, number>();
  const actualByDay = new Map<string, number>();
  for (const day of plannedDates.values()) {
    plannedByDay.set(day, (plannedByDay.get(day) ?? 0) + 1);
  }
  for (const day of actualDates.values()) {
    actualByDay.set(day, (actualByDay.get(day) ?? 0) + 1);
  }
  const days = Array.from(
    new Set([...plannedByDay.keys(), ...actualByDay.keys()]),
  ).sort();
  const lastActual = Array.from(actualByDay.keys()).sort().slice(-1)[0];
  let planned = 0;
  let actual = 0;
  return days.map(day => {
    planned += plannedByDay.get(day) ?? 0;
    actual += actualByDay.get(day) ?? 0;
    return {
      label: day,
      planned,
      actual: lastActual && day <= lastActual ? actual : null,
    };
  });
}
function buildMonthlyTimeline(
  points: TimelinePoint[],
  year: number,
): TimelinePoint[] {
  const datedPoints = points
    .flatMap(point => {
      const day = calendarDate(point.label);
      return day ? [{ ...point, day }] : [];
    })
    .sort((a, b) => a.day.localeCompare(b.day));
  const yearStart = `${year}-01-01`;
  let plannedBase = 0;
  let actualBase = 0;
  for (const point of datedPoints) {
    if (point.day >= yearStart) break;
    plannedBase = point.planned;
    if (point.actual !== null) actualBase = point.actual;
  }
  const yearPoints = datedPoints.filter(
    point => Number(point.day.slice(0, 4)) === year,
  );
  const lastActualMonth = datedPoints.reduce(
    (last, point) =>
      point.actual === null ? last : point.day.slice(0, 7),
    "",
  );
  let planned = plannedBase;
  let actual = actualBase;
  let cursor = 0;
  return MONTH_NAMES.map((name, index) => {
    const month = `${year}-${String(index + 1).padStart(2, "0")}`;
    while (
      cursor < yearPoints.length &&
      yearPoints[cursor].day.slice(0, 7) <= month
    ) {
      const point = yearPoints[cursor];
      planned = point.planned;
      if (point.actual !== null) actual = point.actual;
      cursor += 1;
    }
    return {
      label: name,
      planned: Math.max(0, planned - plannedBase),
      actual:
        lastActualMonth && month <= lastActualMonth
          ? Math.max(0, actual - actualBase)
          : null,
    };
  });
}
function SummaryIcon({ type }: { type: "plan" | "actual" | "pending" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {type === "plan" ? (
        <>
          <circle cx="11" cy="13" r="8" />
          <circle cx="11" cy="13" r="4" />
          <path d="m11 13 9-9M16 4h4v4" />
        </>
      ) : type === "actual" ? (
        <>
          <path d="M2 5h12v12H2zM14 9h4l4 4v4h-8" />
          <circle cx="6" cy="18" r="2" />
          <circle cx="18" cy="18" r="2" />
        </>
      ) : (
        <>
          <circle cx="9" cy="9" r="4" />
          <path d="M9 2v3M9 13v3M2 9h3M13 9h3M4 4l2 2M12 12l2 2M4 14l2-2M12 6l2-2" />
          <circle cx="17" cy="17" r="3" />
          <path d="M17 12v2M17 20v2M12 17h2M20 17h2" />
        </>
      )}
    </svg>
  );
}
function FleetStatusByDc({
  timeline: suppliedTimeline,
  warehouseRecords: suppliedWarehouseRecords,
  flowRecords: suppliedFlowRecords,
  processes = EMPTY_PROCESSES,
  title,
  initialFleetType = "all",
  requests: suppliedRequests,
  apiUrl = "http://192.168.158.210/api_new_truck/api/dashboard_fleet_get.php?group_mode=incoming",
  dashboardApiUrl = "http://192.168.158.210/api_new_truck/api/get_dashboard.php",
}: Props = {}) {
  const [requests, setRequests] = useState<FleetRequest[]>([]);
  const [warehouseScope, setWarehouseScope] = useState<{
    ready: boolean;
    showAll: boolean;
    codes: string[];
  }>({ ready: false, showAll: false, codes: [] });

  useEffect(() => {
    const normalizeCode = (value: unknown) =>
      String(value ?? "").trim().replace(/\s+/g, " ").toUpperCase();
    const readJSON = (key: string): unknown => {
      try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
      } catch {
        return null;
      }
    };
    const isObject = (value: unknown): value is Record<string, unknown> =>
      value !== null && typeof value === "object" && !Array.isArray(value);

    const loadScope = () => {
      const single = readJSON("selected_dc");
      const multiple = readJSON("selected_dcs");
      const selectedCodes = [
        ...new Set(
          [
            ...(Array.isArray(multiple)
              ? multiple.filter(isObject).map(item => item.DC_CODE)
              : []),
            isObject(single) ? single.DC_CODE : "",
          ].map(normalizeCode).filter(code => code && code !== "-")
        ),
      ];
      if (selectedCodes.length > 0) {
        setWarehouseScope({
          ready: true,
          showAll: selectedCodes.includes("CENTER"),
          codes: selectedCodes.filter(code => code !== "CENTER"),
        });
      } else {
        const candidates = ["user", "user_info", "userInfo"].map(readJSON);
        const user = candidates.find(isObject);
        const originalWarehouse = [
          user?.warehouse, user?.WAREHOUSE, user?.team, user?.TEAM,
        ].map(normalizeCode).find(code => code && code !== "-") || "";
        setWarehouseScope({
          ready: true,
          showAll: originalWarehouse === "CENTER",
          codes: originalWarehouse && originalWarehouse !== "CENTER"
            ? [originalWarehouse] : [],
        });
      }
      // Clear local DC filters when switching the selected working scope.
      setAreaFilter("all");
      setDcFilter("all");
      setVendorTooltip(null);
      setHoveredMonth(null);
    };

    loadScope();
    const events = ["selectedDCChanged", "selectedDepartmentsChanged", "userChanged", "storage"];
    events.forEach(event => window.addEventListener(event, loadScope));
    return () => {
      events.forEach(event => window.removeEventListener(event, loadScope));
    };
  }, []);

  const [apiProcesses, setApiProcesses] = useState<ProcessDefinition[]>([]);
  const [apiFleetTypes, setApiFleetTypes] = useState<string[]>([]);
  const [selectedSummaryMonths, setSelectedSummaryMonths] = useState<number[]>(() => {
    const end = new Date().getMonth();
    return Array.from({ length: 6 }, (_, i) => ((end - 5 + i + 12) % 12)).sort((a, b) => a - b);
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [dcFilter, setDcFilter] = useState("all");
  const [dcTypeFilter, setDcTypeFilter] = useState("all");
  const [requestTypeFilter, setRequestTypeFilter] = useState(initialFleetType);
  const [reloadKey, setReloadKey] = useState(0);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [monthFilter, setMonthFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [fbpFilter, setFbpFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [truckTypeFilter, setTruckTypeFilter] = useState("all");
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);
  const [vendorTooltip, setVendorTooltip] = useState<{ left: number; top: number; entries: [string, number][]; companies: [string, number][] } | null>(null);
  useEffect(() => { setVendorTooltip(null); }, [selectedYear, monthFilter, dcTypeFilter, areaFilter, fbpFilter, statusFilter, truckTypeFilter, requestTypeFilter, reloadKey]);
  useEffect(() => { setHoveredMonth(null); }, [selectedYear, dcFilter, requestTypeFilter, searchText, reloadKey, monthFilter, areaFilter, fbpFilter, statusFilter, truckTypeFilter, dcTypeFilter]);
  const [dashboardRecords, setDashboardRecords] = useState<DashboardRecords>({
    warehouseRecords: EMPTY_WAREHOUSE,
    flowRecords: EMPTY_FLOW,
  });
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const needsDashboard =
    suppliedTimeline === undefined &&
    (suppliedWarehouseRecords === undefined ||
      suppliedFlowRecords === undefined);
  useEffect(() => {
    if (!needsDashboard) return;
    const controller = new AbortController();
    setDashboardLoading(true);
    setDashboardError("");
    setDashboardRecords({
      warehouseRecords: EMPTY_WAREHOUSE,
      flowRecords: EMPTY_FLOW,
    });
    async function fetchDashboard() {
      try {
        const response = await fetch(dashboardApiUrl, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
          const message =
            typeof payload === "object" &&
              payload !== null &&
              "message" in payload &&
              typeof payload.message === "string"
              ? payload.message
              : `โหลด Dashboard ไม่สำเร็จ (HTTP ${response.status})`;
          throw new Error(message);
        }
        const records = needsDashboard ? readDashboardRecords(payload) : null;
        if (!controller.signal.aborted) {
          if (records) setDashboardRecords(records);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setDashboardError(
            err instanceof Error ? err.message : "โหลด Dashboard ไม่สำเร็จ",
          );
        }
      } finally {
        if (!controller.signal.aborted) setDashboardLoading(false);
      }
    }
    void fetchDashboard();
    return () => controller.abort();
  }, [dashboardApiUrl, needsDashboard, reloadKey]);
  const warehouseRecords =
    suppliedWarehouseRecords ?? dashboardRecords.warehouseRecords;
  const flowRecords = suppliedFlowRecords ?? dashboardRecords.flowRecords;
  const fetchRequests = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true);
      setError("");
      try {
        const fleetTypes = new Set<string>();
        const list = await fetchAllFleetRequests(
          apiUrl,
          signal,
          types => types.forEach(type => fleetTypes.add(type)),
          definitions => { if (!signal.aborted) setApiProcesses(definitions); },
        );
        if (!signal.aborted) setApiFleetTypes(Array.from(fleetTypes));
        if (!signal.aborted) setRequests(list);
      } catch (err) {
        if (!signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : "เกิดข้อผิดพลาดในการดึงข้อมูลจาก API",
          );
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [apiUrl],
  );
  useEffect(() => {
    if (suppliedRequests !== undefined) return;
    const controller = new AbortController();
    void fetchRequests(controller.signal);
    return () => controller.abort();
  }, [fetchRequests, suppliedRequests, reloadKey]);
  // Filter by request_date year first; then inspect the 102nd record.
  useEffect(() => {
    if (suppliedRequests === undefined && loading) return;
    const data2016 = (suppliedRequests ?? requests).filter(item => {
      const day = calendarDate(item.request_date);
      return day !== null && day.slice(0, 4) === "2016";
    });
    const row = data2016[101];
    const unit: unknown = row?.raw_unit_code ?? row?.unit_code;
    const nestedUnit = typeof unit === "object" && unit !== null && "unit_code" in unit
      ? (unit as Record<string, unknown>).unit_code : undefined;
    console.group("Dashboard · ปี 2016 · index 101 (รายการที่ 102)");
    console.log("จำนวนรายการปี 2016:", data2016.length);
    console.log("2016 [101] full record:", row);
    console.log("2016 [101].unit_code:", unit);
    console.log("2016 [101].unit_code.unit_code:", nestedUnit);
    if (!row) console.warn("ข้อมูลปี 2016 มีไม่ถึง 102 รายการ จึงไม่มี [101]");
    else if (typeof unit === "string") console.info("unit_code เป็นข้อความ จึงไม่มี unit_code.unit_code; ค่าคือ:", unit);
    console.groupEnd();
  }, [suppliedRequests, requests, loading]);
  // Scope the common source before calculating cards, charts, tables and SLA.
  const sourceRequests = useMemo(() => {
    if (!warehouseScope.ready) return [];
  
    // แสดงทุก fleet_type ยกเว้นรถเสริมชั่วคราว
    const allRows = (suppliedRequests ?? requests).filter(
      row => !isTemporaryFleet(row.fleet_type),
    );
  
    if (warehouseScope.showAll) return allRows;
  
    const allowedCodes = new Set(warehouseScope.codes);
  
    return allRows.filter(row =>
      allowedCodes.has(
        String(row.dc_code ?? "")
          .trim()
          .replace(/\s+/g, " ")
          .toUpperCase(),
      ),
    );
  }, [suppliedRequests, requests, warehouseScope]);
  const filterOptions = useMemo(() => {
    const values = (key: "area" | "fbp" | "new_truck_type" | "status") => Array.from(new Set(sourceRequests.map(row => String(row[key] ?? "").trim()).filter(Boolean))).sort();
    const years = sourceRequests.flatMap(row => { const day = calendarDate(row.request_date); return day ? [Number(day.slice(0, 4))] : []; });
    const areaRows = sourceRequests.filter(row => dcTypeFilter === "all" ||
      (String(row.dc_type ?? "").trim() || "ไม่ระบุประเภทคลัง") === dcTypeFilter);
    const areas = Array.from(new Set(areaRows.map(row => String(row.dc_code ?? "").trim()).filter(Boolean))).sort();
    const companies = new Map<string, string>();
    for (const row of sourceRequests) {
      const id = String(row.approved_company_id ?? "").trim();
      const name = String(row.approved_company_name ?? "").trim();
      const shortName = String(row.approved_company_short_name ?? "").trim();
      const displayName = String(row.approved_company_display_name ?? "").trim()
        || (shortName ? `[${shortName}] ${name}` : name);
      if (id) companies.set(id, displayName || `FBP ${id}`);
    }
    const fbps = Array.from(companies, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "th"));
    return { areas, fbps, trucks: values("new_truck_type"), statuses: values("status"), years: Array.from(new Set([currentYear, ...years])).sort((a, b) => b - a) };
  }, [sourceRequests, currentYear, dcTypeFilter]);
  useEffect(() => {
    if (areaFilter !== "all" && !filterOptions.areas.includes(areaFilter)) setAreaFilter("all");
  }, [areaFilter, filterOptions.areas]);
  const dcTypeOptions = useMemo(() => Array.from(new Set(sourceRequests.map(row => String(row.dc_type ?? "").trim() || "ไม่ระบุประเภทคลัง"))).sort(), [sourceRequests]);
  const typeRequests = useMemo(() => sourceRequests.filter(row =>
    (dcTypeFilter === "all" || (String(row.dc_type ?? "").trim() || "ไม่ระบุประเภทคลัง") === dcTypeFilter) &&
    (requestTypeFilter === "all" || (String(row.fleet_type ?? "").trim() || "ไม่ระบุประเภทคำขอ") === requestTypeFilter)
  ), [sourceRequests, dcTypeFilter, requestTypeFilter]);
  const requestTypeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...apiFleetTypes,
            ...sourceRequests.map(
              item =>
                String(item.fleet_type ?? "").trim() ||
                "ไม่ระบุประเภทคำขอ",
            ),
          ]
            .map(type => type.trim())
            .filter(type => type !== "" && !isTemporaryFleet(type)),
        ),
      ).sort((a, b) => a.localeCompare(b, "th")),
    [sourceRequests, apiFleetTypes],
  );
  const cardScopeRequests = useMemo(
    () => typeRequests.filter(item => {
      const date = calendarDate(item.request_date);
      return date !== null && Number(date.slice(0, 4)) === selectedYear &&
        (monthFilter === "all" || date.slice(5, 7) === monthFilter) &&
        (areaFilter === "all" || String(item.dc_code ?? "").trim() === areaFilter) &&
        (fbpFilter === "all" || String(item.approved_company_id ?? "").trim() === fbpFilter) &&
        (truckTypeFilter === "all" || item.new_truck_type === truckTypeFilter);
    }),
    [typeRequests, selectedYear, monthFilter, areaFilter, fbpFilter, truckTypeFilter],
  );
  // Selecting a card filters the detail views, while every card keeps its total.
  const filteredRequests = useMemo(
    () => cardScopeRequests.filter(item => matchesDashboardStatus(item.status, statusFilter)),
    [cardScopeRequests, statusFilter],
  );
  // Inspect these two known requests without changing the selected scope.
  useEffect(() => {
    if (suppliedRequests === undefined && loading) return;
    const all = suppliedRequests ?? requests;
    console.table(["9947", "9948"].map(id => {
      const row = all.find(item => String(item.id) === id);
      return {
        request_id: id,
        loaded_vehicles: all.filter(item => String(item.id) === id).length,
        after_warehouse_scope: sourceRequests.filter(item => String(item.id) === id).length,
        after_type_filters: typeRequests.filter(item => String(item.id) === id).length,
        after_all_filters: filteredRequests.filter(item => String(item.id) === id).length,
        request_date: row?.request_date ?? "ไม่พบวันที่/รายการ",
        status: row?.status ?? "ไม่พบรายการ",
        dc_code: row?.dc_code ?? "",
        approved_company_id: row?.approved_company_id ?? "",
      };
    }));
    console.debug("Dashboard active filters", {
      selectedYear, monthFilter, dcTypeFilter, areaFilter, fbpFilter,
      requestTypeFilter, truckTypeFilter, statusFilter, warehouseScope,
    });
  }, [suppliedRequests, requests, loading, sourceRequests, typeRequests, filteredRequests,
    selectedYear, monthFilter, dcTypeFilter, areaFilter, fbpFilter, requestTypeFilter,
    truckTypeFilter, statusFilter, warehouseScope]);
  // Card totals use toolbar filters, before the selected status is applied.
  // Incoming API rows normalize to qty=1; grouped request rows retain their qty.
  const localCardSummary = useMemo(() => {
    const totals = Object.fromEntries(
      DASHBOARD_SUMMARY_CARDS.map(({ key }) => [key, { qty: 0, items: 0 }]),
    ) as DashboardSummary;
    for (const row of cardScopeRequests) {
      const qty = Number(row.qty);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      totals.all.qty += qty;
      totals.all.items += 1;
      const key = dashboardStatusGroup(row.status);
      if (key !== "all" && Object.prototype.hasOwnProperty.call(totals, key)) {
        totals[key as DashboardSummaryKey].qty += qty;
        totals[key as DashboardSummaryKey].items += 1;
      }
    }
    return totals;
  }, [cardScopeRequests]);
  // Use exact incoming vehicle IDs so filtering one vehicle never includes its siblings.
  const summaryScope = useMemo(() => {
    const ids = cardScopeRequests.map(row => String(row.incoming_truck_id ?? "").trim());
    return ids.length > 0 && ids.every(id => /^[1-9][0-9]*$/.test(id))
      ? Array.from(new Set(ids)).sort().join(",") : "";
  }, [cardScopeRequests]);
  const [apiCardState, setApiCardState] = useState<{
    scope: string; summary: DashboardSummary | null; error: string;
  }>({ scope: "", summary: null, error: "" });
  useEffect(() => {
    if (!summaryScope) return;
    const controller = new AbortController();
    setApiCardState({ scope: summaryScope, summary: null, error: "" });
    async function loadSummary() {
      try {
        const totals = Object.fromEntries(DASHBOARD_SUMMARY_CARDS.map(({ key }) =>
          [key, { qty: 0, items: 0 }])) as DashboardSummary;
        const ids = summaryScope.split(",");
        for (let offset = 0; offset < ids.length; offset += 100) {
          const url = new URL(dashboardApiUrl, window.location.href);
          url.searchParams.delete("request_ids");
          url.searchParams.delete("warehouse");
          url.searchParams.set("incoming_truck_ids", ids.slice(offset, offset + 100).join(","));
          url.searchParams.set("summary_only", "1");
          const response = await fetch(url.toString(), { cache: "no-store", signal: controller.signal });
          const payload = await response.json();
          if (!response.ok || payload?.status !== "success" || !payload.summary) {
            throw new Error(payload?.message || "โหลด summary ไม่สำเร็จ");
          }
          for (const { key } of DASHBOARD_SUMMARY_CARDS) {
            const qty = Number(payload.summary[key]?.qty);
            const items = Number(payload.summary[key]?.items);
            if (!Number.isFinite(qty) || qty < 0 || !Number.isFinite(items) || items < 0) {
              throw new Error("รูปแบบ summary ไม่ถูกต้อง");
            }
            totals[key].qty += qty;
            totals[key].items += items;
          }
        }
        if (!controller.signal.aborted) setApiCardState({ scope: summaryScope, summary: totals, error: "" });
      } catch (error) {
        if (!controller.signal.aborted) setApiCardState({ scope: summaryScope, summary: null,
          error: error instanceof Error ? error.message : "โหลด summary ไม่สำเร็จ" });
      }
    }
    void loadSummary();
    return () => controller.abort();
  }, [summaryScope, dashboardApiUrl, reloadKey]);
  const cardSummaryError = summaryScope && apiCardState.scope === summaryScope ? apiCardState.error : "";
  const cardSummaryLoading = Boolean(summaryScope &&
    (apiCardState.scope !== summaryScope || (!apiCardState.summary && !apiCardState.error)));
  // Supplied request-level rows have no incoming IDs; retain their quantity-based summary.
  const filteredCardSummary = summaryScope && apiCardState.scope === summaryScope && apiCardState.summary
    ? apiCardState.summary : localCardSummary;
  const stageScrollRef = useRef<HTMLDivElement>(null);
  const monthScrollRef = useRef<HTMLDivElement>(null);
  const monthPickerDialogRef = useRef<HTMLDialogElement>(null);
  const stageColumns = useMemo(() => {
    const columns = new Map<string, { key: string; level: string; name: string }>();
    // หัวตารางจาก master_flow: รวมชื่อซ้ำข้าม fleet_type
    for (const row of [...processes, ...apiProcesses]) {
      if (isTemporaryFleet(row.fleet_type)) continue;
      const level = String(row.process_level ?? "").trim();
      const name = String(row.process ?? "").trim();
      if (!level || !name) continue;
      const key = JSON.stringify([level, name]);
      columns.set(key, { key, level, name });
    }
    // ใช้ key เดียวกับเซลล์จำนวนรถเดิม
    for (const row of typeRequests) {
      const level = String(row.latest_process_level ?? "").trim();
      const name = String(row.latest_process_name ?? "").trim() || "ไม่ระบุชื่อขั้นตอน";
      if (!level) continue;
      const key = JSON.stringify([level, name]);
      columns.set(key, { key, level, name });
    }
    return Array.from(columns.values()).sort((a, b) =>
      Number(a.level) - Number(b.level) || a.name.localeCompare(b.name, "th"),
    );
  }, [processes, apiProcesses, typeRequests]);

  const [showClosedSteps, setShowClosedSteps] = useState(false);
  const [exportingFleetExcel, setExportingFleetExcel] = useState(false);
  const [fleetExcelError, setFleetExcelError] = useState("");
  const visibleStageColumns = stageColumns.filter(column => {
    const level = Number(column.level);
    return (level >= 1 && level <= 8) ||
      (showClosedSteps && (level === 9 || level === 10));
  });

  const orderedStageColumns = [
    ...visibleStageColumns.filter(column => Number(column.level) <= 8),
    "total8" as const,
    ...visibleStageColumns.filter(column => Number(column.level) >= 9),
    "total10" as const,
  ];

  const sixMonthSummary = useMemo(() => selectedSummaryMonths.map(month => ({
    key: `${selectedYear}-${String(month + 1).padStart(2, "0")}`,
    label: `${MONTH_SHORT_NAMES[month]}-${String(selectedYear + 543).slice(-2)}`,
  })), [selectedSummaryMonths, selectedYear]);
  const toggleSummaryMonth = (month: number) => {
    setSelectedSummaryMonths(current => current.includes(month)
      ? (current.length > 1 ? current.filter(value => value !== month) : current)
      : (current.length < 6 ? [...current, month].sort((a, b) => a - b) : current));
    setVendorTooltip(null);
  };
  const { counts: monthlyTruckCounts, details: monthlyTruckDetails } = useMemo(() => {
    const counts = new Map<string, Map<string, number>>();
    const details = new Map<string, Map<string, Map<string, {
      runningDoc: string; fleetType: string; count: number;
    }>>>();
    const selectedMonths = new Set(
      sixMonthSummary.map(month => month.key),
    );

    // ใช้ข้อมูลแผนชุดเดียวกับกราฟ
    const planDates = new Map<string, string>();

    const planRecords = filteredRequests
      .flatMap<WarehouseRecord>(request =>
        asRecords(
          request.vehicle_warehouse_info ?? request.vehicle_info,
        ).map(record => ({
          ...record,
          request_id: record.request_id ?? request.id,
        })),
      )
      .concat(warehouseRecords);

    for (const record of planRecords) {
      const key = vehicleKey(record.request_id, record.vehicle_no);
      const day = calendarDate(record.warehouse_plan_date);

      if (key && day) {
        planDates.set(key, day);
      }
    }

    // จับคู่รถกับคลังและประเภทรถของแถวที่ผ่านตัวกรอง
    const vehicles = new Map<string, FleetRequest>();

    for (const request of filteredRequests) {
      const records = asRecords(
        request.vehicle_warehouse_info ?? request.vehicle_info,
      );

      const vehicleNumbers = new Set(
        [
          request.vehicle_no,
          ...records.map(record => record.vehicle_no),
        ]
          .filter(value => value != null && String(value).trim() !== "")
          .map(value => String(value).trim()),
      );

      for (const vehicleNo of vehicleNumbers) {
        const key = vehicleKey(request.id, vehicleNo);

        if (key) vehicles.set(key, request);
      }
    }

    // นับรถแต่ละคันครั้งเดียว ตามเดือนที่วางแผนเข้าคลัง
    for (const [vehicleId, request] of vehicles) {
      const day = planDates.get(vehicleId);
      if (!day) continue;

      const month = day.slice(0, 7);
      if (!selectedMonths.has(month)) continue;

      const groupKey = JSON.stringify([
        String(request.dc_type ?? "").trim() || "ไม่ระบุประเภทคลัง",
        String(request.dc_code ?? "").trim() || "ไม่ระบุคลัง",
        String(request.new_truck_type ?? "").trim() || "ไม่ระบุประเภทรถ",
      ]);

      const months = counts.get(groupKey) ?? new Map<string, number>();

      months.set(month, (months.get(month) ?? 0) + 1);
      counts.set(groupKey, months);

      // Build hover details from exactly the vehicles counted in this cell.
      const detailMonths = details.get(groupKey) ?? new Map();
      const requestsInMonth = detailMonths.get(month) ?? new Map();
      const fleetType = String(request.fleet_type ?? "").trim() || "ไม่ระบุประเภทคำขอ";
      const runningDoc = String(request.running_doc ?? "").trim() || `คำขอ ID ${request.id ?? "—"} (ไม่มีเลขหนังสือ)`;
      const detailKey = JSON.stringify([String(request.id ?? ""), runningDoc, fleetType]);
      const detail = requestsInMonth.get(detailKey) ?? { runningDoc, fleetType, count: 0 };
      detail.count += 1;
      requestsInMonth.set(detailKey, detail);
      detailMonths.set(month, requestsInMonth);
      details.set(groupKey, detailMonths);
    }

    return { counts, details };
  }, [
    filteredRequests,
    warehouseRecords,
    sixMonthSummary,
  ]);

  const stageGroups = useMemo(() => {
    const groups = new Map<string, { dcCode: string; dcType: string; trucks: Map<string, { truckType: string; total: number; stages: Map<string, { count: number; vendors: Map<string, number>; companies: Map<string, number> }> }> }>();
    for (const row of filteredRequests) {
      const qty = Number(row.qty);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      const dcType = String(row.dc_type ?? "").trim() || "ไม่ระบุประเภทคลัง";
      const dcCode = String(row.dc_code ?? "").trim() || "ไม่ระบุคลัง";
      const groupKey = JSON.stringify([dcType, dcCode]);
      let group = groups.get(groupKey);
      if (!group) {
        group = { dcCode, dcType, trucks: new Map() };
        groups.set(groupKey, group);
      }
      const truckType = String(row.new_truck_type ?? "").trim() || "ไม่ระบุประเภทรถ";
      let truck = group.trucks.get(truckType);
      if (!truck) {
        truck = { truckType, total: 0, stages: new Map() };
        group.trucks.set(truckType, truck);
      }
      const level = String(row.latest_process_level ?? "").trim();
      const name = String(row.latest_process_name ?? "").trim() || "ไม่ระบุชื่อขั้นตอน";
      const key = JSON.stringify([level, name]);
      const cell = truck.stages.get(key) ?? { count: 0, vendors: new Map<string, number>(), companies: new Map<string, number>() };
      cell.count += qty;
      const warehouseInfo = asRecords(row.vehicle_warehouse_info ?? row.vehicle_info);
      const matchedInfo = warehouseInfo.find(info =>
        row.vehicle_no != null &&
        String(info.vehicle_no ?? "").trim() === String(row.vehicle_no).trim()
      ) ?? (warehouseInfo.length === 1 ? warehouseInfo[0] : undefined);
      const vendor = String(row.supplier_alloc ?? matchedInfo?.supplier_alloc ?? "").trim()
        || "ไม่ระบุบริษัทประกอบรถ";
      cell.vendors.set(vendor, (cell.vendors.get(vendor) ?? 0) + qty);
      const company = String(row.approved_company_name ?? "").trim() || "ไม่ระบุ FBP";
      cell.companies.set(company, (cell.companies.get(company) ?? 0) + qty);
      truck.stages.set(key, cell);
      truck.total += qty;
    }
    return Array.from(groups.entries()).sort((a, b) => a[1].dcType.localeCompare(b[1].dcType, "th") || a[1].dcCode.localeCompare(b[1].dcCode, "th"));
  }, [filteredRequests]);

  const totalForSteps = (stages: Map<string, { count: number }>, lastStep: number) =>
    Array.from(stages.entries()).reduce((sum, [key, cell]) => {
      const [level] = JSON.parse(key) as [string, string];
      const step = Number(level);
      return sum + (Number.isInteger(step) && step >= 1 && step <= lastStep ? cell.count : 0);
    }, 0);

  // Export the same filtered rows, visible stages and selected months as the web tables.
  const syncReportScroll = (source: "stage" | "month") => {
    const from = source === "stage" ? stageScrollRef.current : monthScrollRef.current;
    const to = source === "stage" ? monthScrollRef.current : stageScrollRef.current;
    if (from && to && Math.abs(to.scrollTop - from.scrollTop) > 1) to.scrollTop = from.scrollTop;
    setVendorTooltip(null);
  };

  const exportFleetExcel = async () => {
    if (exportingFleetExcel || isLoading || activeError || !stageGroups.length) return;
    setExportingFleetExcel(true);
    setFleetExcelError("");
    try {
      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Fleet Dashboard";
      workbook.created = new Date();
      const sheet = workbook.addWorksheet("ขั้นตอนและแผนเข้าคลัง", {
        views: [{ state: "frozen", xSplit: 2, ySplit: 3 }],
      });
      const leftWidth = 4 + visibleStageColumns.length;
      const monthStart = leftWidth + 2; // One blank column between the two panels.
      const lastColumn = monthStart + sixMonthSummary.length - 1;
      const fill = (color: string) => ({ type: "pattern" as const,
        pattern: "solid" as const, fgColor: { argb: color } });
      const mergedText = (row: number, first: number, last: number, text: string) => {
        if (last > first) sheet.mergeCells(row, first, row, last);
        sheet.getCell(row, first).value = text;
      };
      mergedText(1, 1, leftWidth, "ประเภทรถแยกตามขั้นตอน");
      mergedText(1, monthStart, lastColumn, "แผนเข้าคลังรายเดือน");
      mergedText(2, 1, leftWidth,
        `ปี ${selectedYear + 543} · ${dcTypeFilter === "all" ? "ทุกประเภทคลัง" : dcTypeFilter} · STEP ${showClosedSteps ? "1–10" : "1–8"}`);
      mergedText(2, monthStart, lastColumn, `ปี ${selectedYear + 543} · ตามวันที่แผนเข้าคลัง`);
      ["กลุ่ม DC", "คลัง / ประเภทรถ", ...orderedStageColumns.map(column =>
        typeof column === "string" ? (column === "total8" ? "รวม STEP 1–8 (คัน)" : "รวม STEP 1–10 (คัน)") : `[${column.level}] ${column.name}`)].forEach((label, index) => {
          sheet.getCell(3, index + 1).value = label;
        });
      sixMonthSummary.forEach((month, index) => {
        sheet.getCell(3, monthStart + index).value = month.label;
      });
      sheet.getColumn(1).width = 18;
      sheet.getColumn(2).width = 28;
      for (let column = 3; column < leftWidth; column++) sheet.getColumn(column).width = 23;
      sheet.getColumn(leftWidth).width = 15;
      sheet.getColumn(leftWidth + 1).width = 3;
      for (let column = monthStart; column <= lastColumn; column++) sheet.getColumn(column).width = 17;
      let rowNumber = 4;
      let dcStart = 4;
      let currentDcType = "";
      const groupRows = new Set<number>();
      for (const [, group] of stageGroups) {
        if (currentDcType !== group.dcType) {
          if (currentDcType && rowNumber - 1 > dcStart) sheet.mergeCells(dcStart, 1, rowNumber - 1, 1);
          currentDcType = group.dcType;
          dcStart = rowNumber;
          sheet.getCell(rowNumber, 1).value = group.dcType;
        }
        groupRows.add(rowNumber);
        sheet.getCell(rowNumber, 2).value = group.dcCode;
        mergedText(rowNumber, 3, leftWidth, "");
        mergedText(rowNumber, monthStart, lastColumn, group.dcCode);
        rowNumber++;
        const trucks = Array.from(group.trucks.values()).sort((a, b) => a.truckType.localeCompare(b.truckType));
        for (const truck of trucks) {
          sheet.getCell(rowNumber, 2).value = truck.truckType;
          orderedStageColumns.forEach((column, index) => {
            sheet.getCell(rowNumber, index + 3).value = typeof column === "string"
              ? totalForSteps(truck.stages, column === "total8" ? 8 : 10)
              : truck.stages.get(column.key)?.count ?? 0;
          });
          const key = JSON.stringify([group.dcType, group.dcCode, truck.truckType]);
          sixMonthSummary.forEach((month, index) => {
            sheet.getCell(rowNumber, monthStart + index).value = monthlyTruckCounts.get(key)?.get(month.key) ?? 0;
          });
          rowNumber++;
        }
      }
      if (currentDcType && rowNumber - 1 > dcStart) sheet.mergeCells(dcStart, 1, rowNumber - 1, 1);
      for (let row = 1; row < rowNumber; row++) {
        sheet.getRow(row).height = row === 3 ? 80 : row === 1 ? 30 : 25;
        for (let col = 1; col <= lastColumn; col++) {
          if (col === leftWidth + 1) continue;
          const cell = sheet.getCell(row, col);
          cell.font = { name: "Tahoma", size: row === 1 ? 14 : 10,
            bold: row === 1 || row === 3 || groupRows.has(row) || (col === leftWidth || col === 3 + visibleStageColumns.filter(column => Number(column.level) <= 8).length),
            color: { argb: row === 1 || row === 3 ? "FFFFFFFF" : "FF243B53" } };
          cell.alignment = { vertical: "middle", horizontal: col <= 2 || row <= 2 ? "left" : "center", wrapText: true };
          cell.fill = fill(row === 1 || row === 3 ? "FF245A95" :
            groupRows.has(row) ? "FFE4EEFA" : (col === leftWidth || col === 3 + visibleStageColumns.filter(column => Number(column.level) <= 8).length) ? "FFEFF6FF" : "FFFFFFFF");
          if (row >= 3) cell.border = {
            top: { style: "thin", color: { argb: "FFDCE5F0" } },
            bottom: { style: "thin", color: { argb: "FFDCE5F0" } },
            left: { style: "thin", color: { argb: "FFDCE5F0" } },
            right: { style: "thin", color: { argb: "FFDCE5F0" } },
          };
          if (typeof cell.value === "number") cell.numFmt = '#,##0;-#,##0;"—"';
        }
      }
      sheet.pageSetup = {
        orientation: "landscape",
        paperSize: 9,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        printTitlesRow: "1:3",
      };
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([new Uint8Array(buffer)], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Fleet_ขั้นตอนและแผนเข้าคลัง_${selectedYear}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setFleetExcelError(error instanceof Error ? error.message : "ส่งออก Excel ไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setExportingFleetExcel(false);
    }
  };

  const yearOptions = filterOptions.years;
  const activeYear = selectedYear;
  const dailyTimeline = useMemo(
    () =>
      (statusFilter === "all" ? suppliedTimeline : undefined) ??
      buildDeliveryTimeline(
        filteredRequests,
        warehouseRecords,
        flowRecords,
        processes,
      ),
    [
      suppliedTimeline,
      statusFilter,
      filteredRequests,
      warehouseRecords,
      flowRecords,
      processes,
    ],
  );
  const timeline = useMemo(
    () =>
      activeYear === null
        ? []
        : buildMonthlyTimeline(dailyTimeline, activeYear),
    [dailyTimeline, activeYear],
  );
  const dcSummary = useMemo(
    () => groupFleetByDc(filteredRequests),
    [filteredRequests],
  );
  const isLoading = suppliedRequests === undefined && loading;
  const activeError = suppliedRequests === undefined ? error : "";
  // Keep corresponding headers and rows aligned, including wrapped step names.
  useEffect(() => {
    const left = stageScrollRef.current;
    const right = monthScrollRef.current;
    if (!left || !right) return;
    let frame = 0;
    const align = () => {
      const pairs: [HTMLElement, HTMLElement][] = [];
      const leftPanel = left.parentElement?.querySelector<HTMLElement>(".fleet-panel-header");
      const rightPanel = right.parentElement?.querySelector<HTMLElement>(".fleet-panel-header");
      if (leftPanel && rightPanel) pairs.push([leftPanel, rightPanel]);
      const leftRows = left.querySelectorAll<HTMLTableRowElement>("thead tr, tbody tr");
      const rightRows = right.querySelectorAll<HTMLTableRowElement>("thead tr, tbody tr");
      leftRows.forEach((row, index) => {
        if (rightRows[index]) pairs.push([row, rightRows[index]]);
      });
      for (const [a, b] of pairs) { a.style.height = "auto"; b.style.height = "auto"; }
      const heights = pairs.map(([a, b]) => Math.max(a.offsetHeight, b.offsetHeight));
      pairs.forEach(([a, b], index) => {
        a.style.height = `${heights[index]}px`;
        b.style.height = `${heights[index]}px`;
      });
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(align); };
    const previousWidths = new WeakMap<Element, number>();
    const observer = new ResizeObserver(entries => {
      let changed = false;
      for (const entry of entries) {
        const width = entry.contentRect.width;
        if (previousWidths.get(entry.target) !== width) {
          previousWidths.set(entry.target, width);
          changed = true;
        }
      }
      if (changed) schedule();
    });
    observer.observe(left);
    observer.observe(right);
    window.addEventListener("resize", schedule);
    let disposed = false;
    void document.fonts.ready.then(() => { if (!disposed) schedule(); });
    schedule();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", schedule);
    };
  }, [stageGroups, orderedStageColumns, selectedSummaryMonths, isLoading, activeError]);

  const timelineLoading = isLoading || (needsDashboard && dashboardLoading);
  const timelineError = activeError || (needsDashboard ? dashboardError : "");
  const selectedFleetType =
    requestTypeFilter !== "all"
      ? requestTypeFilter
      : requestTypeOptions.length === 1
        ? requestTypeOptions[0]
        : "รถทุกประเภท";
  const displayTitle = title ?? `สถานะ${selectedFleetType}`;
  const summary = useMemo(() => {
    const rows: {
      key: string;
      label: string;
      color: string;
      qty: number;
    }[] = [
        ...FLEET_STATUSES.map(status => ({ ...status, qty: 0 })),
        { key: "other", label: "สถานะอื่น", color: "#64748b", qty: 0 },
      ];
    for (const item of filteredRequests) {
      const qty = Number(item.qty);
      if (
        !Number.isFinite(qty) ||
        qty <= 0
      ) {
        continue;
      }
      const status = dashboardStatusGroup(item.status);
      const row = rows.find(row => row.key === status) ?? rows[rows.length - 1];
      row.qty += qty;
    }
    return rows;
  }, [filteredRequests]);
  const statusTotal = summary.reduce((sum, row) => sum + row.qty, 0);
  const totals = useMemo(() => {
    const result = filteredRequests.reduce((acc, item) => {
      const qty = Number(item.qty);
      if (!Number.isFinite(qty) || qty <= 0) return acc;
      const status = dashboardStatusGroup(item.status);
      if (status === "success") acc.delivered += qty;
      if (status === "tcas" && Number.isInteger(Number(item.latest_process_level)) && Number(item.latest_process_level) >= 1 && Number(item.latest_process_level) <= 7) acc.remaining += qty;
      return acc;
    }, { delivered: 0, remaining: 0 });
    return { ...result, total: result.delivered + result.remaining };
  }, [filteredRequests]);

  // ตรวจสอบรายการ TCAS ที่ไม่ถูกนับใน Pending ขั้นตอน 1–7
  useEffect(() => {
    const step8: FleetRequest[] = [];
    const unspecifiedOrOther: FleetRequest[] = [];
    for (const row of filteredRequests) {
      if (dashboardStatusGroup(row.status) !== "tcas") continue;
      const rawLevel = String(row.latest_process_level ?? "").trim();
      const level = rawLevel === "" ? NaN : Number(rawLevel);
      if (level === 8) step8.push(row);
      else if (!Number.isInteger(level) || level < 1 || level > 8) unspecifiedOrOther.push(row);
    }
    const toLogRow = (row: FleetRequest) => ({
      request_id: row.id,
      incoming_truck_id: row.incoming_truck_id,
      running_doc: row.running_doc,
      unit_code: row.unit_code,
      vehicle_no: row.vehicle_no,
      dc_code: row.dc_code,
      fleet_type: row.fleet_type,
      status: row.status,
      qty: row.qty,
      latest_process_level: row.latest_process_level,
      latest_process_name: row.latest_process_name,
    });
    console.groupCollapsed("[Dashboard] ตรวจสอบ TCAS ขั้นตอน 8 และขั้นตอนอื่น");
    console.log("ขั้นตอน 8: จำนวนรายการ", step8.length);
    console.table(step8.map(toLogRow));
    console.log("ไม่ระบุขั้นตอน / นอกช่วง 1–8: จำนวนรายการ", unspecifiedOrOther.length);
    console.table(unspecifiedOrOther.map(toLogRow));
    console.log("ข้อมูลเต็ม ขั้นตอน 8:", step8);
    console.log("ข้อมูลเต็ม ไม่ระบุขั้นตอน / นอกช่วง 1–8:", unspecifiedOrOther);
    console.groupEnd();
  }, [filteredRequests]);

  const pendingStageTooltip = useMemo(() => {
    const stages = Array.from({ length: 7 }, (_, index) => ({
      level: index + 1, names: new Set<string>(), qty: 0,
    }));
    for (const process of [...processes, ...apiProcesses]) {
      if (isTemporaryFleet(process.fleet_type)) continue;
      const level = Number(process.process_level);
      const name = String(process.process ?? "").trim();
      if (Number.isInteger(level) && level >= 1 && level <= 7 && name)
        stages[level - 1].names.add(name);
    }
    for (const row of filteredRequests) {
      if (dashboardStatusGroup(row.status) !== "tcas") continue;
      const qty = Number(row.qty);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      const level = Number(row.latest_process_level);
      const name = String(row.latest_process_name ?? "").trim();
      if (Number.isInteger(level) && level >= 1 && level <= 7) {
        stages[level - 1].qty += qty;
        if (name) stages[level - 1].names.add(name);
      }
    }
    const lines = stages.map(stage => {
      const name = Array.from(stage.names).join(" / ");
      return `ขั้นตอน ${stage.level}${name ? `: ${name}` : ""} — ${formatNumber(stage.qty)} คัน`;
    });
    return ["รายละเอียดรถที่อยู่ระหว่างดำเนินการ", ...lines,
      `รวม ${formatNumber(stages.reduce((sum, stage) => sum + stage.qty, 0))} คัน`].join("\n");
  }, [filteredRequests, processes, apiProcesses]);
  // แยกจำนวนตามขั้นตอนโดยใช้เงื่อนไขเดียวกับ Pending และ Actual
  const deliveryStages = useMemo(() => {
    const defaultNames = ["จัดสรร FBP ออกรถ", "ออกหนังสือจัดสรร", "พิจารณาอนุมัติสินเชื่อ", "ส่งมอบ Chassis", "ประกอบตู้ และอุปกรณ์", "จดทะเบียนรถขนส่ง", "จัดหาพนักงานขับรถ"];
    const stages = defaultNames.map((name, index) => ({ level: index + 1, name, qty: 0 }));
    for (const row of filteredRequests) {
      if (dashboardStatusGroup(row.status) !== "tcas") continue;
      const level = Number(row.latest_process_level);
      const qty = Number(row.qty);
      if (!Number.isInteger(level) || level < 1 || level > 7 || !Number.isFinite(qty) || qty <= 0) continue;
      stages[level - 1].qty += qty;
    }
    return [...stages, { level: 8, name: "ส่งมอบรถเข้าคลัง", qty: totals.delivered }];
  }, [filteredRequests, totals.delivered]);
  const completion = percentage(totals.delivered, totals.total);
  const pendingPercentage = percentage(totals.remaining, totals.total);
  const hasFilters = requestTypeFilter !== "all" || selectedYear !== currentYear || monthFilter !== "all" || dcTypeFilter !== "all" || areaFilter !== "all" || fbpFilter !== "all" || statusFilter !== "all" || truckTypeFilter !== "all";
  const resetFilters = () => {
    setSelectedYear(currentYear); setMonthFilter("all"); setDcTypeFilter("all");
    setAreaFilter("all"); setFbpFilter("all"); setStatusFilter("all"); setTruckTypeFilter("all");
    setSearchText(""); setDcFilter("all"); setRequestTypeFilter("all"); setHoveredMonth(null);
  };
  const metricValue = (value: number) =>
    isLoading || activeError ? "—" : formatNumber(value);
  const dataMax = Math.max(0, ...timeline.flatMap(point => [point.planned, point.actual ?? 0]));
  // แบ่งแกน Y เป็น 4 ช่วงเท่า ๆ กัน โดยแต่ละช่วงเป็นจำนวนเต็มที่ลงท้ายด้วย 0 หรือ 5
  const yStep = Math.max(5, Math.ceil(dataMax / 4 / 5) * 5);
  const timelineMax = yStep * 4;
  const chartX = (index: number) =>
    48 + (index * 704) / Math.max(1, timeline.length - 1);
  const chartY = (value: number) => 220 - (value / timelineMax) * 184;
  const plannedPath = timeline
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${chartX(index)},${chartY(point.planned)}`,
    )
    .join(" ");
  const actualPath = timeline
    .map((point, index) =>
      point.actual === null
        ? ""
        : `${index === 0 || timeline[index - 1].actual === null ? "M" : "L"
        }${chartX(index)},${chartY(point.actual)}`,
    )
    .join(" ");
  return (
    <section
      className="fleet-dashboard"
      aria-label={displayTitle}
      aria-busy={isLoading || timelineLoading}
    >
      <style>{`
.fleet-dashboard{--ink:#243650;--muted:#73839a;--line:#e0e7f0;--blue:#285fac;--surface:#fff;box-sizing:border-box;width:100%;min-width:0;padding:18px;background:#f1f5fa;border:1px solid #e3eaf3;border-radius:20px;color:var(--ink);font-family:inherit;font-size:12px;line-height:1.5;font-variant-numeric:tabular-nums}
.fleet-dashboard *{box-sizing:border-box}.fleet-dashboard :is(h2,h3,p){margin:0}.fleet-dashboard :is(button,input,select){font:inherit}.fleet-dashboard button{cursor:pointer}.fleet-dashboard button:disabled{opacity:.5;cursor:default}.fleet-dashboard :is(button,input,select):focus-visible{outline:2px solid #3979d7;outline-offset:3px}.fleet-dashboard :is(input,select){min-width:0}.fleet-dashboard svg{flex-shrink:0}
.fleet-heading{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:16px 20px;margin-bottom:16px;background:linear-gradient(110deg,#173153,#25517f);border-radius:15px;color:#fff}.fleet-eyebrow{font-size:9px;font-weight:750;letter-spacing:1.8px;color:#a9cef8;margin-bottom:3px}.fleet-dashboard h2{font-size:22px;line-height:1.35;letter-spacing:-.4px}.fleet-subtitle{font-size:11px;color:#bdd0e8;margin-top:5px!important}
.fleet-button{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:33px;padding:6px 12px;border:1px solid var(--line);border-radius:9px;background:#fff;color:#4c6382;font-size:11px;font-weight:650;white-space:nowrap;transition:background .15s,border-color .15s}.fleet-button:hover{background:#eef4fc;border-color:#b7cce8}.fleet-button-primary{background:var(--blue);border-color:var(--blue);color:#fff}.fleet-button-primary:hover{background:#214e8b;color:#fff}.fleet-heading .fleet-button{background:#ffffff16;border-color:#ffffff36;color:#fff}.fleet-heading .fleet-button:hover{background:#ffffff29}
.fleet-filter-heading,.fleet-summary-heading-line{display:flex;align-items:center;gap:8px}.fleet-filter-heading{margin:0 2px 8px}.fleet-filter-heading h3,.fleet-api-summary-heading{font-size:12px;font-weight:750;color:#355174}.fleet-section-mark{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:7px;background:#e1eafb;color:#456f9f;font-size:9px;font-weight:800;flex-shrink:0}.fleet-filter-context{margin-left:auto;font-size:10px;color:var(--muted)}
.fleet-filters{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));align-items:end;gap:10px;padding:13px 15px;background:#fff;border:1px solid var(--line);border-radius:13px}.fleet-label{display:block;font-size:10px;font-weight:650;color:#718299;margin-bottom:5px}.fleet-field{display:block;width:100%;height:34px;padding:5px 9px;border:1px solid #dce5f0;border-radius:8px;background:#f7f9fc;color:#304c70;font-size:11px;transition:border-color .15s,box-shadow .15s}.fleet-field:hover:not(:disabled){border-color:#a2bbda}.fleet-field:focus{border-color:#6f9ad3;box-shadow:0 0 0 3px #3979d710;outline:none}.fleet-field:disabled{color:#9aa7b9}.fleet-filter-note{margin:6px 2px 0!important;font-size:10px;color:#8291a6}
.fleet-api-summary{margin:17px 0 0}.fleet-api-summary-header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}.fleet-api-summary-subtitle{font-size:10px;color:#8192a9;margin-top:2px!important}.fleet-api-summary-badge{font-size:10px;color:#7190b6;border:1px solid #dde6f4;border-radius:999px;padding:5px 9px;white-space:nowrap}.fleet-api-summary-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}.fleet-api-summary-card{position:relative;display:flex;flex-direction:column;min-width:0;min-height:151px;padding:14px 13px;border:1px solid #dce6f2;border-radius:14px;box-shadow:0 3px 9px #26466a06;text-align:left;isolation:isolate;overflow:hidden;transition:transform .15s,box-shadow .15s}.fleet-api-summary-card:after{content:"";position:absolute;right:-22px;top:-30px;width:95px;height:95px;border:18px solid currentColor;border-radius:50%;opacity:.035;z-index:-1}.fleet-api-summary-card:before{content:"";position:absolute;bottom:0;left:14px;right:14px;height:3px;background:currentColor;opacity:.35;border-radius:4px 4px 0 0}.fleet-api-summary-card.is-total{border-color:#315eaf}.fleet-api-summary-card.is-total:before{background:white;opacity:.2}.fleet-api-summary-card:hover{transform:translateY(-2px);box-shadow:0 7px 18px #26466a13}.fleet-api-summary-card.is-selected{outline:2px solid currentColor;outline-offset:1px}.fleet-api-summary-card.is-total.is-selected{outline-color:#4776dc}.fleet-api-summary-top{display:flex;justify-content:space-between;align-items:flex-start;gap:6px;min-height:47px}.fleet-api-summary-label{font-size:10.5px;line-height:1.55;font-weight:700;color:#49607e;white-space:pre-line;overflow-wrap:anywhere}.fleet-api-summary-card.is-total .fleet-api-summary-label{color:#e4eeff}.fleet-api-summary-icon{display:flex;align-items:center;justify-content:center;width:29px;height:29px;border-radius:9px;background:#ffffffaa;flex-shrink:0}.fleet-api-summary-icon svg{width:18px;height:18px}.fleet-api-summary-card.is-total .fleet-api-summary-icon{background:#ffffff22}.fleet-api-summary-number{display:flex;align-items:baseline;gap:6px;margin:7px 0}.fleet-api-summary-number strong{font-size:29px;line-height:1.2;font-weight:800;letter-spacing:-1px}.fleet-api-summary-number span{font-size:9px;opacity:.7}.fleet-api-summary-detail{display:block;min-height:30px;font-size:9.5px;line-height:1.5;opacity:.8}.fleet-api-summary-note{font-size:10px;color:#8091a8;margin:8px 2px 0!important}
.fleet-delivery-summary{display:grid;grid-template-columns:minmax(260px,1fr) minmax(360px,1.35fr);gap:16px;align-items:stretch}.fleet-delivery-summary>div:first-child{display:flex;flex-direction:column;min-width:0}.fleet-delivery-summary .fleet-delivery-cards{display:grid;grid-template-columns:1fr;grid-template-rows:repeat(3,minmax(0,1fr));flex:1}.fleet-delivery-summary .fleet-delivery-card+.fleet-delivery-card{border-left:0;border-top:1px solid #e7edf5}.delivery-stage-panel{border:1px solid #dce4ef;border-radius:13px;background:#fff;padding:16px}.delivery-stage-panel h3{margin:0 0 12px;color:#334f76;font-size:15px}.delivery-stage-panel h3 small{font-size:11px;color:#7990aa}.delivery-stage-row{display:grid;grid-template-columns:26px minmax(0,1fr) minmax(100px,42%);gap:8px;align-items:center;min-height:36px;border-bottom:1px solid #edf1f6}.delivery-stage-number{width:23px;height:23px;display:grid;place-items:center;border-radius:50%;background:#e9f0fb;color:#5275a3;font-size:11px;font-weight:700}.delivery-stage-name{font-size:12px;color:#334155}.delivery-stage-value{display:flex;align-items:center;gap:8px;min-width:0}.delivery-stage-value strong{font-size:12px;min-width:32px;text-align:right;color:#334155}.delivery-stage-bar-track{height:10px;flex:1;background:#f1f5f9;border-radius:9px;overflow:hidden}.delivery-stage-bar-track span{display:block;height:100%;border-radius:inherit}.delivery-stage-total{display:flex;justify-content:space-between;padding:11px 4px 0;font-size:13px;color:#334155}.delivery-stage-panel p{margin:8px 0 0!important;color:#8796aa;font-size:10px}@media(max-width:900px){.fleet-delivery-summary{grid-template-columns:1fr}}@media(max-width:560px){.delivery-stage-panel{padding:12px}.delivery-stage-row{grid-template-columns:24px minmax(0,1fr) minmax(75px,35%);gap:5px}.delivery-stage-name{font-size:11px}}
.fleet-delivery-summary{margin:17px 0 12px}.fleet-delivery-heading{font-size:12px;color:#3d587c;margin-bottom:9px!important}.fleet-delivery-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid var(--line);border-radius:13px;overflow:hidden;background:#fff}.fleet-delivery-card{padding:12px 17px;min-width:0}.fleet-delivery-card+.fleet-delivery-card{border-left:1px solid #e7edf5}.fleet-delivery-label{font-size:11px;font-weight:650;color:#5b7392}.fleet-delivery-label small{font-size:9px;font-weight:500;margin-left:5px;color:#95a2b5}.fleet-delivery-number{display:flex;align-items:center;gap:9px;margin-top:7px;color:#416999}.fleet-delivery-number svg{width:27px;height:27px;padding:4px;background:#eff4fb;border-radius:8px}.fleet-delivery-number strong{font-size:26px;line-height:1.2;font-weight:800}.fleet-delivery-unit{font-size:9px;display:inline;margin-left:6px;color:var(--muted)}.fleet-delivery-note{font-size:9px;color:#91a0b3;margin-top:7px!important}.fleet-delivery-progress-row{display:flex;align-items:center;gap:8px;margin-top:8px}.fleet-delivery-progress-track{height:5px;border-radius:99px;overflow:hidden;flex:1;background:#eef2f7}.fleet-delivery-progress-track>span{display:block;height:100%;border-radius:inherit}.fleet-delivery-percent{font-size:10px;color:#7990aa}
.fleet-panels{display:grid;grid-template-columns:minmax(0,1.8fr) minmax(270px,1fr);gap:0;border:1px solid var(--line);border-radius:15px;background:#fff;overflow:hidden}.fleet-panel{min-width:0;background:#fff;overflow:hidden}.fleet-panels>.fleet-panel+.fleet-panel{border-left:1px solid #e5ecf4}.fleet-panel-header{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 15px;min-height:65px;border-bottom:1px solid #e9eef6;background:linear-gradient(100deg,#fafcff,#fff)}.fleet-panel h3{font-size:12px;font-weight:750;color:#324f73}.fleet-panel-description{font-size:10px;color:#8a9aaf;margin-top:3px!important;line-height:1.5}.fleet-panel-header>span{font-size:10px;color:#7890af;white-space:nowrap}.fleet-panel-content{padding:13px 15px}.fleet-year-select{width:100px;flex-shrink:0}.fleet-chart-scroll{overflow:auto;max-width:100%;scrollbar-width:thin}.fleet-chart{display:block;width:100%;min-width:520px;height:260px}.fleet-legend{display:flex;flex-wrap:wrap;align-items:center;gap:12px;font-size:10px;color:#7c8da6;margin-top:9px}.fleet-legend>span{display:inline-flex;align-items:center;gap:6px}.fleet-legend i{display:inline-block;width:7px;height:7px;border-radius:2px}
.fleet-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;min-height:180px;padding:20px;color:#8192a8;font-size:11px;text-align:center;background:linear-gradient(180deg,#fff,#fafcff)}.fleet-error{display:block;margin:12px 0;padding:12px 14px;background:#fff2f3;color:#a83e55;border:1px solid #f1d8de;border-left:3px solid #d64f6c;border-radius:10px;font-size:11px;overflow-wrap:anywhere}.fleet-error p{margin-top:4px}.fleet-warehouse-list{max-height:260px;overflow:auto;scrollbar-width:thin;padding-right:5px}.fleet-warehouse{padding:9px 0;border-bottom:1px solid #eef2f8}.fleet-warehouse:last-child{border-bottom:0}.fleet-row{display:flex;align-items:center;justify-content:space-between;gap:7px;margin-bottom:5px}.fleet-warehouse-name{font-size:11px;font-weight:750;color:#456185}.fleet-row-meta{font-size:10px;color:#8799b0}.fleet-bar{display:flex;width:100%;height:7px;background:#edf2f8;border-radius:99px;overflow:hidden}.fleet-bar>span{height:100%;display:block}.fleet-warehouse-detail{display:flex;justify-content:space-between;gap:8px;font-size:10px;margin-top:5px;color:#8190a5}
.fleet-stage-layout{display:grid;grid-template-columns:minmax(540px,2fr) minmax(330px,1fr);gap:0;margin-top:16px;border:1px solid var(--line);border-radius:15px;background:#fff;overflow:auto;scrollbar-width:thin;align-items:start}.fleet-stage-layout>.fleet-panel+.fleet-panel{border-left:1px solid #e2eaf4}.fleet-stage-layout>.fleet-panel>.fleet-panel-header{height:78px;min-height:78px;max-height:78px;padding:11px 14px}.fleet-stage-layout .fleet-panel-description{max-height:30px;overflow:hidden}.fleet-stage-scroll{height:auto;max-height:none;overflow-x:auto;scrollbar-width:thin;background:#fff}.fleet-stage-table{width:100%;min-width:640px;table-layout:auto;border-collapse:separate;border-spacing:0;font-size:10px}.fleet-stage-table :is(th,td){padding:5px 8px;border-bottom:1px solid #e9eff6;text-align:center;font-variant-numeric:tabular-nums}.fleet-stage-table thead th{position:sticky;top:0;z-index:5;height:58px;min-width:118px;max-width:170px;background:#3c5473;color:#fff;font-size:10px;font-weight:650;line-height:1.5;border-right:1px solid #ffffff18}.fleet-stage-table .fleet-step-name{display:block;font-size:10px;line-height:1.5;max-width:170px;color:inherit}.fleet-header-unit{display:block;font-size:8px;opacity:.65;margin-top:3px}.fleet-step-label{display:inline-block;font-size:8px;background:#ffffff20;color:inherit;border-radius:4px;padding:1px 5px}.fleet-stage-table .fleet-truck-row{height:38px}.fleet-stage-table .fleet-truck-row :is(th,td){height:38px;white-space:nowrap;background:#fff}.fleet-stage-table .fleet-truck-row th{text-align:left;font-weight:500;color:#506a8c}.fleet-stage-table .fleet-truck-row:hover :is(th,td){background:#edf5ff}.fleet-stage-table .fleet-dc-group{height:32px}.fleet-stage-table .fleet-dc-group :is(th,td){height:32px;background:#edf2f9;color:#456183;white-space:nowrap;font-weight:750;text-align:left}.fleet-truck-label{display:inline-block;max-width:170px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;vertical-align:middle}.fleet-dc-pill{display:inline-flex;align-items:center;justify-content:center;border-radius:7px;background:#e5edf9;padding:5px 7px;font-size:10px;font-weight:750;color:#4d719d}.fleet-dc-merged{vertical-align:middle;background:#f5f8fc!important}.fleet-warehouse-marker{display:inline-block;width:4px;height:12px;border-radius:3px;background:#7395c3;margin-right:7px;vertical-align:middle}.fleet-group-quantity{float:right;font-size:9px;color:#899bb2}.fleet-count-button{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:25px;padding:2px 6px;border:1px solid #dce7f6;border-radius:6px;background:#edf3fb;color:#406b9e;font-size:10px;font-weight:750}.fleet-count-button:hover{background:#dbeafa;border-color:#9fbee3}.fleet-stage-completed .fleet-count-button{background:#e7f6ed;color:#16805b;border-color:#cfe8da}.fleet-stage-table td[data-stage="9"] .fleet-count-button,.fleet-stage-table td[data-stage="10"] .fleet-count-button{background:#fff0f1;color:#b35464;border-color:#eed3d9}.fleet-stage-table .fleet-stage-total{background:#f1f5fc!important;font-weight:800;color:#3a6497}.fleet-cell-empty{color:#c1ccdc}.fleet-month-table{min-width:360px;table-layout:fixed}.fleet-month-table thead th{min-width:60px;white-space:nowrap}.fleet-month-table .fleet-truck-row td{font-weight:650;color:#557399}.fleet-locked-table{--dc-lock-width:72px}.fleet-locked-table .fleet-lock-dc{position:sticky;left:0;width:var(--dc-lock-width);min-width:var(--dc-lock-width);max-width:var(--dc-lock-width);z-index:3;background:#f4f7fc}.fleet-locked-table .fleet-lock-truck{position:sticky;left:var(--dc-lock-width);min-width:160px;max-width:180px;z-index:3;background:#fff;box-shadow:3px 0 7px #203d6008}.fleet-locked-table thead .fleet-lock-dc,.fleet-locked-table thead .fleet-lock-truck{z-index:7;background:#3c5473}.fleet-lock-warehouse{max-width:230px;overflow:hidden;text-overflow:ellipsis}.fleet-step-toggle{border:0;background:transparent;color:#7d92ae;padding:4px 5px;border-radius:6px;flex-shrink:0;font-size:10px;white-space:nowrap}.fleet-step-toggle:hover{background:#edf3fb;color:#456c9c}
.fleet-vendor-tooltip{position:fixed;z-index:10000;pointer-events:none;width:288px;max-width:calc(100vw - 24px);max-height:220px;overflow:auto;padding:12px 14px;border:1px solid #dce6f3;border-radius:11px;background:#fff;color:#496482;box-shadow:0 12px 36px #162e5424}.fleet-vendor-tooltip-heading{font-size:10px;color:#7c90ac;font-weight:750;border-bottom:1px solid #e9eef5;padding-bottom:7px;margin-bottom:7px}.fleet-vendor-tooltip-row{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:4px 0;font-size:11px}.fleet-vendor-tooltip-row span{overflow-wrap:anywhere}.fleet-vendor-tooltip-row strong{white-space:nowrap;color:#3d679a}.fleet-footer{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;font-size:9px;color:#8c9bb0;margin-top:13px}
.fleet-month-counter{font-size:10px;white-space:nowrap;color:#507caf;background:#edf4ff;border:1px solid #dbe7f8;padding:6px 9px;border-radius:8px}.fleet-month-open:hover{background:#dfebfd}.fleet-month-dialog{position:fixed;inset:0;margin:auto;width:min(410px,calc(100vw - 32px));max-height:calc(100dvh - 40px);overflow:auto;padding:0;border:1px solid #dce6f3;border-radius:18px;background:#fff;color:#304c70;box-shadow:0 22px 70px #17305240}.fleet-month-dialog::backdrop{background:#1a305660;backdrop-filter:blur(3px)}.fleet-month-dialog-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 19px;background:#f7faff}.fleet-month-dialog-heading h3{font-size:14px}.fleet-month-dialog-heading p{font-size:11px;color:#8195af;margin-top:5px!important}.fleet-month-close{width:29px;height:29px;border:0;background:#eaf0f9;color:#637d9f;border-radius:8px;font-size:22px!important}.fleet-month-picker{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:16px 19px}.fleet-month-chip{padding:9px 5px;border:1px solid #dfe7f3;border-radius:9px;color:#6f86a5;background:#f8faff;font-size:11px;font-weight:650}.fleet-month-chip.is-selected{background:#2e61b6;border-color:#2e61b6;color:#fff}.fleet-month-chip:hover:not(:disabled):not(.is-selected){background:#edf3ff}.fleet-month-picker-note{padding:0 19px 15px;font-size:10px;line-height:1.6;color:#8b9bb1}.fleet-month-dialog-footer{display:flex;justify-content:flex-end;padding:12px 19px;background:#f8faff;border-top:1px solid #e8eef7}
.sla-overdue-embed{margin:17px 0;padding:0;background:#fff;border:1px solid var(--line);border-radius:15px;overflow:hidden;box-shadow:0 3px 12px #29476c03}.sla-shell{width:100%}.sla-heading{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding:13px 15px;border-bottom:1px solid #edf1f7;background:linear-gradient(100deg,#fff8f5,#fff 60%)}.sla-eyebrow{font-size:9px!important;font-weight:800;letter-spacing:1.3px;color:#bc7153}.sla-heading h3{font-size:13px;color:#3e5472;margin-top:2px!important}.sla-description{font-size:10px;color:#8a9bb2;margin-top:4px!important}.sla-refresh{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:7px 10px;background:#fff;border:1px solid #dbe5f2;border-radius:8px;color:#53749d;font-size:10px!important}.sla-refresh:hover{background:#f2f6fd}.sla-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));margin:0 15px;border-bottom:1px solid #e8eef6}.sla-kpi{display:flex;align-items:center;gap:10px;padding:12px 14px}.sla-kpi+.sla-kpi{border-left:1px solid #e8eef6}.sla-kpi-icon{display:flex;align-items:center;justify-content:center;width:31px;height:31px;border-radius:9px;flex-shrink:0}.sla-kpi-icon.rose{background:#fff0f3;color:#bf4765}.sla-kpi-icon.amber{background:#fff5df;color:#b27d21}.sla-kpi-icon.blue{background:#edf4ff;color:#477db7}.sla-kpi-label{font-size:10px;color:#8a9ab0}.sla-kpi-value{font-size:19px;font-weight:800;line-height:1.3;margin-top:2px!important;color:#3e5778}.sla-toolbar{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:11px 15px}.sla-search{position:relative;flex:1;min-width:220px}.sla-search svg{position:absolute;left:10px;top:9px;color:#9baabd}.sla-control{height:33px;padding:5px 10px;border:1px solid #dce5f2;background:#f9fbfe;border-radius:8px;font-size:11px!important;color:#536e91;max-width:100%}.sla-search input{width:100%;padding-left:32px}.sla-clear{border:0;background:transparent;color:#4073b6;font-size:10px!important}.sla-clear:hover{text-decoration:underline}.sla-table-scroll{max-height:330px;overflow:auto;scrollbar-width:thin;scrollbar-gutter:stable}.sla-table{width:100%;min-width:1040px;text-align:left;border-spacing:0;border-collapse:separate;font-size:11px}.sla-table thead{position:sticky;top:0;z-index:2;background:#3c5473;color:#fff}.sla-table th{white-space:nowrap;padding:10px 12px;font-size:10px;font-weight:650;border-right:1px solid #ffffff18}.sla-table td{padding:10px 12px;border-bottom:1px solid #e9eff6;vertical-align:top;line-height:1.5}.sla-table tbody tr:nth-child(even){background:#fafcff}.sla-table tbody tr:hover{background:#eff5ff}.sla-table td p{margin-top:3px;font-size:10px;color:#8b9bb1}.sla-strong{font-weight:650;color:#4c6383}.sla-id{font-size:9px!important;color:#a2b0c3!important}.sla-days{background:#fff3f5;color:#b34360;white-space:nowrap;text-align:right}.sla-days>span{display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:800}.sla-days p{color:#b96e82!important;font-size:9px!important}.sla-limit{white-space:nowrap;text-align:right;color:#6b829f}.sla-action{min-width:180px;max-width:320px;white-space:pre-line;font-size:10px;color:#b5536e;font-weight:650}.sla-state-message{position:sticky;left:12px;display:block;width:min(650px,calc(100vw - 85px));text-align:center}.sla-state{height:135px;text-align:center;color:#8c9ab0;padding:22px!important}.sla-table .sla-state{background:#fafcff;text-align:center}.sla-error{display:flex;gap:9px;align-items:flex-start;margin:0 15px 12px;padding:12px;border:1px solid #f0d8df;border-radius:9px;background:#fff4f6;color:#ae4964;font-size:11px}.sla-error svg{flex-shrink:0}.sla-error p{margin-top:4px!important;overflow-wrap:anywhere}.sla-error-api{font-size:10px;opacity:.7}.sla-table-footer{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:9px 15px;font-size:9px;color:#8d9eb4;border-top:1px solid #e9eff6}.sla-spin{animation:fleet-spin 1s linear infinite}@keyframes fleet-spin{to{transform:rotate(360deg)}}
@media(min-width:1350px){.fleet-filters{grid-template-columns:repeat(8,minmax(0,1fr))}}
@media(max-width:1150px){.fleet-api-summary-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.fleet-api-summary-card{min-height:137px}.fleet-api-summary-top{min-height:35px}.fleet-panels{grid-template-columns:minmax(0,1.6fr) minmax(240px,1fr)}}
@media(max-width:850px){.fleet-dashboard{padding:13px}.fleet-panels{grid-template-columns:1fr}.fleet-panels>.fleet-panel+.fleet-panel{border-left:0;border-top:1px solid var(--line)}.fleet-chart{height:250px}.fleet-warehouse-list{max-height:230px}.fleet-heading h2{font-size:20px}.fleet-stage-layout{grid-template-columns:minmax(540px,2fr) minmax(330px,1fr)}}
@media(max-width:560px){.fleet-dashboard{padding:10px;border-radius:14px}.fleet-heading{padding:14px;align-items:flex-start;flex-wrap:wrap;gap:10px}.fleet-heading h2{font-size:18px}.fleet-filters{grid-template-columns:repeat(2,minmax(0,1fr));padding:12px;gap:9px}.fleet-field{height:36px}.fleet-api-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.fleet-api-summary-card{min-height:147px;padding:12px 11px}.fleet-api-summary-top{min-height:46px}.fleet-api-summary-number strong{font-size:27px}.fleet-api-summary-badge{display:none}.fleet-delivery-card{padding:10px 9px}.fleet-delivery-number{gap:5px}.fleet-delivery-number svg{display:none}.fleet-delivery-number strong{font-size:22px}.fleet-delivery-label{font-size:10px}.fleet-delivery-label small{display:none}.sla-heading{padding:12px}.sla-kpis{margin:0 8px}.sla-kpi{padding:10px 7px;gap:5px}.sla-kpi-icon{display:none}.sla-kpi-value{font-size:16px}.sla-kpi-label{font-size:9px}.sla-toolbar{padding:10px 12px}.sla-search{flex-basis:100%;min-width:0}.sla-toolbar select{flex:1;min-width:0}.sla-table-footer{padding:9px 12px}.fleet-footer{font-size:9px}.fleet-chart{height:230px}}
@media(prefers-reduced-motion:reduce){.fleet-dashboard *{animation:none!important;transition:none!important}.fleet-api-summary-card:hover{transform:none}}

.fleet-dashboard{background:#edf1f7;border-radius:18px;padding:18px;border-color:#dce4ef}
.fleet-heading{background:#fff;color:#223754;box-shadow:none;border:1px solid #dfe6f0;border-bottom:3px solid #243f6b;border-radius:14px;padding:16px 18px;min-height:90px;margin-bottom:17px}
.fleet-brand{display:flex;align-items:center;gap:13px;min-width:0}.fleet-brand-icon{display:flex;align-items:center;justify-content:center;width:46px;height:46px;background:#213b63;border-radius:13px;color:#cce2ff;box-shadow:0 5px 13px #1d335815;flex-shrink:0}
.fleet-heading h2{font-size:23px;color:#213b63;line-height:1.25}.fleet-heading .fleet-eyebrow{color:#6a84a7;font-size:9px;letter-spacing:2px}.fleet-heading .fleet-subtitle{color:#7e91ac;font-size:11px}.fleet-heading .fleet-button{background:#243f6b;border-color:#243f6b;color:#fff;min-height:35px}.fleet-heading .fleet-button:hover{background:#162e52}
.fleet-filter-heading{margin-bottom:8px}.fleet-filters{border:1px solid #dbe4f0;border-radius:12px;background:#f9fbfe;padding:12px 14px}.fleet-field{background:#fff;height:34px;border-color:#d6e1ef}.fleet-filter-context{color:#3a6498;background:#dfe9f9;border-radius:6px;padding:3px 8px;font-weight:650}
.fleet-api-summary{margin-top:17px}.fleet-api-summary-grid{gap:0;border:1px solid #dce4ee;border-radius:15px;overflow:hidden;background:#fff;box-shadow:0 5px 14px #19365d05;grid-template-columns:1.05fr repeat(5,minmax(0,1fr))}.fleet-api-summary-card{border:0;border-radius:0;padding:15px 15px 13px;min-height:150px;box-shadow:none;transition:background .15s;overflow:hidden}.fleet-api-summary-card+.fleet-api-summary-card{border-left:1px solid #e6ecf4}.fleet-api-summary-card:after{display:none}.fleet-api-summary-card:before{left:15px;right:15px;bottom:11px;height:2px;opacity:.3}.fleet-api-summary-card:hover{transform:none;box-shadow:inset 0 0 0 999px #5579aa06}.fleet-api-summary-card.is-selected{outline:0;box-shadow:inset 0 0 0 2px currentColor;background:#f8fbff!important}.fleet-api-summary-card.is-total.is-selected{background:#1d3358!important;box-shadow:none}.fleet-api-summary-card.is-total{border:0}.fleet-api-summary-card.is-total .fleet-api-summary-label{color:#d6e5fc}.fleet-api-summary-icon{width:30px;height:30px;border:1px solid #e8edf4;background:#f7f9fc;border-radius:9px}.fleet-api-summary-card.is-total .fleet-api-summary-icon{background:#ffffff15;border-color:#ffffff20;color:#b6d3ff}.fleet-api-summary-top{min-height:44px}.fleet-api-summary-number{margin:8px 0 7px}.fleet-api-summary-number strong{font-size:32px}.fleet-api-summary-detail{padding-bottom:10px;min-height:32px;font-size:9px}.fleet-api-summary-card.is-total .fleet-api-summary-number{color:#fff}
.sla-overdue-embed{border-radius:15px;border:1px solid #dfdfe8;background:#fff;box-shadow:0 5px 17px #1d335806;margin-top:18px}.sla-heading{background:#fff;border-bottom:1px solid #e7eaf1;padding:13px 16px;position:relative}.sla-heading:before{content:"";position:absolute;left:0;top:15px;bottom:15px;width:4px;background:#d66355;border-radius:0 4px 4px 0}.sla-eyebrow{font-size:8px!important;letter-spacing:1.6px;color:#bc776a}.sla-heading h3{font-size:14px;color:#293f61}.sla-description{font-size:10px}.sla-workspace{display:grid;grid-template-columns:183px minmax(0,1fr);align-items:stretch}.sla-kpis{display:flex;flex-direction:column;margin:0;padding:6px 12px;background:linear-gradient(160deg,#f8f4f3,#f4f7fc);border:0;border-right:1px solid #e6e9f0}.sla-kpi{padding:17px 3px;gap:9px;flex:1;align-items:flex-start}.sla-kpi+.sla-kpi{border-left:0;border-top:1px solid #e0e5ed}.sla-kpi-icon{width:29px;height:29px;border:1px solid #e9e2e4;border-radius:9px}.sla-kpi-label{font-size:10px;line-height:1.5;color:#8592a5}.sla-kpi-value{font-size:25px;line-height:1.3;color:#304867;margin-top:5px!important}.sla-kpi:first-child .sla-kpi-value{color:#b84c5a}.sla-kpi:nth-child(2) .sla-kpi-value{color:#a1742d}.sla-kpi:nth-child(3) .sla-kpi-value{color:#4776aa}.sla-table-section{min-width:0}.sla-toolbar{padding:11px 12px;border-bottom:1px solid #edf0f6;background:#fbfcff}.sla-control{background:#fff;height:33px;font-size:10px!important}.sla-table th{background:#edf2fa;color:#4d688d;border-bottom:1px solid #d9e3f1;border-right:0;font-weight:750;font-size:9px;padding:9px 11px}.sla-table td{padding:10px 11px}.sla-table thead{background:#edf2fa}.sla-table-scroll{max-height:320px}.sla-error{margin:10px 12px;padding:9px 11px;font-size:10px;border-left:3px solid #ce7182;background:#fff6f7}.sla-error-api{font-size:9px}.sla-state{height:125px}.sla-state-message{width:min(650px,calc(100vw - 300px));font-size:10px}.sla-table-footer{padding:8px 12px;background:#fbfcff;font-size:9px}
.fleet-delivery-heading{font-size:13px;color:#334f76}.fleet-delivery-cards{background:#fff;border:1px solid #dce4ef;border-radius:13px}.fleet-delivery-card{position:relative;padding:13px 17px}.fleet-delivery-card:after{content:"";position:absolute;right:17px;top:16px;width:7px;height:7px;border-radius:50%;background:#7498c8}.fleet-delivery-card:nth-child(2):after{background:#17a776}.fleet-delivery-card:nth-child(3):after{background:#e3944b}.fleet-delivery-label{font-size:11px;color:#58759a}.fleet-delivery-number strong{font-size:27px}.fleet-panels{grid-template-columns:minmax(0,1.65fr) minmax(285px,1fr);border-radius:14px;border-color:#dce4ef}.fleet-panel-header{background:#f9fbfe;padding:13px 16px}.fleet-panel-header h3{font-size:13px}.fleet-stage-layout{border-radius:14px;border-color:#dce4ef;margin-top:18px}.fleet-stage-layout .fleet-panel-header{background:#f8faff}.fleet-stage-table thead th{background:#2c4569;font-weight:650}.fleet-locked-table thead .fleet-lock-dc,.fleet-locked-table thead .fleet-lock-truck{background:#2c4569}.fleet-stage-table .fleet-truck-row:hover :is(th,td){background:#eaf3ff}
@media(max-width:1150px){.fleet-api-summary-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.fleet-api-summary-card:nth-child(n+4){border-top:1px solid #e6ecf4}.fleet-api-summary-card:nth-child(4){border-left:0}.fleet-api-summary-card{min-height:140px}.sla-workspace{grid-template-columns:160px minmax(0,1fr)}.sla-kpis{padding:5px 9px}.sla-kpi{gap:6px}}
@media(max-width:850px){.fleet-panels{grid-template-columns:1fr}.sla-workspace{grid-template-columns:1fr}.sla-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));padding:0 10px;background:#f8faff;border-right:0;border-bottom:1px solid #e6e9f0}.sla-kpi{padding:11px 7px;align-items:center}.sla-kpi+.sla-kpi{border-top:0;border-left:1px solid #e6e9f0}.sla-kpi-value{font-size:22px}.sla-state-message{width:min(650px,calc(100vw - 85px))}}
@media(max-width:560px){.fleet-heading{padding:13px;gap:11px}.fleet-brand{gap:10px}.fleet-brand-icon{width:35px;height:35px;border-radius:10px}.fleet-brand-icon svg{width:21px;height:21px}.fleet-heading h2{font-size:18px}.fleet-api-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.fleet-api-summary-card{padding:13px 11px;min-height:150px}.fleet-api-summary-card:nth-child(n+3){border-top:1px solid #e6ecf4}.fleet-api-summary-card:nth-child(odd){border-left:0}.fleet-api-summary-card:nth-child(4){border-left:1px solid #e6ecf4}.fleet-api-summary-number strong{font-size:29px}.sla-kpi{padding:11px 5px}.sla-kpi-icon{display:none}.sla-kpi-value{font-size:18px}.sla-kpi-label{font-size:9px}.sla-table-footer{font-size:9px}.fleet-heading .fleet-button{min-height:32px;font-size:10px}.fleet-api-summary-top{min-height:47px}}

/* Shared report frame and prominent export action. */
.fleet-report-block{margin-top:20px;border:1px solid #cad9ea;border-radius:16px;background:#fff;overflow:hidden;box-shadow:0 4px 16px #1d335809}
.fleet-report-toolbar{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:17px 18px;background:#edf4fc;border-bottom:1px solid #d4e1f0}
.fleet-report-heading{display:flex;align-items:center;gap:12px;min-width:0}
.fleet-report-icon{display:flex;align-items:center;justify-content:center;flex-shrink:0;width:43px;height:43px;border:1px solid #cfdef0;border-radius:11px;background:#fff;color:#285fac}
.fleet-report-heading h3{font-size:15px;font-weight:750;color:#213b63}
.fleet-report-heading p{margin-top:4px!important;font-size:11px;color:#607998}
.fleet-export-excel{display:inline-flex;align-items:center;justify-content:center;gap:11px;flex-shrink:0;min-height:49px;padding:10px 19px;border:1px solid #047857;border-radius:10px;background:#078452;color:#fff;box-shadow:0 3px 8px #04785726;font-family:inherit;font-size:14px;font-weight:750;line-height:1.3;cursor:pointer;transition:background .15s,box-shadow .15s}
.fleet-export-excel small{display:block;margin-top:3px;font-size:10px;font-weight:400;color:#d1fae5}
.fleet-export-excel:hover:not(:disabled){background:#066a43;box-shadow:0 4px 12px #04785735}
.fleet-export-excel:focus-visible{outline:3px solid #34d399;outline-offset:3px}
.fleet-export-excel:disabled{opacity:.55;cursor:not-allowed;box-shadow:none}
.fleet-report-block .fleet-stage-layout{margin-top:0;border:0;border-radius:0;box-shadow:none}
.fleet-report-error{padding:10px 18px;background:#fff1f2;border-bottom:1px solid #fecdd3;color:#be123c;font-size:12px}
@media(max-width:650px){.fleet-report-toolbar{align-items:stretch;flex-direction:column;padding:14px;gap:13px}.fleet-report-heading h3{font-size:14px}.fleet-export-excel{width:100%}.fleet-report-heading p{font-size:10px}}

/* Separate status cards with oversized background icons. */
.fleet-api-summary-grid{gap:11px;grid-template-columns:repeat(6,minmax(0,1fr));border:0;border-radius:0;background:transparent;box-shadow:none;overflow:visible}
.fleet-api-summary-card{position:relative;isolation:isolate;min-height:155px;border:1px solid #dce5f1!important;border-radius:15px!important;padding:15px 14px;box-shadow:0 4px 13px #1d335807;overflow:hidden;transition:transform .16s,box-shadow .16s,border-color .16s}
.fleet-api-summary-card:before,.fleet-api-summary-card:after{display:none}
.fleet-api-summary-card.is-total{border-color:#1d3358!important}
.fleet-api-summary-top{display:block;min-height:42px;padding-right:4px}
.fleet-api-summary-label{position:relative;z-index:1;max-width:100%;font-size:10.5px;line-height:1.6;white-space:pre-line}
.fleet-api-summary-icon,.fleet-api-summary-card.is-total .fleet-api-summary-icon{position:absolute;right:-17px;bottom:-15px;top:auto;width:110px;height:110px;border:0;border-radius:0;background:transparent;color:inherit;opacity:.085;pointer-events:none;z-index:-1;transform:rotate(-12deg);box-shadow:none}
.fleet-api-summary-icon svg{width:105px;height:105px;stroke-width:1.2}
.fleet-api-summary-card.is-total .fleet-api-summary-icon{opacity:.11;color:#dceaff}
.fleet-api-summary-number{position:relative;z-index:1;margin:10px 0 8px}
.fleet-api-summary-number strong{font-size:32px;letter-spacing:-.8px}
.fleet-api-summary-detail{position:relative;z-index:1;max-width:92%;font-size:9.5px;line-height:1.5;padding:0;min-height:29px;opacity:.85}
.fleet-api-summary-card:hover{transform:translateY(-3px);box-shadow:0 9px 23px #1d335814}
.fleet-api-summary-card.is-selected{outline:2px solid currentColor;outline-offset:2px;box-shadow:0 5px 16px #1d33580c;background:#fff!important}
.fleet-api-summary-card.is-total.is-selected{outline:2px solid #5074aa;outline-offset:2px;background:#1d3358!important}
.fleet-api-summary-card:focus-visible{outline:3px solid #3979d7;outline-offset:3px}
@media(max-width:1150px){.fleet-api-summary-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.fleet-api-summary-card{min-height:145px}.fleet-api-summary-top{min-height:35px}}
@media(max-width:560px){.fleet-api-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.fleet-api-summary-card{padding:13px 12px;min-height:150px}.fleet-api-summary-top{min-height:44px}.fleet-api-summary-icon,.fleet-api-summary-card.is-total .fleet-api-summary-icon{width:95px;height:95px;bottom:-14px;right:-12px}.fleet-api-summary-icon svg{width:95px;height:95px}.fleet-api-summary-number strong{font-size:28px}.fleet-api-summary-detail{font-size:9px}}

/* Reference-inspired soft filter panel. */
.fleet-filter-shell{background:#fff;border:1px solid #e2e9f4;border-radius:19px;overflow:hidden;box-shadow:0 5px 20px #24436905;margin-bottom:15px}
.fleet-filter-shell .fleet-filter-heading{margin:0;padding:13px 18px;min-height:64px;gap:11px;border-bottom:1px solid #edf2f9;background:linear-gradient(100deg,#f6f9ff,#fdfefe)}
.fleet-filter-shell .fleet-filter-heading h3{font-size:13px;color:#213a60;font-weight:800}
.fleet-filter-emblem{display:flex;align-items:center;justify-content:center;flex-shrink:0;width:36px;height:36px;border-radius:12px;background:linear-gradient(140deg,#2968ff,#5c38ff);color:#fff;box-shadow:0 5px 12px #4549ed25}
.fleet-filter-emblem svg{width:21px;height:21px}
.fleet-filter-shell .fleet-filter-context{margin-left:auto;background:#fff;color:#617ea4;border:1px solid #edf1f8;box-shadow:0 2px 4px #243e6009;border-radius:999px;font-size:10px;padding:5px 10px;white-space:nowrap}
.fleet-filter-shell .fleet-filters{grid-template-columns:repeat(4,minmax(0,1fr));border:0;box-shadow:none;border-radius:0;background:#fff;padding:15px 18px 10px;gap:13px 16px}
.fleet-filter-shell .fleet-label{font-size:10px;color:#8c9fbd;font-weight:750;margin:0 0 7px;letter-spacing:.1px}
.fleet-filter-input{display:block;position:relative;width:100%;min-width:0}
.fleet-filter-input-icon{position:absolute;z-index:1;left:12px;top:50%;transform:translateY(-50%);color:#438bff;pointer-events:none;display:flex;align-items:center}
.fleet-filter-shell .fleet-field{appearance:none;-webkit-appearance:none;background:#fff;height:40px;min-height:40px;border:1px solid #dce5f2;border-radius:12px;padding:7px 30px 7px 38px;font-size:11px;box-shadow:0 2px 4px #213e6410;color:#233f66;transition:border-color .15s,box-shadow .15s}
.fleet-filter-shell .fleet-field:hover:not(:disabled){border-color:#a9c3ed;box-shadow:0 3px 8px #213e6410}
.fleet-filter-shell .fleet-field:focus{border-color:#76a5f5;box-shadow:0 0 0 3px #3882ff15;outline:0}
.fleet-filter-shell .fleet-field:disabled{background:#fafcff;color:#b0bed0}
.fleet-filter-chevron{position:absolute;right:13px;top:50%;transform:translateY(-50%);font-size:12px;color:#8ca4c4;pointer-events:none}
.fleet-filter-shell .fleet-filters>.fleet-button{height:40px;border-radius:12px;background:#fff;border:1px solid #dce5f2;box-shadow:0 2px 4px #213e6410;color:#6b83a4;gap:7px;font-size:11px}
.fleet-filter-shell .fleet-filters>.fleet-button:hover:not(:disabled){background:#f6f9ff;color:#3f70b5;border-color:#b0c8ec}
.fleet-filter-shell .fleet-filter-note{font-size:9px;color:#96a7be;margin:0!important;padding:0 18px 10px}
.fleet-filter-shell .fleet-filter-note+.fleet-filter-note{padding-top:0}
@media(min-width:1500px){.fleet-filter-shell .fleet-filters{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media(max-width:850px){.fleet-filter-shell .fleet-filters{grid-template-columns:repeat(2,minmax(0,1fr));padding:13px;gap:12px}.fleet-filter-shell .fleet-filter-heading{padding:12px 13px}.fleet-filter-shell .fleet-filter-note{padding-left:13px;padding-right:13px}}
@media(max-width:560px){.fleet-filter-shell{border-radius:16px}.fleet-filter-emblem{width:32px;height:32px;border-radius:10px}.fleet-filter-shell .fleet-filter-heading{gap:8px}.fleet-filter-shell .fleet-filter-heading h3{font-size:12px}.fleet-filter-shell .fleet-filter-context{font-size:9px;padding:4px 7px}.fleet-filter-shell .fleet-field{height:39px;min-height:39px;font-size:10px;padding-left:32px;padding-right:24px}.fleet-filter-input-icon{left:10px}.fleet-filter-input-icon svg{width:15px;height:15px}.fleet-filter-chevron{right:10px}.fleet-filter-shell .fleet-filters{gap:11px 9px}.fleet-filter-shell .fleet-filters>.fleet-button{height:39px;font-size:10px}}

/* Compact status cards and wrapping responsive filters. */
.fleet-api-summary-card{min-height:119px!important;padding:11px 12px!important}
.fleet-api-summary-top{min-height:32px!important}
.fleet-api-summary-label{font-size:10px;line-height:1.45}
.fleet-api-summary-number{margin:5px 0 4px}
.fleet-api-summary-number strong{font-size:27px}
.fleet-api-summary-detail{min-height:24px;font-size:9px;line-height:1.4;padding:0}
.fleet-api-summary-icon,.fleet-api-summary-card.is-total .fleet-api-summary-icon{width:88px;height:88px;right:-12px;bottom:-14px}
.fleet-api-summary-icon svg{width:88px;height:88px}
.fleet-filter-shell .fleet-filter-heading{min-height:54px;padding:10px 15px}
.fleet-filter-emblem{width:31px;height:31px;border-radius:10px}
.fleet-filter-shell{min-width:0;max-width:100%}
.fleet-filter-shell .fleet-filters{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,160px),1fr));align-items:end;gap:12px;padding:12px 15px 10px;overflow:visible}
.fleet-filter-shell .fleet-filters>label,.fleet-filter-shell .fleet-filters>label:first-child,.fleet-filter-shell .fleet-filters>label:nth-child(6),.fleet-filter-shell .fleet-filters>label:nth-child(7),.fleet-filter-shell .fleet-filters>.fleet-button{min-width:0;width:100%;max-width:100%}
.fleet-filter-shell .fleet-filter-input{min-width:0;max-width:100%}
.fleet-filter-shell .fleet-field{width:100%;min-width:0;max-width:100%;text-overflow:ellipsis}
.fleet-filter-shell .fleet-filter-heading{flex-wrap:wrap;min-width:0}
.fleet-filter-shell .fleet-filter-context{max-width:100%;white-space:normal;overflow-wrap:anywhere}
.fleet-filter-shell .fleet-filter-note{overflow-wrap:anywhere}
.fleet-filter-shell .fleet-field{height:36px;min-height:36px;font-size:10.5px;padding-top:5px;padding-bottom:5px;border-radius:10px}
.fleet-filter-shell .fleet-filters>.fleet-button{height:36px;min-height:36px;font-size:10px;border-radius:10px}
.fleet-filter-shell .fleet-label{font-size:9px;margin-bottom:5px}
@media(max-width:560px){.fleet-api-summary-card{min-height:123px!important;padding:10px 11px!important}.fleet-api-summary-top{min-height:35px!important}.fleet-api-summary-number strong{font-size:25px}.fleet-api-summary-detail{font-size:8.5px}.fleet-filter-shell .fleet-filters{padding:10px 12px;gap:9px}.fleet-filter-shell .fleet-field{font-size:10px;height:36px;min-height:36px}.fleet-filter-shell .fleet-filters>.fleet-button{height:36px;min-height:36px}}

.sla-table th:last-child{position:sticky;right:0;z-index:3;min-width:128px;background:#edf2fa;text-align:center;box-shadow:-4px 0 7px #243b5a06}
.sla-table .sla-detail-cell{position:sticky;right:0;z-index:1;min-width:128px;background:#fff;vertical-align:middle;text-align:center;box-shadow:-4px 0 7px #243b5a06}
.sla-table tbody tr:nth-child(even) .sla-detail-cell{background:#fafcff}
.sla-table tbody tr:hover .sla-detail-cell{background:#eff5ff}
.sla-detail-button{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:7px 9px;border:1px solid #d4e3fa;border-radius:9px;background:#edf4ff;color:#3768ad;font-size:10px!important;font-weight:700;white-space:nowrap;transition:background .15s,border-color .15s}
.sla-detail-button:hover{background:#dceaff;border-color:#a6c4ee}
.sla-detail-button:focus-visible{outline:2px solid #3979d7;outline-offset:2px}
.sla-kpi:nth-child(2) .sla-kpi-value{color:#4776aa}
@media(max-width:850px){.sla-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
/* รูปแบบสรุปการส่งมอบตามภาพตัวอย่าง */
.fleet-delivery-summary{grid-template-columns:minmax(190px,240px) minmax(380px,1fr);gap:32px;margin:20px 0 24px;align-items:stretch}
.fleet-delivery-heading{font-size:15px;color:#18294a;margin:0 0 10px!important}
.fleet-delivery-summary .fleet-delivery-cards{gap:14px;border:0;background:transparent;overflow:visible}
.fleet-delivery-summary .fleet-delivery-card{display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:14px 16px;background:#fff;border:1px solid #b9d9eb;border-radius:18px;box-shadow:0 6px 12px rgba(30,53,78,.18);min-height:150px}
.fleet-delivery-summary .fleet-delivery-card+.fleet-delivery-card{border:1px solid #b9d9eb}
.fleet-delivery-summary .fleet-delivery-card:after{display:none}
.fleet-delivery-summary .fleet-delivery-label{color:#111;font-size:15px;font-weight:750;line-height:1.2}
.fleet-delivery-summary .fleet-delivery-label small{display:block;margin:2px 0 0;font-size:13px;color:#222}
.fleet-delivery-summary .fleet-delivery-number{justify-content:center;gap:18px;margin-top:10px;color:#111}
.fleet-delivery-summary .fleet-delivery-number svg{display:block;width:45px;height:45px;padding:0;background:transparent}
.fleet-delivery-summary .fleet-delivery-number strong{font-size:37px;line-height:1}
.fleet-delivery-summary .fleet-delivery-unit{display:block;margin:2px 0 0;font-size:12px;color:#222}
.fleet-delivery-summary .fleet-delivery-note{font-size:10px;color:#777;margin:5px 0 0!important}
.fleet-delivery-summary .fleet-delivery-progress-row{width:100%;margin-top:8px;gap:8px}
.fleet-delivery-summary .fleet-delivery-progress-track{height:14px;background:#dedede}
.fleet-delivery-summary .fleet-delivery-percent{font-size:15px;color:#222}
.delivery-stage-panel{padding:24px 28px;border:1px solid #b9d9eb;border-radius:18px;box-shadow:0 6px 12px rgba(30,53,78,.18);display:flex;flex-direction:column}
.delivery-stage-panel h3{color:#160c85;font-size:21px;font-weight:800;margin:0 0 16px}
.delivery-stage-panel h3 small{font-size:inherit;color:inherit}
.delivery-stage-list{flex:1;display:flex;flex-direction:column}
.delivery-stage-row{grid-template-columns:28px minmax(0,1fr) minmax(115px,45%);gap:5px;min-height:43px;flex:1;border-bottom:1px solid #dedede}
.delivery-stage-number{width:25px;height:25px;background:#e3eafa;color:#fff;font-size:13px}
.delivery-stage-name{font-size:14px;color:#171717}
.delivery-stage-value{height:100%;border-left:1px solid #dedede;padding-left:10px;gap:5px}
.delivery-stage-value strong{min-width:0;text-align:left;color:#171717;font-size:14px;font-weight:500}
.delivery-stage-bar-track{height:25px;flex:0 1 70%;width:70%;background:transparent;overflow:visible;border-radius:0}
.delivery-stage-bar-track span{border-radius:0 12px 12px 0;min-width:0}
.delivery-stage-total{background:#ececec;padding:12px 16px;margin-top:0;color:#111;font-size:15px;font-weight:700}
.delivery-stage-panel p{margin:10px 0 0!important;font-size:10px;color:#8796aa}
@media(max-width:700px){.fleet-delivery-summary{grid-template-columns:1fr;gap:18px}.fleet-delivery-summary .fleet-delivery-cards{grid-template-columns:1fr;grid-template-rows:repeat(3,auto);gap:10px}.fleet-delivery-summary .fleet-delivery-card{min-height:130px}.delivery-stage-row{min-height:42px}}
@media(max-width:560px){.fleet-delivery-summary .fleet-delivery-cards{grid-template-columns:1fr;grid-template-rows:repeat(3,auto)}.fleet-delivery-summary .fleet-delivery-card{min-height:130px}.delivery-stage-panel{padding:17px 14px}.delivery-stage-panel h3{font-size:17px}.delivery-stage-row{grid-template-columns:25px minmax(0,1fr) minmax(90px,38%)}.delivery-stage-name{font-size:12px}}

/* สรุปสถานะในกรอบเดียว */
.fleet-dashboard .fleet-delivery-summary{display:grid;grid-template-columns:190px minmax(0,1fr);gap:16px;align-items:stretch;margin:16px 0;padding:16px;background:#fff;border:1px solid #dce4ef;border-radius:14px}
.fleet-dashboard .fleet-delivery-summary>div:first-child{display:flex;flex-direction:column;min-width:0}
.fleet-dashboard .fleet-delivery-heading{margin:0 0 8px!important;color:#334f76;font-size:12px;font-weight:700}
.fleet-dashboard .fleet-delivery-cards{display:grid;grid-template-columns:1fr;grid-template-rows:repeat(3,1fr);flex:1;gap:6px;background:transparent;border:0;border-radius:0;overflow:visible}
.fleet-dashboard .fleet-delivery-card{position:relative;display:flex;flex-direction:column;align-items:stretch;justify-content:center;min-height:0;padding:9px 11px;text-align:left;background:#f8fafc;border:1px solid #e2e8f0;border-radius:9px;box-shadow:none}
.fleet-dashboard .fleet-delivery-card+.fleet-delivery-card{border:1px solid #e2e8f0}.fleet-dashboard .fleet-delivery-card:after{display:none}
.fleet-dashboard .fleet-delivery-label{color:#526780;font-size:11px;font-weight:700;line-height:1.3}.fleet-dashboard .fleet-delivery-label small{display:inline;margin-left:4px;color:#8a9aab;font-size:10px;font-weight:500}
.fleet-dashboard .fleet-delivery-number{display:flex;align-items:center;justify-content:flex-start;gap:8px;margin-top:4px;color:#334f76}.fleet-dashboard .fleet-delivery-number svg{display:block;width:25px;height:25px;padding:0;background:transparent}.fleet-dashboard .fleet-delivery-number strong{font-size:23px;line-height:1.1;font-weight:800}.fleet-dashboard .fleet-delivery-unit{display:inline;margin-left:5px;color:#74859a;font-size:10px}
.fleet-dashboard .fleet-delivery-note{margin:4px 0 0!important;color:#94a3b8;font-size:9px;line-height:1.3}.fleet-dashboard .fleet-delivery-progress-row{display:flex;align-items:center;gap:6px;width:100%;margin-top:5px}.fleet-dashboard .fleet-delivery-progress-track{flex:1;height:5px;overflow:hidden;background:#e5eaf0;border-radius:99px}.fleet-dashboard .fleet-delivery-progress-track>span{display:block;height:100%;border-radius:inherit}.fleet-dashboard .fleet-delivery-percent{min-width:28px;color:#71839a;font-size:10px;text-align:right}
.fleet-dashboard .delivery-stage-panel{display:flex;flex-direction:column;min-width:0;padding:0 0 0 16px;background:transparent;border:0;border-left:1px solid #e7edf5;border-radius:0;box-shadow:none}.fleet-dashboard .delivery-stage-panel h3{margin:0 0 8px!important;color:#334f76;font-size:13px;font-weight:700}.fleet-dashboard .delivery-stage-panel h3 small{color:#8a9aab;font-size:10px;font-weight:500}
.fleet-dashboard .delivery-stage-list{display:flex;flex:1;flex-direction:column}.fleet-dashboard .delivery-stage-row{display:grid;grid-template-columns:22px minmax(0,1fr) minmax(90px,34%);align-items:center;gap:7px;flex:1;min-height:27px;border-bottom:1px solid #edf1f5}.fleet-dashboard .delivery-stage-number{display:grid;place-items:center;width:20px;height:20px;color:#55759e;background:#e9f0fa;border-radius:50%;font-size:10px;font-weight:700}.fleet-dashboard .delivery-stage-name{min-width:0;color:#44556b;font-size:11px;line-height:1.3}
.fleet-dashboard .delivery-stage-value{display:flex;align-items:center;gap:7px;min-width:0;height:auto;padding:0;border:0}.fleet-dashboard .delivery-stage-bar-track{flex:1;width:auto;height:8px;overflow:hidden;background:#f1f5f9;border-radius:99px}.fleet-dashboard .delivery-stage-bar-track span{display:block;height:100%;border-radius:inherit}.fleet-dashboard .delivery-stage-value strong{min-width:30px;color:#34455b;font-size:11px;font-weight:700;text-align:right}.fleet-dashboard .delivery-stage-total{display:flex;justify-content:space-between;margin-top:6px;padding:7px 9px;color:#334155;background:#f1f5f9;border-radius:6px;font-size:11px;font-weight:700}.fleet-dashboard .delivery-stage-panel p{margin:5px 0 0!important;color:#94a3b8;font-size:9px}
@media(max-width:650px){.fleet-dashboard .fleet-delivery-summary{grid-template-columns:1fr;gap:12px;padding:12px}.fleet-dashboard .fleet-delivery-cards{grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:auto;gap:6px}.fleet-dashboard .fleet-delivery-card{padding:8px}.fleet-dashboard .fleet-delivery-number svg{display:none}.fleet-dashboard .fleet-delivery-number strong{font-size:19px}.fleet-dashboard .fleet-delivery-label small{display:block;margin:0}.fleet-dashboard .delivery-stage-panel{padding:12px 0 0;border-top:1px solid #e7edf5;border-left:0}.fleet-dashboard .delivery-stage-row{grid-template-columns:20px minmax(0,1fr) minmax(70px,32%);gap:5px}}

/* ขยายสรุปการส่งมอบขึ้นหนึ่งระดับ */
.fleet-dashboard .fleet-delivery-summary{grid-template-columns:220px minmax(0,1fr);gap:18px;padding:18px}
.fleet-dashboard .fleet-delivery-heading{font-size:14px}
.fleet-dashboard .fleet-delivery-cards{gap:8px}
.fleet-dashboard .fleet-delivery-card{padding:11px 13px}
.fleet-dashboard .fleet-delivery-label{font-size:13px}
.fleet-dashboard .fleet-delivery-label small{font-size:11px}
.fleet-dashboard .fleet-delivery-number{gap:10px;margin-top:6px}
.fleet-dashboard .fleet-delivery-number svg{width:30px;height:30px}
.fleet-dashboard .fleet-delivery-number strong{font-size:28px}
.fleet-dashboard .fleet-delivery-unit{font-size:12px}
.fleet-dashboard .fleet-delivery-note{font-size:10px}
.fleet-dashboard .fleet-delivery-progress-track{height:7px}
.fleet-dashboard .fleet-delivery-percent{font-size:11px}
.fleet-dashboard .delivery-stage-panel{padding-left:18px}
.fleet-dashboard .delivery-stage-panel h3{font-size:15px}
.fleet-dashboard .delivery-stage-panel h3 small{font-size:12px}
.fleet-dashboard .delivery-stage-row{grid-template-columns:25px minmax(0,1fr) minmax(100px,34%);gap:8px;min-height:32px}
.fleet-dashboard .delivery-stage-number{width:23px;height:23px;font-size:11px}
.fleet-dashboard .delivery-stage-name{font-size:13px}
.fleet-dashboard .delivery-stage-bar-track{height:10px}
.fleet-dashboard .delivery-stage-value strong{font-size:13px;min-width:34px}
.fleet-dashboard .delivery-stage-total{padding:8px 10px;font-size:13px}
.fleet-dashboard .delivery-stage-panel p{font-size:10px}
@media(max-width:650px){.fleet-dashboard .fleet-delivery-summary{grid-template-columns:1fr;gap:12px;padding:14px}.fleet-dashboard .fleet-delivery-cards{grid-template-columns:repeat(3,minmax(0,1fr));grid-template-rows:auto}.fleet-dashboard .fleet-delivery-card{padding:9px}.fleet-dashboard .fleet-delivery-number svg{display:none}.fleet-dashboard .fleet-delivery-number strong{font-size:22px}.fleet-dashboard .delivery-stage-panel{padding:12px 0 0}.fleet-dashboard .delivery-stage-row{grid-template-columns:23px minmax(0,1fr) minmax(70px,32%);gap:5px}.fleet-dashboard .delivery-stage-name{font-size:12px}}

/* ขยายส่วนสถานะออกรถและกราฟแผน */
.fleet-dashboard .fleet-delivery-summary{grid-template-columns:260px minmax(0,1fr);gap:22px;padding:22px}
.fleet-dashboard .fleet-delivery-heading{font-size:17px}
.fleet-dashboard .fleet-delivery-card{padding:14px 16px}
.fleet-dashboard .fleet-delivery-label{font-size:15px}
.fleet-dashboard .fleet-delivery-label small{font-size:13px}
.fleet-dashboard .fleet-delivery-number svg{width:36px;height:36px}
.fleet-dashboard .fleet-delivery-number strong{font-size:34px}
.fleet-dashboard .fleet-delivery-unit{font-size:13px}
.fleet-dashboard .fleet-delivery-note{font-size:12px}
.fleet-dashboard .fleet-delivery-percent{font-size:13px}
.fleet-dashboard .delivery-stage-panel h3{font-size:18px}
.fleet-dashboard .delivery-stage-panel h3 small{font-size:14px}
.fleet-dashboard .delivery-stage-row{grid-template-columns:29px minmax(0,1fr) minmax(110px,34%);min-height:38px}
.fleet-dashboard .delivery-stage-number{width:26px;height:26px;font-size:13px}
.fleet-dashboard .delivery-stage-name,.fleet-dashboard .delivery-stage-value strong,.fleet-dashboard .delivery-stage-total{font-size:15px}
.fleet-dashboard .delivery-stage-panel p{font-size:12px}
.fleet-dashboard .fleet-timeline .fleet-panel-header{padding:16px 18px}
.fleet-dashboard .fleet-timeline .fleet-panel-header h3{font-size:17px}
.fleet-dashboard .fleet-timeline .fleet-panel-description{font-size:13px}
.fleet-dashboard .fleet-timeline .fleet-panel-content{padding:16px 18px}
.fleet-dashboard .fleet-timeline .fleet-chart{height:320px}
.fleet-dashboard .fleet-timeline .fleet-legend{font-size:13px;gap:16px}
@media(max-width:650px){.fleet-dashboard .fleet-delivery-summary{grid-template-columns:1fr;gap:14px;padding:15px}.fleet-dashboard .fleet-delivery-card{padding:10px}.fleet-dashboard .fleet-delivery-number strong{font-size:25px}.fleet-dashboard .delivery-stage-panel{padding:12px 0 0}.fleet-dashboard .delivery-stage-row{grid-template-columns:25px minmax(0,1fr) minmax(70px,32%)}.fleet-dashboard .delivery-stage-name{font-size:13px}.fleet-dashboard .fleet-timeline .fleet-chart{height:280px}}

/* เพิ่มพื้นที่ฝั่งสรุปและขยับตารางไปทางขวา */
@media (min-width: 651px) {
  .fleet-dashboard .fleet-delivery-summary {
    grid-template-columns: minmax(300px, 34%) minmax(0, 1fr);
    gap: 26px;
  }
  .fleet-dashboard .delivery-stage-panel { padding-left: 24px; }
}

/* Scale the original dashboard to 125% at normal browser zoom. */
.fleet-dashboard{zoom:1.25}
.fleet-dashboard .fleet-stage-layout{grid-template-columns:minmax(540px,2fr) minmax(330px,1fr);overflow-x:auto;align-items:start}
.fleet-dashboard .fleet-stage-layout>.fleet-panel>.fleet-panel-header{height:auto;min-height:78px;max-height:none;flex-wrap:wrap}
.fleet-dashboard .fleet-stage-layout .fleet-panel-description{max-height:none;overflow:visible}
      `}
</style>
      <header className="fleet-heading">
        <div className="fleet-brand"><span className="fleet-brand-icon" aria-hidden="true"><SlaInlineIcon type="truck" size={24} /></span><div>
          <div className="fleet-eyebrow">FLEET OVERVIEW</div>
          <h2>{displayTitle}</h2>
          <p className="fleet-subtitle">
            ภาพรวมคำขอและการส่งมอบกองรถ แยกตามคลัง
          </p>
        </div></div>
        {(suppliedRequests === undefined || needsDashboard) && (
          <button
            type="button"
            className="fleet-button fleet-button-primary"
            disabled={isLoading || timelineLoading}
            onClick={() => setReloadKey(key => key + 1)}
          >
            {isLoading || timelineLoading ? "กำลังโหลด..." : "รีเฟรชข้อมูล"}
          </button>
        )}
      </header>
      <section className="fleet-filter-shell" aria-label="ตัวกรองข้อมูล"><div className="fleet-filter-heading"><span className="fleet-filter-emblem" aria-hidden="true"><FleetFilterGlyph kind="sliders" /></span><h3>ตัวกรองข้อมูล</h3><span className="fleet-filter-context">{selectedYear + 543} · {monthFilter === "all" ? "ทุกเดือน" : MONTH_NAMES[Number(monthFilter) - 1]}</span></div>
        <div className="fleet-filters">
          <label><span className="fleet-label">ปี</span><span className="fleet-filter-input"><span className="fleet-filter-input-icon" aria-hidden="true"><FleetFilterGlyph kind="calendar" /></span><FleetSearchFilter label="ปี" value={String(selectedYear)} onChange={value => { setSelectedYear(Number(value)); setHoveredMonth(null); }} options={yearOptions.map(year => ({ value: String(year), label: String(year) }))} /><span className="fleet-filter-chevron" aria-hidden="true">▾</span></span></label>
          <label><span className="fleet-label">เดือน</span><span className="fleet-filter-input"><span className="fleet-filter-input-icon" aria-hidden="true"><FleetFilterGlyph kind="calendar" /></span><FleetSearchFilter label="เดือน" value={monthFilter} onChange={setMonthFilter} options={[{ value: "all", label: "ทุกเดือน" }, ...MONTH_NAMES.map((month, index) => ({ value: String(index + 1).padStart(2, "0"), label: month }))]} /><span className="fleet-filter-chevron" aria-hidden="true">▾</span></span></label>
          <label><span className="fleet-label">กลุ่ม DC</span><span className="fleet-filter-input"><span className="fleet-filter-input-icon" aria-hidden="true"><FleetFilterGlyph kind="filter" /></span><FleetSearchFilter label="กลุ่ม DC" value={dcTypeFilter} onChange={value => { setDcTypeFilter(value); setAreaFilter("all"); }} options={[{ value: "all", label: "ทุกกลุ่ม DC" }, ...dcTypeOptions.map(type => ({ value: type, label: type }))]} /><span className="fleet-filter-chevron" aria-hidden="true">▾</span></span></label>
          <label><span className="fleet-label">พื้นที่</span><span className="fleet-filter-input"><span className="fleet-filter-input-icon" aria-hidden="true"><FleetFilterGlyph kind="warehouse" /></span><FleetSearchFilter label="พื้นที่" value={areaFilter} onChange={setAreaFilter} options={[{ value: "all", label: "ทุกพื้นที่" }, ...filterOptions.areas.map(area => ({ value: area, label: area }))]} disabled={filterOptions.areas.length === 0} /><span className="fleet-filter-chevron" aria-hidden="true">▾</span></span></label>
          <label><span className="fleet-label">FBP</span><span className="fleet-filter-input"><span className="fleet-filter-input-icon" aria-hidden="true"><FleetFilterGlyph kind="user" /></span><FleetSearchFilter label="FBP" value={fbpFilter} onChange={setFbpFilter} options={[{ value: "all", label: "ทุก FBP" }, ...filterOptions.fbps.map(fbp => ({ value: fbp.id, label: fbp.name }))]} disabled={filterOptions.fbps.length === 0} /><span className="fleet-filter-chevron" aria-hidden="true">▾</span></span></label>
          <label><span className="fleet-label">ประเภทคำขอ</span><span className="fleet-filter-input"><span className="fleet-filter-input-icon" aria-hidden="true"><FleetFilterGlyph kind="filter" /></span><FleetSearchFilter label="ประเภทคำขอ" value={requestTypeFilter} onChange={setRequestTypeFilter} options={[{ value: "all", label: "ทุกประเภทคำขอ" }, ...Array.from(new Set([...(requestTypeFilter === "all" ? [] : [requestTypeFilter]), ...requestTypeOptions])).map(type => ({ value: type, label: type }))]} /><span className="fleet-filter-chevron" aria-hidden="true">▾</span></span></label>
          <label><span className="fleet-label">ประเภทรถ</span><span className="fleet-filter-input"><span className="fleet-filter-input-icon" aria-hidden="true"><FleetFilterGlyph kind="truck" /></span><FleetSearchFilter label="ประเภทรถ" value={truckTypeFilter} onChange={setTruckTypeFilter} options={[{ value: "all", label: "ทุกประเภทรถ" }, ...filterOptions.trucks.map(type => ({ value: type, label: type }))]} /><span className="fleet-filter-chevron" aria-hidden="true">▾</span></span></label>
          <button className="fleet-button" type="button" disabled={!hasFilters} onClick={resetFilters}><FleetFilterGlyph kind="clear" />ล้างตัวกรอง</button>
        </div>
        <p className="fleet-filter-note">ปีและเดือนกรองตามวันที่สร้างคำขอ (request_date) · กราฟแสดง ม.ค.–ธ.ค. ของปีที่เลือก</p>
        {hasFilters && (
          <p className="fleet-filter-note">
            แสดงผลตามตัวกรองที่เลือก · {dcSummary.length} คลัง
          </p>
        )}
      </section>
      {activeError && (
        <div className="fleet-error" role="alert">
          <strong>โหลดข้อมูลไม่สำเร็จ</strong>
          <p>{activeError}</p>
        </div>
      )}
      <section className="fleet-api-summary" aria-label="สรุปสถานะคำขอตามตัวกรอง" aria-busy={isLoading || cardSummaryLoading}>
        <div className="fleet-api-summary-header">
          <div className="fleet-summary-heading-line"><span className="fleet-section-mark" aria-hidden="true">02</span><div><h3 className="fleet-api-summary-heading">สรุปสถานะคำขอ</h3><p className="fleet-api-summary-subtitle">ภาพรวมการจัดรถในแต่ละขั้นตอน</p></div></div>
          <span className="fleet-api-summary-badge">6 กลุ่มสถานะ</span>
        </div>
        <div className="fleet-api-summary-grid">
          {DASHBOARD_SUMMARY_CARDS.map(card => (
            <button type="button" aria-pressed={statusFilter === card.key} onClick={() => setStatusFilter(current => current === card.key ? "all" : card.key)} className={`fleet-api-summary-card${card.key === "all" ? " is-total" : ""}${statusFilter === card.key ? " is-selected" : ""}`} key={card.key}
              style={{ color: card.key === "all" ? "#fff" : card.color, background: card.key === "all" ? "#1d3358" : "#fff" }}>
              <div className="fleet-api-summary-top">
                <div className="fleet-api-summary-label">{card.label}</div>
                <span className="fleet-api-summary-icon"><DashboardStatusIcon status={card.key} /></span>
              </div>
              <div className="fleet-api-summary-number">
                <strong>{isLoading || activeError || cardSummaryLoading || cardSummaryError ? "—" : filteredCardSummary[card.key].qty.toLocaleString("th-TH")}</strong>
                <span>คัน</span>
              </div>
              <span className="fleet-api-summary-detail">{card.detail}</span>
            </button>
          ))}
        </div>
        <p className="fleet-api-summary-note" role="status">
          {isLoading || cardSummaryLoading ? "กำลังโหลดสรุปสถานะ…" : cardSummaryError ? `โหลดสรุปสถานะไม่สำเร็จ: ${cardSummaryError}` : activeError ? `โหลดสรุปสถานะไม่สำเร็จ: ${activeError}` : "ยอดทุกการ์ดตามตัวกรองด้านบน · คลิกการ์ดเพื่อกรองรายละเอียด หรือคลิกซ้ำเพื่อแสดงทุกสถานะ"}
        </p>
      </section>
      <SlaOverduePanel requests={filteredRequests} parentLoading={isLoading} parentError={activeError} reloadKey={reloadKey} />
      <div className="fleet-delivery-summary">
        <div>
          <h3 className="fleet-delivery-heading">
            สถานะออกรถใหม่/ออกรถทดแทน
          </h3>
          <div className="fleet-delivery-cards">
            <article className="fleet-delivery-card">
              <div className="fleet-delivery-label">
                เป้าหมายทั้งหมด
                <small>(Plan)</small>
              </div>
              <div className="fleet-delivery-number">
                <SummaryIcon type="plan" />
                <div>
                  <strong>{metricValue(totals.total)}</strong>
                  <div className="fleet-delivery-unit">คัน</div>
                </div>
              </div>
              <p className="fleet-delivery-note">
                ส่งมอบแล้ว + TCAS ขั้นตอน 1–7
              </p>
            </article>
            <article className="fleet-delivery-card">
              <div className="fleet-delivery-label">
                ส่งมอบแล้ว
                <small>(Actual)</small>
              </div>
              <div
                className="fleet-delivery-number"
                style={{ color: "#059669" }}
              >
                <SummaryIcon type="actual" />
                <div>
                  <strong>{metricValue(totals.delivered)}</strong>
                  <div className="fleet-delivery-unit">คัน</div>
                </div>
              </div>
              <div className="fleet-delivery-progress-row">
                <div className="fleet-delivery-progress-track">
                  <span
                    style={{
                      width:
                        isLoading || activeError ? "0%" : `${completion}%`,
                      background: "#43a51c",
                    }}
                  />
                </div>
                <span className="fleet-delivery-percent">
                  {isLoading || activeError
                    ? "—"
                    : `${completion.toFixed(0)}%`}
                </span>
              </div>
            </article>
            <article className="fleet-delivery-card" tabIndex={0}
              title={isLoading ? "กำลังโหลดข้อมูล..." : activeError ? "ไม่สามารถโหลดข้อมูลได้" : pendingStageTooltip}
              aria-label={isLoading || activeError ? "อยู่ระหว่างดำเนินการ" : pendingStageTooltip}
              style={{ cursor: "help" }}>
              <div className="fleet-delivery-label">
                อยู่ระหว่างดำเนินการ
                <small>(Pending)</small>
              </div>
              <div
                className="fleet-delivery-number"
                style={{ color: "#ea580c" }}
              >
                <SummaryIcon type="pending" />
                <div>
                  <strong>{metricValue(totals.remaining)}</strong>
                  <div className="fleet-delivery-unit">คัน</div>
                </div>
              </div>
              <div className="fleet-delivery-progress-row">
                <div className="fleet-delivery-progress-track">
                  <span
                    style={{
                      width:
                        isLoading || activeError
                          ? "0%"
                          : `${pendingPercentage}%`,
                      background: "#f56623",
                    }}
                  />
                </div>
                <span className="fleet-delivery-percent">
                  {isLoading || activeError
                    ? "—"
                    : `${pendingPercentage.toFixed(0)}%`}
                </span>
              </div>
            </article>
          </div>
        </div>
        <section className="delivery-stage-panel" aria-label="จำนวนรถในแต่ละขั้นตอน">
          <h3>จำนวนรถในแต่ละสถานะ <small>(คัน)</small></h3>
          <div className="delivery-stage-list">
            {deliveryStages.map(stage => (
              <div className="delivery-stage-row" key={stage.level}>
                <span className="delivery-stage-number">{stage.level}</span>
                <span className="delivery-stage-name">{stage.name}</span>
                <div className="delivery-stage-value">
                  <div className="delivery-stage-bar-track" aria-hidden="true">
                    <span style={{ width: `${percentage(stage.qty, totals.total)}%`, background: stage.level === 8 ? "#43a51c" : "#f56623" }} />
                  </div>
                  <strong>{metricValue(stage.qty)}</strong>
                </div>
              </div>
            ))}
          </div>
          <div className="delivery-stage-total"><span>รวม</span><strong>{metricValue(totals.total)} คัน</strong></div>
          <p>ขั้นตอน 1–7 เฉพาะ TCAS · ขั้นตอน 8 แสดงยอดส่งมอบแล้ว</p>
        </section>
      </div>
      <div className="fleet-panels">
        <article className="fleet-panel fleet-timeline">
          <div className="fleet-panel-header">
            <div>
              <h3>แผนและการส่งมอบ</h3>
              <p className="fleet-panel-description">
                เปรียบเทียบยอดสะสมรายเดือน · วางเมาส์เพื่อดูข้อมูลและจำนวนรถในแต่ละสถานะ
                {activeYear !== null ? ` · ${activeYear}` : ""}
              </p>
            </div>

          </div>
          <div className="fleet-panel-content">
            {timelineLoading || timelineError ? (
              <div
                className="fleet-empty"
                role={timelineError ? "alert" : "status"}
              >
                <span>
                  {timelineLoading
                    ? "กำลังโหลดข้อมูล Timeline..."
                    : timelineError}
                </span>
              </div>
            ) : timeline.length === 0 ? (
              <div className="fleet-empty">
                <span>
                  ยังไม่มีข้อมูล warehouse_plan_date หรือ str_date
                  ของขั้นตอน 8
                </span>
              </div>
            ) : (
              <div className="fleet-chart-scroll">
                <svg
                  className="fleet-chart"
                  viewBox="0 0 800 350"
                  role="img"
                  aria-label={`กราฟแผนและยอดส่งมอบสะสม มกราคม ถึง ธันวาคม ปี ${activeYear}`}
                  onMouseLeave={() => setHoveredMonth(null)}
                >
                  {[0, 1, 2, 3, 4].map(tick => (
                    <g key={tick}>
                      <line
                        x1="48"
                        x2="752"
                        y1={220 - (tick / 4) * 184}
                        y2={220 - (tick / 4) * 184}
                        stroke="#e8eef6"
                        strokeDasharray="3 4"
                      />
                      <text
                        x="38"
                        y={224 - (tick / 4) * 184}
                        textAnchor="end"
                        fill="#7c8ca2"
                        fontSize="11"
                      >
                        {formatNumber(tick * yStep)}
                      </text>
                    </g>
                  ))}
                  <path
                    d={plannedPath}
                    stroke="#94a3b8"
                    strokeWidth="2"
                    strokeDasharray="5 4"
                    fill="none"
                  />
                  <path
                    d={actualPath}
                    stroke="#2563eb"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  {timeline.map((point, index) => {
                    const tooltip = [
                      `${point.label} ${activeYear}`,
                      `แผนสะสม: ${formatNumber(point.planned)} คัน`,
                      `ส่งมอบจริงสะสม: ${point.actual === null
                        ? "ไม่มีข้อมูล"
                        : `${formatNumber(point.actual)} คัน`
                      }`,
                      ...(point.actual !== null
                        ? [
                          `ส่วนต่างจริง − แผน: ${formatNumber(
                            point.actual - point.planned,
                          )} คัน`,
                        ]
                        : []),
                    ].join("\n");
                    return (
                      <g key={point.label}>
                        <circle
                          cx={chartX(index)}
                          cy={chartY(point.planned)}
                          r="3"
                          fill="#94a3b8"
                        />
                        {point.actual !== null && (
                          <circle
                            cx={chartX(index)}
                            cy={chartY(point.actual)}
                            r="4"
                            fill="#2563eb"
                            stroke="white"
                            strokeWidth="1"
                          />
                        )}
                        <text
                          x={chartX(index)}
                          y="247"
                          textAnchor="middle"
                          fill="#62738a"
                          fontSize="12"
                        >
                          {MONTH_SHORT_NAMES[index] ?? point.label}
                        </text>
                        {/* พื้นที่รับเมาส์ครอบคลุมทั้งแนวของเดือน */}
                        <rect
                          x={chartX(index) - 28}
                          y="30"
                          width="56"
                          height="194"
                          fill="transparent"
                          pointerEvents="all"
                          style={{ cursor: "pointer", outline: "none" }}
                          tabIndex={0}
                          role="button"
                          aria-label={tooltip}
                          onMouseEnter={() => setHoveredMonth(index)}
                          onFocus={() => setHoveredMonth(index)}
                          onBlur={() => setHoveredMonth(null)}
                          onClick={() => setHoveredMonth(index)}
                          onKeyDown={event => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setHoveredMonth(index);
                            }
                            if (event.key === "Escape") setHoveredMonth(null);
                          }}
                        >
                        </rect>
                      </g>
                    );
                  })}
                  {hoveredMonth !== null && timeline[hoveredMonth] && (() => {
                    const item = timeline[hoveredMonth];
                    const x = Math.min(480, Math.max(50, chartX(hoveredMonth) - 140));
                    const gap = item.actual === null ? null : item.actual - item.planned;
                    const gapLabel = gap === null ? "ส่วนต่าง: ไม่มีข้อมูล"
                      : gap < 0 ? `ต่ำกว่าแผน: ${formatNumber(-gap)} คัน`
                        : gap > 0 ? `สูงกว่าแผน: ${formatNumber(gap)} คัน`
                          : "ส่งมอบเท่ากับแผน";
                    return (
                      <g pointerEvents="none">
                        <line x1={chartX(hoveredMonth)} x2={chartX(hoveredMonth)} y1="30" y2="220" stroke="#93c5fd" strokeDasharray="4 4" />
                        <rect x={x} y="20" width="310" height="315" rx="12" fill="white" stroke="#cbd5e1" />
                        <text x={x + 16} y="45" fill="#16243a" fontSize="14" fontWeight="700">{item.label} {activeYear}</text>
                        <text x={x + 16} y="68" fill="#64748b" fontSize="13">แผนสะสม: {formatNumber(item.planned)} คัน</text>
                        <text x={x + 16} y="91" fill="#2563eb" fontSize="13">ส่งมอบจริงสะสม: {item.actual === null ? "ไม่มีข้อมูล" : `${formatNumber(item.actual)} คัน`}</text>
                        <text x={x + 16} y="114" fill={gap !== null && gap < 0 ? "#ea580c" : "#059669"} fontSize="13">{gapLabel}</text>
                        <line x1={x + 16} x2={x + 294} y1="125" y2="125" stroke="#e4eaf2" />
                        <text x={x + 16} y="145" fill="#16243a" fontSize="13" fontWeight="700">จำนวนรถในแต่ละสถานะ</text>
                        <text x={x + 16} y="163" fill="#62738a" fontSize="10">สถานะปัจจุบันตามกลุ่มการ์ด</text>
                        {summary.map((row, index) => <g key={row.key}>
                          <circle cx={x + 20} cy={181 + index * 18} r="3" fill={row.color} />
                          <text x={x + 30} y={185 + index * 18} fill="#41536d" fontSize="11">{row.label}</text>
                          <text x={x + 294} y={185 + index * 18} textAnchor="end" fill={row.color} fontSize="11" fontWeight="700">{formatNumber(row.qty)} คัน</text>
                        </g>)}
                        <text x={x + 16} y="324" fill="#16243a" fontSize="12" fontWeight="700">รวมทั้งหมด</text>
                        <text x={x + 294} y="324" textAnchor="end" fill="#16243a" fontSize="12" fontWeight="700">{formatNumber(statusTotal)} คัน</text>
                      </g>
                    );
                  })()}
                </svg>
              </div>
            )}
            <div className="fleet-legend">
              <span>
                <i style={{ background: "#94a3b8" }} />
                Planned Delivery Timeline
              </span>
              <span>
                <i style={{ background: "#2563eb" }} />
                Actual Delivery Curve
              </span>
            </div>
          </div>
        </article>
        <article className="fleet-panel">
          <div className="fleet-panel-header">
            <div>
              <h3>สถานะการส่งมอบรายคลัง</h3>
              <p className="fleet-panel-description">
                สัดส่วนรถที่เสร็จสิ้นต่อจำนวนรถทั้งหมด
              </p>
            </div>
            <span>{dcSummary.length} คลัง</span>
          </div>
          <div className="fleet-panel-content">
            {isLoading || activeError || dcSummary.length === 0 ? (
              <div
                className="fleet-empty"
                role={isLoading ? "status" : undefined}
              >
                <span>
                  {isLoading
                    ? "กำลังโหลดข้อมูล..."
                    : activeError
                      ? "ไม่สามารถแสดงข้อมูลได้"
                      : "ไม่พบข้อมูลตามตัวกรอง"}
                </span>
                {hasFilters && !isLoading && !activeError && (
                  <button
                    type="button"
                    className="fleet-button"
                    onClick={resetFilters}
                  >
                    แสดงทุกคลัง
                  </button>
                )}
              </div>
            ) : (
              <div className="fleet-warehouse-list">
                {dcSummary.map(row => (
                  <div className="fleet-warehouse" key={row.dcCode}>
                    <div className="fleet-row">
                      <span className="fleet-warehouse-name">
                        {row.dcCode}
                      </span>
                      <span className="fleet-row-meta">
                        {formatNumber(row.total)} คัน · สำเร็จ{" "}
                        {percentage(row.green, row.total).toFixed(0)}%
                      </span>
                    </div>
                    <div
                      className="fleet-bar"
                      role="img"
                      aria-label={`${row.dcCode}: ส่งมอบแล้ว ${row.green} คัน ยังไม่เสร็จสิ้น ${row.red} คัน`}
                    >
                      <span
                        style={{
                          width: `${percentage(row.green, row.total)}%`,
                          background: "#10b981",
                        }}
                      />
                      <span
                        style={{
                          width: `${percentage(row.red, row.total)}%`,
                          background: "#fb7185",
                        }}
                      />
                    </div>
                    <div className="fleet-warehouse-detail">
                      <span>
                        ส่งมอบแล้ว {formatNumber(row.green)} คัน
                      </span>
                      <span>
                        ยังไม่เสร็จสิ้น {formatNumber(row.red)} คัน
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="fleet-legend">
              <span>
                <i style={{ background: "#10b981" }} />
                ส่งมอบแล้ว
              </span>
              <span>
                <i style={{ background: "#fb7185" }} />
                ยังไม่เสร็จสิ้น
              </span>
            </div>
          </div>
        </article>
      </div>
      <section className="fleet-report-block" aria-labelledby="fleet-report-title">
        <header className="fleet-report-toolbar">
          <div className="fleet-report-heading">
            <span className="fleet-report-icon" aria-hidden="true">
              <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M9 10v10M15 10v10" /></svg>
            </span>
            <div><h3 id="fleet-report-title">สรุปขั้นตอนและแผนเข้าคลัง</h3>
              <p>ส่งออกทั้งสองตารางในไฟล์เดียว · ขั้นตอนด้านซ้าย และแผนรายเดือนด้านขวา</p></div>
          </div>
          <button type="button" className="fleet-export-excel"
            disabled={exportingFleetExcel || isLoading || Boolean(activeError) || !stageGroups.length}
            aria-busy={exportingFleetExcel}
            onClick={() => void exportFleetExcel()}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M4 16v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" /></svg>
            <span>{exportingFleetExcel ? "กำลังสร้าง Excel..." : "ส่งออก Excel"}<small>รวม 2 ตาราง · .xlsx</small></span>
          </button>
        </header>
        {fleetExcelError && <div role="alert" className="fleet-report-error">ส่งออก Excel ไม่สำเร็จ: {fleetExcelError}</div>}
      <div className="fleet-stage-layout">
        <article className="fleet-panel fleet-stage-panel">
          <div className="fleet-panel-header"><div><h3>ประเภทรถแยกตามขั้นตอน</h3><p className="fleet-panel-description">{dcTypeFilter === "all" ? "ทุกประเภทคลัง" : dcTypeFilter} · จัดกลุ่มตามคลังและประเภทรถ · นับขั้นตอนปัจจุบันของแต่ละคัน · ยอดรวมแยก STEP 1–8 และ 1–10</p></div><button type="button" className="fleet-step-toggle" aria-expanded={showClosedSteps} onClick={() => { setShowClosedSteps(open => !open); setVendorTooltip(null); }}>{showClosedSteps ? "▾ ซ่อน STEP 9–10" : "▸ แสดง STEP 9–10"}</button></div>
          {isLoading || activeError || stageGroups.length === 0 ? <div className="fleet-empty">{isLoading ? "กำลังโหลดข้อมูล..." : activeError ? "ไม่สามารถแสดงข้อมูลได้" : "ไม่พบข้อมูลตามตัวกรอง"}</div> : <div className="fleet-stage-scroll" ref={stageScrollRef} onScroll={() => syncReportScroll("stage")}>
            <table className="fleet-stage-table fleet-locked-table">
              <thead><tr><th scope="col" className="fleet-lock-dc">กลุ่ม DC</th><th scope="col" className="fleet-lock-truck">คลัง / ประเภทรถ</th>{orderedStageColumns.map(column => typeof column === "string" ? <th key={column} scope="col" className="fleet-total-heading">{column === "total8" ? "รวม STEP 1–8" : "รวม STEP 1–10"}<span className="fleet-header-unit">จำนวนคัน</span></th> : <th key={column.key} scope="col" data-stage={column.level}><span className="fleet-step-name">{column.level ? `[${column.level}] ` : ""}{column.name}</span></th>)}</tr></thead>
              <tbody>{stageGroups.map(([key, group], groupIndex) => <Fragment key={key}>
                <tr className="fleet-dc-group">
                  {(groupIndex === 0 || stageGroups[groupIndex - 1][1].dcType !== group.dcType) && <th className="fleet-dc-merged fleet-lock-dc" scope="rowgroup" rowSpan={stageGroups.filter(([, item]) => item.dcType === group.dcType).reduce((sum, [, item]) => sum + 1 + item.trucks.size, 0)}><span className="fleet-dc-pill">{group.dcType}</span></th>}
                  <th scope="row" className="fleet-lock-truck fleet-lock-warehouse"><span className="fleet-warehouse-marker" aria-hidden="true" />{group.dcCode}</th><td colSpan={visibleStageColumns.length + 2} />
                </tr>
                {Array.from(group.trucks.values()).sort((a, b) => a.truckType.localeCompare(b.truckType)).map(truck => <tr key={truck.truckType} className="fleet-truck-row">
                  <th scope="row" className="fleet-lock-truck"><span className="fleet-truck-label">{truck.truckType}</span></th>
                  {orderedStageColumns.map(column => {
                    if (typeof column === "string") return <td key={column} className="fleet-stage-total">{formatNumber(totalForSteps(truck.stages, column === "total8" ? 8 : 10))}</td>;
                    const cell = truck.stages.get(column.key);
                    return <td key={column.key} data-stage={column.level} className={column.level === "8" ? "fleet-stage-completed" : undefined}>
                      {cell ? <button
                        type="button"
                        className="fleet-count-button"
                        aria-label={`${formatNumber(cell.count)} คัน · ${Array.from(cell.vendors.entries()).map(([name, count]) => `${name}: ${formatNumber(count)} คัน`).join(", ")}`}
                        onMouseEnter={event => {
                          const box = event.currentTarget.getBoundingClientRect();
                          setVendorTooltip({ left: Math.max(12, Math.min(window.innerWidth - 300, box.left)), top: box.bottom + 8, entries: Array.from(cell.vendors.entries()).sort((a, b) => a[0].localeCompare(b[0], "th")), companies: Array.from(cell.companies.entries()).sort((a, b) => a[0].localeCompare(b[0], "th")) });
                        }}
                        onMouseLeave={() => setVendorTooltip(null)}
                        onFocus={event => {
                          const box = event.currentTarget.getBoundingClientRect();
                          setVendorTooltip({ left: Math.max(12, Math.min(window.innerWidth - 300, box.left)), top: box.bottom + 8, entries: Array.from(cell.vendors.entries()).sort((a, b) => a[0].localeCompare(b[0], "th")), companies: Array.from(cell.companies.entries()).sort((a, b) => a[0].localeCompare(b[0], "th")) });
                        }}
                        onBlur={() => setVendorTooltip(null)}
                        onKeyDown={event => { if (event.key === "Escape") setVendorTooltip(null); }}
                      >{formatNumber(cell.count)}</button> : <span className="fleet-cell-empty">—</span>}
                    </td>;
                  })}
                </tr>)}
              </Fragment>)}</tbody>
            </table>
          </div>}
        </article>

        <article className="fleet-panel fleet-month-panel">
          <div className="fleet-panel-header"><h3>แผนเข้าคลังรายเดือน</h3>
            <p className="fleet-panel-description">
              ตาม warehouse_plan_date · จำนวนรายเดือน · ปี {selectedYear + 543}
            </p><button type="button" className="fleet-month-counter fleet-month-open" aria-haspopup="dialog" onClick={() => monthPickerDialogRef.current?.showModal()}>เลือกเดือน · {selectedSummaryMonths.length}/6 ▾</button></div>
          {isLoading || activeError || stageGroups.length === 0 ? <div className="fleet-empty">{isLoading ? "กำลังโหลดข้อมูล..." : activeError ? "ไม่สามารถแสดงข้อมูลได้" : "ไม่พบข้อมูลตามตัวกรอง"}</div> : <div className="fleet-stage-scroll" ref={monthScrollRef} onScroll={() => syncReportScroll("month")}>
            <table className="fleet-stage-table fleet-month-table"><thead><tr>{sixMonthSummary.map(month => <th key={month.key} scope="col"><span className="fleet-step-name">{month.label}</span></th>)}</tr></thead>
              <tbody>{stageGroups.map(([key, group]) => <Fragment key={key}>
                <tr className="fleet-dc-group"><td colSpan={selectedSummaryMonths.length}><span className="fleet-warehouse-marker" aria-hidden="true" />{group.dcCode}</td></tr>
                {Array.from(group.trucks.values()).sort((a, b) => a.truckType.localeCompare(b.truckType)).map(truck => <tr key={truck.truckType} className="fleet-truck-row">{sixMonthSummary.map(month => {
                  const groupKey = JSON.stringify([group.dcType, group.dcCode, truck.truckType]);
                  const count = monthlyTruckCounts.get(groupKey)?.get(month.key) ?? 0;
                  const details = Array.from(monthlyTruckDetails.get(groupKey)?.get(month.key)?.values() ?? [])
                    .sort((a, b) => a.runningDoc.localeCompare(b.runningDoc, "th") || a.fleetType.localeCompare(b.fleetType, "th"));
                  const hoverText = [
                    `${group.dcCode} · ${truck.truckType} · ${month.label}: ${count} คัน`,
                    ...(details.length ? ["เลขหนังสือ | ประเภทคำขอ | จำนวนรถ", ...details.map(item =>
                      `${item.runningDoc} | ${item.fleetType} | ${formatNumber(item.count)} คัน`)] : ["ไม่มีแผนเข้าคลังในเดือนนี้"]),
                  ].join("\n");
                  return <td key={month.key} title={hoverText} style={{ cursor: count ? "help" : undefined }}
                    onMouseEnter={() => {
                      console.groupCollapsed(`แผนเข้าคลังรายเดือน · ${group.dcCode} · ${truck.truckType} · ${month.label}`);
                      console.log("สรุปช่องที่เลือก:", {
                        dc_type: group.dcType,
                        dc_code: group.dcCode,
                        truck_type: truck.truckType,
                        month: month.key,
                        total_vehicles: count,
                      });
                      console.table(details.map(item => ({
                        running_doc: item.runningDoc,
                        fleet_type: item.fleetType,
                        vehicle_count: item.count,
                      })));
                      if (details.length === 0) console.log("ไม่มีแผนเข้าคลังในช่องนี้");
                      console.groupEnd();
                    }}>{count ? formatNumber(count) : <span className="fleet-cell-empty">—</span>}</td>;
                })}</tr>)}
              </Fragment>)}</tbody></table>
          </div>}
        </article>

      </div>
      </section>

      <dialog ref={monthPickerDialogRef} className="fleet-month-dialog" aria-labelledby="fleet-month-dialog-title">
        <div className="fleet-month-dialog-heading">
          <div><h3 id="fleet-month-dialog-title">เลือกเดือนที่ต้องการดู</h3><p>ปี {selectedYear + 543} · เลือกแล้ว {selectedSummaryMonths.length}/6 เดือน</p></div>
          <button type="button" className="fleet-month-close" aria-label="ปิดตัวเลือกเดือน" onClick={() => monthPickerDialogRef.current?.close()}>×</button>
        </div>
        <div className="fleet-month-picker" aria-label="เลือกเดือนสำหรับสรุป สูงสุด 6 เดือน">
          {MONTH_SHORT_NAMES.map((label, month) => {
            const selected = selectedSummaryMonths.includes(month);
            const disabled = (!selected && selectedSummaryMonths.length >= 6) || (selected && selectedSummaryMonths.length === 1);
            return <button key={month} type="button" className={`fleet-month-chip${selected ? " is-selected" : ""}`} aria-pressed={selected} disabled={disabled} onClick={() => toggleSummaryMonth(month)}>{selected && <span aria-hidden="true">✓ </span>}{label}</button>;
          })}
        </div>
        <p className="fleet-month-picker-note">เลือกได้ 1–6 เดือน ไม่จำเป็นต้องติดกัน · ใช้ปีที่เลือกด้านบน · ไม่เปลี่ยนตามตัวกรองเดือนของกราฟ</p>
        <div className="fleet-month-dialog-footer"><button type="button" className="fleet-button fleet-button-primary" onClick={() => monthPickerDialogRef.current?.close()}>เสร็จสิ้น</button></div>
      </dialog>

      {vendorTooltip && <div className="fleet-vendor-tooltip" role="tooltip" style={{ left: vendorTooltip.left, top: vendorTooltip.top }}>
        <div className="fleet-vendor-tooltip-heading">บริษัทประกอบรถ · จำนวนรถ</div>
        {vendorTooltip.entries.map(([name, count]) => <div className="fleet-vendor-tooltip-row" key={name}><span>{name}</span><strong>: {formatNumber(count)} คัน</strong></div>)}
        <div className="fleet-vendor-tooltip-heading" style={{ marginTop: 12 }}>FBP · จำนวนรถ</div>
        {vendorTooltip.companies.map(([name, count]) => <div className="fleet-vendor-tooltip-row" key={name}><span>{name}</span><strong>: {formatNumber(count)} คัน</strong></div>)}
      </div>}
      <footer className="fleet-footer">
        <span>
          รถเข้าใหม่นับรายการละ 1 คัน · ขั้นตอน 8 = success · Pending = ทุกสถานะที่ไม่ใช่
          success
        </span>
        <span>
          กราฟนับรายคัน · แผน: warehouse_plan_date · จริง: str_date
          ของขั้นตอน 8 · ยอดสะสมเริ่มใหม่ทุกปี
        </span>
      </footer>
    </section>
  );
}
export default function Page() {
  return <FleetStatusByDc />;
}
function SlaInlineIcon({ type, size = 18, className = "" }: { type: string; size?: number; className?: string }) {
  const paths: Record<string, string> = {
    alert: "M12 3 2 21h20L12 3z M12 9v5 M12 17h.01",
    refresh: "M20 7a9 9 0 0 0-15-2L2 8 M2 3v5h5 M4 17a9 9 0 0 0 15 2l3-3 M22 21v-5h-5",
    search: "M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
    truck: "M2 5h13v12H2z M15 9h4l3 5v3h-7 M4 17v1a2 2 0 0 0 4 0v-1 M16 17v1a2 2 0 0 0 4 0v-1",
    clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20 M12 6v6l4 2",
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d={paths[type]} /></svg>;
}

const DASHBOARD_API_URL =

  "http://192.168.158.210/api_new_truck/api/dashboard_sla_overdue.php";

interface OverdueRow {
  id?: string | number;

  flow_id: string | number;

  request_id: string | number;

  running_doc: string;

  dc_code: string;

  fleet_type: string;

  vehicle_no: string | number;

  unit_code?: string | null;

  license: string;

  truck_type: string;

  process: string;

  process_level: string | number;

  str_date: string;

  days_in_status: number;

  sla_limit: number;

  overdue_days: number;

  detail?: string | null;

  action_required: string | null;

}

function formatDate(value: string) {

  const date = value?.split(/[ T]/)[0];

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return "—";

  const [year, month, day] = date.split("-");

  return `${day}/${month}/${year}`;

}

function SlaOverduePanel({ requests: visibleRequests, parentLoading, parentError, reloadKey }: {
  requests: FleetRequest[];
  parentLoading: boolean;
  parentError: string;
  reloadKey: number;
}) {

  const [rows, setRows] = useState<OverdueRow[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [asOf, setAsOf] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  const [search, setSearch] = useState("");

  const [dc, setDc] = useState("");

  const [fleet, setFleet] = useState("");
  const [openDetailModal, setOpenDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<OverdueRow | null>(null);
  const handleOpenDetail = (row: OverdueRow) => {
    setSelectedRequest(row);
    setOpenDetailModal(true);
  };
  const handleCloseDetail = () => {
    setOpenDetailModal(false);
    setSelectedRequest(null);
  };

  useEffect(() => {

    const controller = new AbortController();

    setLoading(true);

    setError("");

    async function loadDashboard() {

      try {

        const response = await fetch(DASHBOARD_API_URL, {

          method: "GET",

          headers: { Accept: "application/json" },

          cache: "no-store",

          signal: controller.signal,

        });

        const raw = await response.text();

        let result;

        try { result = JSON.parse(raw); }

        catch { throw new Error(`API ไม่ได้ส่ง JSON กลับมา (HTTP ${response.status}) กรุณาตรวจสอบตำแหน่งไฟล์ dashboard_sla_overdue.php`); }

        console.log("บันทึกวันที่:", {
          httpStatus: response.status,
          ok: response.ok,
          result,
        });
        
        if (!response.ok || result.status !== "success") {
          throw new Error(
            result.message || `บันทึกวันที่ไม่สำเร็จ (${response.status})`
          );
        }
        if (!Array.isArray(result.data)) throw new Error("รูปแบบข้อมูล API ไม่ถูกต้อง: ไม่พบรายการ data");

        const normalized: OverdueRow[] = result.data.map((row: OverdueRow) => ({

          ...row,

          days_in_status: Number(row.days_in_status),

          sla_limit: Number(row.sla_limit),

          overdue_days: Number(row.overdue_days),

        }));

        if (!controller.signal.aborted) {

          setRows(normalized.sort((a, b) => b.overdue_days - a.overdue_days || b.days_in_status - a.days_in_status));

          setAsOf(result.as_of_date || "");

        }

      } catch (failure) {

        if (!controller.signal.aborted) {

          setRows([]);

          setError(failure instanceof TypeError

            ? "เชื่อมต่อ API ไม่สำเร็จ กรุณาตรวจสอบว่าเครื่องนี้เข้าถึง 192.168.158.210 ได้ และ API อนุญาต CORS จาก http://localhost:3000"

            : failure instanceof Error ? failure.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล");

        }

      } finally {

        if (!controller.signal.aborted) setLoading(false);

      }

    }

    void loadDashboard();

    return () => controller.abort();

  }, [refreshKey, reloadKey]);

  // Keep vehicle-level scope: one request can contain multiple truck types.
  const scopedRows = useMemo(() => {
    const requestIds = new Set<string>();
    const vehicleKeys = new Set<string>();
    const unitKeys = new Set<string>();
    const key = (requestId: FleetId, value: FleetId) =>
      JSON.stringify([String(requestId ?? "").trim(), String(value ?? "").trim()]);
    for (const request of visibleRequests) {
      const id = String(request.id ?? "").trim();
      if (!id) continue;
      const units = String(request.unit_code ?? "").trim();
      const records = asRecords(request.vehicle_warehouse_info ?? request.vehicle_info);
      const vehicleNo = request.vehicle_no;
      let hasVehicle = false;
      if (units) { unitKeys.add(key(id, units)); hasVehicle = true; }
      if (vehicleNo != null && String(vehicleNo).trim()) {
        vehicleKeys.add(key(id, vehicleNo)); hasVehicle = true;
      }
      for (const record of records) {
        if (record.vehicle_no != null && String(record.vehicle_no).trim()) {
          vehicleKeys.add(key(id, record.vehicle_no)); hasVehicle = true;
        }
      }
      // Grouped request data without vehicle identifiers represents the full request.
      if (!hasVehicle) requestIds.add(id);
    }
    return rows.filter(row => requestIds.has(String(row.request_id).trim()) ||
      vehicleKeys.has(key(row.request_id, row.vehicle_no)) ||
      (Boolean(row.unit_code) && unitKeys.has(key(row.request_id, row.unit_code ?? null))));
  }, [rows, visibleRequests]);
  const dcOptions = useMemo(() => [...new Set(scopedRows.map(row => row.dc_code).filter(Boolean))].sort(), [scopedRows]);
  const fleetOptions = useMemo(() => [...new Set(scopedRows.map(row => row.fleet_type).filter(Boolean))].sort(), [scopedRows]);
  const scopeLoading = loading || parentLoading;
  const scopeError = parentError || error;

  const filtered = useMemo(() => {

    const keyword = search.trim().toLowerCase();

    return scopedRows.filter((row) => (!dc || row.dc_code === dc) && (!fleet || row.fleet_type === fleet) &&

      (!keyword || [row.running_doc, row.request_id, row.unit_code, row.license, row.truck_type, row.process, row.dc_code]

        .some((value) => String(value ?? "").toLowerCase().includes(keyword))));

  }, [scopedRows, dc, fleet, search]);

  const vehicles = new Set(filtered.map((row) => `${row.request_id}:${row.vehicle_no}`)).size;

  const requests = new Set(filtered.map((row) => String(row.request_id))).size;

  const longest = filtered.reduce((max, row) => Math.max(max, row.overdue_days), 0);

  const headers = ["DC Code", "Fleet Type", "Vehicle Type", "Current Status", "Days in Status", "SLA Limit", "Action Required", "Detail"];

  const controlClass = "sla-control";

  return (

    <section className="sla-overdue-embed" aria-label="ติดตามรายการเกิน SLA">

      <div className="sla-shell">

        <header className="sla-heading">

          <div>

            <p className="sla-eyebrow">SLA MONITOR</p>

            <h3 className="sla-title">ติดตามรายการเกิน SLA</h3>

            <p className="sla-description">แสดงรายการตามตัวกรองด้านบน · เรียงวันที่เกินมากที่สุดก่อน</p>

          </div>

          <button type="button" onClick={() => setRefreshKey((value) => value + 1)} disabled={scopeLoading}

            className="sla-refresh">

            <SlaInlineIcon type="refresh" size={16} className={scopeLoading ? "sla-spin" : ""} />{scopeLoading ? "กำลังโหลด" : "รีเฟรชข้อมูล"}

          </button>

        </header>

        <div className="sla-workspace">
          <aside className="sla-kpis">

            {[{ label: "คำขอรถที่เกิน SLA", value: `${requests} คำขอ`, icon: <SlaInlineIcon type="alert" size={20} />, color: "rose" },
            { label: "เกิน SLA มากที่สุด", value: `${longest} วัน`, icon: <SlaInlineIcon type="clock" size={20} />, color: "blue" }]
              .map((card) => <div key={card.label} className="sla-kpi">

                <span className={`sla-kpi-icon ${card.color}`}>{card.icon}</span>

                <div><p className="sla-kpi-label">{card.label}</p><p className="sla-kpi-value">{scopeLoading || scopeError ? "—" : card.value}</p></div>

              </div>)}

          </aside>

          <section className="sla-table-section">

            <div className="sla-toolbar">

              <label className="sla-search"><SlaInlineIcon type="search" size={16} className="sla-search-icon" />

                <input aria-label="ค้นหารายการ" placeholder="ค้นหาเลขคำขอ ทะเบียน ประเภทรถ หรือขั้นตอน" value={search} onChange={(event) => setSearch(event.target.value)} className={`${controlClass}`} />

              </label>

              <select aria-label="กรอง DC" value={dc} onChange={(event) => setDc(event.target.value)} className={controlClass}><option value="">ทุก DC</option>{dcOptions.map((value) => <option key={value}>{value}</option>)}</select>

              <select aria-label="กรอง Fleet Type" value={fleet} onChange={(event) => setFleet(event.target.value)} className={controlClass}><option value="">ทุก Fleet Type</option>{fleetOptions.map((value) => <option key={value}>{value}</option>)}</select>

              {(search || dc || fleet) && <button type="button" onClick={() => { setSearch(""); setDc(""); setFleet(""); }} className="sla-clear">ล้างตัวกรอง</button>}

            </div>

            {scopeError && <div role="alert" className="sla-error"><SlaInlineIcon type="alert" size={20} className="sla-alert-icon" /><div><p className="sla-strong">โหลดข้อมูลไม่สำเร็จ</p><p className="sla-error-message">{scopeError}</p><p className="sla-error-api">API: {DASHBOARD_API_URL}</p></div></div>}

            <div className="sla-table-scroll">

              <table aria-busy={scopeLoading} className="sla-table">

                <thead className="sla-table-head"><tr>{headers.map((label) => <th key={label} scope="col" className="sla-table-th">{label}</th>)}</tr></thead>

                <tbody className="sla-table-body">

                  {!scopeLoading && !scopeError && filtered.map((row) => <tr key={`${row.request_id}-${row.vehicle_no}-${row.flow_id}`} className="sla-table-row">

                    <td className="sla-strong">{row.dc_code || "—"}<p className="sla-secondary">{row.running_doc}</p><p className="sla-id">ID {row.request_id}</p></td>

                    <td className="sla-cell">{row.fleet_type || "—"}</td>

                    <td className="sla-strong">{row.truck_type || "—"}<p className="sla-secondary">{row.license || "—"} · คันที่ {row.vehicle_no}</p></td>

                    <td className="sla-strong">{row.process_level}. {row.process}<p className="sla-secondary">เริ่ม {formatDate(row.str_date)}</p></td>

                    <td className="sla-days"><span className="sla-days-value">{row.days_in_status} วัน<SlaInlineIcon type="alert" size={16} /></span><p className="sla-overdue-days">เกิน SLA {row.overdue_days} วัน</p></td>

                    <td className="sla-limit">{row.sla_limit} วัน</td>

                    <td className="sla-action">{row.detail?.trim() || row.action_required?.trim() || "—"}</td>
                    <td className="sla-detail-cell">
                      <button type="button" className="sla-detail-button" onClick={() => handleOpenDetail(row)} aria-label={`เปิดรายละเอียดคำขอ ${row.running_doc || row.request_id} คันที่ ${row.vehicle_no}`}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3 12s3-7 9-7 9 7 9 7-3 7-9 7-9-7-9-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                        ดู Flow
                      </button>
                    </td>

                  </tr>)}

                  {(scopeLoading || scopeError || filtered.length === 0) && <tr><td colSpan={8} className="sla-state"><span className="sla-state-message">{scopeLoading ? "กำลังโหลดรายการเกิน SLA จากทุกคำขอ..." : scopeError ? "ยังไม่สามารถแสดงข้อมูลได้ กรุณาตรวจสอบข้อความด้านบน" : scopedRows.length ? "ไม่พบรายการตามตัวกรอง" : "ไม่พบรายการที่เกิน SLA ตามตัวกรองด้านบน"}</span></td></tr>}

                </tbody>

              </table>

            </div>

            <div className="sla-table-footer"><p>แสดง {filtered.length} ขั้นตอน · {vehicles} คัน{search || dc || fleet ? " ตามตัวกรอง" : " ตามตัวกรองด้านบน"}</p><p>ข้อมูลวันที่ {formatDate(asOf)} · นับวันเริ่มต้นเป็นวันที่ 1</p></div>

          </section>
        </div>
      </div>
      {openDetailModal && typeof document !== "undefined" &&
        createPortal(
          <div style={{ position: "relative", zIndex: 10000 }}>
            <FlowAssessmentModal
              open={openDetailModal}
              requestId={
                selectedRequest?.request_id ?? selectedRequest?.id ?? null
              }
              vehicleNo={
                selectedRequest?.unit_code ?? selectedRequest?.vehicle_no ?? null
              }
              onClose={handleCloseDetail}
            />
          </div>,
          document.body
        )}
    </section>

  );

}

function FleetFilterGlyph({ kind }: { kind: string }) {
  const paths: Record<string, string> = {
    sliders: "M4 6h7 M15 6h5 M4 12h3 M11 12h9 M4 18h11 M19 18h1 M11 3v6 M7 9v6 M15 15v6",
    calendar: "M5 4h14a1 1 0 0 1 1 1v15H4V5a1 1 0 0 1 1-1z M8 2v5 M16 2v5 M4 9h16 M8 13h1 M12 13h1 M16 13h1 M8 17h1 M12 17h1",
    filter: "M3 4h18l-7 8v7l-4-2v-5L3 4z",
    warehouse: "M3 21V7l9-4 9 4v14 M7 21V11h10v10 M7 15h10 M7 18h10",
    user: "M20 21v-2a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5v2 M12 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
    truck: "M2 6h12v11H2z M14 10h4l4 4v3h-8 M5 17v1a2 2 0 0 0 4 0v-1 M16 17v1a2 2 0 0 0 4 0v-1",
    clear: "M3 14 12 4l9 8-8 9H9l-6-7z M7 10l10 9 M13 21h8",
  };
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]} /></svg>;
}

interface FleetSearchOption { value: string; label: string }
function FleetSearchFilter({ label, value, options, onChange, disabled = false }: {
  label: string;
  value: string;
  options: FleetSearchOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0, height: 240 });
  const selected = options.find(option => option.value === value);
  const keyword = query.trim().toLocaleLowerCase();
  const matches = options.filter(option =>
    !keyword || `${option.label} ${option.value}`.toLocaleLowerCase().includes(keyword));
  const activeIndex = Math.min(active, matches.length - 1);
  const choose = (option: FleetSearchOption) => {
    onChange(option.value);
    setOpen(false);
    setQuery("");
  };
  useEffect(() => { setOpen(false); setQuery(""); setActive(0); }, [value, disabled]);
  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      const rect = inputRef.current?.getBoundingClientRect();
      if (!rect) return;
      const below = window.innerHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const height = Math.min(240, Math.max(0, below >= 160 || below >= above ? below : above));
      setPosition({ left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
        top: below >= 160 || below >= above ? rect.bottom + 4 : rect.top - height - 4,
        width: Math.min(rect.width, window.innerWidth - 16), height });
    };
    const outside = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (!inputRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) setOpen(false);
    };
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    document.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open]);
  useEffect(() => {
    if (open && activeIndex >= 0) menuRef.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex, query]);
  return <>
    <input ref={inputRef} className="fleet-field" type="text" role="combobox"
      aria-label={label} aria-autocomplete="list" aria-expanded={open}
      aria-controls={open ? listId : undefined}
      aria-activedescendant={open && matches.length ? `${listId}-${activeIndex}` : undefined}
      autoComplete="off" disabled={disabled}
      placeholder={open ? "พิมพ์ค้นหา..." : label}
      value={open ? query : selected?.label ?? value}
      onFocus={() => { setQuery(""); setActive(0); setOpen(true); }}
      onClick={() => { if (!open) { setQuery(""); setActive(0); setOpen(true); } }}
      onChange={event => { setQuery(event.target.value); setActive(0); setOpen(true); }}
      onBlur={() => setOpen(false)}
      onKeyDown={event => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          if (!open) { setOpen(true); setActive(0); return; }
          setActive(current => Math.max(0, Math.min(matches.length - 1, current + (event.key === "ArrowDown" ? 1 : -1))));
        } else if (event.key === "Enter" && open) {
          event.preventDefault();
          if (matches[activeIndex]) choose(matches[activeIndex]);
        } else if (event.key === "Escape") { setOpen(false); setQuery(""); }
        else if (event.key === "Tab") setOpen(false);
      }} />
    {open && !disabled && typeof document !== "undefined" && createPortal(
      <div ref={menuRef} id={listId} role="listbox" aria-label={label}
        style={{ position: "fixed", left: position.left, top: position.top,
          width: position.width, maxHeight: position.height, overflowY: "auto", overflowX: "hidden",
          zIndex: 10050, padding: 4, boxSizing: "border-box", background: "#fff", color: "#304c70",
          border: "1px solid #dce5f0", borderRadius: 10, boxShadow: "0 8px 24px #17315326",
          fontFamily: "inherit", fontSize: 15, lineHeight: 1.6 }}>
        {matches.length ? matches.map((option, index) => <div key={option.value}
          id={`${listId}-${index}`} role="option" aria-selected={option.value === value}
          onPointerDown={event => event.preventDefault()}
          onClick={() => choose(option)}
          onMouseEnter={() => setActive(index)}
          style={{ padding: "11px 13px", minHeight: 44, borderRadius: 6, cursor: "pointer", overflowWrap: "anywhere",
            background: index === activeIndex ? "#edf4ff" : "transparent",
            fontWeight: option.value === value ? 700 : 400 }}>
          {option.label}
        </div>) : <div style={{ padding: 10, color: "#73839a" }}>ไม่พบตัวเลือก</div>}
      </div>, document.body)}
  </>;
}

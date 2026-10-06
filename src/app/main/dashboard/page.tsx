"use client";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
type FleetId = number | string | null;
interface WarehouseRecord {
  request_id?: FleetId;
  vehicle_no: number | string | null;
  warehouse_plan_date?: string | null;
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
}
interface FleetRequest {
  id: FleetId;
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
  workload?: number | string | null;
  latest_process_name?: string | null;
  latest_process_level?: number | string | null;
  new_truck_type?: string | null;
  new_vendor_name?: string | null;
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
const FLEET_STATUSES = [
  { key: "success", label: "เสร็จสิ้น", color: "#059669" },
  { key: "progress", label: "คำขอรอพิจารณา", color: "#2563eb" },
  { key: "cancel", label: "ไม่ผ่านกระบวนการ", color: "#e11d48" },
  { key: "partial_approved", label: "อนุมัติบางส่วน", color: "#d97706" },
  { key: "fbp_pending", label: "FBP จัดรถเรียบร้อยแล้ว", color: "#7c3aed" },
  { key: "reject_by_fbp", label: "FBP ไม่อนุมัติ", color: "#dc2626" },
] as const;
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
    a.dcCode.localeCompare(b.dcCode, "th"),
  );
}
function isRequest(value: unknown): value is FleetRequest {
  return typeof value === "object" && value !== null &&
    "dc_code" in value && "qty" in value && "status" in value;
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
  const info = row.warehouse_info ?? row.vehicle_info;
  const infoRow = typeof info === "object" && info !== null
    ? info as Record<string, unknown> : {};
  const vehicleNo = row.warehouse_vehicle_no ?? infoRow.vehicle_no;
  const validVehicleNo = typeof vehicleNo === "string" || typeof vehicleNo === "number"
    ? vehicleNo : null;
  const plan = infoRow.warehouse_plan_date ?? row.warehouse_plan_date;
  const level = String(row.latest_process_level ?? "").trim();
  const status = level === "8" ? "success"
    : level === "9" || level === "10" ? "cancel"
    : level ? "progress" : String(row.status ?? row.request_status ?? "progress");
  return {
    // Dashboard records are joined by the original request ID, not incoming_truck_id.
    id: requestId,
    dc_code: row.dc_code == null ? null : String(row.dc_code),
    dc_type: row.dc_type == null ? null : String(row.dc_type),
    fleet_type: row.fleet_type == null ? null : String(row.fleet_type),
    qty: 1,
    request_date: typeof row.request_date === "string" ? row.request_date : null,
    area: row.dc_code == null ? null : String(row.dc_code).trim(),
    approved_company_id: row.approved_company_id == null ? null : String(row.approved_company_id).trim(),
    approved_company_name: row.approved_company_name == null ? null : String(row.approved_company_name).trim(),
    status,
    workload: typeof row.workload === "string" || typeof row.workload === "number" ? row.workload : null,
    latest_process_name: row.latest_process_name == null ? null : String(row.latest_process_name),
    latest_process_level: level || null,
    new_truck_type: row.new_truck_type == null ? null : String(row.new_truck_type),
    new_vendor_name: row.new_vendor_name == null ? null : String(row.new_vendor_name),
    vehicle_warehouse_info: {
      request_id: requestId,
      vehicle_no: validVehicleNo,
      warehouse_plan_date: typeof plan === "string" ? plan : null,
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

async function fetchAllFleetRequests(apiUrl: string, signal: AbortSignal): Promise<FleetRequest[]> {
  const baseUrl = new URL(apiUrl, window.location.href);
  const paginated = baseUrl.searchParams.get("group_mode") === "incoming" &&
    !baseUrl.pathname.endsWith("/dashboard_fleet_get.php");
  const results: FleetRequest[] = [];
  const seen = new Set<string>();
  let page = 1;
  while (true) {
    signal.throwIfAborted();
    const url = new URL(baseUrl.toString());
    if (paginated) {
      url.searchParams.set("page", String(page));
      // Keep the supported page size and load every page, rather than assuming limit=0 means all.
      url.searchParams.set("limit", baseUrl.searchParams.get("limit") || "20");
    }
    const response = await fetch(url.toString(), { method: "GET", cache: "no-store", signal });
    if (!response.ok) throw new Error(`ไม่สามารถดึงข้อมูลหน้า ${page} ได้ (HTTP ${response.status})`);
    const payload: unknown = await response.json();
    if (!paginated) return readFleetRequests(payload);
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
    const totalPages = Number(pagination.total_pages);
    if (Number.isInteger(totalPages) && totalPages >= 1 && page >= totalPages) break;
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
        const records = readDashboardRecords(payload);
        if (!controller.signal.aborted) setDashboardRecords(records);
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
        const list = await fetchAllFleetRequests(apiUrl, signal);
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
  const sourceRequests = suppliedRequests ?? requests;
  const filterOptions = useMemo(() => {
    const values = (key: "area" | "fbp" | "new_truck_type" | "status") => Array.from(new Set(sourceRequests.map(row => String(row[key] ?? "").trim()).filter(Boolean))).sort();
    const years = sourceRequests.flatMap(row => { const day = calendarDate(row.request_date); return day ? [Number(day.slice(0,4))] : []; });
    const areas = Array.from(new Set(sourceRequests.map(row => String(row.dc_code ?? "").trim()).filter(Boolean))).sort();
    const companies = new Map<string, string>();
    for (const row of sourceRequests) {
      const id = String(row.approved_company_id ?? "").trim();
      const name = String(row.approved_company_name ?? "").trim();
      if (id) companies.set(id, name || `FBP ${id}`);
    }
    const fbps = Array.from(companies, ([id, name]) => ({ id, name })).sort((a,b) => a.name.localeCompare(b.name, "th"));
    return { areas, fbps, trucks: values("new_truck_type"), statuses: values("status"), years: Array.from(new Set([currentYear, ...years])).sort((a,b) => b-a) };
  }, [sourceRequests, currentYear]);
  const dcTypeOptions = useMemo(() => Array.from(new Set(sourceRequests.map(row => String(row.dc_type ?? "").trim() || "ไม่ระบุประเภทคลัง"))).sort(), [sourceRequests]);
  const typeRequests = useMemo(() => sourceRequests.filter(row =>
    (dcTypeFilter === "all" || (String(row.dc_type ?? "").trim() || "ไม่ระบุประเภทคลัง") === dcTypeFilter) &&
    (requestTypeFilter === "all" || String(row.fleet_type ?? "").trim() === requestTypeFilter)
  ), [sourceRequests, dcTypeFilter, requestTypeFilter]);
  const requestTypeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          sourceRequests
            .map(item => String(item.fleet_type || "").trim())
            .filter(Boolean),
        ),
      ).sort(),
    [sourceRequests],
  );
  const filteredRequests = useMemo(
    () => typeRequests.filter(item => {
      const date = calendarDate(item.request_date);
      return date !== null && Number(date.slice(0,4)) === selectedYear &&
        (monthFilter === "all" || date.slice(5,7) === monthFilter) &&
        (areaFilter === "all" || String(item.dc_code ?? "").trim() === areaFilter) &&
        (fbpFilter === "all" || String(item.approved_company_id ?? "").trim() === fbpFilter) &&
        (statusFilter === "all" || item.status === statusFilter) &&
        (truckTypeFilter === "all" || item.new_truck_type === truckTypeFilter);
    }),
    [typeRequests, selectedYear, monthFilter, areaFilter, fbpFilter, statusFilter, truckTypeFilter],
  );
  const stageScrollRef = useRef<HTMLDivElement>(null);
  const monthScrollRef = useRef<HTMLDivElement>(null);
  const [showClosedSteps, setShowClosedSteps] = useState(false);
  const stageColumns = useMemo(() => {
    const columns = new Map<string, { key: string; level: string; name: string }>();
    for (const row of typeRequests) {
      const level = String(row.latest_process_level ?? "").trim();
      const name = String(row.latest_process_name ?? "").trim() || "ไม่ระบุชื่อขั้นตอน";
      // Include both level and name so different processes sharing a level remain separate.
      const key = JSON.stringify([level, name]);
      columns.set(key, { key, level, name });
    }
    return Array.from(columns.values()).sort((a, b) => {
      const left = a.level && Number.isFinite(Number(a.level)) ? Number(a.level) : Infinity;
      const right = b.level && Number.isFinite(Number(b.level)) ? Number(b.level) : Infinity;
      return (left === right ? 0 : left - right) || a.name.localeCompare(b.name, "th");
    });
  }, [typeRequests]);

  const visibleStageColumns = stageColumns.filter(column => {
    const level = Number(column.level);
    return (level >= 1 && level <= 8) || (showClosedSteps && (level === 9 || level === 10));
  });

  const sixMonthSummary = useMemo(() => {
    const endMonth = monthFilter !== "all" ? Number(monthFilter) - 1
      : selectedYear === currentYear ? new Date().getMonth() : 11;
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(selectedYear, endMonth - 5 + index, 1);
      return { key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
        label: `${MONTH_SHORT_NAMES[date.getMonth()]}-${String(date.getFullYear() + 543).slice(-2)}` };
    });
  }, [selectedYear, currentYear, monthFilter]);
  const monthlyTruckCounts = useMemo(() => {
    const counts = new Map<string, Map<string, number>>();
    for (const row of typeRequests) {
      if ((areaFilter !== "all" && String(row.dc_code ?? "").trim() !== areaFilter) ||
          (fbpFilter !== "all" && String(row.approved_company_id ?? "").trim() !== fbpFilter) ||
          (statusFilter !== "all" && row.status !== statusFilter) ||
          (truckTypeFilter !== "all" && row.new_truck_type !== truckTypeFilter)) continue;
      const day = calendarDate(row.request_date), level = Number(row.latest_process_level), qty = Number(row.qty);
      if (!day || !Number.isInteger(level) || level < 2 || level > 7 || !Number.isFinite(qty) || qty <= 0) continue;
      const month = day.slice(0,7);
      if (!sixMonthSummary.some(item => item.key === month)) continue;
      const key = JSON.stringify([String(row.dc_type ?? "").trim() || "ไม่ระบุประเภทคลัง", String(row.dc_code ?? "").trim() || "ไม่ระบุคลัง", String(row.new_truck_type ?? "").trim() || "ไม่ระบุประเภทรถ"]);
      const months = counts.get(key) ?? new Map<string, number>();
      months.set(month, (months.get(month) ?? 0) + qty);
      counts.set(key, months);
    }
    return counts;
  }, [typeRequests, sixMonthSummary, areaFilter, fbpFilter, statusFilter, truckTypeFilter]);

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
      const vendor = String(row.new_vendor_name ?? "").trim() || "ไม่ระบุบริษัทขนส่ง";
      cell.vendors.set(vendor, (cell.vendors.get(vendor) ?? 0) + qty);
      const company = String(row.approved_company_name ?? "").trim() || "ไม่ระบุ FBP";
      cell.companies.set(company, (cell.companies.get(company) ?? 0) + qty);
      truck.stages.set(key, cell);
      truck.total += qty;
    }
    return Array.from(groups.entries()).sort((a, b) => a[1].dcType.localeCompare(b[1].dcType, "th") || a[1].dcCode.localeCompare(b[1].dcCode, "th"));
  }, [filteredRequests]);

  const yearOptions = filterOptions.years;
  const activeYear = selectedYear;
  const dailyTimeline = useMemo(
    () =>
      suppliedTimeline ??
      buildDeliveryTimeline(
        filteredRequests,
        warehouseRecords,
        flowRecords,
        processes,
      ),
    [
      suppliedTimeline,
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
      const status = String(item.status ?? "").trim();
      const row = rows.find(row => row.key === status) ?? rows[rows.length - 1];
      row.qty += qty;
    }
    return rows;
  }, [filteredRequests]);
  const statusTotal = summary.reduce((sum, row) => sum + row.qty, 0);
  const totals = dcSummary.reduce(
    (acc, row) => ({
      total: acc.total + row.total,
      delivered: acc.delivered + row.green,
      remaining: acc.remaining + row.red,
    }),
    { total: 0, delivered: 0, remaining: 0 },
  );
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
  const timelineMax = Math.max(
    1,
    ...timeline.flatMap(point => [point.planned, point.actual ?? 0]),
  );
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
        : `${
            index === 0 || timeline[index - 1].actual === null ? "M" : "L"
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
        .fleet-dashboard {
          --ink: #16243a;
          --muted: #62738a;
          --line: #e4eaf2;
          box-sizing: border-box;
          padding: 28px;
          border: 1px solid var(--line);
          border-radius: 24px;
          background: #f5f7fb;
          color: var(--ink);
          font-family: inherit;
          font-size: 14px;
          line-height: 1.6;
        }
        .fleet-dashboard * { box-sizing: border-box; }
        .fleet-dashboard h2,
        .fleet-dashboard h3,
        .fleet-dashboard p { margin: 0; }
        .fleet-dashboard button,
        .fleet-dashboard input,
        .fleet-dashboard select { font: inherit; }
        .fleet-dashboard button { cursor: pointer; }
        .fleet-dashboard button:disabled {
          cursor: default;
          opacity: .55;
        }
        .fleet-dashboard :is(button, input, select):focus-visible {
          outline: 3px solid #93c5fd;
          outline-offset: 3px;
        }
        .fleet-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
        }
        .fleet-eyebrow {
          margin-bottom: 5px;
          color: #2563eb;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2px;
        }
        .fleet-dashboard h2 {
          font-size: clamp(21px, 2.5vw, 28px);
          font-weight: 750;
        }
        .fleet-subtitle {
          margin-top: 5px !important;
          color: var(--muted);
          font-size: 13px;
        }
        .fleet-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 44px;
          padding: 9px 15px;
          border: 1px solid var(--line);
          border-radius: 11px;
          background: white;
          color: #41536d;
          font-weight: 600;
        }
        .fleet-button:hover { background: #edf3ff; }
        .fleet-button-primary {
          border-color: #2563eb;
          background: #2563eb;
          color: white;
        }
        .fleet-button-primary:hover { background: #1d4ed8; }
        .fleet-filters {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          align-items: end;
          gap: 14px;
          margin-bottom: 20px;
          padding: 18px;
          border: 1px solid var(--line);
          border-radius: 16px;
          background: white;
        }
        .fleet-label {
          display: block;
          margin-bottom: 6px;
          color: #53647b;
          font-size: 12px;
          font-weight: 600;
        }
        .fleet-field {
          width: 100%;
          min-height: 44px;
          padding: 10px 12px;
          border: 1px solid #dce4ef;
          border-radius: 10px;
          background: #f9fbfd;
          color: var(--ink);
        }
        .fleet-filter-note {
          margin-bottom: 18px !important;
          color: var(--muted);
          font-size: 12px;
        }
        .fleet-delivery-summary {
          display: grid;
          grid-template-columns: 160px minmax(0, 1fr);
          align-items: center;
          gap: 28px;
          margin-bottom: 24px;
          padding: 22px;
          border: 1px solid var(--line);
          border-radius: 18px;
          background: white;
        }
        .fleet-incoming-card {
          padding: 20px 12px;
          border: 2px solid #16394b;
          border-radius: 12px;
          background: white;
          text-align: center;
        }
        .fleet-incoming-card h3 {
          font-size: 20px;
          line-height: 1.3;
        }
        .fleet-incoming-value {
          margin-top: 14px;
          font-size: 32px;
          font-weight: 750;
        }
        .fleet-delivery-heading {
          margin-bottom: 14px !important;
          text-align: center;
          font-size: 22px;
          font-weight: 750;
        }
        .fleet-delivery-cards {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        .fleet-delivery-card {
          min-width: 0;
          padding: 18px 16px;
          border: 1px solid #c7dbf7;
          border-radius: 12px;
          background: white;
          box-shadow: 3px 4px 8px #16243a18;
          text-align: center;
        }
        .fleet-delivery-label {
          font-size: 13px;
          font-weight: 650;
        }
        .fleet-delivery-label small {
          display: block;
          color: var(--muted);
          font-size: 11px;
          font-weight: 400;
        }
        .fleet-delivery-number {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-top: 12px;
        }
        .fleet-delivery-number svg {
          width: 34px;
          height: 34px;
          flex-shrink: 0;
        }
        .fleet-delivery-number strong {
          font-size: clamp(24px, 2.4vw, 34px);
          line-height: 1.1;
          overflow-wrap: anywhere;
        }
        .fleet-delivery-unit {
          color: var(--muted);
          font-size: 11px;
        }
        .fleet-delivery-progress-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
        }
        .fleet-delivery-progress-track {
          flex: 1;
          height: 12px;
          overflow: hidden;
          border-radius: 99px;
          background: #dedede;
        }
        .fleet-delivery-progress-track span {
          display: block;
          height: 100%;
          border-radius: inherit;
        }
        .fleet-delivery-percent {
          color: var(--muted);
          font-size: 12px;
          font-weight: 650;
        }
        .fleet-delivery-note {
          margin-top: 12px !important;
          color: var(--muted);
          font-size: 10px;
        }
        .fleet-panels {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
          align-items: start;
          gap: 20px;
        }
        .fleet-panel {
          min-width: 0;
          overflow: hidden;
          border: 1px solid var(--line);
          border-radius: 18px;
          background: white;
          box-shadow: 0 4px 16px #182c4d03;
        }
        .fleet-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 20px 22px;
          border-bottom: 1px solid #edf1f6;
        }
        .fleet-panel h3 { font-size: 15px; font-weight: 700; }
        .fleet-panel-description {
          margin-top: 3px !important;
          color: var(--muted);
          font-size: 12px;
        }
        .fleet-panel-content { padding: 20px 22px; }
        .fleet-timeline { grid-column: auto; }
        .fleet-year-select {
          flex-shrink: 0;
          width: 110px;
        }
        .fleet-chart-scroll { overflow-x: auto; }
        .fleet-chart {
          display: block;
          width: 100%;
          min-width: 640px;
          height: auto;
        }
        .fleet-legend {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 18px;
          margin-top: 14px;
          color: var(--muted);
          font-size: 12px;
        }
        .fleet-legend span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }
        .fleet-legend i {
          display: inline-block;
          width: 9px;
          height: 9px;
          border-radius: 3px;
        }
        .fleet-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
          min-height: 220px;
          padding: 24px;
          color: var(--muted);
          text-align: center;
        }
        .fleet-warehouse-list {
          max-height: 400px;
          overflow: auto;
          padding-right: 5px;
        }
        .fleet-warehouse {
          padding: 13px 0;
          border-bottom: 1px solid #f0f3f7;
        }
        .fleet-warehouse:last-child { border-bottom: 0; }
        .fleet-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
        }
        .fleet-warehouse-name { font-size: 13px; font-weight: 650; }
        .fleet-row-meta {
          color: var(--muted);
          font-size: 12px;
          font-variant-numeric: tabular-nums;
        }
        .fleet-bar {
          display: flex;
          height: 10px;
          overflow: hidden;
          border-radius: 99px;
          background: #eef2f7;
        }
        .fleet-bar > span { height: 100%; min-width: 0; }
        .fleet-warehouse-detail {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          margin-top: 7px;
          color: var(--muted);
          font-size: 11px;
        }
        .fleet-table { width: 100%; border-collapse: collapse; }
        .fleet-table th {
          padding: 0 0 12px;
          border-bottom: 1px solid var(--line);
          color: var(--muted);
          font-size: 11px;
          font-weight: 500;
          text-align: left;
        }
        .fleet-table td {
          padding: 13px 0;
          border-bottom: 1px solid #edf1f6;
          font-size: 13px;
        }
        .fleet-table :is(th, td):last-child {
          text-align: right;
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }
        .fleet-status {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .fleet-status i {
          display: inline-block;
          flex-shrink: 0;
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .fleet-status-share {
          max-width: 150px;
          height: 3px;
          margin-top: 6px;
          overflow: hidden;
          border-radius: 99px;
          background: #f1f5f9;
        }
        .fleet-status-share span {
          display: block;
          height: 100%;
          border-radius: 99px;
        }
        .fleet-table tfoot td {
          padding-top: 18px;
          border: 0;
          font-weight: 750;
        }
        .fleet-error {
          margin-bottom: 20px;
          padding: 14px 18px;
          border: 1px solid #fecdd3;
          border-radius: 12px;
          background: #fff1f2;
          color: #be123c;
        }
        .fleet-footer {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 18px;
          color: var(--muted);
          font-size: 11px;
        }
        @media (max-width: 1000px) {
          .fleet-delivery-summary {
            grid-template-columns: 1fr;
            gap: 18px;
          }
          .fleet-incoming-card {
            width: 160px;
            justify-self: center;
          }
        }
        @media (max-width: 900px) {
          .fleet-dashboard { padding: 20px; }
          .fleet-filters {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .fleet-panels { grid-template-columns: 1fr; }
          .fleet-timeline { grid-column: auto; }
        }
        @media (max-width: 540px) {
          .fleet-dashboard { padding: 14px; border-radius: 16px; }
          .fleet-heading { align-items: flex-start; flex-direction: column; }
          .fleet-filters { grid-template-columns: 1fr; padding: 14px; }
          .fleet-delivery-summary { padding: 16px; }
          .fleet-delivery-heading { font-size: 18px; }
          .fleet-delivery-cards { grid-template-columns: 1fr; }
          .fleet-delivery-number strong { font-size: 34px; }
          .fleet-panel-header,
          .fleet-panel-content { padding: 16px; }
          .fleet-row-meta { font-size: 11px; }
        }

        .fleet-dc-tabs{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px}
        .fleet-dc-tab{padding:10px 20px;border:1px solid #dce4ef;border-radius:10px;background:white;color:#53647b;font-weight:700}
        .fleet-dc-tab.active{background:#41536d;border-color:#41536d;color:white}
        .fleet-stage-panel{margin-top:22px;margin-bottom:22px}
        .fleet-stage-scroll{overflow:auto;max-height:600px}
        .fleet-stage-table{width:100%;border-collapse:separate;border-spacing:0;min-width:700px}
        .fleet-stage-table th,.fleet-stage-table td{padding:12px 14px;border-right:1px solid #dce4ef;border-bottom:1px solid #dce4ef;text-align:center;font-size:12px}
        .fleet-stage-table thead th{position:sticky;top:0;z-index:2;background:#41536d;color:white;min-width:150px;vertical-align:middle}
        .fleet-stage-table thead th:first-child{min-width:180px;text-align:left}
        .fleet-stage-table .fleet-dc-group td{background:#d5dce5;font-weight:750;text-align:left;color:#16243a}
        .fleet-stage-table .fleet-dc-merged{background:#e8eef6;vertical-align:middle;text-align:center;font-weight:750;min-width:85px}
        .fleet-stage-table tbody th{background:white;text-align:left;white-space:nowrap;font-weight:500}
        .fleet-stage-table .fleet-stage-total{background:#eef2f7;font-weight:750}
        .fleet-stage-table .fleet-stage-completed{background:#e1f2dd;color:#059669;font-weight:750}
        .fleet-vendor-chip{display:inline-block;padding:2px 9px;margin:2px 4px 2px 0;border-radius:99px;background:#fff0b5;color:#655626;font-size:10px}
        .fleet-stage-count{display:block;margin-top:3px;font-weight:750;font-size:14px}

        /* Compact dashboard */
        .fleet-dashboard{padding:18px;border-radius:16px;background:#f6f8fc;font-size:13px;line-height:1.5}
        .fleet-heading{gap:12px;margin-bottom:16px}
        .fleet-eyebrow{font-size:10px;letter-spacing:1.5px;margin-bottom:3px}
        .fleet-dashboard h2{font-size:21px;letter-spacing:-.4px}
        .fleet-subtitle{font-size:12px;margin-top:3px!important}
        .fleet-button{min-height:36px;padding:7px 12px;border-radius:8px;font-size:12px}
        .fleet-filters{grid-template-columns:repeat(8,minmax(0,1fr)) auto;gap:10px;padding:12px;margin-bottom:12px;border-radius:12px;box-shadow:0 1px 3px #16243a04}
        .fleet-label{font-size:11px;margin-bottom:4px}
        .fleet-field{min-height:36px;padding:7px 9px;border-radius:8px;font-size:12px}
        .fleet-field:disabled{background:#f1f4f8;color:#8a97aa}
        .fleet-filter-note{font-size:11px;margin-bottom:10px!important}
        .fleet-delivery-summary{display:block;padding:14px;margin-bottom:14px;border-radius:12px}
        .fleet-delivery-heading{text-align:left;font-size:15px;margin-bottom:10px!important}
        .fleet-delivery-cards{grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
        .fleet-delivery-card{position:relative;padding:12px 14px;border:1px solid #e1e8f2;border-radius:10px;box-shadow:none;text-align:left;background:linear-gradient(135deg,#fff,#f8faff)}
        .fleet-delivery-label{font-size:12px}
        .fleet-delivery-label small{display:inline;margin-left:5px;font-size:10px}
        .fleet-delivery-number{justify-content:flex-start;gap:10px;margin-top:8px}
        .fleet-delivery-number svg{width:26px;height:26px}
        .fleet-delivery-number strong{font-size:27px;font-variant-numeric:tabular-nums}
        .fleet-delivery-unit{display:inline;margin-left:5px;font-size:10px}
        .fleet-delivery-progress-row{margin-top:8px;gap:8px}
        .fleet-delivery-progress-track{height:6px}
        .fleet-delivery-percent{font-size:11px}
        .fleet-delivery-note{margin-top:8px!important;font-size:10px}
        .fleet-panels{grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:14px;align-items:stretch}
        .fleet-panel{border-radius:12px;box-shadow:0 2px 7px #16243a04}
        .fleet-panel-header{gap:10px;padding:12px 14px}
        .fleet-panel h3{font-size:13px}
        .fleet-panel-description{font-size:11px;line-height:1.45}
        .fleet-panel-content{padding:12px 14px}
        .fleet-chart{min-width:520px;width:100%;height:290px}
        .fleet-chart-scroll{overflow-x:auto}
        .fleet-legend{font-size:10px;gap:12px;margin-top:8px}
        .fleet-legend i{width:7px;height:7px}
        .fleet-empty{min-height:190px;padding:18px;font-size:12px}
        .fleet-warehouse-list{max-height:290px;padding-right:4px;scrollbar-width:thin}
        .fleet-warehouse{padding:9px 0}
        .fleet-row{gap:8px;margin-bottom:5px}
        .fleet-warehouse-name{font-size:12px}
        .fleet-row-meta{font-size:10px}
        .fleet-bar{height:7px}
        .fleet-warehouse-detail{font-size:10px;margin-top:5px}
        .fleet-stage-panel{margin-top:14px;margin-bottom:12px}
        .fleet-stage-scroll{max-height:480px;scrollbar-width:thin}
        .fleet-stage-table{min-width:640px}
        .fleet-stage-table th,.fleet-stage-table td{padding:7px 9px;font-size:11px;border-color:#e4eaf2}
        .fleet-stage-table thead th{min-width:115px;line-height:1.45;font-size:10px;background:#334761}
        .fleet-stage-table thead th:first-child{min-width:70px;text-align:center}
        .fleet-stage-table thead th:nth-child(2){min-width:155px;text-align:left}
        .fleet-stage-table .fleet-dc-merged{min-width:70px;background:#eef3f9;font-size:12px}
        .fleet-stage-table .fleet-dc-group td{padding:7px 9px;background:#e7edf5;font-size:11px}
        .fleet-stage-table tbody tr:hover td,.fleet-stage-table tbody tr:hover th:not(.fleet-dc-merged){background:#f3f7ff}
        .fleet-vendor-chip{padding:1px 7px;margin:1px 3px 1px 0;font-size:9px;background:#fff2c6}
        .fleet-stage-count{font-size:12px;margin-top:2px}
        .fleet-footer{margin-top:10px;font-size:10px;gap:8px}
        @media(max-width:1200px){.fleet-filters{grid-template-columns:repeat(4,minmax(0,1fr))}.fleet-chart{height:270px}.fleet-row{align-items:flex-start;flex-wrap:wrap}}
        @media(max-width:900px){.fleet-dashboard{padding:14px}.fleet-panels{grid-template-columns:1fr}.fleet-delivery-summary{display:block}.fleet-chart{height:280px}.fleet-warehouse-list{max-height:240px}}
        @media(max-width:540px){.fleet-dashboard{padding:10px;border-radius:12px}.fleet-dashboard h2{font-size:18px}.fleet-heading{gap:10px}.fleet-filters{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;padding:10px}.fleet-delivery-cards{grid-template-columns:1fr;gap:8px}.fleet-delivery-card{padding:10px 12px}.fleet-delivery-number strong{font-size:25px}.fleet-panel-header,.fleet-panel-content{padding:10px 12px}.fleet-chart{height:260px}.fleet-delivery-heading{font-size:14px}}

        /* Refined, compact visual hierarchy */
        .fleet-dashboard{background:#f4f7fb;border-color:#e1e8f0;color:#1d2d44;box-shadow:0 8px 28px #18345406}
        .fleet-heading{padding:2px 0 4px}
        .fleet-eyebrow{color:#527294;font-weight:750;letter-spacing:1.8px}
        .fleet-button-primary{background:#244e78;border-color:#244e78;box-shadow:0 2px 5px #244e7818}
        .fleet-button-primary:hover{background:#193f66}
        .fleet-filters{background:#fff;border:1px solid #e1e8f0}
        .fleet-field{background:#f8fafc;border-color:#dfe7f0;transition:border-color .15s,box-shadow .15s}
        .fleet-field:hover:not(:disabled){border-color:#9eb7ce}
        .fleet-field:focus{border-color:#648bab;box-shadow:0 0 0 3px #648bab14}
        .fleet-delivery-summary{border:0;background:transparent;padding:0;box-shadow:none}
        .fleet-delivery-heading{font-size:13px;color:#53677f;margin-bottom:8px!important}
        .fleet-delivery-card{background:#fff;border-color:#e1e8f0;box-shadow:0 3px 10px #18345404;overflow:hidden}
        .fleet-delivery-card:before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:#6887a8}
        .fleet-delivery-card:nth-child(2):before{background:#10b981}
        .fleet-delivery-card:nth-child(3):before{background:#f59e0b}
        .fleet-delivery-number svg{padding:4px;width:30px;height:30px;border-radius:8px;background:#f1f5fa}
        .fleet-panel-header{background:#fcfdff;border-bottom-color:#e8edf4}
        .fleet-panel h3{color:#233d58;letter-spacing:.1px}
        .fleet-stage-table thead th{background:#2c435e;font-weight:650;border-color:#465b73}
        .fleet-stage-table thead th:first-child{border-top-left-radius:0}
        .fleet-stage-table .fleet-dc-group td{background:#edf2f8;color:#344e69}
        .fleet-stage-table .fleet-dc-merged{background:#f4f7fb;color:#335677;letter-spacing:.5px}
        .fleet-stage-table .fleet-stage-total{background:#f1f5fa;color:#244e78}
        .fleet-count-button{display:inline-flex;align-items:center;justify-content:center;min-width:30px;min-height:26px;padding:2px 7px;border:1px solid transparent;border-radius:6px;background:#edf3fa;color:#315879;font-size:12px;font-weight:750;cursor:pointer;font-variant-numeric:tabular-nums}
        .fleet-count-button:hover,.fleet-count-button:focus-visible{background:#dbe9f7;border-color:#aac7e2;color:#163f67}
        .fleet-stage-completed .fleet-count-button{background:#e2f4e9;color:#078456}
        .fleet-cell-empty{color:#bac5d2}
        .fleet-vendor-tooltip{position:fixed;z-index:10000;width:288px;max-width:calc(100vw - 24px);max-height:220px;overflow:auto;padding:12px 14px;border:1px solid #dce6f1;border-radius:10px;background:#fff;color:#334a63;box-shadow:0 10px 32px #172d4d26;pointer-events:none}
        .fleet-vendor-tooltip-heading{font-size:11px;font-weight:750;color:#6b7e93;margin-bottom:8px;padding-bottom:7px;border-bottom:1px solid #edf1f6}
        .fleet-vendor-tooltip-row{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding:4px 0;font-size:12px;line-height:1.5}
        .fleet-vendor-tooltip-row span{overflow-wrap:anywhere}
        .fleet-vendor-tooltip-row strong{white-space:nowrap;color:#244e78;font-size:12px}

        /* Calm color-coded stage table */
        .fleet-stage-panel{border:1px solid #dce5f0;border-radius:14px;box-shadow:0 4px 16px #19345106}
        .fleet-stage-panel>.fleet-panel-header{padding:14px 16px;background:#fff;border-bottom:1px solid #e5ebf3}
        .fleet-stage-panel h3{font-size:14px;font-weight:750;color:#203b58}
        .fleet-stage-scroll{background:#fff;max-height:520px}
        .fleet-stage-table{table-layout:auto;border-collapse:separate;border-spacing:0}
        .fleet-stage-table th,.fleet-stage-table td{padding:9px 10px;border-right:0;border-bottom:1px solid #edf1f6}
        .fleet-stage-table thead th{background:#f1f5fa;color:#425b76;border-bottom:2px solid #dce5f0;min-width:135px;padding:13px 10px;font-size:11px;line-height:1.5}
        .fleet-stage-table thead th:first-child{min-width:80px;width:80px;background:#eaf0f7}
        .fleet-stage-table thead th:nth-child(2){min-width:165px;background:#f1f5fa}
        .fleet-step-label{display:inline-flex;margin-bottom:7px;padding:2px 8px;border-radius:6px;background:#dfeaf7;color:#3e6791;font-size:9px;font-weight:800;letter-spacing:.6px}
        .fleet-step-name{display:block;max-width:175px;margin:0 auto;font-weight:650;color:#354d67}
        .fleet-stage-table thead th[data-stage="8"]{background:#edf8f2;border-bottom-color:#b9e3cc}
        .fleet-stage-table th[data-stage="8"] .fleet-step-label{background:#d2efdf;color:#08774e}
        .fleet-stage-table thead th[data-stage="9"],.fleet-stage-table thead th[data-stage="10"]{background:#fff3f2;border-bottom-color:#f0d2cf}
        .fleet-stage-table th[data-stage="9"] .fleet-step-label,.fleet-stage-table th[data-stage="10"] .fleet-step-label{background:#fbe0dc;color:#a9473d}
        .fleet-stage-table .fleet-total-heading{background:#edf1fa;color:#395a85;min-width:80px}
        .fleet-header-unit{display:block;font-size:9px;font-weight:500;color:#7f91a8;margin-top:3px}
        .fleet-stage-table .fleet-dc-group td{padding:9px 12px;background:#f3f6fb;color:#36516f;border-top:1px solid #e2eaf3;border-bottom:1px solid #e2eaf3;font-weight:750;font-size:11px}
        .fleet-warehouse-marker{display:inline-block;width:5px;height:13px;margin-right:8px;vertical-align:middle;border-radius:3px;background:#829fc0}
        .fleet-group-quantity{float:right;color:#7c8fa5;font-size:10px;font-weight:500}
        .fleet-stage-table .fleet-dc-merged{background:#f7f9fc;border-right:1px solid #e5ebf3;vertical-align:middle;text-align:center;padding:12px 8px}
        .fleet-dc-pill{display:inline-flex;align-items:center;justify-content:center;min-width:46px;padding:6px 9px;border-radius:8px;background:#e5edf8;color:#365f8c;font-size:11px;font-weight:800;letter-spacing:.4px}
        .fleet-stage-table .fleet-truck-row th{padding-left:16px;font-size:11px;font-weight:600;background:#fff;color:#4d627b}
        .fleet-truck-label{display:inline-block;max-width:190px;white-space:normal;line-height:1.45}
        .fleet-stage-table .fleet-truck-row td{background:#fff}
        .fleet-stage-table .fleet-truck-row:hover td,.fleet-stage-table .fleet-truck-row:hover th{background:#f5f9ff}
        .fleet-stage-table .fleet-truck-row td.fleet-stage-completed{background:#f5fbf7}
        .fleet-count-button{min-width:32px;min-height:28px;border-radius:7px;border:1px solid #e1eaf5;background:#edf3fa;color:#345f8b;box-shadow:none;font-size:12px;font-weight:750;transition:background .15s,border-color .15s}
        .fleet-count-button:hover{background:#dceafb;border-color:#a9c8e8}
        .fleet-stage-completed .fleet-count-button{background:#e2f4e9;border-color:#cce7d6;color:#08774e}
        .fleet-stage-table td[data-stage="9"] .fleet-count-button,.fleet-stage-table td[data-stage="10"] .fleet-count-button{background:#fff0ed;border-color:#f1d9d3;color:#aa5345}
        .fleet-stage-table .fleet-truck-row td.fleet-stage-total{background:#f3f6fc;color:#355c89;border-left:1px solid #e5ebf3;font-size:12px;font-weight:800}
        .fleet-cell-empty{font-size:11px;color:#c7d0dc}
        @media(prefers-reduced-motion:reduce){.fleet-count-button{transition:none}}

        .fleet-stage-layout{display:grid;grid-template-columns:minmax(0,2fr) minmax(360px,1fr);gap:16px;align-items:start;margin-top:14px;margin-bottom:12px}
        .fleet-stage-layout .fleet-stage-panel{margin:0}
        .fleet-step-toggle{flex-shrink:0;border:0;background:transparent;color:#8593a5;font-size:11px!important;padding:4px 6px;border-radius:5px;cursor:pointer;white-space:nowrap}
        .fleet-step-toggle:hover{background:#f1f5f9;color:#53677f}
        .fleet-six-month-panel .fleet-panel-header{padding:16px}
        .fleet-six-month-unit{font-size:11px;color:#8796a8}
        .fleet-six-month-scroll{overflow:auto;padding:0 12px 12px}
        .fleet-six-month-table{width:100%;border-collapse:collapse;font-size:11px;font-variant-numeric:tabular-nums}
        .fleet-six-month-table th,.fleet-six-month-table td{padding:11px 6px;text-align:center;border-bottom:1px solid #edf1f6;white-space:nowrap}
        .fleet-six-month-table thead th{background:#f7f9fc;color:#60748c;font-size:10px;font-weight:600}
        .fleet-six-month-table thead th span{display:block;font-size:8px;color:#94a3b8}
        .fleet-six-month-table th:first-child{text-align:left}
        .fleet-six-month-table tbody th{font-weight:500;color:#53677f}
        .fleet-six-month-table tbody tr:hover{background:#f8fbff}
        .fleet-six-month-total{font-weight:700;color:#355e8a;background:#f6f9fe}
        .fleet-six-month-table tfoot{background:#edf4fc;color:#355e8a;font-weight:750}
        .fleet-six-month-note{font-size:10px;color:#91a0b1;margin-top:10px!important}
        @media(max-width:1100px){.fleet-stage-layout{grid-template-columns:1fr}.fleet-six-month-panel{width:100%}}

        .fleet-stage-layout{display:block}
        .fleet-stage-table .fleet-month-column{min-width:75px;background:#f8fbff;color:#486888}
        .fleet-stage-table thead th.fleet-month-column{background:#eef4fb}
        .fleet-stage-table .fleet-month-start{border-left:3px solid #ccd9e8}

        .fleet-stage-layout{display:grid;grid-template-columns:minmax(0,2fr) minmax(350px,1fr);gap:14px;align-items:start}
        .fleet-stage-layout>.fleet-panel>.fleet-panel-header{height:92px;padding:14px 16px}
        .fleet-stage-layout .fleet-panel-description{max-height:38px;overflow:hidden}
        .fleet-stage-layout .fleet-stage-scroll{height:480px;max-height:480px;overflow:auto}
        .fleet-stage-layout .fleet-stage-table thead tr{height:108px}
        .fleet-stage-layout .fleet-stage-table thead th{height:108px;max-width:160px}
        .fleet-stage-layout .fleet-stage-table .fleet-truck-row{height:44px}
        .fleet-stage-layout .fleet-stage-table .fleet-truck-row>th,.fleet-stage-layout .fleet-stage-table .fleet-truck-row>td{height:44px;padding:6px 9px;white-space:nowrap}
        .fleet-stage-layout .fleet-stage-table .fleet-dc-group{height:36px}
        .fleet-stage-layout .fleet-stage-table .fleet-dc-group>td{height:36px;padding:6px 9px;white-space:nowrap}
        .fleet-stage-layout .fleet-month-table{min-width:420px;table-layout:fixed}
        .fleet-stage-layout .fleet-month-table thead th{min-width:70px;text-align:center}
        .fleet-month-table .fleet-truck-row td{color:#486888;font-weight:650}
        @media(max-width:800px){.fleet-stage-layout{grid-template-columns:minmax(540px,2fr) minmax(350px,1fr);overflow-x:auto}}

        .fleet-locked-table{--dc-lock-width:82px}
        .fleet-locked-table .fleet-lock-dc{position:sticky;left:0;width:var(--dc-lock-width);min-width:var(--dc-lock-width)!important;max-width:var(--dc-lock-width);z-index:4;background:#f4f7fb}
        .fleet-locked-table .fleet-lock-truck{position:sticky;left:var(--dc-lock-width);min-width:170px!important;z-index:3;background:#fff;box-shadow:3px 0 5px #233a5710}
        .fleet-locked-table thead th.fleet-lock-dc,.fleet-locked-table thead th.fleet-lock-truck{top:0;z-index:6;background:#f7f9fc}
        .fleet-locked-table .fleet-dc-group th.fleet-lock-warehouse{height:36px;padding:6px 9px;background:#edf2f8;color:#344e69;font-weight:750;white-space:nowrap}
        .fleet-locked-table .fleet-dc-group .fleet-lock-warehouse{max-width:220px;overflow:hidden;text-overflow:ellipsis}

        .fleet-stage-layout .fleet-stage-table thead tr,.fleet-stage-layout .fleet-stage-table thead th{height:62px}
        .fleet-stage-layout .fleet-stage-table thead th{background:#40556d!important;color:#fff;border-right:1px solid #93a2b4;border-bottom:1px solid #b9c4d0;border-radius:0;padding:8px 9px;font-size:11px;line-height:1.45;font-weight:650}
        .fleet-stage-layout .fleet-stage-table thead .fleet-step-name{color:#fff;font-size:11px;font-weight:650;margin:0;line-height:1.45}
        .fleet-stage-layout .fleet-stage-table thead .fleet-header-unit{color:#dbe4ee}
        .fleet-stage-layout .fleet-month-table thead th{white-space:nowrap}
      `}</style>
      <header className="fleet-heading">
        <div>
          <div className="fleet-eyebrow">FLEET OVERVIEW</div>
          <h2>{displayTitle}</h2>
          <p className="fleet-subtitle">
            ภาพรวมคำขอและการส่งมอบกองรถ แยกตามคลัง
          </p>
        </div>
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
      <div className="fleet-filters">
        <label><span className="fleet-label">ปี</span><select className="fleet-field" value={selectedYear} onChange={e => { setSelectedYear(Number(e.target.value)); setHoveredMonth(null); }}>{yearOptions.map(year => <option key={year} value={year}>{year}</option>)}</select></label>
        <label><span className="fleet-label">เดือน</span><select className="fleet-field" value={monthFilter} onChange={e => setMonthFilter(e.target.value)}><option value="all">ทุกเดือน</option>{MONTH_NAMES.map((month,index) => <option key={month} value={String(index+1).padStart(2,"0")}>{month}</option>)}</select></label>
        <label><span className="fleet-label">กลุ่ม DC</span><select className="fleet-field" value={dcTypeFilter} onChange={e => setDcTypeFilter(e.target.value)}><option value="all">ทุกกลุ่ม DC</option>{dcTypeOptions.map(type => <option key={type} value={type}>{type}</option>)}</select></label>
        <label><span className="fleet-label">พื้นที่</span><select className="fleet-field" value={areaFilter} disabled={filterOptions.areas.length === 0} onChange={e => setAreaFilter(e.target.value)}><option value="all">{filterOptions.areas.length ? "ทุกพื้นที่" : "ไม่พบพื้นที่"}</option>{filterOptions.areas.map(area => <option key={area} value={area}>{area}</option>)}</select></label>
        <label><span className="fleet-label">FBP</span><select className="fleet-field" value={fbpFilter} disabled={filterOptions.fbps.length === 0} onChange={e => setFbpFilter(e.target.value)}><option value="all">{filterOptions.fbps.length ? "ทุก FBP" : "ไม่พบ FBP"}</option>{filterOptions.fbps.map(fbp => <option key={fbp.id} value={fbp.id}>{fbp.name}</option>)}</select></label>
        <label><span className="fleet-label">สถานะงาน</span><select className="fleet-field" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">ทุกสถานะ</option>{filterOptions.statuses.map(status => <option key={status} value={status}>{FLEET_STATUSES.find(item => item.key === status)?.label ?? status}</option>)}</select></label>
        <label><span className="fleet-label">ประเภทรถ</span><select className="fleet-field" value={truckTypeFilter} onChange={e => setTruckTypeFilter(e.target.value)}><option value="all">ทุกประเภทรถ</option>{filterOptions.trucks.map(type => <option key={type} value={type}>{type}</option>)}</select></label>
        <label><span className="fleet-label">ประเภทคำขอ</span><select className="fleet-field" value={requestTypeFilter} onChange={e => setRequestTypeFilter(e.target.value)}><option value="all">ทุกประเภทคำขอ</option>{requestTypeFilter !== "all" && !requestTypeOptions.includes(requestTypeFilter) && <option value={requestTypeFilter}>{requestTypeFilter}</option>}{requestTypeOptions.map(type => <option key={type} value={type}>{type}</option>)}</select></label>
        <button className="fleet-button" type="button" disabled={!hasFilters} onClick={resetFilters}>ล้างตัวกรอง</button>
      </div>
      <p className="fleet-filter-note">ปีและเดือนกรองตามวันที่สร้างคำขอ (request_date) · กราฟแสดง ม.ค.–ธ.ค. ของปีที่เลือก</p>
      {hasFilters && (
        <p className="fleet-filter-note">
          แสดงผลตามตัวกรองที่เลือก · {dcSummary.length} คลัง
        </p>
      )}
      {activeError && (
        <div className="fleet-error" role="alert">
          <strong>โหลดข้อมูลไม่สำเร็จ</strong>
          <p>{activeError}</p>
        </div>
      )}
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
                จำนวนรถรวมตามตัวกรอง
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
            <article className="fleet-delivery-card">
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
                  aria-label={`กราฟแผนและยอดส่งมอบสะสม January ถึง December ปี ${activeYear}`}
                  onMouseLeave={() => setHoveredMonth(null)}
                >
                  {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
                    <g key={ratio}>
                      <line
                        x1="48"
                        x2="752"
                        y1={220 - ratio * 184}
                        y2={220 - ratio * 184}
                        stroke="#e8eef6"
                        strokeDasharray="3 4"
                      />
                      <text
                        x="38"
                        y={224 - ratio * 184}
                        textAnchor="end"
                        fill="#7c8ca2"
                        fontSize="11"
                      >
                        {formatNumber(
                          Number((timelineMax * ratio).toFixed(2)),
                        )}
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
    `ส่งมอบจริงสะสม: ${
      point.actual === null
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
        {point.label.slice(0, 3)}
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
        <title>{tooltip}</title>
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
                        <text x={x + 16} y="163" fill="#62738a" fontSize="10">สถานะปัจจุบันตามตัวกรอง ไม่ใช่ประวัติของเดือน</text>
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
      <div className="fleet-stage-layout">
      <article className="fleet-panel fleet-stage-panel">
        <div className="fleet-panel-header"><div><h3>ประเภทรถแยกตามขั้นตอน</h3><p className="fleet-panel-description">{dcTypeFilter === "all" ? "ทุกประเภทคลัง" : dcTypeFilter} · จัดกลุ่มตามคลังและประเภทรถ · นับขั้นตอนปัจจุบันของแต่ละคัน · ยอดรวมรวมทุกขั้นตอน</p></div><button type="button" className="fleet-step-toggle" aria-expanded={showClosedSteps} onClick={() => { setShowClosedSteps(open => !open); setVendorTooltip(null); }}>{showClosedSteps ? "▾ ซ่อน STEP 9–10" : "▸ แสดง STEP 9–10"}</button></div>
        {isLoading || activeError || stageGroups.length === 0 ? <div className="fleet-empty">{isLoading ? "กำลังโหลดข้อมูล..." : activeError ? "ไม่สามารถแสดงข้อมูลได้" : "ไม่พบข้อมูลตามตัวกรอง"}</div> : <div className="fleet-stage-scroll" ref={stageScrollRef} onScroll={event => { setVendorTooltip(null); if (monthScrollRef.current && monthScrollRef.current.scrollTop !== event.currentTarget.scrollTop) monthScrollRef.current.scrollTop = event.currentTarget.scrollTop; }}>
          <table className="fleet-stage-table fleet-locked-table">
            <thead><tr><th scope="col" className="fleet-lock-dc">กลุ่ม DC</th><th scope="col" className="fleet-lock-truck">คลัง / ประเภทรถ</th>{visibleStageColumns.map(column => <th key={column.key} scope="col" data-stage={column.level}><span className="fleet-step-name">{column.level ? `[${column.level}] ` : ""}{column.name}</span></th>)}<th scope="col" className="fleet-total-heading">รวม<span className="fleet-header-unit">จำนวนคัน</span></th></tr></thead>
            <tbody>{stageGroups.map(([key, group], groupIndex) => <Fragment key={key}>
              <tr className="fleet-dc-group">
                {(groupIndex === 0 || stageGroups[groupIndex - 1][1].dcType !== group.dcType) && <th className="fleet-dc-merged fleet-lock-dc" scope="rowgroup" rowSpan={stageGroups.filter(([, item]) => item.dcType === group.dcType).reduce((sum, [, item]) => sum + 1 + item.trucks.size, 0)}><span className="fleet-dc-pill">{group.dcType}</span></th>}
                <th scope="row" className="fleet-lock-truck fleet-lock-warehouse"><span className="fleet-warehouse-marker" aria-hidden="true" />{group.dcCode}</th><td colSpan={visibleStageColumns.length + 1}><span className="fleet-group-quantity">{formatNumber(Array.from(group.trucks.values()).reduce((sum, truck) => sum + truck.total, 0))} คัน</span></td>
              </tr>
              {Array.from(group.trucks.values()).sort((a,b) => a.truckType.localeCompare(b.truckType)).map(truck => <tr key={truck.truckType} className="fleet-truck-row">
                <th scope="row" className="fleet-lock-truck"><span className="fleet-truck-label">{truck.truckType}</span></th>
                {visibleStageColumns.map(column => {
                  const cell = truck.stages.get(column.key);
                  return <td key={column.key} data-stage={column.level} className={column.level === "8" ? "fleet-stage-completed" : undefined}>
                    {cell ? <button
                      type="button"
                      className="fleet-count-button"
                      aria-label={`${formatNumber(cell.count)} คัน · ${Array.from(cell.vendors.entries()).map(([name, count]) => `${name}: ${formatNumber(count)} คัน`).join(", ")}`}
                      onMouseEnter={event => {
                        const box = event.currentTarget.getBoundingClientRect();
                        setVendorTooltip({ left: Math.max(12, Math.min(window.innerWidth - 300, box.left)), top: box.bottom + 8, entries: Array.from(cell.vendors.entries()).sort((a,b) => a[0].localeCompare(b[0], "th")), companies: Array.from(cell.companies.entries()).sort((a,b) => a[0].localeCompare(b[0], "th")) });
                      }}
                      onMouseLeave={() => setVendorTooltip(null)}
                      onFocus={event => {
                        const box = event.currentTarget.getBoundingClientRect();
                        setVendorTooltip({ left: Math.max(12, Math.min(window.innerWidth - 300, box.left)), top: box.bottom + 8, entries: Array.from(cell.vendors.entries()).sort((a,b) => a[0].localeCompare(b[0], "th")), companies: Array.from(cell.companies.entries()).sort((a,b) => a[0].localeCompare(b[0], "th")) });
                      }}
                      onBlur={() => setVendorTooltip(null)}
                      onKeyDown={event => { if (event.key === "Escape") setVendorTooltip(null); }}
                    >{formatNumber(cell.count)}</button> : <span className="fleet-cell-empty">—</span>}
                  </td>;
                })}
                <td className="fleet-stage-total">{formatNumber(truck.total)}</td>
              </tr>)}
            </Fragment>)}</tbody>
          </table>
        </div>}
      </article>

      <article className="fleet-panel fleet-month-panel">
        <div className="fleet-panel-header"><div><h3>สรุป 6 เดือน</h3><p className="fleet-panel-description">STEP 2–7 · ตามวันที่สร้างคำขอ</p></div></div>
        {isLoading || activeError || stageGroups.length === 0 ? <div className="fleet-empty">{isLoading ? "กำลังโหลดข้อมูล..." : activeError ? "ไม่สามารถแสดงข้อมูลได้" : "ไม่พบข้อมูลตามตัวกรอง"}</div> : <div className="fleet-stage-scroll" ref={monthScrollRef} onScroll={event => { setVendorTooltip(null); if (stageScrollRef.current && stageScrollRef.current.scrollTop !== event.currentTarget.scrollTop) stageScrollRef.current.scrollTop = event.currentTarget.scrollTop; }}>
          <table className="fleet-stage-table fleet-month-table"><thead><tr>{sixMonthSummary.map(month => <th key={month.key} scope="col"><span className="fleet-step-name">{month.label}</span></th>)}</tr></thead>
          <tbody>{stageGroups.map(([key,group]) => <Fragment key={key}>
            <tr className="fleet-dc-group"><td colSpan={6}><span className="fleet-warehouse-marker" aria-hidden="true" />{group.dcCode}</td></tr>
            {Array.from(group.trucks.values()).sort((a,b) => a.truckType.localeCompare(b.truckType)).map(truck => <tr key={truck.truckType} className="fleet-truck-row">{sixMonthSummary.map(month => {
              const count = monthlyTruckCounts.get(JSON.stringify([group.dcType,group.dcCode,truck.truckType]))?.get(month.key) ?? 0;
              return <td key={month.key} title={`${group.dcCode} · ${truck.truckType} · ${month.label}: ${count} คัน`}>{count ? formatNumber(count) : <span className="fleet-cell-empty">—</span>}</td>;
            })}</tr>)}
          </Fragment>)}</tbody></table>
        </div>}
      </article>

      </div>

      {vendorTooltip && <div className="fleet-vendor-tooltip" role="tooltip" style={{ left: vendorTooltip.left, top: vendorTooltip.top }}>
        <div className="fleet-vendor-tooltip-heading">บริษัทขนส่ง · จำนวนรถ</div>
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
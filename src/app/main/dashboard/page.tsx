"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  id: number | string | null;
  dc_code: string | null;
  dc_type?: string | null;
  fleet_type?: string | null;
  status: string | null;
  qty: number | string | null;
  workload?: number | string | null;
  latest_process_name?: string | null;
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
  label: string;
  planned: number;
  actual: number | null;
}
const FLEET_STATUSES = [
  { key: "success", label: "เสร็จสิ้น", color: "#059669" },
  { key: "progress", label: "คำขอรอพิจารณา", color: "#2563eb" },
  { key: "cancel", label: "ไม่ผ่านกระบวนการ", color: "#e11d48" },
  { key: "partial_approved", label: "อนุมัติบางส่วน", color: "#d97706" },
  { key: "fbp_pending", label: "FBP จัดรถเรียบร้อยแล้ว", color: "#7c3aed" },
  { key: "reject_by_fbp", label: "FBP ไม่อนุมัติ", color: "#dc2626" },
] as const;
interface Props {
  initialFleetType?: string;
  /** Optional manual override; omit to build from warehouse and flow records. */
  timeline?: TimelinePoint[];
  warehouseRecords?: WarehouseRecord[];
  flowRecords?: FlowRecord[];
  /** Needed when flow records expose process_id but not process_level. */
  processes?: ProcessDefinition[];
  title?: string;
  requests?: FleetRequest[];
  apiUrl?: string;
  dashboardApiUrl?: string;
}
const COMPLETED_STATUS = "success";
function groupFleetByDc(requests: FleetRequest[]): DcSummary[] {
  const groups = new Map<string, DcSummary>();
  requests.forEach((item) => {
    const dcCode = String(item.dc_code || "").trim() || "ไม่ระบุคลัง";
    const qty = Number(item.qty);
    if (!Number.isFinite(qty) || qty <= 0) return;
    const current = groups.get(dcCode) || {
      dcCode,
      green: 0,
      red: 0,
      total: 0,
    };
    if (item.status === COMPLETED_STATUS) {
      current.green += qty;
    } else {
      current.red += qty;
    }
    current.total += qty;
    groups.set(dcCode, current);
  });
  return Array.from(groups.values()).sort((a, b) =>
    a.dcCode.localeCompare(b.dcCode, "th"),
  );
}
function isRequest(value: unknown): value is FleetRequest {
  return (
    typeof value === "object" &&
    value !== null &&
    "dc_code" in value &&
    "qty" in value &&
    "status" in value
  );
}
function readFleetRequests(value: unknown): FleetRequest[] {
  if (Array.isArray(value)) {
    if (!value.every(isRequest)) {
      throw new Error("รายการข้อมูลไม่มี dc_code, qty หรือ status");
    }
    return value;
  }
  if (isRequest(value)) return [value];
  if (typeof value === "object" && value !== null) {
    const data = value as Record<string, unknown>;
    for (const key of [
      "data",
      "result",
      "requests",
      "request",
      "items",
      "results",
    ]) {
      if (data[key] !== undefined && data[key] !== null) {
        return readFleetRequests(data[key]);
      }
    }
  }
  throw new Error("รูปแบบข้อมูล API ไม่ตรงกับที่รองรับ");
}

const EMPTY_WAREHOUSE: WarehouseRecord[] = [];
const EMPTY_FLOW: FlowRecord[] = [];
const EMPTY_PROCESSES: ProcessDefinition[] = [];
function calendarDate(value: string | null | undefined): string | null {
  if (!value) return null;
  // Keep the database calendar date, without shifting it through UTC.
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T ])/ .exec(value.trim());
  if (!match) return null;
  const day = `${match[1]}-${match[2]}-${match[3]}`;
  const date = new Date(`${day}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day ? day : null;
}
function vehicleKey(requestId: FleetId | undefined, vehicleNo: number | string | null): string | null {
  const id = String(requestId ?? "").trim();
  const no = String(vehicleNo ?? "").trim();
  return id && no ? JSON.stringify([id, no]) : null;
}
function asRecords<T>(value: T | T[] | null | undefined): T[] {
  return value == null ? [] : Array.isArray(value) ? value : [value];
}
/** Count one vehicle per request_id + vehicle_no, never multiply by request.qty. */
function buildDeliveryTimeline(
  requests: FleetRequest[],
  warehouseRecords: WarehouseRecord[] = EMPTY_WAREHOUSE,
  flowRecords: FlowRecord[] = EMPTY_FLOW,
  processes: ProcessDefinition[] = EMPTY_PROCESSES,
): TimelinePoint[] {
  const requestIds = new Set(requests.map(row => String(row.id ?? "").trim()).filter(Boolean));
  const levels = new Map(processes.map(row => [String(row.id).trim(), String(row.process_level).trim()]));
  const plannedDates = new Map<string, string>();
  const actualDates = new Map<string, string>();
  const warehouses = requests.flatMap<WarehouseRecord>(request =>
    asRecords(request.vehicle_warehouse_info ?? request.vehicle_info).map(row => ({ ...row, request_id: row.request_id ?? request.id }))
  ).concat(warehouseRecords);
  const flows = requests.flatMap<FlowRecord>(request =>
    asRecords(request.flow_data).map(row => ({ ...row, request_id: row.request_id ?? request.id }))
  ).concat(flowRecords);
  for (const row of warehouses) {
    if (!requestIds.has(String(row.request_id ?? "").trim())) continue;
    const key = vehicleKey(row.request_id, row.vehicle_no);
    const day = calendarDate(row.warehouse_plan_date);
    if (key && day) plannedDates.set(key, day);
  }
  for (const row of flows) {
    if (!requestIds.has(String(row.request_id ?? "").trim())) continue;
    const level = row.process_level == null ? levels.get(String(row.process_id ?? "").trim()) : String(row.process_level).trim();
    if (level !== "8") continue;
    const key = vehicleKey(row.request_id, row.vehicle_no);
    const day = calendarDate(row.str_date);
    // Repeated stage-8 history counts once, at the first recorded start date.
    if (key && day && (!actualDates.has(key) || day < actualDates.get(key)!)) actualDates.set(key, day);
  }
  const plannedByDay = new Map<string, number>();
  const actualByDay = new Map<string, number>();
  for (const day of plannedDates.values()) plannedByDay.set(day, (plannedByDay.get(day) ?? 0) + 1);
  for (const day of actualDates.values()) actualByDay.set(day, (actualByDay.get(day) ?? 0) + 1);
  const days = Array.from(new Set([...plannedByDay.keys(), ...actualByDay.keys()])).sort();
  const lastActual = Array.from(actualByDay.keys()).sort().slice(-1)[0];
  let planned = 0;
  let actual = 0;
  return days.map(day => {
    planned += plannedByDay.get(day) ?? 0;
    actual += actualByDay.get(day) ?? 0;
    return { label: day, planned, actual: lastActual && day <= lastActual ? actual : null };
  });
}

interface DashboardRecords {
  warehouseRecords: WarehouseRecord[];
  flowRecords: FlowRecord[];
}
function readDashboardRecords(value: unknown): DashboardRecords {
  if (typeof value !== "object" || value === null) throw new Error("ข้อมูล Dashboard ไม่ถูกต้อง");
  const root = value as Record<string, unknown>;
  if (root.status === "error" || root.success === false) {
    throw new Error(typeof root.message === "string" ? root.message : "โหลด Dashboard ไม่สำเร็จ");
  }
  const data = (root.data ?? root) as Record<string, unknown>;
  if (typeof data !== "object" || data === null || !Array.isArray(data.warehouse_records) || !Array.isArray(data.flow_records)) {
    throw new Error("get_dashboard.php ต้องส่ง data.warehouse_records และ data.flow_records");
  }
  const warehouses = data.warehouse_records;
  const flows = data.flow_records;
  const validRow = (row: unknown): row is Record<string, unknown> => typeof row === "object" && row !== null && "request_id" in row && "vehicle_no" in row;
  if (!warehouses.every(row => validRow(row) && (row.warehouse_plan_date == null || typeof row.warehouse_plan_date === "string")) ||
      !flows.every(row => validRow(row) && (row.str_date == null || typeof row.str_date === "string") && (typeof row.process_level === "string" || typeof row.process_level === "number"))) {
    throw new Error("รายการ Dashboard ต้องมี request_id, vehicle_no และ process_level สำหรับข้อมูลจริง");
  }
  return { warehouseRecords: warehouses as WarehouseRecord[], flowRecords: flows as FlowRecord[] };
}
const formatNumber = (value: number) => value.toLocaleString("en-US");
const percentage = (value: number, total: number) =>
  total > 0 ? (value / total) * 100 : 0;
function FleetStatusByDc({
  timeline: suppliedTimeline,
  warehouseRecords: suppliedWarehouseRecords,
  flowRecords: suppliedFlowRecords,
  processes = EMPTY_PROCESSES,
  title,
  initialFleetType = "all",
  requests: suppliedRequests,
  apiUrl = "http://192.168.158.210/api_new_truck/api/request_get.php",
  dashboardApiUrl = "http://192.168.158.210/api_new_truck/api/get_dashboard.php",
}: Props = {}) {
  const [requests, setRequests] = useState<FleetRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [dcFilter, setDcFilter] = useState("all");
  const [requestTypeFilter, setRequestTypeFilter] = useState(initialFleetType);
  const [reloadKey, setReloadKey] = useState(0);
  const [dashboardRecords, setDashboardRecords] = useState<DashboardRecords>({ warehouseRecords: EMPTY_WAREHOUSE, flowRecords: EMPTY_FLOW });
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const needsDashboard = suppliedTimeline === undefined && (suppliedWarehouseRecords === undefined || suppliedFlowRecords === undefined);
  useEffect(() => {
    if (!needsDashboard) return;
    const controller = new AbortController();
    setDashboardLoading(true);
    setDashboardError("");
    setDashboardRecords({ warehouseRecords: EMPTY_WAREHOUSE, flowRecords: EMPTY_FLOW });
    async function fetchDashboard() {
      try {
        const response = await fetch(dashboardApiUrl, { method: "GET", cache: "no-store", signal: controller.signal });
        const payload: unknown = await response.json();
        if (!response.ok) {
          const message = typeof payload === "object" && payload !== null && "message" in payload && typeof payload.message === "string" ? payload.message : `โหลด Dashboard ไม่สำเร็จ (HTTP ${response.status})`;
          throw new Error(message);
        }
        const records = readDashboardRecords(payload);
        if (!controller.signal.aborted) setDashboardRecords(records);
      } catch (error) {
        if (!controller.signal.aborted) setDashboardError(error instanceof Error ? error.message : "โหลด Dashboard ไม่สำเร็จ");
      } finally {
        if (!controller.signal.aborted) setDashboardLoading(false);
      }
    }
    void fetchDashboard();
    return () => controller.abort();
  }, [dashboardApiUrl, needsDashboard, reloadKey]);
  const warehouseRecords = suppliedWarehouseRecords ?? dashboardRecords.warehouseRecords;
  const flowRecords = suppliedFlowRecords ?? dashboardRecords.flowRecords;
  const fetchRequests = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(apiUrl, {
          method: "GET",
          cache: "no-store",
          signal,
        });
        if (!res.ok) {
          throw new Error(`ไม่สามารถดึงข้อมูลได้ (HTTP ${res.status})`);
        }
        const data: unknown = await res.json();
        const list = readFleetRequests(data);
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
  const dcOptions = useMemo(
    () =>
      Array.from(
        new Set(
          sourceRequests
            .map((item) => String(item.dc_code || "").trim())
            .filter(Boolean),
        ),
      ).sort(),
    [sourceRequests],
  );
  const requestTypeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          sourceRequests
            .map((item) => String(item.fleet_type || "").trim())
            .filter(Boolean),
        ),
      ).sort(),
    [sourceRequests],
  );
  const filteredRequests = useMemo(
    () =>
      sourceRequests.filter((item) => {
        const dcCode = String(item.dc_code || "").trim();
        const fleetType = String(item.fleet_type || "").trim();
        return (
          (dcFilter === "all" || dcCode === dcFilter) &&
          (requestTypeFilter === "all" || fleetType === requestTypeFilter) &&
          dcCode.toLowerCase().includes(searchText.trim().toLowerCase())
        );
      }),
    [sourceRequests, dcFilter, requestTypeFilter, searchText],
  );
  const timeline = useMemo(
    () => suppliedTimeline ?? buildDeliveryTimeline(filteredRequests, warehouseRecords, flowRecords, processes),
    [suppliedTimeline, filteredRequests, warehouseRecords, flowRecords, processes],
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
      ...FLEET_STATUSES.map((status) => ({ ...status, qty: 0 })),
      { key: "other", label: "สถานะอื่น", color: "#64748b", qty: 0 },
    ];
    for (const item of filteredRequests) {
      const qty = Number(item.qty);
      if (
        !Number.isFinite(qty) ||
        qty <= 0 ||
        Number(item.workload) !== 1
      ) {
        continue;
      }
      const status = String(item.status ?? "").trim();
      const row =
        rows.find((row) => row.key === status) ?? rows[rows.length - 1];
      row.qty += qty;
    }
    return rows;
  }, [filteredRequests]);
  const workloadTotal = summary.reduce((sum, row) => sum + row.qty, 0);
  const timelineMax = Math.max(
    1,
    ...timeline.flatMap((p) => [p.planned, p.actual ?? 0]),
  );
  const point = (value: number, index: number) =>
    `${30 + (index * 240) / Math.max(1, timeline.length - 1)},${
      145 - (value / timelineMax) * 118
    }`;
  const plannedPath = timeline
    .map((p, i) => `${i === 0 ? "M" : "L"}${point(p.planned, i)}`)
    .join(" ");
  const actualPath = timeline
    .map((p, i) =>
      p.actual === null
        ? ""
        : `${
            i === 0 || timeline[i - 1].actual === null ? "M" : "L"
          }${point(p.actual, i)}`,
    )
    .join(" ");
  const totals = dcSummary.reduce((acc, row) => ({
    total: acc.total + row.total, delivered: acc.delivered + row.green,
    remaining: acc.remaining + row.red,
  }), { total: 0, delivered: 0, remaining: 0 });
  const completion = percentage(totals.delivered, totals.total);
  const hasFilters = searchText !== "" || dcFilter !== "all" || requestTypeFilter !== "all";
  const resetFilters = () => { setSearchText(""); setDcFilter("all"); setRequestTypeFilter("all"); };
  const metricValue = (value: number) => isLoading || activeError ? "—" : formatNumber(value);
  const fieldClass = "fleet-field";

  return (
    <section className="fleet-dashboard" aria-label={displayTitle} aria-busy={isLoading || timelineLoading}>
      <style>{`
        .fleet-dashboard{--ink:#16243a;--muted:#62738a;--line:#e4eaf2;--blue:#2563eb;box-sizing:border-box;background:#f5f7fb;color:var(--ink);padding:28px;border:1px solid var(--line);border-radius:24px;font-family:inherit;font-size:14px;line-height:1.6}
        .fleet-dashboard *{box-sizing:border-box}.fleet-dashboard h2,.fleet-dashboard h3,.fleet-dashboard p{margin:0}.fleet-dashboard button,.fleet-dashboard input,.fleet-dashboard select{font:inherit}.fleet-dashboard button{cursor:pointer}.fleet-dashboard button:disabled{cursor:wait;opacity:.55}.fleet-dashboard :is(button,input,select):focus-visible{outline:3px solid #93c5fd;outline-offset:3px}
        .fleet-heading{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:24px}.fleet-eyebrow{font-size:11px;font-weight:800;letter-spacing:2px;color:var(--blue);margin-bottom:5px}.fleet-dashboard h2{font-size:clamp(21px,2.5vw,28px);font-weight:750;letter-spacing:-.5px}.fleet-subtitle{color:var(--muted);font-size:13px;margin-top:5px!important}.fleet-heading-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.fleet-badge{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);background:white;border-radius:99px;padding:6px 12px;font-size:12px;color:var(--muted)}.fleet-dot{width:7px;height:7px;background:#2563eb;border-radius:50%;display:inline-block}.fleet-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:42px;border:1px solid var(--line);border-radius:11px;padding:9px 15px;background:white;color:#41536d;font-weight:600;transition:background .15s}.fleet-button:hover{background:#edf3ff}.fleet-button-primary{background:#2563eb;color:white;border-color:#2563eb}.fleet-button-primary:hover{background:#1d4ed8}.fleet-button svg{width:17px;height:17px}
        .fleet-filters{display:grid;grid-template-columns:minmax(170px,1.4fr) minmax(140px,1fr) minmax(160px,1fr) auto;gap:14px;align-items:end;padding:18px;background:white;border:1px solid var(--line);border-radius:16px;margin-bottom:20px}.fleet-label{display:block;font-size:12px;font-weight:600;color:#53647b;margin-bottom:6px}.fleet-field{width:100%;min-height:44px;border:1px solid #dce4ef;border-radius:10px;background:#f9fbfd;padding:10px 12px;color:var(--ink)}.fleet-search{position:relative}.fleet-search svg{position:absolute;left:13px;top:14px;width:17px;height:17px;color:#7d8ca2}.fleet-search input{padding-left:39px}.fleet-filter-note{margin:-9px 0 18px!important;font-size:12px;color:var(--muted)}
        .fleet-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-bottom:22px}.fleet-metric{padding:20px;background:white;border:1px solid var(--line);border-radius:16px;box-shadow:0 3px 12px #182c4d03}.fleet-metric-top{display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--muted);font-size:13px}.fleet-metric-icon{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;font-size:18px;background:#eff6ff;color:var(--blue)}.fleet-metric-value{font-size:32px;font-weight:750;line-height:1.3;letter-spacing:-1px;margin:12px 0 7px}.fleet-metric-value small{font-size:12px;color:var(--muted);font-weight:400;letter-spacing:0;margin-left:6px}.fleet-metric-caption{font-size:11px;color:var(--muted)}.fleet-progress{height:5px;background:#eaf0f8;overflow:hidden;border-radius:99px;margin-top:12px}.fleet-progress>span{display:block;height:100%;border-radius:99px;background:var(--blue)}
        .fleet-panels{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);gap:20px;align-items:start}.fleet-panel{min-width:0;background:white;border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 4px 16px #182c4d03}.fleet-panel-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:20px 22px;border-bottom:1px solid #edf1f6}.fleet-panel h3{font-size:15px;font-weight:700}.fleet-panel-description{font-size:12px;color:var(--muted);margin-top:3px!important}.fleet-panel-content{padding:20px 22px}.fleet-timeline{grid-column:1/-1}.fleet-chart{display:block;width:100%;height:240px}.fleet-legend{display:flex;gap:18px;flex-wrap:wrap;align-items:center;font-size:12px;color:var(--muted)}.fleet-legend span{display:inline-flex;align-items:center;gap:7px}.fleet-legend i{width:9px;height:9px;border-radius:3px;display:inline-block}.fleet-empty{min-height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;color:var(--muted);padding:24px}.fleet-empty-icon{display:grid;place-items:center;width:50px;height:50px;background:#f1f5f9;border-radius:16px;font-size:23px;color:#94a3b8}.fleet-warehouse-list{max-height:400px;overflow:auto;padding-right:5px}.fleet-warehouse{padding:13px 0;border-bottom:1px solid #f0f3f7}.fleet-warehouse:last-child{border-bottom:0}.fleet-row{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px}.fleet-warehouse-name{font-weight:650;font-size:13px}.fleet-row-meta{font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums}.fleet-bar{height:10px;display:flex;background:#eef2f7;border-radius:99px;overflow:hidden}.fleet-bar>span{height:100%;min-width:0}.fleet-warehouse-detail{display:flex;justify-content:space-between;gap:8px;margin-top:7px;font-size:11px;color:var(--muted)}
        .fleet-table{width:100%;border-collapse:collapse}.fleet-table th{text-align:left;font-size:11px;font-weight:500;color:var(--muted);padding:0 0 12px;border-bottom:1px solid var(--line)}.fleet-table td{padding:13px 0;border-bottom:1px solid #edf1f6;font-size:13px}.fleet-table :is(th,td):last-child{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}.fleet-status{display:inline-flex;align-items:center;gap:8px}.fleet-status i{display:inline-block;width:8px;height:8px;border-radius:50%;flex-shrink:0}.fleet-status-share{height:3px;background:#f1f5f9;border-radius:99px;margin-top:6px;max-width:150px;overflow:hidden}.fleet-status-share span{display:block;height:100%;border-radius:99px}.fleet-table tfoot td{border:0;font-weight:750;padding-top:18px}.fleet-error{padding:14px 18px;border:1px solid #fecdd3;background:#fff1f2;color:#be123c;border-radius:12px;margin-bottom:20px}.fleet-footer{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;color:var(--muted);font-size:11px;margin-top:18px}.fleet-spin{animation:fleet-spin 1s linear infinite}@keyframes fleet-spin{to{transform:rotate(360deg)}}
        @media(min-width:1500px){.fleet-panels{grid-template-columns:minmax(0,1fr) minmax(0,1.1fr) minmax(0,1fr)}.fleet-timeline{grid-column:auto}.fleet-chart{height:270px}}
        @media(max-width:900px){.fleet-dashboard{padding:20px}.fleet-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.fleet-filters{grid-template-columns:repeat(2,minmax(0,1fr))}.fleet-panels{grid-template-columns:1fr}.fleet-timeline{grid-column:auto}.fleet-heading{align-items:flex-start}.fleet-heading-actions{justify-content:flex-end}.fleet-badge{display:none}}
        @media(max-width:540px){.fleet-dashboard{padding:14px;border-radius:16px}.fleet-heading{flex-direction:column;gap:14px}.fleet-heading-actions{width:100%;justify-content:flex-start}.fleet-filters{grid-template-columns:1fr;padding:14px}.fleet-metrics{gap:10px}.fleet-metric{padding:14px}.fleet-metric-top{font-size:11px}.fleet-metric-value{font-size:27px}.fleet-metric-icon{width:27px;height:27px}.fleet-panel-header,.fleet-panel-content{padding:16px}.fleet-chart{height:210px}.fleet-row-meta{font-size:11px}}
        @media(prefers-reduced-motion:reduce){.fleet-spin{animation:none}.fleet-dashboard *{transition:none!important}}
      `}</style>
      <header className="fleet-heading">
        <div><div className="fleet-eyebrow">FLEET OVERVIEW</div><h2>{displayTitle}</h2><p className="fleet-subtitle">ภาพรวมคำขอและการส่งมอบกองรถ แยกตามคลัง</p></div>
        <div className="fleet-heading-actions">
          <span className="fleet-badge"><i className="fleet-dot" />{suppliedRequests !== undefined ? "ข้อมูลจากระบบ" : "ข้อมูลจาก API"}</span>
          {(suppliedRequests === undefined || needsDashboard) && <button type="button" className="fleet-button fleet-button-primary" disabled={isLoading || timelineLoading} onClick={() => setReloadKey(k => k + 1)}>
            <svg className={isLoading || timelineLoading ? "fleet-spin" : ""} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1"/></svg>
            {isLoading || timelineLoading ? "กำลังโหลด..." : "รีเฟรชข้อมูล"}</button>}
        </div>
      </header>
      <div className="fleet-filters">
        <label><span className="fleet-label">ค้นหาคลัง</span><div className="fleet-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></svg><input className={fieldClass} type="search" placeholder="พิมพ์ DC CODE..." value={searchText} onChange={e => setSearchText(e.target.value)}/></div></label>
        <label><span className="fleet-label">คลังสินค้า</span><select className={fieldClass} value={dcFilter} onChange={e => setDcFilter(e.target.value)}><option value="all">ทุกคลัง</option>{dcOptions.map(dc => <option key={dc} value={dc}>{dc}</option>)}</select></label>
        <label><span className="fleet-label">ประเภทคำขอ</span><select className={fieldClass} value={requestTypeFilter} onChange={e => setRequestTypeFilter(e.target.value)}><option value="all">ประเภทคำขอทั้งหมด</option>{requestTypeFilter !== "all" && !requestTypeOptions.includes(requestTypeFilter) && <option value={requestTypeFilter}>{requestTypeFilter}</option>}{requestTypeOptions.map(type => <option key={type} value={type}>{type}</option>)}</select></label>
        <button className="fleet-button" type="button" onClick={resetFilters} disabled={!hasFilters}>ล้างตัวกรอง</button>
      </div>
      {hasFilters && <p className="fleet-filter-note">แสดงผลตามตัวกรองที่เลือก · {dcSummary.length} คลัง</p>}
      {activeError && <div className="fleet-error" role="alert"><strong>โหลดข้อมูลไม่สำเร็จ</strong><p>{activeError}</p></div>}
      <div className="fleet-metrics">
        {[
          {label:"จำนวนรถทั้งหมด",value:totals.total,caption:`จาก ${dcSummary.length} คลัง · ${filteredRequests.length} คำขอ`,color:"#2563eb",bg:"#eff6ff",icon:"▦"},
          {label:"ส่งมอบแล้ว",value:totals.delivered,caption:"สถานะเสร็จสิ้น (success)",color:"#059669",bg:"#ecfdf5",icon:"✓"},
          {label:"ยังไม่เสร็จสิ้น",value:totals.remaining,caption:"รวมทุกสถานะที่ไม่ใช่ success",color:"#e11d48",bg:"#fff1f2",icon:"◷"},
        ].map(card => <article className="fleet-metric" key={card.label}><div className="fleet-metric-top"><span>{card.label}</span><span className="fleet-metric-icon" style={{color:card.color,background:card.bg}} aria-hidden="true">{card.icon}</span></div><div className="fleet-metric-value">{metricValue(card.value)}<small>คัน</small></div><div className="fleet-metric-caption">{isLoading || activeError ? "รอข้อมูล" : card.caption}</div></article>)}
        <article className="fleet-metric"><div className="fleet-metric-top"><span>อัตราส่งมอบสำเร็จ</span><span className="fleet-metric-icon" aria-hidden="true">↗</span></div><div className="fleet-metric-value">{isLoading || activeError ? "—" : completion.toFixed(1)}<small>%</small></div><div className="fleet-metric-caption">ส่งมอบแล้ว / จำนวนรถทั้งหมด</div><div className="fleet-progress" aria-hidden="true"><span style={{width:isLoading || activeError ? "0%" : `${completion}%`}}/></div></article>
      </div>
      <div className="fleet-panels">
        <article className="fleet-panel fleet-timeline"><div className="fleet-panel-header"><div><h3>แผนและการส่งมอบ</h3><p className="fleet-panel-description">เปรียบเทียบแผนกับยอดส่งมอบสะสม</p></div><span className="fleet-badge">{timeline.length} ช่วงเวลา</span></div><div className="fleet-panel-content">
          {timelineLoading || timelineError ? <div className="fleet-empty" role={timelineError ? "alert" : "status"}><div className="fleet-empty-icon" aria-hidden="true">↗</div><span>{timelineLoading ? "กำลังโหลดข้อมูล Timeline..." : timelineError}</span></div> : timeline.length === 0 ? <div className="fleet-empty"><div className="fleet-empty-icon" aria-hidden="true">↗</div><span>ยังไม่มีข้อมูล warehouse_plan_date หรือ str_date ของขั้นตอน 8</span></div> : <svg className="fleet-chart" viewBox="0 0 300 180" role="img" aria-label="กราฟแผนและยอดส่งมอบสะสม">
            {[0,.25,.5,.75,1].map(ratio => <g key={ratio}><line x1="30" x2="280" y1={145-ratio*118} y2={145-ratio*118} stroke="#e8eef6" strokeDasharray="3 4"/><text x="24" y={148-ratio*118} textAnchor="end" fill="#7c8ca2" fontSize="8">{formatNumber(Math.round(timelineMax*ratio))}</text></g>)}
            <path d={plannedPath} stroke="#94a3b8" strokeWidth="2" strokeDasharray="5 4" fill="none"/><path d={actualPath} stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            {timeline.map((p,i) => <g key={`${p.label}-${i}`}><circle cx={30+(i*240)/Math.max(1,timeline.length-1)} cy={145-(p.planned/timelineMax)*118} r="2" fill="#94a3b8"><title>{p.label}: แผน {p.planned} คัน</title></circle>{p.actual !== null && <circle cx={30+(i*240)/Math.max(1,timeline.length-1)} cy={145-(p.actual/timelineMax)*118} r="3" fill="#2563eb" stroke="white" strokeWidth="1"><title>{p.label}: ส่งมอบจริง {p.actual} คัน</title></circle>}{(timeline.length <= 7 || i === 0 || i === timeline.length-1 || i % Math.ceil(timeline.length/6) === 0) && <text x={30+(i*240)/Math.max(1,timeline.length-1)} y="164" textAnchor="middle" fill="#62738a" fontSize="8">{p.label.length>12 ? `${p.label.slice(0,11)}…` : p.label}</text>}</g>)}
          </svg>}
          <div className="fleet-legend"><span><i style={{background:"#94a3b8"}}/>Planned Delivery Timeline</span><span><i style={{background:"#2563eb"}}/>Actual Delivery Curve</span></div>
        </div></article>
        <article className="fleet-panel"><div className="fleet-panel-header"><div><h3>สถานะการส่งมอบรายคลัง</h3><p className="fleet-panel-description">สัดส่วนรถที่เสร็จสิ้นต่อจำนวนรถทั้งหมด</p></div><span className="fleet-badge">{dcSummary.length} คลัง</span></div><div className="fleet-panel-content">
          {isLoading || activeError || dcSummary.length === 0 ? <div className="fleet-empty" role={isLoading ? "status" : undefined}><div className="fleet-empty-icon" aria-hidden="true">▦</div><span>{isLoading ? "กำลังโหลดข้อมูล..." : activeError ? "ไม่สามารถแสดงข้อมูลได้" : "ไม่พบข้อมูลตามตัวกรอง"}</span>{hasFilters && !isLoading && !activeError && <button type="button" className="fleet-button" onClick={resetFilters}>แสดงทุกคลัง</button>}</div> : <div className="fleet-warehouse-list">{dcSummary.map(row => <div className="fleet-warehouse" key={row.dcCode}><div className="fleet-row"><span className="fleet-warehouse-name">{row.dcCode}</span><span className="fleet-row-meta">{formatNumber(row.total)} คัน · สำเร็จ {percentage(row.green,row.total).toFixed(0)}%</span></div><div className="fleet-bar" role="img" aria-label={`${row.dcCode}: ส่งมอบแล้ว ${row.green} คัน ยังไม่เสร็จสิ้น ${row.red} คัน`}><span style={{width:`${percentage(row.green,row.total)}%`,background:"#10b981"}}/><span style={{width:`${percentage(row.red,row.total)}%`,background:"#fb7185"}}/></div><div className="fleet-warehouse-detail"><span>ส่งมอบแล้ว {formatNumber(row.green)} คัน</span><span>ยังไม่เสร็จสิ้น {formatNumber(row.red)} คัน</span></div></div>)}</div>}
          <div className="fleet-legend" style={{marginTop:18}}><span><i style={{background:"#10b981"}}/>ส่งมอบแล้ว</span><span><i style={{background:"#fb7185"}}/>ยังไม่เสร็จสิ้น</span></div>
        </div></article>
        <article className="fleet-panel"><div className="fleet-panel-header"><div><h3>สรุปสถานะ Workload</h3><p className="fleet-panel-description">เฉพาะรายการที่มี Workload = 1</p></div></div><div className="fleet-panel-content"><table className="fleet-table"><thead><tr><th scope="col">สถานะคำขอ</th><th scope="col">จำนวน (คัน)</th></tr></thead><tbody>{summary.map(row => <tr key={row.key}><td><span className="fleet-status"><i style={{background:row.color}}/>{row.label}</span><div className="fleet-status-share" aria-hidden="true"><span style={{width:isLoading || activeError ? "0%" : `${percentage(row.qty,workloadTotal)}%`,background:row.color}}/></div></td><td style={{fontWeight:650}}>{metricValue(row.qty)}</td></tr>)}</tbody><tfoot><tr><td>รวมทั้งหมด</td><td>{metricValue(workloadTotal)}</td></tr></tfoot></table></div></article>
      </div>
      <footer className="fleet-footer"><span>จำนวนรถนับจาก qty · ส่งมอบแล้วนับจากสถานะ success</span><span>แผน: warehouse_plan_date · ส่งมอบจริง: str_date ของ process_level = 8</span></footer>
    </section>
  );
}

export default function Page() {
  return <FleetStatusByDc />;
}

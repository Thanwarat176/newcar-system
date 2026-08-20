"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface RequestDetailItem {
  id?: string | number;
  request_id?: string | number;
  license?: string;
  province?: string;
  truck_type?: string;
  company_id?: string;
  company_name?: string;
}

export interface RequestItem {
  id: number | null;
  running_doc: string;
  dc_type: string;
  dc_code: string;
  date: string;
  request_date?: string;
  fleet_type: string;
  fleet_truck_type: string;
  license_replace: string[] | string;
  qty: number;
  usage_date: string;

  workload: number | string | null;
  truckturn: number | string | null;

  status: string;
  status_details?: string | null;
  remark: string | null;
  reject_reason?: string | null;

  request_by: string;
  details?: RequestDetailItem[];
}

export interface IssuePeriodItem {
  license_plate?: string;
  province?: string;
  dc_code?: string;
  fbp_code?: string;
  truck_type?: string;
  issue_type?: string;
  period_start?: string;
  period_end?: string;
  duration_days?: number | string;
  driver_names?: string;
  latest_remark?: string | null;
  expected_return_date?: string | null;
  register_year?: string;
  register_date?: string;
  vendor_name?: string;
  [key: string]: unknown;
}

interface WorkloadItem {
  DC_TYPE?: string;
  dc_type?: string;
  DC_CODE?: string;
  dc_code?: string;
  DATE?: string;
  date?: string;
  WORKLOAD_FC?: number | string;
  workload_fc?: number | string;
  FORECAST_FC?: number | string;
  forecast_fc?: number | string;
  [key: string]: unknown;
}

interface FleetCheckStats {
  total: number;
  fleet_in: number;
  fleet_supplement: number;
  fleet_transferred_in: number;
  fleet_crossdock: number;
  fleet_transferred_out: number;
  fleet_backhaul: number;
}

type DashboardPair = { actual: number; planned: number };
type DashboardMatrix = Record<string, Record<string, DashboardPair>>;
type DashboardStatus = { id: number; name: string; code: number };
type DashboardWeekly = {
  date: string;
  day_name: string;
  p_work: number;
  p_down: number;
  a_work: number;
  a_down: number;
  total_plan: number;
  gap_pct: number;
  is_today: boolean;
};
type FleetDashboardData = {
  success: boolean;
  message?: string;
  date: string;
  warehouse: string;
  fleet_types: Array<{ fleet_type: string; count: number }>;
  weekly_performance: DashboardWeekly[];
  statuses: DashboardStatus[];
  vendors: Record<string, string>;
  matrix_type: DashboardMatrix;
  matrix_vendor: DashboardMatrix;
};

interface CheckDCProps {
  data?: RequestItem;
  allRequests?: RequestItem[];
  issuePeriods?: IssuePeriodItem[];
  requestApiUrl?: string;
}

type ActiveTab = "summary" | "fleet" | "workload";

const DEFAULT_REQUEST_API =
  "http://192.168.158.210/api_new_truck/api/request_get.php";

const WORKLOAD_API =
  "http://192.168.144.22/CENTRAL/Daily_Operaion_codeing/pages/chart/api_workload.php";

const FLEET_CHECK_API =
  "https://lite.cpall.co.th/Logistic/daily-fleet-management-v2/api/get_fleet_check_all.php";

const FLEET_DASHBOARD_API =
  "https://lite.cpall.co.th/Logistic/Daily-fleet-management-v2/api/get_dashboard_by_dc.php";

const EMPTY_FLEET_STATS: FleetCheckStats = {
  total: 0,
  fleet_in: 0,
  fleet_supplement: 0,
  fleet_transferred_in: 0,
  fleet_crossdock: 0,
  fleet_transferred_out: 0,
  fleet_backhaul: 0,
};

function getArrayFromResponse<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];

  if (!result || typeof result !== "object") return [];

  const object = result as Record<string, unknown>;
  const possibleKeys = ["data", "result", "requests", "Daily", "daily", "Data"];

  for (const key of possibleKeys) {
    if (Array.isArray(object[key])) {
      return object[key] as T[];
    }
  }

  return [];
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function normalizeStatus(value?: string): string {
  return String(value ?? "").trim().toLowerCase();
}

function getValueIgnoreCase(
  item: Record<string, unknown> | undefined,
  keyName: string,
): unknown {
  if (!item) return "";

  const foundKey = Object.keys(item).find(
    (key) => key.trim().toUpperCase() === keyName.toUpperCase(),
  );

  return foundKey ? item[foundKey] : "";
}

function formatNumber(value?: number | string | null): string {
  if (value === null || value === undefined || value === "") return "-";

  const numberValue = Number(value);
  return Number.isNaN(numberValue)
    ? String(value)
    : numberValue.toLocaleString("en-US");
}

function normalizeDateKey(value?: string): string {
  if (!value) return "";

  const raw = String(value).trim();
  if (!raw) return "";

  const dateOnly = raw.includes("T") ? raw.split("T")[0] : raw.split(" ")[0];

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return dateOnly;

  if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(dateOnly)) {
    const [day, month, year] = dateOnly.split(/[/-]/);
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) return dateOnly;

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatThaiDate(value?: string): string {
  const dateKey = normalizeDateKey(value);
  if (!dateKey) return "-";

  const [year, month, day] = dateKey.split("-");
  if (!year || !month || !day) return value || "-";

  return `${day}/${month}/${year}`;
}

function formatThaiMonthYear(monthKey?: string): string {
  if (!monthKey) return "-";

  const [yearText, monthText] = monthKey.split("-");
  const year = Number(yearText);
  const month = Number(monthText);

  if (!year || !month) return monthKey;

  const thaiMonths = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
  ];

  return `${thaiMonths[month - 1]} ${year + 543}`;
}

function getTodayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getStatusText(status?: string): string {
  const value = normalizeStatus(status);

  // รอทีม FBP พิจารณา
  if (
    [
      "pending_fbp",
      "fbp_pending",
      "waiting_fbp",
      "wait_fbp",
    ].includes(value)
  ) {
    return "รอทีม FBP พิจารณา";
  }

  // รอทาง GM คลังพิจารณา
  if (
    [
      "pending_gm",
      "gm_pending",
      "waiting_gm",
      "wait_gm",
    ].includes(value)
  ) {
    return "รอทาง GM คลังพิจารณา";
  }

  // FBP ปฏิเสธ
  if (
    [
      "reject_fbp",
      "rejected_fbp",
      "fbp_reject",
      "fbp_rejected",
      "reject_by_fbp",
      "rejected_by_fbp",
    ].includes(value)
  ) {
    return "FBP ไม่อนุมัติ";
  }

  // GM คลังปฏิเสธ
  if (
    [
      "reject_gm",
      "rejected_gm",
      "gm_reject",
      "gm_rejected",
      "reject_by_gm",
      "rejected_by_gm",
    ].includes(value)
  ) {
    return "GM คลังไม่อนุมัติ";
  }

  // รออนุมัติทั่วไป
  if (
    [
      "pending",
      "waiting approve",
      "waiting approval",
      "pending approve",
      "pending approval",
      "รออนุมัติ",
    ].includes(value)
  ) {
    return "รออนุมัติ";
  }

  // รอประเมินกองรถ
  if (
    [
      "wait fleet",
      "waiting fleet",
      "pending_fleet",
      "fleet_pending",
      "รอประเมินกองรถ",
      "รอกองรถประเมิน",
    ].includes(value)
  ) {
    return "รอประเมินกองรถ";
  }

  // กำลังดำเนินการ
  if (
    [
      "confirm request",
      "confirmed request",
      "confirm",
      "confirmed",
      "in progress",
      "processing",
      "progress",
      "กำลังดำเนินการ",
    ].includes(value)
  ) {
    return "กำลังดำเนินการ";
  }

  // อนุมัติ
  if (
    [
      "approved",
      "approve",
      "success",
      "completed",
      "สำเร็จ",
      "อนุมัติ",
    ].includes(value)
  ) {
    return "อนุมัติ";
  }

  // ปฏิเสธทั่วไป
  if (
    [
      "rejected",
      "reject",
      "not approved",
      "not_approved",
      "cancelled",
      "ไม่อนุมัติ",
    ].includes(value)
  ) {
    return "ไม่อนุมัติ";
  }

  return status || "-";
}

function getStatusClass(status?: string): string {
  const text = getStatusText(status);

  if (text === "รอทีม FBP พิจารณา") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  if (text === "รอทาง GM คลังพิจารณา") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (text === "รออนุมัติ") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (
    text === "กำลังดำเนินการ" ||
    text === "รอประเมินกองรถ"
  ) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (text === "อนุมัติ") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    text === "FBP ไม่อนุมัติ" ||
    text === "GM คลังไม่อนุมัติ" ||
    text === "ไม่อนุมัติ"
  ) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function dashboardThaiDate(value: string): string {
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

function DashboardStat({ title, value, active = false }: { title: string; value: number; active?: boolean }) {
  return <div className={`flex h-[88px] flex-col justify-between rounded-xl bg-white p-3 shadow-sm ${active ? "border-2 border-blue-500" : "border border-slate-200"}`}>
    <p className={`text-lg font-black ${active ? "text-blue-600" : "text-slate-400"}`}>{title}</p>
    <p className={`text-right text-xl font-black ${active ? "text-blue-600" : "text-slate-900"}`}>{formatNumber(value)}</p>
  </div>;
}

function DashboardMatrix({ mode, matrix, statuses, date, warehouse, labels }: { mode: "fleet" | "vendor"; matrix: DashboardMatrix; statuses: DashboardStatus[]; date: string; warehouse: string; labels?: Record<string, string> }) {
  const allStatuses = statuses.filter((status) => Object.values(matrix).some((row) => {
    const item = row[String(status.id)];
    return item && (item.actual || item.planned);
  }));
  const shownStatuses = mode === "vendor" ? allStatuses.filter((status) => status.id !== 2 && !/วิ่ง.*ปกติ/i.test(status.name)) : allStatuses;
  const rows = Object.entries(matrix);
  const valueOf = (row: Record<string, DashboardPair>, status: DashboardStatus) => Number(row[String(status.id)]?.actual || 0);
  const totalOf = (row: Record<string, DashboardPair>) => allStatuses.reduce((sum, status) => sum + valueOf(row, status), 0);
  const absentOf = (row: Record<string, DashboardPair>) => shownStatuses.reduce((sum, status) => sum + valueOf(row, status), 0);
  const tone = (name: string) => {
    if (/ปกติ/.test(name)) return "bg-blue-50 text-blue-700";
    if (/หยุด/.test(name)) return "bg-emerald-50 text-emerald-700";
    if (/เสีย|ซ่อม/.test(name)) return "bg-rose-50 text-rose-600";
    if (/พขร/.test(name)) return "bg-amber-50 text-amber-700";
    return "bg-violet-50 text-violet-700";
  };
  const title = mode === "fleet" ? "ตารางสรุปกองรถประจำวัน (Daily Fleet Summary Table)" : "ตารางสรุปสถานะรถที่ไม่ได้มาวิ่งงาน แยกรายบริษัทขนส่ง (Vendor Summary Table)";
  const subtitle = mode === "fleet" ? `กองรถประจำวันที่ ${dashboardThaiDate(date)} ${warehouse}` : `สถานะรถไม่ได้มาวิ่งงาน แยกรายซัพพลายเออร์ ประจำวันที่ ${dashboardThaiDate(date)} ${warehouse}`;

  return <section>
    <h3 className="mb-2 text-sm font-black text-slate-900"><span className="mr-1.5 text-blue-600">▦</span>{title}</h3>
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3 text-center text-xs font-black text-blue-600">{subtitle}</div>
      <div className="overflow-x-auto"><table className="min-w-full text-xs">
        <thead className="bg-slate-50 text-slate-400"><tr>
          <th className="min-w-48 border-r border-slate-100 px-4 py-3 text-left font-black">{mode === "fleet" ? "ประเภทรถ" : "บริษัทขนส่ง (VENDOR)"}</th>
          {mode === "vendor" && (
            <th className="min-w-28 border-r border-blue-100 bg-blue-100 px-3 py-3 text-center font-black text-blue-800">
              รถทั้งหมด
            </th>
          )}
          {shownStatuses.map((status) => <th key={status.id} className={`min-w-28 border-r border-slate-100 px-3 py-3 text-center font-black ${tone(status.name)}`}>{status.name}</th>)}
          {mode === "vendor" && <th className="min-w-32 bg-red-50 px-3 py-3 text-center font-black text-red-600">ไม่ได้มาวิ่งงาน</th>}
        </tr></thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map(([key, row]) => <tr key={key}>
            <td className="border-r border-slate-100 px-4 py-3 font-black text-slate-900">{key}{labels?.[key] ? ` - ${labels[key]}` : ""}</td>
            {mode === "vendor" && (
              <td className="border-r border-blue-100 bg-blue-50 px-3 py-3 text-center text-sm font-black text-blue-900">
                {formatNumber(totalOf(row))}
              </td>
            )}
            {shownStatuses.map((status) => { const value = valueOf(row, status); return <td key={status.id} className={`border-r border-slate-100 px-3 py-3 text-center font-black underline decoration-dotted ${tone(status.name)}`}>{value ? formatNumber(value) : "–"}</td>; })}
            {mode === "vendor" && <td className="bg-red-50 px-3 py-3 text-center font-black text-red-600 underline decoration-dotted">{formatNumber(absentOf(row))}</td>}
          </tr>)}
        </tbody>
        <tfoot><tr className="bg-slate-100 font-black">
          <td className="border-r border-slate-200 px-4 py-3 text-black">{mode === "fleet" ? "รวมทั้งหมด" : "รวมทั้งหมดทุกซัพพลายเออร์"}</td>
          {mode === "vendor" && (
            <td className="border-r border-blue-200 bg-blue-200 px-3 py-3 text-center text-sm font-black text-blue-950">
              {formatNumber(
                rows.reduce((sum, [, row]) => sum + totalOf(row), 0)
              )}
            </td>
          )}
          {shownStatuses.map((status) => <td key={status.id} className={`border-r border-slate-200 px-3 py-3 text-center underline decoration-dotted ${tone(status.name)}`}>{formatNumber(rows.reduce((sum, [, row]) => sum + valueOf(row, status), 0))}</td>)}
          {mode === "vendor" && <td className="bg-red-50 px-3 py-3 text-center text-red-600 underline decoration-dotted">{formatNumber(rows.reduce((sum, [, row]) => sum + absentOf(row), 0))}</td>}
        </tr></tfoot>
      </table></div>
    </div>
  </section>;
}

function FleetDashboard({ warehouse }: { warehouse: string }) {
  const [selectedDate, setSelectedDate] = useState(getTodayKey);
  const [dashboard, setDashboard] = useState<FleetDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    if (!warehouse || !selectedDate) return;
    try {
      setLoading(true); setError("");
      const params = new URLSearchParams({ action: "summary", warehouse, date: selectedDate });
      const response = await fetch(`${FLEET_DASHBOARD_API}?${params.toString().replace(/\+/g, "%20")}`, { headers: { Accept: "application/json" }, credentials: "omit", cache: "no-store" });
      const text = await response.text();
      if (!response.ok) throw new Error(`โหลด Dashboard ไม่สำเร็จ HTTP ${response.status}`);
      const result = JSON.parse(text) as FleetDashboardData;
      if (!result.success) throw new Error(result.message || "ไม่สามารถโหลด Dashboard ได้");
      setDashboard(result);
    } catch (loadError) {
      setDashboard(null);
      setError(loadError instanceof Error ? loadError.message : "เกิดข้อผิดพลาดในการโหลด Dashboard");
    } finally { setLoading(false); }
  }, [selectedDate, warehouse]);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  const fleetCount = (name: string) => dashboard?.fleet_types.find((item) => normalizeText(item.fleet_type) === normalizeText(name))?.count || 0;
  const all = fleetCount("รถทั้งหมด") || Object.values(dashboard?.matrix_type || {}).reduce((total, row) => total + Object.values(row).reduce((sum, item) => sum + Number(item.actual || 0), 0), 0);

  return <div className="space-y-5 rounded-xl border border-blue-100 bg-slate-50/70 p-3.5">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h3 className="text-sm font-black text-slate-900">Dashboard สรุปข้อมูลกองรถ</h3><p className="mt-1 text-[10px] text-slate-500">คลัง <b className="text-blue-700">{warehouse}</b></p></div>
      <div className="flex gap-2">
        <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-[11px] font-bold text-slate-700 outline-none" />
        <button type="button" disabled={loading} onClick={() => void loadDashboard()} className="h-9 rounded-lg bg-blue-600 px-3 text-[10px] font-black text-white disabled:opacity-50">{loading ? "กำลังโหลด..." : "รีเฟรช"}</button>
      </div>
    </div>
    {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-bold text-rose-700">{error}</div>}
    {dashboard && <>
      <section><h3 className="mb-2 text-sm font-black text-slate-900"><span className="mr-1.5 text-blue-600">▣</span>ประเภทรถยนต์</h3>
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-4 texy-gray-800">
          <DashboardStat title="รถทั้งหมด" value={all} active /><DashboardStat title="รถในกอง" value={fleetCount("รถในกอง")} /><DashboardStat title="รถเสริม" value={fleetCount("รถเสริม")} /><DashboardStat title="รถโอนมาช่วย" value={fleetCount("รถโอนมาช่วย")} /><DashboardStat title="CROSS DOCK" value={fleetCount("CROSS DOCK")} /><DashboardStat title="โอนไปช่วยคลังอื่น" value={fleetCount("รถโอนไปช่วยคลังอื่น")} /><DashboardStat title="BACKHAUL" value={fleetCount("BACKHAUL")} />
        </div>
      </section>
      <section><h3 className="mb-2 text-sm font-black text-slate-900"><span className="mr-1.5 text-blue-600">▦</span>สรุปแผนและการวิ่งงานล่วงหน้า 7 วัน</h3>
        <div className="overflow-x-auto pb-1"><div className="grid min-w-[1050px] grid-cols-7 gap-3">
          {dashboard.weekly_performance.map((item) => <article key={item.date} className={`h-[188px] rounded-xl bg-white p-3 shadow-sm ${item.is_today ? "border-2 border-blue-400" : "border border-slate-200"}`}>
            <div className="flex h-[42px] justify-between border-b border-slate-100"><div><p className={`text-xs font-black ${item.is_today ? "text-blue-600" : "text-slate-900"}`}>{item.day_name}</p><p className="mt-1 text-[10px] font-bold text-slate-400">{item.date.slice(8, 10)}/{item.date.slice(5, 7)}</p></div>{item.is_today && <span className="h-fit rounded-full bg-violet-600 px-2 py-1 text-[10px] font-black text-white">วันนี้</span>}</div>
            <div className="mt-2.5"><p className="text-[9px] font-black uppercase text-slate-400">ตามแผน (Plan)</p><div className="mt-1 flex justify-between text-[10px] font-black"><span className="text-blue-700">● วิ่ง: {formatNumber(item.p_work)}</span><span className="text-orange-700">● หยุด: {formatNumber(item.p_down)}</span></div></div>
            <div className="mt-3"><p className="text-[9px] font-black uppercase text-slate-400">วิ่งจริง (Actual)</p><div className="mt-1 flex justify-between text-[10px] font-black"><span className="text-emerald-700">● วิ่ง: {formatNumber(item.a_work)}</span><span className="text-violet-700">● หยุด: {formatNumber(item.a_down)}</span></div></div>
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2"><span className="text-[9px] font-black text-slate-400">ความต่าง (%)</span><span className={`rounded-md px-2 py-1 text-[10px] font-black ${item.gap_pct === 0 ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"}`}>{item.gap_pct}%</span></div>
          </article>)}
        </div></div>
      </section>
      <DashboardMatrix mode="fleet" matrix={dashboard.matrix_type} statuses={dashboard.statuses} date={dashboard.date} warehouse={dashboard.warehouse || warehouse} />
      <DashboardMatrix mode="vendor" matrix={dashboard.matrix_vendor} statuses={dashboard.statuses} date={dashboard.date} warehouse={dashboard.warehouse || warehouse} labels={dashboard.vendors} />
    </>}
  </div>;
}

export default function CheckDC({
  data,
  allRequests,
  issuePeriods = [],
  requestApiUrl = DEFAULT_REQUEST_API,
}: CheckDCProps) {
  const [localRequests, setLocalRequests] = useState<RequestItem[]>(
    allRequests ?? [],
  );
  const [selectedRequestId, setSelectedRequestId] = useState<string>(
    data?.id !== null && data?.id !== undefined ? String(data.id) : "",
  );
  const [loadingRequests, setLoadingRequests] = useState(
    !data && !allRequests,
  );
  const [requestError, setRequestError] = useState("");

  const [activeTab, setActiveTab] = useState<ActiveTab>("summary");
  const [workloads, setWorkloads] = useState<WorkloadItem[]>([]);
  const [loadingWorkload, setLoadingWorkload] = useState(false);
  const [workloadError, setWorkloadError] = useState("");
  const [selectedWorkloadMonth, setSelectedWorkloadMonth] = useState("");

  const [fleetStats, setFleetStats] =
    useState<FleetCheckStats>(EMPTY_FLEET_STATS);
  const [loadingFleet, setLoadingFleet] = useState(false);
  const [fleetError, setFleetError] = useState("");

  const [selectedIssueTruckType, setSelectedIssueTruckType] = useState("");
  const [workloadViewMode, setWorkloadViewMode] =
    useState<"chart" | "table">("chart");

  useEffect(() => {
    if (allRequests) {
      setLocalRequests(allRequests);
    }
  }, [allRequests]);

  useEffect(() => {
    if (data?.id !== null && data?.id !== undefined) {
      setSelectedRequestId(String(data.id));
    }
  }, [data?.id]);

  useEffect(() => {
    if (data || allRequests) return;

    let cancelled = false;

    const fetchRequests = async () => {
      try {
        setLoadingRequests(true);
        setRequestError("");

        const response = await fetch(requestApiUrl, {
          method: "GET",
          cache: "no-store",
        });

        const responseText = await response.text();
        let result: unknown = null;

        try {
          result = responseText ? JSON.parse(responseText) : null;
        } catch {
          throw new Error("Request API ไม่ได้ส่งข้อมูล JSON กลับมา");
        }

        if (!response.ok) {
          const message =
            result &&
              typeof result === "object" &&
              "message" in result
              ? String((result as { message?: unknown }).message || "")
              : "";

          throw new Error(message || `Request API Error ${response.status}`);
        }

        const rows = getArrayFromResponse<RequestItem>(result);

        if (!cancelled) {
          setLocalRequests(rows);

          if (rows.length > 0 && !selectedRequestId) {
            const firstId = rows[0].id;
            setSelectedRequestId(
              firstId !== null && firstId !== undefined ? String(firstId) : "",
            );
          }
        }
      } catch (error) {
        if (!cancelled) {
          setRequestError(
            error instanceof Error
              ? error.message
              : "ไม่สามารถโหลดรายการคำขอได้",
          );
          setLocalRequests([]);
        }
      } finally {
        if (!cancelled) setLoadingRequests(false);
      }
    };

    void fetchRequests();

    return () => {
      cancelled = true;
    };
  }, [allRequests, data, requestApiUrl, selectedRequestId]);

  const resolvedData = useMemo<RequestItem | null>(() => {
    if (data) return data;

    if (selectedRequestId) {
      const selected = localRequests.find(
        (item) => String(item.id ?? "") === selectedRequestId,
      );

      if (selected) return selected;
    }

    return localRequests[0] ?? null;
  }, [data, localRequests, selectedRequestId]);

  const todayKey = getTodayKey();
  const currentMonthKey = todayKey.slice(0, 7);
  const activeWorkloadMonth = selectedWorkloadMonth || currentMonthKey;

  useEffect(() => {
    if (!resolvedData) return;

    setActiveTab("summary");
    setSelectedIssueTruckType(resolvedData.fleet_truck_type || "");
    setSelectedWorkloadMonth(currentMonthKey);
  }, [currentMonthKey, resolvedData?.id]);

  useEffect(() => {
    if (!resolvedData?.dc_code) {
      setWorkloads([]);
      return;
    }

    let cancelled = false;

    const fetchWorkload = async () => {
      try {
        setLoadingWorkload(true);
        setWorkloadError("");

        const response = await fetch(WORKLOAD_API, {
          method: "GET",
          cache: "no-store",
        });

        const responseText = await response.text();
        let result: unknown = null;

        try {
          result = responseText ? JSON.parse(responseText) : null;
        } catch {
          throw new Error("Workload API ไม่ได้ส่งข้อมูล JSON กลับมา");
        }

        if (!response.ok) {
          throw new Error(`Workload API Error ${response.status}`);
        }

        if (!cancelled) {
          setWorkloads(getArrayFromResponse<WorkloadItem>(result));
        }
      } catch (error) {
        if (!cancelled) {
          setWorkloadError(
            error instanceof Error
              ? error.message
              : "ไม่สามารถโหลดข้อมูล Workload ได้",
          );
          setWorkloads([]);
        }
      } finally {
        if (!cancelled) setLoadingWorkload(false);
      }
    };

    void fetchWorkload();

    return () => {
      cancelled = true;
    };
  }, [resolvedData?.dc_code]);

  const fetchFleetStats = useCallback(async (dcCode: string) => {
    const normalizedDcCode = String(dcCode || "").trim();

    if (!normalizedDcCode) {
      setFleetStats(EMPTY_FLEET_STATS);
      setFleetError("ไม่พบรหัส DC");
      return;
    }

    try {
      setLoadingFleet(true);
      setFleetError("");

      const url =
        `${FLEET_CHECK_API}?dc=` +
        encodeURIComponent(normalizedDcCode);

      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
      });

      const responseText = await response.text();
      let result: unknown = null;

      try {
        result = responseText ? JSON.parse(responseText) : null;
      } catch {
        throw new Error("Fleet Check API ไม่ได้ส่งข้อมูล JSON กลับมา");
      }

      if (!response.ok) {
        throw new Error(`Fleet Check API Error ${response.status}`);
      }

      const object =
        result && typeof result === "object"
          ? (result as Record<string, unknown>)
          : {};

      const stats =
        object.stats && typeof object.stats === "object"
          ? (object.stats as Record<string, unknown>)
          : object;

      setFleetStats({
        total: Number(stats.total || 0),
        fleet_in: Number(stats.fleet_in || 0),
        fleet_supplement: Number(stats.fleet_supplement || 0),
        fleet_transferred_in: Number(stats.fleet_transferred_in || 0),
        fleet_crossdock: Number(stats.fleet_crossdock || 0),
        fleet_transferred_out: Number(stats.fleet_transferred_out || 0),
        fleet_backhaul: Number(stats.fleet_backhaul || 0),
      });
    } catch (error) {
      setFleetStats(EMPTY_FLEET_STATS);
      setFleetError(
        error instanceof Error
          ? error.message
          : "ไม่สามารถโหลดข้อมูลรถในคลังได้",
      );
    } finally {
      setLoadingFleet(false);
    }
  }, []);

  useEffect(() => {
    if (!resolvedData?.dc_code) {
      setFleetStats(EMPTY_FLEET_STATS);
      setFleetError("");
      return;
    }

    void fetchFleetStats(resolvedData.dc_code);
  }, [fetchFleetStats, resolvedData?.dc_code]);

  const replacementTruckRows = useMemo<RequestDetailItem[]>(() => {
    if (!resolvedData) return [];

    const isMeaningfulValue = (value: unknown) => {
      const normalized = String(value ?? "").trim().toLowerCase();

      return ![
        "",
        "-",
        "null",
        "undefined",
        "[]",
        "ไม่มีข้อมูล",
        "ไม่พบข้อมูล",
      ].includes(normalized);
    };

    if (Array.isArray(resolvedData.details)) {
      const validDetails = resolvedData.details.filter((item) =>
        [
          item.license,
          item.province,
          item.truck_type,
          item.company_id,
          item.company_name,
        ].some(isMeaningfulValue),
      );

      if (validDetails.length > 0) return validDetails;
    }

    const rawLicenses = Array.isArray(resolvedData.license_replace)
      ? resolvedData.license_replace
      : String(resolvedData.license_replace || "")
        .replace(/^\[|\]$/g, "")
        .split(",");

    const licenses = rawLicenses
      .map((license) => String(license).replace(/["']/g, "").trim())
      .filter(isMeaningfulValue);

    return licenses.map((license, index) => ({
      id: `fallback-${index}`,
      license,
    }));
  }, [resolvedData]);

  const sameDcRequests = useMemo(() => {
    if (!resolvedData) return [];

    return localRequests.filter(
      (item) =>
        normalizeText(item.dc_code) === normalizeText(resolvedData.dc_code),
    );
  }, [localRequests, resolvedData]);

  const dcSummary = useMemo(() => {
    const totalQty = sameDcRequests.reduce(
      (sum, item) => sum + Number(item.qty || 0),
      0,
    );

    const waitingCount = sameDcRequests.filter(
      (item) => getStatusText(item.status) === "รออนุมัติ",
    ).length;

    const progressCount = sameDcRequests.filter((item) =>
      ["กำลังดำเนินการ", "รอประเมินกองรถ"].includes(
        getStatusText(item.status),
      ),
    ).length;

    return {
      totalRequest: sameDcRequests.length,
      totalQty,
      waitingCount,
      progressCount,
    };
  }, [sameDcRequests]);

  const workloadRowsByCurrentDc = useMemo(() => {
    if (!resolvedData) return [];

    const currentDc = normalizeText(resolvedData.dc_code);

    return workloads.filter((item) => {
      const itemRecord = item as Record<string, unknown>;
      const dcCode =
        getValueIgnoreCase(itemRecord, "DC_CODE") ||
        getValueIgnoreCase(itemRecord, "dc_code");

      return normalizeText(dcCode) === currentDc;
    });
  }, [resolvedData, workloads]);

  const workloadMonthOptions = useMemo(() => {
    const months = new Set<string>();

    workloadRowsByCurrentDc.forEach((item) => {
      const itemRecord = item as Record<string, unknown>;
      const rawDate =
        getValueIgnoreCase(itemRecord, "DATE") ||
        getValueIgnoreCase(itemRecord, "date");
      const dateKey = normalizeDateKey(String(rawDate || ""));

      if (dateKey) months.add(dateKey.slice(0, 7));
    });

    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [workloadRowsByCurrentDc]);

  const monthlyWorkloadRows = useMemo(() => {
    return workloadRowsByCurrentDc
      .filter((item) => {
        const itemRecord = item as Record<string, unknown>;
        const rawDate =
          getValueIgnoreCase(itemRecord, "DATE") ||
          getValueIgnoreCase(itemRecord, "date");

        return normalizeDateKey(String(rawDate || "")).startsWith(
          activeWorkloadMonth,
        );
      })
      .sort((a, b) => {
        const dateA = normalizeDateKey(
          String(
            getValueIgnoreCase(a as Record<string, unknown>, "DATE") ||
            getValueIgnoreCase(a as Record<string, unknown>, "date") ||
            "",
          ),
        );
        const dateB = normalizeDateKey(
          String(
            getValueIgnoreCase(b as Record<string, unknown>, "DATE") ||
            getValueIgnoreCase(b as Record<string, unknown>, "date") ||
            "",
          ),
        );

        return dateA.localeCompare(dateB);
      });
  }, [activeWorkloadMonth, workloadRowsByCurrentDc]);

  const getWorkloadFc = (item: WorkloadItem): number => {
    const record = item as Record<string, unknown>;

    return Number(
      getValueIgnoreCase(record, "WORKLOAD_FC") ||
      getValueIgnoreCase(record, "workload_fc") ||
      0,
    );
  };

  const getForecastFc = (item: WorkloadItem): number => {
    const record = item as Record<string, unknown>;

    return Number(
      getValueIgnoreCase(record, "FORECAST_FC") ||
      getValueIgnoreCase(record, "forecast_fc") ||
      0,
    );
  };

  const todayWorkload = useMemo(() => {
    return (
      workloadRowsByCurrentDc.find((item) => {
        const record = item as Record<string, unknown>;
        const rawDate =
          getValueIgnoreCase(record, "DATE") ||
          getValueIgnoreCase(record, "date");

        return normalizeDateKey(String(rawDate || "")) === todayKey;
      }) ?? null
    );
  }, [todayKey, workloadRowsByCurrentDc]);

  const monthlyWorkloadTotal = monthlyWorkloadRows.reduce(
    (sum, item) => sum + getWorkloadFc(item),
    0,
  );

  const monthlyWorkloadAverage =
    monthlyWorkloadRows.length > 0
      ? Math.round(monthlyWorkloadTotal / monthlyWorkloadRows.length)
      : 0;

  const issueRowsByCurrentDc = useMemo(() => {
    if (!resolvedData) return [];

    return issuePeriods.filter(
      (item) =>
        normalizeText(item.dc_code) === normalizeText(resolvedData.dc_code),
    );
  }, [issuePeriods, resolvedData]);

  const issueTruckTypeOptions = useMemo(() => {
    const options = new Set<string>();

    issueRowsByCurrentDc.forEach((item) => {
      if (item.truck_type) options.add(String(item.truck_type).trim());
    });

    if (resolvedData?.fleet_truck_type) {
      options.add(resolvedData.fleet_truck_type);
    }

    return Array.from(options).filter(Boolean).sort();
  }, [issueRowsByCurrentDc, resolvedData?.fleet_truck_type]);

  const filteredIssueRows = useMemo(() => {
    const truckType =
      selectedIssueTruckType || resolvedData?.fleet_truck_type || "";

    return issueRowsByCurrentDc.filter(
      (item) =>
        !truckType ||
        normalizeText(item.truck_type) === normalizeText(truckType),
    );
  }, [
    issueRowsByCurrentDc,
    resolvedData?.fleet_truck_type,
    selectedIssueTruckType,
  ]);

  if (loadingRequests) {
    return (
      <section className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-center gap-3 text-sm font-bold text-slate-500">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
          กำลังโหลดข้อมูลคำขอ...
        </div>
      </section>
    );
  }

  if (!resolvedData) {
    return (
      <section className="w-full rounded-3xl border border-rose-200 bg-rose-50 p-6">
        <h2 className="text-base font-black text-rose-800">
          ไม่พบข้อมูลสำหรับ CheckDC
        </h2>
        <p className="mt-2 text-sm font-medium text-rose-700">
          {requestError ||
            "กรุณาส่ง data/allRequests เข้ามา หรือตรวจสอบ Request API"}
        </p>
      </section>
    );
  }

  const tabs: Array<{
    key: ActiveTab;
    label: string;
    count: number | null;
  }> = [
      { key: "summary", label: "ข้อมูลคำขอ", count: null },
      { key: "fleet", label: "สถานะกองรถ", count: null },
      { key: "workload", label: "Workload", count: null },
    ];

  const workloadChartData = useMemo(() => {
    return monthlyWorkloadRows.map((item) => {
      const record = item as Record<string, unknown>;

      const rawDate =
        getValueIgnoreCase(record, "DATE") ||
        getValueIgnoreCase(record, "date");

      const dateKey = normalizeDateKey(String(rawDate || ""));

      return {
        dateKey,
        dateLabel: formatThaiDate(dateKey),
        forecast: getForecastFc(item),
        workload: getWorkloadFc(item),
      };
    });
  }, [monthlyWorkloadRows]);

  const workloadChartWidth = Math.max(
    460,
    workloadChartData.length * 38
  );

  const workloadChartHeight = 190;

  const workloadChartPadding = {
    top: 16,
    right: 14,
    bottom: 34,
    left: 44,
  };

  const workloadChartMaxValue = Math.max(
    1,
    ...workloadChartData.flatMap((item) => [
      item.forecast,
      item.workload,
    ])
  );

  const workloadChartDrawableWidth =
    workloadChartWidth -
    workloadChartPadding.left -
    workloadChartPadding.right;

  const workloadChartDrawableHeight =
    workloadChartHeight -
    workloadChartPadding.top -
    workloadChartPadding.bottom;

  const getWorkloadChartX = (index: number) => {
    if (workloadChartData.length <= 1) {
      return (
        workloadChartPadding.left +
        workloadChartDrawableWidth / 2
      );
    }

    return (
      workloadChartPadding.left +
      (index / (workloadChartData.length - 1)) *
      workloadChartDrawableWidth
    );
  };

  const getWorkloadChartY = (value: number) => {
    return (
      workloadChartPadding.top +
      workloadChartDrawableHeight -
      (value / workloadChartMaxValue) *
      workloadChartDrawableHeight
    );
  };

  const forecastChartPoints = workloadChartData
    .map(
      (item, index) =>
        `${getWorkloadChartX(index)},${getWorkloadChartY(
          item.forecast
        )}`
    )
    .join(" ");

  const workloadChartPoints = workloadChartData
    .map(
      (item, index) =>
        `${getWorkloadChartX(index)},${getWorkloadChartY(
          item.workload
        )}`
    )
    .join(" ");

  const workloadChartGridValues = Array.from(
    { length: 6 },
    (_, index) =>
      Math.round(
        workloadChartMaxValue -
        (workloadChartMaxValue / 5) * index
      )
  );
  const cleanText = (value: unknown) => {
    const text = String(value ?? "")
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return text || "-";
  };

  const hasDisplayValue = (value: unknown) => {
    const text = String(value ?? "")
      .trim()
      .toLowerCase();

    return ![
      "",
      "-",
      "null",
      "undefined",
    ].includes(text);
  };

  return (
    <section className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-lg shadow-slate-200/60">
      {/* Header */}
      <div className="relative overflow-hidden border-b border-slate-700 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-800 px-5 py-4 text-white">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-white/[0.04]" />
        <div className="pointer-events-none absolute bottom-[-90px] left-[35%] h-44 w-44 rounded-full bg-blue-400/[0.05]" />

        <div className="relative flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-[11px] font-black tracking-wide ring-1 ring-white/15">
                DC
              </div>

              <div>
                <h2 className="text-base font-black tracking-tight sm:text-lg">
                  ตรวจสอบข้อมูล DC
                </h2>

                <p className="mt-0.5 text-[11px] font-medium text-slate-300">
                  ข้อมูลคำขอ สถานะกองรถ และ Workload
                </p>
              </div>

              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-black shadow-sm ${getStatusClass(
                  resolvedData.status
                )}`}
              >
                {cleanText(getStatusText(resolvedData.status))}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold">
              <span className="rounded-md bg-white/[0.08] px-2.5 py-1 text-slate-100 ring-1 ring-white/10">
                {cleanText(resolvedData.running_doc)}
              </span>

              <span className="rounded-md bg-white/[0.08] px-2.5 py-1 text-slate-100 ring-1 ring-white/10">
                DC {cleanText(resolvedData.dc_code)}
              </span>

              <span className="rounded-md bg-white/[0.08] px-2.5 py-1 text-slate-100 ring-1 ring-white/10">
                {cleanText(resolvedData.fleet_truck_type)}
              </span>
            </div>
          </div>

          {!data && localRequests.length > 0 && (
            <label className="block min-w-[260px] rounded-xl bg-white/[0.06] p-3 ring-1 ring-white/10">
              <span className="mb-1.5 block text-[10px] font-bold text-slate-300">
                เลือกรายการคำขอ
              </span>

              <select
                value={selectedRequestId}
                onChange={(event) =>
                  setSelectedRequestId(event.target.value)
                }
                className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                {localRequests.map((item, index) => (
                  <option
                    key={String(
                      item.id ?? `${item.running_doc}-${index}`
                    )}
                    value={String(item.id ?? "")}
                  >
                    {cleanText(
                      item.running_doc || `รายการ ${index + 1}`
                    )}{" "}
                    — DC {cleanText(item.dc_code)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {requestError && (
          <p className="relative mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800">
            {cleanText(requestError)}
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto border-b border-slate-200 bg-white px-3 pt-2">
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex h-10 items-center gap-2 rounded-t-xl border-x border-t px-4 text-xs font-black transition ${active
                  ? "border-slate-200 bg-slate-50 text-blue-800 shadow-sm"
                  : "border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-800"
                  }`}
              >
                {cleanText(tab.label)}

                {tab.count !== null && (
                  <span
                    className={`min-w-5 rounded-full px-1.5 py-0.5 text-center text-[9px] ${active
                      ? "bg-blue-700 text-white"
                      : "bg-slate-200 text-slate-600"
                      }`}
                  >
                    {tab.key === "fleet" && loadingFleet
                      ? "..."
                      : tab.count}
                  </span>
                )}

                {active && (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-blue-700" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-3 sm:p-4">
        {/* ข้อมูลคำขอ */}
        {activeTab === "summary" && (
          <div className="space-y-4">
            {/* 1. ข้อมูลเอกสาร */}
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <span className="h-5 w-1 rounded-full bg-blue-700" />
                  ข้อมูลเอกสาร
                </h3>

                <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                  รายละเอียดเบื้องต้นของคำขอ
                </p>
              </div>

              <div className="grid gap-px bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "เลขที่เอกสาร",
                    value: cleanText(resolvedData.running_doc),
                    sub: "Document number",
                    code: "DOC",
                  },
                  {
                    label: "วันที่ขอ",
                    value: formatThaiDate(
                      resolvedData.request_date ||
                      resolvedData.date
                    ),
                    sub: "Request date",
                    code: "REQ",
                  },
                  {
                    label: "วันที่ใช้งาน",
                    value: formatThaiDate(
                      resolvedData.usage_date
                    ),
                    sub: "Usage date",
                    code: "USE",
                  },
                  {
                    label: "ผู้ขอ",
                    value: cleanText(
                      resolvedData.request_by
                    ),
                    sub: "Requested by",
                    code: "BY",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="min-h-[92px] bg-white p-3.5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 px-2 text-[9px] font-black text-blue-800">
                        {item.code}
                      </div>

                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-500">
                          {item.label}
                        </p>

                        <p className="mt-1 break-words text-sm font-black text-slate-900">
                          {item.value}
                        </p>

                        <p className="mt-0.5 text-[9px] font-medium text-slate-400">
                          {item.sub}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 2. ข้อมูลคำขอรถ */}
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <span className="h-5 w-1 rounded-full bg-indigo-600" />
                  ข้อมูลคำขอรถ
                </h3>

                <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                  คลัง ประเภทคำขอ ประเภทรถ และจำนวน
                </p>
              </div>

              <div className="grid gap-px bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "DC",
                    value: cleanText(
                      resolvedData.dc_code
                    ),
                    sub: cleanText(
                      resolvedData.dc_type
                    ),
                    code: "DC",
                  },
                  {
                    label: "ประเภทคำขอ",
                    value: cleanText(
                      resolvedData.fleet_type
                    ),
                    sub: "Fleet type",
                    code: "FT",
                  },
                  {
                    label: "ประเภทรถ",
                    value: cleanText(
                      resolvedData.fleet_truck_type
                    ),
                    sub: "Truck type",
                    code: "TR",
                  },
                  {
                    label: "จำนวนที่ขอ",
                    value: `${formatNumber(
                      resolvedData.qty
                    )} คัน`,
                    sub: "Requested quantity",
                    code: "QTY",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="min-h-[92px] bg-white p-3.5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 px-2 text-[9px] font-black text-indigo-800">
                        {item.code}
                      </div>

                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-slate-500">
                          {item.label}
                        </p>

                        <p className="mt-1 break-words text-sm font-black text-slate-900">
                          {item.value}
                        </p>

                        <p className="mt-0.5 break-words text-[9px] font-medium text-slate-400">
                          {item.sub}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 3. ข้อมูลประกอบการประเมิน */}
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <span className="h-5 w-1 rounded-full bg-emerald-600" />
                  ข้อมูลประกอบการประเมิน
                </h3>

                <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                  ปริมาณงาน รอบรถ และสถานะปัจจุบัน
                </p>
              </div>

              <div className="grid gap-3 p-3 sm:grid-cols-3">
                <div className="relative overflow-hidden rounded-xl border border-blue-200 bg-blue-50/50 p-3.5">
                  <span className="absolute inset-y-0 left-0 w-1 bg-blue-700" />

                  <div className="pl-1">
                    <p className="text-[10px] font-bold text-blue-600">
                      Workload
                    </p>

                    <p className="mt-1 text-xl font-black text-blue-900">
                      {formatNumber(
                        resolvedData.workload
                      )}
                    </p>

                    <p className="mt-0.5 text-[9px] font-medium text-blue-500">
                      ปริมาณงานของคำขอ
                    </p>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5">
                  <span className="absolute inset-y-0 left-0 w-1 bg-indigo-600" />

                  <div className="pl-1">
                    <p className="text-[10px] font-bold text-indigo-600">
                      Truck Turn
                    </p>

                    <p className="mt-1 text-xl font-black text-indigo-900">
                      {formatNumber(
                        resolvedData.truckturn
                      )}
                    </p>

                    <p className="mt-0.5 text-[9px] font-medium text-indigo-500">
                      รอบการหมุนเวียนรถ
                    </p>
                  </div>
                </div>

                <div
                  className={`relative overflow-hidden rounded-xl border p-3.5 ${getStatusClass(
                    resolvedData.status
                  )}`}
                >
                  <p className="text-[10px] font-bold opacity-70">
                    สถานะปัจจุบัน
                  </p>

                  <p className="mt-1 break-words text-sm font-black">
                    {cleanText(
                      getStatusText(
                        resolvedData.status
                      )
                    )}
                  </p>

                  <p className="mt-1 break-all text-[9px] font-medium opacity-60">
                    {cleanText(
                      resolvedData.status
                    )}
                  </p>
                </div>
              </div>
            </section>

            {/* 4. หมายเหตุและผลการพิจารณา */}
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <span className="h-5 w-1 rounded-full bg-amber-500" />
                  หมายเหตุและผลการพิจารณา
                </h3>

                <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                  ข้อความจากผู้ขอและรายละเอียดการดำเนินงาน
                </p>
              </div>

              <div
                className={`grid gap-3 p-3 ${hasDisplayValue(
                  resolvedData.reject_reason
                )
                  ? "lg:grid-cols-3"
                  : "lg:grid-cols-2"
                  }`}
              >
                {/* Remark */}
                <div className="overflow-hidden rounded-xl border border-amber-200 bg-white">
                  <div className="border-b border-amber-100 bg-amber-50 px-3.5 py-2.5">
                    <p className="text-[10px] font-black uppercase tracking-wide text-amber-700">
                      Remark
                    </p>

                    <h4 className="mt-0.5 text-xs font-black text-amber-950">
                      หมายเหตุคำขอ
                    </h4>
                  </div>

                  <div className="min-h-[88px] px-3.5 py-3">
                    <p className="whitespace-pre-wrap break-words text-xs font-medium leading-relaxed text-slate-700">
                      {cleanText(
                        resolvedData.remark
                      )}
                    </p>
                  </div>
                </div>

                {/* Status Details */}
                <div className="overflow-hidden rounded-xl border border-blue-200 bg-white">
                  <div className="border-b border-blue-100 bg-blue-50 px-3.5 py-2.5">
                    <p className="text-[10px] font-black uppercase tracking-wide text-blue-700">
                      Status Details
                    </p>

                    <h4 className="mt-0.5 text-xs font-black text-blue-950">
                      รายละเอียดสถานะ
                    </h4>
                  </div>

                  <div className="min-h-[88px] px-3.5 py-3">
                    <p className="whitespace-pre-wrap break-words text-xs font-medium leading-relaxed text-slate-700">
                      {cleanText(
                        resolvedData.status_details
                      )}
                    </p>
                  </div>
                </div>

                {/* Reject Reason แสดงเมื่อมีเหตุผลเท่านั้น */}
                {hasDisplayValue(
                  resolvedData.reject_reason
                ) && (
                    <div className="overflow-hidden rounded-xl border border-rose-200 bg-white">
                      <div className="border-b border-rose-100 bg-rose-50 px-3.5 py-2.5">
                        <p className="text-[10px] font-black uppercase tracking-wide text-rose-700">
                          Reject Reason
                        </p>

                        <h4 className="mt-0.5 text-xs font-black text-rose-950">
                          เหตุผลที่ไม่อนุมัติ
                        </h4>
                      </div>

                      <div className="min-h-[88px] px-3.5 py-3">
                        <p className="whitespace-pre-wrap break-words text-xs font-medium leading-relaxed text-rose-700">
                          {cleanText(
                            resolvedData.reject_reason
                          )}
                        </p>
                      </div>
                    </div>
                  )}
              </div>
            </section>

            {/* 5. รายละเอียดรถทดแทน */}
            {replacementTruckRows.length > 0 && (
              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
                      <span className="h-5 w-1 rounded-full bg-blue-700" />
                      รายละเอียดรถทดแทน
                    </h3>

                    <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                      ทะเบียน จังหวัด ประเภทรถ และผู้ประกอบการขนส่ง
                    </p>
                  </div>

                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">
                    {replacementTruckRows.length} คัน
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-xs">
                    <thead className="bg-slate-100 text-[10px] uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="px-3 py-2.5 text-center font-black">
                          ลำดับ
                        </th>
                        <th className="px-3 py-2.5 font-black">
                          ทะเบียนรถ
                        </th>
                        <th className="px-3 py-2.5 font-black">
                          จังหวัด
                        </th>
                        <th className="px-3 py-2.5 font-black">
                          ประเภทรถ
                        </th>
                        <th className="px-3 py-2.5 font-black">
                          ผู้ประกอบการขนส่ง
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {replacementTruckRows.map(
                        (item, index) => (
                          <tr
                            key={String(
                              item.id ??
                              `${item.license}-${index}`
                            )}
                            className="transition hover:bg-blue-50/50"
                          >
                            <td className="px-3 py-2.5 text-center">
                              {index + 1}
                            </td>

                            <td className="px-3 py-2.5 font-black text-blue-800">
                              {cleanText(
                                item.license
                              )}
                            </td>

                            <td className="px-3 py-2.5 font-bold text-slate-700">
                              {cleanText(
                                item.province
                              )}
                            </td>

                            <td className="px-3 py-2.5 font-bold text-slate-700">
                              {cleanText(
                                item.truck_type
                              )}
                            </td>

                            <td className="px-3 py-2.5">
                              <p className="font-black text-slate-800">
                                {cleanText(
                                  item.company_name
                                )}
                              </p>

                              {item.company_id && (
                                <p className="mt-0.5 text-[9px] text-slate-400">
                                  ID:{" "}
                                  {cleanText(
                                    item.company_id
                                  )}
                                </p>
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        )}

        {/* สถานะกองรถ */}
        {activeTab === "fleet" && (
          <div className="space-y-4">
            <section className="space-y-3">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                  <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
                    <span className="h-5 w-1 rounded-full bg-blue-700" />
                    สถานะกองรถ
                  </h3>
              </div>
            </section>

            <FleetDashboard warehouse={resolvedData.dc_code} />

            <section className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm">
              <div className="flex flex-col justify-between gap-3 border-b border-amber-200 bg-gradient-to-r from-amber-50 to-slate-50 px-3.5 py-3 sm:flex-row sm:items-end">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-amber-300 bg-white text-[11px] font-black text-amber-700">
                      !
                    </span>

                    <h3 className="text-sm font-black text-amber-950">
                      ข้อมูลปัญหากองรถประกอบการพิจารณา
                    </h3>

                    <span className="rounded-full border border-rose-200 bg-white px-2 py-0.5 text-[9px] font-black text-rose-700">
                      {filteredIssueRows.length} คัน
                    </span>
                  </div>

                  <p className="mt-1.5 text-[10px] font-medium leading-relaxed text-amber-800">
                    ประวัติการแจ้งปัญหาของประเภทรถ{" "}
                    <span className="font-black">
                      {cleanText(
                        selectedIssueTruckType ||
                        resolvedData.fleet_truck_type
                      )}

                      {["4W", "4WJ"].includes(
                        normalizeText(
                          selectedIssueTruckType ||
                          resolvedData.fleet_truck_type
                        )
                      )
                        ? " (รถ 4 ล้อ)"
                        : ["6W", "6WJ"].includes(
                          normalizeText(
                            selectedIssueTruckType ||
                            resolvedData.fleet_truck_type
                          )
                        )
                          ? " (รถ 6 ล้อ)"
                          : normalizeText(
                            selectedIssueTruckType ||
                            resolvedData.fleet_truck_type
                          ) === "10W"
                            ? " (รถ 10 ล้อ)"
                            : normalizeText(
                              selectedIssueTruckType ||
                              resolvedData.fleet_truck_type
                            ) === "22W"
                              ? " (รถพ่วง)"
                              : ""}
                    </span>{" "}
                    ที่คลัง{" "}
                    <span className="font-black">
                      {cleanText(resolvedData.dc_code)}
                    </span>{" "}
                    จากระบบ DFM
                  </p>
                </div>

                <label className="block min-w-[190px]">
                  <span className="mb-1 block text-[10px] font-bold text-amber-800">
                    ประเภทรถ
                  </span>

                  <select
                    value={selectedIssueTruckType}
                    onChange={(event) =>
                      setSelectedIssueTruckType(event.target.value)
                    }
                    className="h-9 w-full rounded-lg border border-amber-300 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  >
                    {issueTruckTypeOptions.length === 0 && (
                      <option value="">ไม่มีข้อมูลประเภทรถ</option>
                    )}

                    {issueTruckTypeOptions.map((truckType) => (
                      <option key={truckType} value={truckType}>
                        {cleanText(truckType)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="p-3">
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[620px] text-left text-xs">
                    <thead className="bg-slate-100 text-[10px] uppercase tracking-wide text-slate-600">
                      <tr>
                        <th className="px-3 py-2.5 font-black">
                          ทะเบียนรถ
                        </th>
                        <th className="px-3 py-2.5 font-black">
                          ประเภทปัญหา
                        </th>
                        <th className="px-3 py-2.5 font-black">
                          วันที่เริ่มปัญหา
                        </th>
                        <th className="px-3 py-2.5 font-black">
                          ระยะเวลา
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {filteredIssueRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-3 py-10 text-center font-bold text-emerald-700"
                          >
                            ไม่พบประวัติการแจ้งปัญหารถประเภทนี้ที่คลัง{" "}
                            {cleanText(resolvedData.dc_code)} ในขณะนี้
                          </td>
                        </tr>
                      ) : (
                        filteredIssueRows.map((item, index) => (
                          <tr
                            key={`${item.license_plate || "issue"}-${index}`}
                            className="transition hover:bg-amber-50/50"
                          >
                            <td className="px-3 py-2.5">
                              <span className="rounded-md border border-blue-100 bg-blue-50 px-2 py-1 font-black text-blue-800">
                                {cleanText(item.license_plate)}
                              </span>
                            </td>

                            <td className="px-3 py-2.5 font-bold text-rose-700">
                              {cleanText(item.issue_type)}
                            </td>

                            <td className="px-3 py-2.5 font-bold text-slate-700">
                              {formatThaiDate(item.period_start)}
                            </td>

                            <td className="px-3 py-2.5 font-bold text-slate-700">
                              {item.duration_days !== undefined &&
                                item.duration_days !== null &&
                                item.duration_days !== ""
                                ? `${formatNumber(
                                  item.duration_days
                                )} วัน`
                                : "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Workload */}
        {activeTab === "workload" && (
          <div className="space-y-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <span className="h-5 w-1 rounded-full bg-blue-700" />
                  Workload ของ DC
                </h3>

                <p className="mt-0.5 text-[10px] text-slate-500">
                  เปรียบเทียบ Forecast FC และ Workload FC
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="inline-flex h-9 rounded-lg border border-slate-200 bg-slate-100 p-0.5">
                  <button
                    type="button"
                    onClick={() => setWorkloadViewMode("chart")}
                    className={`rounded-md px-3 text-[10px] font-black transition ${workloadViewMode === "chart"
                      ? "bg-white text-blue-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                      }`}
                  >
                    กราฟ
                  </button>

                  <button
                    type="button"
                    onClick={() => setWorkloadViewMode("table")}
                    className={`rounded-md px-3 text-[10px] font-black transition ${workloadViewMode === "table"
                      ? "bg-white text-blue-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                      }`}
                  >
                    ตาราง
                  </button>
                </div>

                <label className="block min-w-[180px]">
                  <span className="mb-1 block text-[10px] font-bold text-slate-500">
                    เลือกเดือน
                  </span>

                  <select
                    value={activeWorkloadMonth}
                    onChange={(event) =>
                      setSelectedWorkloadMonth(event.target.value)
                    }
                    className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-700 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {workloadMonthOptions.length === 0 && (
                      <option value={currentMonthKey}>
                        {formatThaiMonthYear(currentMonthKey)}
                      </option>
                    )}

                    {workloadMonthOptions.map((month) => (
                      <option key={month} value={month}>
                        {formatThaiMonthYear(month)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {workloadError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-bold text-rose-700">
                {cleanText(workloadError)}
              </div>
            )}

            <div className="grid gap-2.5 sm:grid-cols-3">
              {[
                {
                  label: "Workload วันนี้",
                  value: todayWorkload
                    ? formatNumber(getWorkloadFc(todayWorkload))
                    : "ไม่มีข้อมูล",
                  border: "border-blue-200",
                  bar: "bg-blue-700",
                  text: "text-blue-800",
                },
                {
                  label: "Workload เดือนนี้",
                  value: formatNumber(monthlyWorkloadTotal),
                  border: "border-slate-200",
                  bar: "bg-slate-600",
                  text: "text-slate-800",
                },
                {
                  label: "เฉลี่ยต่อวัน",
                  value: formatNumber(monthlyWorkloadAverage),
                  border: "border-indigo-200",
                  bar: "bg-indigo-600",
                  text: "text-indigo-800",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`relative overflow-hidden rounded-xl border bg-white px-3.5 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${item.border}`}
                >
                  <span
                    className={`absolute inset-y-0 left-0 w-1 ${item.bar}`}
                  />

                  <div className="pl-1">
                    <p className="text-[10px] font-bold text-slate-500">
                      {item.label}
                    </p>

                    <p
                      className={`mt-1 text-xl font-black ${item.text}`}
                    >
                      {loadingWorkload ? "..." : item.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {workloadViewMode === "chart" ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col justify-between gap-2 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/50 px-3.5 py-3 sm:flex-row sm:items-center">
                  <div>
                    <h4 className="text-sm font-black text-slate-900">
                      กราฟ Forecast และ Workload
                    </h4>

                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {formatThaiMonthYear(activeWorkloadMonth)}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-[10px] font-bold">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <span className="h-0.5 w-5 rounded-full bg-slate-500" />
                      Forecast FC
                    </div>

                    <div className="flex items-center gap-1.5 text-blue-800">
                      <span className="h-0.5 w-5 rounded-full bg-blue-700" />
                      Workload FC
                    </div>
                  </div>
                </div>

                {loadingWorkload ? (
                  <div className="flex h-[230px] items-center justify-center gap-2 text-xs font-bold text-slate-500">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-700" />
                    กำลังโหลดข้อมูลกราฟ...
                  </div>
                ) : workloadChartData.length === 0 ? (
                  <div className="flex h-[230px] items-center justify-center text-xs font-bold text-slate-400">
                    ไม่พบข้อมูล Workload ของเดือนนี้
                  </div>
                ) : (
                  <div className="overflow-x-auto p-2">
                    <svg
                      width={workloadChartWidth}
                      height={workloadChartHeight}
                      viewBox={`0 0 ${workloadChartWidth} ${workloadChartHeight}`}
                      className="block h-[230px] w-full min-w-[620px]"
                    >
                      <defs>
                        <filter
                          id="tooltipShadow"
                          x="-20%"
                          y="-20%"
                          width="140%"
                          height="140%"
                        >
                          <feDropShadow
                            dx="0"
                            dy="2"
                            stdDeviation="2"
                            floodOpacity="0.2"
                          />
                        </filter>
                      </defs>

                      <rect
                        x="0"
                        y="0"
                        width={workloadChartWidth}
                        height={workloadChartHeight}
                        fill="#ffffff"
                      />

                      {workloadChartGridValues.map(
                        (gridValue, index) => {
                          const y =
                            workloadChartPadding.top +
                            (index / 5) *
                            workloadChartDrawableHeight;

                          return (
                            <g key={`grid-${index}`}>
                              <line
                                x1={workloadChartPadding.left}
                                y1={y}
                                x2={
                                  workloadChartWidth -
                                  workloadChartPadding.right
                                }
                                y2={y}
                                stroke="#e2e8f0"
                                strokeDasharray="3 3"
                              />

                              <text
                                x={workloadChartPadding.left - 8}
                                y={y + 3}
                                textAnchor="end"
                                fontSize="8"
                                fontWeight="700"
                                fill="#64748b"
                              >
                                {formatNumber(gridValue)}
                              </text>
                            </g>
                          );
                        }
                      )}

                      <line
                        x1={workloadChartPadding.left}
                        y1={workloadChartPadding.top}
                        x2={workloadChartPadding.left}
                        y2={
                          workloadChartHeight -
                          workloadChartPadding.bottom
                        }
                        stroke="#94a3b8"
                      />

                      <line
                        x1={workloadChartPadding.left}
                        y1={
                          workloadChartHeight -
                          workloadChartPadding.bottom
                        }
                        x2={
                          workloadChartWidth -
                          workloadChartPadding.right
                        }
                        y2={
                          workloadChartHeight -
                          workloadChartPadding.bottom
                        }
                        stroke="#94a3b8"
                      />

                      <polyline
                        points={forecastChartPoints}
                        fill="none"
                        stroke="#64748b"
                        strokeWidth="2"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />

                      <polyline
                        points={workloadChartPoints}
                        fill="none"
                        stroke="#1d4ed8"
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />

                      {workloadChartData.map((item, index) => {
                        const x = getWorkloadChartX(index);

                        const forecastY = getWorkloadChartY(
                          item.forecast
                        );

                        const workloadY = getWorkloadChartY(
                          item.workload
                        );

                        const tooltipWidth = 124;
                        const tooltipHeight = 53;

                        const tooltipX =
                          x + tooltipWidth + 8 >
                            workloadChartWidth
                            ? x - tooltipWidth - 8
                            : x + 8;

                        const tooltipY = Math.max(
                          4,
                          Math.min(
                            Math.min(forecastY, workloadY) -
                            tooltipHeight -
                            5,
                            workloadChartHeight -
                            workloadChartPadding.bottom -
                            tooltipHeight -
                            3
                          )
                        );

                        return (
                          <g
                            key={`${item.dateKey}-${index}`}
                            className="group cursor-crosshair"
                          >
                            <rect
                              x={x - 12}
                              y={workloadChartPadding.top}
                              width="24"
                              height={workloadChartDrawableHeight}
                              fill="transparent"
                            />

                            <line
                              x1={x}
                              y1={workloadChartPadding.top}
                              x2={x}
                              y2={
                                workloadChartHeight -
                                workloadChartPadding.bottom
                              }
                              stroke="#94a3b8"
                              strokeDasharray="3 3"
                              className="pointer-events-none opacity-0 transition-opacity group-hover:opacity-100"
                            />

                            <circle
                              cx={x}
                              cy={forecastY}
                              r="3.5"
                              fill="white"
                              stroke="#64748b"
                              strokeWidth="2"
                            />

                            <circle
                              cx={x}
                              cy={workloadY}
                              r="4"
                              fill="white"
                              stroke="#1d4ed8"
                              strokeWidth="2"
                            />

                            <g
                              className="pointer-events-none opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                              filter="url(#tooltipShadow)"
                            >
                              <rect
                                x={tooltipX}
                                y={tooltipY}
                                width={tooltipWidth}
                                height={tooltipHeight}
                                rx="6"
                                fill="#0f172a"
                                opacity="0.96"
                              />

                              <text
                                x={tooltipX + 8}
                                y={tooltipY + 13}
                                fontSize="8"
                                fontWeight="800"
                                fill="#ffffff"
                              >
                                {item.dateLabel}
                              </text>

                              <circle
                                cx={tooltipX + 10}
                                cy={tooltipY + 28}
                                r="2.5"
                                fill="#94a3b8"
                              />

                              <text
                                x={tooltipX + 17}
                                y={tooltipY + 31}
                                fontSize="8"
                                fontWeight="700"
                                fill="#e2e8f0"
                              >
                                Forecast:{" "}
                                {formatNumber(item.forecast)}
                              </text>

                              <circle
                                cx={tooltipX + 10}
                                cy={tooltipY + 42}
                                r="2.5"
                                fill="#3b82f6"
                              />

                              <text
                                x={tooltipX + 17}
                                y={tooltipY + 45}
                                fontSize="8"
                                fontWeight="700"
                                fill="#e2e8f0"
                              >
                                Workload:{" "}
                                {formatNumber(item.workload)}
                              </text>
                            </g>

                            <text
                              x={x}
                              y={
                                workloadChartHeight -
                                workloadChartPadding.bottom +
                                16
                              }
                              textAnchor="middle"
                              fontSize="8"
                              fontWeight={
                                item.dateKey === todayKey
                                  ? "900"
                                  : "600"
                              }
                              fill={
                                item.dateKey === todayKey
                                  ? "#1d4ed8"
                                  : "#64748b"
                              }
                            >
                              {item.dateLabel.slice(0, 5)}
                            </text>

                            {item.dateKey === todayKey && (
                              <text
                                x={x}
                                y={
                                  workloadChartHeight -
                                  workloadChartPadding.bottom +
                                  27
                                }
                                textAnchor="middle"
                                fontSize="7"
                                fontWeight="900"
                                fill="#1d4ed8"
                              >
                                วันนี้
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full min-w-[580px] text-left text-xs">
                  <thead className="bg-slate-100 text-[10px] uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-3 py-2.5 font-black">
                        วันที่
                      </th>

                      <th className="px-3 py-2.5 text-right font-black">
                        Forecast FC
                      </th>

                      <th className="px-3 py-2.5 text-right font-black text-blue-800">
                        Workload FC
                      </th>

                      <th className="px-3 py-2.5 text-right font-black">
                        ผลต่าง
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {monthlyWorkloadRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-3 py-10 text-center font-semibold text-slate-400"
                        >
                          ไม่พบข้อมูล Workload ของเดือนนี้
                        </td>
                      </tr>
                    ) : (
                      monthlyWorkloadRows.map((item, index) => {
                        const record =
                          item as Record<string, unknown>;

                        const rawDate =
                          getValueIgnoreCase(record, "DATE") ||
                          getValueIgnoreCase(record, "date");

                        const dateKey = normalizeDateKey(
                          String(rawDate || "")
                        );

                        const forecast = getForecastFc(item);
                        const workload = getWorkloadFc(item);
                        const difference = workload - forecast;

                        return (
                          <tr
                            key={`${dateKey}-${index}`}
                            className={
                              dateKey === todayKey
                                ? "bg-blue-50"
                                : "transition hover:bg-slate-50"
                            }
                          >
                            <td className="px-3 py-2.5 font-black text-slate-700">
                              {formatThaiDate(dateKey)}

                              {dateKey === todayKey && (
                                <span className="ml-1.5 rounded-full bg-blue-700 px-1.5 py-0.5 text-[8px] font-black text-white">
                                  วันนี้
                                </span>
                              )}
                            </td>

                            <td className="px-3 py-2.5 text-right font-black text-slate-600">
                              {formatNumber(forecast)}
                            </td>

                            <td className="px-3 py-2.5 text-right font-black text-blue-800">
                              {formatNumber(workload)}
                            </td>

                            <td
                              className={`px-3 py-2.5 text-right font-black ${difference > 0
                                ? "text-rose-600"
                                : difference < 0
                                  ? "text-emerald-600"
                                  : "text-slate-500"
                                }`}
                            >
                              {difference > 0 ? "+" : ""}
                              {formatNumber(difference)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
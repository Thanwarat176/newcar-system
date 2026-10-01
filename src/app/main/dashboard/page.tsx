"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export interface FleetRequest {

  id: number | string | null;

  dc_code: string | null;

  dc_type?: string | null;

  fleet_type?: string | null;

  status: string | null;

  qty: number | string | null;
  workload?: number | string | null;
  latest_process_name?: string | null;

}

interface DcSummary {

  dcCode: string;

  green: number;

  red: number;

  total: number;

}

export interface TimelinePoint {
  label: string;
  planned: number;
  actual: number | null;
}

export const FLEET_STATUSES = [
  { key: "success", label: "เสร็จสิ้น", color: "#059669" },
  { key: "progress", label: "คำขอรอพิจารณา", color: "#2563eb" },
  { key: "cancel", label: "ไม่ผ่านกระบวนการ", color: "#e11d48" },
  { key: "partial_approved", label: "อนุมัติบางส่วน", color: "#d97706" },
  { key: "fbp_pending", label: "FBP จัดรถเรียบร้อยแล้ว", color: "#7c3aed" },
  { key: "reject_by_fbp", label: "FBP ไม่อนุมัติ", color: "#dc2626" },
] as const;

interface Props {
  initialFleetType?: string;
  timeline?: TimelinePoint[];
  title?: string;

  requests?: FleetRequest[];

  apiUrl?: string;

}

// ใช้ status = "success" ตามที่กำหนด สถานะอื่นทั้งหมดเป็นสีแดง

const COMPLETED_STATUS = "success";

const AXIS_TICKS = [0, 20, 40, 60, 80, 100];

export function groupFleetByDc(requests: FleetRequest[]): DcSummary[] {

  const groups = new Map<string, DcSummary>();

  requests.forEach((item) => {

    const dcCode = String(item.dc_code || "").trim() || "ไม่ระบุคลัง";

    const qty = Number(item.qty);

    if (!Number.isFinite(qty) || qty <= 0) return;

    const current = groups.get(dcCode) || { dcCode, green: 0, red: 0, total: 0 };

    if (item.status === COMPLETED_STATUS) current.green += qty;

    else current.red += qty;

    current.total += qty;

    groups.set(dcCode, current);

  });

  return Array.from(groups.values()).sort((a, b) => a.dcCode.localeCompare(b.dcCode, "th"));

}

function isRequest(value: unknown): value is FleetRequest {

  return typeof value === "object" && value !== null && "dc_code" in value && "qty" in value && "status" in value;

}

export function readFleetRequests(value: unknown): FleetRequest[] {

  if (Array.isArray(value)) {

    if (!value.every(isRequest)) throw new Error("รายการข้อมูลไม่มี dc_code, qty หรือ status");

    return value;

  }

  if (isRequest(value)) return [value];

  if (typeof value === "object" && value !== null) {

    const data = value as Record<string, unknown>;

    for (const key of ["data", "result", "requests", "request", "items", "results"]) {

      if (data[key] !== undefined && data[key] !== null) return readFleetRequests(data[key]);

    }

  }

  throw new Error("รูปแบบข้อมูล API ไม่ตรงกับที่รองรับ");

}

const formatNumber = (value: number) => value.toLocaleString("en-US");

const percentage = (value: number, total: number) => total > 0 ? value / total * 100 : 0;

export default function FleetStatusByDc({

  timeline = [],
  title,
  initialFleetType = "all",
  requests: suppliedRequests,

  apiUrl = "http://192.168.158.210/api_new_truck/api/request_get.php",

}: Props = {}) {

  const [requests, setRequests] = useState<FleetRequest[]>([]);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [searchText, setSearchText] = useState("");

  const [dcFilter, setDcFilter] = useState("all");

  const [requestTypeFilter, setRequestTypeFilter] = useState(initialFleetType);

  const [reloadKey, setReloadKey] = useState(0);

  const fetchRequests = useCallback(async (signal: AbortSignal) => {

    setLoading(true);

    setError("");

    try {

      const res = await fetch(apiUrl, { method: "GET", cache: "no-store", signal });

      if (!res.ok) throw new Error(`ไม่สามารถดึงข้อมูลได้ (HTTP ${res.status})`);

      const data: unknown = await res.json();

      const list = readFleetRequests(data);

      if (!signal.aborted) setRequests(list);

    } catch (err) {

      if (!signal.aborted) setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการดึงข้อมูลจาก API");

    } finally {

      if (!signal.aborted) setLoading(false);

    }

  }, [apiUrl]);

  useEffect(() => {

    if (suppliedRequests !== undefined) return;

    const controller = new AbortController();

    void fetchRequests(controller.signal);

    return () => controller.abort();

  }, [fetchRequests, suppliedRequests, reloadKey]);

  const sourceRequests = suppliedRequests ?? requests;

  const dcOptions = useMemo(() => Array.from(new Set(sourceRequests.map((item) => String(item.dc_code || "").trim()).filter(Boolean))).sort(), [sourceRequests]);

  const requestTypeOptions = useMemo(() => Array.from(new Set(sourceRequests.map((item) => String(item.fleet_type || "").trim()).filter(Boolean))).sort(), [sourceRequests]);

  const filteredRequests = useMemo(() => sourceRequests.filter((item) => {

    const dcCode = String(item.dc_code || "").trim();

    const fleetType = String(item.fleet_type || "").trim();

    return (dcFilter === "all" || dcCode === dcFilter)

      && (requestTypeFilter === "all" || fleetType === requestTypeFilter)

      && dcCode.toLowerCase().includes(searchText.trim().toLowerCase());

  }), [sourceRequests, dcFilter, requestTypeFilter, searchText]);

  const dcSummary = useMemo(() => groupFleetByDc(filteredRequests), [filteredRequests]);

  const totals = useMemo(() => dcSummary.reduce((sum, item) => ({ total: sum.total + item.total, green: sum.green + item.green, red: sum.red + item.red }), { total: 0, green: 0, red: 0 }), [dcSummary]);

  const isLoading = suppliedRequests === undefined && loading;

  const activeError = suppliedRequests === undefined ? error : "";

  // fleet_type is the request category; fleet_truck_type is not used here.
  const selectedFleetType = requestTypeFilter !== "all" ? requestTypeFilter : requestTypeOptions.length === 1 ? requestTypeOptions[0] : "รถทุกประเภท";
  const displayTitle = title ?? `สถานะ${selectedFleetType}`;
  const summary = useMemo(() => {
    const rows: { key: string; label: string; color: string; qty: number }[] = [
      ...FLEET_STATUSES.map(status => ({ ...status, qty: 0 })),
      { key: "other", label: "สถานะอื่น", color: "#64748b", qty: 0 },
    ];
    for (const item of filteredRequests) {
      const qty = Number(item.qty);
      if (!Number.isFinite(qty) || qty <= 0 || Number(item.workload) !== 1) continue;
      const status = String(item.status ?? "").trim();
      const row = rows.find(row => row.key === status) ?? rows[rows.length - 1];
      row.qty += qty;
    }
    return rows;
  }, [filteredRequests]);
  const workloadTotal = summary.reduce((sum, row) => sum + row.qty, 0);

  const timelineMax = Math.max(1, ...timeline.flatMap((p) => [p.planned, p.actual ?? 0]));
  const point = (value: number, index: number) => `${30 + index * 240 / Math.max(1, timeline.length - 1)},${145 - value / timelineMax * 118}`;
  const plannedPath = timeline.map((p, i) => `${i === 0 ? "M" : "L"}${point(p.planned, i)}`).join(" ");
  // Null separates missing actual observations; do not join across missing data.
  const actualPath = timeline.map((p, i) => p.actual === null ? "" : `${i === 0 || timeline[i - 1].actual === null ? "M" : "L"}${point(p.actual, i)}`).join(" ");

  return (
    <section className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-slate-800 shadow-sm sm:p-6" aria-label={displayTitle}>
      <h2 className="mb-5 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">{displayTitle}</h2>
      {activeError && <p role="alert" className="mb-4 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">{activeError}</p>}
      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1.05fr_1fr_1fr]">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white [&_h3]:border-b [&_h3]:border-slate-200 [&_h3]:bg-slate-50 [&_h3]:px-4 [&_h3]:py-3 [&_h3]:text-center [&_h3]:text-[10px] [&_h3]:font-semibold [&_h3]:tracking-wide [&_h3]:text-slate-600 [&_svg]:block [&_svg]:w-full">
          <h3>DELIVERY TIMELINE FORECASTING &amp; ACCELERATION</h3>
          {timeline.length === 0 ? <div className="flex min-h-[170px] items-center justify-center px-4 py-6 text-center text-xs text-slate-400">ยังไม่มีข้อมูลแผนและวันที่ส่งมอบ</div> : <svg viewBox="0 0 300 168" role="img" aria-label="กราฟแผนและยอดส่งมอบสะสม">
            <line x1="15" y1="149" x2="286" y2="149" stroke="#ddd" />
            <path d={plannedPath} stroke="#888" strokeWidth="2" strokeDasharray="4 3" fill="none" />
            <path d={actualPath} stroke="#4978a4" strokeWidth="2" fill="none" />
            {timeline.map((p,i) => <text key={`${p.label}-${i}`} x={30 + i * 240 / Math.max(1,timeline.length-1)} y="162" textAnchor="middle" fontSize="8">{p.label}</text>)}
          </svg>}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-3 py-3 text-[10px] font-medium text-slate-500 [&_span]:inline-flex [&_span]:items-center [&_span]:gap-1.5 [&_i]:inline-block [&_i]:h-2 [&_i]:w-2 [&_i]:rounded-sm"><span><i style={{width:18,height:0,borderTop:"2px dashed #888"}} />Planned Delivery Timeline</span><span><i style={{width:18,height:2,background:"#4978a4"}} />Actual Delivery Curve</span></div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 pt-4">
          {isLoading ? <div className="flex min-h-[170px] items-center justify-center px-4 py-6 text-center text-xs text-slate-400" role="status">กำลังโหลดข้อมูล...</div> : activeError ? <div className="flex min-h-[170px] items-center justify-center px-4 py-6 text-center text-xs text-slate-400">โหลดข้อมูลไม่สำเร็จ</div> : dcSummary.length === 0 ? <div className="flex min-h-[170px] items-center justify-center px-4 py-6 text-center text-xs text-slate-400">ไม่พบข้อมูลตามตัวกรอง</div> : <>
            <div className="mb-2 ml-[64px] flex justify-between text-[10px] font-medium tabular-nums text-slate-400">{AXIS_TICKS.map(t => <span key={t}>{t}%</span>)}</div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-[64px] right-0 flex justify-between [&_i]:w-px [&_i]:bg-slate-100" aria-hidden="true">{AXIS_TICKS.map(t => <i key={t} />)}</div>
              {dcSummary.map(row => <div className="relative mb-2 grid grid-cols-[56px_1fr] items-center gap-2 last:mb-0" key={row.dcCode}>
                <span className="truncate text-right text-[10px] font-semibold text-slate-600" title={row.dcCode}>{row.dcCode}</span>
                <div className="flex h-4 overflow-hidden rounded-sm bg-slate-50" role="img" aria-label={`${row.dcCode}: ส่งมอบแล้ว ${row.green} คัน คงเหลือ ${row.red} คัน`}>
                  {row.green > 0 && <div className="flex min-w-0 items-center justify-center overflow-hidden whitespace-nowrap bg-emerald-500 text-[9px] font-semibold tabular-nums text-white" style={{width:`${percentage(row.green,row.total)}%`}} title={`ส่งมอบแล้ว ${row.green} คัน`}>{formatNumber(row.green)}</div>}
                  {row.red > 0 && <div className="flex min-w-0 items-center justify-center overflow-hidden whitespace-nowrap bg-rose-500 text-[9px] font-semibold tabular-nums text-white" style={{width:`${percentage(row.red,row.total)}%`}} title={`คงเหลือ ${row.red} คัน`}>{formatNumber(row.red)}</div>}
                </div>
              </div>)}
            </div>
            <div className="mb-0 ml-[64px] mt-2 flex justify-between text-[10px] font-medium tabular-nums text-slate-400">{AXIS_TICKS.map(t => <span key={t}>{t}%</span>)}</div>
          </>}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-3 py-3 text-[10px] font-medium text-slate-500 [&_span]:inline-flex [&_span]:items-center [&_span]:gap-1.5 [&_i]:inline-block [&_i]:h-2 [&_i]:w-2 [&_i]:rounded-sm"><span><i className="bg-emerald-500" />Actual Delivered</span><span><i className="bg-rose-500" />Remaining</span></div>
        </div>
        <div className="overflow-hidden rounded-xl border border-indigo-100 bg-white p-4 shadow-sm [&_h3]:mb-3 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-indigo-700 [&_table]:w-full [&_table]:border-collapse [&_th]:border-b [&_th]:border-slate-200 [&_th]:pb-2 [&_th]:text-right [&_th]:text-[11px] [&_th]:font-medium [&_th]:text-slate-400 [&_td]:border-b [&_td]:border-slate-100 [&_td]:py-2 [&_td]:text-xs [&_td]:text-slate-600">
          <h3>จำนวนรถในแต่ละสถานะ (คัน)</h3>
          <table><thead><tr><th scope="col"><span className="sr-only">สถานะ</span></th><th scope="col">รอรับ WL</th></tr></thead><tbody>
            {summary.filter(row => row.key !== "other" || row.qty > 0).map((row, i) => <tr key={row.key}>
              <td><span className="mr-2 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-semibold text-indigo-500">{i + 1}</span>{row.label}</td>
              <td className="w-20 text-right font-bold tabular-nums" style={{color:row.color}}>
                <div style={{position:"relative",minHeight:17}}>
                  <span aria-hidden="true" style={{position:"absolute",left:0,top:2,bottom:2,width:`${workloadTotal > 0 ? row.qty / workloadTotal * 45 : 0}%`,background:row.key === "success" ? "#46a51e" : row.color}} />
                  <span style={{position:"relative",paddingLeft:18}}>{isLoading || activeError ? "–" : formatNumber(row.qty)}</span>
                </div>
              </td>
            </tr>)}
            <tr className="bg-slate-50 [&_td]:border-0 [&_td]:px-2 [&_td]:font-bold [&_td]:text-slate-900 [&_td:last-child]:text-right"><td>รวม</td><td>{isLoading || activeError ? "–" : formatNumber(workloadTotal)}</td></tr>
          </tbody></table>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 [&_input]:h-9 [&_input]:rounded-lg [&_input]:border [&_input]:border-slate-200 [&_input]:bg-slate-50 [&_input]:px-3 [&_input]:text-xs [&_input]:outline-none [&_input:focus]:border-indigo-400 [&_select]:h-9 [&_select]:max-w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-slate-200 [&_select]:bg-white [&_select]:px-3 [&_select]:text-xs [&_button]:h-9 [&_button]:rounded-lg [&_button]:bg-indigo-50 [&_button]:px-3 [&_button]:text-xs [&_button]:font-medium [&_button]:text-indigo-700 [&_button:hover]:bg-indigo-100 [&_button:disabled]:opacity-50">
        <input aria-label="ค้นหาคลัง" placeholder="ค้นหา DC CODE..." value={searchText} onChange={e => setSearchText(e.target.value)} />
        <select aria-label="เลือกคลัง" value={dcFilter} onChange={e => setDcFilter(e.target.value)}><option value="all">ทุกคลัง</option>{dcOptions.map(dc => <option key={dc}>{dc}</option>)}</select>
        <select aria-label="ประเภทรถ (fleet_type)" value={requestTypeFilter} onChange={e => setRequestTypeFilter(e.target.value)}><option value="all">ประเภทรถทั้งหมด</option>{requestTypeOptions.map(type => <option key={type}>{type}</option>)}</select>
        <button type="button" onClick={() => {setSearchText("");setDcFilter("all");setRequestTypeFilter("all");}}>ล้างตัวกรอง</button>
        {suppliedRequests === undefined && <button type="button" disabled={isLoading} onClick={() => setReloadKey(k => k + 1)}>โหลดข้อมูลใหม่</button>}
      </div>
    </section>
  );
}

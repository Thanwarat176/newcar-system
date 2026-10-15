"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw, Search, Truck, Clock3 } from "lucide-react";

const DASHBOARD_API_URL =
  "http://192.168.158.210/api_new_truck/api/dashboard_sla_overdue.php";

interface OverdueRow {
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

export default function TablePage() {
  const [rows, setRows] = useState<OverdueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [asOf, setAsOf] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [dc, setDc] = useState("");
  const [fleet, setFleet] = useState("");

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
        if (!response.ok || result.status !== "success") {
          throw new Error(result.message || `โหลดข้อมูลไม่สำเร็จ (HTTP ${response.status})`);
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
  }, [refreshKey]);

  const dcOptions = useMemo(() => [...new Set(rows.map((row) => row.dc_code).filter(Boolean))].sort(), [rows]);
  const fleetOptions = useMemo(() => [...new Set(rows.map((row) => row.fleet_type).filter(Boolean))].sort(), [rows]);
  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return rows.filter((row) => (!dc || row.dc_code === dc) && (!fleet || row.fleet_type === fleet) &&
      (!keyword || [row.running_doc, row.request_id, row.unit_code, row.license, row.truck_type, row.process, row.dc_code]
        .some((value) => String(value ?? "").toLowerCase().includes(keyword))));
  }, [rows, dc, fleet, search]);
  const vehicles = new Set(filtered.map((row) => `${row.request_id}:${row.vehicle_no}`)).size;
  const requests = new Set(filtered.map((row) => String(row.request_id))).size;
  const longest = filtered.reduce((max, row) => Math.max(max, row.overdue_days), 0);
  const headers = ["DC Code", "Fleet Type", "Vehicle Type", "Current Status", "Days in Status", "SLA Limit", "Action Required"];
  const controlClass = "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest text-blue-600">FLEET DASHBOARD</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">ติดตามรายการเกิน SLA</h1>
            <p className="mt-2 text-sm text-slate-500">แสดงรายการจากทุกคำขอในระบบ · เรียงวันที่เกินมากที่สุดก่อน</p>
          </div>
          <button type="button" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />{loading ? "กำลังโหลด" : "รีเฟรชข้อมูล"}
          </button>
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          {[{label: "รถที่เกิน SLA", value: `${vehicles} คัน`, icon: <Truck size={20} />, color: "bg-rose-50 text-rose-700"},
            {label: "คำขอที่ต้องติดตาม", value: `${requests} คำขอ`, icon: <AlertTriangle size={20} />, color: "bg-amber-50 text-amber-700"},
            {label: "เกิน SLA มากที่สุด", value: `${longest} วัน`, icon: <Clock3 size={20} />, color: "bg-blue-50 text-blue-700"}]
            .map((card) => <div key={card.label} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.color}`}>{card.icon}</span>
              <div><p className="text-xs text-slate-500">{card.label}</p><p className="mt-1 text-xl font-bold">{loading || error ? "—" : card.value}</p></div>
            </div>)}
        </div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
            <label className="relative min-w-[220px] flex-1"><Search size={16} className="absolute left-3 top-3 text-slate-400" />
              <input aria-label="ค้นหารายการ" placeholder="ค้นหาเลขคำขอ ทะเบียน ประเภทรถ หรือขั้นตอน" value={search} onChange={(event) => setSearch(event.target.value)} className={`${controlClass} w-full pl-9`} />
            </label>
            <select aria-label="กรอง DC" value={dc} onChange={(event) => setDc(event.target.value)} className={controlClass}><option value="">ทุก DC</option>{dcOptions.map((value) => <option key={value}>{value}</option>)}</select>
            <select aria-label="กรอง Fleet Type" value={fleet} onChange={(event) => setFleet(event.target.value)} className={controlClass}><option value="">ทุก Fleet Type</option>{fleetOptions.map((value) => <option key={value}>{value}</option>)}</select>
            {(search || dc || fleet) && <button type="button" onClick={() => {setSearch("");setDc("");setFleet("");}} className="text-xs font-bold text-blue-700 hover:underline">ล้างตัวกรอง</button>}
          </div>
          {error && <div role="alert" className="m-4 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><AlertTriangle size={20} className="shrink-0" /><div><p className="font-bold">โหลดข้อมูลไม่สำเร็จ</p><p className="mt-1">{error}</p><p className="mt-2 break-all text-xs">API: {DASHBOARD_API_URL}</p></div></div>}
          <div className="max-h-[65vh] overflow-auto">
            <table aria-busy={loading} className="w-full min-w-[1150px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-slate-800 text-white"><tr>{headers.map((label) => <th key={label} scope="col" className="whitespace-nowrap border-r border-slate-600 px-4 py-3 text-xs font-bold">{label}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-200">
                {!loading && !error && filtered.map((row) => <tr key={`${row.request_id}-${row.vehicle_no}-${row.flow_id}`} className="hover:bg-slate-50">
                  <td className="px-4 py-4 font-bold">{row.dc_code || "—"}<p className="mt-1 text-[11px] font-normal text-slate-500">{row.running_doc}</p><p className="mt-1 text-[10px] font-normal text-slate-400">ID {row.request_id}</p></td>
                  <td className="px-4 py-4">{row.fleet_type || "—"}</td>
                  <td className="px-4 py-4 font-semibold">{row.truck_type || "—"}<p className="mt-1 text-[11px] font-normal text-slate-500">{row.license || "—"} · คันที่ {row.vehicle_no}</p></td>
                  <td className="px-4 py-4 font-semibold">{row.process_level}. {row.process}<p className="mt-1 text-[11px] font-normal text-slate-500">เริ่ม {formatDate(row.str_date)}</p></td>
                  <td className="bg-rose-50 px-4 py-4 text-rose-800"><span className="inline-flex items-center gap-2 text-base font-bold">{row.days_in_status} วัน<AlertTriangle size={16} /></span><p className="mt-1 text-[11px] font-semibold">เกิน SLA {row.overdue_days} วัน</p></td>
                  <td className="whitespace-nowrap px-4 py-4">{row.sla_limit} วัน</td>
                  <td className="whitespace-pre-line px-4 py-4 text-xs font-bold text-rose-700">{row.detail?.trim() || row.action_required?.trim() || "—"}</td>
                </tr>)}
                {(loading || error || filtered.length === 0) && <tr><td colSpan={7} className="px-4 py-14 text-center text-sm text-slate-500">{loading ? "กำลังโหลดรายการเกิน SLA จากทุกคำขอ..." : error ? "ยังไม่สามารถแสดงข้อมูลได้ กรุณาตรวจสอบข้อความด้านบน" : rows.length ? "ไม่พบรายการตามตัวกรอง" : "ไม่พบรายการที่เกิน SLA ในระบบ"}</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap justify-between gap-2 border-t border-slate-200 px-4 py-3 text-[11px] text-slate-500"><p>แสดง {filtered.length} ขั้นตอน · {vehicles} คัน{search || dc || fleet ? " ตามตัวกรอง" : " ทั้งระบบ"}</p><p>ข้อมูลวันที่ {formatDate(asOf)} · นับวันเริ่มต้นเป็นวันที่ 1</p></div>
        </section>
      </div>
    </main>
  );
}

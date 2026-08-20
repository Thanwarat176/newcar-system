"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

type Pair = { actual: number; planned: number };
type Matrix = Record<string, Record<string, Pair>>;
type Status = { id: number; name: string; code: number };
type Weekly = { date: string; day_name: string; p_work: number; p_down: number; a_work: number; a_down: number; total_plan: number; gap_pct: number; is_today: boolean };
type DashboardData = {
  success: boolean;
  message?: string;
  date: string;
  warehouse: string;
  fleet_types: Array<{ fleet_type: string; count: number }>;
  weekly_performance: Weekly[];
  statuses: Status[];
  truck_types: string[];
  vendors: Record<string, string>;
  matrix_type: Matrix;
  matrix_vendor: Matrix;
};
interface SelectedDC { DC_CODE?: string; DC_NAME?: string; DC_TYPE?: string }

const API_URL = "https://lite.cpall.co.th/Logistic/Daily-fleet-management-v2/api/get_dashboard_by_dc.php";
const nf = new Intl.NumberFormat("th-TH");
const n = (value: number) => nf.format(value || 0);
const thaiDate = (value: string) => new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
const thaiLongDate = (value: string) => new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T00:00:00`));
const localDate = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};

function matrixTotal(matrix: Matrix) {
  return Object.values(matrix).reduce((total, row) => {
    Object.values(row).forEach((item) => { total += Number(item.actual || 0); });
    return total;
  }, 0);
}

function StatCard({ title, value, active = false }: { title: string; value: string; active?: boolean }) {
  return <div className={`flex h-[88px] flex-col justify-between rounded-xl bg-white px-3 py-3 shadow-sm ${active ? "border-2 border-blue-500" : "border border-slate-200"}`}>
    <p className={`text-[18px] font-black leading-tight ${active ? "text-blue-600" : "text-slate-400"}`}>{title}</p>
    <p className={`text-right text-[20px] font-black leading-none ${active ? "text-blue-600" : "text-slate-900"}`}>{value}</p>
  </div>;
}

function TruckIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h11v9H3z"/><path d="M14 9h4l3 3v3h-7z"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>;
}

function CalendarIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>;
}

function MatrixTable({ mode, matrix, statuses, date, warehouse, labels }: { mode: "fleet" | "vendor"; matrix: Matrix; statuses: Status[]; date: string; warehouse: string; labels?: Record<string, string> }) {
  const allVisible = statuses.filter((status) => Object.values(matrix).some((row) => {
    const value = row[String(status.id)];
    return value && (value.actual || value.planned);
  }));
  const visible = mode === "vendor" ? allVisible.filter((status) => status.id !== 2 && !/วิ่ง.*ปกติ/i.test(status.name)) : allVisible;
  const rows = Object.entries(matrix);
  const valueOf = (row: Record<string, Pair>, status: Status) => Number(row[String(status.id)]?.actual || 0);
  const rowTotal = (row: Record<string, Pair>) => allVisible.reduce((sum, status) => sum + valueOf(row, status), 0);
  const notWorking = (row: Record<string, Pair>) => visible.reduce((sum, status) => sum + valueOf(row, status), 0);
  const columnTone = (name: string, index: number) => {
    if (/ปกติ/.test(name)) return "bg-blue-50/70 text-blue-700";
    if (/หยุด/.test(name)) return "bg-emerald-50/70 text-emerald-700";
    if (/เสีย|ซ่อม/.test(name)) return "bg-rose-50/70 text-rose-600";
    if (/พขร/.test(name)) return "bg-amber-50/70 text-amber-700";
    return index % 2 ? "bg-violet-50/60 text-violet-700" : "bg-slate-50 text-slate-500";
  };
  const title = mode === "fleet" ? "ตารางสรุปกองรถประจำวัน (Daily Fleet Summary Table)" : "ตารางสรุปสถานะรถที่ไม่ได้มาวิ่งงาน แยกรายบริษัทขนส่ง (Vendor Summary Table)";
  const subtitle = mode === "fleet" ? `กองรถประจำวันที่ ${thaiLongDate(date)} ${warehouse}` : `สถานะรถไม่ได้มาวิ่งงาน แยกรายซัพพลายเออร์ ประจำวันที่ ${thaiLongDate(date)} ${warehouse}`;

  return <section>
    <h2 className="mb-2 flex items-center gap-1.5 text-sm font-black text-slate-900"><span className="text-blue-600">▦</span>{title}</h2>
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3 text-center text-xs font-black tracking-wide text-blue-600">{subtitle}</div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 text-slate-400"><tr>
            <th className="min-w-48 border-r border-slate-100 px-4 py-3 text-left font-black">{mode === "fleet" ? "ประเภทรถ" : "บริษัทขนส่ง (VENDOR)"}</th>
            {mode === "vendor" && <th className="min-w-28 border-r border-slate-100 px-3 py-3 text-center font-black">รถทั้งหมด</th>}
            {visible.map((status, index) => <th key={status.id} className={`min-w-28 border-r border-slate-100 px-3 py-3 text-center font-black ${columnTone(status.name, index)}`}>{status.name}</th>)}
            {mode === "vendor" && <th className="min-w-32 bg-red-50 px-3 py-3 text-center font-black text-red-600">ไม่ได้มาวิ่งงาน</th>}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(([key, row]) => <tr key={key} className="hover:bg-slate-50/70">
              <td className="border-r border-slate-100 px-4 py-3 font-black text-slate-900">{key}{labels?.[key] ? ` - ${labels[key]}` : ""}</td>
              {mode === "vendor" && <td className="border-r border-slate-100 px-3 py-3 text-center font-black text-slate-800">{n(rowTotal(row))}</td>}
              {visible.map((status, index) => { const value = valueOf(row, status); return <td key={status.id} className={`border-r border-slate-100 px-3 py-3 text-center font-black underline decoration-dotted underline-offset-2 ${columnTone(status.name, index)}`}>{value ? n(value) : "–"}</td>; })}
              {mode === "vendor" && <td className="bg-red-50 px-3 py-3 text-center font-black text-red-600 underline decoration-dotted underline-offset-2">{n(notWorking(row))}</td>}
            </tr>)}
          </tbody>
          <tfoot><tr className="bg-slate-100 font-black text-slate-900">
            <td className="border-r border-slate-200 px-4 py-3">{mode === "fleet" ? "รวมทั้งหมด" : "รวมทั้งหมดทุกซัพพลายเออร์"}</td>
            {mode === "vendor" && <td className="border-r border-slate-200 px-3 py-3 text-center">{n(rows.reduce((sum, [, row]) => sum + rowTotal(row), 0))}</td>}
            {visible.map((status, index) => <td key={status.id} className={`border-r border-slate-200 px-3 py-3 text-center underline decoration-dotted underline-offset-2 ${columnTone(status.name, index)}`}>{n(rows.reduce((sum, [, row]) => sum + valueOf(row, status), 0))}</td>)}
            {mode === "vendor" && <td className="bg-red-50 px-3 py-3 text-center text-red-600 underline decoration-dotted underline-offset-2">{n(rows.reduce((sum, [, row]) => sum + notWorking(row), 0))}</td>}
          </tr></tfoot>
        </table>
      </div>
    </div>
  </section>;
}

export default function DashboardByDC() {
  const [selectedDC, setSelectedDC] = useState<SelectedDC | null>(null);
  const [selectedDate, setSelectedDate] = useState(localDate);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDC = () => {
      const saved = localStorage.getItem("selected_dc");
      if (!saved) return setSelectedDC(null);
      try { setSelectedDC(JSON.parse(saved) as SelectedDC); }
      catch { localStorage.removeItem("selected_dc"); setSelectedDC(null); }
    };
    loadDC();
    window.addEventListener("selectedDCChanged", loadDC);
    window.addEventListener("storage", loadDC);
    return () => { window.removeEventListener("selectedDCChanged", loadDC); window.removeEventListener("storage", loadDC); };
  }, []);

  const warehouse = selectedDC?.DC_CODE?.trim() || "";
  const fetchSummary = useCallback(async () => {
    if (!warehouse || !selectedDate) { setData(null); setError(!warehouse ? "ยังไม่ได้เลือก Warehouse / DC" : "กรุณาเลือกวันที่"); return; }
    try {
      setLoading(true); setError("");
      const params = new URLSearchParams({ action: "summary", warehouse, date: selectedDate });
      const response = await fetch(`${API_URL}?${params.toString().replace(/\+/g, "%20")}`, { headers: { Accept: "application/json" }, credentials: "omit", cache: "no-store" });
      const text = await response.text();
      if (!response.ok) throw new Error(`โหลดข้อมูลไม่สำเร็จ HTTP ${response.status}`);
      let result: DashboardData;
      try { result = JSON.parse(text) as DashboardData; } catch { throw new Error("API ส่งข้อมูลกลับมาไม่ใช่ JSON"); }
      if (!result.success) throw new Error(result.message || "API ไม่สามารถโหลดข้อมูลได้");
      setData(result);
    } catch (err) { setData(null); setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล"); }
    finally { setLoading(false); }
  }, [warehouse, selectedDate]);

  useEffect(() => { if (warehouse && selectedDate) void fetchSummary(); }, [warehouse, selectedDate, fetchSummary]);

  const summary = useMemo(() => {
    if (!data) return null;
    const fleetCount = (name: string) => data.fleet_types.find((item) => item.fleet_type.trim().toLocaleUpperCase() === name.toLocaleUpperCase())?.count || 0;
    const all = fleetCount("รถทั้งหมด") || matrixTotal(data.matrix_type);
    return { all, fleetCount };
  }, [data]);

  return <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
    <div className="mx-auto max-w-[1500px] space-y-5">
      <header className="rounded-2xl bg-gradient-to-r from-slate-950 via-blue-950 to-blue-800 p-5 text-white shadow-xl sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">Daily Fleet Management</p><h1 className="mt-2 text-2xl font-black sm:text-3xl">ภาพรวมการบริหารรถรายวัน</h1><p className="mt-2 text-sm text-blue-100">{warehouse || "ยังไม่ได้เลือก DC"}{selectedDC?.DC_NAME ? ` · ${selectedDC.DC_NAME}` : ""}</p></div>
          <form onSubmit={(e: FormEvent) => { e.preventDefault(); void fetchSummary(); }} className="flex flex-col gap-2 sm:flex-row">
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="h-11 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-bold text-white outline-none [color-scheme:dark] focus:bg-white/20" />
            <button disabled={loading || !warehouse || !selectedDate} className="h-11 rounded-xl bg-white px-5 text-sm font-black text-blue-950 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50">{loading ? "กำลังโหลด..." : "ค้นหาข้อมูล"}</button>
          </form>
        </div>
      </header>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
      {loading && !data && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1,2,3,4].map((x) => <div key={x} className="h-32 animate-pulse rounded-2xl bg-white" />)}</div>}

      {data && summary && <>
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-500"><span>ข้อมูลประจำวันที่ <b className="text-slate-700">{thaiDate(data.date)}</b></span><button onClick={() => void fetchSummary()} className="font-bold text-blue-700 hover:text-blue-900">↻ โหลดข้อมูลใหม่</button></div>
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-black text-slate-900"><TruckIcon />ประเภทรถยนต์</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="รถทั้งหมด" value={n(summary.all)} active />
            <StatCard title="รถในกอง" value={n(summary.fleetCount("รถในกอง"))} />
            <StatCard title="รถเสริม" value={n(summary.fleetCount("รถเสริม"))} />
            <StatCard title="รถโอนมาช่วย" value={n(summary.fleetCount("รถโอนมาช่วย"))} />
            <StatCard title="CROSS DOCK" value={n(summary.fleetCount("CROSS DOCK"))} />
            <StatCard title="รถโอนไปช่วยคลังอื่น" value={n(summary.fleetCount("รถโอนไปช่วยคลังอื่น"))} />
            <StatCard title="BACKHAUL" value={n(summary.fleetCount("BACKHAUL"))} />
          </div>
        </section>

        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-black text-slate-900"><CalendarIcon />สรุปแผนและการวิ่งงานล่วงหน้า 7 วัน</h2>
          <div className="overflow-x-auto pb-1">
            <div className="grid min-w-[1050px] grid-cols-7 gap-3">
              {data.weekly_performance.map((item) => (
                <article key={item.date} className={`h-[188px] rounded-xl bg-white p-3 shadow-sm ${item.is_today ? "border-2 border-blue-400" : "border border-slate-200"}`}>
                  <div className="flex h-[42px] items-start justify-between border-b border-slate-100 pb-2">
                    <div>
                      <p className={`text-xs font-black leading-none ${item.is_today ? "text-blue-600" : "text-slate-900"}`}>{item.day_name}</p>
                      <p className="mt-1.5 text-[10px] font-bold leading-none text-slate-400">{item.date.slice(8, 10)}/{item.date.slice(5, 7)}</p>
                    </div>
                    {item.is_today && <span className="rounded-full bg-violet-600 px-2 py-1 text-[10px] font-black leading-none text-white">วันนี้</span>}
                  </div>

                  <div className="mt-2.5">
                    <p className="text-[9px] font-black uppercase tracking-[0.08em] text-slate-400">ตามแผน (Plan)</p>
                    <div className="mt-1 flex justify-between text-[10px] font-black leading-none">
                      <span className="text-blue-700"><b className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />วิ่ง: {n(item.p_work)}</span>
                      <span className="text-orange-700"><b className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-orange-500" />หยุด: {n(item.p_down)}</span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.08em] text-slate-400">วิ่งจริง (Actual)</p>
                    <div className="mt-1 flex justify-between text-[10px] font-black leading-none">
                      <span className="text-emerald-700"><b className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />วิ่ง: {n(item.a_work)}</span>
                      <span className="text-violet-700"><b className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-violet-500" />หยุด: {n(item.a_down)}</span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
                    <span className="text-[9px] font-black text-slate-400">ความต่าง (%)</span>
                    <span className={`rounded-md px-2 py-1 text-[10px] font-black leading-none ${item.gap_pct === 0 ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"}`}>{item.gap_pct}%</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <MatrixTable mode="fleet" matrix={data.matrix_type} statuses={data.statuses} date={data.date} warehouse={data.warehouse || warehouse} />
        <MatrixTable mode="vendor" matrix={data.matrix_vendor} statuses={data.statuses} date={data.date} warehouse={data.warehouse || warehouse} labels={data.vendors} />
      </>}
    </div>
  </main>;
}
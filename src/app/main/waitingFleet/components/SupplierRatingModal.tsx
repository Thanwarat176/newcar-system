"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Save, Search, Star, X } from "lucide-react";

const BASE = "http://192.168.158.210/api_new_truck/api";
const PAGE_SIZE = 20;
type Rating = "" | "E" | "G" | "P" | "I";
type RawSupplier = Record<string, unknown>;
type Supplier = { id: string; code: string; name: string };
type RatingState = { value: Rating; saved: Rating; status: "loading" | "ready" | "error"; saving: boolean; message: string; saveError: boolean; updatedAt: string; updateBy: string };

function valueOf(item: RawSupplier, ...names: string[]): string {
  for (const name of names) {
    const key = Object.keys(item).find(k => k.toLowerCase() === name.toLowerCase());
    const value = key ? item[key] : undefined;
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim();
  }
  return "";
}
function ratingOf(value: unknown): Rating {
  const r = String(value ?? "").trim().toUpperCase();
  return r === "E" || r === "G" || r === "P" || r === "I" ? r : "";
}
async function readResponse(response: Response): Promise<{ success?: boolean; message?: string; data?: { rating?: unknown; updated_at?: string | null; update_by?: string | null } | null }> {
  const raw = await response.text();
  try { return JSON.parse(raw); }
  catch { throw new Error(`API ตอบกลับไม่ใช่ JSON (HTTP ${response.status})`); }
}

export default function SupplierRatingModal({ onClose }: { onClose: () => void }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ratings, setRatings] = useState<Record<string, RatingState>>({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadSuppliers = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${BASE}/suppliers.php`, { cache: "no-store" });
      if (!res.ok) throw new Error(`โหลดรายชื่อไม่สำเร็จ (HTTP ${res.status})`);
      const result = await res.json();
      const list: unknown = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : result?.result;
      if (!Array.isArray(list)) throw new Error("รูปแบบข้อมูลรายชื่อผู้ประกอบการไม่ถูกต้อง");
      const rows = list.filter((x): x is RawSupplier => !!x && typeof x === "object").map(item => {
        const id = valueOf(item, "id", "company_id", "supplier_id");
        return { id, code: valueOf(item, "code", "company_code", "supplier_code", "vendor_code") || id, name: valueOf(item, "company_name", "name") };
      }).filter(item => item.id && item.name);
      setSuppliers(Array.from(new Map(rows.map(row => [row.id, row])).values()).sort((a, b) => a.name.localeCompare(b.name, "th", { numeric: true })));
      setRatings({}); setPage(1);
    } catch (e) { setError(e instanceof Error ? e.message : "โหลดรายชื่อไม่สำเร็จ"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadSuppliers(); }, [loadSuppliers]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? suppliers.filter(s => [s.name, s.code, s.id].some(v => v.toLowerCase().includes(q))) : suppliers;
  }, [suppliers, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const activePage = Math.min(page, totalPages);
  const visible = useMemo(() => filtered.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE), [filtered, activePage]);

  const loadRating = useCallback(async (id: string) => {
    setRatings(prev => ({ ...prev, [id]: { value: "", saved: "", status: "loading", saving: false, message: "", saveError: false, updatedAt: "", updateBy: "" } }));
    try {
      const res = await fetch(`${BASE}/rate_supplier.php?id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const result = await readResponse(res);
      if (!res.ok || result.success !== true) throw new Error(result.message || `โหลดคะแนนไม่สำเร็จ (HTTP ${res.status})`);
      const rating = ratingOf(result.data?.rating);
      setRatings(prev => ({ ...prev, [id]: { value: rating, saved: rating, status: "ready", saving: false, message: "", saveError: false, updatedAt: String(result.data?.updated_at ?? ""), updateBy: String(result.data?.update_by ?? "") } }));
    } catch (e) {
      setRatings(prev => ({ ...prev, [id]: { value: "", saved: "", status: "error", saving: false, message: e instanceof Error ? e.message : "โหลดคะแนนไม่สำเร็จ", saveError: false, updatedAt: "", updateBy: "" } }));
    }
  }, []);

  useEffect(() => {
    for (const item of visible) if (!ratings[item.id]) void loadRating(item.id);
  }, [visible, ratings, loadRating]);

  async function saveRating(item: Supplier) {
    const state = ratings[item.id];
    if (!state || state.status !== "ready" || !state.value || state.saving) return;
    const selected = state.value;
    setRatings(prev => ({ ...prev, [item.id]: { ...prev[item.id], saving: true, message: "", saveError: false } }));
    try {
      const rawUser = localStorage.getItem("userInfo") || localStorage.getItem("user") || localStorage.getItem("authUser");
      if (!rawUser) throw new Error("ไม่พบข้อมูลผู้บันทึกคะแนน กรุณาเข้าสู่ระบบใหม่");
      let user: Record<string, unknown>;
      try {
        const parsed: unknown = JSON.parse(rawUser);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
        user = parsed as Record<string, unknown>;
      } catch { throw new Error("อ่านข้อมูลผู้ใช้งานไม่สำเร็จ กรุณาเข้าสู่ระบบใหม่"); }
      const name = String(user.name || user.NAME || "").trim();
      const surname = String(user.surname || user.SURNAME || "").trim();
      const employeeId = String(user.em_id || user.employee_id || user.EMPLOYEE_ID || user.id || "").trim();
      const fullName = `${name} ${surname}`.trim();
      const updateBy = fullName || employeeId;
      if (!updateBy) throw new Error("ไม่พบชื่อหรือรหัสผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่");
      const res = await fetch(`${BASE}/rate_supplier.php`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ id: item.id, rating: selected, update_by: updateBy }) });
      const result = await readResponse(res);
      if (!res.ok || result.success !== true) throw new Error(result.message || `บันทึกไม่สำเร็จ (HTTP ${res.status})`);
      setRatings(prev => ({ ...prev, [item.id]: { ...prev[item.id], value: selected, saved: selected, saving: false, message: "บันทึกคะแนนเรียบร้อยแล้ว", saveError: false, updatedAt: String(result.data?.updated_at ?? ""), updateBy: String(result.data?.update_by ?? "") } }));
    } catch (e) {
      setRatings(prev => ({ ...prev, [item.id]: { ...prev[item.id], saving: false, message: e instanceof Error ? e.message : "บันทึกคะแนนไม่สำเร็จ", saveError: true } }));
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="rating-title" className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 p-3 sm:p-5" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={event => event.stopPropagation()}>
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-blue-100 bg-gradient-to-r from-blue-50 via-white to-white px-5 py-5 sm:px-7">
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-700 text-white"><Star size={21} /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Supplier Rating</p><h2 id="rating-title" className="mt-0.5 text-lg font-bold text-slate-900">ให้คะแนนผู้ประกอบการ</h2><p className="mt-1 text-xs text-slate-500">ค้นหารายชื่อและบันทึกคะแนนผู้ให้บริการแต่ละราย</p></div></div>
          <button type="button" onClick={onClose} aria-label="ปิด" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={21} /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/80 p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="block w-full sm:max-w-md"><span className="mb-1.5 block text-xs font-semibold text-slate-600">ค้นหาผู้ประกอบการ</span><span className="relative block"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="ค้นหาด้วยชื่อ หรือรหัสซับ" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></span></label>
            <div className="flex items-center gap-3"><span className="text-xs text-slate-500">พบ <strong className="text-slate-800">{filtered.length.toLocaleString()}</strong> รายการ</span><button type="button" disabled={loading} onClick={() => void loadSuppliers()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-blue-50 disabled:opacity-50"><RefreshCw size={15} className={loading ? "animate-spin" : ""} />โหลดใหม่</button></div>
          </div>
          {error && <p role="alert" className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3.5 sm:px-5"><div><h3 className="text-sm font-bold text-slate-800">รายชื่อผู้ประกอบการ</h3><p className="mt-1 text-xs text-slate-400">เลือกระดับคะแนนและกดบันทึกในแต่ละแถว</p></div><span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600"><span className="h-2 w-2 rounded-full bg-rose-400" />ช่องสีแดง: ยังไม่ได้เลือกระดับคะแนน</span></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[930px] table-fixed text-left text-sm"><thead className="bg-blue-800 text-[11px] font-bold text-white"><tr><th className="w-14 px-4 py-3 text-center">ลำดับ</th><th className="w-32 px-4 py-3">รหัสซับ</th><th className="w-[26%] px-4 py-3">ชื่อผู้ประกอบการ</th><th className="w-56 px-4 py-3">ระดับคะแนน</th><th className="px-4 py-3">แก้ไขล่าสุด</th><th className="w-28 px-4 py-3 text-center">จัดการ</th></tr></thead><tbody className="divide-y divide-slate-100">
              {loading ? <tr><td colSpan={6} className="px-4 py-14 text-center text-sm text-slate-400">กำลังโหลดข้อมูล...</td></tr> : visible.length === 0 ? <tr><td colSpan={6} className="px-4 py-14 text-center text-sm text-slate-400">ไม่พบข้อมูลผู้ประกอบการ</td></tr> : visible.map((item, index) => {
                const state = ratings[item.id];
                const unrated = state?.status === "ready" && !state.value;
                const changed = !!state?.value && state.value !== state.saved;
                const dateMatch = state?.updatedAt?.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}:\d{2})(?::\d{2})?)?/);
                const displayDate = dateMatch ? `${dateMatch[3]}/${dateMatch[2]}/${dateMatch[1]}${dateMatch[4] ? ` ${dateMatch[4]} น.` : ""}` : state?.updatedAt || "ไม่ระบุ";
                return <tr key={item.id} className="align-top hover:bg-blue-50/50"><td className="px-4 py-4 text-center text-xs text-slate-400">{(activePage - 1) * PAGE_SIZE + index + 1}</td><td className="px-4 py-4"><span className="inline-block max-w-full break-all rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">{item.code}</span></td><td className="break-words px-4 py-4 text-sm font-semibold text-slate-800">{item.name}</td><td className="px-4 py-3">
                  <select aria-label={`คะแนน ${item.name}`} value={state?.value || ""} disabled={!state || state.status !== "ready" || state.saving} onChange={e => setRatings(prev => ({ ...prev, [item.id]: { ...prev[item.id], value: ratingOf(e.target.value), message: "", saveError: false } }))} className={`h-10 w-full rounded-xl border px-3 text-xs font-semibold outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${unrated ? "border-rose-300 bg-rose-50 text-rose-700 focus:border-rose-400 focus:ring-rose-100" : "border-slate-200 bg-white text-slate-700 focus:border-blue-400 focus:ring-blue-100"}`}><option value="">เลือกระดับคะแนน</option><option value="E">E (Excellent)</option><option value="G">G (Good)</option><option value="P">P (Pass)</option><option value="I">I (Improvement Required)</option></select>
                  {(!state || state.status === "loading") && <p className="mt-1.5 text-[11px] text-slate-400">กำลังโหลดคะแนน...</p>}{unrated && <p className="mt-1.5 text-[11px] font-medium text-rose-600">ยังไม่ได้เลือกระดับคะแนน</p>}{changed && !state?.message && <p className="mt-1.5 text-[11px] text-amber-600">ยังไม่ได้บันทึก</p>}{state?.message && <p role={state.status === "error" || state.saveError ? "alert" : "status"} className={`mt-1.5 break-words text-[11px] ${state.status === "error" || state.saveError ? "text-rose-600" : "text-emerald-600"}`}>{state.message}</p>}{state?.status === "error" && <button type="button" onClick={() => void loadRating(item.id)} className="mt-1 text-xs font-semibold text-blue-700 underline">โหลดคะแนนอีกครั้ง</button>}
                </td><td className="px-4 py-4 text-xs leading-relaxed text-slate-500">{state?.status === "ready" && state.saved ? <><p className="break-words font-medium text-slate-700">{state.updateBy || "ไม่ระบุ"}</p><p className="mt-1 text-slate-400">{displayDate}</p></> : <span className="text-slate-400">—</span>}</td><td className="px-4 py-3 text-center"><button type="button" onClick={() => void saveRating(item)} disabled={!state || state.status !== "ready" || !state.value || state.value === state.saved || state.saving} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-blue-700 px-3 text-xs font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"><Save size={14} />{state?.saving ? "บันทึก..." : "บันทึก"}</button></td></tr>;
              })}
            </tbody></table></div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-4 text-xs text-slate-500 sm:px-5"><span>แสดง {filtered.length ? (activePage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(activePage * PAGE_SIZE, filtered.length)} จาก {filtered.length.toLocaleString()} รายการ</span><div className="flex items-center gap-2"><button type="button" disabled={activePage <= 1} onClick={() => setPage(activePage - 1)} className="rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50 disabled:opacity-40">ก่อนหน้า</button><span className="px-2">หน้า {activePage} / {totalPages}</span><button type="button" disabled={activePage >= totalPages} onClick={() => setPage(activePage + 1)} className="rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50 disabled:opacity-40">ถัดไป</button></div></div>
          </div>
        </div>
        <footer className="flex shrink-0 justify-end border-t border-slate-100 bg-white px-5 py-4"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">ปิด</button></footer>
      </div>
    </div>
  );
}

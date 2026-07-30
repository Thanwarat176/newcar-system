"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type FormEvent,
} from "react";

type DashboardSummary = {
    success?: boolean;
    message?: string;
    data?: unknown;
    [key: string]: unknown;
};

interface SelectedDC {
    DC_CODE?: string;
    DC_NAME?: string;
    DC_TYPE?: string;
}

const API_URL =
    "https://lite.cpall.co.th/Logistic/Daily-fleet-management-v2/api/get_dashboard_by_dc.php";

export default function DashboardByDC() {
    const [selectedDC, setSelectedDC] = useState<SelectedDC | null>(null);
    const [selectedDate, setSelectedDate] = useState("2026-07-20");

    const [dashboardData, setDashboardData] =
        useState<DashboardSummary | null>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    /**
     * อ่านค่า selected_dc ตัวเดียวกับ Sidebar
     */
    useEffect(() => {
        const loadSelectedDC = () => {
            const savedSelectedDC = localStorage.getItem("selected_dc");

            if (!savedSelectedDC) {
                setSelectedDC(null);
                return;
            }

            try {
                const parsedDC = JSON.parse(savedSelectedDC) as SelectedDC;

                console.log("DASHBOARD SELECTED DC:", parsedDC);
                setSelectedDC(parsedDC);
            } catch (err) {
                console.error(
                    "อ่านข้อมูล selected_dc จาก localStorage ไม่ได้:",
                    err
                );

                localStorage.removeItem("selected_dc");
                setSelectedDC(null);
            }
        };

        loadSelectedDC();

        window.addEventListener("selectedDCChanged", loadSelectedDC);
        window.addEventListener("storage", loadSelectedDC);

        return () => {
            window.removeEventListener("selectedDCChanged", loadSelectedDC);
            window.removeEventListener("storage", loadSelectedDC);
        };
    }, []);

    const cleanValue = selectedDC?.DC_CODE?.trim() || "";

    const fetchDashboardSummary = useCallback(async () => {
        if (!cleanValue) {
            setDashboardData(null);
            setError("ยังไม่ได้เลือก Warehouse / DC");
            return;
        }
    
        if (!selectedDate) {
            setDashboardData(null);
            setError("กรุณาเลือกวันที่");
            return;
        }
    
        try {
            setLoading(true);
            setError("");
    
            const params = new URLSearchParams({
                action: "summary",
                warehouse: cleanValue,
                date: selectedDate,
            });
            
            const url = `${API_URL}?${params.toString().replace(/\+/g, "%20")}`;
    
            console.log("Request URL:", url);
            console.log("Payload:", {
                action: "summary",
                warehouse: cleanValue,
                date: selectedDate,
            });
    
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                },
                credentials: "include",
                cache: "no-store",
            });
    
            const responseText = await response.text();
    
            console.log("Response status:", response.status);
            console.log("Response text:", responseText);
    
            if (!response.ok) {
                throw new Error(
                    `โหลดข้อมูลไม่สำเร็จ HTTP ${response.status}: ${
                        responseText || response.statusText
                    }`
                );
            }
    
            let result: DashboardSummary;
    
            try {
                result = JSON.parse(responseText) as DashboardSummary;
            } catch {
                throw new Error(
                    `API ส่งข้อมูลกลับมาไม่ใช่ JSON: ${responseText}`
                );
            }
    
            if (result.success === false) {
                throw new Error(result.message || "API ไม่สามารถโหลดข้อมูลได้");
            }
    
            console.log("Dashboard response:", result);
            setDashboardData(result);
        } catch (err) {
            console.error("Fetch dashboard summary error:", err);
    
            setDashboardData(null);
            setError(
                err instanceof Error
                    ? err.message
                    : "เกิดข้อผิดพลาดในการโหลดข้อมูล"
            );
        } finally {
            setLoading(false);
        }
    }, [cleanValue, selectedDate]);

    /**
     * โหลดข้อมูลใหม่เมื่อเปลี่ยน DC หรือวันที่
     */
    useEffect(() => {
        if (!cleanValue || !selectedDate) return;

        void fetchDashboardSummary();
    }, [cleanValue, selectedDate, fetchDashboardSummary]);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void fetchDashboardSummary();
    };

    return (
        <main className="min-h-screen bg-slate-50 p-4 sm:p-6">
            <div className="mx-auto max-w-6xl">
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
                        <h1 className="text-xl font-black text-slate-900">
                            Dashboard Summary by DC
                        </h1>

                        <p className="mt-1 text-sm text-slate-500">
                            แสดงข้อมูลตาม Warehouse / DC ที่เลือกจาก Sidebar
                        </p>
                    </div>

                    <form
                        onSubmit={handleSubmit}
                        className="grid gap-4 border-b border-slate-200 bg-slate-50/70 p-5 sm:grid-cols-[1fr_220px_auto] sm:items-end sm:p-6"
                    >
                        <div>
                            <label className="mb-1.5 block text-xs font-bold text-slate-700">
                                Warehouse
                            </label>

                            <div className="flex h-11 items-center rounded-xl border border-slate-300 bg-slate-100 px-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold text-slate-900">
                                        {cleanValue || "ยังไม่ได้เลือก DC"}
                                    </p>

                                    {selectedDC?.DC_NAME && (
                                        <p className="truncate text-[10px] text-slate-500">
                                            {selectedDC.DC_NAME}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="selectedDate"
                                className="mb-1.5 block text-xs font-bold text-slate-700"
                            >
                                Date
                            </label>

                            <input
                                id="selectedDate"
                                type="date"
                                value={selectedDate}
                                onChange={(event) =>
                                    setSelectedDate(event.target.value)
                                }
                                className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-slate-500 focus:ring-4 focus:ring-slate-200"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !cleanValue || !selectedDate}
                            className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                            {loading ? "กำลังโหลด..." : "ค้นหาข้อมูล"}
                        </button>
                    </form>

                    <div className="p-5 sm:p-6">
                        <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                                Request
                            </p>

                            <div className="mt-2 space-y-1 text-sm text-blue-950">
                                <p>
                                    <span className="font-bold">action:</span>{" "}
                                    summary
                                </p>

                                <p>
                                    <span className="font-bold">warehouse:</span>{" "}
                                    {cleanValue || "-"}
                                </p>

                                <p>
                                    <span className="font-bold">date:</span>{" "}
                                    {selectedDate || "-"}
                                </p>
                            </div>

                            {cleanValue && selectedDate && (
                                <p className="mt-3 break-all rounded-lg bg-white/70 p-2 font-mono text-xs text-blue-900">
                                    {API_URL}
                                    ?action=summary&amp;warehouse=
                                    {encodeURIComponent(cleanValue)}
                                    &amp;date={encodeURIComponent(selectedDate)}
                                </p>
                            )}
                        </div>

                        {loading && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
                                <p className="text-sm font-semibold text-slate-600">
                                    กำลังโหลดข้อมูล...
                                </p>
                            </div>
                        )}

                        {!loading && error && (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                                <p className="text-sm font-bold text-red-700">
                                    เกิดข้อผิดพลาด
                                </p>

                                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-red-600">
                                    {error}
                                </p>
                            </div>
                        )}

                        {!loading && !error && dashboardData && (
                            <div>
                                <div className="mb-3 flex items-center justify-between">
                                    <h2 className="text-sm font-black text-slate-900">
                                        API Response
                                    </h2>

                                    <button
                                        type="button"
                                        onClick={() => void fetchDashboardSummary()}
                                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                                    >
                                        โหลดใหม่
                                    </button>
                                </div>

                                <pre className="max-h-[600px] overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-6 text-emerald-300">
                                    {JSON.stringify(dashboardData, null, 2)}
                                </pre>
                            </div>
                        )}

                        {!loading &&
                            !error &&
                            !dashboardData &&
                            cleanValue && (
                                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                                    <p className="text-sm text-slate-500">
                                        ไม่พบข้อมูล
                                    </p>
                                </div>
                            )}
                    </div>
                </div>
            </div>
        </main>
    );
}
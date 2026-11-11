"use client";

import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

// import * as XLSX from "xlsx";

import {
    DateRange,
    RangeKeyDict,
} from "react-date-range";

import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import XLSX from "xlsx-js-style";
import { th } from "date-fns/locale";

import {
    AlertCircle,
    CalendarDays,
    CalendarRange,
    Download,
    FileSpreadsheet,
    LoaderCircle,
    Search,
    X,
} from "lucide-react";

interface FlowDates {
    quota_wait_start_date?: string | null;
    quota_wait_end_date?: string | null;
    allocation_sign_start_date?: string | null;
    allocation_sign_end_date?: string | null;
    finance_approval_start_date?: string | null;
    finance_approval_end_date?: string | null;
    garage_delivery_start_date?: string | null;
    garage_delivery_end_date?: string | null;
    body_installation_start_date?: string | null;
    body_installation_end_date?: string | null;
    registration_wait_start_date?: string | null;
    registration_wait_end_date?: string | null;
    warehouse_delivery_start_date?: string | null;
    warehouse_delivery_end_date?: string | null;
    document_expiry_end_date?: string | null;
    document_cancel_date?: string | null;
}

type RequestDateValue = string | { date?: string | null } | null;

type TrackProcess = {
    level?: string | number | null;
    name?: string | null;
    startDate?: string | null;
    endDate?: string | null;
};

interface ExportRequestItem extends FlowDates {
    supplier_alloc?: string | null;
    id?: string | number | null;

    running_doc?: string;
    running_doc_vehicle_no?: string;
    unit_code?: string | null;

    vehicle_no?: string | number;
    vehicle_license?: string;
    vehicle_info?: FlowDates & {
        vehicle_no?: string | number | null;
        unit_code?: string | null;
        car_chassis?: string | null;
        car_model?: string | null;
        car_brand?: string | null;
        supplier_alloc?: string | null;
        car_engine?: string | null;
        car_license?: string | null;
        warehouse_plan_date?: string | null;
    } | null;
    vehicle_warehouse_info?: ExportRequestItem["vehicle_info"][];
    warehouse_plan_date?: string | null;

    current_process?: string;
    current_step?: number;
    total_steps?: number;
    trackProcess?: TrackProcess;

    dc_type?: string;
    dc_code?: string;

    date?: RequestDateValue;
    request_date?: RequestDateValue;
    created_at?: RequestDateValue;

    fleet_type?: string;
    fleet_truck_type?: string;

    license_replace?: string[] | string;

    qty?: number | string;
    approved_qty?: number | string | null;

    approved_truck_type?: string;
    approved_company_short_name?: string;
    approved_company_id?: string | number | null;
    approved_company_name?: string;

    truck_type_replace?: string;
    company_name_replace?: string;

    fbp_remark?: string;
    fbp_status?: string;
    fbp_approved_date?: string;

    usage_date?: string;

    workload?: number | string;
    truckturn?: number | string;

    status?: string;
    status_details?: string | null;

    request_by?: string;
    remark?: string;

    gm_status?: string;
    gm_approved_date?: string;
    gm_approved_by?: string;

    // ใช้เฉพาะตอน Export เพื่อแตกทะเบียนเป็นคนละแถว
    export_license?: string;
    export_qty?: number | string;
    export_row_index?: number;

    details?: ExportRequestDetail[];
    history?: RequestStatusHistoryItem[];
    incoming_trucks?: ExportRequestDetail[];
    flow_dates_by_vehicle?: Record<string, FlowDates>;
    flow_data?: Array<{
        vehicle_no?: string | number | null;
        process_level?: string | number | null;
        process_name?: string | null;
        str_date?: string | null;
        end_date?: string | null;
    }>;
}

interface ExportRequestDetail extends FlowDates {
    vehicle_no?: string | number;
    unit_code?: string | null;
    running_doc_vehicle_no?: string;
    warehouse_info?: ExportRequestItem["vehicle_info"];
    id?: string | number;
    request_id?: string | number;
    license?: string | null;
    province?: string | null;
    truck_type?: string | null;
    company_id?: string | number | null;
    company_name?: string | null;
    license_replace?: string | null;
    province_replace?: string | null;
    truck_type_replace?: string | null;
    company_id_replace?: string | number | null;
    company_name_replace?: string | null;
    status?: string | null;
}

interface FbpItem {
    STATUS?: string;
    COUNTRY?: string;
    idd?: string;
    CODE?: string;
    NAME?: string;
    ENG_NAME?: string;
    SHORT_NAME?: string;
    SIZE?: string;
    EMAIL?: string;
    LASTUPDATE?: string;
    UPDATEBY?: string;
}

interface RequestStatusHistoryItem {
    id?: string | number;
    request_id?: string | number;
    status?: string;
    status_details?: string;
    changed_by?: string;
    changed_at?: string;
}

interface GmApprovalInfo {
    status: "gm_pending" | "fbp_pending" | "reject_by_gm" | "";
    statusText: string;
    changedAt: string;
    changedBy: string;
}

interface FbpApprovalInfo {
    status: "progress" | "fbp_pending" | "reject_by_fbp" | "";
    statusText: string;
    changedAt: string;
}

interface ExportRequestModalProps {
    open: boolean;
    onClose: () => void;
    requests?: ExportRequestItem[];
    dcLabel?: string;
    exportApiUrl?: string;
}

function formatRunningDoc(item: ExportRequestItem): string {
    const code = [item.unit_code, item.running_doc_vehicle_no, item.vehicle_info?.unit_code]
        .map((value) => String(value ?? "").trim())
        .find((value) => /-(?:N\d+|\d+)$/i.test(value));

    // ใช้กติกาเดียวกับคอลัมน์เลขที่เอกสารใน Track Fleet
    return (code ?? item.running_doc?.trim() ?? "").replace(/-N\d+$/i, "");
}

const TRACK_FILTER_LABELS = {
    search: "คำค้นหา",
    chassis: "เลขตัวถัง",
    old_license: "ทะเบียนเก่า",
    vehicle_search: "ข้อมูลรถ",
    fleet_group: "กลุ่มรถ",
    fleet_type: "ประเภทคำขอ",
    truck_type: "ประเภทรถ",
    warehouse: "คลังที่เลือก",
    dc_type: "ประเภทคลัง",
    dc_code: "รหัสคลัง",
    status: "กลุ่มสถานะ",
    process: "ขั้นตอนปัจจุบัน",
} as const;

function getTrackFilterSummary(exportApiUrl?: string) {
    if (!exportApiUrl) return [];

    const path = exportApiUrl.split("#", 1)[0];
    const queryStart = path.indexOf("?");
    if (queryStart === -1) return [];
    const params = new URLSearchParams(path.slice(queryStart + 1));
    const filters: { key: string; label: string; value: string }[] = [];
    const fleetGroups = new Map([
        ["new-replacement", "รถออกใหม่/ทดแทน"],
        ["supplement", "รถเสริม"],
    ]);
    const statuses = new Map([
        ["progress", "คำขอรอพิจารณา (TCAS)"],
        ["cancel", "ไม่ผ่านกระบวนการ"],
        ["success", "เสร็จสิ้นกระบวนการ"],
    ]);

    for (const [key, label] of Object.entries(TRACK_FILTER_LABELS)) {
        let value = params.get(key)?.trim();
        if (!value || (value === "all" && !["search", "chassis", "old_license", "vehicle_search"].includes(key))) continue;

        if (key === "fleet_group") value = fleetGroups.get(value) ?? value;
        if (key === "status") value = statuses.get(value) ?? value;
        if (key === "process") value = value.replace(/^(\d+)\|(.+)$/, "$1. $2");
        if (key === "old_license" || key === "vehicle_search") {
            value = value.split(",").map((entry) => entry.trim()).filter(Boolean).join(", ");
        }
        if (value) filters.push({ key, label, value });
    }

    const start = params.get("start_date");
    const end = params.get("end_date");
    const processDateLabel = params.get("process_date_field") === "end_date"
        ? "วันที่สิ้นสุดขั้นตอน" : "วันที่เริ่มขั้นตอน";
    const ranges = [
        ["request-date", "วันที่ขอ", start, end],
        ["process-date", processDateLabel, params.get("process_date_from"), params.get("process_date_to")],
    ] as const;
    for (const [key, label, from, to] of ranges) {
        if (!from && !to) continue;
        if (key === "request-date" && from === "1753-01-01" && to === "9999-12-30") continue;
        const value = from && to ? `${from} ถึง ${to}` : from ? `ตั้งแต่ ${from}` : `ถึง ${to}`;
        filters.push({ key, label, value });
    }

    return filters;
}

function formatCurrentProcess(item: ExportRequestItem): string {
    const flow = item.flow_data?.[0];
    const process = item.trackProcess ?? { level: flow?.process_level, name: flow?.process_name };
    const level = String(process.level ?? "").trim();
    const name = process.name?.trim();

    if (level) return `${level}. ${name || "ยังไม่พบชื่อขั้นตอน"}`;
    return name || "ยังไม่พบข้อมูลขั้นตอน";
}

const TRACK_PROCESS_DATE_FIELDS: Partial<Record<number, readonly [keyof FlowDates, keyof FlowDates]>> = {
    1: ["quota_wait_start_date", "quota_wait_end_date"],
    2: ["allocation_sign_start_date", "allocation_sign_end_date"],
    3: ["finance_approval_start_date", "finance_approval_end_date"],
    4: ["garage_delivery_start_date", "garage_delivery_end_date"],
    5: ["body_installation_start_date", "body_installation_end_date"],
    6: ["registration_wait_start_date", "registration_wait_end_date"],
    8: ["warehouse_delivery_start_date", "warehouse_delivery_end_date"],
};

function getTrackProcessDate(process: TrackProcess | undefined, field: keyof FlowDates): string | null | undefined {
    if (!process || (!process.startDate && !process.endDate)) return undefined;
    const level = Number(process.level);
    const fields = TRACK_PROCESS_DATE_FIELDS[level];
    if (field === fields?.[0]) return process.startDate ?? null;
    if (field === fields?.[1]) return process.endDate ?? null;
    if (level === 9 && field === "document_cancel_date") return process.endDate || process.startDate || null;
    if (level === 10 && field === "document_expiry_end_date") return process.endDate || null;
    return undefined;
}

type TrackSearchVehicle = Pick<ExportRequestItem,
    "id" | "running_doc" | "running_doc_vehicle_no" | "unit_code" | "vehicle_no" | "vehicle_info"
> & {
    request_id?: string | number;
    incoming_truck_id?: string | number;
    warehouse_vehicle_no?: string | number;
    latest_process_level?: string | number | null;
    latest_process_name?: string | null;
    latest_process_str_date?: string | null;
    latest_process_end_date?: string | null;
};

type PagePayload<T> = { data: T[]; pagination?: { total_pages?: number; page?: number } };

async function fetchExportPayload<T extends { status?: string; message?: string }>(url: URL, signal: AbortSignal): Promise<T> {
    const response = await fetch(url.toString(), { signal, cache: "no-store" });
    const payload: T = await response.json();
    if (!response.ok || payload?.status !== "success") {
        throw new Error(payload?.message || `โหลดข้อมูลรายงานไม่สำเร็จ (HTTP ${response.status})`);
    }
    return payload;
}

async function loadExportPages<T>(url: URL, signal: AbortSignal): Promise<T[]> {
    const getPage = async (page: number) => {
        const pageUrl = new URL(url);
        pageUrl.searchParams.set("page", String(page));
        pageUrl.searchParams.set("limit", "100");
        const payload = await fetchExportPayload<PagePayload<T> & { status?: string }>(pageUrl, signal);
        if (!Array.isArray(payload.data) || Number(payload.pagination?.page ?? page) !== page) {
            throw new Error("รายการรถเปลี่ยนระหว่างโหลด กรุณาลองอีกครั้ง");
        }
        return payload;
    };
    const first = await getPage(1);
    const totalPages = Number(first.pagination?.total_pages);
    if (!Number.isInteger(totalPages) || totalPages < 0) {
        throw new Error("API ยังไม่ได้ส่งข้อมูลจำนวนหน้าของรายงาน");
    }
    const rows = [...first.data];
    for (let page = 2; page <= totalPages; page += 5) {
        const batch = await Promise.all(Array.from({ length: Math.min(5, totalPages - page + 1) },
            (_, offset) => getPage(page + offset)));
        batch.forEach(({ data }) => rows.push(...data));
    }
    return rows;
}

function verifyFlowDates(request: ExportRequestItem) {
    if (!Object.prototype.hasOwnProperty.call(request, "flow_dates_by_vehicle")) {
        throw new Error("API ยังไม่ได้ส่งวันที่ขั้นตอน กรุณาวาง request_get_export.php เวอร์ชันล่าสุดบนเซิร์ฟเวอร์");
    }
}

type ReportProgress = { loaded: number; total: number };

async function loadTrackSearchExport(
    trackUrl: URL, reportUrl: URL, signal: AbortSignal, onProgress: (progress: ReportProgress) => void,
): Promise<ExportRequestItem[]> {
    // ใช้โหมดเดียวกับตารางหลักเพื่อให้ได้รถครบทุกคันในเอกสารที่ตรงตัวกรอง
    trackUrl.searchParams.set("group_mode", "document");
    const documents = await loadExportPages<TrackSearchVehicle | { vehicles: TrackSearchVehicle[] }>(trackUrl, signal);
    const vehiclesByRequest = new Map<string, Map<string, TrackSearchVehicle>>();
    for (const document of documents) {
        for (const vehicle of "vehicles" in document ? document.vehicles : [document]) {
            const requestId = String(vehicle.request_id ?? "").trim();
            const vehicleId = String(vehicle.incoming_truck_id ?? vehicle.id ?? "").trim();
            if (!/^[1-9]\d*$/.test(requestId) || !vehicleId) {
                throw new Error("Track Fleet ไม่ได้ส่งรหัสคำขอหรือรหัสรถสำหรับทำรายงาน");
            }
            const vehicles = vehiclesByRequest.get(requestId) ?? new Map<string, TrackSearchVehicle>();
            vehicles.set(vehicleId, vehicle);
            vehiclesByRequest.set(requestId, vehicles);
        }
    }

    // รายละเอียดรายงานใช้รหัสคำขอที่พบแล้ว แยกจากเงื่อนไขการค้นหาของหน้า Track Fleet
    const detailUrl = new URL(reportUrl.origin + reportUrl.pathname);
    for (const key of ["warehouse", "user_type"]) {
        const value = reportUrl.searchParams.get(key);
        if (value) detailUrl.searchParams.set(key, value);
    }
    detailUrl.searchParams.set("lite", "0");
    const requests = [...vehiclesByRequest];
    if (requests.length) onProgress({ loaded: 0, total: requests.length });
    const rows: ExportRequestItem[] = [];
    for (let start = 0; start < requests.length; start += 6) {
        const batch = await Promise.all(requests.slice(start, start + 6).map(async ([requestId, vehicles]) => {
            const url = new URL(detailUrl);
            url.searchParams.set("id", requestId);
            const { data } = await fetchExportPayload<{ data: ExportRequestItem; status?: string }>(url, signal);
            if (String(data?.id ?? "") !== requestId) {
                throw new Error(`ข้อมูลรายงานของคำขอ ${requestId} ไม่ตรงกับผลค้นหา กรุณาลองอีกครั้ง`);
            }
            verifyFlowDates(data);
            const incomingById = new Map((data.incoming_trucks ?? []).map((vehicle) => [String(vehicle.id ?? ""), vehicle]));
            return [...vehicles].map(([vehicleId, vehicle]): ExportRequestItem => {
                const detail = incomingById.get(vehicleId);
                const vehicleNo = detail?.vehicle_no ?? vehicle.warehouse_vehicle_no ?? vehicle.vehicle_no;
                if (vehicleNo == null || String(vehicleNo).trim() === "") {
                    throw new Error(`ไม่พบลำดับรถในคำขอ ${requestId} กรุณาลองอีกครั้ง`);
                }
                return {
                    ...data,
                    running_doc: vehicle.running_doc || data.running_doc,
                    unit_code: vehicle.unit_code || detail?.unit_code,
                    running_doc_vehicle_no: vehicle.running_doc_vehicle_no || detail?.running_doc_vehicle_no,
                    vehicle_no: vehicleNo,
                    vehicle_info: detail?.warehouse_info ?? vehicle.vehicle_info,
                    trackProcess: {
                        level: vehicle.latest_process_level,
                        name: vehicle.latest_process_name,
                        startDate: vehicle.latest_process_str_date,
                        endDate: vehicle.latest_process_end_date,
                    },
                };
            });
        }));
        batch.forEach((vehicles) => rows.push(...vehicles));
        onProgress({ loaded: start + batch.length, total: requests.length });
    }
    return rows;
}

export default function ExportRequestModal({
    open,
    onClose,
    dcLabel,
    exportApiUrl,
}: ExportRequestModalProps) {
    const [trackRows, setTrackRows] = useState<ExportRequestItem[]>([]);
    const [loadingTrackRows, setLoadingTrackRows] = useState(true);
    const [trackError, setTrackError] = useState("");
    const [fbpError, setFbpError] = useState("");
    const [reportProgress, setReportProgress] = useState<ReportProgress | null>(null);
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [loadingFbp, setLoadingFbp] = useState(true);
    const isLoading = loadingTrackRows || loadingFbp;
    const loadError = trackError || fbpError;
    const datesInitialized = useRef(false);
    const requestApiUrl = exportApiUrl ||
        "http://192.168.158.210/api_new_truck/api/request_get_export.php";

    const trackFilters = useMemo(() => getTrackFilterSummary(exportApiUrl), [exportApiUrl]);
    const usesTrackFleetSearch = /(?:^|\/)track_fleet_get\.php$/.test(requestApiUrl.split(/[?#]/, 1)[0]);
    const [hasLocalDateRange, setHasLocalDateRange] = useState(false);

    // Load all request pages from the combined export API.
    useEffect(() => {
        if (!open) return;
        const controller = new AbortController();
        datesInitialized.current = false;
        setHasLocalDateRange(false);
        setTrackError("");
        setReportProgress(null);
        setTrackRows([]);
        setLoadingTrackRows(true);

        const loadAllVehicles = async () => {
            try {
                const sourceUrl = new URL(requestApiUrl, window.location.href);
                const reportUrl = new URL(sourceUrl);
                reportUrl.pathname = reportUrl.pathname.replace(/(?:request_get|track_fleet_get)\.php$/, "request_get_export.php");
                if (!reportUrl.pathname.endsWith("/request_get_export.php")) {
                    throw new Error("Export ต้องใช้ request_get_export.php กรุณาตรวจสอบ exportApiUrl");
                }
                reportUrl.searchParams.delete("group_mode");
                reportUrl.searchParams.set("lite", "0");

                const rows = usesTrackFleetSearch
                    ? await loadTrackSearchExport(sourceUrl, reportUrl, controller.signal, (progress) => {
                        if (!controller.signal.aborted) setReportProgress(progress);
                    })
                    : await loadExportPages<ExportRequestItem>(reportUrl, controller.signal);
                if (!usesTrackFleetSearch) rows.forEach(verifyFlowDates);
                if (!controller.signal.aborted) setTrackRows(rows);
            } catch (error) {
                if (!controller.signal.aborted) {
                    console.error("โหลดข้อมูล Export ไม่สำเร็จ:", error);
                    setTrackError(error instanceof Error ? error.message : "โหลดข้อมูล Export ไม่สำเร็จ");
                    setTrackRows([]);
                }
            } finally {
                if (!controller.signal.aborted) setLoadingTrackRows(false);
            }
        };
        void loadAllVehicles();
        return () => controller.abort();
    }, [open, requestApiUrl, usesTrackFleetSearch, loadAttempt]);

    const [fbpRows, setFbpRows] = useState<FbpItem[]>([]);
    const [fbpApprovalByRequest, setFbpApprovalByRequest] = useState<
        Record<string, FbpApprovalInfo>
    >({});

    useEffect(() => {
        if (!open) {
            return;
        }

        const controller = new AbortController();

        const loadFbpData = async () => {
            setLoadingFbp(true);
            setFbpError("");
            setFbpRows([]);
            try {
                const response = await fetch(
                    "http://192.168.158.210/api_new_truck/api/get_fbp.php",
                    {
                        method: "GET",
                        signal: controller.signal,
                        cache: "no-store",
                    }
                );

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const payload = await response.json();

                if (!Array.isArray(payload) && (payload.status !== "success" || !Array.isArray(payload.data))) {
                    throw new Error(payload.message || "โหลดข้อมูล FBP ไม่สำเร็จ");
                }
                const rows: FbpItem[] = Array.isArray(payload)
                    ? payload
                    : Array.isArray(payload?.data)
                        ? payload.data
                        : [];

                if (!controller.signal.aborted) setFbpRows(rows);
            } catch {
                if (!controller.signal.aborted) {
                    setFbpRows([]);
                    setFbpError("โหลดข้อมูลบริษัท FBP ไม่สำเร็จ");
                }
            } finally {
                if (!controller.signal.aborted) setLoadingFbp(false);
            }
        };

        loadFbpData();

        return () => {
            controller.abort();
        };
    }, [open, loadAttempt]);

    const safeRequests = useMemo<ExportRequestItem[]>(() => {
        const sourceRequests = trackRows;

        const normalizeCompanyName = (value?: string) =>
            String(value || "")
                .trim()
                .replace(/\s+/g, " ")
                .toLowerCase();

        const splitApprovedCompanyName = (value?: string) => {
            const rawValue = String(value || "")
                .trim()
                .replace(/\s+/g, " ");

            const match = rawValue.match(/^(.*?)\s*\(([^()]*)\)\s*$/);

            if (!match) {
                return {
                    companyName: rawValue,
                    truckType: "",
                };
            }

            const companyName = String(match[1] || "").trim();
            const truckType = String(match[2] || "").trim();

            // แยกวงเล็บออกเฉพาะเมื่อค่าด้านในมีลักษณะเป็นประเภทรถ เช่น B-6W 7.7 m
            if (!/\d+\s*W/i.test(truckType)) {
                return {
                    companyName: rawValue,
                    truckType: "",
                };
            }

            return {
                companyName,
                truckType,
            };
        };

        const fbpByName = new Map(
            fbpRows
                .filter((item) => normalizeCompanyName(item.NAME))
                .map((item) => [normalizeCompanyName(item.NAME), item])
        );

        return sourceRequests.map((item) => {
            const requestId =
                item.id !== null && item.id !== undefined
                    ? String(item.id)
                    : "";

            const parsedApprovedCompany = splitApprovedCompanyName(
                item.approved_company_name
            );

            const matchedFbp = fbpByName.get(
                normalizeCompanyName(parsedApprovedCompany.companyName)
            );

            const fbpApproval = requestId
                ? fbpApprovalByRequest[requestId]
                : undefined;

            return {
                ...item,
                status: item.status,
                status_details:
                    item.status_details,
                approved_company_name:
                    matchedFbp?.NAME ?? parsedApprovedCompany.companyName,
                approved_company_short_name:
                    matchedFbp?.SHORT_NAME ??
                    item.approved_company_short_name,
                approved_company_id:
                    matchedFbp?.CODE ?? item.approved_company_id,
                truck_type_replace:
                    parsedApprovedCompany.truckType ||
                    item.truck_type_replace,
                details:
                    item.details,
                fbp_status:
                    fbpApproval?.statusText ?? item.fbp_status,
                fbp_approved_date:
                    fbpApproval?.changedAt ?? item.fbp_approved_date,
            };
        });
    }, [
        trackRows,
        fbpRows,
        fbpApprovalByRequest,
    ]);

    // วันที่เริ่มต้น
    const [startDate, setStartDate] =useState("");

    // วันที่สิ้นสุด
    const [endDate, setEndDate] =useState("");

    // เปิดปิด Calendar
    const [showDatePicker,setShowDatePicker] =useState(false);

    // ช่วงวันที่ใน Calendar
    const [calendarRange,setCalendarRange,] =
        useState([
            {
                startDate: new Date(),
                endDate: new Date(),
                key: "selection",
            },
        ]);

    // Filter สำหรับแยกข้อมูล Export
    const [fleetTypeFilter, setFleetTypeFilter] = useState("all");
    const [currentStatusFilter, setCurrentStatusFilter] = useState("all");
    const [dcTypeFilter, setDcTypeFilter] = useState("all");
    const [dcCodeFilter, setDcCodeFilter] = useState("all");
    const [truckTypeFilter, setTruckTypeFilter] = useState("all");

    // Pagination สำหรับตาราง Preview
    const ROWS_PER_PAGE = 10;
    const [currentPage, setCurrentPage] = useState(1);

    // ประวัติสถานะ GM แยกตาม request_id
    const [gmApprovalByRequest, setGmApprovalByRequest] = useState<
        Record<string, GmApprovalInfo>
    >({});


    // แปลงวันที่เป็น YYYY-MM-DD
    const normalizeDateKey = (
        value?: string
    ) => {
        if (!value) {
            return "";
        }

        const raw =
            String(value).trim();

        if (!raw) {
            return "";
        }

        const dateOnly =
            raw.includes("T")
                ? raw.split("T")[0]
                : raw.split(" ")[0];

        if (
            /^\d{4}-\d{2}-\d{2}$/.test(
                dateOnly
            )
        ) {
            const [
                yearText,
                month,
                day,
            ] =
                dateOnly.split("-");

            let year =
                Number(yearText);

            if (
                year > 2400
            ) {
                year -= 543;
            }

            return `${year}-${month}-${day}`;
        }

        const slashMatch =
            dateOnly.match(
                /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/
            );

        if (
            slashMatch
        ) {
            const day =
                slashMatch[
                    1
                ].padStart(
                    2,
                    "0"
                );

            const month =
                slashMatch[
                    2
                ].padStart(
                    2,
                    "0"
                );

            let year =
                Number(
                    slashMatch[
                    3
                    ]
                );

            if (
                year < 100
            ) {
                year =
                    2500 +
                    year -
                    543;
            } else if (
                year > 2400
            ) {
                year -= 543;
            }

            return `${year}-${month}-${day}`;
        }

        const dashMatch =
            dateOnly.match(
                /^(\d{1,2})-(\d{1,2})-(\d{2,4})$/
            );

        if (
            dashMatch
        ) {
            const day =
                dashMatch[
                    1
                ].padStart(
                    2,
                    "0"
                );

            const month =
                dashMatch[
                    2
                ].padStart(
                    2,
                    "0"
                );

            let year =
                Number(
                    dashMatch[
                    3
                    ]
                );

            if (
                year < 100
            ) {
                year =
                    2500 +
                    year -
                    543;
            } else if (
                year > 2400
            ) {
                year -= 543;
            }

            return `${year}-${month}-${day}`;
        }

        const parsedDate =
            new Date(raw);

        if (
            !Number.isNaN(
                parsedDate.getTime()
            )
        ) {
            const year =
                parsedDate.getFullYear();

            const month =
                String(
                    parsedDate.getMonth() +
                    1
                ).padStart(
                    2,
                    "0"
                );

            const day =
                String(
                    parsedDate.getDate()
                ).padStart(
                    2,
                    "0"
                );

            return `${year}-${month}-${day}`;
        }

        return "";
    };

    // ใช้วันที่สร้างคำขอ และรองรับรูปแบบวันที่แบบ object จาก PHP
    const getRequestDateKey = (item: ExportRequestItem): string => {
        for (const value of [item.request_date, item.date, item.created_at]) {
            const key = normalizeDateKey(typeof value === "string" ? value : value?.date ?? undefined);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;

            const date = new Date(`${key}T00:00:00Z`);
            if (!Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === key) {
                return key;
            }
        }
        return "";
    };

    // แปลง Date เป็น YYYY-MM-DD
    const formatDateToKey = (
        date: Date
    ) => {
        const year =
            date.getFullYear();

        const month =
            String(
                date.getMonth() + 1
            ).padStart(
                2,
                "0"
            );

        const day =
            String(
                date.getDate()
            ).padStart(
                2,
                "0"
            );

        return `${year}-${month}-${day}`;
    };

    // แสดงวันที่ DD/MM/YYYY
    const formatThaiDate = (
        value?: string
    ) => {
        const dateKey =
            normalizeDateKey(
                value
            );

        if (
            !dateKey
        ) {
            return "-";
        }

        const [
            year,
            month,
            day,
        ] =
            dateKey.split("-");

        if (
            !year ||
            !month ||
            !day
        ) {
            return "-";
        }

        return `${day}/${month}/${year}`;
    };

    // วันที่แบบย่อสำหรับ Preview เพื่อลดพื้นที่ เช่น 06/08/26
    const formatShortDate = (
        value?: string
    ) => {
        const dateKey =
            normalizeDateKey(
                value
            );

        if (!dateKey) {
            return "-";
        }

        const [
            year,
            month,
            day,
        ] =
            dateKey.split("-");

        if (
            !year ||
            !month ||
            !day
        ) {
            return "-";
        }

        return `${day}/${month}/${year.slice(-2)}`;
    };

    // เช็กว่าเป็นข้อมูลรถรายคันจาก TCAS หรือไม่
    const isVehicleRow = (
        item: ExportRequestItem
    ) => {
        return (
            item.vehicle_no !== undefined &&
            item.vehicle_no !== null &&
            String(item.vehicle_no).trim() !== ""
        );
    };

    const normalizeGmHistoryStatus = (
        value?: string
    ) => {
        return String(value || "")
            .trim()
            .toLowerCase();
    };

    const getGmApprovalFromHistory = (
        history: RequestStatusHistoryItem[]
    ): GmApprovalInfo => {
        const sorted = [...history].sort((a, b) => {
            const timeA = new Date(
                String(a.changed_at || "").replace(" ", "T")
            ).getTime();

            const timeB = new Date(
                String(b.changed_at || "").replace(" ", "T")
            ).getTime();

            return timeA - timeB;
        });

        // ให้ผลการอนุมัติ/ไม่อนุมัติสำคัญกว่า gm_pending
        const decision = [...sorted]
            .reverse()
            .find((item) => {
                const status =
                    normalizeGmHistoryStatus(
                        item.status
                    );

                return (
                    status === "fbp_pending" ||
                    status === "reject_by_gm" ||
                    status === "reject_gm" ||
                    status === "rejected_by_gm" ||
                    status === "gm_rejected"
                );
            });

        if (decision) {
            const status =
                normalizeGmHistoryStatus(
                    decision.status
                );

            if (status === "fbp_pending") {
                return {
                    status: "fbp_pending",
                    statusText: "GM อนุมัติ",
                    changedAt:
                        String(
                            decision.changed_at || ""
                        ).trim(),
                    changedBy:
                        String(
                            decision.changed_by || ""
                        ).trim(),
                };
            }

            return {
                status: "reject_by_gm",
                statusText: "GM ไม่อนุมัติ",
                changedAt:
                    String(
                        decision.changed_at || ""
                    ).trim(),
                changedBy:
                    String(
                        decision.changed_by || ""
                    ).trim(),
            };
        }

        const pending = [...sorted]
            .reverse()
            .find(
                (item) =>
                    normalizeGmHistoryStatus(
                        item.status
                    ) === "gm_pending"
            );

        if (pending) {
            return {
                status: "gm_pending",
                statusText: "รอ GM อนุมัติ",
                changedAt: "",
                changedBy: "",
            };
        }

        return {
            status: "",
            statusText: "",
            changedAt: "",
            changedBy: "",
        };
    };

    useEffect(() => {
        if (!open) return;
        const historyRows: RequestStatusHistoryItem[] = trackRows.flatMap((request) =>
            (request.history || []).map((entry) => ({
                ...entry,
                request_id: entry.request_id ?? request.id ?? undefined,
            }))
        );
                const historyByRequest = historyRows.reduce<
                    Record<string, RequestStatusHistoryItem[]>
                >((groups, historyItem) => {
                    if (
                        historyItem.request_id === null ||
                        historyItem.request_id === undefined
                    ) {
                        return groups;
                    }

                    const requestId = String(historyItem.request_id);

                    if (!groups[requestId]) {
                        groups[requestId] = [];
                    }

                    groups[requestId].push(historyItem);

                    return groups;
                }, {});

                const approvalByRequest = Object.fromEntries(
                    Object.entries(historyByRequest).map(
                        ([requestId, history]) => [
                            requestId,
                            getGmApprovalFromHistory(history),
                        ]
                    )
                );

                const fbpApprovalByRequestData = Object.fromEntries(
                    Object.entries(historyByRequest).map(
                        ([requestId, history]) => {
                            const latestFbpHistory = [...history]
                                .filter((historyItem) => {
                                    const status = String(
                                        historyItem.status || ""
                                    )
                                        .trim()
                                        .toLowerCase();

                                    return (
                                        status === "progress" ||
                                        status === "fbp_pending" ||
                                        status === "reject_by_fbp"
                                    );
                                })
                                .sort((a, b) => {
                                    const timeA = new Date(
                                        String(a.changed_at || "")
                                            .replace(" ", "T")
                                    ).getTime();

                                    const timeB = new Date(
                                        String(b.changed_at || "")
                                            .replace(" ", "T")
                                    ).getTime();

                                    return timeB - timeA;
                                })[0];

                            if (!latestFbpHistory) {
                                return [
                                    requestId,
                                    {
                                        status: "",
                                        statusText: "",
                                        changedAt: "",
                                    } satisfies FbpApprovalInfo,
                                ];
                            }

                            const status = String(
                                latestFbpHistory.status || ""
                            )
                                .trim()
                                .toLowerCase() as FbpApprovalInfo["status"];

                            const statusTextMap: Record<string, string> = {
                                progress: "ผ่านการอนุมัติ",
                                fbp_pending: "รอดำเนินการ",
                                reject_by_fbp: "ไม่ผ่านการอนุมัติ",
                            };

                            return [
                                requestId,
                                {
                                    status,
                                    statusText: statusTextMap[status] || "",
                                    changedAt: String(
                                        latestFbpHistory.changed_at || ""
                                    ).trim(),
                                } satisfies FbpApprovalInfo,
                            ];
                        }
                    )
                ) as Record<string, FbpApprovalInfo>;

        setGmApprovalByRequest(approvalByRequest);
        setFbpApprovalByRequest(fbpApprovalByRequestData);
    }, [open, trackRows]);

    // กำหนดช่วงวันที่เริ่มต้นเมื่อเปิด Modal
    useEffect(() => {
        if (
            !open || loadingTrackRows || datesInitialized.current
        ) {
            return;
        }

        datesInitialized.current = true;
        const dates =
            trackRows
                .map(getRequestDateKey)
                .filter(
                    Boolean
                )
                .sort();

        if (
            dates.length ===
            0
        ) {
            const today =
                new Date();

            setStartDate("");
            setEndDate("");

            setCalendarRange([
                {
                    startDate:
                        today,

                    endDate:
                        today,

                    key:
                        "selection",
                },
            ]);

            return;
        }

        const firstDate =
            dates[0];

        const lastDate =
            dates[
            dates.length -
            1
            ];

        setStartDate(
            firstDate
        );

        setEndDate(
            lastDate
        );

        setCalendarRange([
            {
                startDate:
                    new Date(
                        `${firstDate}T00:00:00`
                    ),

                endDate:
                    new Date(
                        `${lastDate}T00:00:00`
                    ),

                key:
                    "selection",
            },
        ]);

        setShowDatePicker(
            false
        );
    }, [
        open,
        trackRows,
        loadingTrackRows,
    ]);

    // รายการตัวเลือกสำหรับ Filter
    const fleetTypeOptions = useMemo(() => {
        return Array.from(
            new Set(
                safeRequests
                    .map((item) => String(item.fleet_type || "").trim())
                    .filter(Boolean)
            )
        ).sort((a, b) => a.localeCompare(b, "th"));
    }, [safeRequests]);

    const currentStatusOptions = useMemo(() => {
        return Array.from(
            new Set(
                safeRequests
                    .map((item) => formatCurrentProcess(item))
                    .filter(Boolean)
            )
        ).sort((a, b) => {
            const stepA = Number(a.match(/^(\d+)\./)?.[1] || 999);
            const stepB = Number(b.match(/^(\d+)\./)?.[1] || 999);

            if (stepA !== stepB) {
                return stepA - stepB;
            }

            return a.localeCompare(b, "th");
        });
    }, [safeRequests]);

    const dcTypeOptions = useMemo(() => {
        return Array.from(
            new Set(
                safeRequests
                    .map((item) => String(item.dc_type || "").trim())
                    .filter(Boolean)
            )
        ).sort((a, b) => a.localeCompare(b, "th"));
    }, [safeRequests]);

    const dcCodeOptions = useMemo(() => {
        return Array.from(
            new Set(
                safeRequests
                    .filter((item) =>
                        dcTypeFilter === "all" ||
                        String(item.dc_type || "").trim() === dcTypeFilter
                    )
                    .map((item) => String(item.dc_code || "").trim())
                    .filter(Boolean)
            )
        ).sort((a, b) => a.localeCompare(b, "th"));
    }, [safeRequests, dcTypeFilter]);

    const truckTypeOptions = useMemo(() => {
        return Array.from(
            new Set(
                safeRequests
                    .map((item) => String(item.fleet_truck_type || "").trim())
                    .filter(Boolean)
            )
        ).sort((a, b) => a.localeCompare(b, "th"));
    }, [safeRequests]);

    // กรองข้อมูลตาม วันที่ + ประเภทคำขอ + สถานะ + คลัง + ประเภทรถ
    const exportRows =
        useMemo(() => {
            const applyDateRange = !usesTrackFleetSearch || hasLocalDateRange;
            if (applyDateRange && (!startDate || !endDate)) return [];

            const from =
                startDate <=
                    endDate
                    ? startDate
                    : endDate;

            const to =
                startDate <=
                    endDate
                    ? endDate
                    : startDate;

            return safeRequests
                .filter(
                    (
                        item
                    ) => {
                        const date =
                            getRequestDateKey(
                                item
                            );

                        const matchDate = !applyDateRange || (date >= from && date <= to);

                        const matchFleetType =
                            fleetTypeFilter === "all" ||
                            String(item.fleet_type || "").trim() ===
                            fleetTypeFilter;

                        const currentStatus =
                            formatCurrentProcess(item);

                        const matchCurrentStatus =
                            currentStatusFilter === "all" ||
                            currentStatus === currentStatusFilter;

                        const matchDcType =
                            dcTypeFilter === "all" ||
                            String(item.dc_type || "").trim() ===
                            dcTypeFilter;

                        const matchDcCode =
                            dcCodeFilter === "all" ||
                            String(item.dc_code || "").trim() ===
                            dcCodeFilter;

                        const matchTruckType =
                            truckTypeFilter === "all" ||
                            String(item.fleet_truck_type || "").trim() ===
                            truckTypeFilter;

                        return (
                            matchDate &&
                            matchFleetType &&
                            matchCurrentStatus &&
                            matchDcType &&
                            matchDcCode &&
                            matchTruckType
                        );
                    }
                )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        getRequestDateKey(
                            a
                        ).localeCompare(
                            getRequestDateKey(
                                b
                            )
                        )
                )
                .flatMap((item): ExportRequestItem[] => {
                    // flow_data_get.php numbers incoming cars in id order.
                    // Prefer those cars over outgoing details, which can have N:M replacements.
                    if (isVehicleRow(item)) return [{ ...item, export_qty: 1 }];
                    const incoming = item.incoming_trucks || [];
                    const details = item.details || [];
                    const vehicles = incoming.length ? incoming : details;
                    if (vehicles.length) {
                        return vehicles.map((vehicle, index) => {
                            const number = vehicle.vehicle_no ?? vehicle.warehouse_info?.vehicle_no ?? index + 1;
                            const info = vehicle.warehouse_info
                                ?? item.vehicle_warehouse_info?.find((entry) => String(entry?.vehicle_no) === String(number))
                                ?? null;
                            return {
                                ...item,
                                vehicle_no: number,
                                vehicle_info: info,
                                unit_code: vehicle.unit_code,
                                running_doc_vehicle_no: vehicle.running_doc_vehicle_no,
                                export_qty: 1,
                                export_row_index: index,
                            };
                        });
                    }
                    const keys = Array.from(new Set([
                        ...Object.keys(item.flow_dates_by_vehicle || {}),
                        ...(item.flow_data || []).map((flow) => String(flow.vehicle_no ?? "").trim()),
                        ...(item.vehicle_warehouse_info || []).map((info) => String(info?.vehicle_no ?? "").trim()),
                    ])).filter(Boolean).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                    if (!keys.length) {
                        const count = Math.max(1, Math.floor(Number(item.qty) || 1));
                        for (let number = 1; number <= count; number++) keys.push(String(number));
                    }
                    return keys.map((number, index) => ({
                        ...item,
                        vehicle_no: number,
                        vehicle_info: item.vehicle_warehouse_info?.find((entry) => String(entry?.vehicle_no) === number) ?? null,
                        export_qty: 1,
                        export_row_index: index,
                    }));
                });
        }, [
            safeRequests,
            usesTrackFleetSearch,
            hasLocalDateRange,
            startDate,
            endDate,
            fleetTypeFilter,
            currentStatusFilter,
            dcTypeFilter,
            dcCodeFilter,
            truckTypeFilter,
            fbpRows,
        ]);

    const totalPages = Math.max(
        1,
        Math.ceil(exportRows.length / ROWS_PER_PAGE)
    );

    const paginatedRows = useMemo(() => {
        const startIndex = (currentPage - 1) * ROWS_PER_PAGE;

        return exportRows.slice(
            startIndex,
            startIndex + ROWS_PER_PAGE
        );
    }, [exportRows, currentPage]);

    // เมื่อเปลี่ยนตัวกรองหรือช่วงวันที่ ให้กลับไปหน้าแรก
    useEffect(() => {
        setCurrentPage(1);
    }, [
        startDate,
        endDate,
        fleetTypeFilter,
        currentStatusFilter,
        dcTypeFilter,
        dcCodeFilter,
        truckTypeFilter,
    ]);

    // ป้องกันเลขหน้าเกินจำนวนหน้าหลังข้อมูลเปลี่ยน
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    // รวมจำนวนรถ
    const totalQty =
        useMemo(() => {
            return exportRows.reduce(
                (
                    total,
                    item
                ) => {
                    const qty =
                        Number(
                            item.export_qty ??
                            item.qty ??
                            0
                        );

                    return (
                        total +
                        (Number.isFinite(
                            qty
                        )
                            ? qty
                            : 0)
                    );
                },
                0
            );
        }, [
            exportRows,
        ]);

        // The export layout follows the requested column order. Missing API fields stay blank.
        const field = (item: ExportRequestItem, ...names: string[]) => {
            const data = item as unknown as Record<string, unknown>;
            const vehicle = data.vehicle_info as Record<string, unknown> | undefined;
            const warehouse = data.warehouse_info as Record<string, unknown> | undefined;
            const vehicleList = data.vehicle_warehouse_info as Record<string, unknown>[] | undefined;
            const matchingVehicle = vehicleList?.find(
                (entry) => String(entry?.vehicle_no ?? "") === String(item.vehicle_no ?? "")
            );
            for (const name of names) {
                const value = vehicle?.[name] ?? warehouse?.[name] ?? matchingVehicle?.[name] ?? data[name];
                if (value !== null && value !== undefined && value !== "") {
                    return typeof value === "string" || typeof value === "number"
                        ? value : "";
                }
            }
            return "";
        };
        const dateField = (item: ExportRequestItem, name: keyof FlowDates) => {
            const currentDate = getTrackProcessDate(item.trackProcess, name);
            if (currentDate !== undefined) return currentDate ? formatThaiDate(currentDate) : "";

            const key = String(item.vehicle_no ?? "").trim();
            const dates = item.flow_dates_by_vehicle?.[key];
            const matchingVehicle = item.vehicle_warehouse_info?.find(
                (entry) => String(entry?.vehicle_no ?? "") === key
            );
            let value: string | null | undefined;
            if (dates) {
                value = dates[name];
            } else if (item.flow_dates_by_vehicle && key) {
                // A missing vehicle entry means no flow dates for this car.
                value = null;
            } else {
                value = item.vehicle_info?.[name] ?? matchingVehicle?.[name] ?? item[name];
            }
            return value && String(value).trim() ? formatThaiDate(String(value)) : "";
        };
        const warehouseDate = (item: ExportRequestItem) => {
            const value = field(item, "warehouse_plan_date");
            return value ? formatThaiDate(String(value)) : "";
        };
        const exportDate = (value: unknown): string =>
            value ? formatThaiDate(String(value)) : "";
        const toExportRow = (item: ExportRequestItem, index: number) => ({
            "ลำดับ": index + 1,
            "วันที่สร้างคำขอ": exportDate(getRequestDateKey(item)),
            "ประเภทคำขอ": item.fleet_type || "",
            "สถานะปัจจุบัน": formatCurrentProcess(item),
            "เลขที่เอกสาร": formatRunningDoc(item),
            "ประเภทคลัง": item.dc_type || "",
            "ชื่อคลัง": item.dc_code || "",
            "ประเภทรถ": item.fleet_truck_type || "",
            "จำนวนรถที่ขอ (คัน) *": Number(item.export_qty ?? item.qty ?? 0) || 0,
            "รอรับ Workload": item.workload ?? "",
            "จำนวน truckturn": item.truckturn ?? "",
            "ทะเบียนทดแทน1(ระบุทะเบียน)": item.export_license || "",
            "หมายเหตุที่แจ้งขอ": item.remark || "",
            "วันที่ใช้งาน": exportDate(item.usage_date),
            "ผู้แจ้งขอ": item.request_by || "",
            "สถานะอนุมัติจาก GM": gmApprovalByRequest[String(item.id ?? "")]?.statusText || item.gm_status || "",
            "วันที่ GM อนุมัติ": exportDate(gmApprovalByRequest[String(item.id ?? "")]?.changedAt || item.gm_approved_date),
            "ประเภทรถที่อนุมัติ": item.approved_truck_type || "",
            "จำนวนรถที่อนุมัติ": item.approved_qty ?? "",
            "ชื่อบริษัทขนส่ง (ย่อ)2": item.approved_company_short_name || "",
            "VENDOR CODE": item.approved_company_id ?? "",
            "ชื่อบริษัทขนส่ง": item.approved_company_name || "",
            "ประเภทรถที่ถูกทดแทน": item.truck_type_replace || "",
            "บริษัทขนส่งที่ถูกทดแทน": item.company_name_replace || "",
            "หมายเหตุการสรรหาผู้ประกอบการ": item.fbp_remark || "",
            "สถานะการสรรหาผู้ประกอบการ": item.fbp_status || "",
            "วันที่สรรหาผู้ประกอบการ": exportDate(item.fbp_approved_date),
            "คาดการณ์วันเข้าคลัง": exportDate(field(item, "warehouse_plan_date")),
            "จัดสรรยี่ห้อรถ": field(item, "car_brand"),
            "จัดสรรผู้ผลิต": field(item, "supplier_alloc"),
            "จัดสรรรุ่นรถ": field(item, "car_model"),
            "เลขเครื่อง": field(item, "car_engine"),
            "เลข Chassis": field(item, "car_chassis"),
            "ทะเบียน": field(item, "car_license"),
            "เลขบันทึก FBP": field(item, "number_feb"),
            "วันที่เข้ามากรอกเลขบันทึก FBP": exportDate(field(item, "date_number_feb")),
            "เลขบันทึกแจ้ง TIS": field(item, "number_tis"),
            "วันที่เข้ามากรอกเลขบันทึกแจ้ง TIS": exportDate(field(item, "date_number_tis")),
            "เลขบันทึกแจ้ง TIL": field(item, "number_til"),
            "วันที่เข้ามากรอกเลขบันทึกแจ้ง TIL": exportDate(field(item, "date_number_til")),
            "เลขบันทึกแจ้ง ASK": field(item, "number_ask"),
            "วันที่เข้ามากรอกเลขบันทึกแจ้ง ASK": exportDate(field(item, "date_number_ask")),
            "เลขบันทึกแจ้ง Kleasing": field(item, "number_kleasing"),
            "วันที่เข้ามากรอกเลขบันทึกแจ้ง Kleasing": exportDate(field(item, "date_number_kleasing")),
            "เลขบันทึกแจ้ง TTB2": field(item, "number_ttb"),
            "วันที่เข้ามากรอกเลขบันทึกแจ้ง TTB2": exportDate(field(item, "date_number_ttb")),
            "เลขบันทึกแจ้ง THAIOLIX": field(item, "number_thaiolix"),
            "วันที่เข้ามากรอกเลขบันทึกแจ้ง THAIOLIX": exportDate(field(item, "date_number_thaiolix")),
            "วันที่เริ่มรอจัดสรรตามโควต้า": dateField(item, "quota_wait_start_date"),
            "วันที่สิ้นสุดรอจัดสรรตามโควต้า": dateField(item, "quota_wait_end_date"),
            "วันที่เริ่มรอลงนามหนังสือจัดสรร": dateField(item, "allocation_sign_start_date"),
            "วันที่สิ้นสุดรอลงนามหนังสือจัดสรร": dateField(item, "allocation_sign_end_date"),
            "วันที่เริ่มรอไฟแนนซ์อนุมัติ": dateField(item, "finance_approval_start_date"),
            "วันที่สิ้นสุดรอไฟแนนซ์อนุมัติ": dateField(item, "finance_approval_end_date"),
            "วันที่เริ่มรอส่งรถเข้าอู่": dateField(item, "garage_delivery_start_date"),
            "วันที่สิ้นสุดรอส่งรถเข้าอู่": dateField(item, "garage_delivery_end_date"),
            "วันที่เริ่มประกอบตู้/เครื่องทำความเย็น": dateField(item, "body_installation_start_date"),
            "วันที่สิ้นสุดประกอบตู้/เครื่องทำความเย็น": dateField(item, "body_installation_end_date"),
            "วันที่เริ่มรอจดทะเบียนรถ": dateField(item, "registration_wait_start_date"),
            "วันที่สิ้นสุดรอจดทะเบียนรถ": dateField(item, "registration_wait_end_date"),
            "วันที่เริ่มส่งมอบคลังแล้ว": dateField(item, "warehouse_delivery_start_date"),
            "วันที่สิ้นสุดหนังสือหมดอายุ": dateField(item, "document_expiry_end_date"),
            "วันที่ยกเลิกหนังสือ": dateField(item, "document_cancel_date"),
            "Remark": field(item, "remark"),
        });

        const previewColumns = Object.keys(toExportRow({} as ExportRequestItem, 0));

    // Export Excel
    const handleExport = () => {
        if (loadingTrackRows || loadingFbp || loadError || exportRows.length === 0) {
            return;
        }

        const excelData = exportRows.map(toExportRow);

        const worksheet = XLSX.utils.json_to_sheet(excelData);

        const excelHeaders = Object.keys(excelData[0]);
        const columnWidths = excelHeaders.map((header, index) => {
            if (index === 0) return 8;
            const longestValue = excelData.reduce((max, row) =>
                Math.max(max, String(row[header as keyof typeof row] ?? "").length), 0);
            return Math.min(38, Math.max(14, Math.min(header.length + 2, 30), longestValue + 2));
        });
        worksheet["!cols"] = columnWidths.map((wch) => ({ wch }));

        const sheetRange = worksheet["!ref"];

        if (sheetRange) {
            const range = XLSX.utils.decode_range(sheetRange);

            const lightGrayBorder = {
                top: {
                    style: "thin",
                    color: { rgb: "D1D5DB" },
                },
                bottom: {
                    style: "thin",
                    color: { rgb: "D1D5DB" },
                },
                left: {
                    style: "thin",
                    color: { rgb: "D1D5DB" },
                },
                right: {
                    style: "thin",
                    color: { rgb: "D1D5DB" },
                },
            };

            for (
                let rowIndex = range.s.r;
                rowIndex <= range.e.r;
                rowIndex++
            ) {
                for (
                    let columnIndex = range.s.c;
                    columnIndex <= range.e.c;
                    columnIndex++
                ) {
                    const cellAddress = XLSX.utils.encode_cell({
                        r: rowIndex,
                        c: columnIndex,
                    });

                    const cell = worksheet[cellAddress];

                    if (!cell) {
                        continue;
                    }

                    cell.s = {
                        ...(cell.s || {}),
                        border: lightGrayBorder,
                        alignment: {
                            vertical: "center",
                            horizontal:
                                columnIndex === 0 ||
                                    columnIndex === 8
                                    ? "center"
                                    : "left",
                            wrapText: true,
                        },
                    };

                    if (rowIndex === 0) {
                        cell.s = {
                            ...cell.s,
                            fill: {
                                patternType: "solid",
                                fgColor: {
                                    rgb: "1E40AF",
                                },
                            },
                            font: {
                                bold: true,
                                color: {
                                    rgb: "FFFFFF",
                                },
                            },
                            alignment: {
                                vertical: "center",
                                horizontal: "center",
                                wrapText: true,
                            },
                            border: lightGrayBorder,
                        };
                    }
                }
            }

            worksheet["!rows"] = [
                { hpt: 48 },
                ...excelData.map((row) => {
                    const lines = excelHeaders.reduce((max, header, index) => {
                        const value = String(row[header as keyof typeof row] ?? "");
                        return Math.max(max, Math.ceil(value.length / Math.max(1, columnWidths[index] - 2)));
                    }, 1);
                    return { hpt: Math.min(90, Math.max(22, lines * 16)) };
                }),
            ];

            worksheet["!autofilter"] = {
                ref: sheetRange,
            };
        }

        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "รายการคำขอ"
        );

        const from =
            startDate <= endDate ? startDate : endDate;

        const to =
            startDate <= endDate ? endDate : startDate;

        XLSX.writeFile(
            workbook,
            from && to ? `Truck_Request_${from}_to_${to}.xlsx` : "Truck_Request.xlsx"
        );
    };

    if (!open) {
        return null;
    }

    const ready = !isLoading && !loadError && exportRows.length > 0;
    const loadingTitle = loadingTrackRows
        ? reportProgress ? "กำลังดึงรายละเอียดรายงาน" : usesTrackFleetSearch ? "กำลังค้นหารายการรถจาก Track Fleet" : "กำลังโหลดรายการคำขอรถ"
        : "กำลังโหลดข้อมูลบริษัทขนส่ง";
    const missingDates = safeRequests.length > 0 && !safeRequests.some(getRequestDateKey);
    const emptyDescription = missingDates
        ? "ไม่มีวันที่สร้างคำขอที่ใช้กรองได้ในข้อมูลที่โหลด"
        : safeRequests.length > 0
            ? "ลองปรับตัวกรองเพิ่มเติมหรือช่วงวันที่ในหน้าต่างนี้"
            : "ลองเปลี่ยนคำค้นหาหรือตัวกรองบนหน้า Track Fleet แล้วเปิดรายงานอีกครั้ง";

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/55 p-2 backdrop-blur-sm sm:p-5">
            <div role="dialog" aria-modal="true" aria-labelledby="export-track-fleet-title"
                className="flex h-full max-h-[960px] w-full max-w-[1400px] flex-col overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl sm:rounded-3xl">
                <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 via-blue-50 to-slate-50 px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white shadow-sm">
                            <FileSpreadsheet size={20} />
                        </div>
                        <div className="min-w-0">
                            <h2 id="export-track-fleet-title" className="text-base font-bold text-slate-900">
                                ส่งออกรายงานคำขอรถ
                            </h2>
                            <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">
                                {dcLabel || "ข้อมูลคำขอทั้งหมดที่สามารถเข้าถึงได้"}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="ปิดหน้าต่างส่งออกรายงาน"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                    >
                        <X size={17} />
                    </button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                    <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-3 sm:px-5">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                            {trackFilters.length > 0 && (
                                <section aria-label="ตัวกรองจากหน้าหลัก" className="mb-3 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2.5">
                                    <p className="mb-1.5 text-[11px] font-semibold text-blue-800">ตัวกรองที่ส่งมาจากหน้าหลัก</p>
                                    <dl className="flex max-h-24 flex-wrap gap-1.5 overflow-auto">
                                        {trackFilters.map(({ key, label, value }) => (
                                            <div key={key} className="min-w-0 max-w-full rounded-lg border border-blue-100 bg-white px-2 py-1 text-[11px]">
                                                <dt className="mr-1.5 inline font-medium text-slate-500">{label}</dt>
                                                <dd className="inline break-words font-semibold text-blue-800">{value}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                </section>
                            )}
                            <div className="mb-3">
                                <h3 className="text-sm font-semibold text-slate-800">ตัวกรองเพิ่มเติม</h3>
                                <p className="mt-0.5 text-xs text-slate-500">เลือกเงื่อนไขเพื่อจำกัดรายการที่จะส่งออก</p>
                            </div>

                            <fieldset disabled={isLoading || !!loadError}
                                className="grid min-w-0 grid-cols-2 items-end gap-3 disabled:opacity-60 sm:grid-cols-3 xl:grid-cols-[minmax(160px,1.5fr)_repeat(5,minmax(0,1fr))_max-content]">
                                {/* 1. วันที่สร้างคำขอ */}
                                <div className="relative min-w-0">
                                    <label htmlFor="track-export-date" className="mb-1 block text-xs font-semibold text-slate-600">
                                        วันที่สร้างคำขอ
                                    </label>

                                    <button id="track-export-date"
                                        type="button"
                                        onClick={() =>
                                            setShowDatePicker((current) => !current)
                                        }
                                        className={`flex h-10 w-full items-center gap-2 rounded-xl border px-3 text-left text-xs font-bold shadow-sm outline-none transition ${showDatePicker
                                                ? "border-blue-500 bg-blue-50 text-blue-700 ring-4 ring-blue-100"
                                                : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"
                                            }`}
                                    >
                                        <CalendarDays
                                            size={14}
                                            className="shrink-0 text-blue-500"
                                        />

                                        <span className="min-w-0 flex-1 truncate">
                                            {startDate && endDate
                                                ? `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`
                                                : "เลือกช่วงวันที่สร้างคำขอ"}
                                        </span>

                                        <CalendarRange
                                            size={14}
                                            className="shrink-0 text-slate-400"
                                        />
                                    </button>

                                    {showDatePicker && (
                                        <div className="absolute left-0 top-full z-[99999] mt-2 w-[340px] max-w-[calc(100vw-4rem)] overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.28)] ring-1 ring-black/5">
                                            <div className="flex items-center justify-between border-b border-blue-100 bg-blue-50 px-4 py-3">
                                                <div>
                                                    <p className="text-xs font-black text-blue-700">
                                                        เลือกช่วงวันที่สร้างคำขอ
                                                    </p>

                                                    <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                                                        เลือกวันเริ่มต้น - วันสิ้นสุด
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => setShowDatePicker(false)}
                                                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm transition hover:bg-rose-50 hover:text-rose-500"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>

                                            <div className="flex justify-center overflow-auto bg-white [&_.rdrCalendarWrapper]:w-full [&_.rdrMonth]:w-full">
                                                <DateRange
                                                    locale={th}
                                                    editableDateInputs={false}
                                                    moveRangeOnFirstSelection={false}
                                                    ranges={calendarRange}
                                                    onChange={(item: RangeKeyDict) => {
                                                        const selection = item.selection;

                                                        const selectedStart =
                                                            selection.startDate || new Date();

                                                        const selectedEnd =
                                                            selection.endDate || selectedStart;

                                                        setHasLocalDateRange(true);
                                                        setCalendarRange([
                                                            {
                                                                startDate: selectedStart,
                                                                endDate: selectedEnd,
                                                                key: "selection",
                                                            },
                                                        ]);

                                                        setStartDate(
                                                            formatDateToKey(selectedStart)
                                                        );

                                                        setEndDate(
                                                            formatDateToKey(selectedEnd)
                                                        );
                                                    }}
                                                    showDateDisplay={false}
                                                    showPreview={false}
                                                    maxDate={new Date()}
                                                    rangeColors={["#2563eb"]}
                                                />
                                            </div>

                                            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-4 py-3">
                                                <div>
                                                    <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                                                        ช่วงวันที่ที่เลือก
                                                    </p>

                                                    <p className="mt-0.5 text-[11px] font-black text-blue-700">
                                                        {formatShortDate(startDate)} -{" "}
                                                        {formatShortDate(endDate)}
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => setShowDatePicker(false)}
                                                    className="shrink-0 rounded-xl bg-blue-600 px-4 py-2 text-[11px] font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                                                >
                                                    ใช้ช่วงวันที่นี้
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* 2. ประเภทคำขอ */}
                                <div className="min-w-0">
                                    <label htmlFor="track-export-fleet-type" className="mb-1 block text-xs font-semibold text-slate-600">
                                        ประเภทคำขอ
                                    </label>

                                    <select id="track-export-fleet-type"
                                        value={fleetTypeFilter}
                                        onChange={(e) =>
                                            setFleetTypeFilter(e.target.value)
                                        }
                                        className="h-10 w-full min-w-0 truncate rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                    >
                                        <option value="all">ทั้งหมด</option>

                                        {fleetTypeOptions.map((value) => (
                                            <option key={value} value={value}>
                                                {value}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* 3. สถานะปัจจุบัน */}
                                <div className="min-w-0">
                                    <label htmlFor="track-export-status" className="mb-1 block text-xs font-semibold text-slate-600">
                                        สถานะปัจจุบัน
                                    </label>

                                    <select id="track-export-status"
                                        value={currentStatusFilter}
                                        onChange={(e) =>
                                            setCurrentStatusFilter(e.target.value)
                                        }
                                        className="h-10 w-full min-w-0 truncate rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                    >
                                        <option value="all">ทั้งหมด</option>

                                        {currentStatusOptions.map((value) => (
                                            <option key={value} value={value}>
                                                {value}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* 4. ประเภทคลัง */}
                                <div className="min-w-0">
                                    <label htmlFor="track-export-dc-type" className="mb-1 block text-xs font-semibold text-slate-600">
                                        ประเภทคลัง
                                    </label>

                                    <select id="track-export-dc-type"
                                        value={dcTypeFilter}
                                        onChange={(e) => {
                                            setDcTypeFilter(e.target.value);
                                            setDcCodeFilter("all");
                                        }}
                                        className="h-10 w-full min-w-0 truncate rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                    >
                                        <option value="all">ทั้งหมด</option>

                                        {dcTypeOptions.map((value) => (
                                            <option key={value} value={value}>
                                                {value}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* 5. ชื่อคลัง */}
                                <div className="min-w-0">
                                    <label htmlFor="track-export-dc-code" className="mb-1 block text-xs font-semibold text-slate-600">
                                        ชื่อคลัง
                                    </label>

                                    <select id="track-export-dc-code"
                                        value={dcCodeFilter}
                                        onChange={(e) =>
                                            setDcCodeFilter(e.target.value)
                                        }
                                        className="h-10 w-full min-w-0 truncate rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                    >
                                        <option value="all">ทั้งหมด</option>

                                        {dcCodeOptions.map((value) => (
                                            <option key={value} value={value}>
                                                {value}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* 6. ประเภทรถ */}
                                <div className="min-w-0">
                                    <label htmlFor="track-export-truck-type" className="mb-1 block text-xs font-semibold text-slate-600">
                                        ประเภทรถ
                                    </label>

                                    <select id="track-export-truck-type"
                                        value={truckTypeFilter}
                                        onChange={(e) =>
                                            setTruckTypeFilter(e.target.value)
                                        }
                                        className="h-10 w-full min-w-0 truncate rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                    >
                                        <option value="all">ทั้งหมด</option>

                                        {truckTypeOptions.map((value) => (
                                            <option key={value} value={value}>
                                                {value}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* 7. ล้างตัวกรอง */}
                                <div className="w-fit shrink-0">
                                    <label className="mb-1 block select-none text-[10px] font-black text-transparent">
                                        จัดการ
                                    </label>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFleetTypeFilter("all");
                                            setCurrentStatusFilter("all");
                                            setDcTypeFilter("all");
                                            setDcCodeFilter("all");
                                            setTruckTypeFilter("all");
                                        }}
                                        className="flex h-10 w-fit items-center justify-center whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 text-[9px] font-black text-slate-500 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                                    >
                                        ล้างตัวกรองเพิ่มเติม
                                    </button>
                                </div>
                            </fieldset>
                        </div>
                    </div>

                    <div className="flex min-h-[260px] flex-1 flex-col bg-slate-50 px-3 py-3 sm:px-5">
                        <section aria-labelledby="export-preview-title" aria-busy={isLoading && !loadError}
                            className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
                            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
                                <div>
                                    <h3 id="export-preview-title" className="text-sm font-semibold text-slate-900">ตัวอย่างรายงาน</h3>
                                    {ready && <p className="mt-0.5 text-xs text-slate-500">เลื่อนตารางไปทางขวาเพื่อดูคอลัมน์ทั้งหมด</p>}
                                </div>
                                {ready && (
                                    <div className="flex flex-wrap gap-2 text-xs font-semibold">
                                        <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">{exportRows.length.toLocaleString("th-TH")} รายการ</span>
                                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{totalQty.toLocaleString("th-TH")} คัน</span>
                                    </div>
                                )}
                            </div>

                            {loadError ? (
                                <div role="alert" className="m-4 flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-4 text-center">
                                    <AlertCircle aria-hidden="true" size={23} className="text-rose-600" />
                                    <p className="text-sm font-semibold text-rose-900">โหลดรายงานไม่สำเร็จ</p>
                                    <p className="max-w-lg break-words text-xs text-rose-800">{loadError}</p>
                                    <button type="button" onClick={() => {
                                        setTrackError("");
                                        setFbpError("");
                                        setReportProgress(null);
                                        setLoadingTrackRows(true);
                                        setLoadingFbp(true);
                                        setLoadAttempt((attempt) => attempt + 1);
                                    }} className="mt-1 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100">
                                        ลองโหลดอีกครั้ง
                                    </button>
                                </div>
                            ) : isLoading ? (
                                <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-4 text-center">
                                    <LoaderCircle aria-hidden="true" size={26} className="mb-1 text-blue-600 motion-safe:animate-spin" />
                                    <p className="text-sm font-semibold text-slate-900">{loadingTitle}</p>
                                    {loadingTrackRows && reportProgress ? (
                                        <>
                                            <progress aria-label="จำนวนคำขอที่โหลดรายละเอียดแล้ว" max={reportProgress.total} value={reportProgress.loaded}
                                                className="h-2 w-52 max-w-full accent-blue-600" />
                                            <p className="text-xs tabular-nums text-slate-600">โหลดแล้ว {reportProgress.loaded.toLocaleString("th-TH")} จาก {reportProgress.total.toLocaleString("th-TH")} คำขอ</p>
                                        </>
                                    ) : (
                                        <p className="text-xs text-slate-600">ตัวอย่างรายงานจะแสดงเมื่อโหลดเสร็จ</p>
                                    )}
                                </div>
                            ) : !ready ? (
                                <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-4 text-center">
                                    <Search aria-hidden="true" size={25} className="mb-1 text-slate-400" />
                                    <p className="text-sm font-semibold text-slate-900">ไม่พบรายการที่จะส่งออก</p>
                                    <p className="max-w-md text-xs text-slate-600">{emptyDescription}</p>
                                </div>
                            ) : (
                                <>
                                <div
                                    className="min-h-0 w-full flex-1 overflow-auto overscroll-contain"
                                    style={{
                                        scrollbarGutter: "stable both-edges",
                                        WebkitOverflowScrolling: "touch",
                                        touchAction: "pan-x pan-y",
                                    }}
                                >
                                    <table className="w-max min-w-full table-fixed border-collapse text-left">
                                        <thead className="sticky top-0 z-10 bg-blue-800 text-[11px] font-semibold text-white">
                                            <tr>
                                                {previewColumns.map((column) => (
                                                    <th key={column} className={`border-r border-blue-700 px-3 py-2.5 align-middle leading-4 whitespace-normal break-words ${column === "ลำดับ" ? "w-[64px] min-w-[64px]" : "w-[170px] min-w-[170px] max-w-[220px]"}`}>
                                                        {column}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedRows.map((item, index) => {
                                                const row = toExportRow(
                                                    item,
                                                    (currentPage - 1) * ROWS_PER_PAGE + index
                                                );
                                                return (
                                                    <tr key={`${item.id ?? item.running_doc}-${item.vehicle_no ?? item.export_row_index ?? index}-${index}`}
                                                        className="border-b border-slate-100 text-xs even:bg-slate-50 hover:bg-blue-50">
                                                        {previewColumns.map((column) => (
                                                            <td key={column} className={`border-r border-slate-100 px-3 py-2 align-top leading-4 whitespace-normal break-words text-slate-700 ${column === "ลำดับ" ? "w-[64px] min-w-[64px] text-center" : "w-[170px] min-w-[170px] max-w-[220px]"}`}>
                                                                {row[column as keyof typeof row] ?? "-"}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="flex shrink-0 flex-col gap-2 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-[11px] font-bold text-slate-500">
                                        แสดง {((currentPage - 1) * ROWS_PER_PAGE) + 1}
                                        {" - "}
                                        {Math.min(currentPage * ROWS_PER_PAGE, exportRows.length)}
                                        {" จาก "}
                                        {exportRows.length.toLocaleString("en-US")} รายการ
                                    </p>

                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setCurrentPage((page) => Math.max(1, page - 1))
                                            }
                                            disabled={currentPage === 1}
                                            className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            ก่อนหน้า
                                        </button>

                                        <span className="min-w-[90px] text-center text-xs font-black text-slate-700">
                                            หน้า {currentPage} / {totalPages}
                                        </span>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setCurrentPage((page) =>
                                                    Math.min(totalPages, page + 1)
                                                )
                                            }
                                            disabled={currentPage === totalPages}
                                            className="h-9 rounded-xl border border-blue-200 bg-blue-50 px-4 text-xs font-black text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            ถัดไป
                                        </button>
                                    </div>
                                </div>
                                </>
                            )}
                        </section>
                    </div>
                </div>

                <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-600">สถานะรายงาน</p>
                        <p role="status" className="mt-0.5 text-xs font-medium text-slate-800">
                            {loadError ? "โหลดข้อมูลไม่สำเร็จ" : isLoading ? loadingTitle : ready
                                ? `พร้อมส่งออก ${exportRows.length.toLocaleString("th-TH")} รายการ`
                                : "ไม่มีรายการให้ส่งออก"}
                        </p>
                        {ready && startDate && endDate && (
                            <p className="mt-0.5 text-xs text-slate-500">{formatShortDate(startDate)} ถึง {formatShortDate(endDate)}</p>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 transition hover:bg-slate-50"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="button"
                            onClick={handleExport}
                            disabled={!ready}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 text-xs font-black text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                        >
                            {isLoading && !loadError
                                ? <LoaderCircle aria-hidden="true" size={15} className="motion-safe:animate-spin" />
                                : <Download aria-hidden="true" size={15} />}
                            ดาวน์โหลด Excel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
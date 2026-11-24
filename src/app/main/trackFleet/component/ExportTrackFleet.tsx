"use client";

import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

// import * as XLSX from "xlsx";

import XLSX from "xlsx-js-style";

import {
    AlertCircle,
    CloudUpload,
    ChevronDown,
    Download,
    FileSpreadsheet,
    LoaderCircle,
    Search,
    Upload,
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
    company_short_name?: string | null;
    company_short_name_replace?: string | null;

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
    export_detail?: ExportRequestDetail;
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
    real_license?: string | null;
    province?: string | null;
    truck_type?: string | null;
    company_id?: string | number | null;
    company_name?: string | null;
    license_replace?: string | null;
    province_replace?: string | null;
    truck_type_replace?: string | null;
    company_id_replace?: string | number | null;
    company_name_replace?: string | null;
    company_short_name?: string | null;
    company_short_name_replace?: string | null;
    replacing_targets?: ExportRequestDetail[];
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

export interface FleetImportUpdate {
    request_id: string;
    vehicle_no: string;
    unit_code: string;
    fields: Record<string, string | null>;
}

interface ExportRequestModalProps {
    onImportUpdates?: (updates: FleetImportUpdate[]) => Promise<void>;

    open: boolean;
    onClose: () => void;
    requests?: ExportRequestItem[];
    dcLabel?: string;
    exportApiUrl?: string;
    importApiUrl?: string; // Override when the import endpoint is in another directory.
}

function formatRunningDoc(item: ExportRequestItem): string {
    const code = [item.unit_code, item.running_doc_vehicle_no, item.vehicle_info?.unit_code]
        .map((value) => String(value ?? "").trim())
        .find((value) => /-(?:N\d+|\d+)$/i.test(value));

    // ใช้กติกาเดียวกับคอลัมน์เลขที่เอกสารใน Track Fleet
    return (code ?? item.running_doc?.trim() ?? "").replace(/-N\d+$/i, "");
}

function groupDocumentRows<T>(rows: T[], getDocument: (row: T) => string) {
    const groups = new Map<string | number, T[]>();
    rows.forEach((row, index) => {
        const key = getDocument(row) || index;
        const group = groups.get(key);
        if (group) group.push(row);
        else groups.set(key, [row]);
    });
    return Array.from(groups.values()).flat();
}

function documentRowSpans<T>(rows: T[], getDocument: (row: T) => string) {
    const spans = rows.map(() => 1);
    for (let index = rows.length - 2; index >= 0; index--) {
        const document = getDocument(rows[index]);
        if (document && document === getDocument(rows[index + 1])) {
            spans[index] = spans[index + 1] + 1;
            spans[index + 1] = 0;
        }
    }
    return spans;
}

const BUTTON_COLORS = {
    blue: { backgroundColor: "#1d4ed8", color: "#ffffff" },
    lightBlue: { backgroundColor: "#dbeafe", color: "#172554" },
    green: { backgroundColor: "#047857", color: "#ffffff" },
    lightGreen: { backgroundColor: "#d1fae5", color: "#022c22" },
    red: { backgroundColor: "#be123c", color: "#ffffff" },
    amber: { backgroundColor: "#92400e", color: "#ffffff" },
    indigo: { backgroundColor: "#4338ca", color: "#ffffff" },
    slate: { backgroundColor: "#334155", color: "#ffffff" },
};

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
        const terms = key === "search"
            ? params.getAll("search_terms[]").map((term) => term.trim()).filter(Boolean)
            : [];
        let value = terms.length ? terms.join(", ") : params.get(key)?.trim();
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
            // A request-level license list is only a display fallback. Do not
            // infer a vehicle relationship from the unit-code suffix.
            const incomingOrder = [...(data.incoming_trucks ?? [])].sort(
                (a, b) => Number(a.id) - Number(b.id)
            );
            const requestLicenses = (Array.isArray(data.license_replace)
                ? data.license_replace : String(data.license_replace ?? "").split(/[,;\n]+/))
                .map((license) => String(license).trim()).filter(Boolean);
            return [...vehicles].flatMap(([vehicleId, vehicle]): ExportRequestItem[] => {
                const detail = incomingById.get(vehicleId);
                const targetIds = new Set((detail?.replacing_targets ?? []).map((target) => String(target.id)));
                const unitCode = String(detail?.unit_code ?? vehicle.unit_code ?? "").trim();
                const targetLicenses = new Set((detail?.replacing_targets ?? [])
                    .map((target) => String(target.license ?? "").trim()).filter(Boolean));
                const linkedDetails = (data.details ?? []).filter((entry) =>
                    targetIds.has(String(entry.id)) ||
                    targetLicenses.has(String(entry.license ?? "").trim()) ||
                    (unitCode !== "" && String(entry.license_replace ?? "").trim() === unitCode)
                );
                if (linkedDetails.length === 0) {
                    linkedDetails.push(...(detail?.replacing_targets ?? []));
                }
                // Keep the selected vehicle even when its outgoing detail link is missing.
                // Do not attach unrelated outgoing licenses from the same request.
                const vehicleNo = detail?.vehicle_no ?? vehicle.warehouse_vehicle_no ?? vehicle.vehicle_no;
                if (vehicleNo == null || String(vehicleNo).trim() === "") {
                    throw new Error(`ไม่พบลำดับรถในคำขอ ${requestId} กรุณาลองอีกครั้ง`);
                }
                return [{
                    ...data,
                    details: linkedDetails,
                    // Retain one row per incoming vehicle when the API has no
                    // outgoing link. Only use an equally sized request list.
                    export_license: linkedDetails.length ? undefined
                        : incomingOrder.length === requestLicenses.length
                            ? requestLicenses[incomingOrder.findIndex((entry) => String(entry.id) === vehicleId)]
                            : undefined,
                    company_short_name: detail?.company_short_name ?? "",
                    company_short_name_replace: detail?.company_short_name_replace ?? "",
                    running_doc: vehicle.running_doc || data.running_doc,
                    unit_code: vehicle.unit_code || detail?.unit_code,
                    running_doc_vehicle_no: vehicle.running_doc_vehicle_no || detail?.running_doc_vehicle_no,
                    vehicle_no: vehicleNo,
                    vehicle_info: {
                        ...vehicle.vehicle_info,
                        ...detail?.warehouse_info,
                        car_license: detail?.warehouse_info?.car_license?.trim()
                            || vehicle.vehicle_info?.car_license?.trim()
                            || detail?.real_license?.trim() || "",
                    },
                    trackProcess: {
                        level: vehicle.latest_process_level,
                        name: vehicle.latest_process_name,
                        startDate: vehicle.latest_process_str_date,
                        endDate: vehicle.latest_process_end_date,
                    },
                }];
            });
        }));
        batch.forEach((vehicles) => rows.push(...vehicles));
        onProgress({ loaded: start + batch.length, total: requests.length });
    }
    return rows;
}


const MAX_EXPORT_ROWS = 100;

type ImportPreviewChange = {
    column: string;
    oldValue: string;
    newValue: string;
};

type ImportPreviewRow = {
    excelRowNumber: number;
    document: string;
    changes: ImportPreviewChange[];
};

export default function ExportRequestModal({
    open,
    onClose,
    dcLabel,
    exportApiUrl,
    importApiUrl,
    onImportUpdates,
}: ExportRequestModalProps) {
    const [exportMode, setExportMode] = useState<"report" | "update">("report");
    const [exportError, setExportError] = useState("");
    const importInput = useRef<HTMLInputElement>(null);
    const importReadVersion = useRef(0);
    const importSaveInFlight = useRef(false);
    const [showExportTable, setShowExportTable] = useState(false);
    const [isDraggingImport, setIsDraggingImport] = useState(false);
    const [importFileName, setImportFileName] = useState("");
    const [importPreview, setImportPreview] = useState<ImportPreviewRow[]>([]);
    const [importUpdates, setImportUpdates] = useState<FleetImportUpdate[]>([]);
    const [importError, setImportError] = useState("");
    const [importMessage, setImportMessage] = useState("");
    const [readingImport, setReadingImport] = useState(false);
    const [savingImport, setSavingImport] = useState(false);
    const [trackRows, setTrackRows] = useState<ExportRequestItem[]>([]);
    const [loadingTrackRows, setLoadingTrackRows] = useState(true);
    const [trackError, setTrackError] = useState("");
    const [fbpError, setFbpError] = useState("");
    const [reportProgress, setReportProgress] = useState<ReportProgress | null>(null);
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [loadingFbp, setLoadingFbp] = useState(true);
    const isLoading = loadingTrackRows || loadingFbp;
    const loadError = trackError || fbpError;
    const requestApiUrl = exportApiUrl ||
        "http://192.168.158.210/api_new_truck/api/request_get_export.php";

    const trackFilters = useMemo(() => getTrackFilterSummary(exportApiUrl), [exportApiUrl]);
    const usesTrackFleetSearch = /(?:^|\/)track_fleet_get\.php$/.test(requestApiUrl.split(/[?#]/, 1)[0]);

    // Load all request pages from the combined export API.
    useEffect(() => {
        if (!open) return;
        const controller = new AbortController();
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

                const historyUrl = new URL("request_status_history.php", reportUrl);
                const historyPromise = fetchExportPayload<{
                    status?: string;
                    data: Array<{ request_id: string | number; history: RequestStatusHistoryItem[] }>;
                }>(historyUrl, controller.signal);
                const rowsPromise = usesTrackFleetSearch
                    ? loadTrackSearchExport(sourceUrl, reportUrl, controller.signal, (progress) => {
                        if (!controller.signal.aborted) setReportProgress(progress);
                    })
                    : loadExportPages<ExportRequestItem>(reportUrl, controller.signal);
                const [rows, historyPayload] = await Promise.all([rowsPromise, historyPromise]);
                if (!Array.isArray(historyPayload.data)) {
                    throw new Error("รูปแบบประวัติสถานะคำขอไม่ถูกต้อง");
                }
                const historyById = new Map(historyPayload.data.map((entry) => [
                    String(entry.request_id), entry.history,
                ]));
                if (!usesTrackFleetSearch) rows.forEach(verifyFlowDates);
                if (!controller.signal.aborted) setTrackRows(rows.map((row) => ({
                    ...row,
                    history: historyById.get(String(row.id)) ?? row.history ?? [],
                })));
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

        // วันที่รายงาน GM ใช้ประวัติเข้าขั้น GM ตามกติกาของรายงาน
        const gmEntry = [...sorted].reverse().find((item) =>
            normalizeGmHistoryStatus(item.status) === "gm_checking"
        ) ?? [...sorted].reverse().find((item) =>
            normalizeGmHistoryStatus(item.status) === "gm_pending"
        );

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
                    status === "progress" ||
                    status === "partial_approved" ||
                    status === "success" ||
                    status === "reject_by_fbp" ||
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

            if (["fbp_pending", "progress", "partial_approved", "success", "reject_by_fbp"].includes(status)) {
                return {
                    status: "fbp_pending",
                    statusText: "อนุมัติแล้ว",
                    changedAt: String(gmEntry?.changed_at || "").trim(),
                    changedBy:
                        String(
                            gmEntry?.changed_by || ""
                        ).trim(),
                };
            }

            return {
                status: "reject_by_gm",
                statusText: "GM ไม่อนุมัติ",
                changedAt:
                    String(gmEntry?.changed_at || "").trim(),
                changedBy:
                    String(
                        gmEntry?.changed_by || ""
                    ).trim(),
            };
        }

        const pending = [...sorted]
            .reverse()
            .find(
                (item) =>
                    normalizeGmHistoryStatus(
                        item.status
                    ) === "gm_pending" || normalizeGmHistoryStatus(item.status) === "gm_checking"
            );

        if (pending) {
            return {
                status: "gm_pending",
                statusText: "รอ GM อนุมัติ",
                changedAt: String(gmEntry?.changed_at || "").trim(),
                changedBy: String(gmEntry?.changed_by || "").trim(),
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

    // กรองข้อมูลตาม วันที่ + ประเภทคำขอ + สถานะ + คลัง + ประเภทรถ
    const exportRows =
        useMemo(() => {
            const seenDetailRows = new Set<string>();
            return safeRequests
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
                    const details = (item.details?.length ? item.details
                        : isVehicleRow(item) ? [] : (item.incoming_trucks ?? []).flatMap((vehicle) => vehicle.replacing_targets ?? [])) ?? [];
                    if (details.length > 0) {
                        return details.map((detail, index): ExportRequestItem => {
                            // Keep flow dates attached to the actual incoming vehicle, even
                            // when multiple outgoing licenses point to that same vehicle.
                            const replacementCode = String(detail.license_replace ?? "").trim();
                            const linkedIncoming = item.incoming_trucks?.find((vehicle) =>
                                (vehicle.replacing_targets ?? []).some((target) => String(target.id) === String(detail.id)) ||
                                (replacementCode !== "" && String(vehicle.unit_code ?? "").trim() === replacementCode)
                            );
                            const number = isVehicleRow(item) ? item.vehicle_no
                                : linkedIncoming?.vehicle_no ?? detail.vehicle_no ?? index + 1;
                            const info = isVehicleRow(item) ? item.vehicle_info
                                : linkedIncoming?.warehouse_info ?? detail.warehouse_info ?? null;
                            return {
                                ...item,
                                vehicle_no: number,
                                vehicle_info: info,
                                unit_code: linkedIncoming?.unit_code || info?.unit_code || replacementCode || item.unit_code,
                                export_detail: detail,
                                export_license: String(detail.license ?? "").trim(),
                                export_qty: 1,
                                export_row_index: index,
                                company_short_name: detail.company_short_name ?? "",
                                company_short_name_replace: detail.company_short_name_replace ?? "",
                                company_name_replace: detail.company_name ?? "",
                                truck_type_replace: detail.truck_type_replace ?? "",
                            };
                        });
                    }
                    if (isVehicleRow(item)) return [{ ...item, export_qty: 1 }];
                    const incoming = item.incoming_trucks || [];
                    const vehicles = incoming;
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
                                company_short_name: vehicle.company_short_name ?? "",
                                company_short_name_replace: vehicle.company_short_name_replace ?? "",
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
                })
                .filter((row) => {
                    // Track Fleet can return several incoming rows for one request.
                    // Each outgoing detail must appear only once in the final report.
                    if (!row.export_detail) return true;
                    const detailId = String(row.export_detail.id ?? "").trim();
                    const requestId = String(row.export_detail.request_id ?? row.id ?? row.running_doc ?? "");
                    const key = JSON.stringify([requestId, detailId || `index:${row.export_row_index ?? ""}`]);
                    if (seenDetailRows.has(key)) return false;
                    seenDetailRows.add(key);
                    return true;
                });
        }, [safeRequests]);

    const totalPages = Math.max(
        1,
        Math.ceil(exportRows.length / ROWS_PER_PAGE)
    );

    const previewRows = useMemo(() => groupDocumentRows(
        exportRows.map((item, index) => ({ item, sequence: index + 1, document: formatRunningDoc(item) })),
        (row) => row.document
    ), [exportRows]);
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    const paginatedRows = previewRows.slice(startIndex, startIndex + ROWS_PER_PAGE);
    const previewDocumentSpans = documentRowSpans(paginatedRows, (row) => row.document);

    useEffect(() => { setCurrentPage(1); }, [open, exportApiUrl]);

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
    const getReplacementLicense = (item: ExportRequestItem) => String(
        item.export_detail?.license || item.export_license ||
        (item.export_row_index != null ? item.details?.[item.export_row_index]?.license : "") ||
        (!item.export_detail && item.export_row_index != null
            ? (Array.isArray(item.license_replace) ? item.license_replace
                : String(item.license_replace ?? "").split(/[,;\n]+/))
                .map((license) => String(license).trim()).filter(Boolean)[item.export_row_index]
            : "") || ""
    ).trim();
    const firstStatusByDocument = useMemo(() => {
        const statuses = new Map<string, string>();
        for (const item of exportRows) {
            const document = formatRunningDoc(item);
            if (document && !statuses.has(document)) {
                statuses.set(document, formatCurrentProcess(item));
            }
        }
        return statuses;
    }, [exportRows]);

    const toExportRow = (item: ExportRequestItem, index: number) => ({
        "ลำดับ": index + 1,
        "วันที่สร้างคำขอ": exportDate(getRequestDateKey(item)),
        "ประเภทคำขอ": item.fleet_type || "",
        "สถานะปัจจุบัน": firstStatusByDocument.get(formatRunningDoc(item)) ?? formatCurrentProcess(item),
        "เลขที่เอกสาร": formatRunningDoc(item),
        "ประเภทคลัง": item.dc_type || "",
        "ชื่อคลัง": item.dc_code || "",
        "ประเภทรถ": item.fleet_truck_type || "",
        "จำนวนรถที่ขอ (คัน) *": Number(item.export_qty ?? item.qty ?? 0) || 0,
        "รอรับ Workload": item.workload ?? "",
        "จำนวน truckturn": item.truckturn ?? "",
        "ทะเบียนทดแทน1(ระบุทะเบียน)": getReplacementLicense(item),
        "หมายเหตุที่แจ้งขอ": item.remark || "",
        "วันที่ใช้งาน": exportDate(item.usage_date),
        "ผู้แจ้งขอ": item.request_by || "",
        "สถานะอนุมัติจาก GM": gmApprovalByRequest[String(item.id ?? "")]?.statusText || item.gm_status || "",
        "วันที่ GM อนุมัติ": gmApprovalByRequest[String(item.id ?? "")]?.changedAt || "",
        "ผู้อนุมัติ GM": gmApprovalByRequest[String(item.id ?? "")]?.changedBy || "",
        "ประเภทรถที่อนุมัติ": item.approved_truck_type || "",
        "จำนวนรถที่อนุมัติ": item.approved_qty ?? "",
        "ชื่อบริษัทขนส่ง (ย่อ)2": item.export_detail?.company_short_name_replace ?? "",
        "VENDOR CODE": item.approved_company_id ?? "",
        "ชื่อบริษัทขนส่ง": item.approved_company_name || "",
        "ประเภทรถที่ถูกทดแทน": item.truck_type_replace || "",
        "บริษัทขนส่งที่ถูกทดแทน": item.export_detail?.company_name ?? "",
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

    const excludedUpdateColumns = new Set([
        "หมายเหตุที่แจ้งขอ", "สถานะอนุมัติจาก GM", "วันที่ GM อนุมัติ", "ผู้อนุมัติ GM",
        "หมายเหตุการสรรหาผู้ประกอบการ",
    ]);
    const allColumns = Object.keys(toExportRow({} as ExportRequestItem, 0));
    const previewColumns = exportMode === "update"
        ? allColumns.filter((column) => !excludedUpdateColumns.has(column)) : allColumns;
    const editableStart = previewColumns.indexOf("คาดการณ์วันเข้าคลัง");
    const selectedExportRow = (item: ExportRequestItem, index: number) => {
        const row = toExportRow(item, index);
        return Object.fromEntries(previewColumns.map((column) => [column, row[column as keyof typeof row]]));
    };


    const updateColumnFields: Record<string, string> = {
        "คาดการณ์วันเข้าคลัง": "warehouse_plan_date",
        "จัดสรรยี่ห้อรถ": "car_brand",
        "จัดสรรผู้ผลิต": "supplier_alloc",
        "จัดสรรรุ่นรถ": "car_model",
        "เลขเครื่อง": "car_engine",
        "เลข Chassis": "car_chassis",
        "ทะเบียน": "car_license",
        "เลขบันทึก FBP": "number_feb",
        "วันที่เข้ามากรอกเลขบันทึก FBP": "date_number_feb",
        "เลขบันทึกแจ้ง TIS": "number_tis",
        "วันที่เข้ามากรอกเลขบันทึกแจ้ง TIS": "date_number_tis",
        "เลขบันทึกแจ้ง TIL": "number_til",
        "วันที่เข้ามากรอกเลขบันทึกแจ้ง TIL": "date_number_til",
        "เลขบันทึกแจ้ง ASK": "number_ask",
        "วันที่เข้ามากรอกเลขบันทึกแจ้ง ASK": "date_number_ask",
        "เลขบันทึกแจ้ง Kleasing": "number_kleasing",
        "วันที่เข้ามากรอกเลขบันทึกแจ้ง Kleasing": "date_number_kleasing",
        "เลขบันทึกแจ้ง TTB2": "number_ttb",
        "วันที่เข้ามากรอกเลขบันทึกแจ้ง TTB2": "date_number_ttb",
        "เลขบันทึกแจ้ง THAIOLIX": "number_thaiolix",
        "วันที่เข้ามากรอกเลขบันทึกแจ้ง THAIOLIX": "date_number_thaiolix",
        "วันที่เริ่มรอจัดสรรตามโควต้า": "quota_wait_start_date",
        "วันที่สิ้นสุดรอจัดสรรตามโควต้า": "quota_wait_end_date",
        "วันที่เริ่มรอลงนามหนังสือจัดสรร": "allocation_sign_start_date",
        "วันที่สิ้นสุดรอลงนามหนังสือจัดสรร": "allocation_sign_end_date",
        "วันที่เริ่มรอไฟแนนซ์อนุมัติ": "finance_approval_start_date",
        "วันที่สิ้นสุดรอไฟแนนซ์อนุมัติ": "finance_approval_end_date",
        "วันที่เริ่มรอส่งรถเข้าอู่": "garage_delivery_start_date",
        "วันที่สิ้นสุดรอส่งรถเข้าอู่": "garage_delivery_end_date",
        "วันที่เริ่มประกอบตู้/เครื่องทำความเย็น": "body_installation_start_date",
        "วันที่สิ้นสุดประกอบตู้/เครื่องทำความเย็น": "body_installation_end_date",
        "วันที่เริ่มรอจดทะเบียนรถ": "registration_wait_start_date",
        "วันที่สิ้นสุดรอจดทะเบียนรถ": "registration_wait_end_date",
        "วันที่เริ่มส่งมอบคลังแล้ว": "warehouse_delivery_start_date",
        "วันที่สิ้นสุดหนังสือหมดอายุ": "document_expiry_end_date",
        "วันที่ยกเลิกหนังสือ": "document_cancel_date",
        "Remark": "remark",
    };
    const importColumns = allColumns.filter((column) => !excludedUpdateColumns.has(column));
    const normalizeImportValue = (value: unknown) => String(value ?? "").trim();
    const parseImportDate = (value: unknown): string | null => {
        const text = normalizeImportValue(value);
        if (!text || text === "-") return null;
        let year: number, month: number, day: number;
        const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (match) { day = +match[1]; month = +match[2]; year = +match[3]; }
        else if (iso) { year = +iso[1]; month = +iso[2]; day = +iso[3]; }
        else throw new Error(`วันที่ “${text}” ต้องเป็น DD/MM/YYYY หรือ YYYY-MM-DD`);
        if (year > 2400) year -= 543;
        const date = new Date(Date.UTC(year, month - 1, day));
        if (year < 1900 || year > 9999 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
            throw new Error(`วันที่ “${text}” ไม่ถูกต้อง`);
        }
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    };
    const formatExcelDateSerial = (serial: number, date1904: boolean): string => {
        const days = Math.floor(serial);
        if (!Number.isFinite(days) || days < (date1904 ? 0 : 1) || (!date1904 && days === 60)) {
            throw new Error("เลขวันที่ Excel ไม่ถูกต้อง");
        }

        // Excel's 1900 calendar reserves serial 60 for the nonexistent 29 February.
        const epoch = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 31);
        const elapsedDays = !date1904 && days > 60 ? days - 1 : days;
        return new Date(epoch + elapsedDays * 86_400_000).toISOString().slice(0, 10);
    };
    const readImportFile = async (file?: File) => {
        if (!file || savingImport) return;
        const version = ++importReadVersion.current;
        console.info("[Track Fleet Import] เริ่มตรวจไฟล์", file.name);
        setImportError(""); setImportMessage(""); setImportUpdates([]); setImportPreview([]);
        setImportFileName(file.name); setReadingImport(true);
        try {
            if (!/\.xlsx$/i.test(file.name)) throw new Error("กรุณาเลือกไฟล์ .xlsx ที่ส่งออกจากแท็บสำหรับอัปเดตงาน");
            if (file.size > 10 * 1024 * 1024) throw new Error("ไฟล์ต้องมีขนาดไม่เกิน 10 MB");
            const book = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
            const sheet = book.Sheets["รายการคำขอ"];
            if (!sheet) throw new Error("ไม่พบ Sheet รายการคำขอ กรุณาใช้ไฟล์สำหรับอัปเดตงาน");
            const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false, blankrows: true });
            const headers = (matrix[0] ?? []).map(normalizeImportValue);
            if (headers.length !== importColumns.length || headers.some((header, index) => header !== importColumns[index])) {
                throw new Error("หัวคอลัมน์ไม่ตรงกับไฟล์สำหรับอัปเดตงาน กรุณาส่งออกไฟล์ใหม่และไม่แก้ไขหัวคอลัมน์");
            }
            const values = matrix.slice(1)
                .map((row, index) => ({ row, rowIndex: index }))
                .filter(({ row }) => row.some((value) => normalizeImportValue(value)));
            const sheetStart = XLSX.utils.decode_range(sheet["!ref"] ?? "A1").s;
            const requestDateColumn = sheetStart.c + headers.indexOf("วันที่สร้างคำขอ");
            if (!values.length || values.length > 500) throw new Error("รองรับข้อมูล 1–500 แถวต่อครั้ง");
            const vehicleKey = (item: ExportRequestItem) =>
                JSON.stringify([String(item.id ?? ""), String(item.vehicle_no ?? "")]);
            const serialFields = [
                ["car_engine", "เลขเครื่อง"],
                ["car_chassis", "เลข Chassis"],
            ] as const;
            const serialKey = (value: unknown) => normalizeImportValue(value).toUpperCase();
            const rowsByDocument = new Map<string, ExportRequestItem[]>();
            for (const item of exportRows) {
                const document = formatRunningDoc(item);
                if (!document) continue;
                const matches = rowsByDocument.get(document);
                if (matches) matches.push(item);
                else rowsByDocument.set(document, [item]);
            }

            const seen = new Set<number>();
            const updates: FleetImportUpdate[] = [];
            const preview: ImportPreviewRow[] = [];
            for (const { row: valuesRow, rowIndex } of values) {
                const record = Object.fromEntries(headers.map((header, i) => [header, valuesRow[i] ?? ""]));
                const sequence = Number(record["ลำดับ"]);
                if (!Number.isInteger(sequence) || sequence < 1 || seen.has(sequence)) throw new Error(`แถว ${rowIndex + 2}: ลำดับไม่ถูกต้องหรือซ้ำ`);
                seen.add(sequence);
                const excelRowNumber = sheetStart.r + rowIndex + 2;
                const document = normalizeImportValue(record["เลขที่เอกสาร"]);
                const documentMatches = rowsByDocument.get(document) ?? [];
                const replacementLicense = normalizeImportValue(record["ทะเบียนทดแทน1(ระบุทะเบียน)"]);
                const matches = documentMatches.length > 1
                    ? documentMatches.filter((item) => replacementLicense && getReplacementLicense(item) === replacementLicense)
                    : documentMatches;
                if (matches.length !== 1) {
                    const identifier = `เลขที่เอกสาร “${document || "(ว่าง)"}”`;
                    const message = documentMatches.length
                        ? `${identifier} ซ้ำ ${documentMatches.length} รายการ และทะเบียนทดแทน “${replacementLicense || "(ว่าง)"}” จับคู่ได้ ${matches.length} รายการ จึงระบุรถคันเดียวไม่ได้`
                        : `ไม่พบ${identifier} ในผลค้นหาปัจจุบัน กรุณาตรวจตัวกรอง Track Fleet`;
                    throw new Error(`แถว ${excelRowNumber}: ${message}`);
                }
                const [originalItem] = matches;
                const original = toExportRow(originalItem, sequence - 1);

                for (const column of importColumns.filter((column) => !(column in updateColumnFields))) {
                    // สถานะอาจเดินหน้าได้หลังดาวน์โหลด Excel ใช้เพื่อแสดงข้อมูลเท่านั้น
                    if (column === "สถานะปัจจุบัน") continue;
                    const excelRaw = record[column];
                    const systemRaw = original[column as keyof typeof original];
                    const excelValue = normalizeImportValue(excelRaw);
                    const systemValue = normalizeImportValue(systemRaw);

                    if (column === "วันที่สร้างคำขอ") {
                        const address = XLSX.utils.encode_cell({
                            r: sheetStart.r + rowIndex + 1,
                            c: requestDateColumn,
                        });
                        const cell = sheet[address];
                        let excelDate = excelValue;
                        let excelDateKey: string | null | undefined;
                        let systemDateKey: string | null | undefined;
                        let dateError: string | undefined;
                        try {
                            if (cell?.t === "n" && typeof cell.v === "number") {
                                excelDate = formatExcelDateSerial(
                                    cell.v,
                                    book.Workbook?.WBProps?.date1904 === true,
                                );
                            }
                            excelDateKey = parseImportDate(excelDate);
                            systemDateKey = parseImportDate(systemValue);
                            if (excelDateKey === systemDateKey) continue;
                        } catch (error) {
                            dateError = error instanceof Error ? error.message : String(error);
                        }
                        console.table([{
                            "แถว Excel": sheetStart.r + rowIndex + 2,
                            "เซลล์": address,
                            "คอลัมน์": column,
                            "ค่าดิบในเซลล์": JSON.stringify(cell?.v),
                            "ค่าที่อ่านจาก Excel": JSON.stringify(excelValue),
                            "ค่าปัจจุบันจากระบบ": JSON.stringify(systemValue),
                            "วันที่ Excel ที่ใช้เทียบ": excelDateKey,
                            "วันที่ระบบที่ใช้เทียบ": systemDateKey,
                            "เลขที่เอกสาร": document,
                            "ข้อผิดพลาดการแปลงวันที่": dateError,
                        }]);
                        throw new Error(
                            `แถว ${rowIndex + 2} • วันที่สร้างคำขอ • Excel ${JSON.stringify(excelValue)}` +
                            ` • วันที่อ่านได้ ${JSON.stringify(excelDate)} • ระบบ ${JSON.stringify(systemValue)}` +
                            ` • เลขที่เอกสาร ${document}`
                        );
                    }

                    if (excelValue === systemValue) continue;

                    console.table([{
                        "แถว Excel": rowIndex + 2,
                        "ลำดับ": sequence,
                        "คอลัมน์ที่ไม่เท่ากัน": column,
                        "ค่าที่อ่านจาก Excel": JSON.stringify(excelRaw),
                        "ค่าปัจจุบันจากระบบ": JSON.stringify(systemRaw),
                        "ค่า Excel ที่ใช้เทียบ": JSON.stringify(excelValue),
                        "ค่าระบบที่ใช้เทียบ": JSON.stringify(systemValue),
                        "เลขที่เอกสาร": document,
                    }]);

                    throw new Error(
                        `แถว ${rowIndex + 2}: ข้อมูล “${column}” ถูกแก้ไขหรือข้อมูลระบบเปลี่ยนแล้ว กรุณาส่งออกไฟล์ใหม่`
                    );
                }
                const fields: Record<string, string | null> = {};
                const changes: ImportPreviewChange[] = [];

                for (const [column, fieldName] of Object.entries(updateColumnFields)) {
                    const excelValue = normalizeImportValue(record[column]);
                    const systemValue = normalizeImportValue(original[column as keyof typeof original]);

                    const sameValue = fieldName === "remark"
                        ? excelValue.replace(/\s+/g, " ") === systemValue.replace(/\s+/g, " ")
                        : excelValue === systemValue;

                    if (sameValue) continue;

                    try {
                        const newValue = /date/.test(fieldName)
                            ? parseImportDate(record[column])
                            : excelValue || null;

                        fields[fieldName] = newValue;
                        changes.push({ column, oldValue: systemValue, newValue: newValue ?? "" });
                    } catch (error) {
                        const message = error instanceof Error ? error.message : "ข้อมูลไม่ถูกต้อง";
                        throw new Error(`แถว ${rowIndex + 2} / ${column}: ${message}`);
                    }
                }

                if (changes.length > 0) {
                    const requestId = String(originalItem.id ?? "");
                    const vehicleNo = String(originalItem.vehicle_no ?? "");

                    if (!requestId || !vehicleNo) {
                        throw new Error(`แถว ${rowIndex + 2}: ไม่พบรหัสคำขอหรือลำดับรถ`);
                    }

                    updates.push({
                        request_id: requestId,
                        vehicle_no: vehicleNo,
                        unit_code: String(originalItem.unit_code ?? originalItem.running_doc_vehicle_no ?? ""),
                        fields,
                    });

                    preview.push({
                        excelRowNumber,
                        document: original["เลขที่เอกสาร"],
                        changes,
                    });
                }
            }
            const keys = updates.map((item) => JSON.stringify([item.request_id, item.vehicle_no]));
            if (new Set(keys).size !== keys.length) throw new Error("พบหลายแถวอัปเดตรถคันเดียวกัน กรุณาเหลือหนึ่งแถวต่อรถ");
            const updatesByVehicle = new Map(updates.map((update, index) => [keys[index], update.fields]));
            for (const [fieldName, label] of serialFields) {
                const owners = new Map<string, Map<string, string>>();
                for (const item of exportRows) {
                    const key = vehicleKey(item);
                    const pending = updatesByVehicle.get(key);
                    const number = serialKey(pending && fieldName in pending ? pending[fieldName] : field(item, fieldName));
                    if (!number) continue;
                    const vehicles = owners.get(number) ?? new Map<string, string>();
                    vehicles.set(key, formatRunningDoc(item) || key);
                    owners.set(number, vehicles);
                }

                updates.forEach((update, index) => {
                    const number = serialKey(update.fields[fieldName]);
                    const vehicles = owners.get(number);
                    if (!number || !vehicles) return;
                    const conflicts = Array.from(vehicles).filter(([key]) => key !== keys[index]);
                    if (!conflicts.length) return;
                    const documents = conflicts.map(([, document]) => document).join(", ");
                    throw new Error(`แถว ${preview[index].excelRowNumber}: ${label} “${update.fields[fieldName]}” ซ้ำกับรถอีกคัน (${documents})`);
                });
            }
            if (version !== importReadVersion.current) return;
            setImportUpdates(updates); setImportPreview(preview);
            setImportMessage(updates.length ? `ตรวจสอบผ่าน ${updates.length} รายการที่มีการแก้ไข` : "ไม่มีข้อมูลที่เปลี่ยนแปลง");
        } catch (error) {
            console.error("[Track Fleet Import] ตรวจไฟล์ไม่ผ่าน", file.name, error);
            if (version === importReadVersion.current) setImportError(error instanceof Error ? error.message : "อ่านไฟล์ไม่สำเร็จ");
        } finally { if (version === importReadVersion.current) setReadingImport(false); }
    };

    const removeImportRow = (excelRowNumber: number) => {
        if (importSaveInFlight.current || savingImport || readingImport) return;

        // ใช้ลำดับก่อนจัดกลุ่มตาราง เพื่อให้ตัดข้อมูลที่จะส่งตรงกับแถว Excel
        const index = importPreview.findIndex(
            (row) => row.excelRowNumber === excelRowNumber
        );
        if (index === -1) return;

        const remaining = importUpdates.filter((_, i) => i !== index);
        setImportUpdates(remaining);
        setImportPreview((rows) =>
            rows.filter((row) => row.excelRowNumber !== excelRowNumber)
        );
        setImportError("");
        setImportMessage(
            remaining.length
                ? `เอาแถว ${excelRowNumber} ออกแล้ว เหลือ ${remaining.length} รายการ`
                : "เอาออกครบแล้ว ไม่มีรายการให้บันทึก"
        );
    };

    const saveImportedUpdates = async () => {
        if (!importUpdates.length || savingImport || readingImport || isLoading || importSaveInFlight.current) return;
        importSaveInFlight.current = true;
        setSavingImport(true); setImportError("");
        try {
            if (onImportUpdates) {
                // Preserve callers that already provide their own save implementation.
                await onImportUpdates(importUpdates);
            } else {
                const endpoint = importApiUrl
                    ? new URL(importApiUrl, window.location.href)
                    : new URL("track_fleet_import_update.php", new URL(requestApiUrl, window.location.href));
                endpoint.search = "";
                endpoint.hash = "";
                const response = await fetch(endpoint.toString(), {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json", Accept: "application/json" },
                    body: JSON.stringify({ updates: importUpdates }),
                });
                let result: { status?: string; message?: string };
                try { result = await response.json(); }
                catch { throw new Error(`API บันทึกตอบกลับไม่ใช่ JSON (HTTP ${response.status}) กรุณาตรวจสอบไฟล์ PHP`); }
                if (!response.ok || result?.status !== "success") {
                    throw new Error(result?.message || `บันทึกข้อมูลไม่สำเร็จ (HTTP ${response.status})`);
                }
            }
            setImportMessage(`Import สำเร็จ ${importUpdates.length} รายการ`);
            setImportUpdates([]); setImportPreview([]);
            setImportFileName("");
            if (importInput.current) importInput.current.value = "";
            setLoadingTrackRows(true);
            setLoadAttempt((attempt) => attempt + 1);
        } catch (error) { setImportError(error instanceof Error ? error.message : "บันทึกข้อมูลไม่สำเร็จ"); }
        finally { importSaveInFlight.current = false; setSavingImport(false); }
    };

    // Export Excel
    const exceedsExportLimit = exportRows.length > MAX_EXPORT_ROWS;

    const handleExport = () => {
        if (loadingTrackRows || loadingFbp || loadError || exportRows.length === 0 || exceedsExportLimit) {
            return;
        }

        setExportError("");
        try {
            const excelData = exportRows.map(selectedExportRow);

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

                if (exportMode === "update") {
                    for (let r = 0; r <= range.e.r; r++) {
                        for (let c = editableStart; c <= range.e.c; c++) {
                            const address = XLSX.utils.encode_cell({ r, c });
                            const cell = worksheet[address] ?? (worksheet[address] = { t: "s", v: "" });
                            cell.s = { ...cell.s, fill: { fgColor: { rgb: r === 0 ? "047857" : "ECFDF5" }, patternType: "solid" } };
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

            XLSX.writeFile(workbook, exportMode === "update" ? "Truck_Request_Update.xlsx" : "Truck_Request.xlsx");
        } catch (error) {
            setExportError(error instanceof Error ? error.message : "ส่งออก Excel ไม่สำเร็จ");
        }
    };

    useEffect(() => {
        if (!open) setShowExportTable(false);
    }, [open]);

    if (!open) {
        return null;
    }

    const importTableRows = groupDocumentRows(importPreview.slice(0, 20), (row) => row.document);
    const importDocumentSpans = documentRowSpans(importTableRows, (row) => row.document);
    const importChangeColumns = Array.from(new Set([
        "เลขเครื่อง",
        "เลข Chassis",
        ...importTableRows.flatMap((row) => row.changes.map((change) => change.column)),
    ]));
    const showPreview = exportMode === "report" || showExportTable;
    const ready = !isLoading && !loadError && exportRows.length > 0;
    const canExport = ready && !exceedsExportLimit;
    const loadingTitle = loadingTrackRows
        ? reportProgress ? "กำลังดึงรายละเอียดรายงาน" : usesTrackFleetSearch ? "กำลังค้นหารายการรถจาก Track Fleet" : "กำลังโหลดรายการคำขอรถ"
        : "กำลังโหลดข้อมูลบริษัทขนส่ง";
    const emptyDescription = "ไม่พบรายการตามเงื่อนไขจากหน้าหลัก กรุณาปรับตัวกรองบนหน้า Track Fleet แล้วเปิด Export อีกครั้ง";

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/55 p-2 backdrop-blur-sm sm:p-5">
            <div role="dialog" aria-modal="true" aria-labelledby="export-track-fleet-title"
                style={{ color: "#0f172a" }}
                className="flex h-full max-h-[960px] w-full text-slate-900 max-w-[1400px] flex-col overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl sm:rounded-3xl">
                <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 via-blue-50 to-slate-50 px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white shadow-sm">
                            <FileSpreadsheet size={20} />
                        </div>
                        <div className="min-w-0">
                            <h2 id="export-track-fleet-title" className="text-base font-bold text-slate-900">
                                {exportMode === "update" ? "สำหรับอัปเดตงาน" : "ส่งออกรายงานคำขอรถ"}
                            </h2>
                            <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-600">
                                {dcLabel || "ข้อมูลคำขอทั้งหมดที่สามารถเข้าถึงได้"}
                            </p>
                        </div>
                    </div>

                    <button style={BUTTON_COLORS.red}
                        type="button"
                        onClick={onClose}
                        aria-label="ปิดหน้าต่างส่งออกรายงาน"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-rose-700 text-white shadow-sm transition hover:bg-rose-800"
                    >
                        <X size={17} />
                    </button>
                </div>

                <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div role="group" aria-label="รูปแบบการส่งออก" className="inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
                            {([["report", "ส่งออกรายงาน"], ["update", "สำหรับอัปเดตงาน"]] as const).map(([mode, label]) => (
                                <button style={exportMode === mode ? BUTTON_COLORS.blue : BUTTON_COLORS.lightBlue} key={mode} type="button" aria-pressed={exportMode === mode}
                                    onClick={() => {
                                        if (mode === exportMode) return;
                                        setExportMode(mode);
                                        setShowExportTable(false);
                                        setExportError("");
                                    }}
                                    className={`rounded-lg px-4 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${exportMode === mode ? "bg-blue-700 text-white shadow-sm" : "bg-blue-100 text-blue-950 hover:bg-blue-200"}`}>
                                    {label}
                                </button>
                            ))}
                        </div>
                        {exportMode === "update" && (
                            <button style={canExport ? BUTTON_COLORS.blue : BUTTON_COLORS.lightBlue}
                                type="button"
                                onClick={handleExport}
                                disabled={!canExport}
                                className="inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-800 bg-blue-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:border-blue-200 disabled:bg-blue-100 disabled:text-blue-950 disabled:shadow-none sm:w-auto"
                            >
                                {isLoading
                                    ? <LoaderCircle aria-hidden="true" size={18} className="shrink-0 motion-safe:animate-spin" />
                                    : <Download aria-hidden="true" size={18} className="shrink-0" />}
                                <span>ดาวน์โหลดไฟล์สำหรับอัปเดตงาน</span>
                            </button>
                        )}
                    </div>
                    {ready && exceedsExportLimit && (
                        <div role="status" className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                            <p>พบ {exportRows.length.toLocaleString("th-TH")} แถว ส่งออกได้สูงสุด {MAX_EXPORT_ROWS} แถว กรุณาปิดหน้านี้แล้วเลือกเดือนในตัวกรองหน้า Track Fleet ให้เหลือไม่เกิน {MAX_EXPORT_ROWS} แถว</p>
                            <button style={BUTTON_COLORS.amber} type="button" onClick={onClose}
                                className="rounded-lg bg-amber-800 px-4 py-2 font-semibold text-white hover:bg-amber-900">
                                ปิดแล้วกลับไปกรองเดือน
                            </button>
                        </div>
                    )}
                    {exportError && <p role="alert" className="mt-2 text-xs text-rose-700">{exportError}</p>}
                </div>
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                    {exportMode === "update" && <section id="fleet-import-panel" aria-label="Import อัปเดตงาน" className="m-4 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                    <CloudUpload className="h-5 w-5" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black text-slate-900">อัปโหลดไฟล์</h2>
                                    <p className="mt-0.5 text-xs text-slate-700">เลือกไฟล์หรือลากไฟล์มาวาง</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-5 sm:p-6">
                            <p className="text-xs leading-5 text-slate-700">ใช้ไฟล์จากแท็บสำหรับอัปเดตงาน คุณลบทั้งแถวที่ไม่ต้องการอัปเดตใน Excel ได้</p>
                            <input ref={importInput} type="file" accept=".xlsx" className="sr-only" aria-label="เลือกไฟล์ Excel สำหรับอัปเดตงาน"
                                disabled={readingImport || savingImport} onChange={(event) => { void readImportFile(event.target.files?.[0]); event.target.value = ""; }} />
                            <div onDragOver={(event) => { event.preventDefault(); if (!readingImport && !savingImport) setIsDraggingImport(true); }}
                                onDragLeave={() => setIsDraggingImport(false)}
                                onDrop={(event) => { event.preventDefault(); setIsDraggingImport(false); if (!readingImport && !savingImport) void readImportFile(event.dataTransfer.files[0]); }}
                                className={`mt-4 flex min-h-[180px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center ${isDraggingImport ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50"}`}>
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600"><CloudUpload className="h-7 w-7" /></div>
                                <p className="mt-3 text-sm font-semibold text-slate-800">{isDraggingImport ? "วางไฟล์ตรงนี้" : "ลากไฟล์มาวางที่นี่"}</p>
                                <p className="mt-1 text-xs text-slate-700">รองรับ .xlsx • สูงสุด 10 MB • ไม่เกิน 500 แถว</p>
                                <button style={readingImport || savingImport || isLoading ? BUTTON_COLORS.lightBlue : BUTTON_COLORS.blue} type="button" disabled={readingImport || savingImport || isLoading} onClick={() => importInput.current?.click()}
                                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-blue-800 bg-blue-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:border-blue-200 disabled:bg-blue-100 disabled:text-blue-950"><FileSpreadsheet className="h-4 w-4" />เลือกไฟล์ Excel</button>
                            </div>
                            {importFileName && <p className="mt-3 break-all text-xs text-slate-600">ไฟล์: {importFileName}</p>}
                            {readingImport && <p role="status" className="mt-2 text-xs text-blue-700">กำลังอ่านและตรวจสอบไฟล์…</p>}
                            {importError && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-800">{importError}</p>}
                            {importMessage && <p role="status" className="mt-3 text-xs text-emerald-800">{importMessage}</p>}
                            {importPreview.length > 0 && (
                                <div className="mt-4 max-h-80 overflow-auto rounded-xl border border-slate-200">
                                    <table
    aria-label="ตัวอย่างข้อมูลที่เปลี่ยนก่อนนำเข้า"
    className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm"
    style={{ backgroundColor: "#ffffff", color: "#0f172a" }}
>
    <colgroup span={2} />
    {importChangeColumns.map((column) => (
        <colgroup key={column} span={2} />
    ))}
    <colgroup />

    <thead
        className="sticky top-0 z-20"
        style={{ backgroundColor: "#1e3a8a", color: "#ffffff" }}
    >
        <tr>
            <th
                scope="col"
                rowSpan={2}
                className="whitespace-nowrap border-b border-blue-700 px-4 py-3 text-center font-semibold"
            >
                แถว Excel
            </th>
            <th
                scope="col"
                rowSpan={2}
                className="whitespace-nowrap border-b border-l border-blue-700 px-4 py-3 font-semibold"
            >
                เลขที่เอกสาร
            </th>

            {importChangeColumns.map((column) => (
                <th
                    key={column}
                    scope="colgroup"
                    colSpan={2}
                    className="whitespace-nowrap border-l border-blue-700 px-4 py-3 text-center font-semibold"
                >
                    {column}
                </th>
            ))}

            <th
                scope="col"
                rowSpan={2}
                className="sticky right-0 z-10 whitespace-nowrap border-b border-l border-blue-700 px-4 py-3 text-center font-semibold"
                style={{ backgroundColor: "#172554", color: "#ffffff" }}
            >
                จัดการ
            </th>
        </tr>

        <tr>
            {importChangeColumns.flatMap((column) => [
                <th
                    key={`${column}-old`}
                    scope="col"
                    className="whitespace-nowrap border-b border-l border-blue-700 px-4 py-2 text-center text-xs font-bold"
                    style={{ backgroundColor: "#ffe4e6", color: "#881337" }}
                >
                    ค่าเดิม
                </th>,
                <th
                    key={`${column}-new`}
                    scope="col"
                    className="whitespace-nowrap border-b border-blue-700 px-4 py-2 text-center text-xs font-bold"
                    style={{ backgroundColor: "#d1fae5", color: "#064e3b" }}
                >
                    ค่าใหม่
                </th>,
            ])}
        </tr>
    </thead>

    <tbody>
        {importTableRows.map((row, index) => {
            const changesByColumn = new Map(
                row.changes.map((change) => [change.column, change])
            );
            const removeDisabled = readingImport || savingImport;
            const rowBackground = index % 2 === 0 ? "#ffffff" : "#f8fafc";

            return (
                <tr key={row.excelRowNumber} style={{ backgroundColor: rowBackground }}>
                    <td className="border-b border-slate-200 px-4 py-3 text-center align-middle">
                        <span className="inline-flex min-w-9 justify-center rounded-md bg-slate-100 px-2 py-1 text-xs font-bold tabular-nums text-slate-800">
                            {row.excelRowNumber}
                        </span>
                    </td>

                    {importDocumentSpans[index] > 0 && (
                        <td
                            rowSpan={importDocumentSpans[index]}
                            className="whitespace-nowrap border-b border-l border-blue-100 px-4 py-3 align-middle font-bold"
                            style={{ backgroundColor: "#eff6ff", color: "#1e3a8a" }}
                        >
                            {row.document || "—"}
                        </td>
                    )}

                    {importChangeColumns.flatMap((column) => {
                        const change = changesByColumn.get(column);

                        if (!change) {
                            return (
                                <td
                                    key={column}
                                    colSpan={2}
                                    className="whitespace-nowrap border-b border-l border-slate-200 px-4 py-3 text-center text-xs text-slate-600"
                                >
                                    ไม่มีการแก้ไข
                                </td>
                            );
                        }

                        return [
                            <td
                                key={`${column}-old`}
                                className="min-w-[110px] whitespace-pre-wrap break-words border-b border-l border-rose-100 px-4 py-3 align-middle"
                                style={{ backgroundColor: "#fff1f2", color: "#881337" }}
                            >
                                {change.oldValue || "(ว่าง)"}
                            </td>,
                            <td
                                key={`${column}-new`}
                                className="min-w-[110px] whitespace-pre-wrap break-words border-b border-emerald-100 px-4 py-3 align-middle font-semibold"
                                style={{ backgroundColor: "#ecfdf5", color: "#064e3b" }}
                            >
                                {change.newValue || "(ว่าง)"}
                            </td>,
                        ];
                    })}

                    <td
                        className="sticky right-0 z-10 whitespace-nowrap border-b border-l border-slate-200 px-3 py-3 text-center align-middle"
                        style={{ backgroundColor: rowBackground }}
                    >
                        <button
                            type="button"
                            disabled={removeDisabled}
                            aria-label={`เอาแถว Excel ${row.excelRowNumber} ออกจากรายการนำเข้า`}
                            onClick={() => removeImportRow(row.excelRowNumber)}
                            className="inline-flex min-h-9 items-center justify-center rounded-lg px-3 py-1.5 text-xs font-bold transition enabled:hover:brightness-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700 disabled:cursor-not-allowed"
                            style={{
                                backgroundColor: removeDisabled ? "#ffe4e6" : "#be123c",
                                color: removeDisabled ? "#881337" : "#ffffff",
                            }}
                        >
                            X
                        </button>
                    </td>
                </tr>
            );
        })}
    </tbody>
</table>
                                </div>
                            )}
                            {importPreview.length > 20 && <p className="mt-2 text-xs text-slate-700">ตัวอย่าง 20 รายการแรก จาก {importPreview.length} รายการที่แก้ไข</p>}
                            <p className="mt-3 text-xs leading-5 text-slate-700">ยืนยันเพื่อนำเฉพาะข้อมูลที่แก้ไขไปบันทึกในระบบ ช่องที่ลบข้อมูลออกจะถูกบันทึกเป็นค่าว่าง</p>
                            <button style={!importUpdates.length || readingImport || savingImport || isLoading ? BUTTON_COLORS.lightGreen : BUTTON_COLORS.green} type="button" onClick={() => void saveImportedUpdates()} disabled={!importUpdates.length || readingImport || savingImport || isLoading}
                                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-100 disabled:text-emerald-950">
                                {savingImport ? <LoaderCircle size={15} className="animate-spin" /> : <Upload size={15} />}
                                {savingImport ? "กำลัง Import…" : `ยืนยัน Import${importUpdates.length ? ` ${importUpdates.length} รายการ` : ""}`}
                            </button>
                        </div>
                    </section>}

                    {exportMode === "update" && (
                        <div className="mx-4 mb-4 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <button style={BUTTON_COLORS.indigo} type="button" aria-expanded={showExportTable}
                                aria-controls={showExportTable ? "fleet-export-table" : undefined}
                                onClick={() => setShowExportTable((shown) => !shown)}
                                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-indigo-800 bg-indigo-700 px-4 text-sm font-bold text-white hover:bg-indigo-800">
                                {showExportTable ? "ซ่อนตาราง" : "ดูตารางสำหรับส่งออก"}
                                <ChevronDown className={`h-4 w-4 motion-safe:transition-transform ${showExportTable ? "rotate-180" : ""}`} />
                            </button>
                        </div>
                    )}

                    {showPreview && (
                        <>
                            <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-3 sm:px-5">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                                    {trackFilters.length > 0 && (
                                        <section aria-label="ตัวกรองจากหน้าหลัก" className="mb-3 rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2.5">
                                            <p className="mb-1.5 text-[11px] font-semibold text-blue-800">ตัวกรองที่ส่งมาจากหน้าหลัก</p>
                                            <dl className="flex max-h-24 flex-wrap gap-1.5 overflow-auto">
                                                {trackFilters.map(({ key, label, value }) => (
                                                    <div key={key} className="min-w-0 max-w-full rounded-lg border border-blue-100 bg-white px-2 py-1 text-[11px]">
                                                        <dt className="mr-1.5 inline font-medium text-slate-700">{label}</dt>
                                                        <dd className="inline break-words font-semibold text-blue-800">{value}</dd>
                                                    </div>
                                                ))}
                                            </dl>
                                        </section>
                                    )}
                                </div>
                            </div>

                            <div id="fleet-export-table" className={`flex flex-1 flex-col bg-slate-50 px-3 py-3 sm:px-5 ${exportMode === "update" ? "min-h-[420px]" : "min-h-[260px]"}`}>
                                <section aria-labelledby="export-preview-title" aria-busy={isLoading && !loadError}
                                    className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
                                        <div>
                                            <h3 id="export-preview-title" className="text-sm font-semibold text-slate-900">
                                                {exportMode === "update" ? "ตารางสำหรับส่งออก" : "ตัวอย่างรายงาน"}
                                            </h3>
                                            {ready && <p className="mt-0.5 text-xs text-slate-700">เลื่อนตารางไปทางขวาเพื่อดูคอลัมน์ทั้งหมด</p>}
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
                                            <button style={BUTTON_COLORS.red} type="button" onClick={() => {
                                                setTrackError("");
                                                setFbpError("");
                                                setReportProgress(null);
                                                setLoadingTrackRows(true);
                                                setLoadingFbp(true);
                                                setLoadAttempt((attempt) => attempt + 1);
                                            }} className="mt-1 rounded-lg border border-rose-800 bg-rose-700 px-3 py-2 text-sm font-bold text-white hover:bg-rose-800">
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
                                            <Search aria-hidden="true" size={25} className="mb-1 text-slate-600" />
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
                                                                <th key={column} className={`${exportMode === "update" && previewColumns.indexOf(column) >= editableStart ? "bg-emerald-700" : ""} border-r border-blue-700 px-3 py-2.5 align-middle leading-4 whitespace-normal break-words ${column === "ลำดับ" ? "w-[64px] min-w-[64px]" : "w-[170px] min-w-[170px] max-w-[220px]"}`}>
                                                                    {column}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {paginatedRows.map(({ item, sequence }, index) => {
                                                            const row = toExportRow(item, sequence);
                                                            const documentSpan = previewDocumentSpans[index];
                                                            return (
                                                                <tr key={`${item.id ?? item.running_doc}-${item.vehicle_no ?? item.export_row_index ?? index}-${index}`}
                                                                    className="border-b border-slate-100 text-xs even:bg-slate-50 hover:bg-blue-50">
                                                                    {previewColumns.map((column) => column === "เลขที่เอกสาร" ? (
                                                                        documentSpan > 0 && (
                                                                            <td key={column} rowSpan={documentSpan} className="w-[170px] min-w-[170px] max-w-[220px] break-words border-r border-blue-200 bg-blue-50 px-3 py-2 align-middle text-sm font-bold text-blue-950">
                                                                                {row["เลขที่เอกสาร"] || "—"}
                                                                            </td>
                                                                        )
                                                                    ) : (
                                                                        <td key={column} className={`${exportMode === "update" && previewColumns.indexOf(column) >= editableStart ? "bg-emerald-50/70" : ""} border-r border-slate-100 px-3 py-2 align-top leading-4 whitespace-normal break-words text-slate-700 ${column === "ลำดับ" ? "w-[64px] min-w-[64px] text-center" : "w-[170px] min-w-[170px] max-w-[220px]"}`}>
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
                                                <p className="text-[11px] font-bold text-slate-700">
                                                    แสดง {((currentPage - 1) * ROWS_PER_PAGE) + 1}
                                                    {" - "}
                                                    {Math.min(currentPage * ROWS_PER_PAGE, exportRows.length)}
                                                    {" จาก "}
                                                    {exportRows.length.toLocaleString("en-US")} รายการ
                                                </p>

                                                <div className="flex items-center justify-end gap-2">
                                                    <button style={currentPage === 1 ? BUTTON_COLORS.lightBlue : BUTTON_COLORS.blue}
                                                        type="button"
                                                        onClick={() =>
                                                            setCurrentPage((page) => Math.max(1, page - 1))
                                                        }
                                                        disabled={currentPage === 1}
                                                        className="h-9 rounded-xl border border-blue-800 bg-blue-700 px-4 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:border-blue-200 disabled:bg-blue-100 disabled:text-blue-950"
                                                    >
                                                        ก่อนหน้า
                                                    </button>

                                                    <span className="min-w-[90px] text-center text-xs font-black text-slate-700">
                                                        หน้า {currentPage} / {totalPages}
                                                    </span>

                                                    <button style={currentPage === totalPages ? BUTTON_COLORS.lightBlue : BUTTON_COLORS.blue}
                                                        type="button"
                                                        onClick={() =>
                                                            setCurrentPage((page) =>
                                                                Math.min(totalPages, page + 1)
                                                            )
                                                        }
                                                        disabled={currentPage === totalPages}
                                                        className="h-9 rounded-xl border border-blue-800 bg-blue-700 px-4 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:border-blue-200 disabled:bg-blue-100 disabled:text-blue-950"
                                                    >
                                                        ถัดไป
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </section>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold text-slate-600">{exportMode === "update" ? "สถานะข้อมูลอัปเดตงาน" : "สถานะรายงาน"}</p>
                        <p role="status" className="mt-0.5 text-xs font-medium text-slate-800">
                            {loadError ? "โหลดข้อมูลไม่สำเร็จ" : isLoading ? loadingTitle : ready
                                ? exceedsExportLimit ? "เกินจำนวนแถวที่ส่งออกได้" : `พร้อมส่งออก ${exportRows.length.toLocaleString("th-TH")} รายการ`
                                : "ไม่มีรายการให้ส่งออก"}
                        </p>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                        <button style={BUTTON_COLORS.slate}
                            type="button"
                            onClick={onClose}
                            className="h-10 rounded-xl border border-slate-800 bg-slate-700 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
                        >
                            ยกเลิก
                        </button>
                        {exportMode === "report" && (
                            <button style={canExport ? BUTTON_COLORS.green : BUTTON_COLORS.lightGreen}
                                type="button"
                                onClick={handleExport}
                                disabled={!canExport}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-100 disabled:text-emerald-950"
                            >
                                {isLoading && !loadError
                                    ? <LoaderCircle aria-hidden="true" size={15} className="motion-safe:animate-spin" />
                                    : <Download aria-hidden="true" size={15} />}
                                ดาวน์โหลด Excel
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
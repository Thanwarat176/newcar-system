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
    RefreshCw,
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


// xlsx-js-style does not reliably serialize cell protection. Apply it to
// the final uncompressed OOXML package so only update columns are editable.
function protectUpdateWorkbook(bytes: Uint8Array, editableStart: number): Uint8Array {
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let eocd = bytes.length - 22;
    while (eocd >= 0 && view.getUint32(eocd, true) !== 0x06054b50) eocd--;
    if (eocd < 0) throw new Error("ไม่พบโครงสร้างไฟล์ Excel");
    const entries: { name: string; data: Uint8Array }[] = [];
    let cursor = view.getUint32(eocd + 16, true);
    const count = view.getUint16(eocd + 10, true);
    for (let i = 0; i < count; i++) {
        if (view.getUint32(cursor, true) !== 0x02014b50) throw new Error("ไฟล์ Excel ไม่สมบูรณ์");
        const method = view.getUint16(cursor + 10, true);
        const size = view.getUint32(cursor + 20, true);
        const nameLength = view.getUint16(cursor + 28, true);
        const extraLength = view.getUint16(cursor + 30, true);
        const commentLength = view.getUint16(cursor + 32, true);
        const offset = view.getUint32(cursor + 42, true);
        if (method !== 0) throw new Error("ต้องส่งออก Excel แบบไม่บีบอัดเพื่อกำหนดสิทธิ์แก้ไข");
        const name = decoder.decode(bytes.slice(cursor + 46, cursor + 46 + nameLength));
        const start = offset + 30 + view.getUint16(offset + 26, true) + view.getUint16(offset + 28, true);
        entries.push({ name, data: bytes.slice(start, start + size) });
        cursor += 46 + nameLength + extraLength + commentLength;
    }
    const styleEntry = entries.find((entry) => entry.name === "xl/styles.xml");
    const sheetEntry = entries.find((entry) => entry.name === "xl/worksheets/sheet1.xml");
    if (!styleEntry || !sheetEntry) throw new Error("ไม่พบรูปแบบหรือตาราง Excel");
    const styleXml = decoder.decode(styleEntry.data);
    const group = styleXml.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/);
    const formats = group?.[1].match(/<xf\b[^>]*\/>|<xf\b[^>]*>[\s\S]*?<\/xf>/g);
    if (!group || !formats) throw new Error("ไม่พบรูปแบบเซลล์ Excel");
    const unlocked = formats.map((format) => {
        let xf = format.replace(/\sapplyProtection="[^"]*"/g, "")
            .replace(/<protection\b[^>]*(?:\/>|>[\s\S]*?<\/protection>)/g, "");
        if (xf.endsWith("/>")) xf = xf.slice(0, -2) + "></xf>";
        return xf.replace(/<xf\b/, '<xf applyProtection="1"')
            .replace("</xf>", '<protection locked="0"/></xf>');
    });
    styleEntry.data = encoder.encode(styleXml.replace(group[0],
        `<cellXfs count="${formats.length * 2}">${formats.join("")}${unlocked.join("")}</cellXfs>`));
    let sheetXml = decoder.decode(sheetEntry.data).replace(/<c\b[^>]*>/g, (tag) => {
        const address = tag.match(/\br="([A-Z]+)(\d+)"/);
        if (!address || Number(address[2]) === 1) return tag;
        const column = [...address[1]].reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0) - 1;
        if (column < editableStart) return tag;
        const style = Number(tag.match(/\bs="(\d+)"/)?.[1] ?? 0);
        const stripped = tag.replace(/\ss="\d+"/, "");
        return stripped.replace(/\/?\>$/, (end) => ` s="${style + formats.length}"${end}`);
    });
    sheetXml = sheetXml.replace(/<sheetProtection\b[^>]*\/>/g, "")
        .replace("</sheetData>", '</sheetData><sheetProtection sheet="1" objects="1" scenarios="1" autoFilter="0" selectLockedCells="0" selectUnlockedCells="0"/>');
    sheetEntry.data = encoder.encode(sheetXml);
    const crc32 = (data: Uint8Array) => {
        let crc = 0xffffffff;
        for (const byte of data) {
            crc ^= byte;
            for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
        }
        return (crc ^ 0xffffffff) >>> 0;
    };
    const locals: Uint8Array[] = [];
    const central: Uint8Array[] = [];
    let offset = 0;
    for (const entry of entries) {
        const name = encoder.encode(entry.name);
        const crc = crc32(entry.data);
        const local = new Uint8Array(30 + name.length + entry.data.length);
        const lv = new DataView(local.buffer);
        lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x800, true);
        lv.setUint32(14, crc, true); lv.setUint32(18, entry.data.length, true); lv.setUint32(22, entry.data.length, true);
        lv.setUint16(26, name.length, true); local.set(name, 30); local.set(entry.data, 30 + name.length);
        const header = new Uint8Array(46 + name.length);
        const cv = new DataView(header.buffer);
        cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x800, true);
        cv.setUint32(16, crc, true); cv.setUint32(20, entry.data.length, true); cv.setUint32(24, entry.data.length, true);
        cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true); header.set(name, 46);
        locals.push(local); central.push(header); offset += local.length;
    }
    const centralSize = central.reduce((sum, part) => sum + part.length, 0);
    const result = new Uint8Array(offset + centralSize + 22);
    let position = 0;
    for (const part of [...locals, ...central]) { result.set(part, position); position += part.length; }
    const tail = new DataView(result.buffer, position, 22);
    tail.setUint32(0, 0x06054b50, true); tail.setUint16(8, entries.length, true); tail.setUint16(10, entries.length, true);
    tail.setUint32(12, centralSize, true); tail.setUint32(16, offset, true);
    return result;
}

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
    const [isDraggingImport, setIsDraggingImport] = useState(false);
    const [importFileName, setImportFileName] = useState("");
    const [importPreview, setImportPreview] = useState<Record<string, unknown>[]>([]);
    const [importUpdates, setImportUpdates] = useState<FleetImportUpdate[]>([]);
    const [importError, setImportError] = useState("");
    const [importMessage, setImportMessage] = useState("");
    const [uploadStatus, setUploadStatus] = useState<"idle" | "reading" | "ready" | "unchanged" | "saving" | "success" | "error">("idle");
    const [uploadChanges, setUploadChanges] = useState<Array<{ vehicle: string; column: string; before: string; after: string }>>([]);
    const horizontalChanges = useMemo(() => {
        const columns = [...new Set(uploadChanges.map(change => change.column))];
        const vehicles = new Map<string, Map<string, typeof uploadChanges[number]>>();
        for (const change of uploadChanges) {
            if (!vehicles.has(change.vehicle)) vehicles.set(change.vehicle, new Map());
            vehicles.get(change.vehicle)!.set(change.column, change);
        }
        return { columns, rows: [...vehicles].map(([vehicle, fields]) => ({ vehicle, fields })) };
    }, [uploadChanges]);
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

    const paginatedRows = useMemo(() => {
        const startIndex = (currentPage - 1) * ROWS_PER_PAGE;

        return exportRows.slice(
            startIndex,
            startIndex + ROWS_PER_PAGE
        );
    }, [exportRows, currentPage]);

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
            "ทะเบียนทดแทน1(ระบุทะเบียน)": String(
                item.export_detail?.license || item.export_license ||
                (item.export_row_index != null ? item.details?.[item.export_row_index]?.license : "") ||
                (!item.export_detail && item.export_row_index != null
                    ? (Array.isArray(item.license_replace) ? item.license_replace
                        : String(item.license_replace ?? "").split(/[,;\n]+/))
                        .map((license) => String(license).trim()).filter(Boolean)[item.export_row_index]
                    : "") || ""
            ).trim(),
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
        const isDateColumn = (column: string) => column.startsWith("วันที่") || column === "คาดการณ์วันเข้าคลัง";
        const parseImportDate = (value: unknown, date1904 = false): string | null => {
            const text = normalizeImportValue(value);
            if (!text || text === "-") return null;
            if (/^\d+(?:\.\d+)?$/.test(text)) {
                const serial = Number(text);
                // Excel's 1900 calendar contains the fictitious 29 February 1900.
                if (!Number.isFinite(serial) || serial < 1 || (!date1904 && Math.floor(serial) === 60)) {
                    throw new Error(`วันที่ “${text}” ไม่ถูกต้อง`);
                }
                const parsed = XLSX.SSF.parse_date_code(serial, { date1904 });
                if (!parsed || parsed.y < 1900 || parsed.y > 9999) throw new Error(`วันที่ “${text}” ไม่ถูกต้อง`);
                return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
            }
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
        const readImportFile = async (file?: File) => {
            if (!file || savingImport || readingImport || isLoading) return;
            setUploadStatus("reading"); setUploadChanges([]);
            const version = ++importReadVersion.current;
            setImportError(""); setImportMessage(""); setImportUpdates([]); setImportPreview([]);
            setImportFileName(file.name); setReadingImport(true);
            try {
                if (!/\.xlsx$/i.test(file.name)) throw new Error("กรุณาเลือกไฟล์ .xlsx ที่ส่งออกจากแท็บสำหรับอัปเดตงาน");
                if (file.size > 10 * 1024 * 1024) throw new Error("ไฟล์ต้องมีขนาดไม่เกิน 10 MB");
                const book = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false, dateNF: "dd/mm/yyyy" });
                const sheet = book.Sheets["รายการคำขอ"];
                if (!sheet) throw new Error("ไม่พบ Sheet รายการคำขอ กรุณาใช้ไฟล์สำหรับอัปเดตงาน");
                const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
                const headers = (matrix[0] ?? []).map(normalizeImportValue);
                if (headers.length !== importColumns.length || headers.some((header, index) => header !== importColumns[index])) {
                    throw new Error("หัวคอลัมน์ไม่ตรงกับไฟล์สำหรับอัปเดตงาน กรุณาส่งออกไฟล์ใหม่และไม่แก้ไขหัวคอลัมน์");
                }
                const values = matrix.slice(1).filter((row) => row.some((value) => normalizeImportValue(value)));
                if (!values.length || values.length > 500) throw new Error("รองรับข้อมูล 1–500 แถวต่อครั้ง");
                const seen = new Set<number>();
                const updates: FleetImportUpdate[] = [];
                const updateSources: Array<{ excelRow: number; sequence: number; document: string }> = [];
                const preview: Record<string, unknown>[] = [];
                const changes: typeof uploadChanges = [];
                for (const [rowIndex, valuesRow] of values.entries()) {
                    const record = Object.fromEntries(headers.map((header, i) => [header, valuesRow[i] ?? ""]));
                    // Normalize typed dates and numeric Excel dates before comparison.
                    for (const column of headers.filter(isDateColumn)) {
                        try {
                            const iso = parseImportDate(record[column], !!book.Workbook?.WBProps?.date1904);
                            record[column] = iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "";
                        } catch (error) {
                            throw new Error(`แถว ${rowIndex + 2} / ${column}: ${error instanceof Error ? error.message : "วันที่ไม่ถูกต้อง"}`);
                        }
                    }
                    const sequence = Number(record["ลำดับ"]);
                    if (!Number.isInteger(sequence) || sequence < 1 || seen.has(sequence)) throw new Error(`แถว ${rowIndex + 2}: ลำดับไม่ถูกต้องหรือซ้ำ`);
                    seen.add(sequence);
                    const originalItem = exportRows[sequence - 1];
                    if (!originalItem) throw new Error(`แถว ${rowIndex + 2}: ไม่พบรถในผลค้นหาปัจจุบัน กรุณาใช้ตัวกรองเดิมตอนส่งออก`);
                    const original = toExportRow(originalItem, sequence - 1);
                    for (const column of headers.filter(isDateColumn)) {
                        const key = column as keyof typeof original;
                        const text = String(original[key] ?? "").trim();
                        const iso = parseImportDate(/^\d{4}-\d{2}-\d{2}[T ]/.test(text) ? text.slice(0, 10) : text);
                        Object.assign(original, { [column]: iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "" });
                    }
                    for (const column of importColumns.filter((column) => !(column in updateColumnFields))) {
                        if (normalizeImportValue(record[column]) !== normalizeImportValue(original[column as keyof typeof original])) {
                            throw new Error(`แถว ${rowIndex + 2}: ข้อมูล “${column}” ถูกแก้ไขหรือข้อมูลระบบเปลี่ยนแล้ว กรุณาส่งออกไฟล์ใหม่`);
                        }
                    }
                    const fields: Record<string, string | null> = {};
                    for (const [column, fieldName] of Object.entries(updateColumnFields)) {
                        if (normalizeImportValue(record[column]) === normalizeImportValue(original[column as keyof typeof original])) continue;
                        const isDate = /date/.test(fieldName);
                        try { fields[fieldName] = isDate ? parseImportDate(record[column]) : normalizeImportValue(record[column]) || null; }
                        catch (error) { throw new Error(`แถว ${rowIndex + 2} / ${column}: ${error instanceof Error ? error.message : "ข้อมูลไม่ถูกต้อง"}`); }
                        changes.push({ vehicle: `${formatRunningDoc(originalItem)} / คันที่ ${originalItem.vehicle_no ?? ""}`, column,
                            before: normalizeImportValue(original[column as keyof typeof original]) || "(ว่าง)",
                            after: normalizeImportValue(record[column]) || "(ล้างค่า)" });
                    }
                    if (Object.keys(fields).length) {
                        const requestId = String(originalItem.id ?? "");
                        const vehicleNo = String(originalItem.vehicle_no ?? "");
                        if (!requestId || !vehicleNo) throw new Error(`แถว ${rowIndex + 2}: ไม่พบรหัสคำขอหรือลำดับรถ`);
                        updates.push({ request_id: requestId, vehicle_no: vehicleNo,
                            unit_code: String(originalItem.unit_code ?? originalItem.running_doc_vehicle_no ?? ""), fields });
                        updateSources.push({ excelRow: matrix.indexOf(valuesRow) + 1, sequence,
                            document: String(record["เลขที่เอกสาร"] ?? formatRunningDoc(originalItem)) });
                        preview.push(record);
                    }
                }
                // Several outgoing-license rows may refer to one incoming vehicle.
                // Merge compatible edits, never choose between conflicting values.
                const merged = new Map<string, FleetImportUpdate>();
                const sources = new Map<string, number[]>();
                updates.forEach((update, index) => {
                    const key = JSON.stringify([update.request_id, update.vehicle_no]);
                    const prior = merged.get(key);
                    if (!prior) {
                        merged.set(key, { ...update, fields: { ...update.fields } });
                        sources.set(key, [index]);
                        return;
                    }
                    const priorIndices = sources.get(key)!;
                    const rowLabel = (i: number) => `แถว Excel ${updateSources[i].excelRow} (ลำดับ ${updateSources[i].sequence})`;
                    if (prior.unit_code && update.unit_code && prior.unit_code !== update.unit_code) {
                        throw new Error(`รหัสรถไม่ตรงกัน: request_id=${update.request_id}, vehicle_no=${update.vehicle_no}\n${rowLabel(priorIndices[0])}: ${prior.unit_code}\n${rowLabel(index)}: ${update.unit_code}\nยังไม่ได้บันทึก กรุณาตรวจสอบการจับคู่รถ`);
                    }
                    for (const [field, value] of Object.entries(update.fields)) {
                        if (Object.prototype.hasOwnProperty.call(prior.fields, field) && prior.fields[field] !== value) {
                            const previous = priorIndices.find(i => Object.prototype.hasOwnProperty.call(updates[i].fields, field))!;
                            const column = Object.keys(updateColumnFields).find(label => updateColumnFields[label] === field) ?? field;
                            console.error("[Upload งาน] ค่าขัดแย้งของรถคันเดียวกัน", {
                                request_id: update.request_id, vehicle_no: update.vehicle_no, unit_code: update.unit_code,
                                field, previous_row: updateSources[previous].excelRow, previous_value: prior.fields[field],
                                current_row: updateSources[index].excelRow, current_value: value,
                            });
                            throw new Error(`รถ ${update.unit_code || update.request_id} / คันที่ ${update.vehicle_no} กรอก “${column}” ไม่ตรงกัน\n${rowLabel(previous)}: ${prior.fields[field] ?? "(ล้างค่า)"}\n${rowLabel(index)}: ${value ?? "(ล้างค่า)"}\nยังไม่ได้บันทึก กรุณาแก้ช่องนี้ให้ตรงกันแล้ว Upload อีกครั้ง`);
                        }
                        prior.fields[field] = value;
                    }
                    if (!prior.unit_code) prior.unit_code = update.unit_code;
                    priorIndices.push(index);
                });
                const mergedGroups = [...sources.values()].filter(indices => indices.length > 1);
                if (mergedGroups.length) console.table(mergedGroups.map(indices => ({
                    request_id: updates[indices[0]].request_id,
                    vehicle_no: updates[indices[0]].vehicle_no,
                    unit_code: updates[indices[0]].unit_code,
                    excel_rows: indices.map(i => updateSources[i].excelRow).join(", "),
                    result: "รวมรายการที่มีค่าตรงกัน ก่อนส่งบันทึกหนึ่งครั้งต่อรถ",
                })));
                updates.splice(0, updates.length, ...merged.values());
                const uniqueChanges = [...new Map(changes.map(change => [JSON.stringify(change), change])).values()];
                if (version !== importReadVersion.current) return;
                setImportUpdates(updates); setImportPreview(preview); setUploadChanges(uniqueChanges);
                setUploadStatus(updates.length ? "ready" : "unchanged");
                setImportMessage(updates.length ? `พบการเปลี่ยนแปลง ${updates.length} คัน รวม ${uniqueChanges.length} ช่อง${mergedGroups.length ? ` (รวมแถวซ้ำ ${mergedGroups.length} กลุ่มแล้ว)` : ""} — ยังไม่ได้บันทึก กรุณากดปุ่มยืนยันบันทึกด้านล่าง` : "ตรวจสอบไฟล์แล้ว ไม่มีข้อมูลต่างจากระบบ จึงไม่มีรายการให้บันทึก");
            } catch (error) {
                if (version === importReadVersion.current) { setUploadStatus("error"); setImportError(error instanceof Error ? error.message : "อ่านไฟล์ไม่สำเร็จ"); }
            } finally { if (version === importReadVersion.current) setReadingImport(false); }
        };
        const saveImportedUpdates = async () => {
            if (!importUpdates.length || savingImport || readingImport || isLoading || importSaveInFlight.current) return;
            importSaveInFlight.current = true;
            setSavingImport(true); setImportError(""); setImportMessage(""); setUploadStatus("saving");
            try {
                let savedCount = importUpdates.length;
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
                    let result: { status?: string; message?: string; updated_count?: number };
                    try { result = await response.json(); }
                    catch { throw new Error(`API บันทึกตอบกลับไม่ใช่ JSON (HTTP ${response.status}) กรุณาตรวจสอบไฟล์ PHP`); }
                    if (!response.ok || result?.status !== "success") {
                        throw new Error(result?.message || `บันทึกข้อมูลไม่สำเร็จ (HTTP ${response.status})`);
                    }
                    if (typeof result.updated_count === "number") savedCount = result.updated_count;
                }
                setUploadStatus("success");
                setImportMessage(`เซิร์ฟเวอร์แจ้งบันทึกสำเร็จ ${savedCount} คัน จากที่ส่ง ${importUpdates.length} คัน (${uploadChanges.length} ช่องที่ส่งแก้ไข) ดูรายละเอียดด้านล่าง${savedCount !== importUpdates.length ? " — จำนวนที่บันทึกไม่ตรงกับที่ส่ง กรุณาตรวจสอบข้อมูลก่อนส่งซ้ำ" : ""}`);
                setImportUpdates([]); setImportPreview([]);
                if (importInput.current) importInput.current.value = "";
                setLoadingTrackRows(true);
                setLoadAttempt((attempt) => attempt + 1);
            } catch (error) { setUploadStatus("error"); setImportError(error instanceof Error ? error.message : "บันทึกข้อมูลไม่สำเร็จ"); }
            finally { importSaveInFlight.current = false; setSavingImport(false); }
        };

    // Export Excel
    const handleExport = () => {
        if (loadingTrackRows || loadingFbp || loadError || exportRows.length === 0) {
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

            // Date formats also apply to empty cells so newly typed dates stay readable.
            for (let c = 0; c < excelHeaders.length; c++) {
                if (!isDateColumn(excelHeaders[c])) continue;
                for (let r = 1; r <= range.e.r; r++) {
                    const address = XLSX.utils.encode_cell({ r, c });
                    const cell = worksheet[address] ?? (worksheet[address] = { t: "s", v: "" });
                    const text = String(cell.v ?? "").trim();
                    if (text && text !== "-") {
                        const dateText = /^\d{4}-\d{2}-\d{2}[T ]/.test(text) ? text.slice(0, 10) : text;
                        const iso = parseImportDate(dateText);
                        if (iso) {
                            const [y, m, d] = iso.split("-").map(Number);
                            const utc = Date.UTC(y, m - 1, d);
                            cell.t = "n";
                            cell.v = (utc - Date.UTC(1899, 11, 31)) / 86400000 + (utc >= Date.UTC(1900, 2, 1) ? 1 : 0);
                        }
                    } else { cell.t = "s"; cell.v = ""; }
                    cell.z = "dd/mm/yyyy";
                    cell.s = { ...cell.s, numFmt: "dd/mm/yyyy" };
                    delete cell.w;
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

        if (exportMode === "update") {
            const raw = XLSX.write(workbook, { bookType: "xlsx", type: "array", compression: false });
            const protectedBytes = protectUpdateWorkbook(new Uint8Array(raw), editableStart);
            const blob = new Blob([protectedBytes as BlobPart], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url; link.download = "Truck_Request_Update.xlsx";
            document.body.appendChild(link); link.click(); link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        } else {
            XLSX.writeFile(workbook, "Truck_Request.xlsx");
        }
        } catch (error) {
            setExportError(error instanceof Error ? error.message : "ส่งออก Excel ไม่สำเร็จ");
        }
    };

    if (!open) {
        return null;
    }

    const ready = !isLoading && !loadError && exportRows.length > 0;
    const loadingTitle = loadingTrackRows
        ? reportProgress ? "กำลังดึงรายละเอียดรายงาน" : usesTrackFleetSearch ? "กำลังค้นหารายการรถจาก Track Fleet" : "กำลังโหลดรายการคำขอรถ"
        : "กำลังโหลดข้อมูลบริษัทขนส่ง";
    const emptyDescription = "ไม่พบรายการตามเงื่อนไขจากหน้าหลัก กรุณาปรับตัวกรองบนหน้า Track Fleet แล้วเปิด Export อีกครั้ง";

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/55 p-2 backdrop-blur-sm sm:p-5">
            <div role="dialog" aria-modal="true" aria-labelledby="export-track-fleet-title"
                className="flex h-full min-h-0 max-h-[960px] w-full max-w-[1400px] flex-col overflow-y-auto overscroll-contain rounded-2xl border border-white/70 bg-white text-black shadow-2xl sm:rounded-3xl">
                <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 via-blue-50 to-slate-50 px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white shadow-sm">
                            <FileSpreadsheet size={20} />
                        </div>
                        <div className="min-w-0">
                            <h2 id="export-track-fleet-title" className="text-base font-bold text-black">
                                {exportMode === "update" ? "ส่งออกไฟล์สำหรับอัปเดตงาน" : "ส่งออกรายงานคำขอรถ"}
                            </h2>
                            <p className="mt-0.5 truncate text-[11px] font-semibold text-black">
                                {dcLabel || "ข้อมูลคำขอทั้งหมดที่สามารถเข้าถึงได้"}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="ปิดหน้าต่างส่งออกรายงาน"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-black shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                    >
                        <X size={17} />
                    </button>
                </div>

                <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-3">
                    <div role="group" aria-label="รูปแบบการส่งออก" className="inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
                        {([ ["report", "ส่งออกรายงาน"], ["update", "สำหรับอัปเดตงาน"] ] as const).map(([mode, label]) => (
                            <button key={mode} type="button" aria-pressed={exportMode === mode}
                                onClick={() => { setExportMode(mode); setExportError(""); }}
                                className={`rounded-lg px-4 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${exportMode === mode ? "bg-blue-700 text-white shadow-sm" : "text-black hover:bg-white"}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                    <input ref={importInput} type="file" accept=".xlsx" className="sr-only text-black" aria-label="เลือกไฟล์ Excel สำหรับ Upload งาน"
                        disabled={readingImport || savingImport || isLoading}
                        onChange={(event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            if (file) { void readImportFile(file); }
                        }} />
                    {exportError && <p role="alert" className="mt-2 text-xs text-rose-700">{exportError}</p>}
                </div>
                <div className="flex min-h-0 shrink-0 flex-col">
                    {exportMode === "update" && <section id="fleet-import-panel" aria-label="Upload อัปเดตงาน" className="m-4 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 p-4 xl:flex-row xl:items-center xl:justify-between">
                            <div className="flex min-w-0 items-start gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                                    <RefreshCw className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-black">อัปเดตงานด้วย Excel</h3>
                                    <p className="mt-1 text-xs leading-5 text-black">ดาวน์โหลด → แก้ไขคอลัมน์สีเขียวอ่อน → Upload กลับเพื่ออัปเดตงาน</p>
                                </div>
                            </div>
                            <div className="grid w-full shrink-0 grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
                                <button type="button" onClick={handleExport} disabled={!ready}
                                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-black shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-40">
                                    {isLoading && !loadError ? <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" /> : <Download className="h-4 w-4 text-emerald-600" />}
                                    ดาวน์โหลด Excel
                                </button>
                                <button type="button" onClick={() => { importInput.current?.click(); }} disabled={readingImport || savingImport || isLoading} aria-controls="fleet-import-panel"
                                    style={{ backgroundColor: "#2563eb", color: "#ffffff" }}
                                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40">
                                    <CloudUpload className="h-4 w-4" /> {readingImport ? "กำลังตรวจสอบไฟล์…" : savingImport ? "กำลังบันทึก…" : "Upload งาน"}
                                </button>
                            </div>
                        </div>
                        <div className="p-5 sm:p-6">
                    {exportMode === "update" && uploadStatus !== "idle" && (
                        <div role={uploadStatus === "error" ? "alert" : "status"} aria-live="polite"
                            className={`mt-3 rounded-xl border p-4 ${uploadStatus === "error" ? "border-rose-200 bg-rose-50 text-rose-900" : uploadStatus === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-blue-200 bg-blue-50 text-blue-900"}`}>
                            <p className="text-sm font-bold text-black">{({ reading: "กำลังตรวจสอบไฟล์", ready: "ตรวจสอบผ่าน — รอยืนยันบันทึก", unchanged: "ไม่มีข้อมูลเปลี่ยนแปลง", saving: "กำลังส่งข้อมูลไปบันทึก", success: "บันทึกสำเร็จ", error: "ดำเนินการไม่สำเร็จ" } as const)[uploadStatus]}</p>
                            <p className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs text-black">{uploadStatus === "reading" ? "กำลังอ่าน Excel และเปรียบเทียบกับข้อมูลระบบ…" : uploadStatus === "saving" ? "กำลังรอผลจากเซิร์ฟเวอร์ กรุณาอย่ากดส่งซ้ำ" : importError || importMessage}</p>
                            {uploadStatus === "ready" && <button type="button" onClick={() => void saveImportedUpdates()} disabled={isLoading || savingImport}
                                style={{ backgroundColor: "#047857", color: "#ffffff", border: "1px solid #065f46" }}
                                className="mt-3 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">ยืนยันบันทึก {importUpdates.length} คัน / {uploadChanges.length} ช่อง</button>}
                        </div>
                    )}
                        <p className="text-xs leading-5 text-black">ใช้ไฟล์จากแท็บสำหรับอัปเดตงาน ระบบจะนำเข้าเฉพาะช่องที่อนุญาตให้แก้ไข</p>
                        <div onDragOver={(event) => { event.preventDefault(); if (!readingImport && !savingImport) setIsDraggingImport(true); }}
                            onDragLeave={() => setIsDraggingImport(false)}
                            onDrop={(event) => { event.preventDefault(); setIsDraggingImport(false); if (!readingImport && !savingImport) void readImportFile(event.dataTransfer.files[0]); }}
                            className={`mt-4 flex min-h-[110px] flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 text-center ${isDraggingImport ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50"}`}>
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600"><CloudUpload className="h-7 w-7" /></div>
                            <p className="mt-3 text-sm font-semibold text-black">{isDraggingImport ? "วางไฟล์ตรงนี้" : "ลากไฟล์มาวางที่นี่ หรือกด Upload งานด้านบน"}</p>
                            <p className="mt-1 text-xs text-slate-500">รองรับ .xlsx • สูงสุด 10 MB • ไม่เกิน 500 แถว</p>

                        </div>
                        {importFileName && <p className="mt-3 break-all text-xs text-black">ไฟล์: {importFileName}</p>}
                        {uploadChanges.length > 0 && <div className="mt-4">
                            <h3 className="text-sm font-bold text-black">{uploadStatus === "success" ? "รายละเอียดที่ส่งและเซิร์ฟเวอร์ตอบรับแล้ว" : "รายละเอียดที่รอบันทึก"} ({uploadChanges.length} ช่อง)</h3>
                            <p className="mt-1 text-xs text-slate-500">หนึ่งแถวต่อรถ เลื่อนซ้าย–ขวาเพื่อดูช่องที่แก้ไขทั้งหมด</p>
                            <div tabIndex={0} aria-label="รายละเอียดการแก้ไขรายคัน เลื่อนซ้ายขวาได้" className="mt-2 max-h-[420px] overflow-auto rounded-xl border border-slate-200" style={{ scrollbarGutter: "stable" }}>
                                <table className="w-max min-w-full border-separate border-spacing-0 text-xs text-black">
                                    <thead className="sticky top-0 z-20 text-white"><tr>
                                        <th className="sticky left-0 z-30 min-w-[240px] max-w-[280px] border-b border-r border-blue-700 bg-blue-800 px-4 py-3 text-left text-white">เอกสาร / รถ</th>
                                        {horizontalChanges.columns.map(column => <th key={column} className="min-w-[200px] max-w-[240px] whitespace-normal border-b border-r border-blue-700 bg-blue-800 px-4 py-3 text-left text-white">{column}</th>)}
                                    </tr></thead>
                                    <tbody>{horizontalChanges.rows.map(({ vehicle, fields }) => <tr key={vehicle}>
                                        <th scope="row" className="sticky left-0 z-10 max-w-[280px] whitespace-normal break-words border-b border-r border-slate-200 bg-white px-4 py-4 text-left align-top font-semibold text-black">{vehicle}</th>
                                        {horizontalChanges.columns.map(column => {
                                            const change = fields.get(column);
                                            return <td key={column} className={`max-w-[240px] whitespace-normal break-words border-b border-r border-slate-200 px-4 py-3 align-top text-black ${change ? "bg-emerald-50/60" : "bg-slate-50"}`}>
                                                {change ? <div className="space-y-2">
                                                    <div><span className="block text-[10px] text-slate-500">ค่าเดิม</span><span className="text-black">{change.before}</span></div>
                                                    <div className="border-t border-emerald-100 pt-2"><span className="block text-[10px] text-slate-500">ค่าใหม่</span><span className="font-semibold text-black">{change.after}</span></div>
                                                </div> : <span className="text-black">ไม่เปลี่ยนแปลง</span>}
                                            </td>;
                                        })}
                                    </tr>)}</tbody>
                                </table>
                            </div>
                        </div>}
                        {importPreview.length > 0 && <div tabIndex={0} aria-label="ตัวอย่างไฟล์อัปโหลด เลื่อนดูได้" className="mt-4 max-h-64 overflow-auto rounded-xl border border-slate-200">
                            <table className="w-max min-w-full text-xs text-black"><thead className="sticky top-0 bg-blue-800 text-white"><tr>{importColumns.map((column) => <th key={column} className="max-w-[200px] border-r border-blue-700 px-3 py-2 text-left text-white">{column}</th>)}</tr></thead>
                                <tbody>{importPreview.slice(0, 20).map((row, index) => <tr key={index}>{importColumns.map((column) => <td key={column} className={`max-w-[220px] break-words border border-slate-100 px-3 py-2 text-black ${column in updateColumnFields ? "bg-emerald-50" : "bg-slate-50"}`}>{String(row[column] ?? "")}</td>)}</tr>)}</tbody>
                            </table>
                        </div>}
                        {importPreview.length > 20 && <p className="mt-2 text-xs text-black">ตัวอย่าง 20 รายการแรก จาก {importPreview.length} รายการที่แก้ไข</p>}
                        <p className="mt-3 text-xs leading-5 text-slate-500">ยืนยันเพื่อนำเฉพาะข้อมูลที่แก้ไขไปบันทึกในระบบ ช่องที่ลบข้อมูลออกจะถูกบันทึกเป็นค่าว่าง</p>
                        <button type="button" onClick={() => void saveImportedUpdates()} disabled={!importUpdates.length || readingImport || savingImport || isLoading}
                            style={{ backgroundColor: "#047857", color: "#ffffff", border: "1px solid #065f46" }}
                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40">
                            {savingImport ? <LoaderCircle size={15} className="animate-spin" /> : <Upload size={15} />}
                            {savingImport ? "กำลังบันทึก…" : uploadStatus === "success" ? "บันทึกแล้ว" : `ยืนยันบันทึก${importUpdates.length ? ` ${importUpdates.length} คัน` : ""}`}
                        </button>
                        </div>
                    </section>}

                    <div className="flex min-h-[260px] shrink-0 flex-col bg-slate-50 px-3 py-3 sm:px-5">
                        <section aria-labelledby="export-preview-title" aria-busy={isLoading && !loadError}
                            className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
                            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
                                <div>
                                    <h3 id="export-preview-title" className="text-sm font-semibold text-black">ตัวอย่างรายงาน</h3>
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
                                    <p className="text-sm font-semibold text-black">{loadingTitle}</p>
                                    {loadingTrackRows && reportProgress ? (
                                        <>
                                            <progress aria-label="จำนวนคำขอที่โหลดรายละเอียดแล้ว" max={reportProgress.total} value={reportProgress.loaded}
                                                className="h-2 w-52 max-w-full accent-blue-600" />
                                            <p className="text-xs tabular-nums text-black">โหลดแล้ว {reportProgress.loaded.toLocaleString("th-TH")} จาก {reportProgress.total.toLocaleString("th-TH")} คำขอ</p>
                                        </>
                                    ) : (
                                        <p className="text-xs text-black">ตัวอย่างรายงานจะแสดงเมื่อโหลดเสร็จ</p>
                                    )}
                                </div>
                            ) : !ready ? (
                                <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-4 text-center">
                                    <Search aria-hidden="true" size={25} className="mb-1 text-black" />
                                    <p className="text-sm font-semibold text-black">ไม่พบรายการที่จะส่งออก</p>
                                    <p className="max-w-md text-xs text-black">{emptyDescription}</p>
                                </div>
                            ) : (
                                <>
                                <div
                                    tabIndex={0} aria-label="ตารางรายงาน เลื่อนได้ทั้งแนวตั้งและแนวนอน"
                                    className="min-h-[110px] max-h-[55vh] w-full overflow-auto overscroll-contain"
                                    style={{
                                        scrollbarGutter: "stable both-edges",
                                        WebkitOverflowScrolling: "touch",
                                        touchAction: "pan-x pan-y",
                                    }}
                                >
                                    <table className="w-max min-w-full table-fixed border-collapse text-left text-black">
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
                                            {paginatedRows.map((item, index) => {
                                                const row = toExportRow(
                                                    item,
                                                    (currentPage - 1) * ROWS_PER_PAGE + index
                                                );
                                                return (
                                                    <tr key={`${item.id ?? item.running_doc}-${item.vehicle_no ?? item.export_row_index ?? index}-${index}`}
                                                        className="border-b border-slate-100 text-xs even:bg-slate-50 hover:bg-blue-50">
                                                        {previewColumns.map((column) => (
                                                            <td key={column} className={`${exportMode === "update" && previewColumns.indexOf(column) >= editableStart ? "bg-emerald-50/70" : ""} border-r border-slate-100 px-3 py-2 align-top leading-4 whitespace-normal break-words text-black ${column === "ลำดับ" ? "w-[64px] min-w-[64px] text-center" : "w-[170px] min-w-[170px] max-w-[220px]"}`}>
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
                                    <p className="text-[11px] font-bold text-black">
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
                                            className="h-9 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-black transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            ก่อนหน้า
                                        </button>

                                        <span className="min-w-[90px] text-center text-xs font-black text-black">
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
                        <p className="text-xs font-semibold text-black">{exportMode === "update" ? "สถานะข้อมูลอัปเดตงาน" : "สถานะรายงาน"}</p>
                        <p role="status" className="mt-0.5 text-xs font-medium text-black">
                            {loadError ? "โหลดข้อมูลไม่สำเร็จ" : isLoading ? loadingTitle : ready
                                ? `พร้อมส่งออก ${exportRows.length.toLocaleString("th-TH")} รายการ`
                                : "ไม่มีรายการให้ส่งออก"}
                        </p>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-black transition hover:bg-slate-50"
                        >
                            ยกเลิก
                        </button>
                        {exportMode === "report" && (
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
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
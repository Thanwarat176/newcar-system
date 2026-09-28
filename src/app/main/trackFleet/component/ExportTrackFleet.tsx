"use client";

import {
    useEffect,
    useMemo,
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
    CalendarDays,
    CalendarRange,
    Download,
    FileSpreadsheet,
    X,
} from "lucide-react";

interface ExportRequestItem {
    id?: string | number | null;

    running_doc?: string;
    running_doc_vehicle_no?: string;

    vehicle_no?: string | number;
    vehicle_license?: string;
    vehicle_info?: {
        vehicle_no?: string | number | null;
        car_chassis?: string | null;
        car_model?: string | null;
        car_brand?: string | null;
        car_engine?: string | null;
        car_license?: string | null;
        warehouse_plan_date?: string | null;
    } | null;
    vehicle_warehouse_info?: ExportRequestItem["vehicle_info"][];
    warehouse_plan_date?: string | null;

    current_process?: string;
    current_step?: number;
    total_steps?: number;

    dc_type?: string;
    dc_code?: string;

    date?: string;
    request_date?: string;
    created_at?: string;

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
    export_running_doc?: string;

    details?: ExportRequestDetail[];
}

interface ExportRequestDetail {
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

export default function ExportRequestModal({
    open,
    onClose,
    requests = [],
    dcLabel,
    exportApiUrl,
}: ExportRequestModalProps) {
    const [trackRows, setTrackRows] = useState<ExportRequestItem[]>([]);
    const [loadingTrackRows, setLoadingTrackRows] = useState(false);

    // Read every page from the same filtered vehicle endpoint as the main table.
    useEffect(() => {
        if (!open || !exportApiUrl) return;
        const controller = new AbortController();
        setTrackRows([]);
        setLoadingTrackRows(true);

        const loadAllVehicles = async () => {
            try {
                const getPage = async (page: number) => {
                    const url = new URL(exportApiUrl);
                    url.searchParams.set("page", String(page));
                    url.searchParams.set("limit", "100");
                    const response = await fetch(url.toString(), {
                        signal: controller.signal,
                        cache: "no-store",
                    });
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const payload = await response.json();
                    if (payload.status !== "success" || !Array.isArray(payload.data)) {
                        throw new Error(payload.message || "โหลดรายการรถไม่สำเร็จ");
                    }
                    return payload;
                };

                const first = await getPage(1);
                const totalPages = Number(first.pagination?.total_pages || 1);
                const rows: ExportRequestItem[] = [...first.data];
                for (let page = 2; page <= totalPages; page += 5) {
                    const batch = await Promise.all(
                        Array.from({ length: Math.min(5, totalPages - page + 1) },
                            (_, index) => getPage(page + index))
                    );
                    batch.forEach((payload) => rows.push(...payload.data));
                }
                if (!controller.signal.aborted) setTrackRows(rows);
            } catch (error) {
                if (!controller.signal.aborted) {
                    console.error("โหลดข้อมูล Export ไม่สำเร็จ:", error);
                    setTrackRows([]);
                }
            } finally {
                if (!controller.signal.aborted) setLoadingTrackRows(false);
            }
        };
        void loadAllVehicles();
        return () => controller.abort();
    }, [open, exportApiUrl]);

    const [requestStatusRows, setRequestStatusRows] = useState<ExportRequestItem[]>([]);
    const [fbpRows, setFbpRows] = useState<FbpItem[]>([]);
    const [fbpApprovalByRequest, setFbpApprovalByRequest] = useState<
        Record<string, FbpApprovalInfo>
    >({});

    useEffect(() => {
        if (!open) {
            return;
        }

        const controller = new AbortController();

        const loadRequestStatuses = async () => {
            try {
                const response = await fetch(
                    "http://192.168.158.210/api_new_truck/api/request_get.php",
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

                const rows = Array.isArray(payload)
                    ? payload
                    : Array.isArray(payload?.data)
                        ? payload.data
                        : Array.isArray(payload?.requests)
                            ? payload.requests
                            : Array.isArray(payload?.result)
                                ? payload.result
                                : [];

                setRequestStatusRows(rows);
            } catch (error) {
                if ((error as Error).name !== "AbortError") {
                    setRequestStatusRows([]);
                }
            }
        };

        loadRequestStatuses();

        return () => {
            controller.abort();
        };
    }, [open]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const controller = new AbortController();

        const loadFbpData = async () => {
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

                const rows: FbpItem[] = Array.isArray(payload)
                    ? payload
                    : Array.isArray(payload?.data)
                        ? payload.data
                        : [];

                setFbpRows(rows);
            } catch (error) {
                if ((error as Error).name !== "AbortError") {
                    setFbpRows([]);
                }
            }
        };

        loadFbpData();

        return () => {
            controller.abort();
        };
    }, [open]);

    const safeRequests = useMemo<ExportRequestItem[]>(() => {
        const sourceRequests = exportApiUrl ? trackRows : requests;

        const statusById = new Map(
            requestStatusRows
                .filter((item) => item.id !== null && item.id !== undefined)
                .map((item) => [String(item.id), item])
        );

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

            const apiItem = requestId
                ? statusById.get(requestId)
                : undefined;

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
                status: apiItem?.status ?? item.status,
                status_details:
                    apiItem?.status_details ?? item.status_details,
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
                    apiItem?.details ?? item.details,
                fbp_status:
                    fbpApproval?.statusText ?? item.fbp_status,
                fbp_approved_date:
                    fbpApproval?.changedAt ?? item.fbp_approved_date,
            };
        });
    }, [
        requests,
        trackRows,
        exportApiUrl,
        requestStatusRows,
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

    const [loadingGmHistory, setLoadingGmHistory] = useState(false);

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

    // อ่านวันที่ขอ
    const getRequestDateKey = (
        item: ExportRequestItem
    ) => {
        return normalizeDateKey(
            item.request_date ||
            item.date ||
            item.created_at ||
            ""
        );
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

    // แสดงทะเบียนทดแทน
    const getLicenseText = (
        value?:
            | string[]
            | string
    ) => {
        if (
            Array.isArray(
                value
            )
        ) {
            return value
                .map(
                    (
                        item
                    ) =>
                        String(
                            item
                        ).trim()
                )
                .filter(
                    Boolean
                )
                .join(
                    ", "
                );
        }

        const raw =
            String(
                value ||
                ""
            ).trim();

        if (
            !raw
        ) {
            return "";
        }

        try {
            const parsed =
                JSON.parse(
                    raw
                );

            if (
                Array.isArray(
                    parsed
                )
            ) {
                return parsed
                    .map(
                        (
                            item
                        ) =>
                            String(
                                item
                            ).trim()
                    )
                    .filter(
                        Boolean
                    )
                    .join(
                        ", "
                    );
            }
        } catch {
            return raw;
        }

        return raw;
    };

    // แปลงทะเบียนทดแทนเป็น Array เพื่อแตก 1 ทะเบียน = 1 แถว
    const getLicenseList = (
        value?:
            | string[]
            | string
    ) => {
        if (
            Array.isArray(
                value
            )
        ) {
            return value
                .map((item) =>
                    String(item).trim()
                )
                .filter(Boolean);
        }

        const raw =
            String(
                value ||
                ""
            ).trim();

        if (!raw) {
            return [];
        }

        try {
            const parsed =
                JSON.parse(raw);

            if (
                Array.isArray(
                    parsed
                )
            ) {
                return parsed
                    .map((item) =>
                        String(item).trim()
                    )
                    .filter(Boolean);
            }
        } catch {
            // รองรับข้อความที่คั่นด้วย comma
            return raw
                .split(",")
                .map((item) =>
                    item.trim()
                )
                .filter(Boolean);
        }

        return [raw];
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

    // เลขที่เอกสาร:
    // ถ้าเป็นรถรายคันใน TCAS ให้บังคับเป็น running_doc_vehicle_no แบบ
    // ${running_doc}_${vehicle_no} เช่น REQ001_1
    const formatRunningDoc = (
        item: ExportRequestItem
    ) => {
        const exportRunningDoc = String(
            item.export_running_doc || ""
        ).trim();

        if (exportRunningDoc) {
            return exportRunningDoc;
        }

        const hasVehicleNo =
            item.vehicle_no !== undefined &&
            item.vehicle_no !== null &&
            String(item.vehicle_no).trim() !== "";

        if (hasVehicleNo) {
            const runningDoc =
                String(item.running_doc || "").trim();

            const vehicleNo =
                String(item.vehicle_no).trim();

            if (runningDoc) {
                return `${runningDoc}_${vehicleNo}`;
            }
        }

        return (
            String(item.running_doc || "").trim() ||
            String(item.running_doc_vehicle_no || "").trim() ||
            ""
        );
    };

    const formatStatus = (
        value?: string | null,
        statusDetails?: string | null
    ) => {
        const status = String(value || "")
            .trim()
            .toLowerCase();

        const details = String(statusDetails || "").trim();

        if (status === "progress" && details) {
            return details;
        }

        const statusMap: Record<string, string> = {
            gm_pending: "GM กำลังอนุมัติ",
            center_pending: "กำลังประเมินกองรถ (FBP)",
            fbp_pending: "กำลังประเมินกองรถ (FBP)",
            process: "รอดำเนินการตามกระบวนการ (TCAS)",
            progress: "รอดำเนินการตามกระบวนการ (TCAS)",
            confirm_request: "รอดำเนินการตามกระบวนการ (TCAS)",
            "confirm request": "รอดำเนินการตามกระบวนการ (TCAS)",
            in_progress: "รอดำเนินการตามกระบวนการ (TCAS)",
            reject_gm: "GM ไม่อนุมัติ",
            reject_by_gm: "GM ไม่อนุมัติ",
            rejected_by_gm: "GM ไม่อนุมัติ",
            gm_rejected: "GM ไม่อนุมัติ",
            reject_center: "ส่วนกลางไม่อนุมัติ",
            reject_by_center: "ส่วนกลางไม่อนุมัติ",
            rejected_by_center: "ส่วนกลางไม่อนุมัติ",
            center_rejected: "ส่วนกลางไม่อนุมัติ",
            fbp_rejected: "ส่วนกลางไม่อนุมัติ",
            rejected: "ไม่อนุมัติ",
            approved: "อนุมัติแล้ว",
            completed: "ดำเนินการเสร็จสิ้น",
        };

        if (statusMap[status]) {
            return statusMap[status];
        }

        if (/^reject_[0-9]+$/.test(status)) {
            return "ไม่อนุมัติในขั้นตอนดำเนินการ";
        }

        return (
            String(value || "")
                .replace(/_/g, " ")
                .replace(/-/g, " ")
                .replace(/\s+/g, " ")
                .trim() || "-"
        );
    };

    const formatCurrentProcess = (
        item: ExportRequestItem
    ) => {
        return formatStatus(
            item.status,
            item.status_details
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

    const getGmApprovalInfo = (
        item: ExportRequestItem
    ): GmApprovalInfo => {
        const requestId =
            item.id !== null &&
                item.id !== undefined
                ? String(item.id)
                : "";

        if (
            requestId &&
            gmApprovalByRequest[requestId]
        ) {
            return gmApprovalByRequest[
                requestId
            ];
        }

        // fallback กรณี history API ยังโหลดไม่สำเร็จ
        const fallbackStatus =
            normalizeGmHistoryStatus(
                item.gm_status
            );

        if (
            fallbackStatus === "fbp_pending"
        ) {
            return {
                status: "fbp_pending",
                statusText: "GM อนุมัติ",
                changedAt:
                    item.gm_approved_date || "",
                changedBy:
                    item.gm_approved_by || "",
            };
        }

        if (
            fallbackStatus === "reject_by_gm" ||
            fallbackStatus === "reject_gm" ||
            fallbackStatus === "rejected_by_gm" ||
            fallbackStatus === "gm_rejected"
        ) {
            return {
                status: "reject_by_gm",
                statusText: "GM ไม่อนุมัติ",
                changedAt:
                    item.gm_approved_date || "",
                changedBy:
                    item.gm_approved_by || "",
            };
        }

        if (
            fallbackStatus === "gm_pending"
        ) {
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
        if (!open) {
            return;
        }

        const controller = new AbortController();
        let cancelled = false;

        const loadGmHistory = async () => {
            try {
                setLoadingGmHistory(true);

                const response = await fetch(
                    "http://192.168.158.210/api_new_truck/api/request_status_history.php",
                    {
                        method: "GET",
                        headers: {
                            Accept: "application/json",
                        },
                        cache: "no-store",
                        signal: controller.signal,
                    }
                );

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result?.message ||
                        `HTTP ${response.status}`
                    );
                }

                const historyRows: RequestStatusHistoryItem[] =
                    Array.isArray(result)
                        ? result
                        : Array.isArray(result?.data)
                            ? result.data
                            : result?.request_id && result?.status
                                ? [result]
                                : [];

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

                if (cancelled) {
                    return;
                }

                setGmApprovalByRequest(approvalByRequest);
                setFbpApprovalByRequest(fbpApprovalByRequestData);
            } catch (error) {
                if ((error as Error).name !== "AbortError") {
                    if (!cancelled) {
                        setGmApprovalByRequest({});
                        setFbpApprovalByRequest({});
                    }
                }
            } finally {
                if (!cancelled) {
                    setLoadingGmHistory(false);
                }
            }
        };

        loadGmHistory();

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [open]);

    // กำหนดช่วงวันที่เริ่มต้นเมื่อเปิด Modal
    useEffect(() => {
        if (
            !open
        ) {
            return;
        }

        const dates =
            safeRequests
                .map(
                    (
                        item
                    ) =>
                        getRequestDateKey(
                            item
                        )
                )
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

            const todayKey =
                formatDateToKey(
                    today
                );

            setStartDate(
                todayKey
            );

            setEndDate(
                todayKey
            );

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
        safeRequests,
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
            if (
                !startDate ||
                !endDate
            ) {
                return [];
            }

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

                        if (
                            !date
                        ) {
                            return false;
                        }

                        const matchDate =
                            date >= from &&
                            date <= to;

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
                .flatMap(
                    (
                        item
                    ) => {
                        const normalizeCompanyForExport = (value?: string) =>
                            String(value || "")
                                .trim()
                                .replace(/\s+/g, " ")
                                .toLowerCase();

                        const splitCompanyAndTruckType = (value?: string) => {
                            const rawValue = String(value || "")
                                .trim()
                                .replace(/\s+/g, " ");

                            const match = rawValue.match(
                                /^(.*?)\s*\(([^()]*)\)\s*$/
                            );

                            if (!match) {
                                return {
                                    companyName: rawValue,
                                    truckType: "",
                                };
                            }

                            const companyName = String(match[1] || "").trim();
                            const truckType = String(match[2] || "").trim();

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

                        const requestDetails = Array.isArray(item.details)
                            ? item.details
                            : [];

                        // ถ้า API มี details ให้แตกเป็นรถแต่ละคัน
                        if (requestDetails.length > 0 && !isVehicleRow(item)) {
                            const baseRunningDoc = String(
                                item.running_doc ||
                                item.running_doc_vehicle_no ||
                                ""
                            ).trim();

                            return requestDetails.map((detail, detailIndex) => {
                                const detailCompanyName = String(
                                    detail.company_name || ""
                                ).trim();

                                const matchedFbp = fbpRows.find(
                                    (fbpItem) =>
                                        normalizeCompanyForExport(fbpItem.NAME) ===
                                        normalizeCompanyForExport(
                                            detailCompanyName
                                        )
                                );

                                return {
                                    ...item,

                                    // เลขเอกสารแยกตามลำดับรถ
                                    export_running_doc:
                                        requestDetails.length > 1 &&
                                            baseRunningDoc
                                            ? `${baseRunningDoc}_${detailIndex + 1}`
                                            : "",

                                    // ประเภทรถ = details.truck_type
                                    fleet_truck_type:
                                        detail.truck_type || "",

                                    // ทะเบียนทดแทน = details.license_replace
                                    export_license:
                                        detail.license_replace || "",

                                    export_qty: 1,
                                    export_row_index: detailIndex,

                                    // ชื่อบริษัทขนส่ง = details.company_name
                                    approved_company_name:
                                        detailCompanyName,

                                    // ชื่อย่อและ Vendor Code จาก FBP
                                    approved_company_short_name:
                                        matchedFbp?.SHORT_NAME || "",
                                    approved_company_id:
                                        matchedFbp?.CODE || "",

                                    // ประเภทรถที่ถูกทดแทน
                                    truck_type_replace:
                                        detail.truck_type_replace || "",

                                    // บริษัทขนส่งที่ถูกทดแทน
                                    company_name_replace:
                                        detail.company_name_replace || "",
                                };
                            });
                        }

                        const companyNames = String(
                            item.approved_company_name || ""
                        )
                            .split(/[,，]/)
                            .map((companyName) => companyName.trim())
                            .filter(Boolean);

                        const baseRunningDoc = String(
                            item.running_doc ||
                            item.running_doc_vehicle_no ||
                            ""
                        ).trim();

                        const companyRows = (
                            companyNames.length > 0
                                ? companyNames
                                : [""]
                        ).map((companyValue, companyIndex) => {
                            const parsedCompany = splitCompanyAndTruckType(
                                companyValue
                            );

                            const matchedFbp = fbpRows.find(
                                (fbpItem) =>
                                    normalizeCompanyForExport(fbpItem.NAME) ===
                                    normalizeCompanyForExport(
                                        parsedCompany.companyName
                                    )
                            );

                            const companyRunningDoc =
                                companyNames.length > 1 && baseRunningDoc
                                    ? `${baseRunningDoc}_${companyIndex + 1}`
                                    : "";

                            return {
                                ...item,
                                approved_company_name:
                                    matchedFbp?.NAME ||
                                    parsedCompany.companyName,
                                approved_company_short_name:
                                    matchedFbp?.SHORT_NAME ||
                                    (companyNames.length === 1
                                        ? item.approved_company_short_name
                                        : ""),
                                approved_company_id:
                                    matchedFbp?.CODE ||
                                    (companyNames.length === 1
                                        ? item.approved_company_id
                                        : ""),
                                truck_type_replace:
                                    parsedCompany.truckType ||
                                    item.truck_type_replace,
                                export_running_doc: companyRunningDoc,
                            };
                        });

                        // ถ้ามีหลายบริษัท ให้แตกเป็นบริษัทละ 1 แถว
                        // และจับคู่ทะเบียนตามลำดับบริษัท
                        if (companyRows.length > 1) {
                            const licenses = getLicenseList(
                                item.license_replace
                            );

                            return companyRows.map(
                                (companyItem, companyIndex) => ({
                                    ...companyItem,
                                    export_license:
                                        licenses[companyIndex] || "",
                                    export_qty: 1,
                                    export_row_index: companyIndex,
                                })
                            );
                        }

                        const exportItem = companyRows[0] || item;

                        // TCAS ถูกแตกเป็นรายรถจาก HomePage อยู่แล้ว
                        // ใช้ทะเบียนของรถคันนั้นเป็น 1 แถว
                        if (
                            isVehicleRow(
                                exportItem
                            )
                        ) {
                            return [
                                {
                                    ...exportItem,
                                    export_license:
                                        exportItem.vehicle_license ||
                                        "",
                                    export_qty: 1,
                                    export_row_index: 0,
                                },
                            ];
                        }

                        // รายการทั่วไป / รถทดแทน:
                        // ถ้ามีหลายทะเบียน ให้แตกเป็นทะเบียนละ 1 แถว
                        const licenses =
                            getLicenseList(
                                exportItem.license_replace
                            );

                        if (
                            licenses.length >
                            0
                        ) {
                            return licenses.map(
                                (
                                    license,
                                    index
                                ) => ({
                                    ...exportItem,
                                    export_license:
                                        license,
                                    export_qty: 1,
                                    export_row_index:
                                        index,
                                })
                            );
                        }

                        // ไม่มีทะเบียน ให้คงเป็น 1 แถวตามคำขอเดิม
                        return [
                            {
                                ...exportItem,
                                export_license:
                                    "",
                                export_qty:
                                    exportItem.qty ?? 0,
                                export_row_index:
                                    0,
                            },
                        ];
                    }
                );
        }, [
            safeRequests,
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

    // แสดงตัวเลขแบบมี comma เช่น 230000 -> 230,000
    const formatNumberWithComma = (
        value?: number | string | null
    ) => {
        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return "";
        }

        const raw =
            String(value)
                .replace(/,/g, "")
                .trim();

        const numberValue =
            Number(raw);

        if (
            Number.isNaN(numberValue)
        ) {
            return String(value);
        }

        return numberValue.toLocaleString(
            "en-US"
        );
    };

    // ตัดจำนวนท้ายประเภทรถ เช่น B-6W 6.5 m x 1 คัน -> B-6W 6.5 m
    const formatApprovedTruckType = (value?: string | null) => {
        return String(value || "")
            .trim()
            .replace(/\s*[x×]\s*\d+\s*คัน\s*$/i, "")
            .trim();
    };

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
            const vehicleList = data.vehicle_warehouse_info as Record<string, unknown>[] | undefined;
            const matchingVehicle = vehicleList?.find(
                (entry) => String(entry?.vehicle_no ?? "") === String(item.vehicle_no ?? "")
            );
            for (const name of names) {
                const value = vehicle?.[name] ?? matchingVehicle?.[name] ?? data[name];
                if (value !== null && value !== undefined && value !== "") {
                    return typeof value === "string" || typeof value === "number"
                        ? value : "";
                }
            }
            return "";
        };
        const toExportRow = (item: ExportRequestItem, index: number) => ({
            "ลำดับ": index + 1,
            "วันที่สร้างคำขอ": formatShortDate(
                item.request_date || item.date || item.created_at
            ),
            "ประเภทคำขอ": item.fleet_type || "-",
            "สถานะปัจจุบัน": formatCurrentProcess(item),
            "เลขที่เอกสาร": formatRunningDoc(item) || "-",
            "ประเภทคลัง": item.dc_type || "-",
            "ชื่อคลัง": item.dc_code || "-",
            "ประเภทรถ": item.fleet_truck_type || "-",
            "จำนวนรถที่ขอ (คัน) *": item.export_qty ?? item.qty ?? "-",
            "รอรับ Workload":
                item.workload !== null &&
                item.workload !== undefined &&
                item.workload !== ""
                    ? formatNumberWithComma(item.workload)
                    : "-",
            "จำนวน truckturn": item.truckturn ?? "-",
            "ทะเบียนทดแทน1(ระบุทะเบียน)": item.export_license || "-",
            "หมายเหตุที่แจ้งขอ": item.remark || "-",
            "วันที่ใช้งาน": item.usage_date
                ? formatShortDate(item.usage_date)
                : "-",
            "ผู้แจ้งขอ": item.request_by || "-",
            "สถานะอนุมัติจาก GM": getGmApprovalInfo(item).statusText || "",
            "วันที่ GM อนุมัติ": getGmApprovalInfo(item).changedAt || "",
            "ประเภทรถที่อนุมัติ":
                formatApprovedTruckType(item.approved_truck_type) || "-",
            "จำนวนรถที่อนุมัติ": item.approved_qty ?? "-",
            "ชื่อบริษัทขนส่ง (ย่อ)2": item.approved_company_short_name || "-",
            "VENDOR CODE": item.approved_company_id ?? "-",
            "ชื่อบริษัทขนส่ง": item.approved_company_name || "-",
            "ประเภทรถที่ถูกทดแทน": item.truck_type_replace || "-",
            "บริษัทขนส่งที่ถูกทดแทน": item.company_name_replace || "-",
            "หมายเหตุการประเมินกองรถ": item.fbp_remark || "-",
            "สถานะการประเมินกองรถ": item.fbp_status || "-",
            "วันที่ประเมินกองรถ": item.fbp_approved_date || "-",
            "คาดการณ์วันเข้าคลัง": field(item, "warehouse_plan_date"),
            "จัดสรรยี่ห้อรถ": field(item, "car_brand"),
            "จัดสรรผู้ผลิต": field(item, "allocated_manufacturer", "manufacturer"),
            "จัดสรรรุ่นรถ": field(item, "car_model"),
            "เลขเครื่อง": field(item, "car_engine"),
            "เลข Chassis": field(item, "car_chassis"),
            "ทะเบียน": field(item, "car_license", "vehicle_license"),
            "เลขบันทึก FBP": field(item, "fbp_memo_no", "fbp_document_no"),
            "วันที่เข้ามากรอกเลขบันทึก FBP": field(item, "fbp_memo_date", "fbp_document_date"),
            "เลขบันทึกแจ้ง TIS": field(item, "tis_memo_no", "tis_document_no"),
            "วันที่เข้ามากรอกเลขบันทึกแจ้ง TIS": field(item, "tis_memo_date", "tis_document_date"),
            "เลขบันทึกแจ้ง TIL": field(item, "til_memo_no", "til_document_no"),
            "วันที่เข้ามากรอกเลขบันทึกแจ้ง TIL": field(item, "til_memo_date", "til_document_date"),
            "เลขบันทึกแจ้ง ASK": field(item, "ask_memo_no", "ask_document_no"),
            "วันที่เข้ามากรอกเลขบันทึกแจ้ง ASK": field(item, "ask_memo_date", "ask_document_date"),
            "เลขบันทึกแจ้ง Kleasing": field(item, "kleasing_memo_no", "kleasing_document_no"),
            "วันที่เข้ามากรอกเลขบันทึกแจ้ง Kleasing": field(item, "kleasing_memo_date", "kleasing_document_date"),
            "เลขบันทึกแจ้ง TTB2": field(item, "ttb2_memo_no", "ttb2_document_no"),
            "วันที่เข้ามากรอกเลขบันทึกแจ้ง TTB2": field(item, "ttb2_memo_date", "ttb2_document_date"),
            "เลขบันทึกแจ้ง THAIOLIX": field(item, "thaiolix_memo_no", "thaiolix_document_no"),
            "วันที่เข้ามากรอกเลขบันทึกแจ้ง THAIOLIX": field(item, "thaiolix_memo_date", "thaiolix_document_date"),
            "วันที่เริ่มรอจัดสรรตามโควต้า": field(item, "quota_wait_start_date"),
            "วันที่สิ้นสุดรอจัดสรรตามโควต้า": field(item, "quota_wait_end_date"),
            "วันที่เริ่มรอลงนามหนังสือจัดสรร": field(item, "allocation_sign_start_date"),
            "วันที่สิ้นสุดรอลงนามหนังสือจัดสรร": field(item, "allocation_sign_end_date"),
            "วันที่เริ่มรอไฟแนนซ์อนุมัติ": field(item, "finance_approval_start_date"),
            "วันที่สิ้นสุดรอไฟแนนซ์อนุมัติ": field(item, "finance_approval_end_date"),
            "วันที่เริ่มรอส่งรถเข้าอู่": field(item, "garage_delivery_start_date"),
            "วันที่สิ้นสุดรอส่งรถเข้าอู่": field(item, "garage_delivery_end_date"),
            "วันที่เริ่มประกอบตู้/เครื่องทำความเย็น": field(item, "body_installation_start_date"),
            "วันที่สิ้นสุดประกอบตู้/เครื่องทำความเย็น": field(item, "body_installation_end_date"),
            "วันที่เริ่มรอจดทะเบียนรถ": field(item, "registration_wait_start_date"),
            "วันที่สิ้นสุดรอจดทะเบียนรถ": field(item, "registration_wait_end_date"),
            "วันที่เริ่มส่งมอบคลังแล้ว": field(item, "warehouse_delivery_start_date"),
            "วันที่สิ้นสุดส่งมอบคลังแล้ว": field(item, "warehouse_delivery_end_date"),
            "วันที่สิ้นสุดหนังสือหมดอายุ": field(item, "document_expiry_end_date"),
            "วันที่ยกเลิกหนังสือ": field(item, "document_cancel_date"),
            "Remark": field(item, "remark"),
        });

        const previewColumns = Object.keys(toExportRow({} as ExportRequestItem, 0));

    // Export Excel
    const handleExport = () => {
        if (exportRows.length === 0) {
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
            `Truck_Request_${from}_to_${to}.xlsx`
        );
    };

    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/55 p-6 backdrop-blur-sm sm:p-5">
            <div className="flex h-[96vh] w-full max-w-[1400px] flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.40)]">
                <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 via-blue-50 to-slate-50 px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
                            <FileSpreadsheet size={20} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base font-black text-slate-900">
                                Export รายงานคำขอรถ
                            </h2>
                            <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">
                                {dcLabel || "ข้อมูลคำขอทั้งหมดที่สามารถเข้าถึงได้"}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                    >
                        <X size={17} />
                    </button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col">
                    <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-4">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                            <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-xs font-black text-slate-700">
                                        แยกข้อมูลตาม
                                    </p>
                                </div>

                                {/* <div className="flex items-center gap-2">
                                    <div className="flex h-9 min-w-[120px] items-center justify-center rounded-xl bg-slate-900 px-4 text-[11px] font-black text-white shadow-sm">
                                        {exportRows.length.toLocaleString("en-US")} รายการ
                                    </div>
                                </div> */}
                            </div>

                            <div className="grid grid-cols-[minmax(260px,2fr)_repeat(5,minmax(0,1fr))_max-content] items-end gap-3">
                                {/* 1. วันที่สร้างคำขอ */}
                                <div className="relative min-w-0">
                                    <label className="mb-1 block text-[10px] font-black text-slate-400">
                                        วันที่สร้างคำขอ
                                    </label>

                                    <button
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
                                        <div className="absolute left-0 top-full z-[99999] mt-2 w-[340px] max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.28)] ring-1 ring-black/5">
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

                                            <div className="flex justify-center overflow-auto bg-white">
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
                                    <label className="mb-1 block text-[10px] font-black text-slate-400">
                                        ประเภทคำขอ
                                    </label>

                                    <select
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
                                    <label className="mb-1 block text-[10px] font-black text-slate-400">
                                        สถานะปัจจุบัน
                                    </label>

                                    <select
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
                                    <label className="mb-1 block text-[10px] font-black text-slate-400">
                                        ประเภทคลัง
                                    </label>

                                    <select
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
                                    <label className="mb-1 block text-[10px] font-black text-slate-400">
                                        ชื่อคลัง
                                    </label>

                                    <select
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
                                    <label className="mb-1 block text-[10px] font-black text-slate-400">
                                        ประเภทรถ
                                    </label>

                                    <select
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
                                        ล้างตัวกรอง
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col bg-slate-50/60 p-4">
                        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
                            <div className="flex shrink-0 flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-xs font-black text-slate-800">
                                        ข้อมูลที่จะ
                                        Export
                                    </p>

                                    <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                                        รายการคำขอตามช่วงวันที่ที่เลือก
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black text-blue-700 ring-1 ring-blue-100">
                                        {exportRows.length.toLocaleString(
                                            "en-US"
                                        )}{" "}
                                        รายการ
                                    </span>

                                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black text-emerald-700 ring-1 ring-emerald-100">
                                        {totalQty.toLocaleString(
                                            "en-US"
                                        )}{" "}
                                        คัน
                                    </span>
                                </div>
                            </div>

                            <div
                                className="min-h-0 w-full flex-1 overflow-auto overscroll-contain"
                                style={{
                                    scrollbarGutter: "stable both-edges",
                                    WebkitOverflowScrolling: "touch",
                                    touchAction: "pan-x pan-y",
                                }}
                            >
                                <table className="w-max min-w-full table-fixed border-collapse text-left">
                                    <thead className="sticky top-0 z-10 bg-blue-800 text-[10px] font-black text-white">
                                        <tr>
                                            {previewColumns.map((column) => (
                                                <th key={column} className={`border-r border-blue-700 px-3 py-2.5 align-middle leading-4 whitespace-normal break-words ${column === "ลำดับ" ? "w-[64px] min-w-[64px]" : "w-[170px] min-w-[170px] max-w-[220px]"}`}>
                                                    {column}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {exportRows.length === 0 ? (
                                            <tr>
                                                <td colSpan={previewColumns.length} className="py-20 text-center text-slate-400">
                                                    ไม่พบรายการตามเงื่อนไขที่เลือก
                                                </td>
                                            </tr>
                                        ) : paginatedRows.map((item, index) => {
                                            const row = toExportRow(
                                                item,
                                                (currentPage - 1) * ROWS_PER_PAGE + index
                                            );
                                            return (
                                                <tr key={`${item.id ?? item.running_doc}-${item.vehicle_no ?? item.export_row_index ?? index}-${index}`}
                                                    className="border-b border-slate-100 text-[11px] hover:bg-blue-50/50">
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

                            {exportRows.length > 0 && (
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
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400">
                            ช่วงข้อมูลที่จะ Export
                        </p>
                        <p className="mt-0.5 text-[11px] font-black text-slate-600">
                            {formatShortDate(startDate)} - {formatShortDate(endDate)} ·{" "}
                            {exportRows.length.toLocaleString("en-US")} รายการ ·{" "}
                            {totalQty.toLocaleString("en-US")} คัน
                        </p>
                    </div>

                    <div className="flex justify-end gap-2">
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
                            disabled={loadingTrackRows || exportRows.length === 0}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 text-xs font-black text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                        >
                            <Download size={15} />
                            Export Excel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
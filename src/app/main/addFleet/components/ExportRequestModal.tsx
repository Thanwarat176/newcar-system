"use client";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import * as XLSX from "xlsx";

import {
    DateRange,
    RangeKeyDict,
} from "react-date-range";

import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

import { th } from "date-fns/locale";

import {
    CalendarDays,
    CalendarRange,
    Download,
    FileSpreadsheet,
    X,
} from "lucide-react";

interface ExportRequestItem {
    id?: number | null;

    running_doc?: string;
    running_doc_vehicle_no?: string;

    vehicle_no?: string | number;
    vehicle_license?: string;

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

    usage_date?: string;

    workload?: number | string;
    truckturn?: number | string;

    status?: string;

    request_by?: string;
    remark?: string;

    gm_status?: string;
    gm_approved_date?: string;
    gm_approved_by?: string;

    // ใช้เฉพาะตอน Export เพื่อแตกทะเบียนเป็นคนละแถว
    export_license?: string;
    export_qty?: number | string;
    export_row_index?: number;
}

interface RequestStatusHistoryItem {
    id?: string | number;
    request_id?: string | number;
    status?: string;
    status_details?: string;
    changed_by?: string;
    changed_at?: string;
}

interface RequestStatusHistoryResponse {
    status?: string;
    request_id?: string | number;
    count?: number;
    data?: RequestStatusHistoryItem[];
}

interface GmApprovalInfo {
    status: "gm_pending" | "fbp_pending" | "reject_by_gm" | "";
    statusText: string;
    changedAt: string;
    changedBy: string;
}

interface ExportRequestModalProps {
    open: boolean;
    onClose: () => void;
    requests?: ExportRequestItem[];
    dcLabel?: string;
}

export default function ExportRequestModal({
    open,
    onClose,
    requests = [],
    dcLabel,
}: ExportRequestModalProps) {
    const safeRequests = useMemo<ExportRequestItem[]>(() => {
        return Array.isArray(requests)
            ? requests
            : [];
    }, [requests]);

    // วันที่เริ่มต้น
    const [startDate, setStartDate] =
        useState("");

    // วันที่สิ้นสุด
    const [endDate, setEndDate] =
        useState("");

    // เปิดปิด Calendar
    const [
        showDatePicker,
        setShowDatePicker,
    ] =
        useState(false);

    // ช่วงวันที่ใน Calendar
    const [
        calendarRange,
        setCalendarRange,
    ] =
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

    // แสดงข้อความสถานะ
    const formatStatus = (
        value?: string
    ) => {
        const status =
            String(
                value ||
                ""
            )
                .trim()
                .toLowerCase();

        const statusMap: Record<
            string,
            string
        > = {
            gm_pending:
                "รอ GM อนุมัติ",

            center_pending:
                "กำลังประเมินกองรถ (FBP)",

            fbp_pending:
                "กำลังประเมินกองรถ (FBP)",

            process:
                "ดำเนินการตามกระบวนการ (TCAS)",

            progress:
                "ดำเนินการตามกระบวนการ (TCAS)",

            confirm_request:
                "ดำเนินการตามกระบวนการ (TCAS)",

            "confirm request":
                "ดำเนินการตามกระบวนการ (TCAS)",

            in_progress:
                "ดำเนินการตามกระบวนการ (TCAS)",

            reject_gm:
                "GM ไม่อนุมัติ",

            reject_by_gm:
                "GM ไม่อนุมัติ",

            rejected_by_gm:
                "GM ไม่อนุมัติ",

            gm_rejected:
                "GM ไม่อนุมัติ",

            reject_center:
                "ส่วนกลางไม่อนุมัติ",

            reject_by_center:
                "ส่วนกลางไม่อนุมัติ",

            rejected_by_center:
                "ส่วนกลางไม่อนุมัติ",

            center_rejected:
                "ส่วนกลางไม่อนุมัติ",

            fbp_rejected:
                "ส่วนกลางไม่อนุมัติ",

            rejected:
                "ไม่อนุมัติ",

            approved:
                "อนุมัติแล้ว",

            completed:
                "ดำเนินการเสร็จสิ้น",
        };

        if (
            statusMap[
            status
            ]
        ) {
            return statusMap[
                status
            ];
        }

        if (
            /^reject_[0-9]+$/.test(
                status
            )
        ) {
            return "ไม่อนุมัติในขั้นตอนดำเนินการ";
        }

        return (
            String(
                value ||
                ""
            )
                .replace(
                    /_/g,
                    " "
                )
                .replace(
                    /-/g,
                    " "
                )
                .replace(
                    /\s+/g,
                    " "
                )
                .trim() ||
            "-"
        );
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

    // แสดงสถานะ TCAS แบบ "3. ตรวจสอบข้อมูล"
    // จากข้อมูลเดิม เช่น "รอดำเนินการ: ตรวจสอบข้อมูล" + current_step = 3
    const formatCurrentProcess = (
        item: ExportRequestItem
    ) => {
        if (!isVehicleRow(item)) {
            return formatStatus(item.status);
        }

        const currentStep =
            Number(item.current_step ?? 0);

        const rawProcess =
            String(item.current_process || "")
                .trim();

        if (!rawProcess) {
            return currentStep > 0
                ? `${currentStep}. ยังไม่ระบุขั้นตอน`
                : formatStatus(item.status);
        }

        const cleanProcess =
            rawProcess
                .replace(/^รอดำเนินการ\s*:\s*/i, "")
                .replace(/^รอเริ่ม\s*:\s*/i, "")
                .replace(/^ขั้นตอนที่\s*\d+\s*[:.-]?\s*/i, "")
                .replace(/^\d+\.\s*/, "")
                .trim();

        if (currentStep > 0) {
            return `${currentStep}. ${cleanProcess || "ยังไม่ระบุขั้นตอน"}`;
        }

        return cleanProcess || formatStatus(item.status);
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

        const requestIds = Array.from(
            new Set(
                safeRequests
                    .map((item) => item.id)
                    .filter(
                        (id) =>
                            id !== null &&
                            id !== undefined
                    )
                    .map((id) => String(id))
            )
        );

        if (
            requestIds.length === 0
        ) {
            setGmApprovalByRequest({});
            return;
        }

        let cancelled = false;

        const loadGmHistory = async () => {
            try {
                setLoadingGmHistory(true);

                const entries =
                    await Promise.all(
                        requestIds.map(
                            async (
                                requestId
                            ) => {
                                try {
                                    const response =
                                        await fetch(
                                            `http://192.168.158.210/api_new_truck/api/request_status_history.php?request_id=${encodeURIComponent(
                                                requestId
                                            )}`,
                                            {
                                                method: "GET",
                                                headers: {
                                                    Accept: "application/json",
                                                },
                                                cache: "no-store",
                                            }
                                        );

                                    if (
                                        !response.ok
                                    ) {
                                        throw new Error(
                                            `HTTP ${response.status}`
                                        );
                                    }

                                    const result =
                                        (await response.json()) as RequestStatusHistoryResponse;

                                    const history =
                                        Array.isArray(
                                            result.data
                                        )
                                            ? result.data
                                            : [];

                                    return [
                                        requestId,
                                        getGmApprovalFromHistory(
                                            history
                                        ),
                                    ] as const;
                                } catch (
                                    historyError
                                ) {
                                    console.error(
                                        `โหลด GM history ของ request ${requestId} ไม่สำเร็จ:`,
                                        historyError
                                    );

                                    return [
                                        requestId,
                                        {
                                            status: "",
                                            statusText: "",
                                            changedAt: "",
                                            changedBy: "",
                                        } satisfies GmApprovalInfo,
                                    ] as const;
                                }
                            }
                        )
                    );

                if (cancelled) {
                    return;
                }

                setGmApprovalByRequest(
                    Object.fromEntries(
                        entries
                    )
                );
            } finally {
                if (!cancelled) {
                    setLoadingGmHistory(false);
                }
            }
        };

        loadGmHistory();

        return () => {
            cancelled = true;
        };
    }, [
        open,
        safeRequests,
    ]);

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
                        // TCAS ถูกแตกเป็นรายรถจาก HomePage อยู่แล้ว
                        // ใช้ทะเบียนของรถคันนั้นเป็น 1 แถว
                        if (
                            isVehicleRow(
                                item
                            )
                        ) {
                            return [
                                {
                                    ...item,
                                    export_license:
                                        item.vehicle_license ||
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
                                item.license_replace
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
                                    ...item,
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
                                ...item,
                                export_license:
                                    "",
                                export_qty:
                                    item.qty ?? 0,
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
        ]);

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

    // Export Excel
    const handleExport =
        () => {
            if (
                exportRows.length ===
                0
            ) {
                return;
            }

            const excelData =
                exportRows.map(
                    (item, index) => ({
                        "ลำดับ":
                            index + 1,

                        "วันที่สร้างคำขอ":
                            item.request_date ||
                                item.date ||
                                item.created_at
                                ? formatThaiDate(
                                    item.request_date ||
                                    item.date ||
                                    item.created_at
                                )
                                : "",

                        "ประเภทคำขอ":
                            item.fleet_type ||
                            "",

                        "สถานะปัจจุบัน":
                            formatCurrentProcess(item),

                        "เลขที่เอกสาร":
                            formatRunningDoc(item),

                        "ประเภทคลัง":
                            item.dc_type ||
                            "",

                        "ชื่อคลัง":
                            item.dc_code ||
                            "",

                        "ประเภทรถ":
                            item.fleet_truck_type ||
                            "",

                        "จำนวนรถที่ขอ (คัน) *":
                            item.export_qty ??
                            item.qty ??
                            "",

                        "รอรับ Workload":
                            formatNumberWithComma(
                                item.workload
                            ),

                        "จำนวน truckturn":
                            item.truckturn ??
                            "",

                        "ทะเบียนทดแทน1(ระบุทะเบียน)":
                            item.export_license ||
                            "",

                        "หมายเหตุที่แจ้งขอ":
                            item.remark ||
                            "",

                        "วันที่ใช้งาน":
                            item.usage_date
                                ? formatThaiDate(
                                    item.usage_date
                                )
                                : "",

                        "ผู้แจ้งขอ":
                            item.request_by ||
                            "",

                        "สถานะอนุมัติจาก GM":
                            getGmApprovalInfo(
                                item
                            ).statusText,

                        "วันที่ GM อนุมัติ":
                            getGmApprovalInfo(
                                item
                            ).changedAt
                                ? formatThaiDate(
                                    getGmApprovalInfo(
                                        item
                                    ).changedAt
                                )
                                : "",

                        "GM ที่อนุมัติ":
                            getGmApprovalInfo(
                                item
                            ).changedBy || "",
                    })
                );

            const worksheet =
                XLSX.utils.json_to_sheet(
                    excelData
                );

            worksheet["!cols"] = [
                { wch: 8 },  // ลำดับ
                { wch: 18 }, // วันที่สร้างคำขอ
                { wch: 22 }, // ประเภทคำขอ
                { wch: 32 }, // สถานะปัจจุบัน
                { wch: 30 }, // เลขที่เอกสาร
                { wch: 14 }, // ประเภทคลัง
                { wch: 18 }, // ชื่อคลัง
                { wch: 20 }, // ประเภทรถ
                { wch: 22 }, // จำนวนรถ
                { wch: 20 }, // Workload
                { wch: 18 }, // truckturn
                { wch: 40 }, // ทะเบียนทดแทน
                { wch: 40 }, // หมายเหตุ
                { wch: 18 }, // วันที่ใช้งาน
                { wch: 25 }, // ผู้แจ้งขอ
                { wch: 20 }, // GM Status
                { wch: 14 }, // GM Date
                { wch: 28 }, // GM ผู้อนุมัติ
            ];

            if (
                worksheet[
                "!ref"
                ]
            ) {
                worksheet[
                    "!autofilter"
                ] = {
                    ref:
                        worksheet[
                        "!ref"
                        ],
                };
            }

            const workbook =
                XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(
                workbook,
                worksheet,
                "รายการคำขอ"
            );

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

            XLSX.writeFile(
                workbook,
                `Truck_Request_${from}_to_${to}.xlsx`
            );
        };

    if (
        !open
    ) {
        return null;
    }



    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-5">
            <div className="flex max-h-[94vh] w-full max-w-[1250px] flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.40)]">

                <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 via-blue-50 to-slate-50 px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
                            <FileSpreadsheet
                                size={
                                    20
                                }
                            />
                        </div>

                        <div className="min-w-0">
                            <h2 className="text-base font-black text-slate-900">
                                Export
                                รายงานคำขอรถ
                            </h2>

                            <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-400">
                                {dcLabel ||
                                    "ข้อมูลคำขอทั้งหมดที่สามารถเข้าถึงได้"}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                    >
                        <X
                            size={
                                17
                            }
                        />
                    </button>
                </div>

                <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-4">
                    <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                        <div className="relative">
                            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-400">
                                วันที่สร้างคำขอ
                            </label>

                            <button
                                type="button"
                                onClick={() =>
                                    setShowDatePicker(
                                        (current) => !current
                                    )
                                }
                                className={`flex h-11 w-full items-center gap-3 rounded-xl border px-3 text-left text-xs font-bold shadow-sm outline-none transition ${
                                    showDatePicker
                                        ? "border-blue-500 bg-blue-50 text-blue-700 ring-4 ring-blue-100"
                                        : "border-slate-200 bg-white text-slate-700 hover:border-blue-300"
                                }`}
                            >
                                <CalendarDays
                                    size={15}
                                    className="shrink-0 text-blue-500"
                                />

                                <span className="min-w-0 flex-1 truncate">
                                    {startDate && endDate
                                        ? `${formatShortDate(startDate)} - ${formatShortDate(endDate)}`
                                        : "เลือกช่วงวันที่สร้างคำขอ"}
                                </span>

                                <CalendarRange
                                    size={15}
                                    className="shrink-0 text-slate-400"
                                />
                            </button>

                            {showDatePicker && (
                                <div className="absolute left-0 top-full z-[99999] mt-2 w-[680px] max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.28)] ring-1 ring-black/5">
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
                                            onClick={() =>
                                                setShowDatePicker(false)
                                            }
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
                                                const selection =
                                                    item.selection;

                                                const selectedStart =
                                                    selection.startDate ||
                                                    new Date();

                                                const selectedEnd =
                                                    selection.endDate ||
                                                    selectedStart;

                                                setCalendarRange([
                                                    {
                                                        startDate:
                                                            selectedStart,
                                                        endDate:
                                                            selectedEnd,
                                                        key:
                                                            "selection",
                                                    },
                                                ]);

                                                setStartDate(
                                                    formatDateToKey(
                                                        selectedStart
                                                    )
                                                );

                                                setEndDate(
                                                    formatDateToKey(
                                                        selectedEnd
                                                    )
                                                );
                                            }}
                                            showDateDisplay={false}
                                            showPreview={false}
                                            maxDate={new Date()}
                                            rangeColors={[
                                                "#2563eb",
                                            ]}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">
                                                ช่วงวันที่ที่เลือก
                                            </p>

                                            <p className="mt-0.5 text-[11px] font-black text-blue-700">
                                                {formatShortDate(startDate)} - {formatShortDate(endDate)}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowDatePicker(false)
                                            }
                                            className="rounded-xl bg-blue-600 px-4 py-2 text-[11px] font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                                        >
                                            ใช้ช่วงวันที่นี้
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-end">
                            <div className="flex h-11 min-w-[170px] items-center justify-center rounded-xl bg-slate-900 px-4 text-xs font-black text-white shadow-sm">
                                {exportRows.length.toLocaleString("en-US")} รายการ
                            </div>
                        </div>
                    </div>

                    {/* FILTER แยกข้อมูล */}
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                                    แยกข้อมูลตาม
                                </p>
                                <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                                    ประเภทคำขอ · สถานะปัจจุบัน · ประเภทคลัง · ชื่อคลัง · ประเภทรถ
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setFleetTypeFilter("all");
                                    setCurrentStatusFilter("all");
                                    setDcTypeFilter("all");
                                    setDcCodeFilter("all");
                                    setTruckTypeFilter("all");
                                }}
                                className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-500 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                            >
                                ล้างตัวกรอง
                            </button>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                            {/* ประเภทคำขอ */}
                            <div>
                                <label className="mb-1 block text-[10px] font-black text-slate-400">
                                    ประเภทคำขอ
                                </label>
                                <select
                                    value={fleetTypeFilter}
                                    onChange={(e) => setFleetTypeFilter(e.target.value)}
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                >
                                    <option value="all">ทั้งหมด</option>
                                    {fleetTypeOptions.map((value) => (
                                        <option key={value} value={value}>
                                            {value}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* สถานะปัจจุบัน */}
                            <div>
                                <label className="mb-1 block text-[10px] font-black text-slate-400">
                                    สถานะปัจจุบัน
                                </label>
                                <select
                                    value={currentStatusFilter}
                                    onChange={(e) => setCurrentStatusFilter(e.target.value)}
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                >
                                    <option value="all">ทั้งหมด</option>
                                    {currentStatusOptions.map((value) => (
                                        <option key={value} value={value}>
                                            {value}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* ประเภทคลัง */}
                            <div>
                                <label className="mb-1 block text-[10px] font-black text-slate-400">
                                    ประเภทคลัง
                                </label>
                                <select
                                    value={dcTypeFilter}
                                    onChange={(e) => {
                                        setDcTypeFilter(e.target.value);
                                        setDcCodeFilter("all");
                                    }}
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                >
                                    <option value="all">ทั้งหมด</option>
                                    {dcTypeOptions.map((value) => (
                                        <option key={value} value={value}>
                                            {value}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* ชื่อคลัง */}
                            <div>
                                <label className="mb-1 block text-[10px] font-black text-slate-400">
                                    ชื่อคลัง
                                </label>
                                <select
                                    value={dcCodeFilter}
                                    onChange={(e) => setDcCodeFilter(e.target.value)}
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                >
                                    <option value="all">ทั้งหมด</option>
                                    {dcCodeOptions.map((value) => (
                                        <option key={value} value={value}>
                                            {value}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* ประเภทรถ */}
                            <div>
                                <label className="mb-1 block text-[10px] font-black text-slate-400">
                                    ประเภทรถ
                                </label>
                                <select
                                    value={truckTypeFilter}
                                    onChange={(e) => setTruckTypeFilter(e.target.value)}
                                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                >
                                    <option value="all">ทั้งหมด</option>
                                    {truckTypeOptions.map((value) => (
                                        <option key={value} value={value}>
                                            {value}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                </div>

                <div className="min-h-0 flex-1 overflow-hidden bg-slate-50/60 p-4">
                    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
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
                            className="w-full shrink-0 overflow-auto overscroll-contain"
                            style={{
                                height: "min(42vh, 440px)",
                                scrollbarGutter: "stable both-edges",
                                WebkitOverflowScrolling: "touch",
                                touchAction: "pan-x pan-y",
                            }}
                        >
                            <table className="w-full min-w-[1850px] border-collapse text-left">
                                <thead className="sticky top-0 z-10 bg-blue-800 text-[10px] font-black text-white">
                                    <tr>
                                        <th className="px-3 py-3 text-center">
                                            ลำดับ
                                        </th>

                                        <th className="w-[82px] whitespace-nowrap px-2 py-3">
                                            วันที่ขอ
                                        </th>

                                        <th className="px-3 py-3">
                                            ประเภทคำขอ
                                        </th>

                                        <th className="px-3 py-3">
                                            สถานะปัจจุบัน
                                        </th>

                                        <th className="px-3 py-3">
                                            เลขที่เอกสาร
                                        </th>

                                        <th className="px-3 py-3">
                                            ประเภทคลัง
                                        </th>

                                        <th className="px-3 py-3">
                                            ชื่อคลัง
                                        </th>

                                        <th className="px-3 py-3">
                                            ประเภทรถ
                                        </th>

                                        <th className="px-3 py-3 text-center">
                                            จำนวนรถที่ขอ (คัน) *
                                        </th>

                                        <th className="px-3 py-3">
                                            รอรับ Workload
                                        </th>

                                        <th className="px-3 py-3">
                                            จำนวน truckturn
                                        </th>

                                        <th className="px-3 py-3">
                                            ทะเบียนทดแทน1(ระบุทะเบียน)
                                        </th>

                                        <th className="px-3 py-3">
                                            หมายเหตุที่แจ้งขอ
                                        </th>

                                        <th className="w-[82px] whitespace-nowrap px-2 py-3">
                                            วันที่ใช้
                                        </th>

                                        <th className="px-3 py-3">
                                            ผู้แจ้งขอ
                                        </th>

                                        <th className="px-3 py-3">
                                            สถานะอนุมัติจาก GM
                                        </th>

                                        <th className="w-[100px] whitespace-nowrap px-2 py-3">
                                            วันที่ GM
                                        </th>

                                        <th className="min-w-[190px] whitespace-nowrap px-3 py-3">
                                            GM ที่อนุมัติ
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {exportRows.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={18}
                                                className="py-20 text-center"
                                            >
                                                <FileSpreadsheet
                                                    size={36}
                                                    className="mx-auto text-slate-200"
                                                />

                                                <p className="mt-3 text-sm font-black text-slate-400">
                                                    ไม่พบข้อมูลในช่วงวันที่ที่เลือก
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        exportRows.map(
                                            (item, index) => (
                                                <tr
                                                    key={`${item.id ?? item.running_doc}-${item.vehicle_no ?? `license-${item.export_row_index ?? 0}`}`}
                                                    className="border-b border-slate-100 text-[11px] transition hover:bg-blue-50/50"
                                                >
                                                    <td className="px-3 py-2.5 text-center font-black text-slate-500">
                                                        {index + 1}
                                                    </td>

                                                    <td className="whitespace-nowrap px-2 py-2.5 text-[10px] font-bold text-slate-600">
                                                        {formatShortDate(
                                                            item.request_date ||
                                                            item.date ||
                                                            item.created_at
                                                        )}
                                                    </td>

                                                    <td className="whitespace-nowrap px-3 py-2.5 font-bold text-slate-700">
                                                        {item.fleet_type || "-"}
                                                    </td>

                                                    <td className="whitespace-nowrap px-3 py-2.5">
                                                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">
                                                            {formatCurrentProcess(
                                                                item
                                                            )}
                                                        </span>
                                                    </td>

                                                    <td className="whitespace-nowrap px-3 py-2.5 font-black text-blue-700">
                                                        {formatRunningDoc(item) || "-"}
                                                    </td>

                                                    <td className="whitespace-nowrap px-3 py-2.5 font-black text-blue-700">
                                                        {item.dc_type || "-"}
                                                    </td>

                                                    <td className="whitespace-nowrap px-3 py-2.5 font-black text-emerald-700">
                                                        {item.dc_code || "-"}
                                                    </td>

                                                    <td className="whitespace-nowrap px-3 py-2.5 font-bold text-slate-700">
                                                        {item.fleet_truck_type || "-"}
                                                    </td>

                                                    <td className="px-3 py-2.5 text-center font-black text-slate-700">
                                                        {item.export_qty ??
                                                            item.qty ??
                                                            "-"}
                                                    </td>

                                                    <td className="whitespace-nowrap px-3 py-2.5 font-bold text-slate-700">
                                                        {item.workload !== null &&
                                                        item.workload !== undefined &&
                                                        item.workload !== ""
                                                            ? formatNumberWithComma(
                                                                item.workload
                                                            )
                                                            : "-"}
                                                    </td>

                                                    <td className="whitespace-nowrap px-3 py-2.5 font-bold text-slate-700">
                                                        {item.truckturn ?? "-"}
                                                    </td>

                                                    <td className="max-w-[320px] px-3 py-2.5 font-bold text-slate-600">
                                                        {item.export_license ||
                                                            "-"}
                                                    </td>

                                                    <td className="max-w-[300px] px-3 py-2.5 font-medium text-slate-600">
                                                        {item.remark || "-"}
                                                    </td>

                                                    <td className="whitespace-nowrap px-2 py-2.5 text-[10px] font-bold text-slate-600">
                                                        {item.usage_date
                                                            ? formatShortDate(
                                                                item.usage_date
                                                            )
                                                            : "-"}
                                                    </td>

                                                    <td className="whitespace-nowrap px-3 py-2.5 font-bold text-slate-700">
                                                        {item.request_by || "-"}
                                                    </td>

                                                    <td className="whitespace-nowrap px-3 py-2.5 font-bold text-slate-700">
                                                        {loadingGmHistory &&
                                                        !getGmApprovalInfo(item).statusText
                                                            ? "กำลังโหลด..."
                                                            : getGmApprovalInfo(item).statusText ||
                                                            "-"}
                                                    </td>

                                                    <td className="whitespace-nowrap px-2 py-2.5 text-[10px] font-bold text-slate-600">
                                                        {getGmApprovalInfo(item).changedAt
                                                            ? formatThaiDate(
                                                                getGmApprovalInfo(item).changedAt
                                                            )
                                                            : "-"}
                                                    </td>

                                                    <td className="max-w-[230px] px-3 py-2.5 font-bold text-slate-700">
                                                        {getGmApprovalInfo(item).changedBy ||
                                                            "-"}
                                                    </td>
                                                </tr>
                                            )
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400">
                            ช่วงข้อมูลที่จะ
                            Export
                        </p>

                        <p className="mt-0.5 text-[11px] font-black text-slate-600">
                            {formatShortDate(
                                startDate
                            )}{" "}
                            -{" "}
                            {formatShortDate(
                                endDate
                            )}{" "}
                            ·{" "}
                            {exportRows.length.toLocaleString(
                                "en-US"
                            )}{" "}
                            รายการ ·{" "}
                            {totalQty.toLocaleString(
                                "en-US"
                            )}{" "}
                            คัน
                        </p>
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={
                                onClose
                            }
                            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 transition hover:bg-slate-50"
                        >
                            ยกเลิก
                        </button>

                        <button
                            type="button"
                            onClick={
                                handleExport
                            }
                            disabled={
                                exportRows.length ===
                                0
                            }
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 text-xs font-black text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
                        >
                            <Download
                                size={
                                    15
                                }
                            />

                            Export
                            Excel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
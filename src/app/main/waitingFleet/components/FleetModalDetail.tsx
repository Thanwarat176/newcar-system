"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import CheckDC from "../../component/CheckDC";

interface RequestDetailItem {
    id?: string | number;
    request_id?: string | number;
    license?: string;
    province?: string;
    truck_type?: string;
    company_id?: string;
    company_name?: string;
}

interface RequestItem {
    id: number | null;
    running_doc: string;
    dc_type: string;
    dc_code: string;
    date: string;
    request_date?: string;
    fleet_type: string;
    fleet_truck_type: string;
    license_replace: string[] | string;
    qty: number;
    usage_date: string;
    workload: number;
    truckturn: number;
    status: string;
    request_by: string;
    remark: string;

    approved_qty?: number | string | null;
    approved_suppliers?: ApprovedSupplierApiItem[] | string | null;
    approved_truck_type?: string | null;

    status_details?: string | null;
    reject_reason?: string | null;

    details?: RequestDetailItem[];
}

interface ApprovedSupplierApiItem {
    company_id?: string | number | null;
    company_name?: string | null;
    truck_type?: string | null;
    qty?: number | string | null;

    Company_ID?: string | number | null;
    Company_Name?: string | null;
    TRUCK_TYPE?: string | null;
}

interface SupplierItem {
    Name?: string;
    name?: string;
    [key: string]: any;
}

interface TruckItem {
    id?: string | number;

    DC_CODE?: string;
    dc_code?: string;

    TRUCK_TYPE?: string;
    truck_type?: string;
    truckType?: string;
    name?: string;
    Name?: string;

    [key: string]: any;
}

interface WorkloadItem {
    DC_TYPE?: string;
    dc_type?: string;
    DC_CODE?: string;
    dc_code?: string;
    DATE?: string;
    date?: string;
    WORKLOAD_FC?: number | string;
    workload_fc?: number | string;
    FORECAST_FC?: number | string;
    forecast_fc?: number | string;
    [key: string]: any;
}

interface FleetCheckItem {
    license_plate?: string;
    province?: string;
    dc_code?: string;
    DC_CODE?: string;
    truck_type?: string;
    TRUCK_TYPE?: string;
    fbp_code?: string;
    vendor_name?: string;
    status?: string;
    check_status?: string;
    latest_status?: string;
    check_date?: string;
    updated_at?: string;
    driver_names?: string;
    [key: string]: any;
}

interface GMModalDetailProps {
    open: boolean;
    onClose: () => void;
    data: RequestItem;
    allRequests: RequestItem[];
    onSuccess: () => void;
}

interface IssuePeriodItem {
    license_plate?: string;
    province?: string;
    dc_code?: string;
    fbp_code?: string;
    truck_type?: string;
    issue_type?: string;
    period_start?: string;
    period_end?: string;
    duration_days?: number | string;
    driver_names?: string;
    latest_remark?: string | null;
    expected_return_date?: string | null;
    register_year?: string;
    register_date?: string;
    vendor_name?: string;
    [key: string]: any;
}

interface ApprovedSupplierRow {
    rowId: string;
    companyId: string;
    companyName: string;
    truckType: string;
    qty: number;
}

interface FleetCheckStats {
    total: number;
    fleet_in: number;
    fleet_supplement: number;
    fleet_transferred_in: number;
    fleet_crossdock: number;
    fleet_transferred_out: number;
    fleet_backhaul: number;
}

type FbpDecision =
    | "approve"
    | "reject_by_fbp";

export default function GMModalDetail({
    open,
    onClose,
    data,
    allRequests,
    onSuccess,
}: GMModalDetailProps) {
    const [remark, setRemark] = useState("");
    const [saving, setSaving] = useState(false);
    const [decisionCompleted, setDecisionCompleted] = useState(false);
    const [message, setMessage] = useState<{
        type: "success" | "error";
        text: string;
    } | null>(null);

    const initialFleetCheckStats: FleetCheckStats = {
        total: 0,
        fleet_in: 0,
        fleet_supplement: 0,
        fleet_transferred_in: 0,
        fleet_crossdock: 0,
        fleet_transferred_out: 0,
        fleet_backhaul: 0,
    };

    const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
    const [approvedSuppliers, setApprovedSuppliers] = useState<ApprovedSupplierRow[]>([]);
    const [workloads, setWorkloads] = useState<WorkloadItem[]>([]);
    const [issuePeriods, setIssuePeriods] = useState<IssuePeriodItem[]>([]);
    const [loadingIssuePeriods, setLoadingIssuePeriods] = useState(false);
    const [selectedIssueTruckType, setSelectedIssueTruckType] = useState("");
    const [loadingSuppliers, setLoadingSuppliers] = useState(false);
    const [loadingWorkload, setLoadingWorkload] = useState(false);
    const [fleetChecks, setFleetChecks] = useState<FleetCheckItem[]>([]);
    const [loadingFleetChecks, setLoadingFleetChecks] = useState(false);
    const [fleetCheckStats, setFleetCheckStats] = useState<FleetCheckStats>(initialFleetCheckStats);
    const [fleetCheckError, setFleetCheckError] = useState("");
    const [trucks, setTrucks] = useState<TruckItem[]>([]);
    const [loadingTrucks, setLoadingTrucks] = useState(false);
    const [truckError, setTruckError] = useState("");
    const [selectedFleetCheckDc, setSelectedFleetCheckDc] = useState("");

    const [confirmDecision, setConfirmDecision] =
        useState<FbpDecision | null>(null);
    const [activeTab, setActiveTab] = useState<
        "summary" | "fleet" | "issue" | "workload"
    >("summary");

    useEffect(() => {
        if (!open) return;
        setActiveTab("summary");
    }, [open, data.id]);

    const requestedQty = Number(data.qty || 0);
    const truckTypeText = data.fleet_truck_type || "-";


    const getValueIgnoreCase = (item: any, keyName: string) => {
        if (!item) return "";

        const foundKey = Object.keys(item).find(
            (key) => key.trim().toUpperCase() === keyName.toUpperCase()
        );

        return foundKey ? item[foundKey] : "";
    };

    const normalizeText = (value: any) => {
        return String(value || "")
            .trim()
            .replace(/\s+/g, " ")
            .toUpperCase();
    };

    const [chartTooltip, setChartTooltip] = useState<{
        x: number;
        y: number;
        date: string;
        forecastValue: number;
        workloadValue: number;
    } | null>(null);

    const normalizeStatus = (status?: string) => {
        return String(status || "").trim().toLowerCase();
    };

    const isWaitingApproveStatus = (status?: string) => {
        const value = normalizeStatus(status);

        return (
            value === "pending" ||
            value === "รออนุมัติ" ||
            value === "waiting approve" ||
            value === "waiting approval" ||
            value === "pending approve" ||
            value === "pending approval" ||
            value === "รอประเมินกองรถ" ||
            value === "รอกองรถประเมิน" ||
            value === "wait fleet" ||
            value === "waiting fleet"
        );
    };

    const isInProgressStatus = (status?: string) => {
        const value = normalizeStatus(status);

        return (
            value === "confirm request" ||
            value === "กำลังดำเนินการ" ||
            value === "confirmed request" ||
            value === "confirm" ||
            value === "confirmed" ||
            value === "in progress" ||
            value === "processing"
        );
    };
    const getStatusClass = (status?: string) => {
        const value = normalizeStatus(status);

        if (value === "pending" || value === "รออนุมัติ") {
            return "border-yellow-200 bg-yellow-50 text-yellow-700";
        }

        if (value === "confirm request" || value === "กำลังดำเนินการ") {
            return "border-blue-200 bg-blue-50 text-blue-700";
        }

        if (value === "approved" || value === "อนุมัติ" || value === "สำเร็จ") {
            return "border-green-200 bg-green-50 text-green-700";
        }

        if (value === "rejected" || value === "ไม่อนุมัติ" || value === "ยกเลิก") {
            return "border-red-200 bg-red-50 text-red-700";
        }

        return "border-slate-200 bg-slate-50 text-slate-600";
    };

    const formatNumber = (value?: number | string | null) => {
        if (value === null || value === undefined || value === "") return "-";

        const numberValue = Number(value);

        if (Number.isNaN(numberValue)) return String(value);

        return numberValue.toLocaleString("en-US");
    };

    const normalizeDateKey = (value?: string) => {
        if (!value) return "";

        const raw = String(value).trim();

        if (!raw) return "";

        const dateOnly = raw.includes("T") ? raw.split("T")[0] : raw.split(" ")[0];

        if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
            return dateOnly;
        }

        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateOnly)) {
            const [day, month, year] = dateOnly.split("/");
            return `${year}-${month}-${day}`;
        }

        if (/^\d{2}-\d{2}-\d{4}$/.test(dateOnly)) {
            const [day, month, year] = dateOnly.split("-");
            return `${year}-${month}-${day}`;
        }

        const parsedDate = new Date(raw);

        if (!Number.isNaN(parsedDate.getTime())) {
            const year = parsedDate.getFullYear();
            const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
            const day = String(parsedDate.getDate()).padStart(2, "0");

            return `${year}-${month}-${day}`;
        }

        return dateOnly;
    };

    const formatThaiDate = (value?: string) => {
        if (!value) return "-";

        const dateKey = normalizeDateKey(value);

        if (!dateKey) return "-";

        const [year, month, day] = dateKey.split("-");

        if (!year || !month || !day) return value;

        return `${day}/${month}/${year}`;
    };

    const formatThaiMonthYear = (monthKey?: string) => {
        if (!monthKey) return "-";

        const [yearText, monthText] = monthKey.split("-");
        const year = Number(yearText);
        const month = Number(monthText);

        if (!year || !month) return monthKey;

        const thaiMonths = [
            "มกราคม",
            "กุมภาพันธ์",
            "มีนาคม",
            "เมษายน",
            "พฤษภาคม",
            "มิถุนายน",
            "กรกฎาคม",
            "สิงหาคม",
            "กันยายน",
            "ตุลาคม",
            "พฤศจิกายน",
            "ธันวาคม",
        ];

        return `${thaiMonths[month - 1]} ${year + 543}`;
    };

    const getTodayKey = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    };

    const todayKey = getTodayKey();
    const currentMonthKey = todayKey.slice(0, 7);

    const [selectedWorkloadMonth, setSelectedWorkloadMonth] = useState("");
    const [workloadViewMode, setWorkloadViewMode] = useState<"table" | "chart">(
        "table"
    );

    const activeWorkloadMonth = selectedWorkloadMonth || currentMonthKey;

    useEffect(() => {
        if (!open) return;

        setSelectedWorkloadMonth(currentMonthKey);
    }, [open, currentMonthKey]);

    useEffect(() => {
        if (!open) return;

        setSelectedFleetCheckDc(data.dc_code || "");
    }, [open, data.dc_code]);

    const getLicenseText = (licenseReplace: string[] | string) => {
        if (Array.isArray(licenseReplace)) {
            return licenseReplace.length > 0 ? licenseReplace.join(", ") : "-";
        }

        if (typeof licenseReplace === "string") {
            try {
                const parsed = JSON.parse(licenseReplace);

                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed.join(", ");
                }

                return licenseReplace || "-";
            } catch {
                return licenseReplace || "-";
            }
        }

        return "-";
    };

    const getWorkloadFc = (item: any) => {
        return Number(
            getValueIgnoreCase(item, "WORKLOAD_FC") ||
            getValueIgnoreCase(item, "workload_fc") ||
            0
        );
    };

    const getForecastFc = (item: any) => {
        return Number(
            getValueIgnoreCase(item, "FORECAST_FC") ||
            getValueIgnoreCase(item, "forecast_fc") ||
            0
        );
    };

    useEffect(() => {
        if (!open) return;

        const initialQty = Number(data.qty || 0);

        setRemark("");
        setMessage(null);
        setConfirmDecision(null);
        setDecisionCompleted(false);
        const savedSupplierRows =
            parseApprovedSuppliers(
                data.approved_suppliers
            );

        if (savedSupplierRows.length > 0) {
            setApprovedSuppliers(
                savedSupplierRows.map(
                    (supplier, index) => ({
                        rowId:
                            typeof crypto !==
                                "undefined" &&
                                typeof crypto.randomUUID ===
                                "function"
                                ? crypto.randomUUID()
                                : `${Date.now()}-${index}`,

                        companyId: String(
                            supplier.company_id ??
                            supplier.Company_ID ??
                            ""
                        ).trim(),

                        companyName: String(
                            supplier.company_name ??
                            supplier.Company_Name ??
                            ""
                        ).trim(),

                        truckType: String(
                            supplier.truck_type ??
                            supplier.TRUCK_TYPE ??
                            data.approved_truck_type ??
                            data.fleet_truck_type ??
                            ""
                        ).trim(),

                        qty: Number(
                            supplier.qty || 0
                        ),
                    })
                )
            );
        } else {
            setApprovedSuppliers([
                {
                    rowId:
                        typeof crypto !==
                            "undefined" &&
                            typeof crypto.randomUUID ===
                            "function"
                            ? crypto.randomUUID()
                            : `${Date.now()}-${Math.random()}`,

                    companyId: "",
                    companyName: "",
                    truckType:
                        data.fleet_truck_type || "",
                    qty:
                        initialQty > 0
                            ? initialQty
                            : 1,
                },
            ]);
        }
    }, [open, data.id, data.qty, data.fleet_truck_type]);

    useEffect(() => {
        if (!open) return;

        const fetchSuppliers = async () => {
            try {
                setLoadingSuppliers(true);

                const res = await fetch(
                    "http://192.168.158.210/api_new_truck/api/suppliers.php",
                    {
                        method: "GET",
                        headers: { "Content-Type": "application/json" },
                        cache: "no-store",
                    }
                );

                if (!res.ok) throw new Error("โหลดข้อมูล FBP ไม่สำเร็จ");

                const result = await res.json();

                const list = Array.isArray(result)
                    ? result
                    : Array.isArray(result.data)
                        ? result.data
                        : Array.isArray(result.result)
                            ? result.result
                            : [];

                setSuppliers(list);
            } catch (err) {
                console.error("FETCH SUPPLIERS ERROR:", err);
            } finally {
                setLoadingSuppliers(false);
            }
        };

        const fetchWorkload = async () => {
            try {
                setLoadingWorkload(true);

                const res = await fetch(
                    "http://192.168.144.22/CENTRAL/Daily_Operaion_codeing/pages/chart/api_workload.php",
                    {
                        method: "GET",
                        headers: { "Content-Type": "application/json" },
                        cache: "no-store",
                    }
                );

                if (!res.ok) throw new Error("โหลดข้อมูล Workload ไม่สำเร็จ");

                const result = await res.json();

                const list = Array.isArray(result)
                    ? result
                    : Array.isArray(result.Daily)
                        ? result.Daily
                        : Array.isArray(result.daily)
                            ? result.daily
                            : Array.isArray(result.data)
                                ? result.data
                                : Array.isArray(result.result)
                                    ? result.result
                                    : [];

                console.log("========== WORKLOAD API ==========");
                console.log("RAW:", result);
                console.log("DAILY:", result?.Daily);
                console.log("COUNT:", list.length);
                console.log("FIRST ITEM:", list[0]);
                console.log("CURRENT DC_CODE:", data.dc_code);
                console.log("TODAY:", todayKey);
                console.log("CURRENT MONTH:", currentMonthKey);
                console.log("==================================");

                setWorkloads(list);
            } catch (err) {
                console.error("FETCH WORKLOAD ERROR:", err);
            } finally {
                setLoadingWorkload(false);
            }
        };

        fetchSuppliers();
        fetchWorkload();
    }, [open, data.dc_code, todayKey, currentMonthKey]);

    const fetchFleetCheckStats = useCallback(
        async (dcCode: string) => {
            const normalizedDcCode = String(dcCode || "").trim();

            if (!normalizedDcCode) {
                setFleetCheckStats(initialFleetCheckStats);
                setFleetCheckError("ไม่พบรหัส DC");
                return;
            }

            try {
                setLoadingFleetChecks(true);
                setFleetCheckError("");

                const url =
                    `https://lite.cpall.co.th/Logistic/daily-fleet-management-v2/api/get_fleet_check_all.php` +
                    `?dc=${encodeURIComponent(normalizedDcCode)}`;

                console.log("FLEET CHECK URL:", url);

                const response = await fetch(url, {
                    method: "GET",
                    cache: "no-store",
                });

                const responseText = await response.text();

                let result: any = null;

                try {
                    result = responseText
                        ? JSON.parse(responseText)
                        : null;
                } catch {
                    throw new Error(
                        `Fleet Check API ไม่ได้ส่ง JSON กลับมา: ${responseText}`
                    );
                }

                console.log("FLEET CHECK RESPONSE:", result);

                if (!response.ok) {
                    throw new Error(
                        result?.message ||
                        `Fleet Check API Error ${response.status}`
                    );
                }

                if (!result?.success || !result?.stats) {
                    throw new Error(
                        result?.message ||
                        "ไม่พบข้อมูลสรุปสถานะรถ"
                    );
                }

                const stats = result.stats;

                setFleetCheckStats({
                    total: Number(stats.total || 0),
                    fleet_in: Number(stats.fleet_in || 0),
                    fleet_supplement: Number(
                        stats.fleet_supplement || 0
                    ),
                    fleet_transferred_in: Number(
                        stats.fleet_transferred_in || 0
                    ),
                    fleet_crossdock: Number(
                        stats.fleet_crossdock || 0
                    ),
                    fleet_transferred_out: Number(
                        stats.fleet_transferred_out || 0
                    ),
                    fleet_backhaul: Number(
                        stats.fleet_backhaul || 0
                    ),
                });
            } catch (error: any) {
                console.error("FETCH FLEET CHECK ERROR:", error);

                setFleetCheckStats(initialFleetCheckStats);

                setFleetCheckError(
                    error?.message ||
                    "ไม่สามารถโหลดข้อมูลสถานะรถได้"
                );
            } finally {
                setLoadingFleetChecks(false);
            }
        },
        []
    );

    useEffect(() => {
        if (!open) return;

        setSelectedFleetCheckDc(
            String(data.dc_code || "").trim()
        );
    }, [open, data.dc_code]);

    useEffect(() => {
        if (!open || activeTab !== "fleet") return;

        const dcCode =
            selectedFleetCheckDc ||
            String(data.dc_code || "").trim();

        void fetchFleetCheckStats(dcCode);
    }, [
        open,
        activeTab,
        selectedFleetCheckDc,
        data.dc_code,
        fetchFleetCheckStats,
    ]);

    const supplierOptions = useMemo(() => {
        const set = new Set<string>();

        suppliers.forEach((item) => {
            const name = String(
                getValueIgnoreCase(item, "Name") ||
                getValueIgnoreCase(item, "name") ||
                ""
            ).trim();

            if (name) {
                set.add(name);
            }
        });

        return Array.from(set).sort();
    }, [suppliers]);

    const workloadRowsByCurrentDc = useMemo(() => {
        const currentDcCode = normalizeText(data.dc_code);

        const allApiDcCodes = Array.from(
            new Set(
                workloads
                    .map((item) => {
                        return (
                            getValueIgnoreCase(item, "DC_CODE") ||
                            getValueIgnoreCase(item, "dc_code") ||
                            ""
                        );
                    })
                    .map((dc) => String(dc).trim())
                    .filter(Boolean)
            )
        ).sort();

        const matchedRows = workloads.filter((item) => {
            const workloadDcCode =
                normalizeText(getValueIgnoreCase(item, "DC_CODE")) ||
                normalizeText(getValueIgnoreCase(item, "dc_code"));

            return workloadDcCode === currentDcCode;
        });

        const matchedDcCodes = Array.from(
            new Set(
                matchedRows
                    .map((item) => {
                        return (
                            getValueIgnoreCase(item, "DC_CODE") ||
                            getValueIgnoreCase(item, "dc_code") ||
                            ""
                        );
                    })
                    .map((dc) => String(dc).trim())
                    .filter(Boolean)
            )
        );

        console.log("========== CHECK DC_CODE MATCH ==========");
        console.log("DC_CODE จากรายการที่กด:", data.dc_code);
        console.log("DC_CODE หลัง normalize:", currentDcCode);
        console.log("จำนวนข้อมูล workload ทั้งหมด:", workloads.length);
        console.log("DC_CODE ทั้งหมดใน API workload:", allApiDcCodes);
        console.log("DC_CODE ที่ตรงกัน:", matchedDcCodes);
        console.log("จำนวนแถวที่ DC_CODE ตรงกัน:", matchedRows.length);
        console.log("ข้อมูลแถวที่ตรงกัน:", matchedRows);
        console.log("=========================================");

        return matchedRows;
    }, [workloads, data.dc_code]);

    const todayWorkloadRow = useMemo(() => {
        const matched = workloadRowsByCurrentDc.find((item) => {
            const apiDate = normalizeDateKey(
                String(
                    getValueIgnoreCase(item, "DATE") ||
                    getValueIgnoreCase(item, "date") ||
                    ""
                )
            );

            return apiDate === todayKey;
        });

        console.log("========== TODAY WORKLOAD ==========");
        console.log("TODAY:", todayKey);
        console.log("MATCHED TODAY:", matched);
        console.log("===================================");

        return matched || null;
    }, [workloadRowsByCurrentDc, todayKey]);

    const workloadMonthOptions = useMemo(() => {
        const monthSet = new Set<string>();

        workloadRowsByCurrentDc.forEach((item) => {
            const apiDate = normalizeDateKey(
                String(
                    getValueIgnoreCase(item, "DATE") ||
                    getValueIgnoreCase(item, "date") ||
                    ""
                )
            );

            if (!apiDate) return;

            const monthKey = apiDate.slice(0, 7);

            // ไม่แสดงเดือนถัดไปจากเดือนปัจจุบัน
            if (monthKey > currentMonthKey) return;

            monthSet.add(monthKey);
        });

        return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
    }, [workloadRowsByCurrentDc, currentMonthKey]);

    const monthlyWorkloadRows = useMemo(() => {
        const rows = workloadRowsByCurrentDc
            .filter((item) => {
                const apiDate = normalizeDateKey(
                    String(
                        getValueIgnoreCase(item, "DATE") ||
                        getValueIgnoreCase(item, "date") ||
                        ""
                    )
                );

                return apiDate.startsWith(activeWorkloadMonth);
            })
            .sort((a, b) => {
                const dateA = normalizeDateKey(
                    String(
                        getValueIgnoreCase(a, "DATE") ||
                        getValueIgnoreCase(a, "date") ||
                        ""
                    )
                );

                const dateB = normalizeDateKey(
                    String(
                        getValueIgnoreCase(b, "DATE") ||
                        getValueIgnoreCase(b, "date") ||
                        ""
                    )
                );

                return new Date(dateA).getTime() - new Date(dateB).getTime();
            });

        return rows;
    }, [workloadRowsByCurrentDc, activeWorkloadMonth]);

    const todayWorkloadFc = useMemo(() => {
        if (!todayWorkloadRow) return 0;

        return getWorkloadFc(todayWorkloadRow);
    }, [todayWorkloadRow]);

    const monthlyWorkloadFcTotal = useMemo(() => {
        return monthlyWorkloadRows.reduce((sum, item) => {
            return sum + getWorkloadFc(item);
        }, 0);
    }, [monthlyWorkloadRows]);

    const monthlyWorkloadFcAverage = useMemo(() => {
        if (monthlyWorkloadRows.length === 0) return 0;

        return Math.round(monthlyWorkloadFcTotal / monthlyWorkloadRows.length);
    }, [monthlyWorkloadFcTotal, monthlyWorkloadRows.length]);

    const maxMonthlyWorkloadFc = useMemo(() => {
        if (monthlyWorkloadRows.length === 0) return 0;

        return Math.max(
            ...monthlyWorkloadRows.map((item) => getWorkloadFc(item))
        );
    }, [monthlyWorkloadRows]);

    const sameDcRequests = useMemo(() => {
        return allRequests.filter(
            (item) => normalizeText(item.dc_code) === normalizeText(data.dc_code)
        );
    }, [allRequests, data.dc_code]);

    const dcSummary = useMemo(() => {
        const totalQty = sameDcRequests.reduce((sum, item) => {
            return sum + Number(item.qty || 0);
        }, 0);

        const waitingCount = sameDcRequests.filter((item) =>
            isWaitingApproveStatus(item.status)
        ).length;

        const progressCount = sameDcRequests.filter((item) =>
            isInProgressStatus(item.status)
        ).length;

        return {
            totalRequest: sameDcRequests.length,
            totalQty,
            waitingCount,
            progressCount,
        };
    }, [sameDcRequests]);

    useEffect(() => {
        if (!open) return;

        setSelectedIssueTruckType(data.fleet_truck_type || "");
    }, [open, data.fleet_truck_type]);

    const getIssueDcCode = (item: any) => {
        return String(
            getValueIgnoreCase(item, "dc_code") ||
            getValueIgnoreCase(item, "DC_CODE") ||
            ""
        ).trim();
    };

    const getIssueTruckType = (item: any) => {
        return String(
            getValueIgnoreCase(item, "truck_type") ||
            getValueIgnoreCase(item, "TRUCK_TYPE") ||
            ""
        ).trim();
    };

    const currentIssueDcCode = data.dc_code || "";
    const currentIssueTruckType = data.fleet_truck_type || "";

    const activeIssueTruckType =
        selectedIssueTruckType || currentIssueTruckType;

    const issueRowsByCurrentDc = useMemo(() => {
        const currentDc = normalizeText(currentIssueDcCode);

        if (!currentDc) return [];

        return issuePeriods.filter((item) => {
            const itemDc = normalizeText(getIssueDcCode(item));

            return itemDc === currentDc;
        });
    }, [issuePeriods, currentIssueDcCode]);

    const issueTruckTypeOptions = useMemo(() => {
        const set = new Set<string>();

        issueRowsByCurrentDc.forEach((item) => {
            const truckType = getIssueTruckType(item);

            if (truckType) {
                set.add(truckType);
            }
        });

        if (currentIssueTruckType) {
            set.add(currentIssueTruckType);
        }

        return Array.from(set).sort();
    }, [issueRowsByCurrentDc, currentIssueTruckType]);

    useEffect(() => {
        if (!open) return;

        const fetchFleetChecks = async () => {
            try {
                setLoadingFleetChecks(true);

                const res = await fetch(
                    "https://lite.cpall.co.th/Logistic/daily-fleet-management-v2/api/get_fleet_check_all.php",
                    {
                        method: "GET",
                        headers: { "Content-Type": "application/json" },
                        cache: "no-store",
                    }
                );

                if (!res.ok) throw new Error("โหลดข้อมูล Fleet Check ไม่สำเร็จ");

                const result = await res.json();

                const list = Array.isArray(result)
                    ? result
                    : Array.isArray(result.data)
                        ? result.data
                        : Array.isArray(result.result)
                            ? result.result
                            : Array.isArray(result.Data)
                                ? result.Data
                                : [];

                console.log("========== FLEET CHECK API ==========");
                console.log("RAW:", result);
                console.log("COUNT:", list.length);
                console.log("FIRST ITEM:", list[0]);
                console.log("CURRENT DC_CODE:", data.dc_code);
                console.log("CURRENT TRUCK TYPE:", data.fleet_truck_type);
                console.log("=====================================");

                setFleetChecks(list);
            } catch (err) {
                console.error("FETCH FLEET CHECK ERROR:", err);
                setFleetChecks([]);
            } finally {
                setLoadingFleetChecks(false);
            }
        };

        fetchFleetChecks();
    }, [open, data.dc_code, data.fleet_truck_type]);

    useEffect(() => {
        if (!open) return;

        setSelectedIssueTruckType(currentIssueTruckType);
    }, [open, currentIssueTruckType]);

    const issueRowsBySelectedTruckType = useMemo(() => {
        const currentDc = normalizeText(currentIssueDcCode);
        const currentTruckType = normalizeText(activeIssueTruckType);

        if (!currentDc || !currentTruckType) return [];

        const rows = issuePeriods
            .filter((item) => {
                const itemDc = normalizeText(getIssueDcCode(item));
                const itemTruckType = normalizeText(getIssueTruckType(item));

                return itemDc === currentDc && itemTruckType === currentTruckType;
            })
            .sort((a, b) => {
                const dateA = normalizeDateKey(a.period_start || "");
                const dateB = normalizeDateKey(b.period_start || "");

                return new Date(dateB).getTime() - new Date(dateA).getTime();
            });

        console.log("========== DFM ISSUE FILTER ==========");
        console.log("data.dc_code:", currentIssueDcCode);
        console.log("data.fleet_truck_type:", currentIssueTruckType);
        console.log("activeIssueTruckType:", activeIssueTruckType);
        console.log("issuePeriods all:", issuePeriods.length);
        console.log("match dc only:", issueRowsByCurrentDc.length);
        console.log("match dc + truck_type:", rows.length);
        console.log("rows:", rows);
        console.log("=====================================");

        return rows;
    }, [
        issuePeriods,
        currentIssueDcCode,
        currentIssueTruckType,
        activeIssueTruckType,
        issueRowsByCurrentDc.length,
    ]);

    const formatTruckTypeLabel = (truckType?: string) => {
        const value = String(truckType || "").trim().toUpperCase();

        if (value === "4W" || value === "4WJ") return `${truckType} (รถ 4 ล้อ)`;
        if (value === "6W" || value === "6WJ") return `${truckType} (รถ 6 ล้อ)`;
        if (value === "10W") return `${truckType} (รถ 10 ล้อ)`;
        if (value === "22W") return `${truckType} (รถพ่วง)`;

        return truckType || "-";
    };

    useEffect(() => {
        if (!open) return;

        const dcCode = String(data.dc_code || "").trim();

        if (!dcCode) {
            setTrucks([]);
            setTruckError("ไม่พบรหัส DC");
            return;
        }

        const controller = new AbortController();

        const fetchTrucks = async () => {
            try {
                setLoadingTrucks(true);
                setTruckError("");
                setTrucks([]);

                const url =
                    "http://192.168.158.210/api_new_truck/api/trucks.php" +
                    `?DC_CODE=${encodeURIComponent(dcCode)}`;

                const res = await fetch(url, {
                    method: "GET",
                    headers: {
                        Accept: "application/json",
                    },
                    cache: "no-store",
                    signal: controller.signal,
                });

                if (!res.ok) {
                    throw new Error(`โหลดข้อมูลรถไม่สำเร็จ (${res.status})`);
                }

                const result = await res.json();

                const list: TruckItem[] = Array.isArray(result)
                    ? result
                    : Array.isArray(result?.data)
                        ? result.data
                        : Array.isArray(result?.result)
                            ? result.result
                            : [];

                const normalizedDcCode = normalizeText(dcCode);

                /*
                 * กรองเฉพาะข้อมูลของ DC ปัจจุบัน
                 * หาก API กรองให้แล้วและไม่ได้ส่ง DC_CODE กลับมา
                 * จะยังเก็บรายการนั้นไว้
                 */
                const matchedRows = list.filter((item) => {
                    const itemDcCode = String(
                        getValueIgnoreCase(item, "DC_CODE") ||
                        getValueIgnoreCase(item, "dc_code") ||
                        "",
                    ).trim();

                    return (
                        !itemDcCode ||
                        normalizeText(itemDcCode) === normalizedDcCode
                    );
                });

                /*
                 * ตัด TRUCK_TYPE ที่ซ้ำกัน
                 * เช่น 6W, 6w และ " 6W " จะถือว่าเป็นค่าเดียวกัน
                 */
                const uniqueTruckTypeMap = new Map<string, TruckItem>();

                matchedRows.forEach((item) => {
                    const truckType = String(
                        getValueIgnoreCase(item, "TRUCK_TYPE") ||
                        getValueIgnoreCase(item, "truck_type") ||
                        getValueIgnoreCase(item, "truckType") ||
                        getValueIgnoreCase(item, "name") ||
                        getValueIgnoreCase(item, "Name") ||
                        "",
                    ).trim();

                    const truckTypeKey = normalizeText(truckType);

                    if (truckType && !uniqueTruckTypeMap.has(truckTypeKey)) {
                        uniqueTruckTypeMap.set(truckTypeKey, {
                            ...item,
                            truck_type: truckType,
                        });
                    }
                });

                const uniqueRows = Array.from(uniqueTruckTypeMap.values());

                setTrucks(uniqueRows);

                // ล้างประเภทรถเดิม หากไม่มีอยู่ในตัวเลือกของ DC นี้
                setApprovedSuppliers((current) =>
                    current.map((row) => {
                        const typeExists = uniqueRows.some(
                            (truck) =>
                                normalizeText(
                                    String(
                                        getValueIgnoreCase(truck, "TRUCK_TYPE") ||
                                        getValueIgnoreCase(truck, "truck_type") ||
                                        "",
                                    ),
                                ) === normalizeText(row.truckType),
                        );

                        return typeExists
                            ? row
                            : {
                                ...row,
                                truckType: "",
                            };
                    }),
                );

                console.log("TRUCK DC_CODE:", dcCode);
                console.log("TRUCK ROWS:", matchedRows);
                console.log("UNIQUE TRUCK TYPES:", uniqueRows);
            } catch (error: unknown) {
                if (
                    error instanceof DOMException &&
                    error.name === "AbortError"
                ) {
                    return;
                }

                console.error("FETCH TRUCKS ERROR:", error);
                setTrucks([]);

                setTruckError(
                    error instanceof Error
                        ? error.message
                        : "เกิดข้อผิดพลาดในการโหลดประเภทรถ",
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoadingTrucks(false);
                }
            }
        };

        void fetchTrucks();

        return () => {
            controller.abort();
        };
    }, [open, data.dc_code]);

    const getTruckTypeValue = (item: TruckItem) => {
        return String(
            getValueIgnoreCase(item, "truck_type") ||
            getValueIgnoreCase(item, "TRUCK_TYPE") ||
            getValueIgnoreCase(item, "truckType") ||
            getValueIgnoreCase(item, "name") ||
            getValueIgnoreCase(item, "Name") ||
            ""
        ).trim();
    };

    const truckTypeOptions = useMemo(() => {
        const uniqueTypes = new Map<string, string>();

        trucks.forEach((item) => {
            const truckType = String(
                getValueIgnoreCase(item, "TRUCK_TYPE") ||
                getValueIgnoreCase(item, "truck_type") ||
                getValueIgnoreCase(item, "truckType") ||
                getValueIgnoreCase(item, "name") ||
                getValueIgnoreCase(item, "Name") ||
                "",
            ).trim();

            const key = normalizeText(truckType);

            if (truckType && !uniqueTypes.has(key)) {
                uniqueTypes.set(key, truckType);
            }
        });

        return Array.from(uniqueTypes.values()).sort((a, b) =>
            a.localeCompare(b, "en", {
                numeric: true,
                sensitivity: "base",
            }),
        );
    }, [trucks]);

    const issueTruckTypeSummary = useMemo(() => {
        const map = new Map<
            string,
            {
                truckType: string;
                count: number;
                items: IssuePeriodItem[];
            }
        >();

        issueRowsBySelectedTruckType.forEach((item) => {
            const truckType = getIssueTruckType(item) || "-";

            const old = map.get(truckType);

            if (old) {
                old.count += 1;
                old.items.push(item);
            } else {
                map.set(truckType, {
                    truckType,
                    count: 1,
                    items: [item],
                });
            }
        });

        return Array.from(map.values()).sort((a, b) => b.count - a.count);
    }, [issueRowsBySelectedTruckType]);

    const issueTruckTypeTotal = useMemo(() => {
        return issueTruckTypeSummary.reduce((sum, item) => {
            return sum + item.count;
        }, 0);
    }, [issueTruckTypeSummary]);

    const getFleetCheckDcCode = (item: any) => {
        return String(
            getValueIgnoreCase(item, "dc_code") ||
            getValueIgnoreCase(item, "DC_CODE") ||
            getValueIgnoreCase(item, "dc") ||
            getValueIgnoreCase(item, "DC") ||
            ""
        ).trim();
    };

    const getFleetCheckType = (item: any) => {
        return String(
            getValueIgnoreCase(item, "fleet_type") ||
            getValueIgnoreCase(item, "FLEET_TYPE") ||
            getValueIgnoreCase(item, "type") ||
            getValueIgnoreCase(item, "TYPE") ||
            "-"
        ).trim();
    };

    const getFleetCheckLicense = (item: any) => {
        return String(
            getValueIgnoreCase(item, "license_plate") ||
            getValueIgnoreCase(item, "LICENSE_PLATE") ||
            getValueIgnoreCase(item, "truck_license") ||
            getValueIgnoreCase(item, "TRUCK_LICENSE") ||
            getValueIgnoreCase(item, "plate_no") ||
            getValueIgnoreCase(item, "PLATE_NO") ||
            "-"
        ).trim();
    };

    const getFleetCheckProvince = (item: any) => {
        return String(
            getValueIgnoreCase(item, "province") ||
            getValueIgnoreCase(item, "PROVINCE") ||
            "-"
        ).trim();
    };

    const getFleetCheckStatus = (item: any) => {
        return String(
            getValueIgnoreCase(item, "status") ||
            getValueIgnoreCase(item, "check_status") ||
            getValueIgnoreCase(item, "latest_status") ||
            getValueIgnoreCase(item, "STATUS") ||
            "-"
        ).trim();
    };

    const getFleetCheckVendor = (item: any) => {
        return String(
            getValueIgnoreCase(item, "vendor_name") ||
            getValueIgnoreCase(item, "VENDOR_NAME") ||
            getValueIgnoreCase(item, "fbp_code") ||
            getValueIgnoreCase(item, "FBP_CODE") ||
            "-"
        ).trim();
    };

    const getFleetCheckDate = (item: any) => {
        return String(
            getValueIgnoreCase(item, "check_date") ||
            getValueIgnoreCase(item, "CHECK_DATE") ||
            getValueIgnoreCase(item, "updated_at") ||
            getValueIgnoreCase(item, "UPDATED_AT") ||
            ""
        ).trim();
    };

    const getFleetCheckTruckType = (item: any) => {
        return String(
            getValueIgnoreCase(item, "truck_type") ||
            getValueIgnoreCase(item, "TRUCK_TYPE") ||
            getValueIgnoreCase(item, "fleet_truck_type") ||
            getValueIgnoreCase(item, "FLEET_TRUCK_TYPE") ||
            "-"
        ).trim();
    };

    const fleetCheckDcOptions = useMemo(() => {
        const dcSet = new Set<string>();

        allRequests.forEach((item) => {
            const dcCode = String(item.dc_code || "").trim();

            if (dcCode) {
                dcSet.add(dcCode);
            }
        });

        const currentDc = String(data.dc_code || "").trim();

        if (currentDc) {
            dcSet.add(currentDc);
        }

        return Array.from(dcSet).sort();
    }, [allRequests, data.dc_code]);

    const getCurrentUserText = () => {
        try {
            const rawUser =
                localStorage.getItem("userInfo") ||
                localStorage.getItem("user") ||
                localStorage.getItem("authUser");

            if (!rawUser) return "";

            const user = JSON.parse(rawUser);

            const name = String(user.name || user.NAME || "").trim();
            const surname = String(user.surname || user.SURNAME || "").trim();
            const emId = String(
                user.em_id ||
                user.employee_id ||
                user.EMPLOYEE_ID ||
                user.id ||
                ""
            ).trim();

            const fullName = `${name} ${surname}`.trim();

            if (fullName && emId) return `${fullName} (${emId})`;
            if (fullName) return fullName;
            if (emId) return emId;

            return "";
        } catch {
            return "";
        }
    };

    const getSupplierCompanyId = (item: any) => {
        return String(
            getValueIgnoreCase(item, "company_id") ||
            getValueIgnoreCase(item, "Company_ID") ||
            getValueIgnoreCase(item, "COMPANY_ID") ||
            getValueIgnoreCase(item, "supplier_id") ||
            getValueIgnoreCase(item, "Supplier_ID") ||
            getValueIgnoreCase(item, "SUPPLIER_ID") ||
            ""
        ).trim();
    };

    const getSupplierCompanyName = (item: any) => {
        return String(
            getValueIgnoreCase(item, "company_name") ||
            getValueIgnoreCase(item, "Company_Name") ||
            getValueIgnoreCase(item, "COMPANY_NAME") ||
            getValueIgnoreCase(item, "Name") ||
            getValueIgnoreCase(item, "name") ||
            ""
        ).trim();
    };
    const createSupplierRow = (defaultQty = 1): ApprovedSupplierRow => ({
        rowId:
            typeof crypto !== "undefined" &&
                typeof crypto.randomUUID === "function"
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random()}`,
        companyId: "",
        companyName: "",
        truckType: data.fleet_truck_type || "",
        qty: defaultQty,
    });

    const addApprovedSupplier = () => {
        setApprovedSuppliers((current) => [
            ...current,
            createSupplierRow(1),
        ]);

        setMessage(null);
    };

    const removeApprovedSupplier = (
        rowId: string
    ) => {
        setApprovedSuppliers((current) => {
            if (current.length <= 1) {
                return current;
            }

            return current.filter(
                (item) => item.rowId !== rowId
            );
        });

        setMessage(null);
    };

    const updateApprovedSupplier = <
        K extends keyof Omit<
            ApprovedSupplierRow,
            "rowId"
        >
    >(
        rowId: string,
        field: K,
        value: ApprovedSupplierRow[K]
    ) => {
        setApprovedSuppliers((current) =>
            current.map((item) => {
                if (item.rowId !== rowId) {
                    return item;
                }

                return {
                    ...item,
                    [field]: value,
                };
            })
        );

        setMessage(null);
    };

    const handleSupplierChange = (
        rowId: string,
        companyName: string
    ) => {
        const normalizedCompanyName =
            normalizeText(companyName);
    
        const selectedSupplier = suppliers.find(
            (supplier) =>
                normalizeText(
                    getSupplierCompanyName(supplier)
                ) === normalizedCompanyName
        );
    
        setApprovedSuppliers((current) =>
            current.map((item) => {
                if (item.rowId !== rowId) {
                    return item;
                }
    
                return {
                    ...item,
                    companyName,
                    companyId: selectedSupplier
                        ? getSupplierCompanyId(
                              selectedSupplier
                          )
                        : "",
                };
            })
        );
    
        setMessage(null);
    };

    const parseApprovedSuppliers = (
        value: RequestItem["approved_suppliers"]
    ): ApprovedSupplierApiItem[] => {
        if (Array.isArray(value)) {
            return value;
        }

        if (typeof value !== "string") {
            return [];
        }

        const text = value.trim();

        if (!text) {
            return [];
        }

        try {
            const parsed = JSON.parse(text);

            return Array.isArray(parsed)
                ? parsed
                : [];
        } catch {
            console.error(
                "approved_suppliers ไม่ใช่ JSON ที่ถูกต้อง:",
                value
            );

            return [];
        }
    };

    const totalApprovedQty = useMemo(() => {
        return approvedSuppliers.reduce(
            (total, item) =>
                total + Number(item.qty || 0),
            0
        );
    }, [approvedSuppliers]);

    const savedApprovedSuppliers = useMemo(() => {
        return parseApprovedSuppliers(
            data.approved_suppliers
        );
    }, [data.approved_suppliers]);

    const approvedQtyFromApi = Math.max(
        Number(data.approved_qty ?? 0),
        0
    );

    const notApprovedQtyFromApi = Math.max(
        requestedQty - approvedQtyFromApi,
        0
    );

    const draftApprovedQty = totalApprovedQty;

    const draftNotApprovedQty = Math.max(
        requestedQty - draftApprovedQty,
        0
    );

    if (!open) return null;

    const isFbpPending =
        normalizeStatus(data.status) === "fbp_pending";

    const isSupplierRowsValid = useMemo(() => {
        if (approvedSuppliers.length === 0) {
            return false;
        }

        return approvedSuppliers.every(
            (item) =>
                item.companyName.trim() !== "" &&
                item.truckType.trim() !== "" &&
                Number(item.qty) > 0
        );
    }, [approvedSuppliers]);

    const approveRequest = async () => {
        if (!canMakeDecision) {
            setMessage({
                type: "error",
                text: "รายการนี้ดำเนินการแล้ว ไม่สามารถบันทึกซ้ำได้",
            });
            return;
        }

        if (!data.id) {
            setMessage({
                type: "error",
                text: "ไม่พบ ID ของรายการนี้",
            });
            return;
        }

        if (!isSupplierRowsValid) {
            setMessage({
                type: "error",
                text: "กรุณาเลือกผู้ให้บริการ ประเภทรถ และจำนวนให้ครบ",
            });
            return;
        }

        if (totalApprovedQty <= 0) {
            setMessage({
                type: "error",
                text: "จำนวนรถต้องมากกว่า 0",
            });
            return;
        }

        if (totalApprovedQty > requestedQty) {
            setMessage({
                type: "error",
                text: `จำนวนรถรวมต้องไม่เกิน ${requestedQty} คัน`,
            });
            return;
        }

        try {
            setSaving(true);
            setMessage(null);

            const approvedBy = getCurrentUserText();

            if (!approvedBy) {
                throw new Error("ไม่พบข้อมูลผู้ดำเนินการ");
            }

            const payload = {
                id: Number(data.id),
                status: "progress",
                approved_by: approvedBy,

                suppliers: approvedSuppliers.map((item) => ({
                    company_id: item.companyId,
                    company_name: item.companyName,
                    truck_type: item.truckType,
                    qty: Number(item.qty),
                })),

                approved_truck_type:
                    approvedSuppliers[0]?.truckType ||
                    data.fleet_truck_type ||
                    "",

                status_details:
                    remark.trim() || "FBP จัดรถเรียบร้อยแล้ว",
            };

            console.log("FBP APPROVE PAYLOAD:", payload);

            const response = await fetch(
                "http://192.168.158.210/api_new_truck/api/request_approve.php",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );

            const responseText = await response.text();

            let result: any = null;

            if (responseText.trim()) {
                try {
                    result = JSON.parse(responseText);
                } catch {
                    throw new Error(
                        `API ไม่ได้ส่ง JSON กลับมา: ${responseText}`
                    );
                }
            }

            if (
                !response.ok ||
                result?.status === "error" ||
                result?.success === false
            ) {
                throw new Error(
                    result?.message || "บันทึกการจัดรถไม่สำเร็จ"
                );
            }

            setMessage({
                type: "success",
                text:
                    result?.message ||
                    "จัดรถและบันทึกข้อมูลเรียบร้อยแล้ว",
            });

            setDecisionCompleted(true);

            await Promise.resolve(onSuccess());

            setTimeout(() => {
                onClose();
            }, 700);
        } catch (error: any) {
            console.error("FBP APPROVE ERROR:", error);

            setMessage({
                type: "error",
                text:
                    error?.message ||
                    "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
            });
        } finally {
            setSaving(false);
        }
    };

    const getDailyWorkloadDisplay = () => {
        if (loadingWorkload) {
            return {
                value: "กำลังโหลด...",
                description: "กำลังดึงข้อมูล WORKLOAD_FC จาก API",
                className: "text-slate-500",
            };
        }

        if (!todayWorkloadRow) {
            return {
                value: "ไม่มีข้อมูล",
                description: `ไม่พบข้อมูล DATE: ${formatThaiDate(todayKey)} ของ DC_CODE นี้`,
                className: "text-red-600",
            };
        }

        return {
            value: formatNumber(todayWorkloadFc),
            description: "พบข้อมูล WORKLOAD_FC ของวันนี้",
            className: "text-blue-700",
        };
    };

    const getMonthlyWorkloadDisplay = () => {
        if (loadingWorkload) {
            return {
                value: "กำลังโหลด...",
                description: "กำลังดึงข้อมูลรายเดือนจาก API",
                className: "text-slate-500",
            };
        }

        if (monthlyWorkloadRows.length === 0) {
            return {
                value: "ไม่มีข้อมูล",
                description: `ไม่พบข้อมูล WORKLOAD_FC ของเดือน ${formatThaiMonthYear(activeWorkloadMonth)}`,
                className: "text-red-600",
            };
        }

        return {
            value: formatNumber(monthlyWorkloadFcTotal),
            description: `รวม WORKLOAD_FC ของเดือน ${formatThaiMonthYear(activeWorkloadMonth)}`,
            className: "text-slate-800",
        };
    };

    const dailyWorkloadDisplay = getDailyWorkloadDisplay();
    const monthlyWorkloadDisplay = getMonthlyWorkloadDisplay();

    const rejectRequest = async () => {
        if (!canMakeDecision) {
            setMessage({
                type: "error",
                text: "รายการนี้ดำเนินการแล้ว ไม่สามารถบันทึกซ้ำได้",
            });
            return;
        }

        if (!data.id) {
            setMessage({
                type: "error",
                text: "ไม่พบ ID ของรายการนี้",
            });
            return;
        }

        if (!remark.trim()) {
            setMessage({
                type: "error",
                text: "กรุณาระบุเหตุผลที่ไม่อนุมัติคำขอ",
            });
            return;
        }

        try {
            setSaving(true);
            setMessage(null);

            const approvedBy = getCurrentUserText();

            const payload = {
                id: Number(data.id),
                status: "reject_by_fbp",
                approved_by: approvedBy,
                reject_reason: remark.trim(),
                status_details:
                    remark.trim() || "FBP ไม่อนุมัติคำขอ",

            };

            console.log("GM REJECT PAYLOAD:", payload);

            const response = await fetch(
                "http://192.168.158.210/api_new_truck/api/request_gm_update.php",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );

            const responseText = await response.text();
            let result: any = null;

            if (responseText.trim()) {
                try {
                    result = JSON.parse(responseText);
                } catch {
                    throw new Error(`API ไม่ได้ส่ง JSON กลับมา: ${responseText}`);
                }
            }

            if (
                !response.ok ||
                result?.status === "error" ||
                result?.success === false
            ) {
                throw new Error(result?.message || "ไม่อนุมัติคำขอไม่สำเร็จ");
            }

            setMessage({
                type: "success",
                text: result?.message || "บันทึกผลไม่อนุมัติคำขอเรียบร้อยแล้ว",
            });

            setDecisionCompleted(true);
            setConfirmDecision(null);
            await Promise.resolve(onSuccess());

            setTimeout(() => {
                onClose();
            }, 700);
        } catch (error: any) {
            console.error("REJECT REQUEST ERROR:", error);

            setMessage({
                type: "error",
                text: error?.message || "เกิดข้อผิดพลาดในการไม่อนุมัติคำขอ",
            });
        } finally {
            setSaving(false);
        }
    };


    const replacementTruckRows = useMemo<RequestDetailItem[]>(() => {
        if (Array.isArray(data.details) && data.details.length > 0) {
            return data.details.map((detail) => ({
                ...detail,
                license: String(detail.license || "").trim(),
                province: String(detail.province || "").trim(),
                truck_type: String(detail.truck_type || "").trim(),
                company_id: String(detail.company_id || "").trim(),
                company_name: String(detail.company_name || "").trim(),
            }));
        }

        const licenses = Array.isArray(data.license_replace)
            ? data.license_replace
            : String(data.license_replace || "")
                .split(",")
                .map((license) => license.trim())
                .filter(Boolean);

        return licenses.map((license, index) => ({
            id: `fallback-${index}`,
            license: String(license).trim(),
            province: "",
            truck_type: "",
            company_id: "",
            company_name: "",
        }));
    }, [data.details, data.license_replace]);

    const formatStatusText = (status?: string) => {
        const value = normalizeStatus(status);

        if (
            value === "fbp_pending" ||
            value === "pending_fbp" ||
            value === "waiting_fbp" ||
            value === "wait_fbp"
        ) {
            return "รอจัดรถ";
        }

        if (
            value === "gm_pending" ||
            value === "pending_gm" ||
            value === "pending" ||
            value === "รออนุมัติ"
        ) {
            return "รออนุมัติ";
        }

        if (
            value === "progress" ||
            value === "in_progress" ||
            value === "confirm request" ||
            value === "confirmed request" ||
            value === "confirm" ||
            value === "confirmed" ||
            value === "in progress" ||
            value === "processing" ||
            value === "กำลังดำเนินการ"
        ) {
            return "กำลังดำเนินการ";
        }

        if (
            value === "approved" ||
            value === "approve" ||
            value === "success" ||
            value === "completed" ||
            value === "สำเร็จ" ||
            value === "อนุมัติ"
        ) {
            return "เสร็จเรียบร้อย";
        }

        if (
            value === "reject_by_fbp" ||
            value === "reject_by_gm" ||
            value === "fbp_rejected" ||
            value === "reject_by_fbp" ||
            value === "rejected" ||
            value === "reject" ||
            value === "not approved" ||
            value === "ไม่อนุมัติ"
        ) {
            return "ไม่อนุมัติ";
        }

        if (
            value === "cancel" ||
            value === "cancelled" ||
            value === "canceled" ||
            value === "ยกเลิก"
        ) {
            return "ยกเลิก";
        }

        return status || "-";
    };

    const currentStatusText = formatStatusText(data.status);

    const canMakeDecision =
        !decisionCompleted &&
        isFbpPending;

    const currentStatusClass =
        currentStatusText === "รอจัดรถ" || currentStatusText === "รออนุมัติ"
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : currentStatusText === "กำลังดำเนินการ"
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : currentStatusText === "เสร็จเรียบร้อย"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : currentStatusText === "ไม่อนุมัติ" ||
                        currentStatusText === "ยกเลิก"
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-slate-200 bg-slate-50 text-slate-600";

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-label="ประเมินกองรถ"
            onMouseDown={(event) => {
                if (
                    event.target === event.currentTarget &&
                    !saving
                ) {
                    onClose();
                }
            }}
        >
            <div
                className="relative flex h-[94vh] w-full max-w-[1280px] flex-col overflow-hidden rounded-[28px] border border-white/70 bg-slate-100 shadow-[0_35px_120px_rgba(15,23,42,0.50)]"
                onMouseDown={(event) =>
                    event.stopPropagation()
                }
            >
                {/* Header */}
                <header className="relative shrink-0 overflow-hidden border-b border-slate-200 bg-white">
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-700 via-indigo-600 to-sky-500" />

                    <div className="flex items-start justify-between gap-4 px-4 pb-4 pt-5 sm:px-6">
                        <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 to-indigo-700 text-xs font-black text-white shadow-lg shadow-blue-700/20">
                                FBP
                            </div>

                            <div className="min-w-0">
                                <h1 className="text-base font-black text-slate-900 sm:text-lg">
                                    ประเมินกองรถ
                                </h1>

                                <p className="mt-1 text-[11px] font-medium text-slate-500">
                                    ตรวจสอบข้อมูล
                                    แล้วเลือกผู้ให้บริการและจำนวนรถ
                                </p>

                                <div className="mt-2 flex flex-wrap gap-2">
                                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-700 ring-1 ring-slate-200">
                                        เลขที่เอกสาร:{" "}
                                        {data.running_doc || "-"}
                                    </span>

                                    <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700 ring-1 ring-blue-100">
                                        DC: {data.dc_code || "-"}
                                    </span>

                                    <span
                                        className={`rounded-lg border px-2.5 py-1 text-[10px] font-black ${currentStatusClass}`}
                                    >
                                        {currentStatusText}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl font-medium text-slate-400 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="ปิด"
                        >
                            ×
                        </button>
                    </div>
                </header>

                {/* Content */}
                <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_380px]">
                    {/* ข้อมูลด้านซ้าย */}
                    <div className="min-h-0 overflow-y-auto bg-slate-50 p-2 sm:p-4">
                        <CheckDC
                            data={data}
                            allRequests={allRequests}
                            issuePeriods={issuePeriods}
                        />
                    </div>

                    {/* ด้านขวา */}
                    <aside className="min-h-0 overflow-y-auto border-t border-slate-200 bg-white p-3 sm:p-5 lg:border-l lg:border-t-0">
                        <div className="space-y-4">
                            {/* สรุปข้อมูลคำขอ */}
                            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                <div className="border-b border-slate-200 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 px-4 py-3.5 text-white">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <h2 className="text-sm font-black">
                                                สรุปข้อมูลคำขอ
                                            </h2>

                                            <p className="mt-0.5 text-[10px] font-medium text-white/65">
                                                ข้อมูลสำหรับจัดรถ
                                            </p>
                                        </div>

                                        <span className="rounded-lg bg-white/10 px-2 py-1 text-[9px] font-black text-white ring-1 ring-white/15">
                                            REQUEST
                                        </span>
                                    </div>
                                </div>

                                <div className="divide-y divide-slate-100 px-4">
                                    {[
                                        [
                                            "เลขที่เอกสาร",
                                            data.running_doc || "-",
                                        ],
                                        [
                                            "DC",
                                            data.dc_code || "-",
                                        ],
                                        [
                                            "ประเภทคำขอ",
                                            data.fleet_type || "-",
                                        ],
                                        [
                                            "ประเภทรถที่ขอ",
                                            data.fleet_truck_type ||
                                            "-",
                                        ],
                                        [
                                            "จำนวนที่ขอ",
                                            `${formatNumber(
                                                data.qty
                                            )} คัน`,
                                        ],
                                        [
                                            "สถานะ",
                                            currentStatusText,
                                        ],
                                    ].map(([label, value]) => (
                                        <div
                                            key={label}
                                            className="flex items-start justify-between gap-4 py-3 text-xs"
                                        >
                                            <span className="shrink-0 font-semibold text-slate-400">
                                                {label}
                                            </span>

                                            <span className="break-words text-right font-black text-slate-800">
                                                {value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Message */}
                            {message && (
                                <div
                                    className={`rounded-2xl border px-4 py-3 text-xs font-bold ${message.type ===
                                            "success"
                                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                            : "border-rose-200 bg-rose-50 text-rose-700"
                                        }`}
                                >
                                    <div className="flex items-start gap-2">
                                        <span
                                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] text-white ${message.type ===
                                                    "success"
                                                    ? "bg-emerald-600"
                                                    : "bg-rose-600"
                                                }`}
                                        >
                                            {message.type ===
                                                "success"
                                                ? "✓"
                                                : "!"}
                                        </span>

                                        <span className="leading-relaxed">
                                            {message.text}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {!canMakeDecision ? (
                                /* ========================================
                                   ดูรายละเอียดหลังดำเนินการแล้ว
                                ======================================== */
                                <div className="space-y-4">
                                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                        <div className="border-b border-slate-200 bg-slate-50 px-4 py-3.5">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3">
                                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-black text-blue-600 ring-1 ring-blue-100">
                                                        ✓
                                                    </span>

                                                    <div>
                                                        <h3 className="text-sm font-black text-slate-800">
                                                            รายการนี้ดำเนินการแล้ว
                                                        </h3>

                                                        <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                                                            แสดงผลการพิจารณาที่บันทึกไว้
                                                        </p>
                                                    </div>
                                                </div>

                                                <span
                                                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${currentStatusClass}`}
                                                >
                                                    {
                                                        currentStatusText
                                                    }
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-4 p-4">
                                            {/* จำนวนจาก request_get.php */}
                                            <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200">
                                                {[
                                                    {
                                                        label:
                                                            "จำนวนที่ขอ",
                                                        value:
                                                            requestedQty,
                                                        className:
                                                            "text-slate-800",
                                                        bgClass:
                                                            "bg-slate-50",
                                                    },
                                                    {
                                                        label:
                                                            "จำนวนที่อนุมัติ",
                                                        value:
                                                            approvedQtyFromApi,
                                                        className:
                                                            "text-blue-700",
                                                        bgClass:
                                                            "bg-blue-50/70",
                                                    },
                                                    {
                                                        label:
                                                            "จำนวนไม่อนุมัติ",
                                                        value:
                                                            notApprovedQtyFromApi,
                                                        className:
                                                            notApprovedQtyFromApi >
                                                                0
                                                                ? "text-rose-700"
                                                                : "text-emerald-700",
                                                        bgClass:
                                                            notApprovedQtyFromApi >
                                                                0
                                                                ? "bg-rose-50/70"
                                                                : "bg-emerald-50/70",
                                                    },
                                                ].map(
                                                    (
                                                        item,
                                                        index
                                                    ) => (
                                                        <div
                                                            key={
                                                                item.label
                                                            }
                                                            className={`px-2 py-3 text-center ${item.bgClass} ${index >
                                                                    0
                                                                    ? "border-l border-slate-200"
                                                                    : ""
                                                                }`}
                                                        >
                                                            <p className="text-[9px] font-bold text-slate-500">
                                                                {
                                                                    item.label
                                                                }
                                                            </p>

                                                            <p
                                                                className={`mt-1 text-lg font-black ${item.className}`}
                                                            >
                                                                {formatNumber(
                                                                    item.value
                                                                )}

                                                                <span className="ml-1 text-[9px] font-bold text-slate-400">
                                                                    คัน
                                                                </span>
                                                            </p>
                                                        </div>
                                                    )
                                                )}
                                            </div>

                                            {/* ประเภทรถที่อนุมัติ */}
                                            {String(
                                                data.approved_truck_type ??
                                                ""
                                            ).trim() && (
                                                    <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5">
                                                        <p className="text-[9px] font-bold text-blue-500">
                                                            ประเภทรถที่อนุมัติ
                                                        </p>

                                                        <p className="mt-1 text-xs font-black text-blue-900">
                                                            {formatTruckTypeLabel(
                                                                String(
                                                                    data.approved_truck_type
                                                                )
                                                            )}
                                                        </p>
                                                    </div>
                                                )}

                                            {/* ผู้ให้บริการที่อนุมัติ */}
                                            {savedApprovedSuppliers.length >
                                                0 && (
                                                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                                        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2.5">
                                                            <div>
                                                                <p className="text-xs font-black text-slate-800">
                                                                    ผู้ให้บริการที่อนุมัติ
                                                                </p>

                                                                <p className="mt-0.5 text-[9px] font-medium text-slate-400">
                                                                    รายละเอียดการจัดรถ
                                                                </p>
                                                            </div>

                                                            <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-black text-blue-700">
                                                                {
                                                                    savedApprovedSuppliers.length
                                                                }{" "}
                                                                รายการ
                                                            </span>
                                                        </div>

                                                        <div className="divide-y divide-slate-100">
                                                            {savedApprovedSuppliers.map(
                                                                (
                                                                    supplier,
                                                                    index
                                                                ) => {
                                                                    const companyId =
                                                                        String(
                                                                            supplier.company_id ??
                                                                            supplier.Company_ID ??
                                                                            ""
                                                                        ).trim();

                                                                    const companyName =
                                                                        String(
                                                                            supplier.company_name ??
                                                                            supplier.Company_Name ??
                                                                            "-"
                                                                        ).trim();

                                                                    const truckType =
                                                                        String(
                                                                            supplier.truck_type ??
                                                                            supplier.TRUCK_TYPE ??
                                                                            data.approved_truck_type ??
                                                                            "-"
                                                                        ).trim();

                                                                    const supplierQty =
                                                                        Number(
                                                                            supplier.qty ??
                                                                            0
                                                                        );

                                                                    return (
                                                                        <div
                                                                            key={`${companyId || companyName}-${index}`}
                                                                            className="flex items-center justify-between gap-3 px-3 py-3"
                                                                        >
                                                                            <div className="min-w-0">
                                                                                <p className="break-words text-xs font-black text-slate-800">
                                                                                    {
                                                                                        companyName
                                                                                    }
                                                                                </p>

                                                                                <p className="mt-0.5 break-words text-[9px] font-medium text-slate-400">
                                                                                    {formatTruckTypeLabel(
                                                                                        truckType
                                                                                    )}

                                                                                    {companyId
                                                                                        ? ` · ${companyId}`
                                                                                        : ""}
                                                                                </p>
                                                                            </div>

                                                                            <span className="shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">
                                                                                {formatNumber(
                                                                                    supplierQty
                                                                                )}{" "}
                                                                                คัน
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                }
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                            {/* รายละเอียดสถานะ */}
                                            {String(
                                                data.status_details ??
                                                ""
                                            ).trim() && (
                                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                                                        <p className="text-[9px] font-bold text-slate-400">
                                                            รายละเอียดสถานะ
                                                        </p>

                                                        <p className="mt-1 whitespace-pre-wrap break-words text-xs font-semibold leading-relaxed text-slate-700">
                                                            {
                                                                data.status_details
                                                            }
                                                        </p>
                                                    </div>
                                                )}

                                            {/* เหตุผลไม่อนุมัติ */}
                                            {String(
                                                data.reject_reason ??
                                                ""
                                            ).trim() && (
                                                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-3">
                                                        <p className="text-[9px] font-bold text-rose-500">
                                                            เหตุผลที่ไม่อนุมัติ
                                                        </p>

                                                        <p className="mt-1 whitespace-pre-wrap break-words text-xs font-semibold leading-relaxed text-rose-700">
                                                            {
                                                                data.reject_reason
                                                            }
                                                        </p>
                                                    </div>
                                                )}

                                            <button
                                                type="button"
                                                onClick={onClose}
                                                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 text-xs font-black text-slate-600 transition hover:border-slate-300 hover:bg-slate-100"
                                            >
                                                ปิด
                                            </button>
                                        </div>
                                    </section>
                                </div>
                            ) : (
                                /* ========================================
                                   ฟอร์มจัดรถ
                                ======================================== */
                                <section className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
                                    <div className="border-b border-blue-100 bg-blue-50 px-4 py-3.5">
                                        <h2 className="text-sm font-black text-blue-900">
                                            จัดรถ
                                        </h2>

                                        <p className="mt-0.5 text-[10px] font-medium text-blue-600">
                                            เลือกผู้ให้บริการ
                                            ประเภทรถ
                                            และจำนวนที่อนุมัติ
                                        </p>
                                    </div>

                                    <div className="space-y-4 p-4">
                                        {/* จำนวนที่กำลังกรอก */}
                                        <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200">
                                            {[
                                                {
                                                    label:
                                                        "จำนวนที่ขอ",
                                                    value:
                                                        requestedQty,
                                                    className:
                                                        "text-slate-800",
                                                    bgClass:
                                                        "bg-slate-50",
                                                },
                                                {
                                                    label:
                                                        "จำนวนที่อนุมัติ",
                                                    value:
                                                        draftApprovedQty,
                                                    className:
                                                        draftApprovedQty >
                                                            requestedQty
                                                            ? "text-rose-700"
                                                            : "text-blue-700",
                                                    bgClass:
                                                        "bg-blue-50/70",
                                                },
                                                {
                                                    label:
                                                        "จำนวนไม่อนุมัติ",
                                                    value:
                                                        draftNotApprovedQty,
                                                    className:
                                                        draftNotApprovedQty >
                                                            0
                                                            ? "text-rose-700"
                                                            : "text-emerald-700",
                                                    bgClass:
                                                        draftNotApprovedQty >
                                                            0
                                                            ? "bg-rose-50/70"
                                                            : "bg-emerald-50/70",
                                                },
                                            ].map(
                                                (item, index) => (
                                                    <div
                                                        key={
                                                            item.label
                                                        }
                                                        className={`px-2 py-3 text-center ${item.bgClass} ${index > 0
                                                                ? "border-l border-slate-200"
                                                                : ""
                                                            }`}
                                                    >
                                                        <p className="text-[9px] font-bold text-slate-500">
                                                            {
                                                                item.label
                                                            }
                                                        </p>

                                                        <p
                                                            className={`mt-1 text-lg font-black ${item.className}`}
                                                        >
                                                            {formatNumber(
                                                                item.value
                                                            )}

                                                            <span className="ml-1 text-[9px] font-bold text-slate-400">
                                                                คัน
                                                            </span>
                                                        </p>
                                                    </div>
                                                )
                                            )}
                                        </div>

                                        {/* ผู้ให้บริการ */}
                                        <div>
                                            <div className="mb-3 flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-xs font-black text-slate-700">
                                                        ผู้ให้บริการรถ
                                                        <span className="ml-1 text-rose-500">
                                                            *
                                                        </span>
                                                    </p>

                                                    <p className="mt-0.5 text-[9px] font-medium text-slate-400">
                                                        แบ่งรถให้หลายรายได้
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    disabled={saving}
                                                    onClick={
                                                        addApprovedSupplier
                                                    }
                                                    className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 text-[10px] font-black text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <span className="text-sm">
                                                        +
                                                    </span>
                                                    เพิ่มรายการ
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                {approvedSuppliers.map(
                                                    (
                                                        row,
                                                        index
                                                    ) => (
                                                        <div
                                                            key={
                                                                row.rowId
                                                            }
                                                            className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                                                        >
                                                            <div className="mb-2 flex items-center justify-between">
                                                                <span className="text-[10px] font-black text-slate-500">
                                                                    รายการ{" "}
                                                                    {index +
                                                                        1}
                                                                </span>

                                                                {approvedSuppliers.length >
                                                                    1 && (
                                                                        <button
                                                                            type="button"
                                                                            disabled={
                                                                                saving
                                                                            }
                                                                            onClick={() =>
                                                                                removeApprovedSupplier(
                                                                                    row.rowId
                                                                                )
                                                                            }
                                                                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200 bg-white text-base text-rose-500 transition hover:bg-rose-50 disabled:opacity-50"
                                                                            aria-label="ลบรายการ"
                                                                        >
                                                                            ×
                                                                        </button>
                                                                    )}
                                                            </div>

                                                            <div className="space-y-2">
                                                                <label className="block">
                                                                    <span className="mb-1 block text-[10px] font-bold text-slate-500">
                                                                        ผู้ให้บริการ
                                                                    </span>

                                                                    <div className="relative">
                                                                        <input
                                                                            type="text"
                                                                            list={`supplier-options-${row.rowId}`}
                                                                            value={row.companyName}
                                                                            disabled={saving}
                                                                            autoComplete="off"
                                                                            placeholder={
                                                                                loadingSuppliers
                                                                                    ? "กำลังโหลดผู้ให้บริการ..."
                                                                                    : "พิมพ์หรือเลือกผู้ให้บริการ"
                                                                            }
                                                                            onChange={(event) =>
                                                                                handleSupplierChange(
                                                                                    row.rowId,
                                                                                    event.target.value
                                                                                )
                                                                            }
                                                                            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 pr-9 text-xs font-bold text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                                                                        />

                                                                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">
                                                                            ▼
                                                                        </span>

                                                                        <datalist
                                                                            id={`supplier-options-${row.rowId}`}
                                                                        >
                                                                            {supplierOptions.map(
                                                                                (supplierName) => (
                                                                                    <option
                                                                                        key={supplierName}
                                                                                        value={supplierName}
                                                                                    />
                                                                                )
                                                                            )}
                                                                        </datalist>
                                                                    </div>

                                                                    <span className="mt-1 block text-[9px] font-medium text-slate-400">
                                                                        สามารถพิมพ์ค้นหา เลือกจากรายการ
                                                                        หรือระบุชื่อผู้ให้บริการใหม่ได้
                                                                    </span>
                                                                </label>

                                                                <div className="grid grid-cols-[minmax(0,1fr)_86px] gap-2">
                                                                    <label className="block">
                                                                        <span className="mb-1 block text-[10px] font-bold text-slate-500">
                                                                            ประเภทรถ
                                                                        </span>

                                                                        <select
                                                                            value={
                                                                                row.truckType
                                                                            }
                                                                            disabled={
                                                                                saving ||
                                                                                loadingTrucks
                                                                            }
                                                                            onChange={(
                                                                                event
                                                                            ) =>
                                                                                updateApprovedSupplier(
                                                                                    row.rowId,
                                                                                    "truckType",
                                                                                    event
                                                                                        .target
                                                                                        .value
                                                                                )
                                                                            }
                                                                            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                                                                        >
                                                                            <option value="">
                                                                                {loadingTrucks
                                                                                    ? "กำลังโหลด..."
                                                                                    : "เลือกประเภทรถ"}
                                                                            </option>

                                                                            {truckTypeOptions.map(
                                                                                (
                                                                                    truckType
                                                                                ) => (
                                                                                    <option
                                                                                        key={
                                                                                            truckType
                                                                                        }
                                                                                        value={
                                                                                            truckType
                                                                                        }
                                                                                    >
                                                                                        {formatTruckTypeLabel(
                                                                                            truckType
                                                                                        )}
                                                                                    </option>
                                                                                )
                                                                            )}
                                                                        </select>
                                                                    </label>

                                                                    <label className="block">
                                                                        <span className="mb-1 block text-[10px] font-bold text-slate-500">
                                                                            จำนวน
                                                                        </span>

                                                                        <input
                                                                            type="number"
                                                                            min={
                                                                                1
                                                                            }
                                                                            max={
                                                                                requestedQty
                                                                            }
                                                                            value={
                                                                                row.qty
                                                                            }
                                                                            disabled={
                                                                                saving
                                                                            }
                                                                            onChange={(
                                                                                event
                                                                            ) => {
                                                                                const value =
                                                                                    Number(
                                                                                        event
                                                                                            .target
                                                                                            .value
                                                                                    );

                                                                                updateApprovedSupplier(
                                                                                    row.rowId,
                                                                                    "qty",
                                                                                    Number.isFinite(
                                                                                        value
                                                                                    )
                                                                                        ? value
                                                                                        : 0
                                                                                );
                                                                            }}
                                                                            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-2 text-center text-sm font-black text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                                                                        />
                                                                    </label>
                                                                </div>

                                                                {row.companyId && (
                                                                    <p className="text-[9px] font-medium text-slate-400">
                                                                        รหัสผู้ให้บริการ:{" "}
                                                                        {
                                                                            row.companyId
                                                                        }
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </div>

                                        {totalApprovedQty >
                                            requestedQty && (
                                                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-bold text-rose-700">
                                                    จำนวนรถรวมเกินที่ขอ{" "}
                                                    {formatNumber(
                                                        requestedQty
                                                    )}{" "}
                                                    คัน
                                                </div>
                                            )}

                                        {totalApprovedQty <
                                            requestedQty &&
                                            totalApprovedQty >
                                            0 && (
                                                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-bold text-rose-700">
                                                    มีจำนวนไม่อนุมัติ{" "}
                                                    {formatNumber(
                                                        draftNotApprovedQty
                                                    )}{" "}
                                                    คัน
                                                </div>
                                            )}

                                        <label className="block">
                                            <span className="mb-1.5 block text-xs font-bold text-slate-600">
                                                หมายเหตุ / เหตุผล
                                            </span>

                                            <textarea
                                                rows={3}
                                                value={remark}
                                                disabled={saving}
                                                onChange={(
                                                    event
                                                ) => {
                                                    setRemark(
                                                        event.target
                                                            .value
                                                    );
                                                    setMessage(null);
                                                }}
                                                placeholder="เพิ่มหมายเหตุ หรือระบุเหตุผลกรณีไม่อนุมัติ"
                                                className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                                            />

                                            <span className="mt-1.5 block text-[10px] font-medium text-slate-400">
                                                ต้องระบุเหตุผลเมื่อเลือกไม่อนุมัติ
                                            </span>
                                        </label>

                                        {!confirmDecision ? (
                                            <div className="space-y-2.5">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setMessage(
                                                            null
                                                        );
                                                        setConfirmDecision(
                                                            "approve"
                                                        );
                                                    }}
                                                    disabled={
                                                        saving ||
                                                        !isSupplierRowsValid ||
                                                        totalApprovedQty <=
                                                        0 ||
                                                        totalApprovedQty >
                                                        requestedQty
                                                    }
                                                    className="group flex min-h-12 w-full items-center justify-between rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 px-4 text-left text-white shadow-lg shadow-blue-700/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                                                >
                                                    <span>
                                                        <span className="block text-sm font-black">
                                                            อนุมัติการจัดรถ
                                                        </span>

                                                        <span className="mt-0.5 block text-[9px] font-medium text-white/70">
                                                            บันทึกจำนวนรถที่อนุมัติและดำเนินการต่อ
                                                        </span>
                                                    </span>

                                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-sm font-black">
                                                        ✓
                                                    </span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setMessage(
                                                            null
                                                        );
                                                        setConfirmDecision(
                                                            "reject_by_fbp"
                                                        );
                                                    }}
                                                    disabled={saving}
                                                    className="group flex min-h-12 w-full items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 text-left text-rose-700 transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                                                >
                                                    <span>
                                                        <span className="block text-sm font-black">
                                                            ไม่อนุมัติคำขอ
                                                        </span>

                                                        <span className="mt-0.5 block text-[9px] font-medium text-rose-500">
                                                            ปฏิเสธรายการและบันทึกเหตุผล
                                                        </span>
                                                    </span>

                                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-200/70 text-sm font-black">
                                                        ×
                                                    </span>
                                                </button>
                                            </div>
                                        ) : confirmDecision ===
                                            "approve" ? (
                                            /* ยืนยันอนุมัติ */
                                            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                                                <div className="flex items-start gap-3">
                                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-sm font-black text-white">
                                                        ✓
                                                    </span>

                                                    <div>
                                                        <h3 className="text-sm font-black text-blue-900">
                                                            ยืนยันอนุมัติการจัดรถ?
                                                        </h3>

                                                        <p className="mt-1 text-[10px] font-medium text-blue-600">
                                                            กรุณาตรวจสอบจำนวนรถก่อนบันทึก
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-xl border border-blue-200 bg-white">
                                                    {[
                                                        {
                                                            label:
                                                                "จำนวนที่ขอ",
                                                            value:
                                                                requestedQty,
                                                            className:
                                                                "text-slate-800",
                                                        },
                                                        {
                                                            label:
                                                                "อนุมัติ",
                                                            value:
                                                                draftApprovedQty,
                                                            className:
                                                                "text-blue-700",
                                                        },
                                                        {
                                                            label:
                                                                "ไม่อนุมัติ",
                                                            value:
                                                                draftNotApprovedQty,
                                                            className:
                                                                draftNotApprovedQty >
                                                                    0
                                                                    ? "text-rose-700"
                                                                    : "text-emerald-700",
                                                        },
                                                    ].map(
                                                        (
                                                            item,
                                                            index
                                                        ) => (
                                                            <div
                                                                key={
                                                                    item.label
                                                                }
                                                                className={`px-2 py-3 text-center ${index >
                                                                        0
                                                                        ? "border-l border-blue-100"
                                                                        : ""
                                                                    }`}
                                                            >
                                                                <p className="text-[9px] font-bold text-slate-400">
                                                                    {
                                                                        item.label
                                                                    }
                                                                </p>

                                                                <p
                                                                    className={`mt-1 text-lg font-black ${item.className}`}
                                                                >
                                                                    {formatNumber(
                                                                        item.value
                                                                    )}

                                                                    <span className="ml-1 text-[9px] text-slate-400">
                                                                        คัน
                                                                    </span>
                                                                </p>
                                                            </div>
                                                        )
                                                    )}
                                                </div>

                                                <div className="mt-4 grid grid-cols-2 gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            saving
                                                        }
                                                        onClick={() =>
                                                            setConfirmDecision(
                                                                null
                                                            )
                                                        }
                                                        className="h-10 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                                                    >
                                                        ยกเลิก
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={
                                                            saving ||
                                                            !isSupplierRowsValid ||
                                                            totalApprovedQty <=
                                                            0 ||
                                                            totalApprovedQty >
                                                            requestedQty
                                                        }
                                                        onClick={() =>
                                                            void approveRequest()
                                                        }
                                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-700 px-3 text-xs font-black text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        {saving && (
                                                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                                        )}

                                                        {saving
                                                            ? "กำลังบันทึก..."
                                                            : "ยืนยันอนุมัติ"}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* ยืนยันไม่อนุมัติ */
                                            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                                                <div className="flex items-start gap-3">
                                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-sm font-black text-white">
                                                        ×
                                                    </span>

                                                    <div>
                                                        <h3 className="text-sm font-black text-rose-800">
                                                            ยืนยันไม่อนุมัติคำขอ?
                                                        </h3>

                                                        <p className="mt-1 text-[10px] font-medium text-rose-600">
                                                            คำขอจำนวน{" "}
                                                            {formatNumber(
                                                                requestedQty
                                                            )}{" "}
                                                            คัน
                                                            จะถูกปฏิเสธทั้งหมด
                                                        </p>
                                                    </div>
                                                </div>

                                                {!remark.trim() && (
                                                    <p className="mt-3 rounded-lg bg-white px-3 py-2 text-[10px] font-bold text-rose-600 ring-1 ring-rose-100">
                                                        กรุณาระบุเหตุผลที่ไม่อนุมัติ
                                                    </p>
                                                )}

                                                <div className="mt-4 grid grid-cols-2 gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            saving
                                                        }
                                                        onClick={() =>
                                                            setConfirmDecision(
                                                                null
                                                            )
                                                        }
                                                        className="h-10 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                                                    >
                                                        ยกเลิก
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={
                                                            saving ||
                                                            !remark.trim()
                                                        }
                                                        onClick={() =>
                                                            void rejectRequest()
                                                        }
                                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 text-xs font-black text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        {saving && (
                                                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                                        )}

                                                        {saving
                                                            ? "กำลังบันทึก..."
                                                            : "ยืนยันไม่อนุมัติ"}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
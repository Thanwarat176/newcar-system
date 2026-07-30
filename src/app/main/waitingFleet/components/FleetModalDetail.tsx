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

    details?: RequestDetailItem[];
}

interface SupplierItem {
    Name?: string;
    name?: string;
    [key: string]: any;
}

interface TruckItem {
    id?: string | number;
    truck_type?: string;
    TRUCK_TYPE?: string;
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

type GmDecision = "gm_rejected";

export default function GMModalDetail({
    open,
    onClose,
    data,
    allRequests,
    onSuccess,
}: GMModalDetailProps) {
    const [remark, setRemark] = useState("");
    const [saving, setSaving] = useState(false);
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
        useState<GmDecision | null>(null);
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
        setApprovedSuppliers([
            {
                rowId:
                    typeof crypto !== "undefined" &&
                        typeof crypto.randomUUID === "function"
                        ? crypto.randomUUID()
                        : `${Date.now()}-${Math.random()}`,
                companyId: "",
                companyName: "",
                truckType: data.fleet_truck_type || "",
                qty: initialQty > 0 ? initialQty : 1,
            },
        ]);
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

        const fetchTrucks = async () => {
            try {
                setLoadingTrucks(true);
                setTruckError("");

                const response = await fetch(
                    "http://192.168.158.210/api_new_truck/api/trucks.php",
                    {
                        method: "GET",
                        headers: {
                            Accept: "application/json",
                        },
                        cache: "no-store",
                    }
                );

                const responseText = await response.text();

                let result: any = null;

                try {
                    result = responseText
                        ? JSON.parse(responseText)
                        : null;
                } catch {
                    throw new Error(
                        `Truck API ไม่ได้ส่ง JSON กลับมา: ${responseText}`
                    );
                }

                if (!response.ok) {
                    throw new Error(
                        result?.message ||
                        `โหลดข้อมูลรถไม่สำเร็จ HTTP ${response.status}`
                    );
                }

                const list = Array.isArray(result)
                    ? result
                    : Array.isArray(result?.data)
                        ? result.data
                        : Array.isArray(result?.result)
                            ? result.result
                            : [];

                setTrucks(list);
            } catch (error: any) {
                console.error("FETCH TRUCKS ERROR:", error);

                setTrucks([]);

                setTruckError(
                    error?.message ||
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล Truck Type"
                );
            } finally {
                setLoadingTrucks(false);
            }
        };

        void fetchTrucks();
    }, [open]);

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
        const values = new Set<string>();

        trucks.forEach((item) => {
            const truckType = getTruckTypeValue(item);

            if (truckType) {
                values.add(truckType);
            }
        });

        const requestedTruckType = String(
            data.fleet_truck_type || ""
        ).trim();

        if (requestedTruckType) {
            values.add(requestedTruckType);
        }

        return Array.from(values).sort((a, b) =>
            a.localeCompare(b, "en", {
                numeric: true,
                sensitivity: "base",
            })
        );
    }, [trucks, data.fleet_truck_type]);

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
        const selectedSupplier = suppliers.find(
            (item) =>
                getSupplierCompanyName(item) ===
                companyName
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

    const totalApprovedQty = useMemo(() => {
        return approvedSuppliers.reduce(
            (total, item) =>
                total + Number(item.qty || 0),
            0
        );
    }, [approvedSuppliers]);

    const remainingQty = useMemo(() => {
        return Math.max(
            requestedQty - totalApprovedQty,
            0
        );
    }, [requestedQty, totalApprovedQty]);

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
        if (!data.id) {
            setMessage({
                type: "error",
                text: "ไม่พบ ID ของรายการนี้ ไม่สามารถอัปเดตได้",
            });

            return;
        }

        if (approvedSuppliers.length === 0) {
            setMessage({
                type: "error",
                text: "กรุณาเพิ่มซัพพลายเออร์อย่างน้อย 1 รายการ",
            });

            return;
        }

        const invalidSupplier =
            approvedSuppliers.find(
                (item) =>
                    !item.companyName.trim() ||
                    !item.truckType.trim() ||
                    Number(item.qty || 0) <= 0
            );

        if (invalidSupplier) {
            setMessage({
                type: "error",
                text: "กรุณาเลือกซัพพลายเออร์ ประเภทรถ และจำนวนคันให้ครบทุกแถว",
            });

            return;
        }

        if (totalApprovedQty <= 0) {
            setMessage({
                type: "error",
                text: "จำนวนรถที่อนุมัติต้องมากกว่า 0",
            });

            return;
        }

        if (totalApprovedQty > requestedQty) {
            setMessage({
                type: "error",
                text: `จำนวนรถที่อนุมัติรวมต้องไม่เกินจำนวนที่ขอ ${requestedQty} คัน`,
            });

            return;
        }

        try {
            setSaving(true);
            setMessage(null);

            const approvedBy = getCurrentUserText();

            const payload = {
                id: Number(data.id),
              
                // กดบันทึกแล้วส่งรายการเข้าสู่ Process
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
              
                status_details: remark.trim(),
              };

            console.log(
                "========== REQUEST APPROVE PAYLOAD =========="
            );
            console.log(payload);
            console.log(
                "============================================="
            );

            const response = await fetch(
                "http://192.168.158.210/api_new_truck/api/request_approve.php",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );

            const responseText =
                await response.text();

            let result: any = null;

            if (responseText.trim()) {
                try {
                    result =
                        JSON.parse(responseText);
                } catch {
                    throw new Error(
                        `API ไม่ได้ส่ง JSON กลับมา: ${responseText}`
                    );
                }
            }

            console.log(
                "========== REQUEST APPROVE RESPONSE =========="
            );
            console.log(
                "STATUS:",
                response.status
            );
            console.log("RESULT:", result);
            console.log(
                "=============================================="
            );

            if (
                !response.ok ||
                result?.status === "error" ||
                result?.success === false
            ) {
                throw new Error(
                    result?.message ||
                    "บันทึกข้อมูลไม่สำเร็จ"
                );
            }

            setMessage({
                type: "success",
                text:
                    result?.message ||
                    "บันทึกข้อมูลสำเร็จ",
            });

            await Promise.resolve(
                onSuccess()
            );

            setTimeout(() => {
                onClose();
            }, 700);
        } catch (error: any) {
            console.error(
                "REQUEST APPROVE ERROR:",
                error
            );

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
                status: "gm_rejected",
                approved_by: approvedBy,
                reject_reason: remark.trim(),
                status_details: remark.trim() || "GM ไม่อนุมัติคำขอ",
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
            value === "gm_pending" ||
            value === "รออนุมัติ"
        ) {
            return "รออนุมัติ";
        }

        if (
            value === "wait fleet" ||
            value === "waiting fleet" ||
            value === "รอประเมินกองรถ" ||
            value === "รอกองรถประเมิน"
        ) {
            return "รอประเมินกองรถ";
        }

        if (
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
            value === "สำเร็จ" ||
            value === "อนุมัติ"
        ) {
            return "อนุมัติ";
        }

        if (
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

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-[2px] sm:p-5"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !saving) {
                    onClose();
                }
            }}
        >
            <div className="relative flex h-[92vh] w-full max-w-[1200px] flex-col overflow-hidden rounded-3xl border border-white/70 bg-slate-100 shadow-[0_32px_120px_rgba(15,23,42,0.45)]">
                {/* HEADER */}
                <header className="relative shrink-0 overflow-hidden border-b border-slate-200 bg-white">

                    <div className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
                        <div className="flex min-w-0 items-start gap-3">
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl font-medium text-slate-400 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="ปิด"
                        >
                            ×
                        </button>
                    </div>
                </header>

                {/* BODY */}
                <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_360px]">

                        {/* TABS */}
                        <div className="min-h-0 overflow-y-auto py-2 sm:p-2">
                            <CheckDC
                                data={data}
                                allRequests={allRequests}
                                issuePeriods={issuePeriods}
                            />
                        </div>

                        {/* RIGHT APPROVAL PANEL */}
                        <aside className="min-w-0">
                            <div className="space-y-4 lg:sticky lg:top-4">
                                <div className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.10)]">
                                    {/* Header */}
                                    <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-5 py-4 text-white">
                                        <p className="text-sm font-black">
                                            ขั้นตอนการพิจารณาคำขอรถใหม่
                                        </p>

                                        <p className="mt-1 text-[11px] font-medium text-white/75">
                                            กำหนดซัพพลายเออร์และจำนวนรถที่อนุมัติ
                                        </p>
                                    </div>

                                    <div className="space-y-5 p-5">
                                        {/* Message */}
                                        {message && (
                                            <div
                                                className={`rounded-xl border px-3 py-2.5 text-xs font-bold ${message.type ===
                                                    "success"
                                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                    : "border-rose-200 bg-rose-50 text-rose-700"
                                                    }`}
                                            >
                                                {message.text}
                                            </div>
                                        )}

                                        {/* Requested quantity */}
                                        <div className="overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
                                            <div className="flex items-center justify-between gap-4 px-4 py-4">
                                                <div>
                                                    <p className="text-xs font-black text-blue-700">
                                                        จำนวนรถที่ขอ
                                                    </p>

                                                    <p className="mt-1 text-[10px] font-medium text-slate-400">
                                                        Requested Quantity
                                                    </p>
                                                </div>

                                                <div className="text-right">
                                                    <span className="text-3xl font-black text-blue-800">
                                                        {formatNumber(
                                                            requestedQty
                                                        )}
                                                    </span>

                                                    <span className="ml-1 text-sm font-bold text-slate-500">
                                                        คัน
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 border-t border-blue-100 bg-white/60">
                                                <div className="px-4 py-3">
                                                    <p className="text-[10px] font-bold text-slate-400">
                                                        จำนวนที่จัดสรร
                                                    </p>

                                                    <p
                                                        className={`mt-1 text-lg font-black ${totalApprovedQty >
                                                            requestedQty
                                                            ? "text-rose-700"
                                                            : "text-emerald-700"
                                                            }`}
                                                    >
                                                        {formatNumber(
                                                            totalApprovedQty
                                                        )}{" "}
                                                        คัน
                                                    </p>
                                                </div>

                                                <div className="border-l border-blue-100 px-4 py-3">
                                                    <p className="text-[10px] font-bold text-slate-400">
                                                        จำนวนคงเหลือ
                                                    </p>

                                                    <p
                                                        className={`mt-1 text-lg font-black ${remainingQty === 0
                                                            ? "text-slate-700"
                                                            : "text-amber-700"
                                                            }`}
                                                    >
                                                        {formatNumber(
                                                            remainingQty
                                                        )}{" "}
                                                        คัน
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Supplier section */}
                                        <div>
                                            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                                                <div>
                                                    <label className="text-xs font-black text-slate-700">
                                                        ซัพพลายเออร์ที่อนุมัติ
                                                        & จำนวนคัน
                                                        <span className="ml-1 text-rose-500">
                                                            *
                                                        </span>
                                                    </label>

                                                    <p className="mt-1 text-[10px] font-medium leading-4 text-slate-400">
                                                        สามารถแบ่งจำนวนรถให้หลายซัพพลายเออร์ได้
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    disabled={saving}
                                                    onClick={
                                                        addApprovedSupplier
                                                    }
                                                    className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 text-[11px] font-black text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <span className="text-base leading-none">
                                                        +
                                                    </span>

                                                    เพิ่มซัพพลายเออร์
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                {approvedSuppliers.map(
                                                    (row, index) => (
                                                        <div
                                                            key={row.rowId}
                                                            className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3"
                                                        >
                                                            <div className="mb-2 flex items-center justify-between gap-3">
                                                                <p className="text-[10px] font-black text-slate-500">
                                                                    รายการที่{" "}
                                                                    {index + 1}
                                                                </p>

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
                                                                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-lg leading-none text-rose-600 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                                            aria-label="ลบซัพพลายเออร์"
                                                                        >
                                                                            ×
                                                                        </button>
                                                                    )}
                                                            </div>

                                                            <div className="space-y-2">
                                                                {/* Supplier */}
                                                                <div>
                                                                    <label className="mb-1 block text-[10px] font-bold text-slate-500">
                                                                        ซัพพลายเออร์
                                                                    </label>

                                                                    <select
                                                                        value={
                                                                            row.companyName
                                                                        }
                                                                        disabled={
                                                                            saving ||
                                                                            loadingSuppliers
                                                                        }
                                                                        onChange={(
                                                                            event
                                                                        ) =>
                                                                            handleSupplierChange(
                                                                                row.rowId,
                                                                                event.target
                                                                                    .value
                                                                            )
                                                                        }
                                                                        className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                                                                    >
                                                                        <option value="">
                                                                            {loadingSuppliers
                                                                                ? "กำลังโหลดซัพพลายเออร์..."
                                                                                : "-- เลือกซัพพลายเออร์ --"}
                                                                        </option>

                                                                        {supplierOptions.map(
                                                                            (
                                                                                supplierName
                                                                            ) => (
                                                                                <option
                                                                                    key={
                                                                                        supplierName
                                                                                    }
                                                                                    value={
                                                                                        supplierName
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        supplierName
                                                                                    }
                                                                                </option>
                                                                            )
                                                                        )}
                                                                    </select>
                                                                </div>

                                                                <div className="grid grid-cols-[minmax(0,1fr)_90px] gap-2">
                                                                    {/* Truck Type */}
                                                                    <div>
                                                                        <label className="mb-1 block text-[10px] font-bold text-slate-500">
                                                                            ประเภทรถ
                                                                        </label>

                                                                        <select
                                                                            value={row.truckType}
                                                                            disabled={saving || loadingTrucks}
                                                                            onChange={(event) =>
                                                                                updateApprovedSupplier(
                                                                                    row.rowId,
                                                                                    "truckType",
                                                                                    event.target.value
                                                                                )
                                                                            }
                                                                            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                                                                        >
                                                                            <option value="">
                                                                                {loadingTrucks
                                                                                    ? "กำลังโหลดประเภทรถ..."
                                                                                    : "-- เลือกประเภทรถ --"}
                                                                            </option>

                                                                            {truckTypeOptions.map((truckType) => (
                                                                                <option
                                                                                    key={truckType}
                                                                                    value={truckType}
                                                                                >
                                                                                    {formatTruckTypeLabel(truckType)}
                                                                                </option>
                                                                            ))}
                                                                        </select>

                                                                        {truckError && (
                                                                            <p className="mt-1 text-[10px] font-bold text-rose-600">
                                                                                {truckError}
                                                                            </p>
                                                                        )}
                                                                    </div>

                                                                    {/* Quantity */}
                                                                    <div>
                                                                        <label className="mb-1 block text-[10px] font-bold text-slate-500">
                                                                            จำนวน
                                                                        </label>

                                                                        <input
                                                                            type="number"
                                                                            min={1}
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
                                                                            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-center text-sm font-black text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {row.companyId && (
                                                                    <p className="text-[10px] font-medium text-slate-400">
                                                                        Company ID:{" "}
                                                                        {row.companyId}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </div>

                                        {/* Quantity errors */}
                                        {totalApprovedQty >
                                            requestedQty && (
                                                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5">
                                                    <p className="text-xs font-bold text-rose-700">
                                                        จำนวนรถที่จัดสรรรวม{" "}
                                                        {formatNumber(
                                                            totalApprovedQty
                                                        )}{" "}
                                                        คัน เกินจำนวนที่ขอ{" "}
                                                        {formatNumber(
                                                            requestedQty
                                                        )}{" "}
                                                        คัน
                                                    </p>
                                                </div>
                                            )}

                                        {totalApprovedQty <
                                            requestedQty &&
                                            totalApprovedQty > 0 && (
                                                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                                                    <p className="text-xs font-bold text-amber-700">
                                                        ยังเหลือรถที่ยังไม่ได้จัดสรร{" "}
                                                        {formatNumber(
                                                            remainingQty
                                                        )}{" "}
                                                        คัน
                                                    </p>
                                                </div>
                                            )}

                                        {/* Remark */}
                                        <div>
                                            <label className="mb-1.5 block text-xs font-bold text-slate-600">
                                                รายละเอียดการจัดรถ /
                                                หมายเหตุเพิ่มเติม
                                            </label>

                                            <textarea
                                                rows={3}
                                                value={remark}
                                                disabled={saving}
                                                onChange={(event) => {
                                                    setRemark(
                                                        event.target.value
                                                    );

                                                    setMessage(null);
                                                }}
                                                placeholder="ระบุรายละเอียดเพิ่มเติม..."
                                                className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                                            />
                                        </div>

                                        {/* Submit */}
                                        <button
                                            type="button"
                                            disabled={
                                                saving ||
                                                !isSupplierRowsValid ||
                                                totalApprovedQty <= 0 ||
                                                totalApprovedQty >
                                                requestedQty
                                            }
                                            onClick={() =>
                                                void approveRequest()
                                            }
                                            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-black text-white shadow-lg shadow-blue-700/20 transition hover:-translate-y-0.5 hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                                        >
                                            {saving && (
                                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                            )}

                                            {saving
                                                ? "กำลังบันทึก..."
                                                : "ยืนยันซัพพลายเออร์และจำนวนรถ"}
                                        </button>

                                        {/* Reject request */}
                                        {!confirmDecision && (
                                            <button
                                                type="button"
                                                disabled={saving}
                                                onClick={() => {
                                                    setMessage(null);
                                                    setConfirmDecision("gm_rejected");
                                                }}
                                                className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-black text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                ไม่อนุมัติคำขอ
                                            </button>
                                        )}

                                        {confirmDecision === "gm_rejected" && (
                                            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                                                <p className="text-sm font-black text-rose-800">
                                                    ยืนยันไม่อนุมัติคำขอ?
                                                </p>

                                                <p className="mt-1 text-xs font-semibold text-slate-600">
                                                    {data.running_doc || "-"}
                                                </p>

                                                {!remark.trim() && (
                                                    <p className="mt-2 text-xs font-bold text-rose-600">
                                                        กรุณาระบุเหตุผลก่อนยืนยัน
                                                    </p>
                                                )}

                                                <div className="mt-4 grid grid-cols-2 gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={saving}
                                                        onClick={() => setConfirmDecision(null)}
                                                        className="h-10 rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                                                    >
                                                        ย้อนกลับ
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={saving || !remark.trim()}
                                                        onClick={() => void rejectRequest()}
                                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-3 text-xs font-black text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        {saving && (
                                                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                                        )}

                                                        {saving ? "กำลังบันทึก..." : "ยืนยันไม่อนุมัติ"}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            onClick={onClose}
                                            disabled={saving}
                                            className="h-10 w-full rounded-xl border border-slate-300 bg-white text-xs font-black text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            ปิดหน้าต่าง
                                        </button>
                                    </div>
                                </div>

                            </div>
                        </aside>
                    </div>
                </div>

            </div>


        </div>
    );
}
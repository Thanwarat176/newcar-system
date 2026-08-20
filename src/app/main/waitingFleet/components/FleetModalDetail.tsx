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
    status?: string | null;

    license?: string;
    province?: string;
    truck_type?: string;
    company_id?: string;
    company_name?: string;

    // ชื่อฟิลด์จริงใน details
    license_replace?: string;
    province_replace?: string;
    truck_type_replace?: string;
    company_id_replace?: string;
    company_name_replace?: string;

    // ชื่อที่ใช้ภายในหน้า
    detail_license_replace?: string;
    detail_province_replace?: string;
    detail_truck_type_replace?: string;
    detail_company_id_replace?: string;
    detail_company_name_replace?: string;
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

    LICENSE?: string;
    license?: string;

    PROVINCE?: string;
    province?: string;

    COMPANY_ID?: string;
    company_id?: string;

    ONLY_COMPANY_NAME?: string;
    only_company_name?: string;

    COMPANY_NAME?: string;
    company_name?: string;

    TRUCK_TYPE?: string;
    truck_type?: string;
    truckType?: string;

    STATUS?: string;
    status?: string;

    STATUS_APPROVE?: string;
    status_approve?: string;

    name?: string;
    Name?: string;

    [key: string]: any;
}

interface ReplacementVehicleOption {
    license: string;
    province: string;
    companyId: string;
    companyName: string;
    truckType: string;
}

type SingleVehicleDecision =
    | "pending"
    | "approved"
    | "rejected";

interface SingleVehicleState {
    decision: SingleVehicleDecision;

    newLicense: string;
    newProvince: string;

    companyId: string;
    companyName: string;

    truckType: string;

    approvedSaved: boolean;
    error: string;
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

const THAI_PROVINCES = [
    "กรุงเทพมหานคร",
    "กระบี่",
    "กาญจนบุรี",
    "กาฬสินธุ์",
    "กำแพงเพชร",
    "ขอนแก่น",
    "จันทบุรี",
    "ฉะเชิงเทรา",
    "ชลบุรี",
    "ชัยนาท",
    "ชัยภูมิ",
    "ชุมพร",
    "เชียงราย",
    "เชียงใหม่",
    "ตรัง",
    "ตราด",
    "ตาก",
    "นครนายก",
    "นครปฐม",
    "นครพนม",
    "นครราชสีมา",
    "นครศรีธรรมราช",
    "นครสวรรค์",
    "นนทบุรี",
    "นราธิวาส",
    "น่าน",
    "บึงกาฬ",
    "บุรีรัมย์",
    "ปทุมธานี",
    "ประจวบคีรีขันธ์",
    "ปราจีนบุรี",
    "ปัตตานี",
    "พระนครศรีอยุธยา",
    "พะเยา",
    "พังงา",
    "พัทลุง",
    "พิจิตร",
    "พิษณุโลก",
    "เพชรบุรี",
    "เพชรบูรณ์",
    "แพร่",
    "ภูเก็ต",
    "มหาสารคาม",
    "มุกดาหาร",
    "แม่ฮ่องสอน",
    "ยโสธร",
    "ยะลา",
    "ร้อยเอ็ด",
    "ระนอง",
    "ระยอง",
    "ราชบุรี",
    "ลพบุรี",
    "ลำปาง",
    "ลำพูน",
    "เลย",
    "ศรีสะเกษ",
    "สกลนคร",
    "สงขลา",
    "สตูล",
    "สมุทรปราการ",
    "สมุทรสงคราม",
    "สมุทรสาคร",
    "สระแก้ว",
    "สระบุรี",
    "สิงห์บุรี",
    "สุโขทัย",
    "สุพรรณบุรี",
    "สุราษฎร์ธานี",
    "สุรินทร์",
    "หนองคาย",
    "หนองบัวลำภู",
    "อ่างทอง",
    "อำนาจเจริญ",
    "อุดรธานี",
    "อุตรดิตถ์",
    "อุทัยธานี",
    "อุบลราชธานี",
] as const;

export default function FleetModalDetail({
    open,
    onClose,
    data,
    allRequests,
    onSuccess,
}: GMModalDetailProps) {
    const [remark, setRemark] = useState("");
    const [rejectReason, setRejectReason] = useState("");
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
    const [allTruckRows, setAllTruckRows] = useState<TruckItem[]>([]);

    const [singleVehicleStates, setSingleVehicleStates] = useState<
        Record<string, SingleVehicleState>
    >({});

    const [
        savingSingleVehicleKey,
        setSavingSingleVehicleKey,
    ] = useState<string | null>(null);
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
        setRejectReason("");
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
            setAllTruckRows([]);
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

                setAllTruckRows(matchedRows);

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
                setAllTruckRows([]);

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

    const isReplacementRequest =
        normalizeText(data.fleet_type) ===
        normalizeText("รถทดแทน");

    const updateSingleVehicleState = (
        rowKey: string,
        patch: Partial<SingleVehicleState>
    ) => {
        setSingleVehicleStates((previous) => {
            const currentState: SingleVehicleState =
                previous[rowKey] ?? {
                    decision: "pending",

                    newLicense: "",
                    newProvince: "",

                    companyId: "",
                    companyName: "",

                    truckType:
                        data.fleet_truck_type || "",

                    approvedSaved: false,
                    error: "",
                };

            return {
                ...previous,

                [rowKey]: {
                    ...currentState,
                    ...patch,
                },
            };
        });
    };

    const getCurrentUserText = () => {
        try {
            const rawUser =
                localStorage.getItem("userInfo") ||
                localStorage.getItem("user") ||
                localStorage.getItem("authUser");

            if (!rawUser) return "";

            const user = JSON.parse(rawUser);

            const name = String(
                user.name || user.NAME || ""
            ).trim();

            const surname = String(
                user.surname || user.SURNAME || ""
            ).trim();

            const employeeId = String(
                user.em_id ||
                user.employee_id ||
                user.EMPLOYEE_ID ||
                user.id ||
                ""
            ).trim();

            const fullName =
                `${name} ${surname}`.trim();

            if (fullName && employeeId) {
                return `${fullName} (${employeeId})`;
            }

            if (fullName) return fullName;
            if (employeeId) return employeeId;

            return "";
        } catch (error) {
            console.error(
                "GET CURRENT USER ERROR:",
                error
            );

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

    const replacementSupplierOptions = useMemo(() => {
        const supplierMap = new Map<
            string,
            {
                key: string;
                companyId: string;
                companyName: string;
                label: string;
            }
        >();

        suppliers.forEach((supplier) => {
            const companyId =
                getSupplierCompanyId(supplier);

            const companyName =
                getSupplierCompanyName(supplier);

            if (!companyName) return;

            const key =
                `${companyId}|||${companyName}`;

            if (!supplierMap.has(key)) {
                supplierMap.set(key, {
                    key,
                    companyId,
                    companyName,

                    label: companyId
                        ? `(${companyId}) ${companyName}`
                        : companyName,
                });
            }
        });

        return Array.from(
            supplierMap.values()
        ).sort((a, b) =>
            a.companyName.localeCompare(
                b.companyName,
                "th"
            )
        );
    }, [suppliers]);

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

    const replacementVehicleOptions =
        useMemo<ReplacementVehicleOption[]>(() => {
            const vehicleMap = new Map<
                string,
                ReplacementVehicleOption
            >();

            allTruckRows.forEach((item) => {
                const license = String(
                    getValueIgnoreCase(item, "LICENSE") ||
                    item.LICENSE ||
                    item.license ||
                    ""
                ).trim();

                const province = String(
                    getValueIgnoreCase(item, "PROVINCE") ||
                    item.PROVINCE ||
                    item.province ||
                    ""
                ).trim();

                const companyId = String(
                    getValueIgnoreCase(item, "COMPANY_ID") ||
                    item.COMPANY_ID ||
                    item.company_id ||
                    ""
                ).trim();

                const companyName = String(
                    getValueIgnoreCase(
                        item,
                        "ONLY_COMPANY_NAME"
                    ) ||
                    item.ONLY_COMPANY_NAME ||
                    item.only_company_name ||
                    getValueIgnoreCase(
                        item,
                        "COMPANY_NAME"
                    ) ||
                    item.COMPANY_NAME ||
                    item.company_name ||
                    ""
                ).trim();

                const truckType = String(
                    getValueIgnoreCase(item, "TRUCK_TYPE") ||
                    item.TRUCK_TYPE ||
                    item.truck_type ||
                    item.truckType ||
                    ""
                ).trim();

                const status = normalizeText(
                    getValueIgnoreCase(item, "STATUS") ||
                    item.STATUS ||
                    item.status ||
                    ""
                );

                const approveStatus = normalizeText(
                    getValueIgnoreCase(
                        item,
                        "STATUS_APPROVE"
                    ) ||
                    item.STATUS_APPROVE ||
                    item.status_approve ||
                    ""
                );

                if (!license) return;

                // ถ้ามีสถานะ ให้ใช้เฉพาะรถ Active
                if (status && status !== "ACTIVE") return;

                // ถ้ามีสถานะอนุมัติ ให้ใช้เฉพาะรถที่อนุมัติ
                if (
                    approveStatus &&
                    (
                        approveStatus.includes("ไม่อนุมัติ") ||
                        approveStatus.includes("REJECT") ||
                        (
                            !approveStatus.includes("อนุมัติ") &&
                            !approveStatus.includes("APPROV")
                        )
                    )
                ) {
                    return;
                }

                vehicleMap.set(normalizeText(license), {
                    license,
                    province,
                    companyId,
                    companyName,
                    truckType,
                });
            });

            return Array.from(vehicleMap.values()).sort(
                (a, b) =>
                    a.license.localeCompare(b.license, "th", {
                        numeric: true,
                    })
            );
        }, [allTruckRows]);


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

                approved_qty: totalApprovedQty,
                not_approved_qty: draftNotApprovedQty,

                // หมายเหตุของส่วนที่อนุมัติ
                remark: remark.trim(),

                // เหตุผลของส่วนที่ไม่อนุมัติ
                reject_reason:
                    draftNotApprovedQty > 0
                        ? rejectReason.trim()
                        : "",

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

            if (draftNotApprovedQty > 0 && !remark.trim()) {
                setMessage({
                    type: "error",
                    text: `กรุณาระบุเหตุผลที่ไม่อนุมัติ ${draftNotApprovedQty} คัน`,
                });
                return;
            }

            if (draftNotApprovedQty > 0 && !rejectReason.trim()) {
                setMessage({
                    type: "error",
                    text: `กรุณาระบุเหตุผลที่ไม่อนุมัติ ${draftNotApprovedQty} คัน`,
                });
                return;
            }

            setMessage({
                type: "success",
                text:
                    result?.message ||
                    "จัดรถและบันทึกข้อมูลเรียบร้อยแล้ว",
            });

            setDecisionCompleted(true);
            onClose();
            void Promise.resolve(onSuccess());
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
        const isMeaningfulValue = (value: unknown) => {
            const normalized = String(value ?? "")
                .trim()
                .toLowerCase();

            return ![
                "",
                "-",
                "null",
                "undefined",
                "[]",
                "ไม่มีข้อมูล",
                "ไม่พบข้อมูล",
            ].includes(normalized);
        };

        // ใช้ข้อมูลรายละเอียดจาก API ก่อน
        if (Array.isArray(data.details)) {
            const validDetails = data.details
                .map((detail) => ({
                    ...detail,

                    license: String(
                        detail.license ?? ""
                    ).trim(),

                    province: String(
                        detail.province ?? ""
                    ).trim(),

                    truck_type: String(
                        detail.truck_type ?? ""
                    ).trim(),

                    company_id: String(
                        detail.company_id ?? ""
                    ).trim(),

                    company_name: String(
                        detail.company_name ?? ""
                    ).trim(),

                    detail_license_replace: String(
                        detail.detail_license_replace ??
                        detail.license_replace ??
                        ""
                    ).trim(),

                    detail_province_replace: String(
                        detail.detail_province_replace ??
                        detail.province_replace ??
                        ""
                    ).trim(),

                    detail_truck_type_replace: String(
                        detail.detail_truck_type_replace ??
                        detail.truck_type_replace ??
                        ""
                    ).trim(),

                    detail_company_id_replace: String(
                        detail.detail_company_id_replace ??
                        detail.company_id_replace ??
                        ""
                    ).trim(),

                    detail_company_name_replace: String(
                        detail.detail_company_name_replace ??
                        detail.company_name_replace ??
                        ""
                    ).trim(),
                }))
                .filter((item) =>
                    [
                        item.license,
                        item.province,
                        item.truck_type,
                        item.company_id,
                        item.company_name,
                    ].some(isMeaningfulValue)
                );

            if (validDetails.length > 0) {
                return validDetails;
            }
        }

        // กรณีไม่มี details ให้ดึงทะเบียนจาก license_replace
        let licenses: string[] = [];

        if (Array.isArray(data.license_replace)) {
            licenses = data.license_replace;
        } else {
            const rawValue = String(data.license_replace || "").trim();

            if (rawValue) {
                try {
                    const parsed = JSON.parse(rawValue);

                    licenses = Array.isArray(parsed)
                        ? parsed.map(String)
                        : [rawValue];
                } catch {
                    licenses = rawValue
                        .replace(/^\[|\]$/g, "")
                        .split(",")
                        .map((license) =>
                            String(license)
                                .replace(/["']/g, "")
                                .trim()
                        );
                }
            }
        }

        return licenses
            .filter(isMeaningfulValue)
            .map((license, index) => ({
                id: `fallback-${index}`,
                license: String(license).trim(),
                province: "",
                truck_type: "",
                company_id: "",
                company_name: "",
            }));
    }, [data.details, data.license_replace]);

    const getReplacementRowKey = (
        item: RequestDetailItem,
        index: number
    ) => {
        return String(
            item.id ||
            `${item.license || "vehicle"}-${index}`
        );
    };

    useEffect(() => {
        if (!open) return;

        setSingleVehicleStates((previous) => {
            const nextStates: Record<
                string,
                SingleVehicleState
            > = {};

            replacementTruckRows.forEach(
                (item, index) => {
                    const rowKey =
                        getReplacementRowKey(
                            item,
                            index
                        );

                    const savedLicense = String(
                        item.detail_license_replace ??
                        item.license_replace ??
                        ""
                    ).trim();

                    const savedProvince = String(
                        item.detail_province_replace ??
                        item.province_replace ??
                        ""
                    ).trim();

                    const savedCompanyId = String(
                        item.detail_company_id_replace ??
                        item.company_id_replace ??
                        ""
                    ).trim();

                    const savedCompanyName = String(
                        item.detail_company_name_replace ??
                        item.company_name_replace ??
                        ""
                    ).trim();

                    const savedTruckType = String(
                        item.detail_truck_type_replace ??
                        item.truck_type_replace ??
                        item.truck_type ??
                        data.fleet_truck_type ??
                        ""
                    ).trim();

                    const currentState =
                        previous[rowKey];

                    /*
                     * เก็บผลการอนุมัติที่เพิ่งกดไว้
                     * ไม่ให้ useEffect เขียนทับกลับเป็น pending
                     */
                    if (
                        currentState?.approvedSaved ||
                        currentState?.decision === "rejected"
                    ) {
                        nextStates[rowKey] =
                            currentState;

                        return;
                    }

                    const savedStatus = String(item.status || "")
                        .trim()
                        .toLowerCase();

                    const alreadyApproved =
                        savedStatus === "progress";

                    const alreadyRejected =
                        savedStatus === "reject_by_fbp";

                    nextStates[rowKey] = {
                        decision: alreadyApproved
                            ? "approved"
                            : alreadyRejected
                                ? "rejected"
                                : "pending",

                        newLicense: savedLicense,
                        newProvince: savedProvince,
                        companyId: savedCompanyId,
                        companyName: savedCompanyName,
                        truckType: savedTruckType,

                        approvedSaved: alreadyApproved,
                        error: "",
                    };
                }
            );

            return nextStates;
        });
    }, [
        open,
        data.id,
        data.fleet_truck_type,
        replacementTruckRows,
    ]);

    const singleVehicleSummary = useMemo(() => {
        let approved = 0;
        let rejected = 0;

        replacementTruckRows.forEach((item, index) => {
            const rowKey = getReplacementRowKey(item, index);
            const rowState = singleVehicleStates[rowKey];

            if (rowState?.approvedSaved || rowState?.decision === "approved") {
                approved += 1;
            } else if (rowState?.decision === "rejected") {
                rejected += 1;
            }
        });

        return {
            approved,
            rejected,
            pending: Math.max(
                replacementTruckRows.length - approved - rejected,
                0
            ),
        };
    }, [replacementTruckRows, singleVehicleStates]);

    const handleNewVehicleChange = (
        rowKey: string,
        newLicense: string
    ) => {
        if (!newLicense) {
            updateSingleVehicleState(rowKey, {
                decision: "pending",
                newLicense: "",
                newProvince: "",
                companyId: "",
                companyName: "",
                truckType: data.fleet_truck_type || "",
                approvedSaved: false,
                error: "",
            });

            setMessage(null);
            return;
        }

        const selectedVehicle = replacementVehicleOptions.find(
            (vehicle) =>
                normalizeText(vehicle.license) ===
                normalizeText(newLicense)
        );

        if (!selectedVehicle) {
            updateSingleVehicleState(rowKey, {
                decision: "pending",
                newLicense: "",
                newProvince: "",
                companyId: "",
                companyName: "",
                truckType: data.fleet_truck_type || "",
                approvedSaved: false,
                error: "ไม่พบข้อมูลรถที่เลือก",
            });
            return;
        }

        const selectedByOtherRow = Object.entries(
            singleVehicleStates
        ).some(([otherRowKey, otherState]) => {
            return (
                otherRowKey !== rowKey &&
                normalizeText(otherState.newLicense) ===
                normalizeText(selectedVehicle.license) &&
                normalizeText(otherState.newProvince) ===
                normalizeText(selectedVehicle.province)
            );
        });

        if (selectedByOtherRow) {
            updateSingleVehicleState(rowKey, {
                decision: "pending",
                newLicense: "",
                newProvince: "",
                companyId: "",
                companyName: "",
                truckType: data.fleet_truck_type || "",
                approvedSaved: false,
                error: "ทะเบียนและจังหวัดนี้ถูกเลือกเป็นรถทดแทนให้รถคันอื่นแล้ว",
            });
            return;
        }

        updateSingleVehicleState(rowKey, {
            decision: "pending",
            newLicense: selectedVehicle.license,
            newProvince: selectedVehicle.province,
            companyId: selectedVehicle.companyId,
            companyName: selectedVehicle.companyName,
            truckType: selectedVehicle.truckType,
            approvedSaved: false,
            error: "",
        });

        setMessage(null);
    };

    const updateReplacementRequestStatus =
        async (updatedBy: string) => {
            if (!data.id) {
                throw new Error(
                    "ไม่พบ Request ID สำหรับอัปเดตสถานะ"
                );
            }

            const statusPayload = {
                id: Number(data.id),

                status: "progress",

                updated_by: updatedBy,

                status_details:
                    "อนุมัติเปิดงานเข้าสู่กระบวนการเรียบร้อยแล้ว",
            };

            console.log(
                "UPDATE REQUEST STATUS PAYLOAD:",
                statusPayload
            );

            const response = await fetch(
                "http://192.168.158.210/api_new_truck/api/update_request_status.php",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        Accept:
                            "application/json",
                    },

                    body: JSON.stringify(
                        statusPayload
                    ),
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
                        `API อัปเดตสถานะไม่ได้ส่ง JSON กลับมา: ${responseText}`
                    );
                }
            }

            if (
                !response.ok ||
                result?.success === false ||
                result?.status === "error"
            ) {
                throw new Error(
                    result?.message ||
                    "อัปเดตสถานะคำขอไม่สำเร็จ"
                );
            }

            return result;
        };

    const handleReplacementInputChange = (
        rowKey: string,
        patch: Partial<
            Pick<
                SingleVehicleState,
                | "newLicense"
                | "newProvince"
                | "truckType"
            >
        >
    ) => {
        updateSingleVehicleState(rowKey, {
            ...patch,

            decision: "pending",
            approvedSaved: false,
            error: "",
        });

        setMessage(null);
    };

    const handleReplacementCompanyChange = (
        rowKey: string,
        supplierKey: string
    ) => {
        const selectedSupplier =
            replacementSupplierOptions.find(
                (supplier) =>
                    supplier.key === supplierKey
            );

        updateSingleVehicleState(rowKey, {
            companyId:
                selectedSupplier?.companyId || "",

            companyName:
                selectedSupplier?.companyName || "",

            decision: "pending",
            approvedSaved: false,
            error: "",
        });

        setMessage(null);
    };

    const getDetailStatus = (
        item: RequestDetailItem
    ) => {
        return String(item.status || "")
            .trim()
            .toLowerCase();
    };
    
    const isDetailFinalized = (
        item: RequestDetailItem
    ) => {
        return [
            "progress",
            "reject_by_fbp",
        ].includes(getDetailStatus(item));
    };

    const approveSingleReplacementVehicle = async (
        item: RequestDetailItem,
        index: number
    ) => {
        const rowKey = getReplacementRowKey(item, index);
        const rowState = singleVehicleStates[rowKey];

        if (isDetailFinalized(item)) {
            updateSingleVehicleState(rowKey, {
                error: "รถคันนี้บันทึกผลแล้ว ไม่สามารถดำเนินการซ้ำได้",
            });
            return;
        }

        if (!canMakeDecision) {
            updateSingleVehicleState(rowKey, {
                error: "รายการนี้ไม่สามารถดำเนินการได้",
            });
            return;
        }

        if (!data.id) {
            updateSingleVehicleState(rowKey, {
                error: "ไม่พบ Request ID",
            });
            return;
        }

        if (!rowState) {
            updateSingleVehicleState(rowKey, {
                error: "ไม่พบข้อมูลรถทดแทน",
            });
            return;
        }

        if (!rowState.newLicense.trim()) {
            updateSingleVehicleState(rowKey, {
                error: "กรุณากรอกทะเบียนรถ",
            });
            return;
        }

        if (!rowState.newProvince.trim()) {
            updateSingleVehicleState(rowKey, {
                error: "กรุณาเลือกจังหวัด",
            });
            return;
        }

        if (!rowState.companyName.trim()) {
            updateSingleVehicleState(rowKey, {
                error: "กรุณาเลือกบริษัทผู้ให้บริการ",
            });
            return;
        }

        if (!rowState.truckType.trim()) {
            updateSingleVehicleState(rowKey, {
                error: "กรุณาเลือกประเภทรถ",
            });
            return;
        }

        const originalLicense = String(
            item.license || ""
        ).trim();

        const originalProvince = String(
            item.province || ""
        ).trim();

        if (!originalLicense) {
            updateSingleVehicleState(rowKey, {
                error: "ไม่พบทะเบียนรถเดิม",
            });
            return;
        }

        if (
            normalizeText(originalLicense) ===
            normalizeText(rowState.newLicense)
        ) {
            updateSingleVehicleState(rowKey, {
                error: "ทะเบียนรถใหม่ต้องไม่ซ้ำกับรถเดิม",
            });
            return;
        }

        const selectedByOtherRow = Object.entries(
            singleVehicleStates
        ).some(([otherRowKey, otherState]) => {
            return (
                otherRowKey !== rowKey &&
                normalizeText(otherState.newLicense) ===
                normalizeText(rowState.newLicense) &&
                normalizeText(otherState.newProvince) ===
                normalizeText(rowState.newProvince)
            );
        });

        if (selectedByOtherRow) {
            updateSingleVehicleState(rowKey, {
                error: "ทะเบียนนี้ถูกเลือกให้รถคันอื่นแล้ว",
            });
            return;
        }

        const approvedBy = getCurrentUserText();

        if (!approvedBy) {
            updateSingleVehicleState(rowKey, {
                error: "ไม่พบข้อมูลผู้อนุมัติ กรุณาเข้าสู่ระบบใหม่",
            });
            return;
        }

        const payload = {
            action: "single_vehicle",

            request_id: Number(data.id),
            detail_id: Number(item.id),

            orig_license: originalLicense,
            orig_province: originalProvince,

            new_license: rowState.newLicense.trim(),
            new_province: rowState.newProvince.trim(),

            company_id: rowState.companyId.trim(),
            company_name: rowState.companyName.trim(),

            truck_type: rowState.truckType.trim(),

            status: "progress",
            approved_by: approvedBy,
        };

        try {
            setSavingSingleVehicleKey(rowKey);
            setMessage(null);

            updateSingleVehicleState(rowKey, {
                error: "",
            });

            console.log(
                "SINGLE VEHICLE PAYLOAD:",
                payload
            );

            const response = await fetch(
                "http://192.168.158.210/api_new_truck/api/request_save.php",
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
                result?.success === false ||
                result?.status === "error"
            ) {
                throw new Error(
                    result?.message ||
                    "บันทึกรถทดแทนไม่สำเร็จ"
                );
            }

            // ล็อกคันที่บันทึกแล้วทันที
            updateSingleVehicleState(rowKey, {
                decision: "approved",

                newLicense: rowState.newLicense.trim(),
                newProvince: rowState.newProvince.trim(),

                companyId: rowState.companyId.trim(),
                companyName: rowState.companyName.trim(),

                truckType: rowState.truckType.trim(),

                approvedSaved: true,
                error: "",
            });

            /*
             * ตรวจว่ารถทุกคันอนุมัติครบหรือยัง
             */
            const allDetailsDecided =
                replacementTruckRows.every(
                    (detail, detailIndex) => {
                        const detailRowKey =
                            getReplacementRowKey(
                                detail,
                                detailIndex
                            );

                        // คันที่เพิ่งบันทึก
                        if (detailRowKey === rowKey) {
                            return true;
                        }

                        const detailState =
                            singleVehicleStates[
                            detailRowKey
                            ];

                        const savedStatus = String(
                            detail.status || ""
                        )
                            .trim()
                            .toLowerCase();

                        return (
                            ["progress", "reject_by_fbp"].includes(savedStatus) ||
                            detailState?.approvedSaved === true ||
                            detailState?.decision === "rejected"
                        );
                    }
                );

            /*
             * เปลี่ยน status หลักเมื่อครบทุกคันเท่านั้น
             */
            if (allDetailsDecided) {
                await updateReplacementRequestStatus(
                    approvedBy
                );

                setMessage({
                    type: "success",
                    text: "อนุมัติรถครบทุกคัน และเปลี่ยนสถานะเป็นกำลังดำเนินการแล้ว",
                });
            } else {
                const approvedCount =
                    replacementTruckRows.filter(
                        (detail, detailIndex) => {
                            const detailRowKey =
                                getReplacementRowKey(
                                    detail,
                                    detailIndex
                                );

                            if (
                                detailRowKey === rowKey
                            ) {
                                return true;
                            }

                            const detailState =
                                singleVehicleStates[
                                detailRowKey
                                ];

                            return (
                                String(
                                    detail.status || ""
                                )
                                    .trim()
                                    .toLowerCase() ===
                                "progress" ||
                                detailState?.approvedSaved ===
                                true
                            );
                        }
                    ).length;

                setMessage({
                    type: "success",
                    text:
                        `บันทึกรถ ${originalLicense} สำเร็จ ` +
                        `(${approvedCount}/${replacementTruckRows.length} คัน)`,
                });
            }

            await Promise.resolve(onSuccess());
        } catch (error: unknown) {
            console.error(
                "APPROVE SINGLE VEHICLE ERROR:",
                error
            );

            updateSingleVehicleState(rowKey, {
                decision: "pending",
                approvedSaved: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "เกิดข้อผิดพลาดในการบันทึกรถ",
            });
        } finally {
            setSavingSingleVehicleKey(null);
        }
    };

    const rejectSingleReplacementVehicle = async (
        item: RequestDetailItem,
        index: number
    ) => {
        const rowKey = getReplacementRowKey(
            item,
            index
        );

        if (isDetailFinalized(item)) {
            updateSingleVehicleState(rowKey, {
                error: "รถคันนี้บันทึกผลแล้ว ไม่สามารถดำเนินการซ้ำได้",
            });
            return;
        }

        if (!canMakeDecision) {
            updateSingleVehicleState(rowKey, {
                error:
                    "รายการนี้ดำเนินการแล้ว ไม่สามารถบันทึกซ้ำได้",
            });

            return;
        }

        if (!data.id) {
            updateSingleVehicleState(rowKey, {
                error: "ไม่พบ Request ID",
            });

            return;
        }

        const originalLicense = String(
            item.license || ""
        ).trim();

        const originalProvince = String(
            item.province || ""
        ).trim();

        const originalTruckType = String(
            item.truck_type ||
            data.fleet_truck_type ||
            ""
        ).trim();

        if (!originalLicense) {
            updateSingleVehicleState(rowKey, {
                error:
                    "ไม่พบทะเบียนรถเดิมของรายการนี้",
            });

            return;
        }

        const approvedBy = getCurrentUserText();

        if (!approvedBy) {
            updateSingleVehicleState(rowKey, {
                error:
                    "ไม่พบข้อมูลผู้ดำเนินการ กรุณาเข้าสู่ระบบใหม่",
            });

            return;
        }

        const payload = {
            action: "single_vehicle",

            request_id: Number(data.id),
            detail_id: Number(item.id),

            orig_license: originalLicense,
            orig_province: originalProvince,

            // ไม่อนุมัติ จึงส่งข้อมูลรถใหม่เป็นค่าว่าง
            new_license: "",
            new_province: "",

            company_id: "",
            company_name: "",

            truck_type: originalTruckType,
            status: "reject_by_fbp",

            approved_by: approvedBy,
        };

        try {
            setSavingSingleVehicleKey(rowKey);
            setMessage(null);

            updateSingleVehicleState(rowKey, {
                error: "",
            });

            console.log(
                "REJECT SINGLE VEHICLE PAYLOAD:",
                payload
            );

            const response = await fetch(
                "http://192.168.158.210/api_new_truck/api/request_save.php",
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

            if (
                !response.ok ||
                result?.success === false ||
                result?.status === "error"
            ) {
                throw new Error(
                    result?.message ||
                    "บันทึกผลไม่อนุมัติรถไม่สำเร็จ"
                );
            }

            updateSingleVehicleState(rowKey, {
                decision: "rejected",
                newLicense: "",
                newProvince: "",
                companyId: "",
                companyName: "",
                truckType: originalTruckType,
                approvedSaved: false,
                error: "",
            });

            const allDetailsDecided =
                replacementTruckRows.every(
                    (detail, detailIndex) => {
                        const detailRowKey =
                            getReplacementRowKey(detail, detailIndex);

                        if (detailRowKey === rowKey) return true;

                        const detailState =
                            singleVehicleStates[detailRowKey];

                        return (
                            ["progress", "reject_by_fbp"].includes(
                                getDetailStatus(detail)
                            ) ||
                            detailState?.approvedSaved === true ||
                            detailState?.decision === "rejected"
                        );
                    }
                );

            if (allDetailsDecided) {
                await updateReplacementRequestStatus(approvedBy);
            }

            setMessage({
                type: "success",
                text:
                    result?.message ||
                    `บันทึกไม่อนุมัติรถ ${originalLicense} เรียบร้อยแล้ว`,
            });

            await Promise.resolve(onSuccess());
        } catch (error: unknown) {
            console.error(
                "REJECT SINGLE VEHICLE ERROR:",
                error
            );

            updateSingleVehicleState(rowKey, {
                decision: "pending",
                approvedSaved: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "เกิดข้อผิดพลาดในการบันทึกผลไม่อนุมัติ",
            });
        } finally {
            setSavingSingleVehicleKey(null);
        }
    };

    const formatStatusText = (status?: string) => {
        const value = normalizeStatus(status);

        if (
            value === "fbp_pending" ||
            value === "pending_fbp"
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
        (
            isFbpPending ||
            (
                isReplacementRequest &&
                normalizeStatus(data.status) === "progress"
            )
        );

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
                                    {isReplacementRequest
                                        ? "พิจารณารถทดแทนแยกเป็นรายคัน"
                                        : "ตรวจสอบข้อมูล แล้วเลือกผู้ให้บริการและจำนวนรถ"}
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
                            disabled={saving || Boolean(savingSingleVehicleKey)}
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

                            {/* รายละเอียดรถทดแทนแบบพิจารณารายคัน */}
                            {isReplacementRequest && (
                                <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
                                    {/* Header */}
                                    <div className="relative overflow-hidden border-b border-slate-200 bg-slate-950 px-4 py-4 text-white">
                                        <div className="absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-blue-600/25 to-transparent" />

                                        <div className="relative flex items-start justify-between gap-3">
                                            <div className="flex min-w-0 items-start gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                                                    <svg
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        className="h-5 w-5"
                                                        aria-hidden="true"
                                                    >
                                                        <path
                                                            d="M4 16V8.8C4 7.8 4.8 7 5.8 7h8.6c.7 0 1.3.4 1.6 1l1.3 2.5h1.2c.8 0 1.5.7 1.5 1.5V16"
                                                            stroke="currentColor"
                                                            strokeWidth="1.8"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                        <path
                                                            d="M3 16h18M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
                                                            stroke="currentColor"
                                                            strokeWidth="1.8"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    </svg>
                                                </div>

                                                <div className="min-w-0">
                                                    <h2 className="text-sm font-black">
                                                        รายละเอียดรถทดแทน
                                                    </h2>

                                                    <p className="mt-1 text-[10px] font-medium text-white/60">
                                                        กรอกข้อมูลและพิจารณารถแต่ละคันแยกกัน
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-center ring-1 ring-white/15">
                                                <p className="text-[8px] font-bold uppercase tracking-wider text-white/50">
                                                    Total
                                                </p>

                                                <p className="mt-0.5 text-base font-black">
                                                    {replacementTruckRows.length}
                                                    <span className="ml-1 text-[9px] font-bold text-white/60">
                                                        คัน
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Summary */}
                                    <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                {
                                                    label: "รอพิจารณา",
                                                    value: singleVehicleSummary.pending,
                                                    dotClass: "bg-amber-500",
                                                    valueClass: "text-amber-700",
                                                    bgClass: "bg-amber-50",
                                                    borderClass: "border-amber-200",
                                                },
                                                {
                                                    label: "อนุมัติ",
                                                    value: singleVehicleSummary.approved,
                                                    dotClass: "bg-emerald-500",
                                                    valueClass: "text-emerald-700",
                                                    bgClass: "bg-emerald-50",
                                                    borderClass: "border-emerald-200",
                                                },
                                                {
                                                    label: "ไม่อนุมัติ",
                                                    value: singleVehicleSummary.rejected,
                                                    dotClass: "bg-rose-500",
                                                    valueClass: "text-rose-700",
                                                    bgClass: "bg-rose-50",
                                                    borderClass: "border-rose-200",
                                                },
                                            ].map((summary) => (
                                                <div
                                                    key={summary.label}
                                                    className={`rounded-xl border px-2.5 py-2 ${summary.bgClass} ${summary.borderClass}`}
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        <span
                                                            className={`h-1.5 w-1.5 rounded-full ${summary.dotClass}`}
                                                        />

                                                        <p className="truncate text-[8px] font-black text-slate-500">
                                                            {summary.label}
                                                        </p>
                                                    </div>

                                                    <p
                                                        className={`mt-1 text-right text-lg font-black ${summary.valueClass}`}
                                                    >
                                                        {summary.value}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Vehicle rows */}
                                    {replacementTruckRows.length === 0 ? (
                                        <div className="px-6 py-14 text-center">
                                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                                <svg
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    className="h-6 w-6"
                                                    aria-hidden="true"
                                                >
                                                    <path
                                                        d="M12 8v4m0 4h.01M10.3 4.9 3.7 16.3A2 2 0 0 0 5.4 19h13.2a2 2 0 0 0 1.7-2.7L13.7 4.9a2 2 0 0 0-3.4 0Z"
                                                        stroke="currentColor"
                                                        strokeWidth="1.8"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            </div>

                                            <p className="mt-3 text-xs font-black text-slate-600">
                                                ไม่พบรายละเอียดรถทดแทน
                                            </p>

                                            <p className="mt-1 text-[10px] font-medium text-slate-400">
                                                กรุณาตรวจสอบข้อมูลรายละเอียดจากคำขอ
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 bg-slate-100/70 p-3">
                                            {replacementTruckRows.map((item, index) => {
                                                const rowKey =
                                                    getReplacementRowKey(
                                                        item,
                                                        index
                                                    );

                                                const rowState:
                                                    SingleVehicleState =
                                                    singleVehicleStates[rowKey] ?? {
                                                        decision: "pending",

                                                        newLicense: "",
                                                        newProvince: "",

                                                        companyId: "",
                                                        companyName: "",

                                                        truckType:
                                                            data.fleet_truck_type ||
                                                            "",

                                                        approvedSaved: false,
                                                        error: "",
                                                    };

                                                const originalLicense = String(
                                                    item.license || ""
                                                ).trim();

                                                const originalProvince = String(
                                                    item.province || ""
                                                ).trim();

                                                const originalTruckType = String(
                                                    item.truck_type || ""
                                                ).trim();

                                                const originalCompanyId = String(
                                                    item.company_id || ""
                                                ).trim();

                                                const originalCompanyName = String(
                                                    item.company_name || ""
                                                ).trim();

                                                const isRowSaving =
                                                    savingSingleVehicleKey ===
                                                    rowKey;

                                                const currentCompanyKey =
                                                    rowState.companyName
                                                        ? `${rowState.companyId}|||${rowState.companyName}`
                                                        : "";

                                                const companyOptionsForRow = [
                                                    ...(
                                                        currentCompanyKey &&
                                                            !replacementSupplierOptions.some(
                                                                (supplier) =>
                                                                    supplier.key ===
                                                                    currentCompanyKey
                                                            )
                                                            ? [
                                                                {
                                                                    key:
                                                                        currentCompanyKey,

                                                                    companyId:
                                                                        rowState.companyId,

                                                                    companyName:
                                                                        rowState.companyName,

                                                                    label:
                                                                        rowState.companyId
                                                                            ? `(${rowState.companyId}) ${rowState.companyName}`
                                                                            : rowState.companyName,
                                                                },
                                                            ]
                                                            : []
                                                    ),

                                                    ...replacementSupplierOptions,
                                                ];

                                                const isApproved =
                                                    rowState.approvedSaved ||
                                                    getDetailStatus(item) === "progress";

                                                const isRejected =
                                                    rowState.decision ===
                                                    "rejected" ||
                                                    getDetailStatus(item) === "reject_by_fbp";

                                                const isFinalized =
                                                    isApproved || isRejected;

                                                return (
                                                    <article
                                                        key={rowKey}
                                                        className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${isApproved
                                                            ? "border-emerald-200"
                                                            : isRejected
                                                                ? "border-rose-200"
                                                                : "border-slate-200"
                                                            }`}
                                                    >
                                                        {/* Row heading */}
                                                        <div
                                                            className={`flex items-center justify-between gap-3 border-b px-3 py-3 ${isApproved
                                                                ? "border-emerald-100 bg-emerald-50/70"
                                                                : isRejected
                                                                    ? "border-rose-100 bg-rose-50/70"
                                                                    : "border-slate-200 bg-white"
                                                                }`}
                                                        >
                                                            <div className="flex min-w-0 items-center gap-2.5">
                                                                <span
                                                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-black ${isApproved
                                                                        ? "bg-emerald-600 text-white"
                                                                        : isRejected
                                                                            ? "bg-rose-600 text-white"
                                                                            : "bg-slate-900 text-white"
                                                                        }`}
                                                                >
                                                                    {index + 1}
                                                                </span>

                                                                <div className="min-w-0">
                                                                    <p className="text-[9px] font-bold text-slate-400">
                                                                        รถที่ขอทดแทน
                                                                    </p>

                                                                    <p className="truncate text-xs font-black text-slate-900">
                                                                        {originalLicense ||
                                                                            "ไม่พบทะเบียน"}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {isApproved ? (
                                                                <span className="shrink-0 rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-[9px] font-black text-emerald-700">
                                                                    ✓ อนุมัติแล้ว
                                                                </span>
                                                            ) : isRejected ? (
                                                                <span className="shrink-0 rounded-full border border-rose-200 bg-white px-2.5 py-1 text-[9px] font-black text-rose-700">
                                                                    × ไม่อนุมัติ
                                                                </span>
                                                            ) : (
                                                                <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[9px] font-black text-amber-700">
                                                                    รอพิจารณา
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="p-3">
                                                            {/* Original vehicle */}
                                                            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                                                <div className="absolute inset-y-0 left-0 w-1 bg-slate-300" />

                                                                <div className="px-3 py-3 pl-4">
                                                                    <div className="flex items-start justify-between gap-3">
                                                                        <div className="min-w-0">
                                                                            <p className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400">
                                                                                Original vehicle
                                                                            </p>

                                                                            <p className="mt-1 break-words text-sm font-black text-slate-900">
                                                                                {originalLicense ||
                                                                                    "-"}

                                                                                {originalProvince
                                                                                    ? ` · ${originalProvince}`
                                                                                    : ""}
                                                                            </p>
                                                                        </div>

                                                                        {originalTruckType && (
                                                                            <span className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[9px] font-black text-slate-600">
                                                                                {
                                                                                    originalTruckType
                                                                                }
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {(originalCompanyId ||
                                                                        originalCompanyName) && (
                                                                            <p className="mt-1.5 break-words text-[10px] font-semibold leading-relaxed text-slate-500">
                                                                                {originalCompanyId
                                                                                    ? `(${originalCompanyId}) `
                                                                                    : ""}

                                                                                {originalCompanyName ||
                                                                                    "-"}
                                                                            </p>
                                                                        )}
                                                                </div>
                                                            </div>

                                                            {/* Connector */}
                                                            {!isRejected && (
                                                                <div className="relative flex h-8 items-center justify-center">
                                                                    <div className="absolute bottom-0 top-0 w-px bg-slate-200" />

                                                                    <span className="relative flex h-6 w-6 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-600 shadow-sm">
                                                                        <svg
                                                                            viewBox="0 0 24 24"
                                                                            fill="none"
                                                                            className="h-3.5 w-3.5"
                                                                            aria-hidden="true"
                                                                        >
                                                                            <path
                                                                                d="m7 10 5 5 5-5"
                                                                                stroke="currentColor"
                                                                                strokeWidth="2"
                                                                                strokeLinecap="round"
                                                                                strokeLinejoin="round"
                                                                            />
                                                                        </svg>
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {/* Replacement form */}
                                                            {!isRejected && (
                                                                <div
                                                                    className={`overflow-hidden rounded-xl border ${isApproved
                                                                        ? "border-emerald-200 bg-emerald-50/30"
                                                                        : "border-blue-200 bg-blue-50/30"
                                                                        }`}
                                                                >
                                                                    <div
                                                                        className={`flex items-center justify-between gap-3 border-b px-3 py-2.5 ${isApproved
                                                                            ? "border-emerald-100 bg-emerald-50"
                                                                            : "border-blue-100 bg-blue-50"
                                                                            }`}
                                                                    >
                                                                        <div>
                                                                            <p
                                                                                className={`text-[10px] font-black ${isApproved
                                                                                    ? "text-emerald-900"
                                                                                    : "text-blue-900"
                                                                                    }`}
                                                                            >
                                                                                ข้อมูลรถทดแทน
                                                                            </p>

                                                                            <p
                                                                                className={`mt-0.5 text-[8px] font-medium ${isApproved
                                                                                    ? "text-emerald-600"
                                                                                    : "text-blue-600"
                                                                                    }`}
                                                                            >
                                                                                กรอกข้อมูลรถที่ใช้ทดแทนคันเดิม
                                                                            </p>
                                                                        </div>

                                                                        {isApproved && (
                                                                            <span className="rounded-md bg-emerald-600 px-2 py-1 text-[8px] font-black text-white">
                                                                                SAVED
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    <div className="space-y-3 p-3">
                                                                        {/* License + Province */}
                                                                        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
                                                                            <label className="block min-w-0">
                                                                                <span className="mb-1.5 block text-[9px] font-black text-slate-600">
                                                                                    ทะเบียนรถ
                                                                                    <span className="ml-1 text-rose-500">
                                                                                        *
                                                                                    </span>
                                                                                </span>

                                                                                <input
                                                                                    type="text"
                                                                                    value={
                                                                                        rowState.newLicense
                                                                                    }
                                                                                    disabled={
                                                                                        isFinalized ||
                                                                                        !canMakeDecision ||
                                                                                        isRowSaving
                                                                                    }
                                                                                    onChange={(
                                                                                        event
                                                                                    ) =>
                                                                                        handleReplacementInputChange(
                                                                                            rowKey,
                                                                                            {
                                                                                                newLicense:
                                                                                                    event
                                                                                                        .target
                                                                                                        .value,
                                                                                            }
                                                                                        )
                                                                                    }
                                                                                    placeholder="เช่น 2ฒม-1181"
                                                                                    autoComplete="off"
                                                                                    className="h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-[11px] font-bold text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:border-emerald-200 disabled:bg-emerald-50 disabled:text-emerald-800"
                                                                                />
                                                                            </label>

                                                                            <label className="block min-w-0">
                                                                                <span className="mb-1.5 block text-[9px] font-black text-slate-600">
                                                                                    จังหวัด
                                                                                    <span className="ml-1 text-rose-500">
                                                                                        *
                                                                                    </span>
                                                                                </span>

                                                                                <div className="relative">
                                                                                    <input
                                                                                        type="text"
                                                                                        list={`province-options-${rowKey}`}
                                                                                        value={
                                                                                            rowState.newProvince
                                                                                        }
                                                                                        disabled={
                                                                                            isFinalized ||
                                                                                            !canMakeDecision ||
                                                                                            isRowSaving
                                                                                        }
                                                                                        onChange={(
                                                                                            event
                                                                                        ) =>
                                                                                            handleReplacementInputChange(
                                                                                                rowKey,
                                                                                                {
                                                                                                    newProvince:
                                                                                                        event
                                                                                                            .target
                                                                                                            .value,
                                                                                                }
                                                                                            )
                                                                                        }
                                                                                        placeholder="เลือกจังหวัด"
                                                                                        autoComplete="off"
                                                                                        className="h-10 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 pr-8 text-[11px] font-bold text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:border-emerald-200 disabled:bg-emerald-50 disabled:text-emerald-800"
                                                                                    />

                                                                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[8px] text-slate-400">
                                                                                        ▼
                                                                                    </span>

                                                                                    <datalist
                                                                                        id={`province-options-${rowKey}`}
                                                                                    >
                                                                                        {THAI_PROVINCES.map(
                                                                                            (
                                                                                                province
                                                                                            ) => (
                                                                                                <option
                                                                                                    key={
                                                                                                        province
                                                                                                    }
                                                                                                    value={
                                                                                                        province
                                                                                                    }
                                                                                                />
                                                                                            )
                                                                                        )}
                                                                                    </datalist>
                                                                                </div>
                                                                            </label>
                                                                        </div>

                                                                        {/* Company */}
                                                                        <label className="block">
                                                                            <div className="mb-1.5 flex items-center justify-between gap-2">
                                                                                <span className="text-[9px] font-black text-slate-600">
                                                                                    บริษัทผู้ให้บริการ
                                                                                    <span className="ml-1 text-rose-500">
                                                                                        *
                                                                                    </span>
                                                                                </span>

                                                                                {rowState.companyId && (
                                                                                    <span className="text-[8px] font-bold text-slate-400">
                                                                                        ID:{" "}
                                                                                        {
                                                                                            rowState.companyId
                                                                                        }
                                                                                    </span>
                                                                                )}
                                                                            </div>

                                                                            <select
                                                                                value={
                                                                                    currentCompanyKey
                                                                                }
                                                                                disabled={
                                                                                    isFinalized ||
                                                                                    !canMakeDecision ||
                                                                                    isRowSaving ||
                                                                                    loadingSuppliers
                                                                                }
                                                                                onChange={(
                                                                                    event
                                                                                ) =>
                                                                                    handleReplacementCompanyChange(
                                                                                        rowKey,
                                                                                        event
                                                                                            .target
                                                                                            .value
                                                                                    )
                                                                                }
                                                                                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[11px] font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:border-emerald-200 disabled:bg-emerald-50 disabled:text-emerald-800"
                                                                            >
                                                                                <option value="">
                                                                                    {loadingSuppliers
                                                                                        ? "กำลังโหลดข้อมูลบริษัท..."
                                                                                        : "-- เลือกบริษัทผู้ให้บริการ --"}
                                                                                </option>

                                                                                {companyOptionsForRow.map(
                                                                                    (
                                                                                        supplier
                                                                                    ) => (
                                                                                        <option
                                                                                            key={
                                                                                                supplier.key
                                                                                            }
                                                                                            value={
                                                                                                supplier.key
                                                                                            }
                                                                                        >
                                                                                            {
                                                                                                supplier.label
                                                                                            }
                                                                                        </option>
                                                                                    )
                                                                                )}
                                                                            </select>
                                                                        </label>

                                                                        {/* Truck type */}
                                                                        <label className="block">
                                                                            <span className="mb-1.5 block text-[9px] font-black text-slate-600">
                                                                                ประเภทรถ
                                                                                <span className="ml-1 text-rose-500">
                                                                                    *
                                                                                </span>
                                                                            </span>

                                                                            <select
                                                                                value={rowState.truckType}
                                                                                disabled={
                                                                                    isFinalized ||
                                                                                    !canMakeDecision ||
                                                                                    isRowSaving ||
                                                                                    loadingTrucks
                                                                                }
                                                                                onChange={(event) =>
                                                                                    handleReplacementInputChange(rowKey, {
                                                                                        truckType: event.target.value,
                                                                                    })
                                                                                }
                                                                                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[11px] font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:border-emerald-200 disabled:bg-emerald-50 disabled:text-emerald-800"
                                                                            >
                                                                                <option value="">
                                                                                    {loadingTrucks
                                                                                        ? "กำลังโหลดประเภทรถ..."
                                                                                        : "-- เลือกประเภทรถ --"}
                                                                                </option>

                                                                                {truckTypeOptions.map((truckType) => (
                                                                                    <option key={truckType} value={truckType}>
                                                                                        {formatTruckTypeLabel(truckType)}
                                                                                    </option>
                                                                                ))}
                                                                            </select>
                                                                        </label>

                                                                        {/* Saved summary */}
                                                                        {isApproved && (
                                                                            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2.5">
                                                                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-black text-white">
                                                                                    ✓
                                                                                </span>

                                                                                <div className="min-w-0">
                                                                                    <p className="text-[10px] font-black text-emerald-800">
                                                                                        บันทึกข้อมูลเรียบร้อยแล้ว
                                                                                    </p>

                                                                                    <p className="mt-0.5 break-words text-[9px] font-medium text-emerald-600">
                                                                                        {rowState.newLicense ||
                                                                                            "-"}

                                                                                        {rowState.newProvince
                                                                                            ? ` · ${rowState.newProvince}`
                                                                                            : ""}

                                                                                        {rowState.companyName
                                                                                            ? ` · ${rowState.companyName}`
                                                                                            : ""}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Error */}
                                                            {rowState.error && (
                                                                <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5">
                                                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white">
                                                                        !
                                                                    </span>

                                                                    <p className="pt-0.5 text-[10px] font-bold leading-relaxed text-rose-700">
                                                                        {rowState.error}
                                                                    </p>
                                                                </div>
                                                            )}

                                                            {isFinalized && (
                                                                <p className="mt-2 text-[10px] font-bold text-emerald-600">
                                                                    รถคันนี้ดำเนินการแล้ว
                                                                </p>
                                                            )}

                                                            {/* Actions */}
                                                            {!isApproved &&
                                                                !isRejected ? (
                                                                <div className="mt-3 grid grid-cols-[minmax(0,1fr)_108px] gap-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            void approveSingleReplacementVehicle(
                                                                                item,
                                                                                index
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            !canMakeDecision ||
                                                                            isRowSaving ||
                                                                            isFinalized
                                                                        }
                                                                        className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                                                                    >
                                                                        {isApproved
                                                                            ? "บันทึกแล้ว"
                                                                            : isRowSaving
                                                                                ? "กำลังบันทึก..."
                                                                                : "อนุมัติรถคันนี้"}
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        disabled={!canMakeDecision || isRowSaving || isFinalized}
                                                                        onClick={() =>
                                                                            void rejectSingleReplacementVehicle(
                                                                                item,
                                                                                index
                                                                            )
                                                                        }
                                                                        className="inline-flex h-11 items-center justify-center rounded-xl border border-rose-200 bg-white px-3 text-[10px] font-black text-rose-600 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                                    >
                                                                        ไม่อนุมัติ
                                                                    </button>
                                                                </div>
                                                            ) : isRejected ? (
                                                                <div className="mt-3 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3">
                                                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-600 text-sm font-black text-white">
                                                                        ×
                                                                    </span>

                                                                    <div className="min-w-0">
                                                                        <p className="text-xs font-black text-rose-800">
                                                                            ไม่อนุมัติรถคันนี้
                                                                        </p>

                                                                        <p className="mt-1 break-words text-[10px] font-medium leading-relaxed text-rose-600">
                                                                            บันทึกผลของรถทะเบียน{" "}
                                                                            <span className="font-black">
                                                                                {originalLicense ||
                                                                                    "-"}
                                                                            </span>{" "}
                                                                            เข้าสู่ระบบเรียบร้อยแล้ว
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </article>
                                                );
                                            })}
                                        </div>
                                    )}
                                </section>
                            )}

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

                            {!isReplacementRequest && (!canMakeDecision ? (
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
                                                                            min={1}
                                                                            step={1}
                                                                            value={Number(row.qty) > 0 ? Number(row.qty) : ""}
                                                                            disabled={saving}
                                                                            onFocus={(event) => event.currentTarget.select()}
                                                                            onChange={(event) => {
                                                                                const rawValue = event.target.value;

                                                                                updateApprovedSupplier(
                                                                                    row.rowId,
                                                                                    "qty",
                                                                                    rawValue === ""
                                                                                        ? 0
                                                                                        : Math.max(1, parseInt(rawValue, 10))
                                                                                );
                                                                            }}
                                                                            onBlur={() => {
                                                                                if (Number(row.qty) <= 0) {
                                                                                    updateApprovedSupplier(row.rowId, "qty", 1);
                                                                                }
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

                                        <div className="grid gap-3 md:grid-cols-2">
                                            {/* หมายเหตุส่วนที่อนุมัติ */}
                                            <label className="block">
                                                <span className="mb-1.5 block text-xs font-bold text-blue-700">
                                                    หมายเหตุสำหรับอนุมัติ
                                                </span>

                                                <textarea
                                                    rows={3}
                                                    value={remark}
                                                    disabled={saving}
                                                    onChange={(event) => {
                                                        setRemark(event.target.value);
                                                        setMessage(null);
                                                    }}
                                                    placeholder="ระบุหมายเหตุของรถที่อนุมัติ"
                                                    className="w-full resize-none rounded-xl border border-blue-200 bg-blue-50/50 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                                                />
                                            </label>

                                            {/* เหตุผลส่วนที่ไม่อนุมัติ */}
                                            {draftNotApprovedQty > 0 && (
                                                <label className="block">
                                                    <span className="mb-1.5 block text-xs font-bold text-rose-700">
                                                        เหตุผลไม่อนุมัติ
                                                        <span className="ml-1 text-rose-500">*</span>
                                                    </span>

                                                    <textarea
                                                        rows={3}
                                                        value={rejectReason}
                                                        disabled={saving}
                                                        onChange={(event) => {
                                                            setRejectReason(event.target.value);
                                                            setMessage(null);
                                                        }}
                                                        placeholder={`ระบุเหตุผลที่ไม่อนุมัติ ${draftNotApprovedQty} คัน`}
                                                        className="w-full resize-none rounded-xl border border-rose-200 bg-rose-50/50 px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-100 disabled:bg-slate-100"
                                                    />

                                                    <span className="mt-1.5 block text-[10px] font-medium text-rose-500">
                                                        จำเป็นต้องระบุ เนื่องจากมีรถไม่อนุมัติ {draftNotApprovedQty} คัน
                                                    </span>
                                                </label>
                                            )}
                                        </div>

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
                            ))}
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}
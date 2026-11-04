"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Truck, X, Save } from "lucide-react";
import { Calendar } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { th } from "date-fns/locale";

interface RequestItem {
    id: number | null;
    running_doc: string;
    date: string;
    request_date?: string;
}

interface TruckItem {
    DC_CODE?: string;
    dc_code?: string;
    TRUCK_TYPE?: string;
    truck_type?: string;
    [key: string]: any;
}

interface UserInfo {
    em_id?: string;
    employee_id?: string;
    id?: string | number;
    warehouse?: string;
    warehouses?: string;
    WAREHOUSE?: string;
    WAREHOUSES?: string;
    dc_code?: string;
    DC_CODE?: string;
    [key: string]: any;
}

interface WarehouseItem {
    DC_CODE?: string;
    dc_code?: string;
    DC_NAME?: string;
    dc_name?: string;
    DC_TYPE?: string;
    dc_type?: string;
    [key: string]: any;
}

export interface ProviderOption {
    id: string;
    name: string;
    rating?: string | null;
}

interface MasterTypeItem {
    waiting_days?: number | string | null;
    role?: string | string[] | null;
    id: string;
    type: string;
    created_at?: string | null;
    created_by?: string | null;
    updated_at?: string | null;
    updated_by?: string | null;
}

export interface VehicleRequestModalProps {
    renderSourceTabs?: (saving: boolean) => React.ReactNode;
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    existingRequests: RequestItem[];
    providerOptions?: ProviderOption[];
}

interface FormData {
    fleet_type: string;
    fleet_truck_type: string;
    qty: string;
    usage_date: string;
    usage_end_date: string;
    workload: string;
    truckturn: string;
    remark: string;
}

export default function WarehouseVehicleRequestModal({
    open,
    onClose,
    onSuccess,
    existingRequests,
    providerOptions,
    renderSourceTabs,
}: VehicleRequestModalProps) {
    const requestSource = "DC";
    const [hasUsageEndDate, setHasUsageEndDate] = useState(false);
    const [selectedProviderId, setSelectedProviderId] = useState("");
    const [providerSearch, setProviderSearch] = useState("");
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [trucks, setTrucks] = useState<TruckItem[]>([]);
    const [masterTypes, setMasterTypes] = useState<MasterTypeItem[]>([]);
    const [loadingMasterTypes, setLoadingMasterTypes] = useState(false);
    const [formData, setFormData] = useState<FormData>({
        fleet_type: "",
        fleet_truck_type: "",
        qty: "",
        usage_date: "", usage_end_date: "",
        workload: "",
        truckturn: "",
        remark: "",
    });

    useEffect(() => {
        setFormData(previous => previous.usage_end_date &&
            (!previous.usage_date || previous.usage_end_date < previous.usage_date)
            ? { ...previous, usage_end_date: "" } : previous);
    }, [formData.usage_date]);

    const validateUsageEndDate = () => {
        if (!hasUsageEndDate) return true;
        if (!formData.usage_end_date) {
            setError("กรุณาเลือกวันที่สิ้นสุดการใช้งานก่อนดำเนินการต่อนะครับ");
            return false;
        }
        if (formData.usage_end_date < formData.usage_date) {
            setError("กรุณาเลือกวันที่สิ้นสุดการใช้งานให้ตรงกับหรือหลังวันที่ใช้งานนะครับ");
            return false;
        }
        return true;
    };

    const [licenseReplaceList, setLicenseReplaceList] = useState<string[]>([]);
    const [licenseCheckMessages, setLicenseCheckMessages] = useState<
        Record<number, string>
    >({});

    const [checkingLicenseIndex, setCheckingLicenseIndex] = useState<
        number | null
    >(null);

    const [saving, setSaving] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const confirmSubmittingRef = useRef(false);
    const confirmBackRef = useRef<HTMLButtonElement | null>(null);
    const confirmDialogRef = useRef<HTMLElement | null>(null);
    const submitButtonRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        if (!showConfirmModal) return;
        const frame = window.requestAnimationFrame(() => confirmBackRef.current?.focus());
        return () => window.cancelAnimationFrame(frame);
    }, [showConfirmModal]);
    const [loadingTrucks, setLoadingTrucks] = useState(false);
    const [error, setError] = useState("");
    const [callyReady, setCallyReady] = useState(false);
    const [openCalendar, setOpenCalendar] = useState(false);
    const [calendarPosition, setCalendarPosition] = useState({
        top: 0,
        left: 0,
    });

    const dateButtonRef = useRef<HTMLButtonElement | null>(null);
    const endDateButtonRef = useRef<HTMLButtonElement | null>(null);
    const [calendarTarget, setCalendarTarget] = useState<"usage_date" | "usage_end_date">("usage_date");
    const calendarRef = useRef<HTMLDivElement | null>(null);

    const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
    const [selectedWarehouseCode, setSelectedWarehouseCode] = useState("");
    const [warehouseSearchText, setWarehouseSearchText] = useState("");
    const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);
    const [loadingWarehouses, setLoadingWarehouses] = useState(false);

    const warehouseDropdownRef = useRef<HTMLDivElement | null>(null);

    // ซ่อนข้อความแจ้งเตือนอัตโนมัติหลังแสดงครบ 5 วินาที
    useEffect(() => {
        if (!error) return;

        const timer = window.setTimeout(() => {
            setError("");
        }, 5000);

        return () => window.clearTimeout(timer);
    }, [error]);

    const [licenseDuplicateStatus, setLicenseDuplicateStatus] = useState<
        Record<number, boolean | null>
    >({});
    const [activeLicenseDropdownIndex, setActiveLicenseDropdownIndex] = useState<
        number | null
    >(null);

    const [selectedDC, setSelectedDC] = useState<WarehouseItem | null>(null);
    const [isCenterMode, setIsCenterMode] = useState(false);

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

    const replacementTypesRequiringLicense = [
        "รถใหม่ทดแทนรถลาออก และรถตัดออกจากระบบ",
        "รถใหม่ทดแทนรถอายุ 7 ปี",
        "รถใหม่ทดแทนรถเสียซ่อม",
        "รถทดแทน",
        "รถทดแทน 7 ปี",
        "รถหมดอายุ",
        "รถทดแทนรถลาออก",
    ];

    const requiresReplacementLicense = (fleetType: string) => {
        return replacementTypesRequiringLicense.includes(fleetType.trim());
    };


    const today = useMemo(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }, []);

    const todayDocKey = useMemo(() => {
        return today.replaceAll("-", "");
    }, [today]);

    const parseLocalDate = (value: string) => {
        const [year, month, day] = value.split("-").map(Number);
        return new Date(year, month - 1, day);
    };

    const addDaysToDate = (dateText: string, days: number) => {
        const date = parseLocalDate(dateText);
        date.setDate(date.getDate() + days);

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    };

    const selectedMasterType = useMemo(() => masterTypes.find((item) => {
        const roles = (Array.isArray(item.role) ? item.role : String(item.role ?? "").split(","))
            .map((role) => role.trim().toUpperCase());
        return item.type.trim() === formData.fleet_type.trim() && roles.includes(requestSource);
    }), [masterTypes, formData.fleet_type, requestSource]);

    const waitingDays = useMemo<number | null>(() => {
        const value = selectedMasterType?.waiting_days;
        if (value === null || value === undefined || String(value).trim() === "") return null;
        const days = Number(value);
        return Number.isInteger(days) && days >= 0 && days <= 170 ? days : null;
    }, [selectedMasterType]);

    const minUsageDate = useMemo(() => waitingDays === null
        ? "" : addDaysToDate(today, waitingDays), [today, waitingDays]);

    useEffect(() => {
        setFormData((previous) => previous.usage_date &&
            (!minUsageDate || previous.usage_date < minUsageDate)
            ? { ...previous, usage_date: "", usage_end_date: "" } : previous);
        setOpenCalendar(false);
    }, [minUsageDate]);

    const userWarehouse = useMemo(() => {
        if (!userInfo) return "";

        return String(
            userInfo.warehouses ||
            userInfo.WAREHOUSES ||
            userInfo.warehouse ||
            userInfo.WAREHOUSE ||
            userInfo.dc_code ||
            userInfo.DC_CODE ||
            ""
        ).trim();
    }, [userInfo]);

    const canSelectWarehouse = useMemo(() => {
        const upperWarehouse = normalizeText(userWarehouse);

        // โหมดส่วนกลางอาจมาจาก user.warehouse = CENTER
        // หรือ Sidebar เลือก selected_dc.DC_CODE = CENTER
        // คงสิทธิ์ GM เดิมไว้เพื่อไม่กระทบการทำงานเดิม
        return isCenterMode || upperWarehouse === "GM";
    }, [isCenterMode, userWarehouse]);

    const isWarehouseUser = useMemo(() => {
        return normalizeText(userWarehouse) === "WAREHOUSE";
    }, [userWarehouse]);

    const isCenterUser = useMemo(() => {
        if (!userInfo) return false;

        const centerFields = [
            userInfo.department,
            userInfo.DEPARTMENT,
            userInfo.warehouse,
            userInfo.WAREHOUSE,
            userInfo.warehouses,
            userInfo.WAREHOUSES,
            userInfo.team,
            userInfo.TEAM,
            userInfo.original_warehouse,
        ];

        return centerFields.some((value) => normalizeText(value) === "CENTER");
    }, [userInfo]);

    // ใช้ warehouse ของบัญชีเดิม ไม่ใช้คลังปลายทางที่เลือกในฟอร์ม
    const isWorkloadRequired = normalizeText(
        userInfo?.warehouse || userInfo?.WAREHOUSE || userInfo?.original_warehouse || ""
    ) !== "CENTER";

    const isTruckTurnRequired = isWorkloadRequired;

    const requestBy = useMemo(() => {
        if (!userInfo) return "";

        const name = String(
            getValueIgnoreCase(userInfo, "name") || ""
        ).trim();

        const surname = String(
            getValueIgnoreCase(userInfo, "surname") || ""
        ).trim();

        const emId = String(
            userInfo.em_id ||
            userInfo.employee_id ||
            userInfo.id ||
            ""
        ).trim();

        const fullName = `${name} ${surname}`.trim();

        if (fullName && emId) {
            return `${fullName} (${emId})`;
        }

        return fullName || emId;
    }, [userInfo]);

    const dcCode = useMemo(() => {
        // CENTER / GM ต้องเลือก DC จริงจากรายการก่อน
        if (canSelectWarehouse) {
            const selectedCode = String(
                selectedWarehouseCode ||
                selectedDC?.DC_CODE ||
                selectedDC?.dc_code ||
                ""
            ).trim();

            // CENTER เป็นเพียงบริบทส่วนกลาง ไม่ใช่ DC ปลายทาง
            return normalizeText(selectedCode) === "CENTER" ? "" : selectedCode;
        }

        // WAREHOUSE ไม่ต้องให้เลือก แต่ใช้ DC ที่เลือกมาจาก Sidebar
        if (isWarehouseUser) {
            const selectedCode =
                selectedDC?.DC_CODE ||
                selectedDC?.dc_code ||
                selectedWarehouseCode ||
                "";

            return String(selectedCode).trim();
        }

        // user ปกติ ใช้ค่า warehouse / dc_code ของตัวเอง
        const dcCodeForUse =
            userInfo?.dc_code_for_use ||
            userInfo?.warehouse_for_use ||
            userInfo?.effective_warehouse ||
            "";

        if (dcCodeForUse) {
            return String(dcCodeForUse).trim();
        }

        const userWarehouseValue =
            userInfo?.warehouse ||
            userInfo?.WAREHOUSE ||
            userInfo?.team ||
            userInfo?.TEAM ||
            "";

        return String(userWarehouseValue).trim();
    }, [
        userInfo,
        canSelectWarehouse,
        isWarehouseUser,
        selectedWarehouseCode,
        selectedDC,
    ]);

    const dcType = useMemo(() => {
        const selectedType = selectedDC?.DC_TYPE || selectedDC?.dc_type || "";

        if (selectedType) {
            return String(selectedType).trim();
        }

        return "";
    }, [selectedDC]);

    const runningDoc = useMemo(() => {
        const docWarehouse = dcCode || userWarehouse;

        if (!docWarehouse) return `${todayDocKey}_001`;

        const prefix = `${docWarehouse}_${todayDocKey}_`;

        const runningNumbers = existingRequests
            .map((item) => item.running_doc || "")
            .filter((doc) => doc.startsWith(prefix))
            .map((doc) => {
                const numberText = doc.replace(prefix, "");
                return Number(numberText);
            })
            .filter((num) => !Number.isNaN(num));

        const nextNumber =
            runningNumbers.length > 0 ? Math.max(...runningNumbers) + 1 : 1;

        return `${prefix}${String(nextNumber).padStart(3, "0")}`;
    }, [existingRequests, todayDocKey, dcCode, userWarehouse]);

    const matchedTrucksByDcCode = useMemo(() => {
        if (!dcCode) return [];

        const currentDcCode = normalizeText(dcCode);

        return trucks.filter((item) => {
            const truckDcCode = normalizeText(getValueIgnoreCase(item, "DC_CODE"));
            return truckDcCode === currentDcCode;
        });
    }, [trucks, dcCode]);

    const truckTypeOptions = useMemo(() => {
        if (!dcCode) return [];

        const set = new Set<string>();

        matchedTrucksByDcCode.forEach((item) => {
            const truckType = String(
                getValueIgnoreCase(item, "TRUCK_TYPE") || ""
            ).trim();

            if (truckType) {
                set.add(truckType);
            }
        });

        return Array.from(set).sort();
    }, [matchedTrucksByDcCode, dcCode]);

    const warehouseOptions = useMemo(() => {
        const map = new Map<string, WarehouseItem>();

        warehouses.forEach((item) => {
            const code = String(
                getValueIgnoreCase(item, "DC_CODE") ||
                item.DC_CODE ||
                item.dc_code ||
                ""
            ).trim();

            if (code && !(isCenterMode && normalizeText(code) === "CENTER")) {
                map.set(code, item);
            }
        });

        return Array.from(map.values()).sort((a, b) => {
            const nameA = String(
                getValueIgnoreCase(a, "DC_NAME") || a.DC_NAME || a.dc_name || ""
            ).trim();
            const nameB = String(
                getValueIgnoreCase(b, "DC_NAME") || b.DC_NAME || b.dc_name || ""
            ).trim();

            return nameA.localeCompare(nameB, "th");
        });
    }, [warehouses, isCenterMode]);

    const filteredWarehouseOptions = useMemo(() => {
        const keyword = normalizeText(warehouseSearchText);

        if (!keyword) return warehouseOptions;

        return warehouseOptions.filter((item) => {
            const code = String(
                getValueIgnoreCase(item, "DC_CODE") ||
                item.DC_CODE ||
                item.dc_code ||
                ""
            ).trim();

            const name = String(
                getValueIgnoreCase(item, "DC_NAME") ||
                item.DC_NAME ||
                item.dc_name ||
                ""
            ).trim();

            const type = String(
                getValueIgnoreCase(item, "DC_TYPE") ||
                item.DC_TYPE ||
                item.dc_type ||
                ""
            ).trim();

            const searchText = normalizeText(`${code} ${name} ${type}`);

            return searchText.includes(keyword);
        });
    }, [warehouseOptions, warehouseSearchText]);

    const resetLicenseFieldsAfterWarehouseChange = () => {
        const qtyNumber = Number(formData.qty || 0);
        const isReplacementTruck = requiresReplacementLicense(formData.fleet_type);

        // ล้างทะเบียนของคลังเดิม แต่สร้างช่องใหม่ตามจำนวนรถเดิม
        setLicenseReplaceList(
            isReplacementTruck && qtyNumber > 0
                ? Array.from({ length: qtyNumber }, () => "")
                : []
        );

        setLicenseCheckMessages({});
        setLicenseDuplicateStatus({});
        setCheckingLicenseIndex(null);
        setActiveLicenseDropdownIndex(null);
    };

    const handleSelectWarehouse = (item: WarehouseItem) => {
        const code = String(
            getValueIgnoreCase(item, "DC_CODE") || item.DC_CODE || item.dc_code || ""
        ).trim();

        const name = String(
            getValueIgnoreCase(item, "DC_NAME") || item.DC_NAME || item.dc_name || ""
        ).trim();

        setSelectedWarehouseCode(code);
        setSelectedDC(item);
        setWarehouseSearchText(name || code);
        setShowWarehouseDropdown(false);

        setFormData((prev) => ({
            ...prev,
            fleet_truck_type: "",
        }));

        // ล้างทะเบียนของคลังเดิม และสร้างช่องใหม่ตามจำนวนรถเดิม
        resetLicenseFieldsAfterWarehouseChange();

        setError("");
    };

    const formatTruckReplaceLabel = (item: {
        license: string;
        province: string;
        companyId: string;
        companyName: string;
    }) => {
        return `${item.license || "-"} - ${item.province || "-"}, (${item.companyId || "-"
            }) ${item.companyName || "-"}`;
    };

    const formatTruckReplaceTopLine = (item: {
        license: string;
        province: string;
    }) => {
        return `${item.license || "-"} - ${item.province || "-"}`;
    };

    const formatTruckReplaceBottomLine = (item: {
        companyId: string;
        companyName: string;
    }) => {
        return `(${item.companyId || "-"}) ${item.companyName || "-"}`;
    };

    const truckReplaceOptions = useMemo(() => {
        if (!dcCode) return [];

        const map = new Map<
            string,
            {
                license: string;
                province: string;
                companyName: string;
                companyId: string;
            }
        >();

        matchedTrucksByDcCode.forEach((item) => {
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

            const companyName = String(
                getValueIgnoreCase(item, "ONLY_COMPANY_NAME") ||
                item.ONLY_COMPANY_NAME ||
                item.only_company_name ||
                ""
            ).trim();

            const companyId = String(
                getValueIgnoreCase(item, "COMPANY_ID") ||
                item.COMPANY_ID ||
                item.company_id ||
                ""
            ).trim();

            if (license) {
                map.set(license, {
                    license,
                    province,
                    companyName,
                    companyId,
                });
            }
        });

        return Array.from(map.values()).sort((a, b) =>
            a.license.localeCompare(b.license, "th")
        );
    }, [matchedTrucksByDcCode, dcCode]);

    const licenseOptions = useMemo(() => {
        return truckReplaceOptions.map((item) => item.license);
    }, [truckReplaceOptions]);

    const getTruckReplaceDetail = (value: string) => {
        const keyword = normalizeText(value);

        if (!keyword) return null;

        return (
            truckReplaceOptions.find(
                (item) => normalizeText(item.license) === keyword
            ) ||
            truckReplaceOptions.find(
                (item) => normalizeText(item.companyName) === keyword
            ) ||
            null
        );
    };

    useEffect(() => {
        if (!open) return;

        const savedUser =
            localStorage.getItem("user_info") ||
            localStorage.getItem("user") ||
            localStorage.getItem("userInfo");
        const savedSelectedDC = localStorage.getItem("selected_dc");

        if (!savedUser) {
            setUserInfo(null);
            setSelectedDC(null);
            setIsCenterMode(false);
            setError("ไม่พบข้อมูลผู้ใช้งาน กรุณา Login ใหม่");
            return;
        }

        try {
            const parsedUser = JSON.parse(savedUser);

            const userWarehouse =
                parsedUser?.warehouse ||
                parsedUser?.WAREHOUSE ||
                parsedUser?.team ||
                parsedUser?.TEAM ||
                "";

            const upperWarehouse = String(userWarehouse).trim().toUpperCase();

            const needsSelectedDC =
                upperWarehouse === "CENTER" ||
                upperWarehouse === "WAREHOUSE" ||
                upperWarehouse === "GM";

            const mergedUserInfo = {
                ...parsedUser,
                original_warehouse: userWarehouse,
            };

            setUserInfo(mergedUserInfo);

            let parsedSelectedDC: WarehouseItem | null = null;

            if (savedSelectedDC) {
                try {
                    parsedSelectedDC = JSON.parse(savedSelectedDC);
                    setSelectedDC(parsedSelectedDC);
                } catch (error) {
                    console.error("อ่านข้อมูล selected_dc ไม่ได้:", error);
                    localStorage.removeItem("selected_dc");
                    setSelectedDC(null);
                }
            } else {
                setSelectedDC(null);
            }

            if (needsSelectedDC) {
                const selectedCode = String(
                    parsedSelectedDC?.DC_CODE || parsedSelectedDC?.dc_code || ""
                ).trim();

                const selectedName = String(
                    parsedSelectedDC?.DC_NAME || parsedSelectedDC?.dc_name || ""
                ).trim();

                const selectedCodeIsCenter = normalizeText(selectedCode) === "CENTER";
                const nextCenterMode =
                    upperWarehouse === "CENTER" || selectedCodeIsCenter;

                setIsCenterMode(nextCenterMode);

                const canUseSavedSelectedDC = Boolean(selectedCode) && !nextCenterMode;

                if (canUseSavedSelectedDC && parsedSelectedDC) {
                    setSelectedWarehouseCode(selectedCode);
                    setSelectedDC(parsedSelectedDC);
                    setWarehouseSearchText(selectedName || selectedCode);
                    setError("");
                } else {
                    // กรณี CENTER ต้องเลือกคลังจริงจาก warehouses.php
                    // ไม่ใช้ค่า DC_CODE = CENTER เป็นคลังปลายทาง
                    setSelectedWarehouseCode("");
                    setSelectedDC(null);
                    setWarehouseSearchText("");
                    setError(
                        nextCenterMode
                            ? "กรุณาเลือกคลังปลายทางก่อนทำรายการ"
                            : "กรุณาเลือก Warehouse / DC ก่อนทำรายการ"
                    );
                }
            } else {
                setIsCenterMode(false);
                setSelectedWarehouseCode(String(userWarehouse).trim());
                setWarehouseSearchText("");
                setError("");
            }
        } catch (error) {
            console.error("อ่านข้อมูล user จาก localStorage ไม่ได้:", error);
            localStorage.removeItem("user");
            setUserInfo(null);
            setSelectedDC(null);
            setIsCenterMode(false);
            setError("อ่านข้อมูลผู้ใช้งานไม่ได้ กรุณา Login ใหม่");
        }
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const fetchMasterTypes = async () => {
            try {
                setLoadingMasterTypes(true);

                const res = await fetch(
                    "http://192.168.158.210/api_new_truck/api/master_type.php",
                    {
                        method: "GET",
                        cache: "no-store",
                    }
                );

                if (!res.ok) {
                    throw new Error("โหลดประเภทคำขอไม่สำเร็จ");
                }

                const response = await res.json();

                const list: MasterTypeItem[] = Array.isArray(response)
                    ? response
                    : Array.isArray(response.data)
                        ? response.data
                        : Array.isArray(response.result)
                            ? response.result
                            : [];

                // ตัดช่องว่างและ \r\n ที่ติดมากับ type
                const cleanedList = list
                    .map((item) => ({
                        ...item,
                        type: String(item.type || "").trim(),
                        waiting_days: (() => {
                            const value = getValueIgnoreCase(item, "waiting_days");
                            if (value === null || value === undefined ||
                                (typeof value !== "number" && typeof value !== "string") ||
                                String(value).trim() === "") return null;
                            const days = Number(value);
                            return Number.isInteger(days) && days >= 0 && days <= 170 ? days : null;
                        })(),
                    }))
                    .filter((item) => item.type !== "");

                setMasterTypes(cleanedList);
            } catch (error) {
                console.error("โหลดประเภทคำขอไม่สำเร็จ:", error);
                setError("เกิดข้อผิดพลาดในการโหลดประเภทคำขอ");
                setMasterTypes([]);
            } finally {
                setLoadingMasterTypes(false);
            }
        };

        fetchMasterTypes();
    }, [open]);

    useEffect(() => {
        if (!showWarehouseDropdown) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            if (!warehouseDropdownRef.current?.contains(target)) {
                setShowWarehouseDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showWarehouseDropdown]);

    useEffect(() => {
        if (!open) return;

        const fetchWarehouses = async () => {
            try {
                setLoadingWarehouses(true);

                const res = await fetch(
                    "http://192.168.158.210/api_new_truck/api/warehouses.php",
                    {
                        method: "GET",
                        headers: { "Content-Type": "application/json" },
                        cache: "no-store",
                    }
                );

                if (!res.ok) throw new Error("โหลดข้อมูล Warehouse ไม่สำเร็จ");

                const data = await res.json();

                const list = Array.isArray(data)
                    ? data
                    : Array.isArray(data.data)
                        ? data.data
                        : Array.isArray(data.result)
                            ? data.result
                            : [];

                setWarehouses(list);
            } catch (err) {
                console.error(err);
                setError("เกิดข้อผิดพลาดในการโหลดข้อมูล Warehouse");
            } finally {
                setLoadingWarehouses(false);
            }
        };

        fetchWarehouses();
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const fetchTrucks = async () => {
            try {
                setLoadingTrucks(true);

                const res = await fetch(
                    "http://192.168.158.210/api_new_truck/api/trucks.php",
                    {
                        method: "GET",
                        headers: { "Content-Type": "application/json" },
                        cache: "no-store",
                    }
                );

                if (!res.ok) throw new Error("โหลดข้อมูลรถไม่สำเร็จ");

                const data = await res.json();

                const list = Array.isArray(data)
                    ? data
                    : Array.isArray(data.data)
                        ? data.data
                        : Array.isArray(data.result)
                            ? data.result
                            : [];

                setTrucks(list);
            } catch (err) {
                console.error(err);
                setError("เกิดข้อผิดพลาดในการโหลดข้อมูล Truck Type");
            } finally {
                setLoadingTrucks(false);
            }
        };

        fetchTrucks();
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const loadCally = async () => {
            try {
                await import("cally");
                setCallyReady(true);
            } catch (err) {
                console.error("โหลด Cally ไม่สำเร็จ:", err);
                setError("โหลดปฏิทินไม่สำเร็จ");
            }
        };

        loadCally();
    }, [open]);

    useEffect(() => {
        if (!open) return;
    }, [
        open,
        userWarehouse,
        isCenterMode,
        dcCode,
        matchedTrucksByDcCode,
        truckTypeOptions,
        licenseOptions,
    ]);

    const needLicenseList = useMemo(() => {
        return requiresReplacementLicense(formData.fleet_type);
    }, [formData.fleet_type]);

    // ปิดปุ่มบันทึกจนกว่าทะเบียนทุกคันจะตรวจสอบแล้วและใช้งานได้
    const isLicenseSubmitBlocked = useMemo(() => {
        if (!needLicenseList) return false;

        const qty = Number(formData.qty || 0);

        if (qty <= 0 || licenseReplaceList.length < qty) return true;

        return Array.from({ length: qty }).some(
            (_, index) => licenseDuplicateStatus[index] !== false
        );
    }, [
        needLicenseList,
        formData.qty,
        licenseReplaceList.length,
        licenseDuplicateStatus,
    ]);

    useEffect(() => {
        const qtyNumber = Number(formData.qty || 0);

        if (!needLicenseList || qtyNumber <= 0) {
            setLicenseReplaceList([]);
            return;
        }

        setLicenseReplaceList((prev) => {
            const next = [...prev];

            if (qtyNumber > next.length) {
                return [
                    ...next,
                    ...Array.from({ length: qtyNumber - next.length }, () => ""),
                ];
            }

            return next.slice(0, qtyNumber);
        });
    }, [needLicenseList, formData.qty, dcCode]);

    useEffect(() => {
        if (!openCalendar) return;

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            const clickedButton = dateButtonRef.current?.contains(target) || endDateButtonRef.current?.contains(target);
            const clickedCalendar = calendarRef.current?.contains(target);

            if (!clickedButton && !clickedCalendar) {
                setOpenCalendar(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [openCalendar]);

    const visibleMasterTypes = useMemo(() => masterTypes.filter(item => {
        const roles = (Array.isArray(item.role) ? item.role : String(item.role ?? "").split(","))
            .map(role => role.trim().toUpperCase());
        return roles.includes(requestSource);
    }), [masterTypes, requestSource]);

    // Pass the same provider master options used by the parent selection flow.
    // When omitted, existing truck records supply providers for the selected DC.
    const availableProviders = useMemo<ProviderOption[]>(() => {
        const options = providerOptions ?? matchedTrucksByDcCode.map(item => ({
            id: String(getValueIgnoreCase(item, "COMPANY_ID") ?? "").trim(),
            name: String(getValueIgnoreCase(item, "ONLY_COMPANY_NAME") || getValueIgnoreCase(item, "COMPANY_NAME") || "").trim(),
            rating: String(getValueIgnoreCase(item, "COMPANY_RATING") || "").trim(),
        }));
        return Array.from(new Map(options.filter(item => item.id && item.name).map(item => [item.id, item])).values());
    }, [providerOptions, matchedTrucksByDcCode]);
    const selectedProvider = availableProviders.find(item => item.id === selectedProviderId);
    const filteredProviders = availableProviders.filter(item => normalizeText(`${item.id} ${item.name} ${item.rating || ""}`).includes(normalizeText(providerSearch)));

    useEffect(() => {
        if (!open) { setSelectedProviderId(""); setProviderSearch(""); }
    }, [open]);
    useEffect(() => { setSelectedProviderId(""); setProviderSearch(""); }, [dcCode, requestSource]);
    useEffect(() => {
        if (formData.fleet_type && !visibleMasterTypes.some(item => item.type === formData.fleet_type)) {
            setFormData(prev => ({ ...prev, fleet_type: "", usage_date: "", usage_end_date: "" }));
            setLicenseReplaceList([]);
            setLicenseCheckMessages({});
            setLicenseDuplicateStatus({});
            setCheckingLicenseIndex(null);
            setActiveLicenseDropdownIndex(null);
        }
    }, [visibleMasterTypes, formData.fleet_type]);

    if (!open) return null;

    const removeComma = (value: string) => {
        return value.replace(/,/g, "");
    };

    const formatNumberInput = (value: string) => {
        const raw = removeComma(value);

        if (raw === "") return "";
        if (!/^\d+$/.test(raw)) return formData.workload;

        const numberValue = Number(raw);

        if (Number.isNaN(numberValue)) return "";

        return numberValue.toLocaleString("en-US");
    };

    const toNumber = (value: string) => {
        const raw = removeComma(value);

        if (!raw) return 0;

        const numberValue = Number(raw);

        return Number.isNaN(numberValue) ? 0 : numberValue;
    };

    const formatShowDate = (value: string) => {
        if (!value) return "เลือกวันที่ใช้งาน";

        const [year, month, day] = value.split("-");

        if (!year || !month || !day) return value;

        return `${day}/${month}/${year}`;
    };

    const handleToggleCalendar = (target: "usage_date" | "usage_end_date" = "usage_date") => {
        const button = target === "usage_end_date" ? endDateButtonRef.current : dateButtonRef.current;
        if (!button) return;
        setCalendarTarget(target);
        const rect = button.getBoundingClientRect();

        const calendarWidth = 310;
        const calendarHeight = 360;
        const gap = 8;
        const padding = 16;

        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;

        let top = rect.bottom + gap;
        let left = rect.left;

        // ถ้าพื้นที่ด้านล่างไม่พอ ให้แสดงปฏิทินด้านบน input แทน
        if (spaceBelow < calendarHeight && spaceAbove > calendarHeight) {
            top = rect.top - calendarHeight - gap;
        }

        // กันไม่ให้หลุดขอบซ้าย/ขวา
        if (left + calendarWidth > window.innerWidth - padding) {
            left = window.innerWidth - calendarWidth - padding;
        }

        if (left < padding) {
            left = padding;
        }

        // กันไม่ให้หลุดขอบบน
        if (top < padding) {
            top = padding;
        }

        setCalendarPosition({
            top,
            left,
        });

        setOpenCalendar(prev => calendarTarget === target ? !prev : true);
    };

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
    ) => {
        const { name, value } = e.target;

        if (name === "selectedWarehouseCode") {
            setSelectedWarehouseCode(value);

            setFormData((prev) => ({
                ...prev,
                fleet_truck_type: "",
            }));

            setLicenseReplaceList([]);
            setLicenseCheckMessages({});
            setCheckingLicenseIndex(null);
            setError("");
            return;
        }

        // Workload ใส่ comma อัตโนมัติ
        if (name === "workload") {
            setFormData((prev) => ({
                ...prev,
                workload: formatNumberInput(value),
            }));
            return;
        }

        // ถ้าเปลี่ยนประเภทคำขอ
        if (name === "fleet_type") {
            const nextNeedLicenseList = requiresReplacementLicense(value);

            if (!nextNeedLicenseList) {
                setLicenseReplaceList([]);
                setLicenseCheckMessages({});
                setLicenseDuplicateStatus({});
                setCheckingLicenseIndex(null);
            }

            setFormData((prev) => ({
                ...prev,
                fleet_type: value,
                usage_date: "", usage_end_date: "",
            }));

            setOpenCalendar(false);
            setError("");
            return;
        }

        // ถ้าเปลี่ยนจำนวน และไม่ใช่ประเภทที่ต้องระบุทะเบียนทดแทน ให้ล้างทะเบียน
        if (name === "qty" && !needLicenseList) {
            setLicenseReplaceList([]);
            setLicenseCheckMessages({});
            setLicenseDuplicateStatus({});
            setCheckingLicenseIndex(null);
        }

        // ช่องอื่น ๆ
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        setError("");
    };

    const checkLicenseDuplicate = async (index: number, license: string) => {
        const cleanLicense = license.trim();

        if (!cleanLicense) {
            setLicenseCheckMessages((prev) => ({
                ...prev,
                [index]: "",
            }));

            setLicenseDuplicateStatus((prev) => ({
                ...prev,
                [index]: null,
            }));

            return;
        }

        try {
            setCheckingLicenseIndex(index);

            const response = await fetch(
                `http://192.168.158.210/api_new_truck/api/check_license_duplicate.php?license=${encodeURIComponent(
                    cleanLicense
                )}`
            );

            const result = await response.json();

            const isDuplicate = Boolean(result?.duplicate);

            setLicenseDuplicateStatus((prev) => ({
                ...prev,
                [index]: isDuplicate,
            }));

            setLicenseCheckMessages((prev) => ({
                ...prev,
                [index]: isDuplicate
                    ? "ทะเบียนนี้ถูกใช้งานแล้ว ไม่สามารถเลือกได้"
                    : "ทะเบียนนี้สามารถใช้งานได้",
            }));
        } catch (error) {
            console.error(error);

            setLicenseDuplicateStatus((prev) => ({
                ...prev,
                [index]: null,
            }));

            setLicenseCheckMessages((prev) => ({
                ...prev,
                [index]: "ไม่สามารถตรวจสอบทะเบียนได้ กรุณาลองใหม่",
            }));
        } finally {
            setCheckingLicenseIndex(null);
        }
    };

    const findDuplicateLicenseRow = (currentIndex: number, license: string) => {
        const normalizedLicense = normalizeText(license);

        if (!normalizedLicense) return -1;

        return licenseReplaceList.findIndex((selectedLicense, index) => {
            return (
                index !== currentIndex &&
                normalizeText(selectedLicense) === normalizedLicense
            );
        });
    };

    const handleLicenseReplaceChange = async (index: number, value: string) => {
        const selectedTruck = getTruckReplaceDetail(value);

        // ถ้าเลือกจากรายการบริษัท ให้เปลี่ยนกลับมาเก็บเฉพาะ LICENSE
        const finalValue = selectedTruck?.license || value;

        // ตรวจทะเบียนซ้ำกับรถคันอื่นในคำขอเดียวกัน
        if (selectedTruck?.license) {
            const duplicateRowIndex = findDuplicateLicenseRow(
                index,
                selectedTruck.license
            );

            if (duplicateRowIndex >= 0) {
                setLicenseReplaceList((prev) => {
                    const next = [...prev];
                    next[index] = "";
                    return next;
                });

                setLicenseDuplicateStatus((prev) => ({
                    ...prev,
                    [index]: true,
                }));

                setLicenseCheckMessages((prev) => ({
                    ...prev,
                    [index]: `ทะเบียน ${selectedTruck.license
                        } ถูกเลือกไว้ในรถทดแทนคันที่ ${duplicateRowIndex + 1} แล้ว`,
                }));

                setActiveLicenseDropdownIndex(null);
                return;
            }
        }

        setLicenseReplaceList((prev) => {
            const next = [...prev];
            next[index] = finalValue;
            return next;
        });

        setLicenseDuplicateStatus((prev) => ({
            ...prev,
            [index]: null,
        }));

        setLicenseCheckMessages((prev) => ({
            ...prev,
            [index]: "",
        }));

        setActiveLicenseDropdownIndex(index);

        if (selectedTruck?.license) {
            await checkLicenseDuplicate(index, selectedTruck.license);
        }
    };

    const handleSelectTruckReplace = async (
        index: number,
        item: {
            license: string;
            province: string;
            companyName: string;
            companyId: string;
        }
    ) => {
        const duplicateRowIndex = findDuplicateLicenseRow(index, item.license);

        if (duplicateRowIndex >= 0) {
            setLicenseReplaceList((prev) => {
                const next = [...prev];
                next[index] = "";
                return next;
            });

            setLicenseDuplicateStatus((prev) => ({
                ...prev,
                [index]: true,
            }));

            setLicenseCheckMessages((prev) => ({
                ...prev,
                [index]: `ทะเบียน ${item.license} ถูกเลือกไว้ในรถทดแทนคันที่ ${duplicateRowIndex + 1
                    } แล้ว`,
            }));

            setActiveLicenseDropdownIndex(null);
            return;
        }

        setLicenseReplaceList((prev) => {
            const next = [...prev];
            next[index] = item.license;
            return next;
        });

        setLicenseCheckMessages((prev) => ({
            ...prev,
            [index]: "",
        }));

        setLicenseDuplicateStatus((prev) => ({
            ...prev,
            [index]: null,
        }));

        setActiveLicenseDropdownIndex(null);

        await checkLicenseDuplicate(index, item.license);
    };

    const resetForm = () => {
        setHasUsageEndDate(false);
        setShowConfirmModal(false);
        setFormData({
            fleet_type: "",
            fleet_truck_type: "",
            qty: "",
            usage_date: "", usage_end_date: "",
            workload: "",
            truckturn: "",
            remark: "",
        });

        setLicenseReplaceList([]);
        setLicenseCheckMessages({});
        setLicenseDuplicateStatus({});
        setCheckingLicenseIndex(null);

        if (isCenterMode) {
            setSelectedWarehouseCode("");
            setSelectedDC(null);
            setWarehouseSearchText("");
            setShowWarehouseDropdown(false);
        }

        setError("");
    };

    const handleClose = () => {
        if (saving) return;

        resetForm();
        setOpenCalendar(false);
        onClose();
    };
    const validateLicenseReplaceBeforeSubmit = () => {
        if (!needLicenseList) {
            return true;
        }

        const qty = Number(formData.qty || 0);

        if (qty <= 0) {
            setError(`กรุณาระบุจำนวน${formData.fleet_type}`);
            return false;
        }

        const requiredLicenses = licenseReplaceList.slice(0, qty);

        // ระหว่างกำลังตรวจสอบทะเบียน ห้ามส่งข้อมูลไปยัง API บันทึก
        if (checkingLicenseIndex !== null) {
            setError("ระบบกำลังตรวจสอบทะเบียน กรุณารอให้ตรวจสอบเสร็จก่อนบันทึก");
            return false;
        }

        const hasEmptyLicense = requiredLicenses.some((license) => !license.trim());

        if (hasEmptyLicense || requiredLicenses.length < qty) {
            setError(`กรุณาเลือกทะเบียน${formData.fleet_type}ให้ครบ ${qty} คัน`);
            return false;
        }

        // ตรวจซ้ำภายในคำขอเดียวกัน
        const normalizedLicenses = requiredLicenses.map((license) =>
            normalizeText(license)
        );

        const duplicateIndex = normalizedLicenses.findIndex(
            (license, index) =>
                Boolean(license) && normalizedLicenses.indexOf(license) !== index
        );

        if (duplicateIndex >= 0) {
            const duplicateLicense = requiredLicenses[duplicateIndex];

            setError(
                `ทะเบียน ${duplicateLicense} ถูกเลือกซ้ำ กรุณาเลือกทะเบียนรถแต่ละคันไม่ให้ซ้ำกัน`
            );

            return false;
        }

        const hasDuplicate = requiredLicenses.some((_, index) => {
            return licenseDuplicateStatus[index] === true;
        });

        if (hasDuplicate) {
            setError(
                "มีทะเบียนรถที่ซ้ำหรือถูกใช้งานแล้ว กรุณาเปลี่ยนทะเบียนก่อนบันทึก"
            );
            return false;
        }

        const hasUnchecked = requiredLicenses.some((_, index) => {
            return licenseDuplicateStatus[index] !== false;
        });

        if (hasUnchecked) {
            setError(
                "กรุณาเลือกทะเบียนจากรายการ และรอให้ระบบตรวจสอบครบทุกคันก่อนบันทึก"
            );
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving || showConfirmModal) return;

        if (!visibleMasterTypes.some(item => item.type === formData.fleet_type)) {
            setError("กรุณาเลือกประเภทคำขอให้ตรงกับแหล่งคำขอ");
            return;
        }
        if (false && !selectedProvider) {
            setError("กรุณาเลือกผู้ให้บริการสำหรับคำขอจากส่วนกลาง");
            return;
        }
        if (!requestBy) {
            setError("ไม่พบรหัสผู้ขอ กรุณา Login ใหม่");
            return;
        }

        if (!dcCode) {
            setError(
                isCenterMode
                    ? "กรุณาเลือกคลังปลายทางก่อนบันทึกคำขอ"
                    : canSelectWarehouse
                        ? "กรุณาเลือก Warehouse / DC ก่อนบันทึกคำขอ"
                        : "ไม่พบ warehouse / dc_code ของผู้ใช้งาน"
            );
            return;
        }

        if (
            !formData.fleet_type ||
            !formData.fleet_truck_type ||
            !formData.qty ||
            !formData.usage_date ||
            (isWorkloadRequired && !formData.workload.trim()) ||
            (isTruckTurnRequired && !formData.truckturn.trim())
        ) {
            setError("กรุณากรอกข้อมูลที่จำเป็นให้ครบ");
            return;
        }

        if (!validateUsageEndDate()) return;

        if (Number(formData.qty) <= 0) {
            setError("จำนวนต้องมากกว่า 0");
            return;
        }

        if (formData.workload.trim() && toNumber(formData.workload) <= 0) {
            setError("Workload ต้องมากกว่า 0");
            return;
        }

        if (formData.truckturn.trim() && Number(formData.truckturn) <= 0) {
            setError("Truck Turn ต้องมากกว่า 0");
            return;
        }

        if (waitingDays === null || !minUsageDate) {
            setError("ไม่พบ waiting_days ที่ถูกต้องสำหรับประเภทคำขอนี้ กรุณาตรวจสอบ master_type.php");
            return;
        }
        if (formData.usage_date < minUsageDate) {
            setError(`ประเภทคำขอนี้ต้องรออย่างน้อย ${waitingDays} วัน เลือกได้ตั้งแต่ ${formatShowDate(minUsageDate)} เป็นต้นไป`);
            return;
        }

        if (
            needLicenseList &&
            licenseReplaceList.some((license) => !license.trim())
        ) {
            setError(`กรุณากรอกทะเบียน${formData.fleet_type}ให้ครบตามจำนวนรถ`);
            return;
        }

        if (!validateLicenseReplaceBeforeSubmit()) {
            return;
        }

        setError("");
        setOpenCalendar(false);
        setShowWarehouseDropdown(false);
        setShowConfirmModal(true);
    };

    const closeConfirmation = () => {
        if (saving || confirmSubmittingRef.current) return;
        setShowConfirmModal(false);
        window.requestAnimationFrame(() => submitButtonRef.current?.focus());
    };

    const handleConfirmSubmit = async () => {
        if (!showConfirmModal || saving || confirmSubmittingRef.current) return;
        if (!validateLicenseReplaceBeforeSubmit()) return;
        if (!minUsageDate || formData.usage_date < minUsageDate) {
            setError("วันที่ใช้งานไม่ตรงตามระยะเวลารอ กรุณากลับไปแก้ไข");
            return;
        }
        if (!validateUsageEndDate()) return;
        confirmSubmittingRef.current = true;
        try {
            setSaving(true);
            setError("");

            const payload = {
                request_source: requestSource,
                ...(selectedProvider ? {
                    company_id: selectedProvider.id,
                    company_name: selectedProvider.name,
                } : {}),
                id: null,
                running_doc: runningDoc,
                date: today,

                dc_code: dcCode,
                dc_type: dcType,

                fleet_type: formData.fleet_type,
                fleet_truck_type: formData.fleet_truck_type,

                license_replace: needLicenseList
                    ? licenseReplaceList.map((license) => license.trim()).filter(Boolean)
                    : [],

                qty: Number(formData.qty),

                usage_date: formData.usage_date,
                usage_end_date: hasUsageEndDate ? formData.usage_end_date : null,
                workload: formData.workload.trim() ? toNumber(formData.workload) : 0,
                truckturn: Number(formData.truckturn || 0),

                status: "gm_pending",
                request_by: requestBy,
                remark: formData.remark,
            };

            console.log("========== CREATE REQUEST PAYLOAD ==========");
            console.log(payload);
            console.log("============================================");

            const res = await fetch(
                "http://192.168.158.210/api_new_truck/api/request_save.php",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }
            );

            const result = await res.json().catch(() => null);

            console.log("========== CREATE RESPONSE ==========");
            console.log("STATUS:", res.status);
            console.log("RESULT:", result);
            console.log("=====================================");

            if (!res.ok || result?.status === "error") {
                throw new Error(result?.message || "บันทึกข้อมูลไม่สำเร็จ");
            }

            window.dispatchEvent(new Event("sidebarSummaryChanged"));
            resetForm();
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err?.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        } finally {
            confirmSubmittingRef.current = false;
            setSaving(false);
        }
    };

    return (
        <>
            <style>{`
          .new-vehicle-modal { font-family: inherit; font-size: 12px; line-height: 1.55; }
          .new-vehicle-modal :is(button,input,textarea,select) { font-family: inherit; }
          .new-vehicle-modal :is(input:not([type="checkbox"]):not([type="radio"]),textarea,select) {
            font-size: 12px; transition: border-color .15s, box-shadow .15s;
          }
          .new-vehicle-modal :is(input,textarea,select):focus { border-color: #60a5fa; box-shadow: 0 0 0 3px #dbeafe80; }
          .new-vehicle-modal :is(button,input,textarea,select):focus-visible { outline: 2px solid #2563eb; outline-offset: 2px; }
          .new-vehicle-modal { scrollbar-color: #cbd5e1 #f8fafc; }
          @media (prefers-reduced-motion: reduce) { .new-vehicle-modal * { transition: none !important; } }
        `}</style>
            {error && typeof document !== "undefined" && createPortal(
                <div
                    style={{ zIndex: 2147483001 }}
                    className="pointer-events-none fixed inset-0 flex items-center justify-center px-4"
                    role="alert"
                    aria-live="assertive"
                >
                    <div className="flex w-full max-w-md items-start rounded-xl border border-red-200 bg-red-50 p-4 text-[12px] text-red-700 shadow-2xl sm:items-center">
                        <svg
                            className="me-2 mt-0.5 h-5 w-5 shrink-0 sm:mt-0"
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M10 11h2v5m-2 0h4m-2.592-8.5h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                            />
                        </svg>
                        <p>
                            <span className="me-1 font-semibold">แจ้งเตือน!</span>
                            {error}
                        </p>
                    </div>
                </div>,
                document.body
            )}

            <div inert={showConfirmModal} className="new-vehicle-modal fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 text-slate-800">
                <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-blue-50/70 via-white to-white px-5 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100"><Truck size={18} aria-hidden="true" /></span>
                            <div className="min-w-0">
                                <h2 className="text-base font-semibold text-slate-800">
                                    คำขอออกรถใหม่
                                </h2>
                                <p className="mt-0.5 text-[11px] text-slate-500">
                                    เลขที่เอกสาร: {runningDoc}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                        >
                            <X size={16} aria-hidden="true" /><span className="sr-only">ปิดหน้าต่าง</span>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
                            {renderSourceTabs?.(saving)}


                            <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3 text-[11px] md:grid-cols-4">
                                {canSelectWarehouse && (
                                    <div className="md:col-span-4" ref={warehouseDropdownRef}>
                                        <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                                            {isCenterMode
                                                ? "เลือกคลังปลายทาง (DC_NAME)"
                                                : "เลือก Warehouse / DC"}{" "}
                                            <span className="text-red-500">*</span>
                                        </label>

                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={warehouseSearchText}
                                                onChange={(e) => {
                                                    const value = e.target.value;

                                                    setWarehouseSearchText(value);
                                                    setSelectedWarehouseCode("");
                                                    setSelectedDC(null);
                                                    setShowWarehouseDropdown(true);

                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        fleet_truck_type: "",
                                                    }));

                                                    setLicenseReplaceList([]);
                                                    setLicenseCheckMessages({});
                                                    setCheckingLicenseIndex(null);
                                                    setError("");
                                                }}
                                                onFocus={() => setShowWarehouseDropdown(true)}
                                                disabled={loadingWarehouses}
                                                placeholder={
                                                    loadingWarehouses
                                                        ? "กำลังโหลดรายชื่อคลัง..."
                                                        : isCenterMode
                                                            ? "พิมพ์หรือเลือกชื่อคลังจาก DC_NAME..."
                                                            : "พิมพ์รหัส DC หรือชื่อ Warehouse..."
                                                }
                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pr-10 text-[12px] font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                                            />

                                            <button
                                                type="button"
                                                onClick={() => setShowWarehouseDropdown((prev) => !prev)}
                                                disabled={loadingWarehouses}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-400 hover:bg-slate-100 disabled:opacity-50"
                                            >
                                                ▼
                                            </button>

                                            {showWarehouseDropdown && !loadingWarehouses && (
                                                <div className="absolute left-0 right-0 top-full z-[9999] mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                                                    {filteredWarehouseOptions.length > 0 ? (
                                                        filteredWarehouseOptions.map((item) => {
                                                            const code = String(
                                                                getValueIgnoreCase(item, "DC_CODE") ||
                                                                item.DC_CODE ||
                                                                item.dc_code ||
                                                                ""
                                                            ).trim();

                                                            const name = String(
                                                                getValueIgnoreCase(item, "DC_NAME") ||
                                                                item.DC_NAME ||
                                                                item.dc_name ||
                                                                ""
                                                            ).trim();

                                                            const type = String(
                                                                getValueIgnoreCase(item, "DC_TYPE") ||
                                                                item.DC_TYPE ||
                                                                item.dc_type ||
                                                                ""
                                                            ).trim();

                                                            return (
                                                                <button
                                                                    key={code}
                                                                    type="button"
                                                                    onClick={() => handleSelectWarehouse(item)}
                                                                    className={`block w-full px-3 py-2 text-left text-[12px] transition hover:bg-blue-50 ${selectedWarehouseCode === code
                                                                        ? "bg-blue-50 font-semibold text-blue-700"
                                                                        : "text-slate-700"
                                                                        }`}
                                                                >
                                                                    <div className="font-semibold">{name || code}</div>

                                                                    <div className="mt-0.5 text-[11px] font-medium text-slate-500">
                                                                        DC Code: {code || "-"}
                                                                        {type ? ` • ${type}` : ""}
                                                                    </div>
                                                                </button>
                                                            );
                                                        })
                                                    ) : (
                                                        <div className="px-3 py-3 text-[12px] font-medium text-slate-400">
                                                            ไม่พบ Warehouse / DC ที่ค้นหา
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <p className="mt-1 text-[11px] text-slate-400">
                                            {isCenterMode
                                                ? "รายชื่อคลังดึงจาก warehouses.php โดยแสดงชื่อจากฟิลด์ DC_NAME"
                                                : "พิมพ์ค้นหาได้ทั้งรหัส DC, ชื่อ Warehouse หรือประเภท DC"}
                                        </p>

                                        {!selectedWarehouseCode && warehouseSearchText && (
                                            <p className="mt-1 text-[11px] font-semibold text-amber-600">
                                                {isCenterMode
                                                    ? "กรุณาเลือกชื่อคลังจากรายการที่แสดง"
                                                    : "กรุณาเลือก Warehouse / DC จากรายการที่แสดง"}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <p className="font-semibold text-slate-400">วันที่สร้างคำขอ</p>
                                    <p className="mt-1 font-semibold text-slate-700">
                                        {formatShowDate(today)}
                                    </p>
                                </div>

                                <div>
                                    <p className="font-semibold text-slate-400">DC Code</p>
                                    <p className="mt-1 font-semibold text-slate-700">{dcCode || "-"}</p>
                                </div>

                                <div>
                                    <p className="font-semibold text-slate-400">DC Type</p>
                                    <p className="mt-1 font-semibold text-slate-700">{dcType || "-"}</p>
                                </div>

                                <div>
                                    <p className="font-semibold text-slate-400">ผู้ขอ</p>
                                    <p className="mt-1 font-semibold text-slate-700">
                                        {requestBy || "-"}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                                <div>
                                    <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                                        ประเภทคำขอ <span className="text-red-500">*</span>
                                    </label>

                                    <select
                                        name="fleet_type"
                                        value={formData.fleet_type}
                                        onChange={handleChange}
                                        disabled={loadingMasterTypes}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    >
                                        <option value="">
                                            {loadingMasterTypes
                                                ? "กำลังโหลดประเภทคำขอ..."
                                                : "-- เลือกประเภทคำขอ --"}
                                        </option>

                                        {visibleMasterTypes.map((item) => (
                                            <option key={item.id} value={item.type}>
                                                {item.type}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                                        ประเภทกองรถ (Fleet Type){" "}
                                        <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        name="fleet_truck_type"
                                        value={formData.fleet_truck_type}
                                        onChange={handleChange}
                                        disabled={!dcCode || loadingTrucks}
                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] outline-none focus:border-blue-500 disabled:bg-slate-100"
                                    >
                                        <option value="">
                                            {loadingTrucks
                                                ? "กำลังโหลด..."
                                                : dcCode
                                                    ? truckTypeOptions.length > 0
                                                        ? "-- เลือกประเภทรถ --"
                                                        : "ไม่พบประเภทรถของ DC นี้"
                                                    : "ไม่พบ DC Code"}
                                        </option>

                                        {truckTypeOptions.map((truckType) => (
                                            <option key={truckType} value={truckType}>
                                                {truckType}
                                            </option>
                                        ))}
                                    </select>

                                    <p className="mt-1 text-[11px] text-slate-400">
                                        Match DC_CODE: {dcCode || "-"} / พบ {truckTypeOptions.length}{" "}
                                        ประเภท
                                    </p>
                                </div>

                                <div>
                                    <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                                        จำนวนรถที่ขอ (คัน) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        name="qty"
                                        value={formData.qty}
                                        min={1}
                                        onChange={handleChange}
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[12px] outline-none focus:border-blue-500"
                                        placeholder="0"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                                        วันที่ใช้งาน <span className="text-red-500">*</span>
                                    </label>

                                    <button
                                        ref={dateButtonRef}
                                        type="button"
                                        onClick={() => handleToggleCalendar("usage_date")}
                                        disabled={!formData.fleet_type || !minUsageDate || saving}
                                        className={`w-full rounded-xl border px-3 py-2 text-left text-[12px] outline-none transition ${formData.fleet_type
                                            ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:border-blue-500"
                                            : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                            }`}
                                    >
                                        {formatShowDate(formData.usage_date)}
                                    </button>

                                    <div className="mt-3 space-y-3">
                                        <label className="inline-flex cursor-pointer items-center gap-2 text-[11px] text-slate-600">
                                            <input
                                                type="checkbox"
                                                checked={hasUsageEndDate}
                                                disabled={saving}
                                                onChange={event => {
                                                    setHasUsageEndDate(event.target.checked);
                                                    setFormData(previous => ({ ...previous, usage_end_date: "" }));
                                                    setOpenCalendar(false);
                                                    setError("");
                                                }}
                                                className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                                            />
                                            ระบุวันที่สิ้นสุดการใช้งาน
                                        </label>
                                        {hasUsageEndDate && (
                                            <div>
                                                <label htmlFor="warehouse-usage-end-date" className="mb-1 block text-[11px] font-semibold text-slate-500">
                                                    วันที่สิ้นสุดการใช้งาน <span className="text-red-500">*</span>
                                                </label>
                                                <button
                                                    ref={endDateButtonRef}
                                                    id="warehouse-usage-end-date"
                                                    type="button"
                                                    disabled={saving || !formData.usage_date}
                                                    onClick={() => handleToggleCalendar("usage_end_date")}
                                                    aria-haspopup="dialog"
                                                    aria-expanded={openCalendar && calendarTarget === "usage_end_date"}
                                                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-left text-[12px] text-slate-700 outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                                                >
                                                    {formData.usage_end_date ? formatShowDate(formData.usage_end_date) : "เลือกวันที่สิ้นสุดการใช้งาน"}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {openCalendar && minUsageDate && (
                                        <div
                                            ref={calendarRef}
                                            className="fixed z-[99999] max-h-[calc(100vh-32px)] w-[340px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl ring-1 ring-black/5"
                                            style={{
                                                top: calendarPosition.top,
                                                left: calendarPosition.left,
                                            }}
                                        >
                                            <div className="mb-3 rounded-xl bg-gradient-to-r from-indigo-50 via-blue-50 to-sky-50 px-3 py-2">
                                                <p className="text-[11px] font-semibold text-indigo-700">
                                                    {calendarTarget === "usage_end_date" ? "เลือกวันที่สิ้นสุดการใช้งาน" : "เลือกวันที่ใช้งาน"}
                                                </p>
                                                <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                                                    เลือกได้ตั้งแต่ {formatShowDate(calendarTarget === "usage_end_date" ? formData.usage_date : minUsageDate)} เป็นต้นไป
                                                </p>
                                            </div>

                                            <Calendar
                                                key={`${selectedMasterType?.id}-${minUsageDate}`}
                                                locale={th}
                                                date={parseLocalDate(formData[calendarTarget] || (calendarTarget === "usage_end_date" ? formData.usage_date : minUsageDate))}
                                                minDate={parseLocalDate(calendarTarget === "usage_end_date" ? formData.usage_date : minUsageDate)}
                                                onChange={(date: Date) => {
                                                    const year = date.getFullYear();
                                                    const month = String(date.getMonth() + 1).padStart(
                                                        2,
                                                        "0"
                                                    );
                                                    const day = String(date.getDate()).padStart(2, "0");

                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        [calendarTarget]: `${year}-${month}-${day}`,
                                                    }));
                                                }}
                                                showDateDisplay={false}
                                                color="#4f46e5"
                                            />

                                            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                                                <p className="text-[11px] font-medium text-rose-600">
                                                    • กรุณาเลือกวันที่ตามเงื่อนไข
                                                </p>

                                                <button
                                                    type="button"
                                                    onClick={() => setOpenCalendar(false)}
                                                    className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2 text-[11px] font-semibold text-white shadow-sm ring-1 ring-inset ring-indigo-600/20 transition hover:bg-indigo-700 active:scale-[0.98]"
                                                >
                                                    Done
                                                </button>
                                            </div>

                                            <style jsx global>{`
                  .rdrCalendarWrapper {
                    width: 100%;
                    border-radius: 16px;
                    font-family: inherit;
                    color: #334155;
                  }

                  .rdrMonth {
                    width: 100%;
                    padding: 0;
                  }

                  .rdrMonthAndYearWrapper {
                    height: 44px;
                    padding-top: 0;
                  }

                  .rdrMonthAndYearPickers select {
                    border-radius: 10px;
                    background-color: #f8fafc;
                    color: #334155;
                    font-size: 13px;
                    font-weight: 700;
                  }

                  .rdrWeekDay {
                    color: #64748b;
                    font-size: 11px;
                    font-weight: 700;
                  }

                  .rdrDay {
                    height: 38px;
                  }

                  .rdrDayNumber span {
                    color: #334155;
                    font-size: 12px;
                    font-weight: 700;
                  }

                  .rdrDayToday .rdrDayNumber span:after {
                    background: #4f46e5;
                  }

                  .rdrSelected {
                    border-radius: 999px;
                    background: linear-gradient(
                      135deg,
                      #4f46e5,
                      #38bdf8
                    ) !important;
                    box-shadow: 0 8px 18px rgba(79, 70, 229, 0.25);
                  }

                  .rdrDayDisabled {
                    background-color: transparent;
                  }

                  .rdrDayDisabled .rdrDayNumber span {
                    color: #cbd5e1 !important;
                    text-decoration: line-through;
                  }

                  .rdrNextPrevButton {
                    border-radius: 10px;
                    background: #eef2ff;
                  }

                  .rdrNextPrevButton:hover {
                    background: #dbeafe;
                  }
                `}</style>
                                        </div>
                                    )}

                                    {formData.fleet_type && (
                                        <div className="mt-2 mb-3 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] text-blue-700">
                                            {waitingDays === null ? (
                                                <p className="font-semibold text-amber-700">
                                                    ไม่พบ waiting_days ที่ถูกต้องสำหรับประเภทคำขอนี้
                                                    กรุณาตรวจสอบ master_type.php และข้อมูลในฐานข้อมูล
                                                </p>
                                            ) : (
                                                <>
                                                    <p><span className="font-semibold">เงื่อนไขวันที่ใช้งาน:</span>{" "}
                                                        {waitingDays === 0 ? "เลือกวันที่ใช้งานได้ตั้งแต่วันนี้"
                                                            : `ต้องเลือกวันที่ล่วงหน้าอย่างน้อย ${waitingDays} วัน`}
                                                    </p>
                                                    <p className="mt-1 font-semibold">
                                                        เลือกได้ตั้งแต่ {formatShowDate(minUsageDate)} เป็นต้นไป
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                                        ปริมาณงาน (Workload - ชิ้น)
                                        {isWorkloadRequired && <span className="text-red-500">*</span>}
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        name="workload"
                                        value={formData.workload}
                                        onChange={handleChange}
                                        required={isWorkloadRequired}
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[12px] outline-none focus:border-blue-500"
                                        placeholder="0"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                                        จำนวนรอบรถ (Truck Turn){isTruckTurnRequired && <span className="text-red-500">*</span>}
                                    </label>
                                    <input
                                        type="number"
                                        name="truckturn"
                                        value={formData.truckturn}
                                        min={0}
                                        step="0.01"
                                        onChange={handleChange}
                                        required={isTruckTurnRequired}
                                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-[12px] outline-none focus:border-blue-500"
                                        placeholder="0.00"
                                    />
                                </div>

                                {needLicenseList && Number(formData.qty || 0) > 0 && (
                                    <div className="md:col-span-2 lg:col-span-3">
                                        <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
                                            <div className="mb-3">
                                                <p className="text-[11px] font-semibold text-orange-700">
                                                    ป้ายทะเบียนรถที่ถูกทดแทน
                                                </p>
                                                <p className="mt-0.5 text-[11px] text-orange-600">
                                                    กรุณาเลือกให้ครบตามจำนวน {formData.qty} คัน
                                                </p>
                                                <p className="mt-0.5 text-[11px] text-orange-500">
                                                    อ้างอิงจาก DC_CODE: {dcCode || "-"} / พบทะเบียน{" "}
                                                    {truckReplaceOptions.length} รายการ
                                                </p>
                                            </div>

                                            <div className="space-y-2">
                                                {licenseReplaceList.map((license, index) => {
                                                    const truckDetail = getTruckReplaceDetail(license);
                                                    const checkMessage = licenseCheckMessages[index] || "";

                                                    const duplicateStatus = licenseDuplicateStatus[index];

                                                    const isChecking = checkingLicenseIndex === index;

                                                    const isAvailable =
                                                        license && !isChecking && duplicateStatus === false;

                                                    const isError =
                                                        license && !isChecking && duplicateStatus === true;

                                                    return (
                                                        <div
                                                            key={index}
                                                            className="rounded-xl border border-orange-100 bg-white p-3 shadow-sm"
                                                        >
                                                            <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[120px_1.2fr_1fr_120px]">
                                                                <div>
                                                                    <p className="text-[11px] font-semibold text-slate-400">
                                                                        คันที่
                                                                    </p>
                                                                    <p className="text-[12px] font-semibold text-slate-700">
                                                                        {formData.fleet_type} {index + 1}
                                                                        <span className="text-red-500"> *</span>
                                                                    </p>
                                                                </div>

                                                                <div>
                                                                    <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                                                                        ทะเบียน / ชื่อบริษัท
                                                                    </label>

                                                                    <input
                                                                        list={`license-options-${index}`}
                                                                        value={license}
                                                                        onChange={(e) =>
                                                                            handleLicenseReplaceChange(
                                                                                index,
                                                                                e.target.value
                                                                            )
                                                                        }
                                                                        className={`w-full rounded-xl border bg-white px-3 py-2 text-[12px] font-semibold outline-none transition ${isAvailable
                                                                            ? "border-emerald-300 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50"
                                                                            : isError
                                                                                ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-50"
                                                                                : "border-slate-300 focus:border-orange-500 focus:ring-4 focus:ring-orange-50"
                                                                            }`}
                                                                        placeholder={
                                                                            truckReplaceOptions.length > 0
                                                                                ? "เลือกทะเบียน หรือชื่อบริษัท"
                                                                                : "พิมพ์ทะเบียน"
                                                                        }
                                                                    />

                                                                    <datalist id={`license-options-${index}`}>
                                                                        {truckReplaceOptions
                                                                            .filter((item) => {
                                                                                const selectedIndex =
                                                                                    licenseReplaceList.findIndex(
                                                                                        (
                                                                                            selectedLicense,
                                                                                            selectedLicenseIndex
                                                                                        ) =>
                                                                                            selectedLicenseIndex !== index &&
                                                                                            normalizeText(selectedLicense) ===
                                                                                            normalizeText(item.license)
                                                                                    );

                                                                                return selectedIndex === -1;
                                                                            })
                                                                            .map((item) => (
                                                                                <option
                                                                                    key={item.license}
                                                                                    value={item.license}
                                                                                    label={`(${item.companyId || "-"}) ${item.companyName || "-"}`}
                                                                                />
                                                                            ))}
                                                                    </datalist>
                                                                </div>

                                                                <div>
                                                                    <p className="mb-1 text-[11px] font-semibold text-slate-500">
                                                                        ข้อมูลรถ
                                                                    </p>

                                                                    {truckDetail ? (
                                                                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                                                            <p className="text-[12px] font-semibold text-slate-800">
                                                                                {formatTruckReplaceTopLine(truckDetail)}
                                                                            </p>
                                                                            <p className="mt-1 text-[11px] text-slate-500">
                                                                                {formatTruckReplaceBottomLine(truckDetail)}
                                                                            </p>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-400">
                                                                            ยังไม่ได้เลือกข้อมูลรถ
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="lg:text-right">
                                                                    <p className="mb-1 text-[11px] font-semibold text-slate-500">
                                                                        สถานะ
                                                                    </p>

                                                                    {isChecking ? (
                                                                        <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-600">
                                                                            กำลังตรวจสอบ...
                                                                        </span>
                                                                    ) : isAvailable ? (
                                                                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                                                            ✅ ใช้งานได้
                                                                        </span>
                                                                    ) : isError ? (
                                                                        <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-[11px] font-semibold text-red-600 ring-1 ring-red-200">
                                                                            ❌ ทะเบียนซ้ำ
                                                                        </span>
                                                                    ) : license ? (
                                                                        <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-600 ring-1 ring-amber-200">
                                                                            รอตรวจสอบ
                                                                        </span>
                                                                    ) : (
                                                                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
                                                                            รอเลือก
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {checkMessage && !isChecking && (
                                                                <p
                                                                    className={`mt-2 text-[11px] font-medium ${isAvailable
                                                                        ? "text-emerald-600"
                                                                        : "text-red-600"
                                                                        }`}
                                                                >
                                                                    {checkMessage}
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="md:col-span-2 lg:col-span-3">
                                    <label className="mb-1 block text-[11px] font-semibold text-slate-500">
                                        หมายเหตุ
                                    </label>
                                    <textarea
                                        name="remark"
                                        value={formData.remark}
                                        onChange={handleChange}
                                        rows={4}
                                        className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-[12px] outline-none focus:border-blue-500"
                                        placeholder="ระบุหมายเหตุเพิ่มเติม"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={saving}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                            >
                                ยกเลิก
                            </button>

                            <button
                                ref={submitButtonRef}
                                type="submit"
                                disabled={saving || isLicenseSubmitBlocked}
                                title={
                                    isLicenseSubmitBlocked
                                        ? "ทะเบียนต้องขึ้นสถานะใช้งานได้ครบทุกคันก่อนบันทึก"
                                        : undefined
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Save size={14} aria-hidden="true" />
                                {saving
                                    ? "กำลังบันทึก..."
                                    : checkingLicenseIndex !== null
                                        ? "กำลังตรวจสอบทะเบียน..."
                                        : isLicenseSubmitBlocked
                                            ? "รอตรวจสอบทะเบียน"
                                            : "บันทึกคำขอ"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {showConfirmModal && typeof document !== "undefined" && createPortal(
                <div style={{ zIndex: 2147483000 }} className="fixed inset-0 flex items-center justify-center bg-slate-950/60 p-4" onClick={closeConfirmation}>
                    <section ref={confirmDialogRef} role="dialog" aria-modal="true"
                        aria-labelledby="dc-confirm-title" aria-busy={saving}
                        className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-2xl"
                        onClick={event => event.stopPropagation()}
                        onKeyDown={event => {
                            if (event.key === "Escape") { event.stopPropagation(); closeConfirmation(); }
                            if (event.key !== "Tab") return;
                            const controls = confirmDialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex="0"]');
                            if (!controls?.length) { event.preventDefault(); return; }
                            const first = controls[0]; const last = controls[controls.length - 1];
                            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
                        }}>
                        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-blue-50/60 px-5 py-4">
                            <div>
                                <h3 id="dc-confirm-title" className="text-base font-semibold">ตรวจสอบข้อมูลก่อนส่งคำขอ</h3>
                                <p className="mt-1 text-xs text-slate-500">ตรวจสอบข้อมูลทั้งหมด แล้วกดยืนยันส่งคำขอ</p>
                            </div>
                            <button type="button" disabled={saving} onClick={closeConfirmation} aria-label="กลับไปแก้ไข"
                                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 disabled:opacity-50"><X size={16} /></button>
                        </header>
                        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-5 text-xs">
                            <section className="overflow-hidden rounded-xl border border-slate-200">
                                <h4 className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 font-semibold">ข้อมูลคำขอ</h4>
                                <dl className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                                    {[
                                        ["แหล่งคำขอ", "คำขอจากคลัง (DC)"],
                                        ["เลขที่เอกสาร", runningDoc],
                                        ["วันที่สร้างคำขอ", formatShowDate(today)],
                                        ["ผู้ขอ", requestBy],
                                        ["DC Code", dcCode],
                                        ["ชื่อคลัง", String(getValueIgnoreCase(selectedDC || warehouseOptions.find(item => normalizeText(getValueIgnoreCase(item, "DC_CODE")) === normalizeText(dcCode)), "DC_NAME") || "-")],
                                    ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-slate-500">{label}</dt><dd className="mt-1 break-words font-semibold">{value || "-"}</dd></div>)}
                                </dl>
                            </section>
                            <section className="overflow-hidden rounded-xl border border-slate-200">
                                <h4 className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 font-semibold">รายละเอียดรถที่ขอ</h4>
                                <dl className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
                                    {[
                                        ["ประเภทคำขอ", formData.fleet_type],
                                        ["ประเภทกองรถ", formData.fleet_truck_type],
                                        ["จำนวนรถ", `${Number(formData.qty).toLocaleString("th-TH")} คัน`],
                                        [hasUsageEndDate ? "วันที่ใช้งาน - วันที่สิ้นสุด" : "วันที่ใช้งาน", `${formatShowDate(formData.usage_date)}${hasUsageEndDate ? ` - ${formatShowDate(formData.usage_end_date)}` : ""}`],
                                        ["ระยะเวลารอ", `${waitingDays} วัน`],
                                        ["ปริมาณงาน (Workload)", formData.workload.trim() ? `${toNumber(formData.workload).toLocaleString("th-TH")} ชิ้น` : "ไม่ได้ระบุ"],
                                        ["จำนวนรอบรถ (Truck Turn)", formData.truckturn.trim() ? Number(formData.truckturn).toLocaleString("th-TH", { maximumFractionDigits: 2 }) : "ไม่ได้ระบุ"],
                                    ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-slate-500">{label}</dt><dd className="mt-1 break-words font-semibold">{value || "-"}</dd></div>)}
                                </dl>
                            </section>
                            {needLicenseList && <section className="overflow-hidden rounded-xl border border-orange-200">
                                <h4 className="border-b border-orange-200 bg-orange-50 px-4 py-2.5 font-semibold text-orange-800">รถที่ถูกทดแทน ({formData.qty} คัน)</h4>
                                <ol className="divide-y divide-slate-100">
                                    {licenseReplaceList.slice(0, Number(formData.qty)).map((license, index) => {
                                        const truck = getTruckReplaceDetail(license);
                                        return <li key={index} className="flex gap-3 px-4 py-3">
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-50 font-semibold text-orange-700">{index + 1}</span>
                                            <div className="min-w-0"><p className="break-words font-semibold">{truck ? formatTruckReplaceTopLine(truck) : license}</p>
                                                {truck && <p className="mt-1 break-words text-slate-500">{formatTruckReplaceBottomLine(truck)}</p>}
                                                <p className="mt-1 text-emerald-600">ตรวจสอบแล้ว ใช้งานได้</p>
                                            </div>
                                        </li>;
                                    })}
                                </ol>
                            </section>}
                            <section className="overflow-hidden rounded-xl border border-slate-200">
                                <h4 className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 font-semibold">หมายเหตุ</h4>
                                <p className="whitespace-pre-wrap break-words p-4">{formData.remark.trim() || "ไม่ได้ระบุ"}</p>
                            </section>
                        </div>
                        <footer className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-5 py-3">
                            <button ref={confirmBackRef} type="button" disabled={saving} onClick={closeConfirmation}
                                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">กลับไปแก้ไข</button>
                            <button type="button" disabled={saving} onClick={handleConfirmSubmit}
                                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                                <Save size={14} />{saving ? "กำลังส่งคำขอ..." : "ยืนยันส่งคำขอ"}
                            </button>
                        </footer>
                    </section>
                </div>,
                document.body
            )}
        </>
    );

}
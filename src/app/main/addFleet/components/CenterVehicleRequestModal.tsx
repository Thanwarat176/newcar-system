"use client";

import React, {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { createPortal } from "react-dom";
import { Truck, X, Save } from "lucide-react";
import { Calendar } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { th } from "date-fns/locale";

const API_BASE =
    "http://192.168.158.210/api_new_truck/api";

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
    [key: string]: unknown;
}

interface UserInfo {
    em_id?: string | number;
    employee_id?: string | number;
    id?: string | number;
    warehouse?: string;
    warehouses?: string;
    WAREHOUSE?: string;
    WAREHOUSES?: string;
    dc_code?: string;
    DC_CODE?: string;
    [key: string]: unknown;
}

interface WarehouseItem {
    DC_CODE?: string;
    dc_code?: string;
    DC_NAME?: string;
    dc_name?: string;
    DC_TYPE?: string;
    dc_type?: string;
    [key: string]: unknown;
}

export interface ProviderOption {
    id: string;
    name: string;
    rating?: string | null;
    subsidiary?: string | string[] | null;
}

interface MasterTypeItem {
    role?: string | string[] | null;
    id: string;
    type: string;
    waiting_days?: number | string | null;
    created_at?: string | null;
    created_by?: string | null;
    updated_at?: string | null;
    updated_by?: string | null;
}

export interface VehicleRequestModalProps {
    renderSourceTabs?: (
        saving: boolean
    ) => React.ReactNode;
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    existingRequests: RequestItem[];
    providerOptions?: ProviderOption[];
}

interface VehicleFormData {
    fleet_type: string;
    fleet_truck_type: string;
    qty: string;
    usage_date: string;
    usage_end_date: string;
    workload: string;
    truckturn: string;
    remark: string;
}

interface AttachmentItem {
    attachment_id: number | string;
    document_no: string;
    file_name: string;
}

interface ReplacementTruck {
    license: string;
    province: string;
    companyName: string;
    companyId: string;
}

const EMPTY_FORM: VehicleFormData = {
    fleet_type: "",
    fleet_truck_type: "",
    qty: "",    usage_date: "",
    usage_end_date: "",
    workload: "",
    truckturn: "",
    remark: "",
};

const REPLACEMENT_TYPES = [
    "รถใหม่ทดแทนรถลาออก และรถตัดออกจากระบบ",
    "รถใหม่ทดแทนรถอายุ 7 ปี",
    "รถใหม่ทดแทนรถเสียซ่อม",
    "รถทดแทน",
    "รถทดแทน 7 ปี",
    "รถหมดอายุ",
    "รถทดแทนรถลาออก",
];


function isRecord(
    value: unknown
): value is Record<string, unknown> {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function getValueIgnoreCase(
    item: unknown,
    keyName: string
): unknown {
    if (!isRecord(item)) return "";

    const foundKey = Object.keys(item).find(
        (key) =>
            key.trim().toUpperCase() ===
            keyName.toUpperCase()
    );

    return foundKey ? item[foundKey] : "";
}

function normalizeText(value: unknown): string {
    return String(value ?? "")
        .trim()
        .replace(/\s+/g, " ")
        .toUpperCase();
}

function getFirstText(...values: unknown[]): string {
    for (const value of values) {
        const text = String(value ?? "").trim();

        if (text && text !== "-") return text;
    }

    return "";
}

function requiresReplacementLicense(
    fleetType: string
): boolean {
    return REPLACEMENT_TYPES.includes(
        fleetType.trim()
    );
}


function formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(
        date.getMonth() + 1
    ).padStart(2, "0");
    const day = String(date.getDate()).padStart(
        2,
        "0"
    );

    return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string): Date {
    const [year, month, day] = value
        .split("-")
        .map(Number);

    return new Date(year, month - 1, day);
}

function addDaysToDate(
    dateText: string,
    days: number
): string {
    const date = parseLocalDate(dateText);
    date.setDate(date.getDate() + days);

    return formatLocalDate(date);
}

function formatShowDate(value: string): string {
    if (!value) return "เลือกวันที่ใช้งาน";

    const [year, month, day] = value.split("-");

    if (!year || !month || !day) return value;

    return `${day}/${month}/${year}`;
}

function toNumber(value: string): number {
    const raw = value.replace(/,/g, "");
    const number = Number(raw);

    return Number.isFinite(number) ? number : 0;
}

function extractList(result: unknown): unknown[] {
    if (Array.isArray(result)) return result;
    if (!isRecord(result)) return [];

    for (const key of [
        "data",
        "result",
        "suppliers",
    ]) {
        if (Array.isArray(result[key])) {
            return result[key] as unknown[];
        }
    }

    return [];
}

function parseSubsidiaries(
    value: unknown
): string[] {
    if (Array.isArray(value)) {
        return value
            .filter(
                (item): item is string =>
                    typeof item === "string"
            )
            .map((item) => item.trim())
            .filter(Boolean);
    }

    if (
        typeof value !== "string" ||
        !value.trim()
    ) {
        return [];
    }

    try {
        const parsed: unknown = JSON.parse(value);

        if (Array.isArray(parsed)) {
            return parseSubsidiaries(parsed);
        }
    } catch {
        // รองรับข้อความที่ไม่ได้เก็บเป็น JSON
    }

    return value
        .split(/[,;\n]/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function formatTruckReplaceTopLine(
    item: ReplacementTruck
): string {
    return `${item.license || "-"} - ${item.province || "-"
        }`;
}

function formatTruckReplaceBottomLine(
    item: ReplacementTruck
): string {
    return `(${item.companyId || "-"}) ${item.companyName || "-"
        }`;
}

function SummaryField({
    label,
    value,
    fullWidth = false,
}: {
    label: string;
    value: React.ReactNode;
    fullWidth?: boolean;
}) {
    return (
        <div
            className={
                fullWidth
                    ? "min-w-0 sm:col-span-2"
                    : "min-w-0"
            }
        >
            <dt className="text-slate-500">
                {label}
            </dt>
            <dd className="mt-1 whitespace-pre-wrap break-words font-semibold text-slate-800">
                {value || "-"}
            </dd>
        </div>
    );
}

export default function CenterVehicleRequestModal({
    open,
    onClose,
    onSuccess,
    existingRequests,
    providerOptions,
    renderSourceTabs,
}: VehicleRequestModalProps) {
    const requestSource = "TC";
    const endDateButtonRef = useRef<HTMLButtonElement | null>(null);
    const [calendarTarget, setCalendarTarget] = useState<"usage_date" | "usage_end_date">("usage_date");
    const [hasUsageEndDate, setHasUsageEndDate] = useState(false);

    const [formData, setFormData] =
        useState<VehicleFormData>({
            ...EMPTY_FORM,
        });

    const [userInfo, setUserInfo] =
        useState<UserInfo | null>(null);

    const [trucks, setTrucks] = useState<
        TruckItem[]
    >([]);
    const [loadingTrucks, setLoadingTrucks] =
        useState(false);

    const [masterTypes, setMasterTypes] =
        useState<MasterTypeItem[]>([]);
    const [
        loadingMasterTypes,
        setLoadingMasterTypes,
    ] = useState(false);

    const [warehouses, setWarehouses] = useState<
        WarehouseItem[]
    >([]);
    const [
        loadingWarehouses,
        setLoadingWarehouses,
    ] = useState(false);

    const [selectedDC, setSelectedDC] =
        useState<WarehouseItem | null>(null);
    const [
        selectedWarehouseCode,
        setSelectedWarehouseCode,
    ] = useState("");
    const [
        warehouseSearchText,
        setWarehouseSearchText,
    ] = useState("");
    const [
        showWarehouseDropdown,
        setShowWarehouseDropdown,
    ] = useState(false);
    const [isCenterMode, setIsCenterMode] =
        useState(false);

    const [
        selectedProviderId,
        setSelectedProviderId,
    ] = useState("");
    const [providerSearch, setProviderSearch] =
        useState("");
    const [
        providerSubsidiary,
        setProviderSubsidiary,
    ] = useState("");
    const [
        subsidiaryOptions,
        setSubsidiaryOptions,
    ] = useState<string[]>([]);
    const [
        loadingSubsidiaries,
        setLoadingSubsidiaries,
    ] = useState(false);

    const [providerPdf, setProviderPdf] =
        useState<File | null>(null);
    const [
        providerPdfDocumentNo,
        setProviderPdfDocumentNo,
    ] = useState("");
    const [attachmentMode, setAttachmentMode] =
        useState<"new" | "existing">("new");
    const [attachmentId, setAttachmentId] =
        useState("");
    const [
        attachmentSearch,
        setAttachmentSearch,
    ] = useState("");
    const [
        availableAttachments,
        setAvailableAttachments,
    ] = useState<AttachmentItem[]>([]);
    const [
        loadingAttachments,
        setLoadingAttachments,
    ] = useState(false);
    const [
        attachmentListError,
        setAttachmentListError,
    ] = useState("");
    const [
        attachmentHasMore,
        setAttachmentHasMore,
    ] = useState(false);
    const [
        attachmentRefresh,
        setAttachmentRefresh,
    ] = useState(0);

    const [
        licenseReplaceList,
        setLicenseReplaceList,
    ] = useState<string[]>([]);
    const [
        licenseCheckMessages,
        setLicenseCheckMessages,
    ] = useState<Record<number, string>>({});
    const [
        licenseDuplicateStatus,
        setLicenseDuplicateStatus,
    ] = useState<
        Record<number, boolean | null>
    >({});
    const [
        checkingLicenseIndexes,
        setCheckingLicenseIndexes,
    ] = useState<Record<number, boolean>>({});

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Modal ยืนยันข้อมูลก่อนส่ง API
    const [
        showConfirmModal,
        setShowConfirmModal,
    ] = useState(false);

    const [openCalendar, setOpenCalendar] =
        useState(false);
    const [
        calendarPosition,
        setCalendarPosition,
    ] = useState({
        top: 0,
        left: 0,
    });

    const dateButtonRef =
        useRef<HTMLButtonElement | null>(null);
    const calendarRef =
        useRef<HTMLDivElement | null>(null);
    const warehouseDropdownRef =
        useRef<HTMLDivElement | null>(null);
    const confirmDialogRef =
        useRef<HTMLElement | null>(null);
    const backButtonRef =
        useRef<HTMLButtonElement | null>(null);
    const saveButtonRef =
        useRef<HTMLButtonElement | null>(null);
    const fileInputRef =
        useRef<HTMLInputElement | null>(null);

    const submittingRef = useRef(false);

    // ใช้ป้องกันผลตรวจทะเบียนเก่ามาทับค่าที่แก้ใหม่
    const licenseCheckVersionsRef =
        useRef<Record<number, number>>({});
    const licenseContextVersionRef = useRef(0);

    const today = useMemo(
        () => formatLocalDate(new Date()),
        []
    );

    const todayDocKey = useMemo(
        () => today.replaceAll("-", ""),
        [today]
    );

    const needLicenseList =
        requiresReplacementLicense(
            formData.fleet_type
        );

    const selectedMasterType = useMemo(
        () =>
            masterTypes.find((item) => {
                const roles = (
                    Array.isArray(item.role)
                        ? item.role
                        : String(item.role ?? "").split(",")
                ).map((role) => role.trim().toUpperCase());

                return (
                    item.type.trim() === formData.fleet_type.trim() &&
                    roles.includes("DC")
                );
            }),
        [masterTypes, formData.fleet_type]
    );

    const waitingDays = useMemo(() => {
        const value = selectedMasterType?.waiting_days;

        if (
            value === null ||
            value === undefined ||
            String(value).trim() === ""
        ) {
            return null;
        }

        const days = Number(value);

        return Number.isInteger(days) && days >= 0 && days <= 170
            ? days
            : null;
    }, [selectedMasterType]);

    const minUsageDate = useMemo(
        () =>
            waitingDays === null
                ? ""
                : addDaysToDate(today, waitingDays),
        [today, waitingDays]
    );

    // หากระยะเวลารอเปลี่ยน ให้ล้างวันที่เดิมที่ใช้ไม่ได้แล้ว
    useEffect(() => {
        setFormData((previous) => {
            if (previous.usage_date && (!minUsageDate || previous.usage_date < minUsageDate)) {
                return { ...previous, usage_date: "" };
            }
            return previous;
        });
        setOpenCalendar(false);
    }, [minUsageDate]);

    // ล้างวันสิ้นสุดเมื่อวันเริ่มต้นถูกล้างหรือเปลี่ยนจนช่วงวันที่ใช้ไม่ได้
    useEffect(() => {
        setFormData((previous) => {
            if (previous.usage_end_date &&
                (!previous.usage_date || previous.usage_end_date < previous.usage_date)) {
                return { ...previous, usage_end_date: "" };
            }
            return previous;
        });
    }, [formData.usage_date]);

    const userWarehouse = useMemo(() => {
        if (!userInfo) return "";

        return getFirstText(
            userInfo.warehouses,
            userInfo.WAREHOUSES,
            userInfo.warehouse,
            userInfo.WAREHOUSE,
            userInfo.dc_code,
            userInfo.DC_CODE
        );
    }, [userInfo]);

    const canSelectWarehouse =
        isCenterMode ||
        normalizeText(userWarehouse) === "GM";

    const isWarehouseUser =
        normalizeText(userWarehouse) ===
        "WAREHOUSE";

    const requestBy = useMemo(() => {
        if (!userInfo) return "";

        const name = getFirstText(
            getValueIgnoreCase(userInfo, "name")
        );
        const surname = getFirstText(
            getValueIgnoreCase(userInfo, "surname")
        );
        const employeeId = getFirstText(
            userInfo.em_id,
            userInfo.employee_id,
            userInfo.id
        );

        const fullName =
            `${name} ${surname}`.trim();

        if (fullName && employeeId) {
            return `${fullName} (${employeeId})`;
        }

        return fullName || employeeId;
    }, [userInfo]);

    const dcCode = useMemo(() => {
        if (canSelectWarehouse) {
            const code = getFirstText(
                selectedWarehouseCode,
                selectedDC?.DC_CODE,
                selectedDC?.dc_code
            );

            return normalizeText(code) === "CENTER"
                ? ""
                : code;
        }

        if (isWarehouseUser) {
            return getFirstText(
                selectedDC?.DC_CODE,
                selectedDC?.dc_code,
                selectedWarehouseCode
            );
        }

        return getFirstText(
            userInfo?.dc_code_for_use,
            userInfo?.warehouse_for_use,
            userInfo?.effective_warehouse,
            userInfo?.warehouse,
            userInfo?.WAREHOUSE,
            userInfo?.team,
            userInfo?.TEAM
        );
    }, [
        canSelectWarehouse,
        isWarehouseUser,
        selectedWarehouseCode,
        selectedDC,
        userInfo,
    ]);

    const dcType = useMemo(
        () =>
            getFirstText(
                selectedDC?.DC_TYPE,
                selectedDC?.dc_type
            ),
        [selectedDC]
    );

    const runningDoc = useMemo(() => {
        const warehouse = dcCode || userWarehouse;

        if (!warehouse) {
            return `${todayDocKey}_001`;
        }

        const prefix =
            `${warehouse}_${todayDocKey}_`;

        const numbers = existingRequests
            .map((item) => item.running_doc || "")
            .filter((doc) =>
                doc.startsWith(prefix)
            )
            .map((doc) =>
                Number(doc.slice(prefix.length))
            )
            .filter((number) =>
                Number.isFinite(number)
            );

        const next =
            numbers.length > 0
                ? Math.max(...numbers) + 1
                : 1;

        return (
            prefix + String(next).padStart(3, "0")
        );
    }, [
        existingRequests,
        todayDocKey,
        dcCode,
        userWarehouse,
    ]);

    const matchedTrucksByDcCode =
        useMemo(() => {
            if (!dcCode) return [];

            return trucks.filter(
                (item) =>
                    normalizeText(
                        getValueIgnoreCase(
                            item,
                            "DC_CODE"
                        )
                    ) === normalizeText(dcCode)
            );
        }, [trucks, dcCode]);

    const truckTypeOptions = useMemo(() => {
        const types = new Set<string>();

        matchedTrucksByDcCode.forEach(
            (item) => {
                const type = getFirstText(
                    getValueIgnoreCase(
                        item,
                        "TRUCK_TYPE"
                    )
                );

                if (type) types.add(type);
            }
        );

        return [...types].sort();
    }, [matchedTrucksByDcCode]);

    const warehouseOptions = useMemo(() => {
        const map =
            new Map<string, WarehouseItem>();

        warehouses.forEach((item) => {
            const code = getFirstText(
                getValueIgnoreCase(item, "DC_CODE")
            );

            if (
                code &&
                !(
                    isCenterMode &&
                    normalizeText(code) === "CENTER"
                )
            ) {
                map.set(normalizeText(code), item);
            }
        });

        return [...map.values()].sort(
            (a, b) =>
                getFirstText(
                    getValueIgnoreCase(a, "DC_NAME")
                ).localeCompare(
                    getFirstText(
                        getValueIgnoreCase(
                            b,
                            "DC_NAME"
                        )
                    ),
                    "th"
                )
        );
    }, [warehouses, isCenterMode]);

    const filteredWarehouseOptions =
        useMemo(() => {
            const keyword = normalizeText(
                warehouseSearchText
            );

            if (!keyword) return warehouseOptions;

            return warehouseOptions.filter(
                (item) =>
                    normalizeText(
                        [
                            getValueIgnoreCase(
                                item,
                                "DC_CODE"
                            ),
                            getValueIgnoreCase(
                                item,
                                "DC_NAME"
                            ),
                            getValueIgnoreCase(
                                item,
                                "DC_TYPE"
                            ),
                        ].join(" ")
                    ).includes(keyword)
            );
        }, [
            warehouseOptions,
            warehouseSearchText,
        ]);

    const selectedWarehouseName = useMemo(
        () =>
            getFirstText(
                getValueIgnoreCase(
                    selectedDC,
                    "DC_NAME"
                ),
                getValueIgnoreCase(
                    warehouseOptions.find(
                        (item) =>
                            normalizeText(
                                getValueIgnoreCase(
                                    item,
                                    "DC_CODE"
                                )
                            ) === normalizeText(dcCode)
                    ),
                    "DC_NAME"
                )
            ),
        [
            selectedDC,
            warehouseOptions,
            dcCode,
        ]
    );

    const truckReplaceOptions =
        useMemo<ReplacementTruck[]>(() => {
            const map =
                new Map<string, ReplacementTruck>();

            matchedTrucksByDcCode.forEach(
                (item) => {
                    const license = getFirstText(
                        getValueIgnoreCase(
                            item,
                            "LICENSE"
                        )
                    );

                    if (!license) return;

                    map.set(normalizeText(license), {
                        license,
                        province: getFirstText(
                            getValueIgnoreCase(
                                item,
                                "PROVINCE"
                            )
                        ),
                        companyName: getFirstText(
                            getValueIgnoreCase(
                                item,
                                "ONLY_COMPANY_NAME"
                            ),
                            getValueIgnoreCase(
                                item,
                                "COMPANY_NAME"
                            )
                        ),
                        companyId: getFirstText(
                            getValueIgnoreCase(
                                item,
                                "COMPANY_ID"
                            )
                        ),
                    });
                }
            );

            return [...map.values()].sort(
                (a, b) =>
                    a.license.localeCompare(
                        b.license,
                        "th"
                    )
            );
        }, [matchedTrucksByDcCode]);

    const getTruckReplaceDetail = (
        value: string
    ) => {
        const keyword = normalizeText(value);

        if (!keyword) return null;

        return (
            truckReplaceOptions.find(
                (item) =>
                    normalizeText(item.license) ===
                    keyword
            ) ||
            truckReplaceOptions.find(
                (item) =>
                    normalizeText(item.companyName) ===
                    keyword
            ) ||
            null
        );
    };

    const visibleMasterTypes = useMemo(
        () =>
            masterTypes.filter((item) => {
                const roles = (
                    Array.isArray(item.role)
                        ? item.role
                        : String(
                            item.role ?? ""
                        ).split(",")
                ).map((role) =>
                    role.trim().toUpperCase()
                );

                return roles.includes(requestSource);
            }),
        [masterTypes]
    );

    const availableProviders =
        useMemo<ProviderOption[]>(() => {
            const options =
                providerOptions ??
                matchedTrucksByDcCode.map(
                    (item) => ({
                        id: getFirstText(
                            getValueIgnoreCase(
                                item,
                                "COMPANY_ID"
                            )
                        ),
                        name: getFirstText(
                            getValueIgnoreCase(
                                item,
                                "ONLY_COMPANY_NAME"
                            ),
                            getValueIgnoreCase(
                                item,
                                "COMPANY_NAME"
                            )
                        ),
                        rating: getFirstText(
                            getValueIgnoreCase(
                                item,
                                "COMPANY_RATING"
                            )
                        ),
                    })
                );

            return [
                ...new Map(
                    options
                        .filter(
                            (item) =>
                                item.id && item.name
                        )
                        .map((item) => [
                            item.id,
                            item,
                        ])
                ).values(),
            ];
        }, [
            providerOptions,
            matchedTrucksByDcCode,
        ]);

    const selectedProvider =
        availableProviders.find(
            (item) =>
                item.id === selectedProviderId
        );

    const isAllNowProvider =
        Boolean(selectedProvider) &&
        (selectedProvider?.id.trim() ===
            "40900" ||
            [
                "40900",
                "บจ.ออลล์ นาว โลจิสติกส์",
                "ออลล์ นาว โลจิสติกส์",
            ].some(
                (name) =>
                    normalizeText(name).replace(
                        /\s+/g,
                        ""
                    ) ===
                    normalizeText(
                        selectedProvider?.name
                    ).replace(/\s+/g, "")
            ));

    const filteredProviders =
        availableProviders.filter((item) =>
            normalizeText(
                `${item.id} ${item.name} ${item.rating || ""
                }`
            ).includes(
                normalizeText(providerSearch)
            )
        );

    const hasCheckingLicense = Object.values(
        checkingLicenseIndexes
    ).some(Boolean);

    const isLicenseSubmitBlocked =
        useMemo(() => {
            if (!needLicenseList) return false;

            const qty = Number(formData.qty || 0);

            if (
                !Number.isInteger(qty) ||
                qty <= 0 ||
                licenseReplaceList.length < qty
            ) {
                return true;
            }

            return Array.from({
                length: qty,
            }).some(
                (_, index) =>
                    !licenseReplaceList[index]?.trim() ||
                    checkingLicenseIndexes[index] ||
                    licenseDuplicateStatus[index] !==
                    false
            );
        }, [
            needLicenseList,
            formData.qty,
            licenseReplaceList,
            checkingLicenseIndexes,
            licenseDuplicateStatus,
        ]);

    const clearLicenseChecks = () => {
        licenseContextVersionRef.current += 1;
        licenseCheckVersionsRef.current = {};

        setLicenseCheckMessages({});
        setLicenseDuplicateStatus({});
        setCheckingLicenseIndexes({});
    };

    useEffect(() => {
        if (!error) return;

        const timer = window.setTimeout(
            () => setError(""),
            5000
        );

        return () =>
            window.clearTimeout(timer);
    }, [error]);

    // โหลดบัญชีและคลังเดิม
    useEffect(() => {
        if (!open) return;

        setShowConfirmModal(false);

        const savedUser =
            localStorage.getItem("user") ||
            localStorage.getItem("user_info") ||
            localStorage.getItem("userInfo");

        const savedDC =
            localStorage.getItem("selected_dc");

        if (!savedUser) {
            setUserInfo(null);
            setSelectedDC(null);
            setIsCenterMode(false);
            setError(
                "ไม่พบข้อมูลผู้ใช้งาน กรุณา Login ใหม่"
            );
            return;
        }

        try {
            const parsed: unknown =
                JSON.parse(savedUser);

            if (!isRecord(parsed)) {
                throw new Error(
                    "ข้อมูลผู้ใช้งานไม่ถูกต้อง"
                );
            }

            const warehouse = getFirstText(
                parsed.warehouse,
                parsed.WAREHOUSE,
                parsed.team,
                parsed.TEAM
            );

            const upperWarehouse =
                normalizeText(warehouse);

            setUserInfo({
                ...parsed,
                original_warehouse: warehouse,
            } as UserInfo);

            let parsedDC: WarehouseItem | null =
                null;

            if (savedDC) {
                try {
                    const value: unknown =
                        JSON.parse(savedDC);

                    if (isRecord(value)) {
                        parsedDC =
                            value as WarehouseItem;
                    }
                } catch {
                    parsedDC = null;
                }
            }

            const needsSelectedDC = [
                "CENTER",
                "WAREHOUSE",
                "GM",
            ].includes(upperWarehouse);

            const selectedCode =
                getFirstText(
                    parsedDC?.DC_CODE,
                    parsedDC?.dc_code
                );
            const selectedName =
                getFirstText(
                    parsedDC?.DC_NAME,
                    parsedDC?.dc_name
                );

            if (needsSelectedDC) {
                const centerMode =
                    upperWarehouse === "CENTER" ||
                    normalizeText(selectedCode) ===
                    "CENTER";

                setIsCenterMode(centerMode);

                if (
                    selectedCode &&
                    !centerMode &&
                    parsedDC
                ) {
                    setSelectedDC(parsedDC);
                    setSelectedWarehouseCode(
                        selectedCode
                    );
                    setWarehouseSearchText(
                        selectedName || selectedCode
                    );
                    setError("");
                } else {
                    setSelectedDC(null);
                    setSelectedWarehouseCode("");
                    setWarehouseSearchText("");
                    setError(
                        centerMode
                            ? "กรุณาเลือกคลังปลายทางก่อนทำรายการ"
                            : "กรุณาเลือก Warehouse / DC ก่อนทำรายการ"
                    );
                }
            } else {
                setIsCenterMode(false);
                setSelectedDC(parsedDC);
                setSelectedWarehouseCode(
                    warehouse
                );
                setWarehouseSearchText("");
                setError("");
            }
        } catch (err) {
            console.error(err);
            setUserInfo(null);
            setSelectedDC(null);
            setIsCenterMode(false);
            setError(
                "อ่านข้อมูลผู้ใช้งานไม่ได้ กรุณา Login ใหม่"
            );
        }
    }, [open]);

    // โหลดประเภทคำขอ คลัง และรถ
    useEffect(() => {
        if (!open) return;

        const controller =
            new AbortController();

        const loadMasterTypes = async () => {
            setLoadingMasterTypes(true);

            try {
                const response = await fetch(
                    `${API_BASE}/master_type.php`,
                    {
                        cache: "no-store",
                        signal: controller.signal,
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        "โหลดประเภทคำขอไม่สำเร็จ"
                    );
                }

                const result: unknown =
                    await response.json();

                const list = extractList(result)
                    .filter(isRecord)
                    .map((item) => ({
                        ...item,
                        waiting_days: (() => {
                            const value = getValueIgnoreCase(item, "waiting_days");
                            if (value === null || value === undefined ||
                                (typeof value !== "number" && typeof value !== "string") ||
                                String(value).trim() === "") return null;
                            const days = Number(value);
                            return Number.isInteger(days) && days >= 0 && days <= 170
                                ? days : null;
                        })(),
                        id: String(item.id ?? ""),
                        type: String(
                            item.type ?? ""
                        ).trim(),
                        role: Array.isArray(item.role)
                            ? item.role.map(String)
                            : String(item.role ?? ""),
                    }))
                    .filter((item) => item.type);

                if (!controller.signal.aborted) {
                    setMasterTypes(list);
                }
            } catch (err) {
                if (controller.signal.aborted) {
                    return;
                }

                console.error(err);
                setMasterTypes([]);
                setError(
                    "เกิดข้อผิดพลาดในการโหลดประเภทคำขอ"
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoadingMasterTypes(false);
                }
            }
        };

        const loadWarehouses = async () => {
            setLoadingWarehouses(true);

            try {
                const response = await fetch(
                    `${API_BASE}/warehouses.php`,
                    {
                        cache: "no-store",
                        signal: controller.signal,
                        headers: {
                            Accept: "application/json",
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        "โหลด Warehouse ไม่สำเร็จ"
                    );
                }

                const result: unknown =
                    await response.json();

                if (!controller.signal.aborted) {
                    setWarehouses(
                        extractList(result).filter(
                            isRecord
                        ) as WarehouseItem[]
                    );
                }
            } catch (err) {
                if (controller.signal.aborted) {
                    return;
                }

                console.error(err);
                setError(
                    "เกิดข้อผิดพลาดในการโหลดข้อมูล Warehouse"
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoadingWarehouses(false);
                }
            }
        };

        const loadTrucks = async () => {
            setLoadingTrucks(true);

            try {
                const response = await fetch(
                    `${API_BASE}/trucks.php`,
                    {
                        cache: "no-store",
                        signal: controller.signal,
                        headers: {
                            Accept: "application/json",
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        "โหลดข้อมูลรถไม่สำเร็จ"
                    );
                }

                const result: unknown =
                    await response.json();

                if (!controller.signal.aborted) {
                    setTrucks(
                        extractList(result).filter(
                            isRecord
                        ) as TruckItem[]
                    );
                }
            } catch (err) {
                if (controller.signal.aborted) {
                    return;
                }

                console.error(err);
                setError(
                    "เกิดข้อผิดพลาดในการโหลดข้อมูลรถ"
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoadingTrucks(false);
                }
            }
        };

        void loadMasterTypes();
        void loadWarehouses();
        void loadTrucks();

        return () => controller.abort();
    }, [open]);

    useEffect(() => {
        if (!showWarehouseDropdown) return;

        const handleClickOutside = (
            event: MouseEvent
        ) => {
            if (
                !warehouseDropdownRef.current?.contains(
                    event.target as Node
                )
            ) {
                setShowWarehouseDropdown(false);
            }
        };

        document.addEventListener(
            "mousedown",
            handleClickOutside
        );

        return () =>
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );
    }, [showWarehouseDropdown]);

    useEffect(() => {
        if (!openCalendar) return;

        const handleClickOutside = (
            event: MouseEvent
        ) => {
            const target = event.target as Node;

            if (
                !dateButtonRef.current?.contains(
                    target
                ) &&
                !endDateButtonRef.current?.contains(target) &&
                !calendarRef.current?.contains(
                    target
                )
            ) {
                setOpenCalendar(false);
            }
        };

        document.addEventListener(
            "mousedown",
            handleClickOutside
        );

        return () =>
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );
    }, [openCalendar]);

    // จัดการ focus ของ Modal ยืนยัน
    useEffect(() => {
        if (!showConfirmModal) return;

        const previousFocus =
            document.activeElement;

        const frame = window.requestAnimationFrame(
            () => {
                backButtonRef.current?.focus();
            }
        );

        return () => {
            window.cancelAnimationFrame(frame);

            if (
                previousFocus instanceof HTMLElement &&
                previousFocus.isConnected
            ) {
                previousFocus.focus();
            }
        };
    }, [showConfirmModal]);

    useEffect(() => {
        const qty = Number(formData.qty || 0);

        clearLicenseChecks();

        if (
            !needLicenseList ||
            !Number.isInteger(qty) ||
            qty <= 0
        ) {
            setLicenseReplaceList([]);
            return;
        }

        setLicenseReplaceList((previous) =>
            Array.from(
                { length: qty },
                (_, index) =>
                    previous[index] || ""
            )
        );
    }, [
        needLicenseList,
        formData.qty,
        dcCode,
    ]);

    useEffect(() => {
        setProviderSubsidiary("");
        setProviderPdf(null);
        setProviderPdfDocumentNo("");
        setAttachmentMode("new");
        setAttachmentId("");
        setAttachmentSearch("");

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }, [selectedProviderId, dcCode, open]);

    useEffect(() => {
        setSelectedProviderId("");
        setProviderSearch("");
    }, [dcCode, open]);

    useEffect(() => {
        if (
            formData.fleet_type &&
            !loadingMasterTypes &&
            !visibleMasterTypes.some(
                (item) =>
                    item.type ===
                    formData.fleet_type
            )
        ) {
            setFormData((previous) => ({
                ...previous,
                fleet_type: "",
                usage_date: "",
            }));

            setLicenseReplaceList([]);
            clearLicenseChecks();
        }
    }, [
        visibleMasterTypes,
        formData.fleet_type,
        loadingMasterTypes,
    ]);

    useEffect(() => {
        if (!open || !isAllNowProvider) {
            return;
        }

        const controller =
            new AbortController();

        setSubsidiaryOptions(
            parseSubsidiaries(
                selectedProvider?.subsidiary
            )
        );
        setLoadingSubsidiaries(true);

        void (async () => {
            try {
                const response = await fetch(
                    `${API_BASE}/suppliers.php`,
                    {
                        signal: controller.signal,
                    }
                );

                if (!response.ok) {
                    throw new Error("suppliers");
                }

                const result: unknown =
                    await response.json();

                const names = extractList(
                    result
                ).flatMap((row) => {
                    const id = getFirstText(
                        getValueIgnoreCase(
                            row,
                            "company_id"
                        ),
                        getValueIgnoreCase(
                            row,
                            "supplier_id"
                        ),
                        getValueIgnoreCase(
                            row,
                            "code"
                        ),
                        getValueIgnoreCase(row, "id")
                    );

                    const name = getFirstText(
                        getValueIgnoreCase(
                            row,
                            "only_company_name"
                        ),
                        getValueIgnoreCase(
                            row,
                            "company_name"
                        ),
                        getValueIgnoreCase(
                            row,
                            "name"
                        )
                    );

                    const isAllNow =
                        id === "40900" ||
                        [
                            "40900",
                            "บจ.ออลล์ นาว โลจิสติกส์",
                            "ออลล์ นาว โลจิสติกส์",
                        ].some(
                            (value) =>
                                normalizeText(
                                    value
                                ).replace(/\s+/g, "") ===
                                normalizeText(
                                    name
                                ).replace(/\s+/g, "")
                        );

                    return isAllNow
                        ? parseSubsidiaries(
                            getValueIgnoreCase(
                                row,
                                "subsidiary"
                            )
                        )
                        : [];
                });

                if (!controller.signal.aborted) {
                    setSubsidiaryOptions(
                        (previous) =>
                            [
                                ...new Set([
                                    ...previous,
                                    ...names,
                                ]),
                            ].sort((a, b) =>
                                a.localeCompare(b, "th")
                            )
                    );
                }
            } catch {
                // ยังพิมพ์ชื่อบริษัทภายใต้เองได้
            } finally {
                if (!controller.signal.aborted) {
                    setLoadingSubsidiaries(false);
                }
            }
        })();

        return () => controller.abort();
    }, [
        open,
        isAllNowProvider,
        selectedProvider,
    ]);

    useEffect(() => {
        if (
            !open ||
            !isAllNowProvider ||
            attachmentMode !== "existing"
        ) {
            return;
        }

        const controller =
            new AbortController();

        setLoadingAttachments(true);
        setAttachmentListError("");
        setAvailableAttachments([]);
        setAttachmentHasMore(false);

        const timer = window.setTimeout(() => {
            void (async () => {
                try {
                    const response = await fetch(
                        `${API_BASE}/fleet_attachments.php?q=${encodeURIComponent(
                            attachmentSearch
                        )}`,
                        {
                            signal: controller.signal,
                            cache: "no-store",
                        }
                    );

                    const result: unknown =
                        await response.json();

                    if (
                        !response.ok ||
                        !isRecord(result) ||
                        result.status === "error" ||
                        !Array.isArray(result.data)
                    ) {
                        throw new Error(
                            isRecord(result)
                                ? String(
                                    result.message ||
                                    "โหลดเอกสารเดิมไม่สำเร็จ"
                                )
                                : "โหลดเอกสารเดิมไม่สำเร็จ"
                        );
                    }

                    const rows = result.data
                        .filter(isRecord)
                        .map((item) => ({
                            attachment_id: String(
                                item.attachment_id ?? ""
                            ),
                            document_no: String(
                                item.document_no ?? ""
                            ),
                            file_name: String(
                                item.file_name ?? ""
                            ),
                        }));

                    if (!controller.signal.aborted) {
                        setAvailableAttachments(rows);
                        setAttachmentHasMore(
                            result.has_more === true
                        );
                    }
                } catch (err) {
                    if (!controller.signal.aborted) {
                        setAttachmentListError(
                            err instanceof Error
                                ? err.message
                                : "โหลดเอกสารเดิมไม่สำเร็จ"
                        );
                    }
                } finally {
                    if (!controller.signal.aborted) {
                        setLoadingAttachments(false);
                    }
                }
            })();
        }, 250);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [
        open,
        isAllNowProvider,
        attachmentMode,
        attachmentSearch,
        attachmentRefresh,
    ]);

    const handleSelectWarehouse = (
        item: WarehouseItem
    ) => {
        const code = getFirstText(
            getValueIgnoreCase(item, "DC_CODE")
        );
        const name = getFirstText(
            getValueIgnoreCase(item, "DC_NAME")
        );

        setSelectedWarehouseCode(code);
        setSelectedDC(item);
        setWarehouseSearchText(name || code);
        setShowWarehouseDropdown(false);

        setFormData((previous) => ({
            ...previous,
            fleet_truck_type: "",
        }));

        const qty = Number(formData.qty || 0);

        setLicenseReplaceList(
            needLicenseList &&
                Number.isInteger(qty) &&
                qty > 0
                ? Array.from(
                    { length: qty },
                    () => ""
                )
                : []
        );

        clearLicenseChecks();
        setError("");
    };

    const handleToggleCalendar = (target: "usage_date" | "usage_end_date" = "usage_date") => {
        const button = target === "usage_end_date" ? endDateButtonRef.current : dateButtonRef.current;
        if (!button) return;
        setCalendarTarget(target);
        const rect = button.getBoundingClientRect();

        const width = Math.min(
            340,
            window.innerWidth - 32
        );
        const height = 420;
        const padding = 16;
        const gap = 8;

        const below =
            window.innerHeight - rect.bottom;

        let top = rect.bottom + gap;

        if (
            below < height &&
            rect.top > height
        ) {
            top = rect.top - height - gap;
        }

        top = Math.max(
            padding,
            Math.min(
                top,
                Math.max(
                    padding,
                    window.innerHeight -
                    height -
                    padding
                )
            )
        );

        const left = Math.max(
            padding,
            Math.min(
                rect.left,
                window.innerWidth -
                width -
                padding
            )
        );

        setCalendarPosition({ top, left });
        setOpenCalendar(
            (previous) => calendarTarget === target ? !previous : true
        );
    };

    const handleChange = (
        event: React.ChangeEvent<
            | HTMLInputElement
            | HTMLTextAreaElement
            | HTMLSelectElement
        >
    ) => {
        const { name, value } = event.target;

        if (name === "workload") {
            const raw = value.replace(/,/g, "");

            if (raw && !/^\d+$/.test(raw)) {
                return;
            }

            setFormData((previous) => ({
                ...previous,
                workload: raw
                    ? Number(raw).toLocaleString(
                        "en-US"
                    )
                    : "",
            }));

            return;
        }

        if (name === "fleet_type") {
            setFormData((previous) => ({
                ...previous,
                fleet_type: value,
                usage_date: "",
            }));

            setLicenseReplaceList([]);
            clearLicenseChecks();
            setOpenCalendar(false);
            setError("");
            return;
        }

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));

        setError("");
    };

    const findDuplicateLicenseRow = (
        currentIndex: number,
        license: string
    ) =>
        licenseReplaceList.findIndex(
            (selectedLicense, index) =>
                index !== currentIndex &&
                normalizeText(
                    selectedLicense
                ) === normalizeText(license)
        );

    const checkLicenseDuplicate = async (
        index: number,
        license: string,
        checkVersion: number,
        contextVersion: number
    ) => {
        const isCurrent = () =>
            licenseContextVersionRef.current ===
            contextVersion &&
            licenseCheckVersionsRef.current[
            index
            ] === checkVersion;

        setCheckingLicenseIndexes(
            (previous) => ({
                ...previous,
                [index]: true,
            })
        );

        try {
            const response = await fetch(
                `${API_BASE}/check_license_duplicate.php?license=${encodeURIComponent(
                    license.trim()
                )}`,
                {
                    cache: "no-store",
                }
            );

            const result: unknown =
                await response.json();

            if (
                !response.ok ||
                !isRecord(result) ||
                result.status === "error" ||
                ![
                    true,
                    false,
                    0,
                    1,
                    "0",
                    "1",
                ].includes(
                    result.duplicate as
                    | boolean
                    | number
                    | string
                )
            ) {
                throw new Error(
                    "ตรวจสอบทะเบียนไม่สำเร็จ"
                );
            }

            if (!isCurrent()) return;

            const duplicate =
                result.duplicate === true ||
                result.duplicate === 1 ||
                result.duplicate === "1";

            setLicenseDuplicateStatus(
                (previous) => ({
                    ...previous,
                    [index]: duplicate,
                })
            );

            setLicenseCheckMessages(
                (previous) => ({
                    ...previous,
                    [index]: duplicate
                        ? "ทะเบียนนี้ถูกใช้งานแล้ว ไม่สามารถเลือกได้"
                        : "ทะเบียนนี้สามารถใช้งานได้",
                })
            );
        } catch (err) {
            if (!isCurrent()) return;

            console.error(err);

            setLicenseDuplicateStatus(
                (previous) => ({
                    ...previous,
                    [index]: null,
                })
            );

            setLicenseCheckMessages(
                (previous) => ({
                    ...previous,
                    [index]:
                        "ไม่สามารถตรวจสอบทะเบียนได้ กรุณาลองใหม่",
                })
            );
        } finally {
            if (isCurrent()) {
                setCheckingLicenseIndexes(
                    (previous) => ({
                        ...previous,
                        [index]: false,
                    })
                );
            }
        }
    };

    const handleLicenseReplaceChange = (
        index: number,
        value: string
    ) => {
        const truck =
            getTruckReplaceDetail(value);

        const finalValue =
            truck?.license || value;

        const version =
            (licenseCheckVersionsRef.current[
                index
            ] || 0) + 1;

        licenseCheckVersionsRef.current[
            index
        ] = version;

        setCheckingLicenseIndexes(
            (previous) => ({
                ...previous,
                [index]: false,
            })
        );

        const duplicateIndex =
            findDuplicateLicenseRow(
                index,
                finalValue
            );

        if (
            finalValue.trim() &&
            duplicateIndex >= 0
        ) {
            setLicenseReplaceList(
                (previous) => {
                    const next = [...previous];
                    next[index] = "";
                    return next;
                }
            );

            setLicenseDuplicateStatus(
                (previous) => ({
                    ...previous,
                    [index]: true,
                })
            );

            setLicenseCheckMessages(
                (previous) => ({
                    ...previous,
                    [index]:
                        `ทะเบียน ${finalValue} ถูกเลือกไว้ในรถทดแทนคันที่ ${duplicateIndex + 1
                        } แล้ว`,
                })
            );

            return;
        }

        setLicenseReplaceList((previous) => {
            const next = [...previous];
            next[index] = finalValue;
            return next;
        });

        setLicenseDuplicateStatus(
            (previous) => ({
                ...previous,
                [index]: null,
            })
        );

        setLicenseCheckMessages(
            (previous) => ({
                ...previous,
                [index]: "",
            })
        );

        if (truck) {
            void checkLicenseDuplicate(
                index,
                truck.license,
                version,
                licenseContextVersionRef.current
            );
        }
    };

    const resetForm = () => {
        setFormData({ ...EMPTY_FORM });
        setHasUsageEndDate(false);
        setLicenseReplaceList([]);
        clearLicenseChecks();

        setSelectedProviderId("");
        setProviderSearch("");
        setProviderSubsidiary("");
        setProviderPdf(null);
        setProviderPdfDocumentNo("");
        setAttachmentMode("new");
        setAttachmentId("");
        setAttachmentSearch("");

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }

        if (isCenterMode) {
            setSelectedWarehouseCode("");
            setSelectedDC(null);
            setWarehouseSearchText("");
        }

        setShowWarehouseDropdown(false);
        setOpenCalendar(false);
        setShowConfirmModal(false);
        setError("");
    };

    const handleClose = () => {
        if (saving) return;

        resetForm();
        onClose();
    };

    const validateForm = (): boolean => {
        const missingFields: string[] = [];
        if (!dcCode) missingFields.push("คลังปลายทาง");
        if (!selectedProvider) missingFields.push("ผู้ให้บริการ");
        if (!formData.fleet_type.trim()) missingFields.push("ประเภทคำขอ");
        if (!formData.fleet_truck_type.trim()) missingFields.push("ประเภทกองรถ (Fleet Type)");
        if (!formData.qty.trim()) missingFields.push("จำนวนรถที่ขอ (คัน)");
        if (!formData.usage_date.trim()) missingFields.push("วันที่ใช้งาน");
        if (hasUsageEndDate && !formData.usage_end_date.trim()) {
            missingFields.push("วันที่สิ้นสุดการใช้งาน");
        }
        if (isAllNowProvider && attachmentMode === "existing" && !attachmentId) {
            missingFields.push("เอกสารแนบเดิม");
        }
        if (isAllNowProvider && providerPdf && !providerPdfDocumentNo.trim()) {
            missingFields.push("เลขเอกสารแนบ");
        }
        if (needLicenseList && Number(formData.qty) > 0) {
            const qty = Number(formData.qty);
            const missingLicenseRows = Number.isInteger(qty)
                ? Array.from({ length: qty }, (_, index) => index)
                    .filter(index => !licenseReplaceList[index]?.trim())
                    .map(index => index + 1)
                : [];
            if (missingLicenseRows.length) {
                missingFields.push(`ทะเบียนรถที่ถูกทดแทน คันที่ ${missingLicenseRows.join(", ")}`);
            }
        }
        if (missingFields.length) {
            setError(`กรุณาระบุข้อมูลต่อไปนี้ให้ครบถ้วนก่อนดำเนินการต่อนะครับ\n${missingFields.map((field, index) => `${index + 1}. ${field}`).join("\n")}`);
            return false;
        }

        if (
            !visibleMasterTypes.some(
                (item) =>
                    item.type ===
                    formData.fleet_type
            )
        ) {
            setError(
                "กรุณาเลือกประเภทคำขอให้ตรงกับแหล่งคำขอ"
            );
            return false;
        }

        if (!selectedProvider) {
            setError(
                "กรุณาเลือกผู้ให้บริการสำหรับคำขอจากส่วนกลาง"
            );
            return false;
        }

        if (
            isAllNowProvider &&
            attachmentMode === "existing" &&
            !attachmentId
        ) {
            setError("กรุณาเลือกเอกสารเดิม");
            return false;
        }

        if (
            isAllNowProvider &&
            providerPdf &&
            !providerPdfDocumentNo.trim()
        ) {
            setError(
                "กรุณาระบุเลขเอกสารแนบ"
            );
            return false;
        }

        if (!requestBy) {
            setError(
                "ไม่พบรหัสผู้ขอ กรุณา Login ใหม่"
            );
            return false;
        }

        if (!dcCode) {
            setError(
                canSelectWarehouse
                    ? "กรุณาเลือกคลังปลายทางก่อนบันทึกคำขอ"
                    : "ไม่พบ warehouse / dc_code ของผู้ใช้งาน"
            );
            return false;
        }


        const qty = Number(formData.qty);

        if (
            !Number.isInteger(qty) ||
            qty <= 0
        ) {
            setError(
                "กรุณาระบุจำนวนรถเป็นจำนวนเต็มมากกว่า 0 คันนะครับ"
            );
            return false;
        }

        if (
            formData.workload.trim() &&
            toNumber(formData.workload) <= 0
        ) {
            setError(
                "กรุณาระบุปริมาณงาน (Workload) มากกว่า 0 หรือเว้นว่างหากไม่ต้องการระบุนะครับ"
            );
            return false;
        }

        if (
            formData.truckturn.trim() &&
            (!Number.isFinite(
                Number(formData.truckturn)
            ) ||
                Number(formData.truckturn) <=
                0)
        ) {
            setError(
                "กรุณาระบุจำนวนรอบรถ (Truck Turn) มากกว่า 0 หรือเว้นว่างหากไม่ต้องการระบุนะครับ"
            );
            return false;
        }

        if (waitingDays === null || !minUsageDate) {
            setError(
                "ยังไม่ได้กำหนด waiting_days ที่ถูกต้องสำหรับประเภทคำขอนี้"
            );
            return false;
        }

        if (hasUsageEndDate && formData.usage_end_date < formData.usage_date) {
            setError("กรุณาเลือกวันที่สิ้นสุดการใช้งานให้ตรงกับหรือหลังวันที่ใช้งานนะครับ");
            return false;
        }

        if (formData.usage_date < minUsageDate) {
            setError(
                `ประเภทคำขอนี้ต้องเลือกวันที่ล่วงหน้าอย่างน้อย ${waitingDays} วัน ` +
                `เลือกได้ตั้งแต่ ${formatShowDate(minUsageDate)} เป็นต้นไป`
            );
            return false;
        }

        if (needLicenseList) {
            if (hasCheckingLicense) {
                setError(
                    "กรุณารอให้ระบบตรวจสอบทะเบียนเสร็จก่อน"
                );
                return false;
            }

            const licenses =
                licenseReplaceList.slice(
                    0,
                    qty
                );

            if (
                licenses.length < qty ||
                licenses.some(
                    (license) =>
                        !license.trim()
                )
            ) {
                setError(
                    `กรุณาเลือกทะเบียนรถทดแทนให้ครบ ${qty} คัน`
                );
                return false;
            }

            const normalized =
                licenses.map(normalizeText);

            if (
                new Set(normalized).size !==
                normalized.length
            ) {
                setError(
                    "มีทะเบียนรถที่เลือกซ้ำในคำขอเดียวกัน"
                );
                return false;
            }

            if (
                licenses.some(
                    (license) =>
                        !truckReplaceOptions.some(
                            (truck) =>
                                normalizeText(
                                    truck.license
                                ) ===
                                normalizeText(license)
                        )
                )
            ) {
                setError(
                    "กรุณาเลือกทะเบียนรถจากรายการของคลังที่เลือก"
                );
                return false;
            }

            if (
                licenses.some(
                    (_, index) =>
                        licenseDuplicateStatus[
                        index
                        ] !== false
                )
            ) {
                setError(
                    "ทะเบียนต้องขึ้นสถานะใช้งานได้ครบทุกคันก่อนบันทึก"
                );
                return false;
            }
        }

        setError("");
        return true;
    };

    // กดบันทึกครั้งแรก: ตรวจสอบแล้วเปิด Modal
    // ยังไม่เรียก API บันทึกข้อมูล
    const handleSubmit = (
        event: React.FormEvent
    ) => {
        event.preventDefault();

        if (
            saving ||
            showConfirmModal ||
            !validateForm()
        ) {
            return;
        }

        setOpenCalendar(false);
        setShowWarehouseDropdown(false);
        setShowConfirmModal(true);
    };

    const closeConfirmation = () => {
        if (
            saving ||
            submittingRef.current
        ) {
            return;
        }

        setShowConfirmModal(false);

        window.requestAnimationFrame(() => {
            saveButtonRef.current?.focus();
        });
    };

    // ส่ง API เฉพาะเมื่อกดยืนยันใน Modal
    const handleConfirmSubmit = async () => {
        if (
            submittingRef.current ||
            saving ||
            !showConfirmModal
        ) {
            return;
        }

        // ตรวจซ้ำก่อนส่ง เผื่อข้อมูลอ้างอิงเปลี่ยน
        if (
            !validateForm() ||
            !selectedProvider
        ) {
            return;
        }

        submittingRef.current = true;
        setSaving(true);

        try {
            const payload = {
                request_source: requestSource,
                company_id: selectedProvider.id,
                company_name:
                    isAllNowProvider &&
                        providerSubsidiary.trim()
                        ? `${selectedProvider.name}(${providerSubsidiary.trim()})`
                        : selectedProvider.name,

                id: null,
                running_doc: runningDoc,
                date: today,
                dc_code: dcCode,
                dc_type: dcType,
                fleet_type: formData.fleet_type,
                fleet_truck_type:
                    formData.fleet_truck_type,

                license_replace: needLicenseList
                    ? licenseReplaceList
                        .slice(
                            0,
                            Number(formData.qty)
                        )
                        .map((license) =>
                            license.trim()
                        )
                    : [],

                qty: Number(formData.qty),
                usage_date: formData.usage_date,
                usage_end_date: hasUsageEndDate ? formData.usage_end_date : null,

                workload:
                    formData.workload.trim()
                        ? toNumber(
                            formData.workload
                        )
                        : 0,

                truckturn: Number(
                    formData.truckturn || 0
                ),

                status: "gm_pending",
                request_by: requestBy,
                remark: formData.remark,

                ...(isAllNowProvider
                    ? {
                        attachment_id:
                            attachmentMode ===
                                "existing"
                                ? Number(attachmentId)
                                : null,

                        attachment_document_no:
                            providerPdfDocumentNo.trim(),

                        attachment_upload_key:
                            attachmentMode ===
                                "new" && providerPdf
                                ? "pdf_center"
                                : null,
                    }
                    : {}),
            };

            const submission =
                new FormData();

            submission.append(
                "payload",
                JSON.stringify(payload)
            );

            if (
                isAllNowProvider &&
                attachmentMode === "new" &&
                providerPdf
            ) {
                submission.append(
                    "pdf_center",
                    providerPdf,
                    providerPdf.name
                );
            }

            const response = await fetch(
                `${API_BASE}/request_save_tc.php`,
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                    },
                    body: submission,
                }
            );

            const result: unknown =
                await response
                    .json()
                    .catch(() => null);

            if (
                !response.ok ||
                (isRecord(result) &&
                    result.status === "error")
            ) {
                throw new Error(
                    isRecord(result)
                        ? String(
                            result.message ||
                            "บันทึกข้อมูลไม่สำเร็จ"
                        )
                        : "บันทึกข้อมูลไม่สำเร็จ"
                );
            }
        } catch (err) {
            console.error(err);

            setError(
                err instanceof Error
                    ? err.message
                    : "เกิดข้อผิดพลาดในการบันทึกข้อมูล"
            );

            return;
        } finally {
            submittingRef.current = false;
            setSaving(false);
        }

        setShowConfirmModal(false);

        window.dispatchEvent(
            new Event(
                "sidebarSummaryChanged"
            )
        );

        resetForm();
        onSuccess();
        onClose();
    };

    const handleConfirmKeyDown = (
        event: React.KeyboardEvent<HTMLElement>
    ) => {
        if (event.key === "Escape") {
            event.stopPropagation();
            closeConfirmation();
            return;
        }

        if (event.key !== "Tab") return;

        const elements =
            confirmDialogRef.current?.querySelectorAll<HTMLElement>(
                'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]'
            );

        if (!elements?.length) {
            event.preventDefault();
            return;
        }

        const first = elements[0];
        const last =
            elements[elements.length - 1];

        if (
            event.shiftKey &&
            document.activeElement === first
        ) {
            event.preventDefault();
            last.focus();
        } else if (
            !event.shiftKey &&
            document.activeElement === last
        ) {
            event.preventDefault();
            first.focus();
        }
    };

    if (!open) return null;

    const inputClass =
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:opacity-60";

    const labelClass =
        "mb-1 block text-[11px] font-semibold text-slate-500";

    return (
        <>
            <style>{`
        .new-vehicle-modal,
        .vehicle-confirm-modal {
          font-family: inherit;
          font-size: 12px;
          line-height: 1.55;
        }

        .new-vehicle-modal :is(button, input, textarea, select),
        .vehicle-confirm-modal :is(button, input, textarea, select) {
          font-family: inherit;
        }

        .new-vehicle-modal :is(input:not([type="checkbox"]):not([type="radio"]), textarea, select) {
          font-size: 12px;
          transition: border-color .15s, box-shadow .15s;
        }

        .new-vehicle-modal :is(input, textarea, select):focus {
          border-color: #60a5fa;
          box-shadow: 0 0 0 3px #dbeafe80;
        }

        .new-vehicle-modal :is(button, input, textarea, select):focus-visible,
        .vehicle-confirm-modal :is(button, a):focus-visible {
          outline: 2px solid #2563eb;
          outline-offset: 2px;
        }

        .new-vehicle-modal,
        .vehicle-confirm-modal {
          scrollbar-color: #cbd5e1 #f8fafc;
        }

        .vehicle-calendar .rdrCalendarWrapper {
          width: 100%;
          font-family: inherit;
          color: #334155;
        }

        .vehicle-calendar .rdrMonth {
          width: 100%;
          padding: 0;
        }

        .vehicle-calendar .rdrMonthAndYearWrapper {
          height: 44px;
          padding-top: 0;
        }

        .vehicle-calendar .rdrMonthAndYearPickers select {
          border-radius: 10px;
          background: #f8fafc;
          font-size: 12px;
          font-weight: 600;
        }

        .vehicle-calendar .rdrWeekDay {
          color: #64748b;
          font-size: 11px;
        }

        .vehicle-calendar .rdrDay {
          height: 38px;
        }

        .vehicle-calendar .rdrDayNumber span {
          font-size: 12px;
        }

        .vehicle-calendar .rdrDayDisabled {
          background: transparent;
        }

        .vehicle-calendar .rdrDayDisabled .rdrDayNumber span {
          color: #cbd5e1 !important;
          text-decoration: line-through;
        }

        @media (prefers-reduced-motion: reduce) {
          .new-vehicle-modal *,
          .vehicle-confirm-modal * {
            transition: none !important;
          }
        }
      `}</style>

            {error && typeof document !== "undefined" && createPortal(
                <div
                    style={{ zIndex: 2147483001 }}
                    className="pointer-events-none fixed inset-0 flex items-center justify-center px-4"
                    role="alert"
                    aria-live="assertive"
                >
                    <div className="w-full max-w-md whitespace-pre-line rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 shadow-2xl">
                        <span className="mr-1 font-semibold">
                            แจ้งเตือน!
                        </span>
                        {error}
                    </div>
                </div>,
                document.body
            )}

            {/* แบบฟอร์มหลัก */}
            <div
                inert={showConfirmModal}
                className="new-vehicle-modal fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 text-slate-800"
            >
                <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-blue-50/70 via-white to-white px-5 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                                <Truck
                                    size={18}
                                    aria-hidden="true"
                                />
                            </span>

                            <div className="min-w-0">
                                <h2 className="text-base font-semibold">
                                    คำขอออกรถใหม่
                                </h2>
                                <p className="mt-0.5 text-[11px] text-slate-500">
                                    เลขที่เอกสาร:{" "}
                                    {runningDoc}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={saving}
                            aria-label="ปิดหน้าต่าง"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
                            {renderSourceTabs?.(saving)}

                            <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3 text-[11px] md:grid-cols-4">
                                {canSelectWarehouse && (
                                    <div
                                        className="md:col-span-4"
                                        ref={
                                            warehouseDropdownRef
                                        }
                                    >
                                        <label
                                            className={labelClass}
                                        >
                                            {isCenterMode
                                                ? "เลือกคลังปลายทาง"
                                                : "เลือก Warehouse / DC"}
                                            <span className="ml-1 text-red-500">
                                                *
                                            </span>
                                        </label>

                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={
                                                    warehouseSearchText
                                                }
                                                disabled={
                                                    loadingWarehouses ||
                                                    saving
                                                }
                                                onChange={(
                                                    event
                                                ) => {
                                                    setWarehouseSearchText(
                                                        event.target.value
                                                    );
                                                    setSelectedWarehouseCode(
                                                        ""
                                                    );
                                                    setSelectedDC(null);
                                                    setShowWarehouseDropdown(
                                                        true
                                                    );
                                                    setFormData(
                                                        (previous) => ({
                                                            ...previous,
                                                            fleet_truck_type:
                                                                "",
                                                        })
                                                    );
                                                    setLicenseReplaceList(
                                                        []
                                                    );
                                                    clearLicenseChecks();
                                                    setError("");
                                                }}
                                                onFocus={() =>
                                                    setShowWarehouseDropdown(
                                                        true
                                                    )
                                                }
                                                placeholder={
                                                    loadingWarehouses
                                                        ? "กำลังโหลดรายชื่อคลัง..."
                                                        : "พิมพ์รหัสหรือชื่อคลัง..."
                                                }
                                                className={`${inputClass} pr-10`}
                                            />

                                            <button
                                                type="button"
                                                disabled={
                                                    loadingWarehouses
                                                }
                                                aria-label="แสดงรายการคลัง"
                                                onClick={() =>
                                                    setShowWarehouseDropdown(
                                                        (previous) =>
                                                            !previous
                                                    )
                                                }
                                                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-slate-400 hover:bg-slate-100"
                                            >
                                                ▼
                                            </button>

                                            {showWarehouseDropdown &&
                                                !loadingWarehouses && (
                                                    <div className="absolute left-0 right-0 top-full z-[60] mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                                                        {filteredWarehouseOptions.length >
                                                            0 ? (
                                                            filteredWarehouseOptions.map(
                                                                (item) => {
                                                                    const code =
                                                                        getFirstText(
                                                                            getValueIgnoreCase(
                                                                                item,
                                                                                "DC_CODE"
                                                                            )
                                                                        );
                                                                    const name =
                                                                        getFirstText(
                                                                            getValueIgnoreCase(
                                                                                item,
                                                                                "DC_NAME"
                                                                            )
                                                                        );
                                                                    const type =
                                                                        getFirstText(
                                                                            getValueIgnoreCase(
                                                                                item,
                                                                                "DC_TYPE"
                                                                            )
                                                                        );

                                                                    return (
                                                                        <button
                                                                            key={
                                                                                code
                                                                            }
                                                                            type="button"
                                                                            onClick={() =>
                                                                                handleSelectWarehouse(
                                                                                    item
                                                                                )
                                                                            }
                                                                            className={`block w-full px-3 py-2 text-left text-xs hover:bg-blue-50 ${selectedWarehouseCode ===
                                                                                code
                                                                                ? "bg-blue-50 text-blue-700"
                                                                                : "text-slate-700"
                                                                                }`}
                                                                        >
                                                                            <span className="block font-semibold">
                                                                                {name ||
                                                                                    code}
                                                                            </span>
                                                                            <span className="mt-0.5 block text-[11px] text-slate-500">
                                                                                DC Code:{" "}
                                                                                {code}
                                                                                {type
                                                                                    ? ` • ${type}`
                                                                                    : ""}
                                                                            </span>
                                                                        </button>
                                                                    );
                                                                }
                                                            )
                                                        ) : (
                                                            <p className="px-3 py-3 text-xs text-slate-400">
                                                                ไม่พบคลังที่ค้นหา
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                        </div>

                                        {!selectedWarehouseCode &&
                                            warehouseSearchText && (
                                                <p className="mt-1 text-[11px] text-amber-600">
                                                    กรุณาเลือกคลังจากรายการ
                                                </p>
                                            )}
                                    </div>
                                )}

                                <div>
                                    <p className="font-semibold text-slate-400">
                                        วันที่สร้างคำขอ
                                    </p>
                                    <p className="mt-1 font-semibold">
                                        {formatShowDate(today)}
                                    </p>
                                </div>

                                <div>
                                    <p className="font-semibold text-slate-400">
                                        DC Code
                                    </p>
                                    <p className="mt-1 font-semibold">
                                        {dcCode || "-"}
                                    </p>
                                </div>

                                <div>
                                    <p className="font-semibold text-slate-400">
                                        DC Type
                                    </p>
                                    <p className="mt-1 font-semibold">
                                        {dcType || "-"}
                                    </p>
                                </div>

                                <div>
                                    <p className="font-semibold text-slate-400">
                                        ผู้ขอ
                                    </p>
                                    <p className="mt-1 break-words font-semibold">
                                        {requestBy || "-"}
                                    </p>
                                </div>
                            </div>

                            {/* ผู้ให้บริการ */}
                            <section className="mb-4 rounded-xl border border-blue-100 bg-blue-50/40 p-3">
                                <h3 className="mb-2 font-semibold">
                                    เลือกผู้ให้บริการ{" "}
                                    <span className="text-red-500">
                                        *
                                    </span>
                                </h3>

                                <input
                                    aria-label="ค้นหาผู้ให้บริการ"
                                    value={providerSearch}
                                    disabled={saving}
                                    onChange={(event) =>
                                        setProviderSearch(
                                            event.target.value
                                        )
                                    }
                                    placeholder="ค้นหาชื่อ รหัส หรือเกรดผู้ให้บริการ"
                                    className={`mb-3 ${inputClass}`}
                                />

                                <div
                                    role="radiogroup"
                                    aria-label="ผู้ให้บริการ"
                                    className="grid max-h-56 gap-2 overflow-y-auto md:grid-cols-2"
                                >
                                    {filteredProviders.map(
                                        (item) => (
                                            <label
                                                key={item.id}
                                                className={`flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-3 ${selectedProviderId ===
                                                    item.id
                                                    ? "border-blue-500 ring-1 ring-blue-500"
                                                    : "border-slate-200"
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="provider"
                                                    disabled={saving}
                                                    checked={
                                                        selectedProviderId ===
                                                        item.id
                                                    }
                                                    onChange={() =>
                                                        setSelectedProviderId(
                                                            item.id
                                                        )
                                                    }
                                                />

                                                <span className="min-w-0">
                                                    <span className="block font-semibold">
                                                        {item.name}
                                                    </span>
                                                    <span className="mt-1 block text-[11px] text-slate-500">
                                                        รหัส {item.id} ·
                                                        เกรด{" "}
                                                        {item.rating ||
                                                            "ยังไม่มีข้อมูล"}
                                                    </span>
                                                </span>
                                            </label>
                                        )
                                    )}
                                </div>

                                {!filteredProviders.length && (
                                    <p className="py-3 text-slate-500">
                                        ไม่พบผู้ให้บริการ
                                        กรุณาตรวจสอบคลังหรือรายการผู้ให้บริการ
                                    </p>
                                )}

                                {isAllNowProvider && (
                                    <>
                                        <label className="mt-3 block">
                                            <span
                                                className={
                                                    labelClass
                                                }
                                            >
                                                บริษัทภายใต้
                                            </span>

                                            <input
                                                type="text"
                                                list="center-provider-subsidiaries"
                                                value={
                                                    providerSubsidiary
                                                }
                                                disabled={saving}
                                                autoComplete="off"
                                                onChange={(
                                                    event
                                                ) =>
                                                    setProviderSubsidiary(
                                                        event.target
                                                            .value
                                                    )
                                                }
                                                placeholder={
                                                    loadingSubsidiaries
                                                        ? "กำลังโหลดบริษัทภายใต้..."
                                                        : "พิมพ์หรือเลือกบริษัทภายใต้"
                                                }
                                                className={
                                                    inputClass
                                                }
                                            />

                                            <datalist id="center-provider-subsidiaries">
                                                {subsidiaryOptions.map(
                                                    (name) => (
                                                        <option
                                                            key={name}
                                                            value={name}
                                                        />
                                                    )
                                                )}
                                            </datalist>

                                            {!loadingSubsidiaries &&
                                                !subsidiaryOptions.length && (
                                                    <p className="mt-1 text-[11px] text-slate-500">
                                                        สามารถพิมพ์ชื่อบริษัทภายใต้ได้
                                                    </p>
                                                )}
                                        </label>

                                        <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                            <h4 className="font-semibold">
                                                เอกสารแนบผู้ให้บริการ
                                            </h4>

                                            <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1">
                                                {(
                                                    [
                                                        "new",
                                                        "existing",
                                                    ] as const
                                                ).map((mode) => (
                                                    <button
                                                        key={mode}
                                                        type="button"
                                                        disabled={
                                                            saving
                                                        }
                                                        onClick={() => {
                                                            setAttachmentMode(
                                                                mode
                                                            );
                                                            setAttachmentId(
                                                                ""
                                                            );
                                                            setProviderPdf(
                                                                null
                                                            );
                                                            setProviderPdfDocumentNo(
                                                                ""
                                                            );
                                                        }}
                                                        className={`rounded-lg px-2 py-2 text-[11px] font-semibold ${attachmentMode ===
                                                            mode
                                                            ? "bg-blue-700 text-white"
                                                            : "text-slate-700 hover:bg-blue-50"
                                                            }`}
                                                    >
                                                        {mode ===
                                                            "new"
                                                            ? "แนบ PDF ใหม่"
                                                            : "เลือกเอกสารเดิม"}
                                                    </button>
                                                ))}
                                            </div>

                                            {attachmentMode ===
                                                "existing" ? (
                                                <div className="space-y-2">
                                                    <input
                                                        type="search"
                                                        aria-label="ค้นหาเอกสารเดิม"
                                                        value={
                                                            attachmentSearch
                                                        }
                                                        disabled={
                                                            saving
                                                        }
                                                        onChange={(
                                                            event
                                                        ) =>
                                                            setAttachmentSearch(
                                                                event
                                                                    .target
                                                                    .value
                                                            )
                                                        }
                                                        placeholder="ค้นหาเลขเอกสารหรือชื่อไฟล์"
                                                        className={
                                                            inputClass
                                                        }
                                                    />

                                                    <select
                                                        aria-label="เลือกเอกสารแนบเดิม"
                                                        value={
                                                            attachmentId
                                                        }
                                                        disabled={
                                                            saving ||
                                                            loadingAttachments
                                                        }
                                                        onChange={(
                                                            event
                                                        ) => {
                                                            const selected =
                                                                availableAttachments.find(
                                                                    (
                                                                        item
                                                                    ) =>
                                                                        String(
                                                                            item.attachment_id
                                                                        ) ===
                                                                        event
                                                                            .target
                                                                            .value
                                                                );

                                                            setAttachmentId(
                                                                selected
                                                                    ? String(
                                                                        selected.attachment_id
                                                                    )
                                                                    : ""
                                                            );
                                                            setProviderPdfDocumentNo(
                                                                selected?.document_no ??
                                                                ""
                                                            );
                                                            setProviderPdf(
                                                                null
                                                            );
                                                        }}
                                                        className={
                                                            inputClass
                                                        }
                                                    >
                                                        <option value="">
                                                            {loadingAttachments
                                                                ? "กำลังโหลดเอกสาร..."
                                                                : "เลือกเอกสารที่เคยแนบ"}
                                                        </option>

                                                        {attachmentId &&
                                                            !availableAttachments.some(
                                                                (
                                                                    item
                                                                ) =>
                                                                    String(
                                                                        item.attachment_id
                                                                    ) ===
                                                                    attachmentId
                                                            ) && (
                                                                <option
                                                                    value={
                                                                        attachmentId
                                                                    }
                                                                >
                                                                    {
                                                                        providerPdfDocumentNo
                                                                    }
                                                                </option>
                                                            )}

                                                        {availableAttachments.map(
                                                            (item) => (
                                                                <option
                                                                    key={String(
                                                                        item.attachment_id
                                                                    )}
                                                                    value={String(
                                                                        item.attachment_id
                                                                    )}
                                                                >
                                                                    {
                                                                        item.document_no
                                                                    }{" "}
                                                                    (
                                                                    {
                                                                        item.file_name
                                                                    }
                                                                    )
                                                                </option>
                                                            )
                                                        )}
                                                    </select>

                                                    {attachmentHasMore && (
                                                        <p className="text-[11px] text-slate-500">
                                                            แสดง 200
                                                            เอกสารล่าสุด
                                                            กรุณาค้นหาเพื่อเจาะจงเอกสาร
                                                        </p>
                                                    )}

                                                    {attachmentListError && (
                                                        <p className="text-[11px] text-rose-700">
                                                            {
                                                                attachmentListError
                                                            }{" "}
                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    saving
                                                                }
                                                                onClick={() =>
                                                                    setAttachmentRefresh(
                                                                        (
                                                                            previous
                                                                        ) =>
                                                                            previous +
                                                                            1
                                                                    )
                                                                }
                                                                className="underline"
                                                            >
                                                                ลองใหม่
                                                            </button>
                                                        </p>
                                                    )}

                                                    {attachmentId && (
                                                        <a
                                                            href={`${API_BASE}/fleet_attachments.php?action=file&id=${encodeURIComponent(
                                                                attachmentId
                                                            )}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-block font-semibold text-blue-700 underline"
                                                        >
                                                            เปิด PDF
                                                            ที่เลือก
                                                        </a>
                                                    )}
                                                </div>
                                            ) : (
                                                <label className="block">
                                                    <span
                                                        className={
                                                            labelClass
                                                        }
                                                    >
                                                        นำเข้า PDF
                                                        ไม่เกิน 10 MB
                                                    </span>

                                                    <input
                                                        ref={
                                                            fileInputRef
                                                        }
                                                        type="file"
                                                        accept=".pdf,application/pdf"
                                                        disabled={
                                                            saving
                                                        }
                                                        onChange={(
                                                            event
                                                        ) => {
                                                            const file =
                                                                event
                                                                    .currentTarget
                                                                    .files?.[0] ??
                                                                null;

                                                            if (
                                                                file &&
                                                                (!/\.pdf$/i.test(
                                                                    file.name
                                                                ) ||
                                                                    (file.type &&
                                                                        file.type !==
                                                                        "application/pdf") ||
                                                                    file.size >
                                                                    10 *
                                                                    1024 *
                                                                    1024 ||
                                                                    file.size ===
                                                                    0)
                                                            ) {
                                                                event.currentTarget.value =
                                                                    "";
                                                                setProviderPdf(
                                                                    null
                                                                );
                                                                setProviderPdfDocumentNo(
                                                                    ""
                                                                );
                                                                setError(
                                                                    "กรุณาเลือก PDF ขนาดไม่เกิน 10 MB"
                                                                );
                                                                return;
                                                            }

                                                            setProviderPdf(
                                                                file
                                                            );
                                                            setAttachmentId(
                                                                ""
                                                            );
                                                            setProviderPdfDocumentNo(
                                                                file
                                                                    ? file.name.replace(
                                                                        /\.pdf$/i,
                                                                        ""
                                                                    )
                                                                    : ""
                                                            );
                                                        }}
                                                        className="block w-full text-[11px] file:mr-2 file:rounded-lg file:border-0 file:bg-blue-700 file:px-3 file:py-2.5 file:text-xs file:font-semibold file:text-white"
                                                    />
                                                </label>
                                            )}

                                            <label className="block">
                                                <span
                                                    className={
                                                        labelClass
                                                    }
                                                >
                                                    เลขเอกสารแนบ
                                                </span>

                                                <input
                                                    type="text"
                                                    maxLength={255}
                                                    value={
                                                        providerPdfDocumentNo
                                                    }
                                                    disabled={saving}
                                                    readOnly={
                                                        attachmentMode ===
                                                        "existing"
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        setProviderPdfDocumentNo(
                                                            event.target
                                                                .value
                                                        )
                                                    }
                                                    placeholder="เลขเอกสารแนบ"
                                                    className={`${inputClass} read-only:bg-slate-100`}
                                                />
                                            </label>

                                            {providerPdf && (
                                                <p className="break-all rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[11px]">
                                                    เลือกแล้ว:{" "}
                                                    {providerPdf.name}
                                                </p>
                                            )}
                                        </div>
                                    </>
                                )}
                            </section>

                            {/* รายละเอียดคำขอ */}
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                                <div>
                                    <label
                                        className={labelClass}
                                    >
                                        ประเภทคำขอ{" "}
                                        <span className="text-red-500">
                                            *
                                        </span>
                                    </label>

                                    <select
                                        name="fleet_type"
                                        value={
                                            formData.fleet_type
                                        }
                                        onChange={handleChange}
                                        disabled={
                                            loadingMasterTypes ||
                                            saving
                                        }
                                        className={inputClass}
                                    >
                                        <option value="">
                                            {loadingMasterTypes
                                                ? "กำลังโหลด..."
                                                : "-- เลือกประเภทคำขอ --"}
                                        </option>

                                        {visibleMasterTypes.map(
                                            (item) => (
                                                <option
                                                    key={item.id}
                                                    value={item.type}
                                                >
                                                    {item.type}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label
                                        className={labelClass}
                                    >
                                        ประเภทกองรถ (Fleet
                                        Type){" "}
                                        <span className="text-red-500">
                                            *
                                        </span>
                                    </label>

                                    <select
                                        name="fleet_truck_type"
                                        value={
                                            formData.fleet_truck_type
                                        }
                                        onChange={handleChange}
                                        disabled={
                                            !dcCode ||
                                            loadingTrucks ||
                                            saving
                                        }
                                        className={inputClass}
                                    >
                                        <option value="">
                                            {loadingTrucks
                                                ? "กำลังโหลด..."
                                                : !dcCode
                                                    ? "กรุณาเลือกคลัง"
                                                    : truckTypeOptions.length
                                                        ? "-- เลือกประเภทรถ --"
                                                        : "ไม่พบประเภทรถของคลังนี้"}
                                        </option>

                                        {truckTypeOptions.map(
                                            (type) => (
                                                <option
                                                    key={type}
                                                    value={type}
                                                >
                                                    {type}
                                                </option>
                                            )
                                        )}
                                    </select>

                                    <p className="mt-1 text-[11px] text-slate-400">
                                        DC_CODE:{" "}
                                        {dcCode || "-"} / พบ{" "}
                                        {
                                            truckTypeOptions.length
                                        }{" "}
                                        ประเภท
                                    </p>
                                </div>

                                <div>
                                    <label
                                        className={labelClass}
                                    >
                                        จำนวนรถที่ขอ (คัน){" "}
                                        <span className="text-red-500">
                                            *
                                        </span>
                                    </label>

                                    <input
                                        type="number"
                                        name="qty"
                                        value={formData.qty}
                                        min={1}
                                        step={1}
                                        disabled={saving}
                                        onChange={handleChange}
                                        placeholder="0"
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label
                                        className={labelClass}
                                    >
                                        วันที่ใช้งาน{" "}
                                        <span className="text-red-500">
                                            *
                                        </span>
                                    </label>

                                    <button
                                        ref={dateButtonRef}
                                        type="button"
                                        onClick={() => handleToggleCalendar("usage_date")}
                                        disabled={
                                            !formData.fleet_type ||
                                            !minUsageDate ||
                                            saving
                                        }
                                        className={`${inputClass} text-left disabled:cursor-not-allowed`}
                                    >
                                        {formatShowDate(formData.usage_date)}
                                    </button>

                                    <div className="mt-3 space-y-3">
                                        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                                            <input
                                                type="checkbox"
                                                checked={hasUsageEndDate}
                                                disabled={saving}
                                                onChange={(event) => {
                                                    setHasUsageEndDate(event.target.checked);
                                                    setOpenCalendar(false);
                                                    setFormData((previous) => ({ ...previous, usage_end_date: "" }));
                                                    setError("");
                                                }}
                                                className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                                            />
                                            <span>ระบุวันที่สิ้นสุดการใช้งาน</span>
                                        </label>
                                        {hasUsageEndDate && (
                                            <div className="space-y-1">
                                                <label htmlFor="center-usage-end-date" className={labelClass}>
                                                    วันที่สิ้นสุดการใช้งาน <span className="text-red-500">*</span>
                                                </label>
                                                <button
                                                    ref={endDateButtonRef}
                                                    id="center-usage-end-date"
                                                    type="button"
                                                    disabled={saving || !formData.usage_date}
                                                    onClick={() => handleToggleCalendar("usage_end_date")}
                                                    className={`${inputClass} text-left disabled:cursor-not-allowed`}
                                                    aria-describedby="center-usage-end-hint"
                                                >
                                                    {formData.usage_end_date ? formatShowDate(formData.usage_end_date) : "เลือกวันที่สิ้นสุดการใช้งาน"}
                                                </button>
                                                <p id="center-usage-end-hint" className="mt-1 text-[11px] text-slate-500">
                                                    {formData.usage_date
                                                        ? `เลือกได้ตั้งแต่ ${formatShowDate(formData.usage_date)} เป็นต้นไป`
                                                        : "กรุณาเลือกวันที่ใช้งานก่อน"}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {openCalendar && minUsageDate && typeof document !== "undefined" && createPortal(
                                        <div
                                            ref={calendarRef}
                                            className="vehicle-calendar fixed w-[340px] max-w-[calc(100vw-32px)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-800 shadow-2xl"
                                            style={{
                                                top: calendarPosition.top,
                                                left: calendarPosition.left,
                                                maxHeight: "calc(100dvh - 32px)",
                                                zIndex: 2147482000,
                                            }}
                                        >
                                            <div className="mb-3 rounded-xl bg-blue-50 px-3 py-2">
                                                <p className="font-semibold text-blue-700">{calendarTarget === "usage_end_date" ? "เลือกวันที่สิ้นสุดการใช้งาน" : "เลือกวันที่ใช้งาน"}</p>
                                                <p className="mt-1 text-[11px] text-slate-500">
                                                    เลือกได้ตั้งแต่ {formatShowDate(calendarTarget === "usage_end_date" ? formData.usage_date : minUsageDate)} เป็นต้นไป
                                                </p>
                                            </div>
                                            <Calendar
                                                key={`${selectedMasterType?.id}-${minUsageDate}`}
                                                locale={th}
                                                date={parseLocalDate(formData[calendarTarget] || (calendarTarget === "usage_end_date" ? formData.usage_date : minUsageDate))}
                                                minDate={parseLocalDate(calendarTarget === "usage_end_date" ? formData.usage_date : minUsageDate)}
                                                onChange={(date: Date) => {
                                                    setFormData((previous) => ({
                                                        ...previous,
                                                        [calendarTarget]: formatLocalDate(date),
                                                    }));
                                                }}
                                            />
                                            <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                                                <p className="text-[11px] text-slate-500">
                                                    {formData[calendarTarget] ? `วันที่เลือก: ${formatShowDate(formData[calendarTarget])}` : "กรุณาเลือกวันที่"}
                                                </p>
                                                <button type="button" onClick={() => {
                                                    setOpenCalendar(false);
                                                    (calendarTarget === "usage_end_date" ? endDateButtonRef : dateButtonRef).current?.focus();
                                                }} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
                                                    เสร็จสิ้น
                                                </button>
                                            </div>
                                        </div>,
                                        document.body
                                    )}

                                    {formData.fleet_type && (
                                        <div className="mt-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] text-blue-700">
                                            {waitingDays === null ? (
                                                <p className="font-semibold text-amber-700">
                                                    ไม่พบ waiting_days ที่ถูกต้องสำหรับประเภทคำขอนี้
                                                    กรุณาตรวจสอบ master_type.php และข้อมูลในฐานข้อมูล
                                                </p>
                                            ) : (
                                                <>
                                                    <p>
                                                        <span className="font-semibold">เงื่อนไขวันที่ใช้งาน:</span>{" "}
                                                        {waitingDays === 0
                                                            ? "เลือกวันที่ใช้งานได้ตั้งแต่วันนี้"
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
                                    <label
                                        className={labelClass}
                                    >
                                        ปริมาณงาน (Workload -
                                        ชิ้น)
                                    </label>

                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        name="workload"
                                        value={
                                            formData.workload
                                        }
                                        disabled={saving}
                                        onChange={handleChange}
                                        placeholder="0"
                                        className={inputClass}
                                    />
                                </div>

                                <div>
                                    <label
                                        className={labelClass}
                                    >
                                        จำนวนรอบรถ (Truck Turn)
                                    </label>

                                    <input
                                        type="number"
                                        name="truckturn"
                                        value={
                                            formData.truckturn
                                        }
                                        min={0}
                                        step="0.01"
                                        disabled={saving}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        className={inputClass}
                                    />
                                </div>

                                {/* ทะเบียนรถที่ถูกทดแทน */}
                                {needLicenseList &&
                                    Number(
                                        formData.qty || 0
                                    ) > 0 && (
                                        <div className="md:col-span-2 lg:col-span-3">
                                            <section className="rounded-xl border border-orange-200 bg-orange-50 p-3">
                                                <div className="mb-3">
                                                    <h3 className="font-semibold text-orange-700">
                                                        ป้ายทะเบียนรถที่ถูกทดแทน
                                                    </h3>
                                                    <p className="mt-0.5 text-[11px] text-orange-600">
                                                        เลือกให้ครบ{" "}
                                                        {formData.qty} คัน
                                                        / DC_CODE:{" "}
                                                        {dcCode || "-"}
                                                    </p>
                                                    <p className="mt-0.5 text-[11px] text-orange-500">
                                                        พบทะเบียน{" "}
                                                        {
                                                            truckReplaceOptions.length
                                                        }{" "}
                                                        รายการ
                                                    </p>
                                                </div>

                                                <div className="space-y-2">
                                                    {licenseReplaceList.map(
                                                        (
                                                            license,
                                                            index
                                                        ) => {
                                                            const detail =
                                                                getTruckReplaceDetail(
                                                                    license
                                                                );
                                                            const checking =
                                                                Boolean(
                                                                    checkingLicenseIndexes[
                                                                    index
                                                                    ]
                                                                );
                                                            const status =
                                                                licenseDuplicateStatus[
                                                                index
                                                                ];
                                                            const message =
                                                                licenseCheckMessages[
                                                                index
                                                                ];

                                                            const available =
                                                                Boolean(
                                                                    license
                                                                ) &&
                                                                !checking &&
                                                                status ===
                                                                false;

                                                            return (
                                                                <div
                                                                    key={index}
                                                                    className="rounded-xl border border-orange-100 bg-white p-3 shadow-sm"
                                                                >
                                                                    <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[80px_1.2fr_1fr_110px]">
                                                                        <div>
                                                                            <p className="text-[11px] text-slate-400">
                                                                                คันที่
                                                                            </p>
                                                                            <p className="font-semibold">
                                                                                {index +
                                                                                    1}
                                                                                <span className="ml-1 text-red-500">
                                                                                    *
                                                                                </span>
                                                                            </p>
                                                                        </div>

                                                                        <div>
                                                                            <label
                                                                                className={
                                                                                    labelClass
                                                                                }
                                                                            >
                                                                                ทะเบียน
                                                                                /
                                                                                ชื่อบริษัท
                                                                            </label>

                                                                            <input
                                                                                list={`center-license-options-${index}`}
                                                                                value={
                                                                                    license
                                                                                }
                                                                                disabled={
                                                                                    saving
                                                                                }
                                                                                onChange={(
                                                                                    event
                                                                                ) =>
                                                                                    handleLicenseReplaceChange(
                                                                                        index,
                                                                                        event
                                                                                            .target
                                                                                            .value
                                                                                    )
                                                                                }
                                                                                className={`${inputClass} ${available
                                                                                    ? "border-emerald-300"
                                                                                    : status ===
                                                                                        true
                                                                                        ? "border-red-300"
                                                                                        : ""
                                                                                    }`}
                                                                                placeholder="เลือกทะเบียนจากรายการ"
                                                                            />

                                                                            <datalist
                                                                                id={`center-license-options-${index}`}
                                                                            >
                                                                                {truckReplaceOptions
                                                                                    .filter(
                                                                                        (
                                                                                            item
                                                                                        ) =>
                                                                                            findDuplicateLicenseRow(
                                                                                                index,
                                                                                                item.license
                                                                                            ) ===
                                                                                            -1
                                                                                    )
                                                                                    .map(
                                                                                        (
                                                                                            item
                                                                                        ) => (
                                                                                            <option
                                                                                                key={
                                                                                                    item.license
                                                                                                }
                                                                                                value={
                                                                                                    item.license
                                                                                                }
                                                                                                label={formatTruckReplaceBottomLine(
                                                                                                    item
                                                                                                )}
                                                                                            />
                                                                                        )
                                                                                    )}
                                                                            </datalist>
                                                                        </div>

                                                                        <div>
                                                                            <p
                                                                                className={
                                                                                    labelClass
                                                                                }
                                                                            >
                                                                                ข้อมูลรถ
                                                                            </p>

                                                                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                                                                {detail ? (
                                                                                    <>
                                                                                        <p className="font-semibold">
                                                                                            {formatTruckReplaceTopLine(
                                                                                                detail
                                                                                            )}
                                                                                        </p>
                                                                                        <p className="mt-1 text-[11px] text-slate-500">
                                                                                            {formatTruckReplaceBottomLine(
                                                                                                detail
                                                                                            )}
                                                                                        </p>
                                                                                    </>
                                                                                ) : (
                                                                                    <p className="text-[11px] text-slate-400">
                                                                                        ยังไม่ได้เลือกข้อมูลรถ
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        <div>
                                                                            <p
                                                                                className={
                                                                                    labelClass
                                                                                }
                                                                            >
                                                                                สถานะ
                                                                            </p>

                                                                            <span
                                                                                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${checking
                                                                                    ? "bg-blue-50 text-blue-600"
                                                                                    : available
                                                                                        ? "bg-emerald-50 text-emerald-700"
                                                                                        : status ===
                                                                                            true
                                                                                            ? "bg-red-50 text-red-600"
                                                                                            : license
                                                                                                ? "bg-amber-50 text-amber-600"
                                                                                                : "bg-slate-100 text-slate-500"
                                                                                    }`}
                                                                            >
                                                                                {checking
                                                                                    ? "กำลังตรวจสอบ..."
                                                                                    : available
                                                                                        ? "ใช้งานได้"
                                                                                        : status ===
                                                                                            true
                                                                                            ? "ทะเบียนซ้ำ"
                                                                                            : license
                                                                                                ? "รอตรวจสอบ"
                                                                                                : "รอเลือก"}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {message &&
                                                                        !checking && (
                                                                            <p
                                                                                className={`mt-2 text-[11px] ${available
                                                                                    ? "text-emerald-600"
                                                                                    : "text-red-600"
                                                                                    }`}
                                                                            >
                                                                                {
                                                                                    message
                                                                                }
                                                                            </p>
                                                                        )}
                                                                </div>
                                                            );
                                                        }
                                                    )}
                                                </div>
                                            </section>
                                        </div>
                                    )}

                                <div className="md:col-span-2 lg:col-span-3">
                                    <label
                                        className={labelClass}
                                    >
                                        หมายเหตุ
                                    </label>

                                    <textarea
                                        name="remark"
                                        value={formData.remark}
                                        disabled={saving}
                                        onChange={handleChange}
                                        rows={4}
                                        placeholder="ระบุหมายเหตุเพิ่มเติม"
                                        className={`${inputClass} resize-none`}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={saving}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                            >
                                ยกเลิก
                            </button>

                            <button
                                ref={saveButtonRef}
                                type="submit"
                                disabled={
                                    saving ||
                                    isLicenseSubmitBlocked
                                }
                                title={
                                    isLicenseSubmitBlocked
                                        ? "ทะเบียนต้องขึ้นสถานะใช้งานได้ครบทุกคันก่อนบันทึก"
                                        : undefined
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Save
                                    size={14}
                                    aria-hidden="true"
                                />

                                {saving
                                    ? "กำลังบันทึก..."
                                    : hasCheckingLicense
                                        ? "กำลังตรวจสอบทะเบียน..."
                                        : isLicenseSubmitBlocked
                                            ? "รอตรวจสอบทะเบียน"
                                            : "บันทึกคำขอ"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Modal ตรวจสอบข้อมูลก่อนส่ง */}
            {showConfirmModal &&
                typeof document !== "undefined" &&
                createPortal(
                    <div
                        style={{ zIndex: 2147483000 }}
                        className="vehicle-confirm-modal fixed inset-0 flex items-center justify-center overflow-hidden bg-slate-950/60 p-2 sm:p-4"
                        onClick={closeConfirmation}
                    >
                        <section
                            ref={confirmDialogRef}
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="center-confirm-title"
                            aria-describedby="center-confirm-description"
                            aria-busy={saving}
                            className="flex min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-2xl"
                            style={{
                                height: "min(760px, calc(100dvh - 32px))",
                                maxHeight: "calc(100dvh - 32px)",
                            }}
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={handleConfirmKeyDown}
                        >
                            {/* หัวหน้าต่าง */}
                            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 bg-blue-50/60 px-4 py-3 sm:px-5">
                                <div className="min-w-0">
                                    <h3
                                        id="center-confirm-title"
                                        className="text-sm font-semibold sm:text-base"
                                    >
                                        ตรวจสอบข้อมูลก่อนส่งคำขอ
                                    </h3>

                                    <p
                                        id="center-confirm-description"
                                        className="mt-1 text-[11px] text-slate-500"
                                    >
                                        เลื่อนดูรายละเอียด แล้วกดยืนยันส่งคำขอ
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    disabled={saving}
                                    onClick={closeConfirmation}
                                    aria-label="กลับไปแก้ไขข้อมูล"
                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                                >
                                    <X size={16} />
                                </button>
                            </header>

                            {/* พื้นที่ข้อมูล เลื่อนได้ */}
                            <div
                                tabIndex={0}
                                role="region"
                                aria-label="รายละเอียดคำขอก่อนยืนยัน"
                                className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-3 sm:px-5 sm:py-4"
                                style={{
                                    WebkitOverflowScrolling: "touch",
                                    scrollbarGutter: "stable",
                                    touchAction: "pan-y",
                                }}
                            >
                                {/* ข้อมูลคำขอ */}
                                <section className="overflow-hidden rounded-xl border border-slate-200">
                                    <h4 className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold">
                                        ข้อมูลคำขอ
                                    </h4>

                                    <dl className="grid grid-cols-1 gap-x-5 gap-y-3 p-3 text-xs sm:grid-cols-2">
                                        <SummaryField
                                            label="แหล่งคำขอ"
                                            value="คำขอจากส่วนกลาง (TC)"
                                        />

                                        <SummaryField
                                            label="เลขที่เอกสาร"
                                            value={runningDoc}
                                        />

                                        <SummaryField
                                            label="วันที่สร้างคำขอ"
                                            value={formatShowDate(today)}
                                        />

                                        <SummaryField
                                            label="ผู้ขอ"
                                            value={requestBy}
                                        />

                                        <SummaryField
                                            label="DC Code"
                                            value={dcCode}
                                        />

                                        <SummaryField
                                            label="ชื่อคลัง"
                                            value={selectedWarehouseName}
                                        />
                                    </dl>
                                </section>

                                {/* ผู้ให้บริการ */}
                                <section className="overflow-hidden rounded-xl border border-slate-200">
                                    <h4 className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold">
                                        ผู้ให้บริการ
                                    </h4>

                                    <dl className="space-y-3 p-3 text-xs">
                                        <div className="min-w-0">
                                            <dd className="inline break-words font-semibold text-slate-800">
                                                {`[${selectedProvider?.id || "-"}] ${selectedProvider?.name || "-"}, (เกรด: ${selectedProvider?.rating || "-"})`}
                                            </dd>
                                        </div>

                                        {isAllNowProvider && (
                                            <div className="min-w-0">
                                                <dt className="inline text-slate-500">
                                                    บริษัทภายใต้:{" "}
                                                </dt>

                                                <dd className="inline break-words font-semibold text-slate-800">
                                                    {providerSubsidiary.trim() ||
                                                        "ไม่ได้ระบุ"}
                                                </dd>
                                            </div>
                                        )}
                                    </dl>
                                </section>

                                {/* รายละเอียดรถที่ขอ */}
                                <section className="overflow-hidden rounded-xl border border-slate-200">
                                    <h4 className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold">
                                        รายละเอียดรถที่ขอ
                                    </h4>

                                    <dl className="grid grid-cols-1 gap-x-5 gap-y-3 p-3 text-xs sm:grid-cols-2">
                                        <SummaryField
                                            label="ประเภทคำขอ"
                                            value={formData.fleet_type}
                                            fullWidth
                                        />

                                        <SummaryField
                                            label="ประเภทกองรถ"
                                            value={formData.fleet_truck_type}
                                        />

                                        <SummaryField
                                            label="จำนวนรถ"
                                            value={`${Number(
                                                formData.qty
                                            ).toLocaleString("th-TH")} คัน`}
                                        />

                                        <SummaryField
                                            label="วันที่ใช้งาน"
                                            value={formatShowDate(
                                                formData.usage_date
                                            )}
                                        />

                                        {hasUsageEndDate && (
                                            <SummaryField
                                                label="วันที่สิ้นสุดการใช้งาน"
                                                value={formatShowDate(formData.usage_end_date)}
                                            />
                                        )}

                                        <SummaryField
                                            label="ปริมาณงาน (Workload)"
                                            value={
                                                formData.workload.trim()
                                                    ? `${toNumber(
                                                        formData.workload
                                                    ).toLocaleString("th-TH")} ชิ้น`
                                                    : "ไม่ได้ระบุ"
                                            }
                                        />

                                        <SummaryField
                                            label="จำนวนรอบรถ (Truck Turn)"
                                            value={
                                                formData.truckturn.trim()
                                                    ? Number(
                                                        formData.truckturn
                                                    ).toLocaleString("th-TH", {
                                                        maximumFractionDigits: 2,
                                                    })
                                                    : "ไม่ได้ระบุ"
                                            }
                                        />
                                    </dl>
                                </section>

                                {/* รถที่ถูกทดแทน */}
                                {needLicenseList && (
                                    <section className="overflow-hidden rounded-xl border border-orange-200">
                                        <h4 className="border-b border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-800">
                                            รถที่ถูกทดแทน ({formData.qty} คัน)
                                        </h4>

                                        <ol className="divide-y divide-slate-100">
                                            {licenseReplaceList
                                                .slice(0, Number(formData.qty))
                                                .map((license, index) => {
                                                    const truck =
                                                        getTruckReplaceDetail(
                                                            license
                                                        );

                                                    return (
                                                        <li
                                                            key={index}
                                                            className="flex items-start gap-3 px-3 py-3 text-xs"
                                                        >
                                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-50 font-semibold text-orange-700">
                                                                {index + 1}
                                                            </span>

                                                            <div className="min-w-0 flex-1">
                                                                <p className="break-words font-semibold">
                                                                    {truck
                                                                        ? formatTruckReplaceTopLine(
                                                                            truck
                                                                        )
                                                                        : license}
                                                                </p>

                                                                {truck && (
                                                                    <p className="mt-1 break-words text-[11px] text-slate-500">
                                                                        {formatTruckReplaceBottomLine(
                                                                            truck
                                                                        )}
                                                                    </p>
                                                                )}

                                                                <p className="mt-1 text-[11px] text-emerald-600">
                                                                    ตรวจสอบแล้ว ใช้งานได้
                                                                </p>
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                        </ol>
                                    </section>
                                )}

                                {/* เอกสารแนบ */}
                                {isAllNowProvider && (
                                    <section className="overflow-hidden rounded-xl border border-slate-200">
                                        <h4 className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold">
                                            เอกสารแนบ
                                        </h4>

                                        <dl className="grid grid-cols-1 gap-x-5 gap-y-3 p-3 text-xs sm:grid-cols-2">
                                            <SummaryField
                                                label="รูปแบบเอกสาร"
                                                value={
                                                    attachmentMode === "existing"
                                                        ? "ใช้เอกสารเดิม"
                                                        : providerPdf
                                                            ? "แนบ PDF ใหม่"
                                                            : "ไม่ได้แนบเอกสาร"
                                                }
                                            />

                                            <SummaryField
                                                label="เลขเอกสารแนบ"
                                                value={
                                                    providerPdfDocumentNo.trim() ||
                                                    "ไม่ได้ระบุ"
                                                }
                                            />

                                            <SummaryField
                                                label="ชื่อไฟล์"
                                                value={
                                                    attachmentMode === "new"
                                                        ? providerPdf?.name ||
                                                        "ไม่ได้แนบเอกสาร"
                                                        : availableAttachments.find(
                                                            (item) =>
                                                                String(
                                                                    item.attachment_id
                                                                ) === attachmentId
                                                        )?.file_name ||
                                                        providerPdfDocumentNo ||
                                                        "ไม่ได้ระบุ"
                                                }
                                                fullWidth
                                            />

                                            {attachmentMode === "existing" &&
                                                attachmentId && (
                                                    <div className="sm:col-span-2">
                                                        <a
                                                            href={`${API_BASE}/fleet_attachments.php?action=file&id=${encodeURIComponent(
                                                                attachmentId
                                                            )}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex min-h-9 items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                                                        >
                                                            เปิดเอกสาร PDF
                                                        </a>
                                                    </div>
                                                )}
                                        </dl>
                                    </section>
                                )}

                                {/* หมายเหตุ */}
                                <section className="overflow-hidden rounded-xl border border-slate-200">
                                    <h4 className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold">
                                        หมายเหตุ
                                    </h4>

                                    <p className="whitespace-pre-wrap break-words p-3 text-xs">
                                        {formData.remark.trim() || "ไม่ได้ระบุ"}
                                    </p>
                                </section>
                            </div>

                            {/* ปุ่มอยู่ด้านล่างตลอด */}
                            <footer className="shrink-0 border-t border-slate-200 bg-white px-3 py-3 sm:px-5">
                                <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                                    <button
                                        ref={backButtonRef}
                                        type="button"
                                        disabled={saving}
                                        onClick={closeConfirmation}
                                        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
                                    >
                                        กลับไปแก้ไข
                                    </button>

                                    <button
                                        type="button"
                                        disabled={saving}
                                        onClick={handleConfirmSubmit}
                                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
                                    >
                                        <Save size={14} aria-hidden="true" />

                                        {saving
                                            ? "กำลังส่งคำขอ..."
                                            : "ยืนยันส่งคำขอ"}
                                    </button>
                                </div>
                            </footer>
                        </section>
                    </div>,
                    document.body
                )}
        </>
    );
}
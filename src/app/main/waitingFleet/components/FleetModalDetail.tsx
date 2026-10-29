"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
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

    license_replace?: string;
    province_replace?: string;
    truck_type_replace?: string;
    company_id_replace?: string;
    company_name_replace?: string;

    detail_license_replace?: string;
    detail_province_replace?: string;
    detail_truck_type_replace?: string;
    detail_company_id_replace?: string;
    detail_company_name_replace?: string;
}

interface ApprovedSupplierApiItem {
    subsidiary?: string | null;
    attachment_document_no?: string | null;
    remark?: string | null;
    company_id?: string | number | null;
    company_name?: string | null;
    truck_type?: string | null;
    qty?: number | string | null;
    approved_qty?: number | string | null;

    Company_ID?: string | number | null;
    Company_Name?: string | null;
    TRUCK_TYPE?: string | null;

    replacement_licenses?: string[] | string | null;
    REPLACEMENT_LICENSES?: string[] | string | null;
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
    approve_qty_gm?: number | string | null;

    usage_date: string;
    workload: number;
    truckturn: number;
    status: string;
    request_by: string;
    remark: string;

    approved_company_name?: string | null;
    approved_company_id?: string | number | null;
    approved_qty?: number | string | null;
    not_approved_qty?: number | string | null;
    approved_suppliers?: ApprovedSupplierApiItem[] | string | null;
    replacement_mappings?: ApprovedSupplierApiItem[] | string | null;
    approved_truck_type?: string | null;

    status_details?: string | null;
    reject_reason?: string | null;

    details?: RequestDetailItem[];

    approved_trucks?: {
        old_license: string;
        new_truck_type: string;
        new_vendor_name: string;
        new_vendor_id: string;
    }[];

    rejected_trucks?: {
        old_license: string;
        reason: string;
    }[];
}

interface SupplierItem {
    [key: string]: unknown;
}

interface TruckItem {
    [key: string]: unknown;
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
    [key: string]: unknown;
}

interface FleetAttachment {
    attachment_id: number | string;
    document_no: string;
    file_name: string;
    file_size?: number | string;
    approval_detail_id?: number | string;
    company_name?: string;
    truck_type?: string;
    qty?: number | string;
}

interface ApprovedSupplierRow {
    attachmentMode: "new" | "existing";
    attachmentId: number | null;
    subsidiary: string;
    attachmentDocumentNo: string;
    attachmentFile: File | null;
    rowId: string;
    companyId: string;
    companyName: string;
    truckType: string;
    qty: number;
    replacementLicenses: string[];
    remark: string;
}

interface SavedLicenseDecision {
    license: string;
    decision: "approved" | "rejected";
    companyName?: string;
    truckType?: string;
    reason?: string;
}

interface LicenseDecisionPayload {
    license: string;
    decision: "approved" | "rejected";
    company_id?: string;
    company_name?: string;
    truck_type?: string;
    reject_reason?: string;
}

interface GMModalDetailProps {
    open: boolean;
    onClose: () => void;
    data: RequestItem;
    allRequests: RequestItem[];
    onSuccess: () => void | Promise<void>;
}

type ApiResult = Record<string, unknown>;
type Notification = {
    type: "success" | "error";
    text: string;
};

const API_BASE = "http://192.168.158.210/api_new_truck/api";

const normalizeText = (value: unknown) =>
    String(value ?? "")
        .trim()
        .replace(/\s+/g, " ")
        .toUpperCase();

const normalizeFleetTypeKey = (value: unknown) =>
    normalizeText(value).replace(/\s+/g, "");

const licenseDecisionKey = (value: unknown) =>
    String(value ?? "")
        .trim()
        .split(/\s+-\s+/)[0]
        .replace(/\s+/g, "")
        .toUpperCase();

const STANDARD_REPLACEMENT_FLEET_TYPES = new Set(
    [
        "รถใหม่ทดแทนรถลาออก และรถตัดออกจากระบบ",
        "รถใหม่ทดแทนรถอายุ 7 ปี",
        "รถใหม่ทดแทนรถเสียซ่อม",
        "รถทดแทน",
        "รถทดแทน 7 ปี",
        "รถทดแทนรถลาออก",
        "ทดแทนรถหมดอายุ",
        "รถทดแทนหมดอายุ",
        "รถหมดอายุ",
    ].map(normalizeFleetTypeKey)
);

function getValueIgnoreCase(
    item: Record<string, unknown>,
    keyName: string
): unknown {
    const key = Object.keys(item).find(
        (name) => name.trim().toUpperCase() === keyName.toUpperCase()
    );

    return key ? item[key] : "";
}

function getSupplierCompanyId(item: SupplierItem): string {
    return String(
        getValueIgnoreCase(item, "company_id") ||
        getValueIgnoreCase(item, "supplier_id") ||
        getValueIgnoreCase(item, "id") ||
        ""
    ).trim();
}

function getSupplierCompanyName(item: SupplierItem): string {
    return String(
        getValueIgnoreCase(item, "company_name") ||
        getValueIgnoreCase(item, "name") ||
        ""
    ).trim();
}

function parseStringList(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value
            .map((item) => String(item ?? "").trim())
            .filter(Boolean);
    }

    const text = String(value ?? "").trim();

    if (!text) return [];

    try {
        const parsed: unknown = JSON.parse(text);

        if (Array.isArray(parsed)) {
            return parsed
                .map((item) => String(item ?? "").trim())
                .filter(Boolean);
        }
    } catch {
        // รองรับข้อมูลเดิมที่คั่นด้วย comma
    }

    return text
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

function parseApprovedSuppliers(
    value: RequestItem["approved_suppliers"]
): ApprovedSupplierApiItem[] {
    if (Array.isArray(value)) return value;
    if (typeof value !== "string" || !value.trim()) return [];

    try {
        const parsed: unknown = JSON.parse(value);

        return Array.isArray(parsed)
            ? (parsed as ApprovedSupplierApiItem[])
            : [];
    } catch {
        return [];
    }
}

function finalDetailDecision(
    value: unknown
): "approved" | "rejected" | null {
    const status = String(value ?? "").trim().toLowerCase();

    if (
        ["approved", "progress", "approve", "อนุมัติ"].includes(status)
    ) {
        return "approved";
    }

    if (
        [
            "rejected",
            "reject_by_fbp",
            "reject_by_center",
            "reject",
            "ไม่อนุมัติ",
        ].includes(status) ||
        status.startsWith("ไม่อนุมัติ") ||
        status.startsWith("reject_") ||
        status.startsWith("rejected_by_")
    ) {
        return "rejected";
    }

    return null;
}

function createSupplierRow(
    truckType: string,
    qty = 1
): ApprovedSupplierRow {
    return {
        rowId:
            typeof crypto !== "undefined" &&
                typeof crypto.randomUUID === "function"
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random()}`,
        subsidiary: "",
        companyId: "",
        companyName: "",
        truckType,
        qty,
        attachmentMode: "new",
        attachmentId: null,
        attachmentDocumentNo: "",
        attachmentFile: null,
        replacementLicenses: [],
        remark: "",
    };
}

function isAllNowSupplier(row: { companyId: string; companyName: string }): boolean {
    const key = (value: string) => normalizeText(value).replace(/\s+/g, "");
    return row.companyId.trim() === "40900" ||
        ["40900", "บจ.ออลล์ นาว โลจิสติกส์", "ออลล์ นาว โลจิสติกส์"].some(name => key(name) === key(row.companyName));
}

function getSubsidiaryOptions(suppliers: SupplierItem[]): string[] {
    const matches = suppliers.filter(item => isAllNowSupplier({
        companyId: getSupplierCompanyId(item), companyName: getSupplierCompanyName(item),
    }));
    return Array.from(new Set(matches.flatMap(item =>
        parseStringList(getValueIgnoreCase(item, "subsidiary"))
    ))).sort((a, b) => a.localeCompare(b, "th"));
}

function requiresPdfAttachment(row: { companyId: string; companyName: string }): boolean {
    return row.companyId.trim() === "40900" ||
        normalizeText(row.companyName).replace(/\s+/g, "") ===
        normalizeText("บจ.ออลล์ นาว โลจิสติกส์").replace(/\s+/g, "");
}

function formatNumber(value: unknown): string {
    if (value === null || value === undefined || value === "") {
        return "-";
    }

    const number = Number(value);

    return Number.isFinite(number)
        ? number.toLocaleString("en-US")
        : String(value);
}

function formatTruckTypeLabel(value: string): string {
    const labels: Record<string, string> = {
        "4W": "รถ 4 ล้อ",
        "4WJ": "รถ 4 ล้อ",
        "6W": "รถ 6 ล้อ",
        "6WJ": "รถ 6 ล้อ",
        "10W": "รถ 10 ล้อ",
        "22W": "รถพ่วง",
    };

    const label = labels[value.trim().toUpperCase()];

    return label ? `${value} (${label})` : value || "-";
}

function formatStatusText(status: string): string {
    const value = status.trim().toLowerCase();

    if (
        ["fbp_pending", "partial_approved", "pending_fbp"].includes(value)
    ) {
        return "รอจัดรถ";
    }

    if (
        ["gm_pending", "pending_gm", "pending", "รออนุมัติ"].includes(value)
    ) {
        return "รออนุมัติ";
    }

    if (["progress", "กำลังดำเนินการ"].includes(value)) {
        return "กำลังดำเนินการ";
    }

    if (
        ["approved", "approve", "success", "สำเร็จ", "อนุมัติ"].includes(value)
    ) {
        return "เสร็จเรียบร้อย";
    }

    if (
        [
            "reject_by_fbp",
            "reject_by_gm",
            "rejected",
            "ไม่อนุมัติ",
        ].includes(value)
    ) {
        return "ไม่อนุมัติ";
    }

    if (["cancel", "canceled", "ยกเลิก"].includes(value)) {
        return "ยกเลิก";
    }

    return status || "-";
}

function getCurrentUserText(): string {
    try {
        const raw =
            localStorage.getItem("userInfo") ||
            localStorage.getItem("user") ||
            localStorage.getItem("authUser");

        if (!raw) return "";

        const user = JSON.parse(raw);
        const name = String(user.name || user.NAME || "").trim();
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

        const fullName = `${name} ${surname}`.trim();

        if (fullName && employeeId) {
            return `${fullName} (${employeeId})`;
        }

        return fullName || employeeId;
    } catch {
        return "";
    }
}

async function readApiResponse(response: Response): Promise<ApiResult> {
    const text = await response.text();

    if (!text.trim()) {
        throw new Error("API ไม่ได้ส่งผลการบันทึกกลับมา");
    }

    let result: ApiResult;

    try {
        const parsed: unknown = JSON.parse(text);

        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("Invalid response");
        }

        result = parsed as ApiResult;
    } catch {
        throw new Error(
            `API ตอบกลับไม่ใช่ JSON ที่ถูกต้อง (HTTP ${response.status})`
        );
    }

    if (
        !response.ok ||
        result.success === false ||
        result.status === "error"
    ) {
        throw new Error(
            String(result.message || "บันทึกข้อมูลไม่สำเร็จ")
        );
    }

    return result;
}

function FleetPopup({
    children,
    label,
    busy,
    onDismiss,
}: {
    children: ReactNode;
    label: string;
    busy: boolean;
    onDismiss: () => void;
}) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        const previousFocus = document.activeElement;

        if (dialog && !dialog.open) dialog.showModal();

        return () => {
            dialog?.close();

            if (
                previousFocus instanceof HTMLElement &&
                previousFocus.isConnected
            ) {
                previousFocus.focus();
            }
        };
    }, []);

    return (
        <dialog
            ref={dialogRef}
            aria-label={label}
            aria-busy={busy}
            className="m-auto max-h-[90vh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-3xl border-0 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-950/40 backdrop:backdrop-blur-sm"
            onCancel={(event) => {
                event.preventDefault();
                event.stopPropagation();

                if (!busy) onDismiss();
            }}
            onKeyDown={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
        >
            {children}
        </dialog>
    );
}

export default function FleetModalDetail({
    open,
    onClose,
    data,
    allRequests,
    onSuccess,
}: GMModalDetailProps) {
    const [saving, setSaving] = useState(false);
    const [decisionCompleted, setDecisionCompleted] = useState(false);
    const [message, setMessage] = useState<Notification | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [availableAttachments, setAvailableAttachments] = useState<FleetAttachment[]>([]);
    const [savedAttachments, setSavedAttachments] = useState<FleetAttachment[]>([]);
    const [attachmentSearch, setAttachmentSearch] = useState("");
    const [loadingAttachments, setLoadingAttachments] = useState(false);
    const [attachmentListError, setAttachmentListError] = useState("");
    const [savedAttachmentError, setSavedAttachmentError] = useState("");
    const [attachmentHasMore, setAttachmentHasMore] = useState(false);
    const [attachmentRefresh, setAttachmentRefresh] = useState(0);

    const [batchRejectedQty, setBatchRejectedQty] = useState(0);
    const [allocationBalance, setAllocationBalance] = useState<{ gm: number; approved: number; rejected: number } | null>(null);
    const [loadingBalance, setLoadingBalance] = useState(true);
    const [balanceError, setBalanceError] = useState("");


    const [confirmDecision, setConfirmDecision] = useState<
        "approve" | "reject_by_fbp" | null
    >(null);

    const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
    const [loadingSuppliers, setLoadingSuppliers] = useState(false);

    const [truckTypes, setTruckTypes] = useState<string[]>([]);
    const [loadingTrucks, setLoadingTrucks] = useState(false);
    const [truckError, setTruckError] = useState("");

    // คง prop สำหรับ CheckDC เช่นเดียวกับไฟล์เดิม
    const [issuePeriods] = useState<IssuePeriodItem[]>([]);

    const [approvedSuppliers, setApprovedSuppliers] = useState<
        ApprovedSupplierRow[]
    >([]);

    const [persistedRowIds, setPersistedRowIds] = useState<string[]>([]);

    const [selectedRejectedLicenses, setSelectedRejectedLicenses] =
        useState<string[]>([]);

    const [sessionLicenseDecisions, setSessionLicenseDecisions] =
        useState<Record<string, SavedLicenseDecision>>({});

    const [supplierRatings, setSupplierRatings] = useState<
        Record<string, string>
    >({});

    const [ratingSavingRowId, setRatingSavingRowId] =
        useState<string | null>(null);

    const mutationBusyRef = useRef(false);
    const refreshAfterPopupRef = useRef(false);
    const closeAfterPopupRef = useRef(false);
    const needsRefreshRef = useRef(false);

    // ใช้ข้อมูลล่าสุดตอนเปิดคำขอ โดยไม่รีเซ็ตฟอร์มระหว่างบันทึก
    const latestDataRef = useRef(data);
    latestDataRef.current = data;

    const requestedQty = Number(data.qty || 0);

    const isStandardReplacementType =
        STANDARD_REPLACEMENT_FLEET_TYPES.has(
            normalizeFleetTypeKey(data.fleet_type)
        );

    const isFbpPending = [
        "fbp_pending",
        "partial_approved",
        "pending_fbp",
    ].includes(data.status.trim().toLowerCase());

    const canMakeDecision = !decisionCompleted && isFbpPending;

    const popupBusy = saving || ratingSavingRowId !== null || (!isStandardReplacementType && loadingBalance);

    const statusText = decisionCompleted
        ? "ดำเนินการแล้ว"
        : formatStatusText(data.status);

    const savedApiSuppliers = useMemo(() => {
        const mappings = parseApprovedSuppliers(
            data.replacement_mappings
        );

        const supplierRows = parseApprovedSuppliers(
            data.approved_suppliers
        );

        if (isStandardReplacementType && mappings.length > 0) {
            return mappings;
        }

        if (supplierRows.length > 0) return supplierRows;

        if (data.approved_company_name?.trim()) {
            return [
                {
                    company_id: data.approved_company_id,
                    company_name: data.approved_company_name,
                    truck_type: data.approved_truck_type,
                    qty: data.approved_qty,
                },
            ];
        }

        return [];
    }, [
        data.replacement_mappings,
        data.approved_suppliers,
        data.approved_company_name,
        data.approved_company_id,
        data.approved_truck_type,
        data.approved_qty,
        isStandardReplacementType,
    ]);

    useEffect(() => {
        if (!open) return;

        const current = latestDataRef.current;

        const replacement =
            STANDARD_REPLACEMENT_FLEET_TYPES.has(
                normalizeFleetTypeKey(current.fleet_type)
            );

        const mappings = parseApprovedSuppliers(
            current.replacement_mappings
        );

        const apiRows =
            replacement && mappings.length > 0
                ? mappings
                : parseApprovedSuppliers(current.approved_suppliers);

        const savedRows: ApprovedSupplierRow[] = apiRows.map((item) => ({
            ...createSupplierRow(current.fleet_truck_type || ""),
            companyId: String(
                item.company_id ?? item.Company_ID ?? ""
            ).trim(),
            companyName: String(
                item.company_name ?? item.Company_Name ?? ""
            ).trim(),
            truckType: String(
                item.truck_type ??
                item.TRUCK_TYPE ??
                current.approved_truck_type ??
                current.fleet_truck_type ??
                ""
            ).trim(),
            qty: replacement
                ? 1
                : Number(item.qty ?? item.approved_qty ?? 1),
            replacementLicenses: parseStringList(
                item.replacement_licenses ??
                item.REPLACEMENT_LICENSES
            ),
            subsidiary: String(item.subsidiary ?? ""),
            remark: String(item.remark ?? ""),
            attachmentDocumentNo: String(item.attachment_document_no ?? ""),
        }));

        setApprovedSuppliers(
            savedRows.length > 0
                ? savedRows
                : replacement
                    ? []
                    : [
                        createSupplierRow(
                            current.fleet_truck_type || "",
                            Number(current.approve_qty_gm ?? current.qty ?? 0)
                        ),
                    ]
        );

        setPersistedRowIds(savedRows.map((row) => row.rowId));
        setSessionLicenseDecisions({});
        setSelectedRejectedLicenses([]);
        setSupplierRatings({});
        setRejectReason("");
        setBatchRejectedQty(0);
        setMessage(null);
        setConfirmDecision(null);
        setDecisionCompleted(false);

        refreshAfterPopupRef.current = false;
        closeAfterPopupRef.current = false;
        needsRefreshRef.current = false;
    }, [open, data.id]);

    useEffect(() => {
        if (!open) return;
        setAllocationBalance(null);
        setBalanceError("");
        if (isStandardReplacementType) { setLoadingBalance(false); return; }
        const controller = new AbortController();
        setLoadingBalance(true);
        void (async () => {
            try {
                const response = await fetch(`${API_BASE}/waiting_fleet_balance.php?id=${encodeURIComponent(String(data.id))}`, { cache: "no-store", signal: controller.signal });
                const result = await readApiResponse(response);
                const record = result.data as Record<string, unknown>;
                const gmRaw = record?.approve_qty_gm;
                const gm = Number(gmRaw);
                const approved = Number(record?.approved_qty ?? 0);
                const rejected = Number(record?.not_approved_qty ?? 0);
                if (gmRaw === null || gmRaw === undefined || String(gmRaw).trim() === "" ||
                    ![gm, approved, rejected].every(value => Number.isInteger(value) && value >= 0) || approved + rejected > gm) {
                    throw new Error("ยอด GM หรือยอดสะสมไม่ถูกต้อง กรุณาตรวจสอบข้อมูล");
                }
                if (controller.signal.aborted) return;
                setAllocationBalance({ gm, approved, rejected });
                if (!Array.isArray(record.approved_suppliers)) throw new Error("กรุณาอัปเดต waiting_fleet_balance.php เพื่ออ่านรายการบริษัทที่อนุมัติแล้ว");
                const savedRows: ApprovedSupplierRow[] = (record.approved_suppliers as ApprovedSupplierApiItem[]).map(item => ({
                    ...createSupplierRow(String(item.truck_type ?? ""), Number(item.qty ?? 0)),
                    companyId: String(item.company_id ?? ""),
                    companyName: String(item.company_name ?? ""),
                    subsidiary: String(item.subsidiary ?? ""),
                }));
                setPersistedRowIds(savedRows.map(row => row.rowId));
                const outstanding = Math.max(gm - approved - rejected, 0);
                setApprovedSuppliers([
                    ...savedRows,
                    ...(outstanding > 0 ? [createSupplierRow(latestDataRef.current.fleet_truck_type || "", outstanding)] : []),
                ]);
            } catch (error) {
                if (!controller.signal.aborted) setBalanceError(error instanceof Error ? error.message : "อ่านยอดคงเหลือไม่สำเร็จ");
            } finally {
                if (!controller.signal.aborted) setLoadingBalance(false);
            }
        })();
        return () => controller.abort();
    }, [open, data.id, isStandardReplacementType]);

    useEffect(() => {
        if (!open) return;
        const controller = new AbortController();
        setLoadingAttachments(true);
        setAttachmentListError("");
        const timer = window.setTimeout(() => {
            void (async () => {
                try {
                    const response = await fetch(`${API_BASE}/fleet_attachments.php?q=${encodeURIComponent(attachmentSearch)}`, { signal: controller.signal, cache: "no-store" });
                    const result = await readApiResponse(response);
                    if (!Array.isArray(result.data)) throw new Error("ข้อมูลรายการเอกสารไม่ถูกต้อง");
                    if (controller.signal.aborted) return;
                    setAvailableAttachments(result.data as FleetAttachment[]);
                    setAttachmentHasMore(result.has_more === true);
                } catch (error) {
                    if (!controller.signal.aborted) {
                        setAvailableAttachments([]);
                        setAttachmentListError(error instanceof Error ? error.message : "โหลดเอกสารเดิมไม่สำเร็จ");
                    }
                } finally {
                    if (!controller.signal.aborted) setLoadingAttachments(false);
                }
            })();
        }, 250);
        return () => { window.clearTimeout(timer); controller.abort(); };
    }, [open, attachmentSearch, attachmentRefresh]);

    useEffect(() => {
        setSavedAttachments([]);
        setSavedAttachmentError("");
        if (!open || !data.id) return;
        const controller = new AbortController();
        void (async () => {
            try {
                const response = await fetch(`${API_BASE}/fleet_attachments.php?request_id=${encodeURIComponent(String(data.id))}`, { signal: controller.signal, cache: "no-store" });
                const result = await readApiResponse(response);
                if (!Array.isArray(result.data)) throw new Error("ข้อมูลเอกสารคำขอไม่ถูกต้อง");
                if (!controller.signal.aborted) setSavedAttachments(result.data as FleetAttachment[]);
            } catch (error) {
                if (!controller.signal.aborted) setSavedAttachmentError(error instanceof Error ? error.message : "โหลดเอกสารคำขอไม่สำเร็จ");
            }
        })();
        return () => controller.abort();
    }, [open, data.id, attachmentRefresh]);

    const allReplacementLicenses = useMemo(() => {
        const map = new Map<string, string>();

        if (data.details?.length) {
            data.details.forEach((detail) => {
                const license = String(detail.license ?? "").trim();
                const province = String(detail.province ?? "").trim();
                const key = licenseDecisionKey(license);

                if (!key) return;

                map.set(
                    key,
                    province ? `${license} - ${province}` : license
                );
            });
        } else {
            parseStringList(data.license_replace).forEach((license) => {
                const key = licenseDecisionKey(license);

                if (key) map.set(key, license);
            });
        }

        return Array.from(map.values());
    }, [data.details, data.license_replace]);

    const savedLicenseDecisions = useMemo(() => {
        const saved: Record<string, SavedLicenseDecision> = {};

        for (const detail of data.details ?? []) {
            const decision = finalDetailDecision(detail.status);
            const key = licenseDecisionKey(detail.license);

            if (!decision || !key) continue;

            const license = String(detail.license ?? "").trim();
            const province = String(detail.province ?? "").trim();

            saved[key] = {
                license: province
                    ? `${license} - ${province}`
                    : license,
                decision,
                companyName:
                    detail.company_name_replace ||
                    detail.detail_company_name_replace ||
                    "",
                truckType:
                    detail.truck_type_replace ||
                    detail.detail_truck_type_replace ||
                    "",
                reason:
                    decision === "rejected"
                        ? String(detail.status ?? "")
                        : "",
            };
        }

        // รองรับ API ที่ส่งผลบันทึกมาใน replacement_mappings
        for (const supplier of savedApiSuppliers) {
            const licenses = parseStringList(
                supplier.replacement_licenses ??
                supplier.REPLACEMENT_LICENSES
            );

            for (const license of licenses) {
                const key = licenseDecisionKey(license);

                if (!key || saved[key]) continue;

                saved[key] = {
                    license,
                    decision: "approved",
                    companyName: String(
                        supplier.company_name ??
                        supplier.Company_Name ??
                        ""
                    ),
                    truckType: String(
                        supplier.truck_type ??
                        supplier.TRUCK_TYPE ??
                        ""
                    ),
                };
            }
        }

        for (const truck of data.approved_trucks ?? []) {
            const key = licenseDecisionKey(truck.old_license);

            if (!key) continue;

            saved[key] = {
                license: saved[key]?.license || truck.old_license,
                decision: "approved",
                companyName: truck.new_vendor_name,
                truckType: truck.new_truck_type,
            };
        }

        for (const truck of data.rejected_trucks ?? []) {
            const key = licenseDecisionKey(truck.old_license);

            if (!key) continue;

            saved[key] = {
                license: saved[key]?.license || truck.old_license,
                decision: "rejected",
                reason: truck.reason,
            };
        }

        return {
            ...saved,
            ...sessionLicenseDecisions,
        };
    }, [
        data.details,
        data.approved_trucks,
        data.rejected_trucks,
        savedApiSuppliers,
        sessionLicenseDecisions,
    ]);

    const replacementLicenseOptions = useMemo(
        () =>
            allReplacementLicenses.filter(
                (license) =>
                    !savedLicenseDecisions[licenseDecisionKey(license)]
            ),
        [allReplacementLicenses, savedLicenseDecisions]
    );

    const persistedIds = useMemo(
        () => new Set(persistedRowIds),
        [persistedRowIds]
    );

    const draftRows = useMemo(
        () =>
            approvedSuppliers.filter(
                (row) => !persistedIds.has(row.rowId)
            ),
        [approvedSuppliers, persistedIds]
    );

    // เปิดแถวถัดไปอัตโนมัติ และหยุดเพิ่มเมื่อไม่มีทะเบียนเหลือ
    useEffect(() => {
        if (
            !open ||
            !isStandardReplacementType ||
            !canMakeDecision
        ) {
            return;
        }

        setApprovedSuppliers((current) => {
            if (replacementLicenseOptions.length === 0) {
                const savedRows = current.filter((row) =>
                    persistedIds.has(row.rowId)
                );

                return savedRows.length === current.length
                    ? current
                    : savedRows;
            }

            const hasEditableRow = current.some(
                (row) => !persistedIds.has(row.rowId)
            );

            if (hasEditableRow) return current;

            return [
                ...current,
                createSupplierRow(data.fleet_truck_type || "", 1),
            ];
        });
    }, [
        open,
        isStandardReplacementType,
        canMakeDecision,
        replacementLicenseOptions,
        persistedIds,
        data.fleet_truck_type,
    ]);

    useEffect(() => {
        if (!open) return;

        const controller = new AbortController();

        const loadSuppliers = async () => {
            setLoadingSuppliers(true);

            try {
                const response = await fetch(
                    `${API_BASE}/suppliers.php`,
                    {
                        cache: "no-store",
                        signal: controller.signal,
                    }
                );

                if (!response.ok) {
                    throw new Error("โหลดผู้ให้บริการไม่สำเร็จ");
                }

                const result = await response.json();

                const list = Array.isArray(result)
                    ? result
                    : result.data ?? result.result ?? [];

                if (!controller.signal.aborted) {
                    setSuppliers(Array.isArray(list) ? list : []);
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    console.error(error);
                    setSuppliers([]);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoadingSuppliers(false);
                }
            }
        };

        void loadSuppliers();

        return () => controller.abort();
    }, [open]);

    useEffect(() => {
        if (!open) return;

        const controller = new AbortController();
        const dcCode = data.dc_code.trim();

        setTruckTypes([]);
        setTruckError("");

        if (!dcCode) {
            setTruckError("ไม่พบรหัส DC");
            setLoadingTrucks(false);
            return;
        }

        const loadTruckTypes = async () => {
            setLoadingTrucks(true);

            try {
                const response = await fetch(
                    `${API_BASE}/trucks.php?DC_CODE=${encodeURIComponent(dcCode)}`,
                    {
                        cache: "no-store",
                        signal: controller.signal,
                    }
                );

                if (!response.ok) {
                    throw new Error("โหลดประเภทรถไม่สำเร็จ");
                }

                const result = await response.json();

                const list: TruckItem[] = Array.isArray(result)
                    ? result
                    : result.data ?? result.result ?? [];

                const types = new Map<string, string>();

                for (const item of Array.isArray(list) ? list : []) {
                    const itemDc = String(
                        getValueIgnoreCase(item, "DC_CODE") || ""
                    ).trim();

                    if (
                        itemDc &&
                        normalizeText(itemDc) !== normalizeText(dcCode)
                    ) {
                        continue;
                    }

                    const type = String(
                        getValueIgnoreCase(item, "TRUCK_TYPE") ||
                        getValueIgnoreCase(item, "truckType") ||
                        getValueIgnoreCase(item, "name") ||
                        ""
                    ).trim();

                    if (type) types.set(normalizeText(type), type);
                }

                if (!controller.signal.aborted) {
                    setTruckTypes(Array.from(types.values()));
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    setTruckError(
                        error instanceof Error
                            ? error.message
                            : "โหลดประเภทรถไม่สำเร็จ"
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoadingTrucks(false);
                }
            }
        };

        void loadTruckTypes();

        return () => controller.abort();
    }, [open, data.dc_code]);

    const supplierOptions = useMemo(
        () =>
            Array.from(
                new Set(
                    suppliers
                        .map(getSupplierCompanyName)
                        .filter(Boolean)
                )
            ).sort((a, b) => a.localeCompare(b, "th")),
        [suppliers]
    );

    const subsidiaryOptions = useMemo(() => getSubsidiaryOptions(suppliers), [suppliers]);

    const truckTypeOptions = useMemo(() => {
        const types = new Map<string, string>();

        [
            ...truckTypes,
            data.fleet_truck_type,
            data.approved_truck_type || "",
            ...approvedSuppliers.map((row) => row.truckType),
        ].forEach((value) => {
            const text = value.trim();

            if (text) types.set(normalizeText(text), text);
        });

        return Array.from(types.values()).sort((a, b) =>
            a.localeCompare(b, "en", {
                numeric: true,
                sensitivity: "base",
            })
        );
    }, [
        truckTypes,
        data.fleet_truck_type,
        data.approved_truck_type,
        approvedSuppliers,
    ]);

    const ratingTargetsKey = JSON.stringify(
        draftRows
            .filter((row) => row.companyId)
            .map((row) => ({
                rowId: row.rowId,
                companyId: row.companyId,
            }))
    );

    useEffect(() => {
        if (!open) return;

        const controller = new AbortController();

        const targets = JSON.parse(ratingTargetsKey) as {
            rowId: string;
            companyId: string;
        }[];

        for (const target of targets) {
            void (async () => {
                try {
                    const response = await fetch(
                        `${API_BASE}/rate_supplier.php?id=${encodeURIComponent(target.companyId)}`,
                        {
                            signal: controller.signal,
                            cache: "no-store",
                        }
                    );

                    const result = await response.json();

                    if (
                        !response.ok ||
                        result.success !== true ||
                        controller.signal.aborted
                    ) {
                        return;
                    }

                    setSupplierRatings((current) => ({
                        ...current,
                        [target.rowId]: String(
                            result.data?.rating ?? ""
                        ),
                    }));
                } catch (error) {
                    if (!controller.signal.aborted) {
                        console.error(error);
                    }
                }
            })();
        }

        return () => controller.abort();
    }, [open, ratingTargetsKey]);

    const updateSupplierRow = (
        rowId: string,
        patch: Partial<Omit<ApprovedSupplierRow, "rowId">>
    ) => {
        if (
            mutationBusyRef.current ||
            persistedIds.has(rowId) ||
            !canMakeDecision
        ) {
            return;
        }

        setApprovedSuppliers((current) =>
            current.map((row) =>
                row.rowId === rowId
                    ? { ...row, ...patch }
                    : row
            )
        );
    };

    const handleSupplierChange = (
        rowId: string,
        companyName: string
    ) => {
        const selectionKey = normalizeText(companyName).replace(/\s+/g, "");
        const supplier = suppliers.find(item =>
            [getSupplierCompanyName(item), getSupplierCompanyId(item), String(getValueIgnoreCase(item, "full"))]
                .some(value => normalizeText(value).replace(/\s+/g, "") === selectionKey)
        ) ?? (isAllNowSupplier({ companyId: "", companyName })
            ? suppliers.find(item => getSupplierCompanyId(item) === "40900")
            : undefined);

        setSupplierRatings((current) => ({
            ...current,
            [rowId]: "",
        }));

        updateSupplierRow(rowId, {
            companyName,
            subsidiary: "",
            attachmentMode: "new",
            attachmentId: null,
            attachmentDocumentNo: "",
            attachmentFile: null,
            companyId: supplier
                ? getSupplierCompanyId(supplier)
                : "",
        });
    };

    const toggleReplacementLicense = (
        rowId: string,
        license: string
    ) => {
        if (
            mutationBusyRef.current ||
            persistedIds.has(rowId) ||
            !canMakeDecision
        ) {
            return;
        }

        const key = licenseDecisionKey(license);

        if (
            savedLicenseDecisions[key] ||
            selectedRejectedLicenses.some(
                (value) => licenseDecisionKey(value) === key
            )
        ) {
            return;
        }

        setApprovedSuppliers((current) => {
            const usedByOtherRow = current.some(
                (row) =>
                    row.rowId !== rowId &&
                    row.replacementLicenses.some(
                        (value) => licenseDecisionKey(value) === key
                    )
            );

            if (usedByOtherRow) return current;

            return current.map((row) => {
                if (row.rowId !== rowId) return row;

                const selected = row.replacementLicenses.some(
                    (value) => licenseDecisionKey(value) === key
                );

                return {
                    ...row,
                    qty: 1,
                    replacementLicenses: selected
                        ? row.replacementLicenses.filter(
                            (value) => licenseDecisionKey(value) !== key
                        )
                        : [...row.replacementLicenses, license],
                };
            });
        });
    };

    const addApprovedSupplier = () => {
        if (mutationBusyRef.current || !canMakeDecision) return;

        if (isStandardReplacementType) {
            const available = replacementLicenseOptions.some(
                (license) => {
                    const key = licenseDecisionKey(license);

                    return (
                        !selectedRejectedLicenses.some(
                            (value) => licenseDecisionKey(value) === key
                        ) &&
                        !approvedSuppliers.some((row) =>
                            row.replacementLicenses.some(
                                (value) => licenseDecisionKey(value) === key
                            )
                        )
                    );
                }
            );

            if (!available) return;
        }

        setApprovedSuppliers((current) => [
            ...current,
            createSupplierRow(data.fleet_truck_type || "", isStandardReplacementType ? 1 : Math.max(remainingAllocationQty, 0)),
        ]);
    };

    const removeApprovedSupplier = (rowId: string) => {
        if (
            mutationBusyRef.current ||
            persistedIds.has(rowId)
        ) {
            return;
        }

        setApprovedSuppliers((current) =>
            current.filter((row) => row.rowId !== rowId)
        );
    };

    const rememberSavedDecisions = (
        decisions: LicenseDecisionPayload[]
    ) => {
        setSessionLicenseDecisions((current) => {
            const next = { ...current };

            for (const item of decisions) {
                const key = licenseDecisionKey(item.license);

                if (!key) continue;

                next[key] = {
                    license: item.license,
                    decision: item.decision,
                    companyName: item.company_name,
                    truckType: item.truck_type,
                    reason: item.reject_reason,
                };
            }

            return next;
        });
    };

    const getRemainingLicenseCount = (
        decisions: LicenseDecisionPayload[]
    ) => {
        const finished = new Set(Object.keys(savedLicenseDecisions));

        decisions.forEach((item) => {
            finished.add(licenseDecisionKey(item.license));
        });

        return allReplacementLicenses.filter(
            (license) => !finished.has(licenseDecisionKey(license))
        ).length;
    };

    const getApprovalCompanyName = (
        companyName: string,
        truckType: string
    ) => {
        const name = companyName.trim();
        const suffix = name.match(/\s*\(([^()]*)\)\s*$/);

        if (!suffix) return name;

        const normalizeType = (value: string) =>
            value.replace(/\s+/g, "").toLowerCase();

        const isTruckSuffix = [truckType, ...truckTypeOptions].some(
            (type) =>
                type.trim() &&
                normalizeType(type) === normalizeType(suffix[1])
        );

        return isTruckSuffix
            ? name.slice(0, suffix.index).trim()
            : name;
    };

    const getPayloadCompanyName = (row: ApprovedSupplierRow): string => {
        const companyName = getApprovalCompanyName(row.companyName, row.truckType);
        const subsidiary = isAllNowSupplier(row) ? row.subsidiary.trim() : "";
        if (!subsidiary) return companyName;
        const suffix = `(${subsidiary})`;
        return companyName.endsWith(suffix) ? companyName : `${companyName}${suffix}`;
    };

    const totalDraftQty = draftRows.reduce(
        (sum, row) =>
            sum +
            (isStandardReplacementType
                ? row.replacementLicenses.length > 0
                    ? 1
                    : 0
                : Number(row.qty || 0)),
        0
    );

    const savedRowQty = approvedSuppliers
        .filter((row) => persistedIds.has(row.rowId))
        .reduce(
            (sum, row) =>
                sum +
                (isStandardReplacementType ? 1 : Number(row.qty || 0)),
            0
        );

    const savedApprovedQty = Math.max(
        Number(data.approved_qty || 0), savedRowQty, allocationBalance?.approved ?? 0
    );
    const gmApprovedQty = allocationBalance?.gm ?? Number(data.approve_qty_gm ?? 0);
    const savedRejectedQty = allocationBalance?.rejected ?? Number(data.not_approved_qty ?? 0);
    const notApprovedQty = isStandardReplacementType ? 0 : batchRejectedQty;
    const remainingAllocationQty = gmApprovedQty - savedApprovedQty - savedRejectedQty - totalDraftQty - notApprovedQty;
    const activeDraftRows = draftRows.filter(row =>
        row.qty !== 0 || row.companyName.trim() !== "" || row.companyId !== "" || row.remark.trim() !== ""
    );

    const rowIsValid = (row: ApprovedSupplierRow) =>
        Boolean(
            row.companyName.trim() &&
            row.truckType.trim() &&
            Number.isInteger(Number(row.qty)) &&
            Number(row.qty) > 0 &&
            (
                !isStandardReplacementType ||
                row.replacementLicenses.length > 0
            )
        );

    const normalApprovalValid =
        allocationBalance !== null && !loadingBalance && !balanceError &&
        activeDraftRows.every(rowIsValid) &&
        Number.isInteger(notApprovedQty) && notApprovedQty >= 0 &&
        totalDraftQty + notApprovedQty > 0 && remainingAllocationQty >= 0;

    const approveRequest = async (rowToSave?: ApprovedSupplierRow) => {
        if (mutationBusyRef.current) return;

        if (!canMakeDecision || !data.id) {
            setMessage({
                type: "error",
                text: "รายการนี้ไม่สามารถบันทึกได้ หรือไม่พบ ID คำขอ",
            });
            return;
        }

        const rowsToSave = rowToSave
            ? approvedSuppliers.filter(
                (row) =>
                    row.rowId === rowToSave.rowId &&
                    !persistedIds.has(row.rowId)
            )
            : isStandardReplacementType ? draftRows : activeDraftRows;

        if (
            (isStandardReplacementType ? rowsToSave.length === 0 || !rowsToSave.every(rowIsValid) : !normalApprovalValid)
        ) {
            setMessage({
                type: "error",
                text: isStandardReplacementType
                    ? "กรุณาเลือกผู้ให้บริการ ประเภทรถ และทะเบียนเดิมให้ครบ"
                    : "กรุณาเลือกผู้ให้บริการ ประเภทรถ และจำนวนให้ครบ",
            });
            return;
        }

        if (
            !isStandardReplacementType &&
            remainingAllocationQty < 0
        ) {
            setMessage({
                type: "error",
                text: "จำนวนอนุมัติและไม่อนุมัติรวมเกินยอด GM",
            });
            return;
        }

        if (
            !isStandardReplacementType &&
            notApprovedQty > 0 &&
            !rejectReason.trim()
        ) {
            setMessage({
                type: "error",
                text: `กรุณาระบุเหตุผลที่ไม่อนุมัติ ${notApprovedQty} คัน`,
            });
            return;
        }

        const decisions: LicenseDecisionPayload[] =
            isStandardReplacementType
                ? rowsToSave.flatMap((row) =>
                    row.replacementLicenses.map((license) => ({
                        license,
                        decision: "approved" as const,
                        company_id: row.companyId,
                        company_name: getPayloadCompanyName(row),
                        truck_type: row.truckType,
                    }))
                )
                : [];

        if (
            decisions.some(
                (item) =>
                    savedLicenseDecisions[
                    licenseDecisionKey(item.license)
                    ]
            )
        ) {
            setMessage({
                type: "error",
                text: "มีทะเบียนที่บันทึกแล้ว กรุณาเลือกทะเบียนที่เหลือ",
            });
            return;
        }

        const totalPdfBytes = rowsToSave.reduce((sum, row) => sum + (requiresPdfAttachment(row) && row.attachmentMode === "new" ? row.attachmentFile?.size ?? 0 : 0), 0);
        if (totalPdfBytes > 50 * 1024 * 1024) {
            setMessage({ type: "error", text: "ไฟล์แนบรวมต่อครั้งต้องไม่เกิน 50 MB กรุณาแบ่งบันทึก" });
            return;
        }
        for (const row of rowsToSave) {
            if (!requiresPdfAttachment(row)) continue;
            if (row.attachmentMode === "existing" && !row.attachmentId) {
                setMessage({ type: "error", text: "กรุณาเลือกเอกสารเดิม หรือเปลี่ยนเป็นแนบ PDF ใหม่" });
                return;
            }
            if (row.attachmentMode === "new" && row.attachmentDocumentNo.trim() && !row.attachmentFile) {
                setMessage({ type: "error", text: "กรุณาเลือก PDF สำหรับเลขเอกสารแนบที่ระบุ" });
                return;
            }
            if (row.attachmentFile && (!row.attachmentDocumentNo.trim() || row.attachmentFile.size > 10 * 1024 * 1024)) {
                setMessage({ type: "error", text: "กรุณาระบุเลขเอกสาร และใช้ PDF ขนาดไม่เกิน 10 MB" });
                return;
            }
        }

        const approvedBy = getCurrentUserText();

        if (!approvedBy) {
            setMessage({
                type: "error",
                text: "ไม่พบข้อมูลผู้ดำเนินการ กรุณาเข้าสู่ระบบใหม่",
            });
            return;
        }

        mutationBusyRef.current = true;
        setSaving(true);
        setMessage(null);

        try {
            const remaining = isStandardReplacementType
                ? getRemainingLicenseCount(decisions)
                : remainingAllocationQty;

            const status = remaining > 0
                ? isStandardReplacementType ? "fbp_pending" : "partial_approved"
                : "progress";

            const suppliersPayload = rowsToSave.map((row) => ({
                company_id: row.companyId,
                company_name: getPayloadCompanyName(row),
                truck_type: row.truckType,
                qty: isStandardReplacementType ? 1 : Number(row.qty),
                remark: row.remark.trim(),
                ...(isAllNowSupplier(row) ? { subsidiary: row.subsidiary.trim() } : {}),
                ...(requiresPdfAttachment(row) ? {
                    attachment_document_no: row.attachmentDocumentNo.trim(),
                    attachment_id: row.attachmentMode === "existing" ? row.attachmentId : null,
                    attachment_upload_key: row.attachmentMode === "new" && row.attachmentFile
                        ? `pdf_${row.rowId.replace(/[^A-Za-z0-9_-]/g, "_")}` : "",
                } : {}),
                replacement_licenses: row.replacementLicenses,
            }));

            const payload = {
                id: Number(data.id),
                status,
                partial_approval: remaining > 0,
                append_approval: true,
                ...(!isStandardReplacementType ? {
                    expected_approved_qty: allocationBalance?.approved,
                    expected_not_approved_qty: allocationBalance?.rejected,
                } : {}),
                approved_by: approvedBy,

                approved_qty: isStandardReplacementType
                    ? rowsToSave.length
                    : rowsToSave.reduce(
                        (sum, row) => sum + Number(row.qty),
                        0
                    ),

                not_approved_qty: isStandardReplacementType
                    ? 0
                    : notApprovedQty,

                remark: rowsToSave
                    .map((row) => row.remark.trim())
                    .filter(Boolean)
                    .join("\n"),

                reject_reason:
                    !isStandardReplacementType && notApprovedQty > 0
                        ? rejectReason.trim()
                        : "",

                suppliers: suppliersPayload,

                replacement_mappings: isStandardReplacementType
                    ? suppliersPayload.map((row) => ({
                        ...row,
                        approved_qty: 1,
                    }))
                    : [],

                replaced_license_qty: decisions.length,
                unassigned_license_qty: isStandardReplacementType ? remaining : 0,
                remaining_qty: isStandardReplacementType ? undefined : remaining,
                rejected_replacement_licenses: [],
                replacement_license_decisions: decisions,
                approved_truck_type:
                    rowsToSave[0]?.truckType ||
                    data.fleet_truck_type ||
                    "",
            };

            const formData = new FormData();
            formData.append("payload", JSON.stringify(payload));
            for (const row of rowsToSave) {
                if (requiresPdfAttachment(row) && row.attachmentMode === "new" && row.attachmentFile) {
                    formData.append(`pdf_${row.rowId.replace(/[^A-Za-z0-9_-]/g, "_")}`, row.attachmentFile, row.attachmentFile.name);
                }
            }
            const response = await fetch(`${API_BASE}/waiting_fleet_save.php`, {
                method: "POST", headers: { Accept: "application/json" }, body: formData,
            });

            const result = await readApiResponse(response);
            setAttachmentRefresh(value => value + 1);

            if (!isStandardReplacementType) {
                const totals = result.data as Record<string, unknown> | undefined;
                const newApproved = Number(totals?.approved_qty ?? savedApprovedQty + totalDraftQty);
                const newRejected = Number(totals?.not_approved_qty ?? savedRejectedQty + notApprovedQty);
                setAllocationBalance({ gm: gmApprovedQty, approved: newApproved, rejected: newRejected });
                setBatchRejectedQty(0);
                setRejectReason("");
                setApprovedSuppliers(current => current.filter(row => rowsToSave.some(saved => saved.rowId === row.rowId) || persistedIds.has(row.rowId)));
                refreshAfterPopupRef.current = true;
            }

            // ล็อกรายการและย่อเป็นกล่องสรุปทันที
            rememberSavedDecisions(decisions);

            setPersistedRowIds((current) =>
                Array.from(
                    new Set([
                        ...current,
                        ...rowsToSave.map((row) => row.rowId),
                    ])
                )
            );

            needsRefreshRef.current = true;

            if (remaining === 0) {
                setDecisionCompleted(true);
                refreshAfterPopupRef.current = true;
                closeAfterPopupRef.current = true;
            }

            setConfirmDecision(null);
            setMessage({
                type: "success",
                text: String(
                    result.message ||
                    (
                        isStandardReplacementType && remaining > 0
                            ? `บันทึกแล้ว เหลือ ${remaining} ทะเบียน สามารถเลือกรายการถัดไปได้ทันที`
                            : "บันทึกผลการจัดรถเรียบร้อยแล้ว"
                    )
                ),
            });
        } catch (error) {
            setMessage({
                type: "error",
                text:
                    error instanceof Error
                        ? error.message
                        : "เกิดข้อผิดพลาดในการบันทึก",
            });
        } finally {
            mutationBusyRef.current = false;
            setSaving(false);
        }
    };

    const saveRejectedReplacementLicenses = async () => {
        if (mutationBusyRef.current || !canMakeDecision) return;

        const selectedKeys = new Set(
            selectedRejectedLicenses.map(licenseDecisionKey)
        );

        const licenses = replacementLicenseOptions.filter(
            (license) =>
                selectedKeys.has(licenseDecisionKey(license)) &&
                !approvedSuppliers.some((row) =>
                    row.replacementLicenses.some(
                        (value) =>
                            licenseDecisionKey(value) ===
                            licenseDecisionKey(license)
                    )
                )
        );

        if (!data.id || licenses.length === 0 || !rejectReason.trim()) {
            setMessage({
                type: "error",
                text: "กรุณาเลือกทะเบียนและระบุเหตุผลไม่อนุมัติ",
            });
            return;
        }

        const approvedBy = getCurrentUserText();

        if (!approvedBy) {
            setMessage({
                type: "error",
                text: "ไม่พบข้อมูลผู้ดำเนินการ กรุณาเข้าสู่ระบบใหม่",
            });
            return;
        }

        const decisions: LicenseDecisionPayload[] = licenses.map(
            (license) => ({
                license,
                decision: "rejected",
                reject_reason: rejectReason.trim(),
            })
        );

        const remaining = getRemainingLicenseCount(decisions);

        const hasApproved =
            Object.values(savedLicenseDecisions).some(
                (item) => item.decision === "approved"
            ) ||
            savedApprovedQty > 0;

        mutationBusyRef.current = true;
        setSaving(true);
        setMessage(null);

        try {
            const response = await fetch(
                `${API_BASE}/waiting_fleet_save.php`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({
                        id: Number(data.id),

                        // ยังมีทะเบียนเหลือ ต้องให้พิจารณาต่อได้
                        status:
                            remaining > 0
                                ? "fbp_pending"
                                : hasApproved
                                    ? "progress"
                                    : "rejected",

                        partial_rejection: remaining > 0,
                        append_rejection: true,
                        approved_by: approvedBy,
                        approved_qty: 0,
                        not_approved_qty: licenses.length,
                        unassigned_license_qty: remaining,
                        reject_reason: rejectReason.trim(),

                        rejected_replacement_licenses: licenses.map(
                            (license) =>
                                license.trim().split(/\s+-\s+/)[0]
                        ),

                        replacement_license_decisions: decisions.map(
                            (item) => ({
                                ...item,
                                license: item.license
                                    .trim()
                                    .split(/\s+-\s+/)[0],
                                status: "rejected",
                            })
                        ),
                    }),
                }
            );

            const result = await readApiResponse(response);

            rememberSavedDecisions(decisions);
            setSelectedRejectedLicenses([]);
            setRejectReason("");

            needsRefreshRef.current = true;

            if (remaining === 0) {
                setDecisionCompleted(true);
                refreshAfterPopupRef.current = true;
                closeAfterPopupRef.current = true;
            }

            setMessage({
                type: "success",
                text: String(
                    result.message ||
                    `บันทึกไม่อนุมัติ ${licenses.length} ทะเบียนแล้ว`
                ),
            });
        } catch (error) {
            setMessage({
                type: "error",
                text:
                    error instanceof Error
                        ? error.message
                        : "บันทึกไม่อนุมัติไม่สำเร็จ",
            });
        } finally {
            mutationBusyRef.current = false;
            setSaving(false);
        }
    };

    const rejectRequest = async () => {
        if (mutationBusyRef.current || !canMakeDecision) return;

        if (!data.id || !rejectReason.trim()) {
            setMessage({
                type: "error",
                text: "กรุณาระบุเหตุผลที่ไม่อนุมัติ",
            });
            return;
        }

        const approvedBy = getCurrentUserText();

        if (!approvedBy) {
            setMessage({
                type: "error",
                text: "ไม่พบข้อมูลผู้ดำเนินการ กรุณาเข้าสู่ระบบใหม่",
            });
            return;
        }

        mutationBusyRef.current = true;
        setSaving(true);

        try {
            const response = await fetch(
                `${API_BASE}/request_gm_update.php`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({
                        id: Number(data.id),
                        status: "reject_by_fbp",
                        approved_by: approvedBy,
                        reject_reason: rejectReason.trim(),
                    }),
                }
            );

            const result = await readApiResponse(response);

            setDecisionCompleted(true);
            setConfirmDecision(null);

            needsRefreshRef.current = true;
            refreshAfterPopupRef.current = true;
            closeAfterPopupRef.current = true;

            setMessage({
                type: "success",
                text: String(
                    result.message || "บันทึกไม่อนุมัติคำขอแล้ว"
                ),
            });
        } catch (error) {
            setMessage({
                type: "error",
                text:
                    error instanceof Error
                        ? error.message
                        : "บันทึกไม่สำเร็จ",
            });
        } finally {
            mutationBusyRef.current = false;
            setSaving(false);
        }
    };

    const saveSupplierRating = async (row: ApprovedSupplierRow) => {
        if (mutationBusyRef.current) return;

        const rating = supplierRatings[row.rowId];
        const updatedBy = getCurrentUserText();

        if (!row.companyId || !rating || !updatedBy) {
            setMessage({
                type: "error",
                text: "กรุณาเลือกผู้ให้บริการจากรายการ เลือกคะแนน และตรวจสอบข้อมูลผู้ใช้งาน",
            });
            return;
        }

        mutationBusyRef.current = true;
        setRatingSavingRowId(row.rowId);

        try {
            const response = await fetch(
                `${API_BASE}/rate_supplier.php`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({
                        id: row.companyId,
                        rating,
                        update_by: updatedBy,
                    }),
                }
            );

            await readApiResponse(response);

            setMessage({
                type: "success",
                text: "บันทึกคะแนนผู้ให้บริการแล้ว",
            });
        } catch (error) {
            setMessage({
                type: "error",
                text:
                    error instanceof Error
                        ? error.message
                        : "บันทึกคะแนนไม่สำเร็จ",
            });
        } finally {
            mutationBusyRef.current = false;
            setRatingSavingRowId(null);
        }
    };

    const closeModal = useCallback(async () => {
        if (mutationBusyRef.current) return;

        try {
            if (needsRefreshRef.current) {
                await onSuccess();
                needsRefreshRef.current = false;
            }

            onClose();
        } catch {
            setMessage({
                type: "error",
                text: "บันทึกแล้ว แต่โหลดข้อมูลล่าสุดไม่สำเร็จ กรุณารีเฟรชหน้า",
            });
        }
    }, [onClose, onSuccess]);

    const dismissNotification = async () => {
        if (mutationBusyRef.current) return;

        const shouldRefresh = refreshAfterPopupRef.current;
        const shouldClose = closeAfterPopupRef.current;

        setMessage(null);
        setConfirmDecision(null);

        try {
            if (shouldRefresh) {
                await onSuccess();
                needsRefreshRef.current = false;
            }

            refreshAfterPopupRef.current = false;
            closeAfterPopupRef.current = false;

            if (shouldClose) onClose();
        } catch {
            setMessage({
                type: "error",
                text: "บันทึกแล้ว แต่โหลดข้อมูลล่าสุดไม่สำเร็จ กรุณาลองอีกครั้ง",
            });
        }
    };

    useEffect(() => {
        if (!open) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const onKeyDown = (event: KeyboardEvent) => {
            if (
                event.key === "Escape" &&
                !popupBusy &&
                !message &&
                !confirmDecision
            ) {
                void closeModal();
            }
        };

        window.addEventListener("keydown", onKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [
        open,
        popupBusy,
        message,
        confirmDecision,
        closeModal,
    ]);

    const rejectedSaved = Object.values(savedLicenseDecisions).filter(
        (item) => item.decision === "rejected"
    );

    // แสดงผลเก่าที่ไม่มีแถวผู้ให้บริการรองรับ
    const savedLicensesWithoutRow = Object.values(
        savedLicenseDecisions
    ).filter(
        (item) =>
            item.decision === "approved" &&
            !approvedSuppliers.some(
                (row) =>
                    persistedIds.has(row.rowId) &&
                    row.replacementLicenses.some(
                        (license) =>
                            licenseDecisionKey(license) ===
                            licenseDecisionKey(item.license)
                    )
            )
    );

    const hasUnassignedLicense = replacementLicenseOptions.some(
        (license) => {
            const key = licenseDecisionKey(license);

            return (
                !selectedRejectedLicenses.some(
                    (value) => licenseDecisionKey(value) === key
                ) &&
                !approvedSuppliers.some((row) =>
                    row.replacementLicenses.some(
                        (value) => licenseDecisionKey(value) === key
                    )
                )
            );
        }
    );

    if (!open) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="ประเมินกองรถ"
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 p-2 backdrop-blur-sm sm:p-4"
            onMouseDown={(event) => {
                if (
                    event.target === event.currentTarget &&
                    !popupBusy &&
                    !message &&
                    !confirmDecision
                ) {
                    void closeModal();
                }
            }}
        >
            <div
                className="relative flex h-[94vh] w-full max-w-[1280px] flex-col overflow-hidden rounded-[28px] border border-white/70 bg-slate-100 shadow-2xl"
                onMouseDown={(event) => event.stopPropagation()}
            >
                <header className="shrink-0 border-b border-slate-200 bg-white">
                    <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-400 to-sky-400" />

                    <div className="flex items-start justify-between gap-4 px-4 py-4 sm:px-6">
                        <div className="flex min-w-0 gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xs font-bold text-white">
                                FBP
                            </div>

                            <div className="min-w-0">
                                <h1 className="text-lg font-semibold text-slate-900">
                                    ประเมินกองรถ
                                </h1>

                                <p className="mt-1 text-xs text-slate-500">
                                    เลือกผู้ให้บริการ ประเภทรถ และทะเบียนที่ทดแทน
                                </p>

                                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                                        {data.running_doc || "-"}
                                    </span>

                                    <span className="rounded-lg bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                                        {data.dc_code || "-"}
                                    </span>

                                    <span className="rounded-lg bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
                                        {statusText}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            aria-label="ปิด"
                            disabled={popupBusy}
                            onClick={() => void closeModal()}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-xl text-slate-400 hover:bg-rose-50 hover:text-rose-500 disabled:opacity-50"
                        >
                            ×
                        </button>
                    </div>
                </header>

                <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_380px] lg:overflow-hidden">
                    <div className="bg-slate-50 p-2 sm:p-4 lg:min-h-0 lg:overflow-y-auto">
                        <CheckDC
                            data={data}
                            allRequests={allRequests}
                            issuePeriods={issuePeriods}
                        />
                    </div>

                    <aside className="border-t border-slate-200 bg-slate-50 p-3 text-black sm:p-4 lg:min-h-0 lg:overflow-y-auto lg:border-l lg:border-t-0">
                        <div className="space-y-4">
                            {/* สรุปคำขอ */}
                            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                <div className="flex items-center gap-3 border-b border-slate-100 bg-blue-50/60 px-4 py-3.5">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xs font-bold text-blue-700">
                                        01
                                    </span>
                                    <div>
                                        <h2 className="text-sm font-bold text-black">
                                            สรุปข้อมูลคำขอ
                                        </h2>
                                        <p className="mt-0.5 text-[11px] text-slate-500">
                                            รายละเอียดและยอดการพิจารณา
                                        </p>
                                    </div>
                                </div>

                                <div className="px-4 py-1">
                                    {[
                                        ["เลขที่เอกสาร", data.running_doc || "-"],
                                        ["DC", data.dc_code || "-"],
                                        ["ประเภทคำขอ", data.fleet_type || "-"],
                                        ["ประเภทรถที่ขอ", data.fleet_truck_type || "-"],
                                        ["สถานะ", statusText],
                                    ].map(([label, value]) => (
                                        <div
                                            key={label}
                                            className="grid grid-cols-[90px_minmax(0,1fr)] gap-3 border-b border-slate-100 py-2.5 text-xs last:border-0"
                                        >
                                            <span className="leading-relaxed text-black">
                                                {label}
                                            </span>
                                            <span className="min-w-0 break-words text-right font-semibold leading-relaxed text-black">
                                                {value}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-2 border-t border-slate-100 p-3">
                                    {[
                                        {
                                            label: "จำนวนที่คลังขอ",
                                            value: requestedQty,
                                            color: "border-sky-100 bg-sky-50/70",
                                            dot: "bg-sky-500",
                                        },
                                        ...(data.approve_qty_gm !== null &&
                                            data.approve_qty_gm !== undefined &&
                                            String(data.approve_qty_gm).trim() !== ""
                                            ? [
                                                {
                                                    label: "จำนวนที่ GM อนุมัติ",
                                                    value: Number(data.approve_qty_gm),
                                                    color: "border-blue-100 bg-blue-50/70",
                                                    dot: "bg-blue-600",
                                                },
                                            ]
                                            : []),
                                        {
                                            label: "จำนวนที่ FBP ประเมินกองรถและอนุมัติ",
                                            value: savedApprovedQty,
                                            color: "border-emerald-100 bg-emerald-50/70",
                                            dot: "bg-emerald-500",
                                        },
                                        {
                                            label: "จำนวนที่ FBP ไม่อนุมัติ",
                                            value: savedRejectedQty,
                                            color: "border-rose-100 bg-rose-50/70",
                                            dot: "bg-rose-500",
                                        },
                                        ...(Math.max(
                                            gmApprovedQty -
                                            savedApprovedQty -
                                            savedRejectedQty,
                                            0
                                        ) > 0
                                            ? [
                                                {
                                                    label: "จำนวนที่รอ FBP อนุมัติ",
                                                    value: Math.max(
                                                        gmApprovedQty -
                                                        savedApprovedQty -
                                                        savedRejectedQty,
                                                        0
                                                    ),
                                                    color: "border-amber-100 bg-amber-50/70",
                                                    dot: "bg-amber-500",
                                                },
                                            ]
                                            : []),
                                    ].map((item) => (
                                        <div
                                            key={item.label}
                                            className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${item.color}`}
                                        >
                                            <div className="flex min-w-0 items-center gap-2">
                                                <span
                                                    aria-hidden="true"
                                                    className={`h-2 w-2 shrink-0 rounded-full ${item.dot}`}
                                                />
                                                <span className="text-xs font-medium leading-relaxed text-black">
                                                    {item.label}
                                                </span>
                                            </div>
                                            <span className="shrink-0 whitespace-nowrap text-lg font-bold tabular-nums text-black">
                                                {formatNumber(item.value)}
                                                <span className="ml-1 text-[11px] font-normal">
                                                    คัน
                                                </span>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* สรุปทะเบียนทดแทน */}
                            {isStandardReplacementType && (
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        {
                                            label: "ทะเบียนทั้งหมด",
                                            value: allReplacementLicenses.length,
                                            dot: "bg-blue-600",
                                        },
                                        {
                                            label: "เหลือพิจารณา",
                                            value: replacementLicenseOptions.length,
                                            dot: "bg-amber-500",
                                        },
                                    ].map((item) => (
                                        <div
                                            key={item.label}
                                            className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                                        >
                                            <p className="flex items-center gap-2 text-xs text-black">
                                                <span
                                                    aria-hidden="true"
                                                    className={`h-2 w-2 rounded-full ${item.dot}`}
                                                />
                                                {item.label}
                                            </p>
                                            <p className="mt-2 text-2xl font-bold tabular-nums text-black">
                                                {item.value}
                                                <span className="ml-1.5 text-[11px] font-normal text-slate-500">
                                                    ทะเบียน
                                                </span>
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* จัดรถ */}
                            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-blue-50/60 px-4 py-3.5">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xs font-bold text-blue-700">
                                            02
                                        </span>
                                        <div>
                                            <h2 className="text-sm font-bold text-black">
                                                {canMakeDecision ? "จัดรถ" : "ผลการจัดรถ"}
                                            </h2>
                                            <p className="mt-0.5 text-[11px] text-slate-500">
                                                ผู้ให้บริการและจำนวนรถ
                                            </p>
                                        </div>
                                    </div>

                                    {canMakeDecision && (
                                        <button
                                            type="button"
                                            disabled={
                                                popupBusy ||
                                                (isStandardReplacementType &&
                                                    !hasUnassignedLicense)
                                            }
                                            onClick={addApprovedSupplier}
                                            className="shrink-0 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            + เพิ่มรายการ
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-3 p-3">
                                    {persistedRowIds.length > 0 && (
                                        <p className="px-1 text-xs font-semibold text-black">
                                            รายการที่บันทึกแล้ว
                                        </p>
                                    )}

                                    {!isStandardReplacementType &&
                                        !loadingBalance &&
                                        savedApprovedQty > 0 &&
                                        persistedRowIds.length === 0 && (
                                            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-black">
                                                มียอดอนุมัติสะสม
                                                แต่ไม่พบรายละเอียดบริษัทในข้อมูลเดิม
                                            </p>
                                        )}

                                    {approvedSuppliers.map((row, index) => {
                                        const isSaved = persistedIds.has(row.rowId);

                                        if (isSaved) {
                                            return (
                                                <div
                                                    key={row.rowId}
                                                    className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                                                >
                                                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-emerald-50/70 px-3 py-2">
                                                        <span className="text-[11px] font-semibold text-black">
                                                            ผู้ให้บริการที่อนุมัติ
                                                        </span>
                                                        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                                            ✓ บันทึกแล้ว
                                                        </span>
                                                    </div>

                                                    <div className="p-3">
                                                        <p className="break-words text-xs font-bold leading-relaxed text-black">
                                                            {row.companyName || "-"}
                                                        </p>

                                                        <p className="mt-1 text-[11px] text-slate-500">
                                                            รหัสผู้ให้บริการ:{" "}
                                                            {row.companyId || "-"}
                                                        </p>

                                                        {isAllNowSupplier(row) && row.subsidiary.trim() && (
                                                            <p className="mt-1.5 break-words text-xs text-black">บริษัทภายใต้: {row.subsidiary}</p>
                                                        )}

                                                        <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                                                            <span className="text-xs font-medium text-black">
                                                                {row.truckType || "-"}
                                                            </span>
                                                            <span className="text-sm font-bold tabular-nums text-black">
                                                                {isStandardReplacementType
                                                                    ? 1
                                                                    : row.qty}
                                                                <span className="ml-1 text-[11px] font-normal">
                                                                    คัน
                                                                </span>
                                                            </span>
                                                        </div>

                                                        {row.replacementLicenses.length > 0 && (
                                                            <div className="mt-3 flex flex-wrap gap-1.5">
                                                                {row.replacementLicenses.map(
                                                                    (license) => (
                                                                        <span
                                                                            key={license}
                                                                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-black"
                                                                        >
                                                                            {license}
                                                                        </span>
                                                                    )
                                                                )}
                                                            </div>
                                                        )}

                                                        {row.remark.trim() && (
                                                            <p className="mt-3 whitespace-pre-wrap break-words border-t border-slate-100 pt-2 text-xs leading-relaxed text-black">
                                                                หมายเหตุ: {row.remark}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        if (!canMakeDecision) return null;

                                        return (
                                            <div
                                                key={row.rowId}
                                                className="overflow-hidden rounded-xl border border-blue-200 bg-white"
                                            >
                                                <div className="flex items-center justify-between gap-2 border-b border-blue-100 bg-blue-50/60 px-3 py-2.5">
                                                    <p className="text-xs font-bold text-black">
                                                        รายการจัดรถ {index + 1}
                                                    </p>

                                                    {draftRows.length > 1 && (
                                                        <button
                                                            type="button"
                                                            disabled={popupBusy}
                                                            onClick={() =>
                                                                removeApprovedSupplier(row.rowId)
                                                            }
                                                            className="rounded-lg px-2 py-1 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-40"
                                                        >
                                                            ลบรายการ
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="space-y-3.5 p-3">
                                                    <label className="block">
                                                        <span className="mb-1.5 block text-xs font-semibold text-black">
                                                            ผู้ให้บริการ
                                                        </span>
                                                        <input
                                                            type="text"
                                                            list={`supplier-${row.rowId}`}
                                                            value={row.companyName}
                                                            disabled={popupBusy}
                                                            autoComplete="off"
                                                            onChange={(event) =>
                                                                handleSupplierChange(
                                                                    row.rowId,
                                                                    event.target.value
                                                                )
                                                            }
                                                            placeholder={
                                                                loadingSuppliers
                                                                    ? "กำลังโหลดผู้ให้บริการ..."
                                                                    : "พิมพ์หรือเลือกผู้ให้บริการ"
                                                            }
                                                            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-black outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 disabled:bg-slate-50 disabled:opacity-60"
                                                        />
                                                        <datalist id={`supplier-${row.rowId}`}>
                                                            {supplierOptions.map((name) => (
                                                                <option key={name} value={name} />
                                                            ))}
                                                        </datalist>
                                                    </label>

                                                    {isAllNowSupplier(row) && (
                                                        <label className="block">
                                                            <span className="mb-1.5 block text-xs font-semibold text-black">บริษัทภายใต้</span>
                                                            <input
                                                                type="text"
                                                                list={`subsidiary-${row.rowId}`}
                                                                value={row.subsidiary}
                                                                disabled={popupBusy}
                                                                autoComplete="off"
                                                                onChange={event => updateSupplierRow(row.rowId, { subsidiary: event.target.value })}
                                                                placeholder={loadingSuppliers ? "กำลังโหลดบริษัทภายใต้..." : "พิมพ์หรือเลือกบริษัทภายใต้"}
                                                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-black outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 disabled:bg-slate-50 disabled:opacity-60"
                                                            />
                                                            <datalist id={`subsidiary-${row.rowId}`}>
                                                                {subsidiaryOptions.map(name => <option key={name} value={name} />)}
                                                            </datalist>
                                                            {!loadingSuppliers && subsidiaryOptions.length === 0 && (
                                                                <p className="mt-1.5 text-[11px] text-slate-500">ยังไม่มีรายการบริษัทภายใต้ สามารถพิมพ์ชื่อได้</p>
                                                            )}
                                                        </label>
                                                    )}

                                                    <div className="rounded-xl bg-slate-50 p-2.5">
                                                        <p className="mb-2 text-[11px] font-semibold text-black">
                                                            คะแนนผู้ให้บริการ
                                                        </p>
                                                        <div className="flex gap-2">
                                                            <select
                                                                aria-label={`คะแนนผู้ให้บริการรายการ ${index + 1}`}
                                                                value={
                                                                    supplierRatings[row.rowId] ||
                                                                    ""
                                                                }
                                                                disabled={
                                                                    popupBusy || !row.companyId
                                                                }
                                                                onChange={(event) =>
                                                                    setSupplierRatings(
                                                                        (current) => ({
                                                                            ...current,
                                                                            [row.rowId]:
                                                                                event.target.value,
                                                                        })
                                                                    )
                                                                }
                                                                className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-2 text-xs text-black outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 disabled:opacity-50"
                                                            >
                                                                <option value="">
                                                                    เลือกระดับคะแนน
                                                                </option>
                                                                <option value="E">
                                                                    E (Excellent)
                                                                </option>
                                                                <option value="G">
                                                                    G (Good)
                                                                </option>
                                                                <option value="P">
                                                                    P (Pass)
                                                                </option>
                                                                <option value="I">
                                                                    I (Improvement Required)
                                                                </option>
                                                            </select>

                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    popupBusy ||
                                                                    !row.companyId ||
                                                                    !supplierRatings[row.rowId]
                                                                }
                                                                onClick={() =>
                                                                    void saveSupplierRating(row)
                                                                }
                                                                className="shrink-0 rounded-xl border border-blue-200 bg-white px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-40"
                                                            >
                                                                {ratingSavingRowId === row.rowId
                                                                    ? "กำลังบันทึก..."
                                                                    : "บันทึก"}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-[minmax(0,1fr)_88px] gap-3">
                                                        <label className="block">
                                                            <span className="mb-1.5 block text-xs font-semibold text-black">
                                                                ประเภทรถ
                                                            </span>
                                                            <select
                                                                value={row.truckType}
                                                                disabled={
                                                                    popupBusy || loadingTrucks
                                                                }
                                                                onChange={(event) =>
                                                                    updateSupplierRow(
                                                                        row.rowId,
                                                                        {
                                                                            truckType:
                                                                                event.target.value,
                                                                        }
                                                                    )
                                                                }
                                                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs text-black outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 disabled:bg-slate-50 disabled:opacity-60"
                                                            >
                                                                <option value="">
                                                                    {loadingTrucks
                                                                        ? "กำลังโหลด..."
                                                                        : "เลือกประเภทรถ"}
                                                                </option>
                                                                {truckTypeOptions.map((type) => (
                                                                    <option
                                                                        key={type}
                                                                        value={type}
                                                                    >
                                                                        {formatTruckTypeLabel(
                                                                            type
                                                                        )}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </label>

                                                        <label className="block">
                                                            <span className="mb-1.5 block text-xs font-semibold text-black">
                                                                จำนวน
                                                            </span>
                                                            <input
                                                                type="number"
                                                                min={
                                                                    isStandardReplacementType
                                                                        ? 1
                                                                        : 0
                                                                }
                                                                step={1}
                                                                value={
                                                                    isStandardReplacementType
                                                                        ? 1
                                                                        : row.qty
                                                                }
                                                                disabled={
                                                                    popupBusy ||
                                                                    isStandardReplacementType
                                                                }
                                                                onFocus={(event) =>
                                                                    event.currentTarget.select()
                                                                }
                                                                onChange={(event) =>
                                                                    updateSupplierRow(
                                                                        row.rowId,
                                                                        {
                                                                            qty:
                                                                                event.target
                                                                                    .value === ""
                                                                                    ? 0
                                                                                    : Number(
                                                                                        event
                                                                                            .target
                                                                                            .value
                                                                                    ),
                                                                        }
                                                                    )
                                                                }
                                                                className="h-10 w-full rounded-xl border border-blue-200 bg-blue-50/50 px-2 text-center text-base font-bold tabular-nums text-black outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 disabled:bg-slate-100 disabled:opacity-60"
                                                            />
                                                        </label>
                                                    </div>

                                                    {requiresPdfAttachment(row) && (
                                                        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="rounded-lg bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-700">PDF</span>
                                                                <p className="text-xs font-semibold text-black">เอกสารแนบผู้ให้บริการ</p>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1">
                                                                {(["new", "existing"] as const).map(mode => (
                                                                    <button key={mode} type="button" disabled={popupBusy}
                                                                        onClick={() => updateSupplierRow(row.rowId, { attachmentMode: mode, attachmentId: null, attachmentFile: null, attachmentDocumentNo: "" })}
                                                                        className={`rounded-lg px-2 py-2 text-[11px] font-semibold transition ${row.attachmentMode === mode ? "bg-blue-700 text-white" : "text-black hover:bg-blue-50"}`}>
                                                                        {mode === "new" ? "แนบ PDF ใหม่" : "เลือกเอกสารเดิม"}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            {row.attachmentMode === "existing" ? (
                                                                <div className="space-y-2">
                                                                    <input type="search" aria-label="ค้นหาเอกสารเดิม" value={attachmentSearch} disabled={popupBusy}
                                                                        onChange={event => setAttachmentSearch(event.target.value)} placeholder="ค้นหาเลขเอกสารหรือชื่อไฟล์"
                                                                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-black outline-none focus:border-blue-400" />
                                                                    <select aria-label="เลือกเอกสารแนบเดิม" value={row.attachmentId ?? ""} disabled={popupBusy || loadingAttachments}
                                                                        onChange={event => {
                                                                            const selected = availableAttachments.find(item => String(item.attachment_id) === event.target.value);
                                                                            updateSupplierRow(row.rowId, { attachmentId: selected ? Number(selected.attachment_id) : null, attachmentDocumentNo: selected?.document_no ?? "", attachmentFile: null });
                                                                        }}
                                                                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs text-black">
                                                                        <option value="">{loadingAttachments ? "กำลังโหลดเอกสาร..." : "เลือกเอกสารที่เคยแนบ"}</option>
                                                                        {row.attachmentId && !availableAttachments.some(item => Number(item.attachment_id) === row.attachmentId) && <option value={row.attachmentId}>📄 {row.attachmentDocumentNo}</option>}
                                                                        {availableAttachments.map(item => <option key={String(item.attachment_id)} value={String(item.attachment_id)}>📄 {item.document_no} ({item.file_name})</option>)}
                                                                    </select>
                                                                    {attachmentHasMore && <p className="text-[11px] text-slate-500">แสดง 200 เอกสารล่าสุด กรุณาพิมพ์ค้นหาเพื่อเจาะจงเอกสาร</p>}
                                                                    {attachmentListError && <p className="break-words text-[11px] text-rose-700">{attachmentListError} <button type="button" onClick={() => setAttachmentRefresh(value => value + 1)} className="underline">ลองใหม่</button></p>}
                                                                    {row.attachmentId && <a href={`${API_BASE}/fleet_attachments.php?action=file&id=${row.attachmentId}`} target="_blank" rel="noopener noreferrer" className="inline-block text-xs font-semibold text-blue-700 underline">เปิด PDF ที่เลือก</a>}
                                                                </div>
                                                            ) : (
                                                                <label className="block">
                                                                    <span className="mb-1.5 block text-xs font-semibold text-black">นำเข้าไฟล์ PDF (ไม่เกิน 10 MB)</span>
                                                                    <input key={`pdf-${row.rowId}-${row.companyId}-${row.companyName}-${row.attachmentMode}`}
                                                                        type="file" accept=".pdf,application/pdf" disabled={popupBusy}
                                                                        onChange={event => {
                                                                            const file = event.currentTarget.files?.[0];
                                                                            if (!file) return;
                                                                            if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== "application/pdf") || file.size > 10 * 1024 * 1024 || file.size === 0) {
                                                                                event.currentTarget.value = "";
                                                                                setMessage({ type: "error", text: "กรุณาเลือก PDF ขนาดไม่เกิน 10 MB" });
                                                                                return;
                                                                            }
                                                                            updateSupplierRow(row.rowId, { attachmentFile: file, attachmentId: null, attachmentDocumentNo: file.name.replace(/\.pdf$/i, "") });
                                                                        }}
                                                                        className="block w-full text-[11px] text-black file:mr-2 file:rounded-lg file:border-0 file:bg-blue-700 file:px-3 file:py-2.5 file:text-xs file:font-semibold file:text-white disabled:opacity-60" />
                                                                </label>
                                                            )}
                                                            <label className="block">
                                                                <span className="mb-1.5 block text-xs font-semibold text-black">เลขเอกสารแนบ</span>
                                                                <input type="text" maxLength={255} value={row.attachmentDocumentNo} disabled={popupBusy} readOnly={row.attachmentMode === "existing"}
                                                                    onChange={event => updateSupplierRow(row.rowId, { attachmentDocumentNo: event.target.value })}
                                                                    placeholder="เลือก PDF เพื่อดึงชื่อเอกสาร"
                                                                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-black outline-none focus:border-blue-400 read-only:bg-slate-100" />
                                                            </label>
                                                            {row.attachmentFile && <p className="break-all rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] text-black">เลือกแล้ว: {row.attachmentFile.name} — จะอัปโหลดเมื่อบันทึกผลจัดรถ</p>}
                                                        </div>
                                                    )}

                                                    {truckError && (
                                                        <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
                                                            {truckError}
                                                        </p>
                                                    )}

                                                    <label className="block">
                                                        <span className="mb-1.5 block text-xs font-semibold text-black">
                                                            หมายเหตุรายการนี้
                                                            <span className="ml-1 font-normal text-slate-400">
                                                                (ไม่บังคับ)
                                                            </span>
                                                        </span>
                                                        <textarea
                                                            rows={2}
                                                            value={row.remark}
                                                            disabled={popupBusy}
                                                            onChange={(event) =>
                                                                updateSupplierRow(row.rowId, {
                                                                    remark: event.target.value,
                                                                })
                                                            }
                                                            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs leading-relaxed text-black outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 disabled:bg-slate-50"
                                                        />
                                                    </label>

                                                    {isStandardReplacementType && (
                                                        <div className="space-y-3 border-t border-slate-100 pt-3">
                                                            <div>
                                                                <p className="text-xs font-bold text-black">
                                                                    ทะเบียนเดิมที่ทดแทน
                                                                </p>
                                                                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                                                                    รถใหม่ 1 คัน ทดแทนรถเดิมได้หลายทะเบียน
                                                                </p>
                                                            </div>

                                                            <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-1.5">
                                                                {replacementLicenseOptions.map(
                                                                    (license) => {
                                                                        const key =
                                                                            licenseDecisionKey(
                                                                                license
                                                                            );
                                                                        const selected =
                                                                            row.replacementLicenses.some(
                                                                                (value) =>
                                                                                    licenseDecisionKey(
                                                                                        value
                                                                                    ) === key
                                                                            );
                                                                        const usedByOther =
                                                                            approvedSuppliers.some(
                                                                                (other) =>
                                                                                    other.rowId !==
                                                                                    row.rowId &&
                                                                                    other.replacementLicenses.some(
                                                                                        (value) =>
                                                                                            licenseDecisionKey(
                                                                                                value
                                                                                            ) ===
                                                                                            key
                                                                                    )
                                                                            );
                                                                        const rejected =
                                                                            selectedRejectedLicenses.some(
                                                                                (value) =>
                                                                                    licenseDecisionKey(
                                                                                        value
                                                                                    ) === key
                                                                            );

                                                                        return (
                                                                            <label
                                                                                key={license}
                                                                                className={`flex items-center gap-2 rounded-lg border px-2.5 py-2.5 ${selected
                                                                                        ? "border-blue-200 bg-blue-50"
                                                                                        : "border-transparent bg-white"
                                                                                    } ${usedByOther ||
                                                                                        rejected
                                                                                        ? "opacity-40"
                                                                                        : "cursor-pointer"
                                                                                    }`}
                                                                            >
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={
                                                                                        selected
                                                                                    }
                                                                                    disabled={
                                                                                        popupBusy ||
                                                                                        usedByOther ||
                                                                                        rejected
                                                                                    }
                                                                                    onChange={() =>
                                                                                        toggleReplacementLicense(
                                                                                            row.rowId,
                                                                                            license
                                                                                        )
                                                                                    }
                                                                                    className="h-4 w-4 shrink-0 accent-blue-600"
                                                                                />
                                                                                <span className="min-w-0 flex-1 break-words text-xs text-black">
                                                                                    {license}
                                                                                </span>
                                                                                {usedByOther && (
                                                                                    <span className="text-[10px] text-slate-500">
                                                                                        เลือกแล้ว
                                                                                    </span>
                                                                                )}
                                                                                {rejected && (
                                                                                    <span className="text-[10px] text-rose-600">
                                                                                        ไม่อนุมัติ
                                                                                    </span>
                                                                                )}
                                                                            </label>
                                                                        );
                                                                    }
                                                                )}
                                                            </div>

                                                            {row.replacementLicenses.length > 0 && (
                                                                <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-black">
                                                                    อนุมัติรถ 1 คัน ทดแทนรถเดิม{" "}
                                                                    {row.replacementLicenses.length}{" "}
                                                                    ทะเบียน
                                                                </p>
                                                            )}

                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    popupBusy || !rowIsValid(row)
                                                                }
                                                                onClick={() =>
                                                                    void approveRequest(row)
                                                                }
                                                                className="h-11 w-full rounded-xl bg-blue-700 text-xs font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
                                                            >
                                                                {saving
                                                                    ? "กำลังบันทึก..."
                                                                    : "อนุมัติการจัดรถรายการนี้"}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {savedLicensesWithoutRow.map((item) => (
                                        <div
                                            key={licenseDecisionKey(item.license)}
                                            className="rounded-xl border border-slate-200 bg-emerald-50/50 p-3"
                                        >
                                            <p className="text-xs font-bold text-black">
                                                <span className="mr-1 text-emerald-600">✓</span>
                                                {item.license}
                                            </p>
                                            <p className="mt-1.5 break-words text-xs leading-relaxed text-black">
                                                {item.companyName || "-"} ·{" "}
                                                {item.truckType || "-"}
                                            </p>
                                        </div>
                                    ))}

                                    {!canMakeDecision &&
                                        approvedSuppliers.length === 0 &&
                                        savedLicensesWithoutRow.length === 0 && (
                                            <p className="rounded-xl bg-slate-50 px-3 py-5 text-center text-xs text-black">
                                                {data.approved_company_name ||
                                                    "ไม่มีรายการจัดรถที่อนุมัติ"}
                                            </p>
                                        )}
                                </div>
                            </section>

                            {(savedAttachments.length > 0 || savedAttachmentError) && (
                                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                    <div className="flex items-center gap-2.5 border-b border-slate-100 bg-blue-50/60 px-4 py-3.5">
                                        <svg
                                            aria-hidden="true"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth={1.8}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="h-5 w-5 shrink-0 text-blue-700"
                                        >
                                            <path d="m8 12 6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l8-8" />
                                            <path d="m6 14 8-8" />
                                        </svg>

                                        <h2 className="text-sm font-bold text-black">
                                            เอกสารแนบที่บันทึกแล้ว
                                        </h2>
                                    </div>

                                    <div className="space-y-2 p-3">
                                        {savedAttachmentError && (
                                            <p className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
                                                {savedAttachmentError}{" "}
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setAttachmentRefresh((value) => value + 1)
                                                    }
                                                    className="font-semibold underline"
                                                >
                                                    ลองใหม่
                                                </button>
                                            </p>
                                        )}

                                        {savedAttachments.map((item) => (
                                            <div
                                                key={`${item.approval_detail_id}-${item.attachment_id}`}
                                                className="rounded-xl border border-slate-200 bg-white p-3"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div
                                                        aria-hidden="true"
                                                        className="relative flex h-12 w-10 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-600"
                                                    >
                                                        <svg
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth={1.5}
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            className="h-7 w-7"
                                                        >
                                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                                                            <path d="M14 2v6h6" />
                                                        </svg>

                                                        <span className="absolute bottom-1 rounded bg-rose-600 px-1 text-[8px] font-bold leading-4 text-white">
                                                            PDF
                                                        </span>
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <p className="break-words text-xs font-bold leading-relaxed text-black">
                                                            {item.document_no}
                                                            <span className="ml-1 break-all font-normal text-slate-500">
                                                                ({item.file_name})
                                                            </span>
                                                        </p>

                                                        <p className="mt-2 break-words text-xs leading-relaxed text-black">
                                                            {item.company_name || "-"} ·{" "}
                                                            {item.truck_type || "-"} ·{" "}
                                                            {formatNumber(item.qty)} คัน
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                                                    <a
                                                        href={`${API_BASE}/fleet_attachments.php?action=file&id=${item.attachment_id}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                                                    >
                                                        <svg
                                                            aria-hidden="true"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth={1.8}
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            className="h-4 w-4"
                                                        >
                                                            <path d="M15 3h6v6M10 14 21 3" />
                                                            <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
                                                        </svg>
                                                        เปิด PDF
                                                    </a>

                                                    <a
                                                        href={`${API_BASE}/fleet_attachments.php?action=file&id=${item.attachment_id}&download=1`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-slate-50"
                                                    >
                                                        <svg
                                                            aria-hidden="true"
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth={1.8}
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            className="h-4 w-4"
                                                        >
                                                            <path d="M12 3v12m-5-5 5 5 5-5" />
                                                            <path d="M5 16v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4" />
                                                        </svg>
                                                        ดาวน์โหลด
                                                    </a>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* ผลการพิจารณาครั้งนี้ */}
                            {!isStandardReplacementType && canMakeDecision && (
                                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                    <div className="flex items-center gap-3 border-b border-slate-100 bg-blue-50/60 px-4 py-3.5">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-xs font-bold text-blue-700">
                                            03
                                        </span>
                                        <div>
                                            <h2 className="text-sm font-bold text-black">
                                                ผลการพิจารณาครั้งนี้
                                            </h2>
                                            <p className="mt-0.5 text-[11px] text-slate-500">
                                                ระบุยอดไม่อนุมัติและตรวจสอบก่อนบันทึก
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3.5 p-3">
                                        {balanceError && (
                                            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-relaxed text-black">
                                                {balanceError} — กรุณาปิดและเปิดคำขอใหม่
                                            </p>
                                        )}

                                        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <label
                                                    htmlFor={`batch-rejected-${data.id}`}
                                                    className="text-xs font-bold text-black"
                                                >
                                                    จำนวนไม่อนุมัติครั้งนี้
                                                </label>

                                                {batchRejectedQty > 0 && (
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            popupBusy || !allocationBalance
                                                        }
                                                        onClick={() => setBatchRejectedQty(0)}
                                                        className="rounded-lg px-2 py-1 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-40"
                                                    >
                                                        ล้าง
                                                    </button>
                                                )}
                                            </div>

                                            <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-white p-1.5 focus-within:border-rose-400 focus-within:ring-2 focus-within:ring-rose-100">
                                                <button
                                                    type="button"
                                                    aria-label="ลดจำนวนไม่อนุมัติ"
                                                    disabled={
                                                        popupBusy ||
                                                        !allocationBalance ||
                                                        batchRejectedQty <= 0
                                                    }
                                                    onClick={() =>
                                                        setBatchRejectedQty((value) =>
                                                            Math.max(0, value - 1)
                                                        )
                                                    }
                                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 text-xl text-rose-700 transition hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-30"
                                                >
                                                    −
                                                </button>

                                                <div className="flex min-w-0 flex-1 items-baseline justify-center gap-1">
                                                    <input
                                                        id={`batch-rejected-${data.id}`}
                                                        type="number"
                                                        min={0}
                                                        step={1}
                                                        max={Math.max(
                                                            gmApprovedQty -
                                                            savedApprovedQty -
                                                            savedRejectedQty -
                                                            totalDraftQty,
                                                            0
                                                        )}
                                                        value={batchRejectedQty}
                                                        disabled={
                                                            popupBusy || !allocationBalance
                                                        }
                                                        onFocus={(event) =>
                                                            event.currentTarget.select()
                                                        }
                                                        onChange={(event) =>
                                                            setBatchRejectedQty(
                                                                event.target.value === ""
                                                                    ? 0
                                                                    : Number(event.target.value)
                                                            )
                                                        }
                                                        className="h-10 w-full min-w-0 max-w-[100px] border-0 bg-transparent text-center text-2xl font-bold tabular-nums text-black outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:opacity-50"
                                                    />
                                                    <span className="text-xs text-slate-500">
                                                        คัน
                                                    </span>
                                                </div>

                                                <button
                                                    type="button"
                                                    aria-label="เพิ่มจำนวนไม่อนุมัติ"
                                                    disabled={
                                                        popupBusy ||
                                                        !allocationBalance ||
                                                        remainingAllocationQty <= 0
                                                    }
                                                    onClick={() =>
                                                        setBatchRejectedQty((value) =>
                                                            Math.min(
                                                                value + 1,
                                                                Math.max(
                                                                    gmApprovedQty -
                                                                    savedApprovedQty -
                                                                    savedRejectedQty -
                                                                    totalDraftQty,
                                                                    0
                                                                )
                                                            )
                                                        )
                                                    }
                                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-600 text-xl text-white transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-30"
                                                >
                                                    +
                                                </button>
                                            </div>

                                            <p className="mt-2 text-[11px] leading-relaxed text-black">
                                                ใส่ 0 หากยังไม่ปฏิเสธ
                                                ยอดที่เหลือเก็บไว้พิจารณารอบหน้า
                                            </p>
                                        </div>

                                        {notApprovedQty > 0 && (
                                            <label className="block">
                                                <span className="mb-1.5 block text-xs font-semibold text-black">
                                                    เหตุผลไม่อนุมัติ {notApprovedQty} คัน
                                                    <span className="ml-1 text-rose-600">*</span>
                                                </span>
                                                <textarea
                                                    rows={3}
                                                    value={rejectReason}
                                                    disabled={popupBusy}
                                                    onChange={(event) =>
                                                        setRejectReason(event.target.value)
                                                    }
                                                    placeholder="ระบุเหตุผลสำหรับจำนวนที่ไม่อนุมัติครั้งนี้"
                                                    className="w-full rounded-xl border border-rose-200 bg-rose-50/40 px-3 py-2.5 text-xs leading-relaxed text-black outline-none placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-50 disabled:opacity-60"
                                                />
                                            </label>
                                        )}

                                        <div className="overflow-hidden rounded-xl border border-slate-200">
                                            <div className="border-b border-slate-100 bg-slate-50 px-3 py-2">
                                                <p className="text-[11px] font-semibold text-black">
                                                    สรุปก่อนบันทึก
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-3 divide-x divide-slate-100">
                                                {[
                                                    {
                                                        label: "อนุมัติ",
                                                        value: totalDraftQty,
                                                        color: "bg-emerald-50/60",
                                                    },
                                                    {
                                                        label: "ไม่อนุมัติ",
                                                        value: notApprovedQty,
                                                        color: "bg-rose-50/60",
                                                    },
                                                    {
                                                        label: "รอรอบหน้า",
                                                        value: remainingAllocationQty,
                                                        color:
                                                            remainingAllocationQty < 0
                                                                ? "bg-rose-100"
                                                                : "bg-amber-50/60",
                                                    },
                                                ].map((item) => (
                                                    <div
                                                        key={item.label}
                                                        className={`px-1 py-3 text-center ${item.color}`}
                                                    >
                                                        <p className="text-[11px] text-black">
                                                            {item.label}
                                                        </p>
                                                        <p className="mt-1 text-xl font-bold tabular-nums text-black">
                                                            {loadingBalance
                                                                ? "..."
                                                                : formatNumber(item.value)}
                                                        </p>
                                                        <p className="mt-0.5 text-[10px] text-slate-500">
                                                            คัน
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {remainingAllocationQty < 0 && (
                                            <p className="text-xs font-medium text-rose-700">
                                                จำนวนอนุมัติและไม่อนุมัติรวมเกินยอด GM
                                            </p>
                                        )}

                                        <div className="space-y-2 border-t border-slate-100 pt-3">
                                            <button
                                                type="button"
                                                disabled={
                                                    popupBusy ||
                                                    !normalApprovalValid ||
                                                    (notApprovedQty > 0 &&
                                                        !rejectReason.trim())
                                                }
                                                onClick={() => setConfirmDecision("approve")}
                                                className="h-11 w-full rounded-xl bg-blue-700 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                {saving
                                                    ? "กำลังบันทึก..."
                                                    : "บันทึกผลการพิจารณาครั้งนี้"}
                                            </button>

                                            <button
                                                type="button"
                                                disabled={popupBusy}
                                                onClick={() => {
                                                    setApprovedSuppliers((current) =>
                                                        current.filter((row) =>
                                                            persistedIds.has(row.rowId)
                                                        )
                                                    );
                                                    setBatchRejectedQty(
                                                        Math.max(
                                                            gmApprovedQty -
                                                            savedApprovedQty -
                                                            savedRejectedQty,
                                                            0
                                                        )
                                                    );
                                                }}
                                                className="h-10 w-full rounded-xl border border-rose-200 bg-white text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-40"
                                            >
                                                เลือกไม่อนุมัติยอดที่เหลือ
                                            </button>
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* ไม่อนุมัติทะเบียนทดแทน */}
                            {isStandardReplacementType &&
                                canMakeDecision &&
                                replacementLicenseOptions.length > 0 && (
                                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                        <div className="border-b border-slate-100 bg-rose-50/70 px-4 py-3.5">
                                            <h3 className="text-sm font-bold text-black">
                                                ทะเบียนที่จะไม่อนุมัติ
                                            </h3>
                                            <p className="mt-1 text-[11px] text-slate-500">
                                                เลือกทะเบียนและระบุเหตุผลก่อนบันทึก
                                            </p>
                                        </div>

                                        <div className="space-y-3 p-3">
                                            <div className="max-h-60 space-y-2 overflow-y-auto">
                                                {replacementLicenseOptions.map((license) => {
                                                    const key = licenseDecisionKey(license);

                                                    const approved = approvedSuppliers.some(
                                                        (row) =>
                                                            row.replacementLicenses.some(
                                                                (value) =>
                                                                    licenseDecisionKey(value) ===
                                                                    key
                                                            )
                                                    );

                                                    const selected =
                                                        selectedRejectedLicenses.some(
                                                            (value) =>
                                                                licenseDecisionKey(value) === key
                                                        );

                                                    return (
                                                        <label
                                                            key={`reject-${license}`}
                                                            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 ${selected
                                                                    ? "border-rose-200 bg-rose-50"
                                                                    : "border-slate-200 bg-white"
                                                                } ${approved
                                                                    ? "opacity-40"
                                                                    : "cursor-pointer"
                                                                }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selected}
                                                                disabled={popupBusy || approved}
                                                                onChange={(event) => {
                                                                    const checked =
                                                                        event.target.checked;

                                                                    setSelectedRejectedLicenses(
                                                                        (current) =>
                                                                            checked
                                                                                ? [
                                                                                    ...current,
                                                                                    license,
                                                                                ]
                                                                                : current.filter(
                                                                                    (value) =>
                                                                                        licenseDecisionKey(
                                                                                            value
                                                                                        ) !==
                                                                                        key
                                                                                )
                                                                    );
                                                                }}
                                                                className="h-4 w-4 shrink-0 accent-rose-600"
                                                            />
                                                            <span className="min-w-0 flex-1 break-words text-xs text-black">
                                                                {license}
                                                            </span>
                                                        </label>
                                                    );
                                                })}
                                            </div>

                                            {selectedRejectedLicenses.length > 0 && (
                                                <label className="block">
                                                    <span className="mb-1.5 block text-xs font-semibold text-black">
                                                        เหตุผลไม่อนุมัติ
                                                        <span className="ml-1 text-rose-600">
                                                            *
                                                        </span>
                                                    </span>
                                                    <textarea
                                                        rows={3}
                                                        value={rejectReason}
                                                        disabled={popupBusy}
                                                        onChange={(event) =>
                                                            setRejectReason(event.target.value)
                                                        }
                                                        placeholder="ระบุเหตุผลสำหรับทะเบียนที่เลือก"
                                                        className="w-full rounded-xl border border-rose-200 bg-rose-50/40 px-3 py-2.5 text-xs leading-relaxed text-black outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-50"
                                                    />
                                                </label>
                                            )}

                                            <button
                                                type="button"
                                                disabled={
                                                    popupBusy ||
                                                    selectedRejectedLicenses.length === 0 ||
                                                    !rejectReason.trim()
                                                }
                                                onClick={() =>
                                                    void saveRejectedReplacementLicenses()
                                                }
                                                className="min-h-11 w-full rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                {saving
                                                    ? "กำลังบันทึก..."
                                                    : `บันทึกไม่อนุมัติ ${selectedRejectedLicenses.length} ทะเบียน`}
                                            </button>
                                        </div>
                                    </section>
                                )}

                            {/* ผลไม่อนุมัติที่บันทึกแล้ว */}
                            {rejectedSaved.length > 0 && (
                                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                    <div className="border-b border-slate-100 bg-slate-50 px-4 py-3.5">
                                        <h3 className="text-sm font-bold text-black">
                                            ทะเบียนที่ไม่อนุมัติแล้ว
                                        </h3>
                                    </div>
                                    <div className="space-y-2 p-3">
                                        {rejectedSaved.map((item) => (
                                            <div
                                                key={licenseDecisionKey(item.license)}
                                                className="rounded-xl border border-rose-100 bg-rose-50/60 p-3"
                                            >
                                                <p className="text-xs font-semibold text-black">
                                                    <span className="mr-1 text-rose-600">×</span>
                                                    {item.license}
                                                </p>
                                                {item.reason && (
                                                    <p className="mt-1.5 whitespace-pre-wrap break-words text-xs leading-relaxed text-black">
                                                        {item.reason}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {!canMakeDecision && data.reject_reason && (
                                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                    <div className="border-b border-slate-100 bg-rose-50/70 px-4 py-3">
                                        <h3 className="text-xs font-bold text-black">
                                            เหตุผลไม่อนุมัติ
                                        </h3>
                                    </div>
                                    <p className="whitespace-pre-wrap break-words p-4 text-xs leading-relaxed text-black">
                                        {data.reject_reason}
                                    </p>
                                </section>
                            )}

                            {!canMakeDecision && data.status_details && (
                                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                    <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                                        <h3 className="text-xs font-bold text-black">
                                            รายละเอียดสถานะ
                                        </h3>
                                    </div>
                                    <p className="whitespace-pre-wrap break-words p-4 text-xs leading-relaxed text-black">
                                        {data.status_details}
                                    </p>
                                </section>
                            )}
                        </div>
                    </aside>
                </div>
            </div>

            {message ? (
                <FleetPopup
                    key="notification"
                    label={message.type === "success" ? "บันทึกสำเร็จ" : "แจ้งเตือน"}
                    busy={popupBusy}
                    onDismiss={() => void dismissNotification()}
                >
                    <div className="p-6">
                        <div
                            className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${message.type === "success"
                                    ? "bg-emerald-50 text-emerald-600"
                                    : "bg-rose-50 text-rose-600"
                                }`}
                        >
                            {message.type === "success" ? "✓" : "!"}
                        </div>

                        <h2 className="text-lg font-semibold text-slate-900">
                            {message.type === "success" ? "บันทึกสำเร็จ" : "แจ้งเตือน"}
                        </h2>

                        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-600">
                            {message.text}
                        </p>

                        <button
                            type="button"
                            disabled={popupBusy}
                            onClick={() => void dismissNotification()}
                            className="mt-6 h-11 w-full rounded-xl bg-blue-600 text-sm font-medium text-white disabled:opacity-50"
                        >
                            ตกลง
                        </button>
                    </div>
                </FleetPopup>
            ) : confirmDecision ? (
                <FleetPopup
                    key="confirmation"
                    label={
                        confirmDecision === "approve"
                            ? "ยืนยันการจัดรถ"
                            : "ยืนยันไม่อนุมัติคำขอ"
                    }
                    busy={popupBusy}
                    onDismiss={() => setConfirmDecision(null)}
                >
                    <div className="p-6">
                        <h2 className="text-base font-semibold text-slate-900">
                            {confirmDecision === "approve"
                                ? "ยืนยันบันทึกผลการจัดรถ?"
                                : "ยืนยันไม่อนุมัติคำขอ?"}
                        </h2>

                        {confirmDecision === "approve" ? (
                            <div className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
                                อนุมัติครั้งนี้ {formatNumber(totalDraftQty)} คัน
                                <br />
                                ไม่อนุมัติ {formatNumber(notApprovedQty)} คัน
                                {!isStandardReplacementType && <><br />เหลือพิจารณารอบหน้า {formatNumber(remainingAllocationQty)} คัน</>}
                            </div>
                        ) : (
                            <label className="mt-4 block text-sm text-slate-700">
                                เหตุผลที่ไม่อนุมัติ
                                <textarea
                                    rows={3}
                                    value={rejectReason}
                                    disabled={popupBusy}
                                    onChange={(event) => setRejectReason(event.target.value)}
                                    className="mt-2 w-full rounded-xl border border-rose-200 px-3 py-2"
                                />
                            </label>
                        )}

                        <div className="mt-5 grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                disabled={popupBusy}
                                onClick={() => setConfirmDecision(null)}
                                className="h-10 rounded-xl border border-slate-200 text-sm text-slate-600 disabled:opacity-50"
                            >
                                ยกเลิก
                            </button>

                            <button
                                type="button"
                                disabled={
                                    popupBusy ||
                                    (
                                        confirmDecision === "reject_by_fbp"
                                            ? !rejectReason.trim()
                                            : !normalApprovalValid ||
                                            (notApprovedQty > 0 && !rejectReason.trim())
                                    )
                                }
                                onClick={() => {
                                    if (confirmDecision === "approve") {
                                        void approveRequest();
                                    } else {
                                        void rejectRequest();
                                    }
                                }}
                                className={`h-10 rounded-xl text-sm font-semibold text-white disabled:opacity-50 ${confirmDecision === "approve"
                                        ? "bg-blue-700"
                                        : "bg-rose-600"
                                    }`}
                            >
                                {saving ? "กำลังบันทึก..." : "ยืนยัน"}
                            </button>
                        </div>
                    </div>
                </FleetPopup>
            ) : null}
        </div>
    );
}
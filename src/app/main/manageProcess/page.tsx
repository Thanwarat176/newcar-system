"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import type { DragEvent } from "react";
import { createPortal } from "react-dom";
import {
    GripVertical,
    LoaderCircle,
    Pencil,
    Plus,
    RefreshCw,
    Trash2,
} from "lucide-react";

import ReorderFlowModal from "./ReorderFlowModal";
import CreateFlowModal from "./CreateFlowModal";
import DeleteFlowModal from "./DeleteFlowModal";
import EditFlowModal from "./EditFlowModal";

interface FlowItem {
    id?: number | string;
    flow_id?: number | string;
    type?: number | string;
    fleet_type?: string;
    process_level?: number | string;
    process?: string;
    detail?: string;
    sla?: number | string | null;
    sla_unit?: string | null;
    updated_at?: string;
    updated_by?: string;
}

interface ApiResponse {
    success?: boolean;
    status?: boolean | string;
    message?: string;
    data?: FlowItem[];
    result?: FlowItem[];
    rows?: FlowItem[];
}

interface ActionResponse {
    success?: boolean;
    status?: boolean | string;
    message?: string;
}

interface ReorderModalState {
    open: boolean;
    item: FlowItem | null;
    targetItem: FlowItem | null;
    replacementItem: FlowItem | null;
    fleetType: string;
    oldLevel: number;
    newLevel: number;
}

const API_BASE_URL =
    "http://192.168.158.210/api_new_truck/api";

const MODAL_LAYER = 2147483000;

function emptyReorderModal(): ReorderModalState {
    return {
        open: false,
        item: null,
        targetItem: null,
        replacementItem: null,
        fleetType: "",
        oldLevel: 0,
        newLevel: 0,
    };
}

function getFlowId(item: FlowItem) {
    return item.id ?? item.flow_id;
}

function getFleetType(item: FlowItem): string {
    return (
        String(item.fleet_type ?? "").trim() ||
        "ไม่ระบุประเภท"
    );
}

function getLevel(item: FlowItem): number {
    const level = Number(item.process_level);

    return Number.isInteger(level) && level > 0
        ? level
        : Number.MAX_SAFE_INTEGER;
}

function getRowKey(item: FlowItem): string {
    return String(
        getFlowId(item) ??
            `${getFleetType(item)}-${item.process_level}-${item.process}`
    );
}

function getCurrentUser(): string {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) return "System";

    try {
        const userData = JSON.parse(storedUser);

        if (!userData || typeof userData !== "object") {
            return "System";
        }

        const fullName = [
            userData.name,
            userData.surname,
        ]
            .filter(Boolean)
            .join(" ")
            .trim();

        const employeeId =
            userData.em_id ||
            userData.employee_id ||
            userData.username ||
            "";

        return employeeId
            ? `${fullName || "ไม่ระบุชื่อ"} (${employeeId})`
            : fullName || "System";
    } catch {
        return storedUser;
    }
}

function formatSla(item: FlowItem): string {
    if (
        item.sla === undefined ||
        item.sla === null ||
        String(item.sla).trim() === ""
    ) {
        return "";
    }

    const unitMap: Record<string, string> = {
        minute: "นาที",
        minutes: "นาที",
        min: "นาที",
        hour: "ชั่วโมง",
        hours: "ชั่วโมง",
        hr: "ชั่วโมง",
        day: "วัน",
        days: "วัน",
        week: "สัปดาห์",
        weeks: "สัปดาห์",
    };

    const rawUnit = String(item.sla_unit ?? "day")
        .trim()
        .toLowerCase();

    const displayUnit =
        unitMap[rawUnit] ||
        String(item.sla_unit ?? "วัน").trim();

    return `${item.sla} ${displayUnit}`;
}

function formatUpdatedAt(value?: string): string {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(date);
}

async function fetchFlowData(
    signal?: AbortSignal
): Promise<FlowItem[]> {
    const response = await fetch(
        `${API_BASE_URL}/flow_get.php`,
        {
            method: "GET",
            headers: {
                Accept: "application/json",
            },
            cache: "no-store",
            signal,
        }
    );

    if (!response.ok) {
        throw new Error(
            `ไม่สามารถโหลดข้อมูลได้ HTTP ${response.status}`
        );
    }

    const responseText = await response.text();

    if (!responseText.trim()) return [];

    let result: unknown;

    try {
        result = JSON.parse(responseText);
    } catch {
        throw new Error("ข้อมูลจาก API ไม่ใช่รูปแบบ JSON");
    }

    if (Array.isArray(result)) {
        return result as FlowItem[];
    }

    if (result && typeof result === "object") {
        const apiResult = result as ApiResponse;

        if (
            apiResult.success === false ||
            apiResult.status === false ||
            apiResult.status === "error"
        ) {
            throw new Error(
                apiResult.message || "โหลดข้อมูลไม่สำเร็จ"
            );
        }

        if (Array.isArray(apiResult.data)) {
            return apiResult.data;
        }

        if (Array.isArray(apiResult.result)) {
            return apiResult.result;
        }

        if (Array.isArray(apiResult.rows)) {
            return apiResult.rows;
        }
    }

    throw new Error("รูปแบบข้อมูลจาก API ไม่ถูกต้อง");
}

async function postAction(
    endpoint: string,
    payload: Record<string, unknown>
): Promise<ActionResponse> {
    const response = await fetch(
        `${API_BASE_URL}/${endpoint}`,
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

    let result: ActionResponse;

    try {
        const parsed: unknown = JSON.parse(responseText);

        if (
            !parsed ||
            typeof parsed !== "object" ||
            Array.isArray(parsed)
        ) {
            throw new Error();
        }

        result = parsed as ActionResponse;
    } catch {
        throw new Error(
            "API ส่งข้อมูลกลับมาไม่ใช่รูปแบบ JSON ที่ถูกต้อง"
        );
    }

    if (
        !response.ok ||
        result.success === false ||
        result.status === false ||
        result.status === "error"
    ) {
        throw new Error(
            result.message ||
                `ดำเนินการไม่สำเร็จ HTTP ${response.status}`
        );
    }

    return result;
}

export default function FleetFlowPage() {
    const [mounted, setMounted] = useState(false);
    const [flowData, setFlowData] = useState<FlowItem[]>([]);

    const [selectedFleetType, setSelectedFleetType] =
        useState("ทั้งหมด");

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const [createModalOpen, setCreateModalOpen] =
        useState(false);

    const [editModalOpen, setEditModalOpen] =
        useState(false);

    const [deleteModalOpen, setDeleteModalOpen] =
        useState(false);

    const [selectedDeleteItem, setSelectedDeleteItem] =
        useState<FlowItem | null>(null);

    const [deleteError, setDeleteError] = useState("");

    const [deletingId, setDeletingId] =
        useState<string | number | null>(null);

    const [draggedItem, setDraggedItem] =
        useState<FlowItem | null>(null);

    const [dragOverKey, setDragOverKey] =
        useState<string | null>(null);

    const [reorderModal, setReorderModal] =
        useState<ReorderModalState>(emptyReorderModal);

    const [reorderRemark, setReorderRemark] = useState("");
    const [reorderError, setReorderError] = useState("");
    const [reordering, setReordering] = useState(false);

    const refreshControllerRef =
        useRef<AbortController | null>(null);

    const refreshVersionRef = useRef(0);

    const mutationLocked =
        reordering || deletingId !== null;

    const anyModalOpen =
        createModalOpen ||
        editModalOpen ||
        deleteModalOpen ||
        reorderModal.open;

    useEffect(() => {
        setMounted(true);

        return () => {
            refreshControllerRef.current?.abort();
        };
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        const loadFlowData = async () => {
            try {
                setLoading(true);
                setError("");

                const rows = await fetchFlowData(
                    controller.signal
                );

                if (!controller.signal.aborted) {
                    setFlowData(rows);
                }
            } catch (err) {
                if (controller.signal.aborted) return;

                setError(
                    err instanceof Error
                        ? err.message
                        : "เกิดข้อผิดพลาดในการโหลดข้อมูล"
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        };

        void loadFlowData();

        return () => controller.abort();
    }, []);

    useEffect(() => {
        if (!anyModalOpen) return;

        const previousOverflow =
            document.body.style.overflow;

        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow =
                previousOverflow;
        };
    }, [anyModalOpen]);

    const refreshFlowData = useCallback(async () => {
        refreshControllerRef.current?.abort();

        const controller = new AbortController();
        refreshControllerRef.current = controller;

        const version = ++refreshVersionRef.current;

        try {
            setRefreshing(true);
            setError("");

            const rows = await fetchFlowData(
                controller.signal
            );

            if (
                !controller.signal.aborted &&
                version === refreshVersionRef.current
            ) {
                setFlowData(rows);
            }
        } catch (err) {
            if (controller.signal.aborted) return;

            const message =
                err instanceof Error
                    ? err.message
                    : "เกิดข้อผิดพลาดในการโหลดข้อมูล";

            setError(message);
            throw new Error(message);
        } finally {
            if (version === refreshVersionRef.current) {
                setRefreshing(false);
            }
        }
    }, []);

    const handleRefresh = () => {
        void refreshFlowData().catch(() => {
            // แสดงข้อผิดพลาดบนหน้าแล้ว
        });
    };

    const fleetTypes = useMemo(
        () =>
            Array.from(
                new Set(flowData.map(getFleetType))
            ).sort((a, b) => a.localeCompare(b, "th")),
        [flowData]
    );

    const fleetTypeCounts = useMemo(() => {
        const counts = new Map<string, number>();

        for (const flow of flowData) {
            const type = getFleetType(flow);
            counts.set(type, (counts.get(type) ?? 0) + 1);
        }

        return counts;
    }, [flowData]);

    useEffect(() => {
        if (
            selectedFleetType !== "ทั้งหมด" &&
            !fleetTypes.includes(selectedFleetType)
        ) {
            setSelectedFleetType("ทั้งหมด");
        }
    }, [fleetTypes, selectedFleetType]);

    const groupedFlow = useMemo(() => {
        const groups: Record<string, FlowItem[]> =
            Object.create(null);

        for (const item of flowData) {
            const fleetType = getFleetType(item);

            if (!groups[fleetType]) {
                groups[fleetType] = [];
            }

            groups[fleetType].push(item);
        }

        for (const fleetType of Object.keys(groups)) {
            groups[fleetType].sort(
                (a, b) => getLevel(a) - getLevel(b)
            );
        }

        if (selectedFleetType === "ทั้งหมด") {
            return groups;
        }

        if (!groups[selectedFleetType]) {
            return {};
        }

        return {
            [selectedFleetType]:
                groups[selectedFleetType],
        };
    }, [flowData, selectedFleetType]);

    const totalDisplayedProcesses = useMemo(
        () =>
            Object.values(groupedFlow).reduce(
                (total, items) => total + items.length,
                0
            ),
        [groupedFlow]
    );

    const handleEdit = () => {
        setEditModalOpen(true);
    };

    const closeEditModal = () => {
        setEditModalOpen(false);
    };

    const openDeleteModal = (item: FlowItem) => {
        if (mutationLocked) return;

        setSelectedDeleteItem(item);
        setDeleteError("");
        setDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        if (deletingId !== null) return;

        setDeleteModalOpen(false);
        setSelectedDeleteItem(null);
        setDeleteError("");
    };

    const handleDelete = async () => {
        if (!selectedDeleteItem || deletingId !== null) {
            return;
        }

        const flowId = getFlowId(selectedDeleteItem);
        const numericId = Number(flowId);

        if (
            flowId === undefined ||
            flowId === null ||
            flowId === "" ||
            !Number.isSafeInteger(numericId) ||
            numericId <= 0
        ) {
            setDeleteError("ไม่พบ ID ที่ถูกต้องของข้อมูล");
            return;
        }

        try {
            setDeletingId(flowId);
            setDeleteError("");

            await postAction("flow_delete.php", {
                id: numericId,
                user: getCurrentUser(),
            });

            setFlowData((current) =>
                current.filter(
                    (flow) =>
                        String(getFlowId(flow)) !==
                        String(flowId)
                )
            );

            setDeleteModalOpen(false);
            setSelectedDeleteItem(null);

            try {
                await refreshFlowData();
            } catch {
                // ลบสำเร็จแล้ว แสดงข้อผิดพลาดรีเฟรชบนหน้า
            }
        } catch (err) {
            setDeleteError(
                err instanceof Error
                    ? err.message
                    : "เกิดข้อผิดพลาดในการลบข้อมูล"
            );
        } finally {
            setDeletingId(null);
        }
    };

    const handleDragStart = (
        event: DragEvent<HTMLTableRowElement>,
        item: FlowItem
    ) => {
        if (mutationLocked || refreshing || anyModalOpen) {
            event.preventDefault();
            return;
        }

        setDraggedItem(item);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData(
            "text/plain",
            String(getFlowId(item) ?? "")
        );
    };

    const handleDragOver = (
        event: DragEvent<HTMLTableRowElement>,
        item: FlowItem
    ) => {
        if (
            !draggedItem ||
            mutationLocked ||
            getFleetType(draggedItem) !== getFleetType(item)
        ) {
            return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setDragOverKey(getRowKey(item));
    };

    const handleDragLeave = (
        event: DragEvent<HTMLTableRowElement>
    ) => {
        const relatedTarget = event.relatedTarget;

        if (
            relatedTarget instanceof Node &&
            event.currentTarget.contains(relatedTarget)
        ) {
            return;
        }

        setDragOverKey(null);
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
        setDragOverKey(null);
    };

    const handleDrop = (
        event: DragEvent<HTMLTableRowElement>,
        targetItem: FlowItem,
        fleetType: string
    ) => {
        event.preventDefault();

        const movedItem = draggedItem;

        setDraggedItem(null);
        setDragOverKey(null);

        if (!movedItem || mutationLocked) return;

        if (getFleetType(movedItem) !== fleetType) {
            window.alert(
                "ไม่สามารถย้ายกระบวนการข้ามประเภทรถได้"
            );
            return;
        }

        const movedId = getFlowId(movedItem);
        const targetId = getFlowId(targetItem);

        if (
            movedId === undefined ||
            targetId === undefined ||
            String(movedId) === String(targetId)
        ) {
            return;
        }

        const oldLevel = Number(movedItem.process_level);
        const newLevel = Number(targetItem.process_level);

        if (
            !Number.isInteger(oldLevel) ||
            !Number.isInteger(newLevel) ||
            oldLevel <= 0 ||
            newLevel <= 0
        ) {
            window.alert(
                "ไม่พบข้อมูล Process Level ที่ถูกต้อง"
            );
            return;
        }

        if (oldLevel === newLevel) return;

        const sameFleetProcesses = flowData
            .filter(
                (flow) => getFleetType(flow) === fleetType
            )
            .sort((a, b) => getLevel(a) - getLevel(b));

        const oldIndex = sameFleetProcesses.findIndex(
            (flow) =>
                String(getFlowId(flow)) === String(movedId)
        );

        if (oldIndex < 0) return;

        const adjacentIndex =
            oldLevel < newLevel
                ? oldIndex + 1
                : oldIndex - 1;

        setReorderRemark("");
        setReorderError("");

        setReorderModal({
            open: true,
            item: movedItem,
            targetItem,
            replacementItem:
                sameFleetProcesses[adjacentIndex] ?? null,
            fleetType,
            oldLevel,
            newLevel,
        });
    };

    const closeReorderModal = () => {
        if (reordering) return;

        setReorderModal(emptyReorderModal());
        setReorderRemark("");
        setReorderError("");
    };

    const affectedProcesses = useMemo(() => {
        if (!reorderModal.open || !reorderModal.item) {
            return [];
        }

        const { oldLevel, newLevel, fleetType } =
            reorderModal;

        const originalItems = flowData
            .filter(
                (flow) => getFleetType(flow) === fleetType
            )
            .sort((a, b) => getLevel(a) - getLevel(b));

        return originalItems
            .filter((item) => {
                const level = Number(item.process_level);

                return oldLevel < newLevel
                    ? level > oldLevel && level <= newLevel
                    : level >= newLevel && level < oldLevel;
            })
            .map((item) => {
                const index = originalItems.findIndex(
                    (flow) =>
                        String(getFlowId(flow)) ===
                        String(getFlowId(item))
                );

                const nextIndex =
                    oldLevel < newLevel
                        ? index - 1
                        : index + 1;

                return {
                    ...item,
                    oldLevel: Number(item.process_level),
                    newLevel: Number(
                        originalItems[nextIndex]?.process_level ??
                            item.process_level
                    ),
                };
            });
    }, [flowData, reorderModal]);

    const confirmReorder = async () => {
        const movedItem = reorderModal.item;
        const targetItem = reorderModal.targetItem;

        if (!movedItem || !targetItem || reordering) {
            return;
        }

        const movedId = getFlowId(movedItem);
        const targetId = getFlowId(targetItem);

        if (
            movedId === undefined ||
            movedId === null ||
            movedId === "" ||
            targetId === undefined ||
            targetId === null ||
            targetId === ""
        ) {
            setReorderError("ไม่พบ ID ของกระบวนการ");
            return;
        }

        try {
            setReordering(true);
            setReorderError("");

            const originalItems = flowData
                .filter(
                    (flow) =>
                        getFleetType(flow) ===
                        reorderModal.fleetType
                )
                .sort((a, b) => getLevel(a) - getLevel(b));

            const oldIndex = originalItems.findIndex(
                (flow) =>
                    String(getFlowId(flow)) ===
                    String(movedId)
            );

            const targetIndex = originalItems.findIndex(
                (flow) =>
                    String(getFlowId(flow)) ===
                    String(targetId)
            );

            if (oldIndex < 0 || targetIndex < 0) {
                throw new Error(
                    "ไม่พบกระบวนการที่ต้องการย้าย"
                );
            }

            const levels = originalItems.map((flow) =>
                Number(flow.process_level)
            );

            if (
                levels.some(
                    (level) =>
                        !Number.isInteger(level) || level <= 0
                ) ||
                new Set(levels).size !== levels.length
            ) {
                throw new Error(
                    "ระดับขั้นตอนไม่ถูกต้องหรือซ้ำ กรุณาตรวจสอบข้อมูลก่อนย้าย"
                );
            }

            const newItems = [...originalItems];
            const [selectedItem] = newItems.splice(
                oldIndex,
                1
            );

            newItems.splice(targetIndex, 0, selectedItem);

            const reorderedItems = newItems.map(
                (flow, index) => ({
                    ...flow,
                    process_level: levels[index],
                    detail:
                        String(getFlowId(flow)) ===
                            String(movedId) &&
                        reorderRemark.trim()
                            ? reorderRemark.trim()
                            : flow.detail || "",
                })
            );

            const changedItems = reorderedItems.filter(
                (flow) => {
                    const original = originalItems.find(
                        (oldFlow) =>
                            String(getFlowId(oldFlow)) ===
                            String(getFlowId(flow))
                    );

                    return (
                        original &&
                        Number(original.process_level) !==
                            Number(flow.process_level)
                    );
                }
            );

            if (!changedItems.length) {
                setReorderModal(emptyReorderModal());
                return;
            }

            const currentUser = getCurrentUser();

            for (const flow of changedItems) {
                const id = Number(getFlowId(flow));

                if (
                    !Number.isSafeInteger(id) ||
                    id <= 0
                ) {
                    throw new Error(
                        "พบ ID ของกระบวนการไม่ถูกต้อง"
                    );
                }

                await postAction("flow_save.php", {
                    mode: "edit",
                    original_id: id,
                    fleet_type: getFleetType(flow),
                    process: flow.process || "",
                    detail: flow.detail,
                    process_level: flow.process_level,
                    user: currentUser,
                });
            }

            setFlowData((current) => [
                ...current.filter(
                    (flow) =>
                        getFleetType(flow) !==
                        reorderModal.fleetType
                ),
                ...reorderedItems,
            ]);

            setReorderModal(emptyReorderModal());
            setReorderRemark("");

            try {
                await refreshFlowData();
            } catch {
                // แสดงข้อผิดพลาดรีเฟรชบนหน้า
            }
        } catch (err) {
            const message =
                err instanceof Error
                    ? err.message
                    : "บันทึกการจัดลำดับไม่สำเร็จ";

            setReorderError(
                `${message} อาจบันทึกสำเร็จบางรายการ กรุณาปิดหน้าต่างแล้วตรวจสอบข้อมูลล่าสุดก่อนลองใหม่`
            );
        } finally {
            setReordering(false);
        }
    };

    return (
        <main className="min-h-screen w-full min-w-0 max-w-full bg-slate-50 text-[11px] text-slate-800">
            <div className="mx-auto w-full min-w-0 max-w-[1600px] px-3 py-3 sm:px-4">
                <header className="flex min-w-0 flex-wrap items-center justify-between gap-3 pb-3">
                    <div className="min-w-0">
                        <h1 className="break-words text-base font-bold tracking-tight text-slate-900">
                            จัดการขั้นตอนการดำเนินงาน
                        </h1>

                        <p className="mt-1 text-[11px] leading-4 text-slate-500">
                            ดูข้อมูลแยกตามประเภทรถ
                            และแก้ไขหลายประเภทพร้อมกัน
                        </p>
                    </div>

                    <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
                        <button
                            type="button"
                            onClick={handleRefresh}
                            disabled={
                                loading ||
                                refreshing ||
                                mutationLocked
                            }
                            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                        >
                            <RefreshCw
                                className={`h-3.5 w-3.5 ${
                                    refreshing ? "animate-spin" : ""
                                }`}
                            />
                            {refreshing ? "กำลังโหลด..." : "รีเฟรช"}
                        </button>

                        <button
                            type="button"
                            onClick={handleEdit}
                            disabled={
                                loading ||
                                refreshing ||
                                mutationLocked ||
                                flowData.length === 0
                            }
                            className="inline-flex min-h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-left text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
                        >
                            <Pencil className="h-4 w-4 shrink-0" />

                            <span className="min-w-0">
                                <span className="block break-words text-xs font-semibold">
                                    แก้ไขหลายประเภท / หลายขั้นตอน
                                </span>

                                <span className="mt-0.5 block break-words text-[11px] text-blue-100">
                                    เลือกประเภทรถและระดับ
                                    แล้วบันทึกพร้อมกัน
                                </span>
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                setCreateModalOpen(true)
                            }
                            disabled={
                                loading ||
                                refreshing ||
                                mutationLocked
                            }
                            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-50"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            เพิ่มขั้นตอนใหม่
                        </button>
                    </div>
                </header>

                <div className="grid min-w-0 grid-cols-1 items-start gap-3 lg:grid-cols-[200px_minmax(0,1fr)]">
                    <aside className="min-w-0 rounded-lg border border-slate-200 bg-white lg:sticky lg:top-3">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
                            <h2 className="text-[11px] font-semibold text-slate-600">
                                กรองข้อมูลตามประเภทรถ
                            </h2>

                            <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold">
                                {fleetTypes.length}
                            </span>
                        </div>

                        <nav
                            aria-label="ตัวกรองประเภทรถ"
                            className="grid min-w-0 grid-cols-1 gap-1 p-1.5 sm:grid-cols-2 lg:grid-cols-1"
                        >
                            {["ทั้งหมด", ...fleetTypes].map(
                                (fleetType) => {
                                    const count =
                                        fleetType === "ทั้งหมด"
                                            ? flowData.length
                                            : fleetTypeCounts.get(
                                                  fleetType
                                              ) ?? 0;

                                    const active =
                                        selectedFleetType === fleetType;

                                    return (
                                        <button
                                            key={fleetType}
                                            type="button"
                                            aria-pressed={active}
                                            onClick={() =>
                                                setSelectedFleetType(fleetType)
                                            }
                                            className={`flex min-w-0 items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-[11px] leading-4 transition ${
                                                active
                                                    ? "bg-blue-50 font-semibold text-blue-700"
                                                    : "text-slate-600 hover:bg-slate-50"
                                            }`}
                                        >
                                            <span className="min-w-0 whitespace-normal [overflow-wrap:anywhere]">
                                                {fleetType}
                                            </span>

                                            <span
                                                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${
                                                    active
                                                        ? "bg-blue-100"
                                                        : "bg-slate-100 text-slate-500"
                                                }`}
                                            >
                                                {count}
                                            </span>
                                        </button>
                                    );
                                }
                            )}
                        </nav>

                        <p className="hidden border-t border-slate-100 px-3 py-2 text-[11px] leading-4 text-slate-400 lg:block">
                            ตัวกรองนี้ใช้ดูตาราง
                            เลือกประเภทที่จะบันทึกในหน้าต่างแก้ไข
                        </p>
                    </aside>

                    <div className="w-full min-w-0 max-w-full space-y-2.5">
                        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 px-1 text-[11px]">
                            <p className="min-w-0 text-slate-500 [overflow-wrap:anywhere]">
                                ประเภทที่แสดง{" "}
                                <span className="font-semibold text-slate-800">
                                    {selectedFleetType}
                                </span>

                                <span className="mx-2 text-slate-300">
                                    /
                                </span>

                                กระบวนการ{" "}
                                <span className="font-semibold text-blue-700">
                                    {totalDisplayedProcesses}
                                </span>
                            </p>

                            <p className="text-slate-400">
                                ลากแถวเพื่อเปลี่ยนลำดับภายในประเภทเดียวกัน
                            </p>
                        </div>

                        {loading && (
                            <div
                                role="status"
                                className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-12 text-xs text-slate-500"
                            >
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                                กำลังโหลดข้อมูล...
                            </div>
                        )}

                        {!loading && error && (
                            <div
                                role="alert"
                                className="rounded-lg border border-red-200 bg-red-50 p-4 text-xs text-red-700 [overflow-wrap:anywhere]"
                            >
                                <p className="font-semibold">
                                    ไม่สามารถโหลดข้อมูลล่าสุดได้
                                </p>

                                <p className="mt-1">{error}</p>

                                <button
                                    type="button"
                                    disabled={refreshing}
                                    onClick={handleRefresh}
                                    className="mt-2 rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold disabled:opacity-50"
                                >
                                    ลองใหม่
                                </button>
                            </div>
                        )}

                        {!loading &&
                            !error &&
                            Object.keys(groupedFlow).length === 0 && (
                                <div className="rounded-lg border border-slate-200 bg-white py-12 text-center">
                                    <h2 className="text-xs font-semibold">
                                        ไม่พบข้อมูลกระบวนการ
                                    </h2>

                                    <p className="mt-1 text-[11px] text-slate-500">
                                        กรุณาตรวจสอบข้อมูลจาก API
                                    </p>
                                </div>
                            )}

                        {!loading &&
                            Object.entries(groupedFlow)
                                .sort(([a], [b]) =>
                                    a.localeCompare(b, "th")
                                )
                                .map(([fleetType, processes]) => (
                                    <section
                                        key={fleetType}
                                        className="w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-slate-200 bg-white"
                                    >
                                        <div className="flex min-w-0 items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5">
                                            <div className="flex min-w-0 items-center gap-2">
                                                <span className="h-3.5 w-1 shrink-0 rounded-full bg-blue-600" />

                                                <h2 className="min-w-0 text-xs font-semibold text-slate-900 [overflow-wrap:anywhere]">
                                                    {fleetType}
                                                </h2>
                                            </div>

                                            <span className="shrink-0 text-[11px] text-slate-500">
                                                {processes.length} ขั้นตอน
                                            </span>
                                        </div>

                                        <div className="w-full min-w-0">
                                            <table className="w-full table-fixed border-collapse text-[11px]">
                                                <caption className="sr-only">
                                                    ขั้นตอนการดำเนินงานของ{" "}
                                                    {fleetType}
                                                </caption>

                                                <colgroup>
                                                    <col style={{ width: "5%" }} />
                                                    <col style={{ width: "6%" }} />
                                                    <col style={{ width: "26%" }} />
                                                    <col style={{ width: "32%" }} />
                                                    <col style={{ width: "24%" }} />
                                                    <col style={{ width: "7%" }} />
                                                </colgroup>

                                                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                                                    <tr>
                                                        <th
                                                            scope="col"
                                                            className="px-0.5 py-2 text-center font-medium [overflow-wrap:anywhere]"
                                                        >
                                                            ย้าย
                                                        </th>

                                                        <th
                                                            scope="col"
                                                            className="px-0.5 py-2 text-center font-medium [overflow-wrap:anywhere]"
                                                        >
                                                            ระดับ
                                                        </th>

                                                        <th
                                                            scope="col"
                                                            className="px-1 py-2 text-left font-medium [overflow-wrap:anywhere] sm:px-2"
                                                        >
                                                            ชื่อกระบวนการ
                                                        </th>

                                                        <th
                                                            scope="col"
                                                            className="px-1 py-2 text-left font-medium [overflow-wrap:anywhere] sm:px-2"
                                                        >
                                                            วิกฤต: จำเป็นต้องดำเนินการ
                                                            (SLA)
                                                        </th>

                                                        <th
                                                            scope="col"
                                                            className="px-1 py-2 text-left font-medium [overflow-wrap:anywhere] sm:px-2"
                                                        >
                                                            ปรับปรุงล่าสุด
                                                        </th>

                                                        <th
                                                            scope="col"
                                                            className="px-0.5 py-2 text-center font-medium [overflow-wrap:anywhere]"
                                                        >
                                                            ลบ
                                                        </th>
                                                    </tr>
                                                </thead>

                                                <tbody className="divide-y divide-slate-100 [&_td]:min-w-0 [&_td]:[overflow-wrap:anywhere] [&_p]:[overflow-wrap:anywhere]">
                                                    {processes.map(
                                                        (item, index) => {
                                                            const level =
                                                                getLevel(item);

                                                            const flowId =
                                                                getFlowId(item);

                                                            const rowKey =
                                                                getRowKey(item);

                                                            const isDragging =
                                                                draggedItem === item;

                                                            const isDragOver =
                                                                dragOverKey === rowKey;

                                                            const isDeleting =
                                                                deletingId !== null &&
                                                                String(deletingId) ===
                                                                    String(flowId);

                                                            const sla =
                                                                formatSla(item);

                                                            return (
                                                                <tr
                                                                    key={`${rowKey}-${index}`}
                                                                    draggable={
                                                                        !mutationLocked &&
                                                                        !refreshing &&
                                                                        !anyModalOpen
                                                                    }
                                                                    onDragStart={(event) =>
                                                                        handleDragStart(
                                                                            event,
                                                                            item
                                                                        )
                                                                    }
                                                                    onDragOver={(event) =>
                                                                        handleDragOver(
                                                                            event,
                                                                            item
                                                                        )
                                                                    }
                                                                    onDragLeave={
                                                                        handleDragLeave
                                                                    }
                                                                    onDragEnd={
                                                                        handleDragEnd
                                                                    }
                                                                    onDrop={(event) =>
                                                                        handleDrop(
                                                                            event,
                                                                            item,
                                                                            fleetType
                                                                        )
                                                                    }
                                                                    className={`transition ${
                                                                        isDragOver
                                                                            ? "bg-blue-50 ring-1 ring-inset ring-blue-400"
                                                                            : "hover:bg-slate-50"
                                                                    } ${
                                                                        isDragging
                                                                            ? "opacity-40"
                                                                            : ""
                                                                    }`}
                                                                >
                                                                    <td className="px-0.5 py-2 text-center align-top">
                                                                        <span
                                                                            title="ลากแถวเพื่อเปลี่ยนลำดับ"
                                                                            className="inline-flex h-6 w-full max-w-5 cursor-grab items-center justify-center text-slate-400 active:cursor-grabbing"
                                                                        >
                                                                            <GripVertical
                                                                                aria-hidden="true"
                                                                                className="h-3.5 w-3.5 max-w-full"
                                                                            />
                                                                        </span>
                                                                    </td>

                                                                    <td className="px-0.5 py-2 text-center align-top">
                                                                        <span className="inline-flex min-h-6 w-full max-w-6 items-center justify-center rounded bg-blue-50 text-[11px] font-semibold text-blue-700">
                                                                            {level ===
                                                                            Number.MAX_SAFE_INTEGER
                                                                                ? "-"
                                                                                : level}
                                                                        </span>
                                                                    </td>

                                                                    <td className="px-1 py-2 align-top sm:px-2">
                                                                        <p className="whitespace-pre-line text-xs font-medium leading-4 text-slate-900">
                                                                            {item.process ||
                                                                                "-"}
                                                                        </p>

                                                                        {sla && (
                                                                            <span className="mt-1 inline-block max-w-full rounded border border-amber-200 bg-amber-50 px-1 py-0.5 text-[10px] font-medium leading-4 text-amber-700 [overflow-wrap:anywhere]">
                                                                                SLA {sla}
                                                                            </span>
                                                                        )}
                                                                    </td>

                                                                    <td className="px-1 py-2 align-top sm:px-2">
                                                                        <p className="whitespace-pre-line leading-4 text-slate-600">
                                                                            {item.detail ||
                                                                                "-"}
                                                                        </p>
                                                                    </td>

                                                                    <td className="px-1 py-2 align-top sm:px-2">
                                                                        <p className="leading-4 text-slate-700">
                                                                            {formatUpdatedAt(
                                                                                item.updated_at
                                                                            )}
                                                                        </p>

                                                                        <p className="mt-0.5 leading-4 text-slate-400">
                                                                            {item.updated_by
                                                                                ? `โดย ${item.updated_by}`
                                                                                : "ไม่ระบุผู้แก้ไข"}
                                                                        </p>
                                                                    </td>

                                                                    <td className="px-0.5 py-2 align-top">
                                                                        <div className="flex min-w-0 justify-center">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    openDeleteModal(
                                                                                        item
                                                                                    )
                                                                                }
                                                                                disabled={
                                                                                    mutationLocked ||
                                                                                    refreshing
                                                                                }
                                                                                title="ลบรายการนี้"
                                                                                aria-label={`ลบ ${
                                                                                    item.process ||
                                                                                    "กระบวนการ"
                                                                                }`}
                                                                                className="inline-flex h-7 w-full max-w-7 min-w-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 disabled:opacity-50"
                                                                            >
                                                                                {isDeleting ? (
                                                                                    <LoaderCircle className="h-3.5 w-3.5 max-w-full animate-spin" />
                                                                                ) : (
                                                                                    <Trash2 className="h-3.5 w-3.5 max-w-full" />
                                                                                )}
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        }
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>
                                ))}
                    </div>
                </div>
            </div>

            {mounted &&
                createPortal(
                    <>
                        {createModalOpen && (
                            <div
                                className="fixed inset-0 isolate"
                                style={{ zIndex: MODAL_LAYER }}
                            >
                                <CreateFlowModal
                                    open={createModalOpen}
                                    flowData={flowData}
                                    fleetTypes={fleetTypes}
                                    onClose={() =>
                                        setCreateModalOpen(false)
                                    }
                                    onSuccess={refreshFlowData}
                                />
                            </div>
                        )}

                        {reorderModal.open && (
                            <div
                                className="fixed inset-0 isolate"
                                style={{ zIndex: MODAL_LAYER }}
                            >
                                <ReorderFlowModal
                                    modal={reorderModal}
                                    affectedProcesses={affectedProcesses}
                                    remark={reorderRemark}
                                    reordering={reordering}
                                    onRemarkChange={setReorderRemark}
                                    onClose={closeReorderModal}
                                    onConfirm={confirmReorder}
                                />

                                {reorderError && (
                                    <div
                                        role="alert"
                                        className="absolute inset-x-3 top-3 mx-auto max-w-2xl rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700 shadow-lg [overflow-wrap:anywhere]"
                                        style={{
                                            zIndex: MODAL_LAYER + 1,
                                        }}
                                    >
                                        {reorderError}
                                    </div>
                                )}
                            </div>
                        )}

                        {deleteModalOpen && (
                            <div
                                className="fixed inset-0 isolate"
                                style={{ zIndex: MODAL_LAYER }}
                            >
                                <DeleteFlowModal
                                    open={deleteModalOpen}
                                    item={selectedDeleteItem}
                                    deleting={deletingId !== null}
                                    error={deleteError}
                                    onClose={closeDeleteModal}
                                    onConfirm={handleDelete}
                                />
                            </div>
                        )}

                        <EditFlowModal
                            open={editModalOpen}
                            item={null}
                            flowData={flowData}
                            onClose={closeEditModal}
                            onSuccess={refreshFlowData}
                        />
                    </>,
                    document.body
                )}
        </main>
    );
}
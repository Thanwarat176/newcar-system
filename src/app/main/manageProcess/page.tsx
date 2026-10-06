"use client";

import {
    DragEvent,
    useEffect,
    useMemo,
    useState,
} from "react";
import ReorderFlowModal from "./ReorderFlowModal";
import { LoaderCircle, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import CreateFlowModal from "./CreateFlowModal";
import DeleteFlowModal from "./DeleteFlowModal";
import EditFlowModal from "./EditFlowModal";

interface FlowItem {
    id?: number | string;
    flow_id?: number | string;
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

interface ReorderModalState {
    open: boolean;
    item: FlowItem | null;
    targetItem: FlowItem | null;
    replacementItem: FlowItem | null;
    fleetType: string;
    oldLevel: number;
    newLevel: number;
}

export default function FleetFlowPage() {
    const [flowData, setFlowData] = useState<FlowItem[]>([]);

    const [selectedFleetType, setSelectedFleetType] =
        useState<string>("ทั้งหมด");

    const [loading, setLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [reorderRemark, setReorderRemark] = useState("");
    const [deleteModalOpen, setDeleteModalOpen] =
        useState(false);

    const [selectedDeleteItem, setSelectedDeleteItem] =
        useState<FlowItem | null>(null);

    const [deleteError, setDeleteError] =
        useState("");

    const [editModalOpen, setEditModalOpen] =
        useState(false);

    const [selectedEditItem, setSelectedEditItem] =
        useState<FlowItem | null>(null);

    const [draggedItem, setDraggedItem] =
        useState<FlowItem | null>(null);

    const [dragOverKey, setDragOverKey] =
        useState<string | number | null>(null);

    const [reorderModal, setReorderModal] =
        useState<ReorderModalState>({
            open: false,
            item: null,
            targetItem: null,
            replacementItem: null,
            fleetType: "",
            oldLevel: 0,
            newLevel: 0,
        });

    const [createModalOpen, setCreateModalOpen] =
        useState<boolean>(false);

    const [reordering, setReordering] =
        useState<boolean>(false);

    const [deletingId, setDeletingId] =
        useState<string | number | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        const loadFlowData = async () => {
            try {
                setLoading(true);
                setError("");

                const response = await fetch("http://192.168.158.210/api_new_truck/api/flow_get.php", {
                    method: "GET",
                    headers: {
                        Accept: "application/json",
                    },
                    cache: "no-store",
                    signal: controller.signal,
                });

                if (!response.ok) {
                    throw new Error(
                        `ไม่สามารถโหลดข้อมูลได้ HTTP ${response.status}`
                    );
                }

                const responseText = await response.text();

                if (!responseText.trim()) {
                    setFlowData([]);
                    return;
                }

                let result: unknown;

                try {
                    result = JSON.parse(responseText);
                } catch {
                    throw new Error("ข้อมูลจาก API ไม่ใช่รูปแบบ JSON");
                }

                let rows: FlowItem[] = [];

                if (Array.isArray(result)) {
                    rows = result as FlowItem[];
                } else if (
                    result &&
                    typeof result === "object"
                ) {
                    const apiResult = result as ApiResponse;

                    if (Array.isArray(apiResult.data)) {
                        rows = apiResult.data;
                    } else if (Array.isArray(apiResult.result)) {
                        rows = apiResult.result;
                    } else if (Array.isArray(apiResult.rows)) {
                        rows = apiResult.rows;
                    }
                }

                setFlowData(rows);
            } catch (err) {
                if (
                    err instanceof Error &&
                    err.name !== "AbortError"
                ) {
                    setError(err.message);
                } else if (!(err instanceof Error)) {
                    setError("เกิดข้อผิดพลาดในการโหลดข้อมูล");
                }
            } finally {
                setLoading(false);
            }
        };

        void loadFlowData();

        return () => {
            controller.abort();
        };
    }, []);

    const fleetTypes = useMemo(() => {
        const typeSet = new Set<string>();

        flowData.forEach((item) => {
            const fleetType =
                String(item.fleet_type ?? "").trim() ||
                "ไม่ระบุประเภท";

            typeSet.add(fleetType);
        });

        return Array.from(typeSet).sort((a, b) =>
            a.localeCompare(b, "th")
        );
    }, [flowData]);

    const groupedFlow = useMemo(() => {
        const groups: Record<string, FlowItem[]> = {};

        flowData.forEach((item) => {
            const fleetType =
                String(item.fleet_type ?? "").trim() ||
                "ไม่ระบุประเภท";

            if (!groups[fleetType]) {
                groups[fleetType] = [];
            }

            groups[fleetType].push(item);
        });

        Object.keys(groups).forEach((fleetType) => {
            groups[fleetType] = [
                ...groups[fleetType],
            ].sort((a, b) => {
                const levelA = Number(a.process_level);
                const levelB = Number(b.process_level);

                const validLevelA = Number.isFinite(levelA)
                    ? levelA
                    : 9999;

                const validLevelB = Number.isFinite(levelB)
                    ? levelB
                    : 9999;

                return validLevelA - validLevelB;
            });
        });

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

    const totalDisplayedProcesses = useMemo(() => {
        return Object.values(groupedFlow).reduce(
            (total, items) => total + items.length,
            0
        );
    }, [groupedFlow]);

    const refreshFlowData = async () => {
        try {
            setRefreshing(true);
            setError("");

            const response = await fetch("http://192.168.158.210/api_new_truck/api/flow_get.php", {
                method: "GET",
                headers: {
                    Accept: "application/json",
                },
                cache: "no-store",
            });

            if (!response.ok) {
                throw new Error(
                    `ไม่สามารถโหลดข้อมูลได้ HTTP ${response.status}`
                );
            }

            const responseText = await response.text();

            if (!responseText.trim()) {
                setFlowData([]);
                return;
            }

            let result: unknown;

            try {
                result = JSON.parse(responseText);
            } catch {
                throw new Error(
                    "ข้อมูลจาก API ไม่ใช่รูปแบบ JSON"
                );
            }

            let rows: FlowItem[] = [];

            if (Array.isArray(result)) {
                rows = result as FlowItem[];
            } else if (
                result &&
                typeof result === "object"
            ) {
                const apiResult = result as ApiResponse;

                if (Array.isArray(apiResult.data)) {
                    rows = apiResult.data;
                } else if (Array.isArray(apiResult.result)) {
                    rows = apiResult.result;
                } else if (Array.isArray(apiResult.rows)) {
                    rows = apiResult.rows;
                }
            }

            setFlowData(rows);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "เกิดข้อผิดพลาดในการโหลดข้อมูล"
            );
        } finally {
            setRefreshing(false);
        }
    };

    const handleEdit = (item: FlowItem) => {
        setSelectedEditItem(item);
        setEditModalOpen(true);
    };

    const closeEditModal = () => {
        setEditModalOpen(false);
        setSelectedEditItem(null);
    };

    const handleDelete = async () => {
        if (!selectedDeleteItem) {
            return;
        }

        const flowId =
            selectedDeleteItem.id ??
            selectedDeleteItem.flow_id;

        if (
            flowId === undefined ||
            flowId === null ||
            flowId === ""
        ) {
            setDeleteError("ไม่พบ ID ของข้อมูล");
            return;
        }

        try {
            setDeletingId(flowId);
            setDeleteError("");

            const storedUser =
                localStorage.getItem("user");

            let currentUser = "System";

            if (storedUser) {
                try {
                    const userData = JSON.parse(storedUser);

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

                    currentUser = employeeId
                        ? `${fullName || "ไม่ระบุชื่อ"} (${employeeId})`
                        : fullName || "System";
                } catch {
                    currentUser = storedUser;
                }
            }

            const payload = {
                id: Number(flowId),
                user: currentUser,
            };

            const response = await fetch(
                "http://192.168.158.210/api_new_truck/api/flow_delete.php",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );

            const responseText =
                await response.text();

            let result: {
                status?: boolean | string;
                success?: boolean;
                message?: string;
            } = {};

            if (responseText.trim()) {
                try {
                    result = JSON.parse(responseText);
                } catch {
                    throw new Error(
                        "API ส่งข้อมูลกลับมาไม่ใช่รูปแบบ JSON"
                    );
                }
            }

            const failed =
                !response.ok ||
                result.success === false ||
                result.status === false ||
                result.status === "error";

            if (failed) {
                throw new Error(
                    result.message || "ลบข้อมูลไม่สำเร็จ"
                );
            }

            setFlowData((currentData) =>
                currentData.filter(
                    (flow) =>
                        String(flow.id ?? flow.flow_id) !==
                        String(flowId)
                )
            );

            setDeleteModalOpen(false);
            setSelectedDeleteItem(null);
            setDeleteError("");

            await refreshFlowData();
        } catch (err) {
            console.error("Delete flow error:", err);

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
        setDraggedItem(item);

        event.dataTransfer.effectAllowed = "move";

        event.dataTransfer.setData(
            "text/plain",
            String(item.id ?? item.flow_id ?? "")
        );
    };

    const handleDragOver = (
        event: DragEvent<HTMLTableRowElement>,
        item: FlowItem
    ) => {
        event.preventDefault();

        event.dataTransfer.dropEffect = "move";

        const itemKey =
            item.id ??
            item.flow_id ??
            `${item.fleet_type}-${item.process_level}`;

        setDragOverKey(itemKey);
    };

    const handleDragLeave = (
        event: DragEvent<HTMLTableRowElement>
    ) => {
        const currentTarget = event.currentTarget;
        const relatedTarget =
            event.relatedTarget as Node | null;

        if (
            relatedTarget &&
            currentTarget.contains(relatedTarget)
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

        setDragOverKey(null);

        if (!draggedItem) {
            return;
        }

        const draggedFleetType =
            String(draggedItem.fleet_type ?? "").trim() ||
            "ไม่ระบุประเภท";

        if (draggedFleetType !== fleetType) {
            window.alert(
                "ไม่สามารถย้ายกระบวนการข้ามประเภทรถได้"
            );

            setDraggedItem(null);
            return;
        }

        const draggedId =
            draggedItem.id ?? draggedItem.flow_id;

        const targetId =
            targetItem.id ?? targetItem.flow_id;

        if (
            draggedId !== undefined &&
            targetId !== undefined &&
            draggedId === targetId
        ) {
            setDraggedItem(null);
            return;
        }

        const oldLevel = Number(
            draggedItem.process_level
        );

        const newLevel = Number(
            targetItem.process_level
        );

        if (
            !Number.isFinite(oldLevel) ||
            !Number.isFinite(newLevel)
        ) {
            window.alert(
                "ไม่พบข้อมูล Process Level ที่ถูกต้อง"
            );

            setDraggedItem(null);
            return;
        }

        if (oldLevel === newLevel) {
            setDraggedItem(null);
            return;
        }

        const sameFleetProcesses = flowData
            .filter((item) => {
                const itemFleetType =
                    String(item.fleet_type ?? "").trim() ||
                    "ไม่ระบุประเภท";

                return itemFleetType === fleetType;
            })
            .sort(
                (a, b) =>
                    Number(a.process_level) -
                    Number(b.process_level)
            );

        let replacementItem: FlowItem | null = null;

        if (oldLevel < newLevel) {
            replacementItem =
                sameFleetProcesses.find(
                    (item) =>
                        Number(item.process_level) ===
                        oldLevel + 1
                ) ?? null;
        }

        if (oldLevel > newLevel) {
            replacementItem =
                sameFleetProcesses.find(
                    (item) =>
                        Number(item.process_level) ===
                        oldLevel - 1
                ) ?? null;
        }

        setReorderModal({
            open: true,
            item: draggedItem,
            targetItem,
            replacementItem,
            fleetType,
            oldLevel,
            newLevel,
        });

        setDraggedItem(null);
    };

    const openDeleteModal = (item: FlowItem) => {
        setSelectedDeleteItem(item);
        setDeleteError("");
        setDeleteModalOpen(true);
    };

    const closeDeleteModal = () => {
        if (deletingId !== null) {
            return;
        }

        setDeleteModalOpen(false);
        setSelectedDeleteItem(null);
        setDeleteError("");
    };

    const getFlowId = (item: FlowItem) => item.id ?? item.flow_id;

    const getFleetType = (item: FlowItem) =>
        String(item.fleet_type ?? "").trim() || "ไม่ระบุประเภท";

    const closeReorderModal = () => {
        setReorderModal({
            open: false,
            item: null,
            targetItem: null,
            replacementItem: null,
            fleetType: "",
            oldLevel: 0,
            newLevel: 0,
        });
    };

    const confirmReorder = async () => {
        const movedItem = reorderModal.item;

        if (!movedItem) return;

        const movedId = getFlowId(movedItem);

        if (movedId === undefined || movedId === null || movedId === "") {
            window.alert("ไม่พบ ID ของกระบวนการที่ต้องการย้าย");
            return;
        }

        try {
            setReordering(true);

            // 1. เอาเฉพาะรายการใน fleet_type เดียวกัน
            const originalItems = flowData
                .filter(
                    (item) => getFleetType(item) === reorderModal.fleetType
                )
                .sort(
                    (a, b) =>
                        Number(a.process_level) - Number(b.process_level)
                );

            // 2. หาตำแหน่งเดิมของรายการที่กำลังย้าย
            const oldIndex = originalItems.findIndex(
                (item) => String(getFlowId(item)) === String(movedId)
            );

            if (oldIndex === -1) {
                throw new Error("ไม่พบกระบวนการที่ต้องการย้าย");
            }

            // 3. นำรายการออกจากตำแหน่งเดิม
            const newItems = [...originalItems];
            const [selectedItem] = newItems.splice(oldIndex, 1);

            // 4. แทรกเข้าไปยังตำแหน่งใหม่
            const newIndex = Math.max(
                0,
                Math.min(reorderModal.newLevel - 1, newItems.length)
            );

            newItems.splice(newIndex, 0, selectedItem);

            // 5. กำหนด process_level ใหม่
            const reorderedItems = newItems.map((item, index) => ({
                ...item,
                process_level: index + 1,
            }));

            // 6. เอาเฉพาะรายการที่ Level เปลี่ยน
            const changedItems = reorderedItems.filter((item) => {
                const originalItem = originalItems.find(
                    (oldItem) =>
                        String(getFlowId(oldItem)) === String(getFlowId(item))
                );

                return (
                    originalItem &&
                    Number(originalItem.process_level) !==
                    Number(item.process_level)
                );
            });

            if (changedItems.length === 0) {
                closeReorderModal();
                return;
            }

            const storedUser = localStorage.getItem("user");

            let currentUser = "System";

            if (storedUser) {
                try {
                    const userData = JSON.parse(storedUser);

                    const fullName = [
                        userData.name,
                        userData.surname,
                    ]
                        .filter(Boolean)
                        .join(" ");

                    const employeeId =
                        userData.em_id ||
                        userData.employee_id ||
                        userData.username ||
                        "";

                    currentUser = employeeId
                        ? `${fullName || "ไม่ระบุชื่อ"} (${employeeId})`
                        : fullName || "System";
                } catch {
                    currentUser = storedUser;
                }
            }

            // 7. บันทึกทีละรายการ
            for (const item of changedItems) {
                const itemId = getFlowId(item);

                if (itemId === undefined || itemId === null || itemId === "") {
                    throw new Error(
                        `ไม่พบ ID ของกระบวนการ "${item.process || "-"}"`
                    );
                }

                const payload = {
                    mode: "edit",
                    original_id: Number(itemId),
                    fleet_type: getFleetType(item),
                    process: item.process || "",
                    detail:
                        String(itemId) === String(movedId)
                            ? reorderRemark.trim()
                            : item.detail || "",
                    process_level: Number(item.process_level),
                    user: currentUser,
                };

                const response = await fetch(
                    "http://192.168.158.210/api_new_truck/api/flow_save.php",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Accept: "application/json",
                        },
                        body: JSON.stringify(payload),
                    }
                );

                const result = await response.json();

                if (
                    !response.ok ||
                    result.success === false ||
                    result.status === false ||
                    result.status === "error"
                ) {
                    throw new Error(
                        result.message ||
                        `บันทึกลำดับ "${item.process || "-"}" ไม่สำเร็จ`
                    );
                }
            }

            // 8. อัปเดตข้อมูลในหน้า
            setFlowData((currentData) => [
                ...currentData.filter(
                    (item) => getFleetType(item) !== reorderModal.fleetType
                ),
                ...reorderedItems,
            ]);

            closeReorderModal();

            await refreshFlowData();
        } catch (error) {
            console.error("Confirm reorder error:", error);
        } finally {
            setReordering(false);
        }
    };

    const formatSla = (item: FlowItem) => {
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
    };

    const affectedProcesses = useMemo(() => {
        if (!reorderModal.open || !reorderModal.item) {
            return [];
        }

        const oldLevel = reorderModal.oldLevel;
        const newLevel = reorderModal.newLevel;

        return flowData
            .filter((item) => {
                const fleetType =
                    String(item.fleet_type ?? "").trim() || "ไม่ระบุประเภท";

                const level = Number(item.process_level);

                if (fleetType !== reorderModal.fleetType) {
                    return false;
                }

                if (oldLevel < newLevel) {
                    return level > oldLevel && level <= newLevel;
                }

                return level >= newLevel && level < oldLevel;
            })
            .sort(
                (a, b) =>
                    Number(a.process_level) - Number(b.process_level)
            )
            .map((item) => {
                const currentLevel = Number(item.process_level);

                return {
                    ...item,
                    oldLevel: currentLevel,
                    newLevel:
                        oldLevel < newLevel
                            ? currentLevel - 1
                            : currentLevel + 1,
                };
            });
    }, [
        flowData,
        reorderModal.open,
        reorderModal.item,
        reorderModal.fleetType,
        reorderModal.oldLevel,
        reorderModal.newLevel,
    ]);

    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
            <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
                {/* Header */}
                <section className="mb-6 overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-lg shadow-blue-100/50">
                    <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-teal-500 px-6 py-7 text-white sm:px-8">
                        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

                        <div className="absolute -bottom-24 left-20 h-56 w-56 rounded-full bg-teal-200/20 blur-3xl" />

                        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <div className="mb-3 flex items-center gap-3">
                                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/15 shadow-sm backdrop-blur-sm">
                                        <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            className="h-5 w-5"
                                            stroke="currentColor"
                                            strokeWidth="1.8"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                d="M5 6h14M5 12h14M5 18h14"
                                            />

                                            <circle
                                                cx="3"
                                                cy="6"
                                                r="1"
                                                fill="currentColor"
                                            />

                                            <circle
                                                cx="3"
                                                cy="12"
                                                r="1"
                                                fill="currentColor"
                                            />

                                            <circle
                                                cx="3"
                                                cy="18"
                                                r="1"
                                                fill="currentColor"
                                            />
                                        </svg>
                                    </span>

                                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                                        จัดการขั้นตอนการดำเนินงาน
                                    </h1>
                                </div>



                                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50/90">
                                    แสดงกระบวนการแยกตามประเภทรถ
                                    เรียงลำดับตาม Process Level
                                    และสามารถลากเพื่อเปลี่ยนลำดับได้
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setCreateModalOpen(true)}
                                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-white/20"
                                >
                                    <Plus className="h-4 w-4" />
                                    เพิ่มขั้นตอนใหม่
                                </button>

                                <button
                                    type="button"
                                    onClick={() => void refreshFlowData()}
                                    disabled={refreshing}
                                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/15 px-4 text-sm font-semibold text-white shadow-sm backdrop-blur-sm transition hover:bg-white/25 focus:outline-none focus:ring-4 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <RefreshCw
                                        className={`h-4 w-4 ${refreshing ? "animate-spin" : ""
                                            }`}
                                    />

                                    {refreshing
                                        ? "กำลังโหลด..."
                                        : "รีเฟรชข้อมูล"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-1 divide-y divide-blue-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                        <div className="px-6 py-5">
                            <p className="text-xs font-medium text-slate-500">
                                ประเภทรถทั้งหมด
                            </p>

                            <p className="mt-1 text-2xl font-bold text-slate-900">
                                {fleetTypes.length}
                            </p>
                        </div>

                        <div className="px-6 py-5">
                            <p className="text-xs font-medium text-slate-500">
                                กระบวนการที่แสดง
                            </p>

                            <p className="mt-1 text-2xl font-bold text-slate-900">
                                {totalDisplayedProcesses}
                            </p>
                        </div>

                        <div className="px-6 py-5">
                            <p className="text-xs font-medium text-slate-500">
                                ประเภทที่เลือก
                            </p>

                            <p className="mt-1 truncate text-lg font-bold text-slate-900">
                                {selectedFleetType}
                            </p>
                        </div>
                    </div>
                </section>

                {/* Filter */}
                <section className="mb-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm shadow-blue-100/40">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <div className="flex items-center gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-teal-500 text-white shadow-md shadow-blue-200/60">
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        className="h-5 w-5"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M4 6h16M7 12h10M10 18h4"
                                        />
                                    </svg>
                                </span>

                                <div>
                                    <h2 className="text-sm font-semibold text-slate-900">
                                        ตัวกรองประเภทรถ
                                    </h2>

                                    <p className="mt-1 text-xs text-slate-500">
                                        เลือกดูขั้นตอนของประเภทรถที่ต้องการ
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="w-full sm:w-80">
                            <label
                                htmlFor="fleet-type"
                                className="mb-2 block text-xs font-medium text-slate-600"
                            >
                                ประเภทรถ
                            </label>

                            <select
                                id="fleet-type"
                                value={selectedFleetType}
                                onChange={(event) =>
                                    setSelectedFleetType(
                                        event.target.value
                                    )
                                }
                                className="h-11 w-full rounded-xl border border-blue-200 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                            >
                                <option value="ทั้งหมด">
                                    ทั้งหมด
                                </option>

                                {fleetTypes.map(
                                    (fleetType) => (
                                        <option
                                            key={fleetType}
                                            value={fleetType}
                                        >
                                            {fleetType}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                    </div>
                </section>

                {/* Loading */}
                {loading && (
                    <section className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
                        <div className="h-20 animate-pulse bg-gradient-to-r from-blue-100 to-teal-100" />

                        <div className="space-y-3 p-6">
                            {[1, 2, 3, 4].map(
                                (item) => (
                                    <div
                                        key={item}
                                        className="h-20 animate-pulse rounded-2xl bg-slate-100"
                                    />
                                )
                            )}
                        </div>
                    </section>
                )}

                {/* Error */}
                {!loading && error && (
                    <section className="rounded-3xl border border-red-200 bg-white px-6 py-12 text-center shadow-sm">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                className="h-7 w-7"
                                stroke="currentColor"
                                strokeWidth="1.8"
                            >
                                <circle
                                    cx="12"
                                    cy="12"
                                    r="9"
                                />

                                <path
                                    strokeLinecap="round"
                                    d="M12 7v6"
                                />

                                <circle
                                    cx="12"
                                    cy="17"
                                    r="0.8"
                                    fill="currentColor"
                                />
                            </svg>
                        </div>

                        <h2 className="mt-4 text-lg font-bold text-slate-900">
                            ไม่สามารถโหลดข้อมูลได้
                        </h2>

                        <p className="mt-2 text-sm text-red-600">
                            {error}
                        </p>

                        <button
                            type="button"
                            onClick={() =>
                                void refreshFlowData()
                            }
                            className="mt-5 rounded-xl bg-gradient-to-br from-blue-600 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200/60 transition hover:from-blue-700 hover:to-teal-600"
                        >
                            ลองใหม่
                        </button>
                    </section>
                )}

                {/* Empty */}
                {!loading &&
                    !error &&
                    Object.keys(groupedFlow).length ===
                    0 && (
                        <section className="rounded-3xl border border-blue-100 bg-white px-6 py-14 text-center shadow-sm">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-teal-100 text-blue-600">
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    className="h-7 w-7"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M4 6h16v12H4V6Z"
                                    />

                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M8 10h8M8 14h5"
                                    />
                                </svg>
                            </div>

                            <h2 className="mt-4 text-lg font-bold text-slate-900">
                                ไม่พบข้อมูลกระบวนการ
                            </h2>

                            <p className="mt-2 text-sm text-slate-500">
                                กรุณาตรวจสอบข้อมูลจาก API
                            </p>
                        </section>
                    )}

                {/* Tables */}
                {!loading &&
                    !error &&
                    Object.entries(groupedFlow)
                        .sort(
                            (
                                [fleetTypeA],
                                [fleetTypeB]
                            ) =>
                                fleetTypeA.localeCompare(
                                    fleetTypeB,
                                    "th"
                                )
                        )
                        .map(
                            ([fleetType, processes]) => (
                                <section
                                    key={fleetType}
                                    className="mb-6 overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-lg shadow-blue-100/40"
                                >
                                    {/* Fleet header */}
                                    <div className="flex flex-col gap-3 border-b border-blue-100 bg-gradient-to-r from-blue-50 via-white to-teal-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-teal-500 text-white shadow-md shadow-blue-200/60">
                                                <svg
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    className="h-5 w-5"
                                                    stroke="currentColor"
                                                    strokeWidth="1.8"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M3 6h11v10H3V6Zm11 4h3l3 3v3h-6v-6Z"
                                                    />

                                                    <circle
                                                        cx="7"
                                                        cy="18"
                                                        r="2"
                                                    />

                                                    <circle
                                                        cx="17"
                                                        cy="18"
                                                        r="2"
                                                    />
                                                </svg>
                                            </div>

                                            <div>
                                                <p className="text-xs font-medium text-slate-500">
                                                    ประเภทรถ
                                                </p>

                                                <h2 className="text-lg font-bold text-slate-900">
                                                    {fleetType}
                                                </h2>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700">
                                                ลากแถวเพื่อเปลี่ยนลำดับ
                                            </span>

                                            <span className="rounded-full bg-gradient-to-r from-blue-600 to-teal-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">
                                                {processes.length} ขั้นตอน
                                            </span>
                                        </div>
                                    </div>

                                    {/* Desktop table */}
                                    <div className="hidden overflow-x-auto lg:block">
                                        <table className="w-full min-w-[1200px] border-collapse">
                                            <thead>
                                                <tr className="border-b border-blue-100 bg-gradient-to-r from-blue-50/80 to-teal-50/80">
                                                    <th className="w-[70px] px-3 py-4 text-center">
                                                        <p className="text-xs font-semibold text-slate-700">
                                                            ย้าย
                                                        </p>

                                                        <p className="mt-0.5 text-[10px] font-normal text-slate-400">
                                                            Drag
                                                        </p>
                                                    </th>

                                                    <th className="w-[180px] px-6 py-4 text-left">
                                                        <p className="text-xs font-semibold text-slate-700">
                                                            ขั้นตอนระดับที่
                                                        </p>

                                                        <p className="mt-0.5 text-[10px] font-normal text-slate-400">
                                                            Level
                                                        </p>
                                                    </th>

                                                    <th className="w-[260px] px-6 py-4 text-left">
                                                        <p className="text-xs font-semibold text-slate-700">
                                                            ชื่อกระบวนการ
                                                        </p>

                                                        <p className="mt-0.5 text-[10px] font-normal text-slate-400">
                                                            Process Name
                                                        </p>
                                                    </th>

                                                    <th className="px-6 py-4 text-left">
                                                        <p className="text-xs font-semibold text-slate-700">
                                                        วิกฤต: จำเป็นต้องดำเนินการ (SLA)
                                                        </p>

                                                        <p className="mt-0.5 text-[10px] font-normal text-slate-400">
                                                        Action Required
                                                        </p>
                                                    </th>

                                                    <th className="w-[240px] px-6 py-4 text-left">
                                                        <p className="text-xs font-semibold text-slate-700">
                                                            ปรับปรุงล่าสุด
                                                        </p>

                                                        <p className="mt-0.5 text-[10px] font-normal text-slate-400">
                                                            Last Updated
                                                        </p>
                                                    </th>

                                                    <th className="w-[130px] px-6 py-4 text-center">
                                                        <p className="text-xs font-semibold text-slate-700">
                                                            การจัดการ
                                                        </p>

                                                        <p className="mt-0.5 text-[10px] font-normal text-slate-400">
                                                            Actions
                                                        </p>
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody className="divide-y divide-blue-50">
                                                {processes.map(
                                                    (item, index) => {
                                                        const rawLevel =
                                                            Number(
                                                                item.process_level
                                                            );

                                                        const level =
                                                            Number.isFinite(
                                                                rawLevel
                                                            )
                                                                ? rawLevel
                                                                : index + 1;

                                                        let updatedAt =
                                                            "-";

                                                        if (
                                                            item.updated_at
                                                        ) {
                                                            const date =
                                                                new Date(
                                                                    item.updated_at
                                                                );

                                                            if (
                                                                !Number.isNaN(
                                                                    date.getTime()
                                                                )
                                                            ) {
                                                                updatedAt =
                                                                    new Intl.DateTimeFormat(
                                                                        "th-TH",
                                                                        {
                                                                            year: "numeric",
                                                                            month: "short",
                                                                            day: "numeric",
                                                                            hour: "2-digit",
                                                                            minute:
                                                                                "2-digit",
                                                                        }
                                                                    ).format(date);
                                                            } else {
                                                                updatedAt =
                                                                    item.updated_at;
                                                            }
                                                        }

                                                        const itemKey =
                                                            item.id ??
                                                            item.flow_id ??
                                                            `${fleetType}-${item.process_level}-${index}`;

                                                        const isDragging =
                                                            (draggedItem?.id ??
                                                                draggedItem?.flow_id) ===
                                                            (item.id ??
                                                                item.flow_id);

                                                        const isDragOver =
                                                            dragOverKey ===
                                                            itemKey;

                                                        const flowId =
                                                            item.id ??
                                                            item.flow_id;

                                                        return (
                                                            <tr
                                                                key={itemKey}
                                                                draggable
                                                                onDragStart={(
                                                                    event
                                                                ) =>
                                                                    handleDragStart(
                                                                        event,
                                                                        item
                                                                    )
                                                                }
                                                                onDragOver={(
                                                                    event
                                                                ) =>
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
                                                                onDrop={(
                                                                    event
                                                                ) =>
                                                                    handleDrop(
                                                                        event,
                                                                        item,
                                                                        fleetType
                                                                    )
                                                                }
                                                                className={`group cursor-move transition ${isDragOver
                                                                    ? "border-t-2 border-teal-500 bg-gradient-to-r from-blue-50 to-teal-50"
                                                                    : "hover:bg-gradient-to-r hover:from-blue-50/70 hover:to-teal-50/70"
                                                                    } ${isDragging
                                                                        ? "opacity-40"
                                                                        : ""
                                                                    }`}
                                                            >
                                                                <td className="px-3 py-5 text-center align-top">
                                                                    <button
                                                                        type="button"
                                                                        title="ลากเพื่อเปลี่ยนลำดับ"
                                                                        aria-label="ลากเพื่อเปลี่ยนลำดับ"
                                                                        className="inline-flex h-9 w-9 cursor-grab items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-600 active:cursor-grabbing"
                                                                    >
                                                                        <svg
                                                                            viewBox="0 0 24 24"
                                                                            fill="currentColor"
                                                                            className="h-5 w-5"
                                                                        >
                                                                            <circle
                                                                                cx="8"
                                                                                cy="6"
                                                                                r="1.5"
                                                                            />

                                                                            <circle
                                                                                cx="16"
                                                                                cy="6"
                                                                                r="1.5"
                                                                            />

                                                                            <circle
                                                                                cx="8"
                                                                                cy="12"
                                                                                r="1.5"
                                                                            />

                                                                            <circle
                                                                                cx="16"
                                                                                cy="12"
                                                                                r="1.5"
                                                                            />

                                                                            <circle
                                                                                cx="8"
                                                                                cy="18"
                                                                                r="1.5"
                                                                            />

                                                                            <circle
                                                                                cx="16"
                                                                                cy="18"
                                                                                r="1.5"
                                                                            />
                                                                        </svg>
                                                                    </button>
                                                                </td>

                                                                <td className="px-6 py-5 align-top">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-teal-500 text-sm font-bold text-white shadow-md shadow-blue-200/60">
                                                                            {level}
                                                                        </span>

                                                                        <div>
                                                                            <p className="text-sm font-semibold text-slate-800">
                                                                                Level{" "}
                                                                                {level}
                                                                            </p>

                                                                            <p className="mt-0.5 text-xs text-slate-400">
                                                                                ลำดับขั้นตอน
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </td>

                                                                <td className="px-6 py-5 align-top">
                                                                    <p className="break-words text-sm font-semibold leading-6 text-slate-900">
                                                                        {item.process ||
                                                                            "-"}
                                                                    </p>

                                                                    {formatSla(item) && (
                                                                        <div className="mt-2">
                                                                            <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                                                                SLA {formatSla(item)}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </td>

                                                                <td className="px-6 py-5 align-top">
                                                                    <p className="whitespace-pre-line break-words text-sm leading-6 text-slate-600">
                                                                        {item.detail ||
                                                                            "-"}
                                                                    </p>
                                                                </td>

                                                                <td className="px-6 py-5 align-top">
                                                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                                                        <svg
                                                                            viewBox="0 0 24 24"
                                                                            fill="none"
                                                                            className="h-4 w-4 shrink-0 text-blue-500"
                                                                            stroke="currentColor"
                                                                            strokeWidth="1.8"
                                                                        >
                                                                            <path
                                                                                strokeLinecap="round"
                                                                                strokeLinejoin="round"
                                                                                d="M5 4v3M19 4v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12H4V7a1 1 0 0 1 1-1Z"
                                                                            />
                                                                        </svg>

                                                                        <span>
                                                                            {updatedAt}
                                                                        </span>
                                                                    </div>

                                                                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                                                                        <svg
                                                                            viewBox="0 0 24 24"
                                                                            fill="none"
                                                                            className="h-4 w-4 shrink-0 text-teal-500"
                                                                            stroke="currentColor"
                                                                            strokeWidth="1.8"
                                                                        >
                                                                            <circle
                                                                                cx="12"
                                                                                cy="8"
                                                                                r="4"
                                                                            />

                                                                            <path
                                                                                strokeLinecap="round"
                                                                                strokeLinejoin="round"
                                                                                d="M5 20a7 7 0 0 1 14 0"
                                                                            />
                                                                        </svg>

                                                                        <span>
                                                                            {item.updated_by
                                                                                ? `โดย ${item.updated_by}`
                                                                                : "ไม่ระบุผู้แก้ไข"}
                                                                        </span>
                                                                    </div>
                                                                </td>

                                                                <td className="px-6 py-5 align-top">
                                                                    <div className="flex items-center justify-center gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleEdit(item)}
                                                                            title="แก้ไขข้อมูล"
                                                                            aria-label={`แก้ไข ${item.process || "กระบวนการ"}`}
                                                                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-teal-50 text-blue-600 transition hover:border-teal-300 hover:from-blue-100 hover:to-teal-100 focus:outline-none focus:ring-4 focus:ring-teal-100"
                                                                        >
                                                                            <Pencil className="h-4 w-4" />
                                                                        </button>

                                                                        <button
                                                                            type="button"
                                                                            onClick={() => openDeleteModal(item)}
                                                                            disabled={deletingId === flowId}
                                                                            title="ลบข้อมูล"
                                                                            aria-label={`ลบ ${item.process || "กระบวนการ"}`}
                                                                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:border-red-300 hover:bg-red-100 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                                        >
                                                                            {deletingId === flowId ? (
                                                                                <LoaderCircle className="h-4 w-4 animate-spin" />
                                                                            ) : (
                                                                                <Trash2 className="h-4 w-4" />
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

                                    {/* Mobile */}
                                    <div className="divide-y divide-blue-50 lg:hidden">
                                        {processes.map(
                                            (item, index) => {
                                                const rawLevel =
                                                    Number(
                                                        item.process_level
                                                    );

                                                const level =
                                                    Number.isFinite(
                                                        rawLevel
                                                    )
                                                        ? rawLevel
                                                        : index + 1;

                                                let updatedAt = "-";

                                                if (item.updated_at) {
                                                    const date =
                                                        new Date(
                                                            item.updated_at
                                                        );

                                                    if (
                                                        !Number.isNaN(
                                                            date.getTime()
                                                        )
                                                    ) {
                                                        updatedAt =
                                                            new Intl.DateTimeFormat(
                                                                "th-TH",
                                                                {
                                                                    year: "numeric",
                                                                    month: "short",
                                                                    day: "numeric",
                                                                    hour: "2-digit",
                                                                    minute:
                                                                        "2-digit",
                                                                }
                                                            ).format(date);
                                                    } else {
                                                        updatedAt =
                                                            item.updated_at;
                                                    }
                                                }

                                                const itemKey =
                                                    item.id ??
                                                    item.flow_id ??
                                                    `${fleetType}-${item.process_level}-${index}`;

                                                const flowId =
                                                    item.id ??
                                                    item.flow_id;

                                                return (
                                                    <article
                                                        key={itemKey}
                                                        className="p-5"
                                                    >
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="flex min-w-0 items-center gap-3">
                                                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-teal-500 text-sm font-bold text-white shadow-md shadow-blue-200/60">
                                                                    {level}
                                                                </span>

                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-medium text-slate-400">
                                                                        Process
                                                                        Level{" "}
                                                                        {level}
                                                                    </p>

                                                                    <h3 className="mt-1 break-words text-sm font-semibold text-slate-900">
                                                                        {item.process ||
                                                                            "-"}
                                                                    </h3>

                                                                    {formatSla(item) && (
                                                                        <span className="mt-2 inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                                                            SLA {formatSla(item)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex shrink-0 gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleEdit(
                                                                            item
                                                                        )
                                                                    }
                                                                    title="แก้ไขข้อมูล"
                                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-teal-50 text-blue-600"
                                                                >
                                                                    <svg
                                                                        viewBox="0 0 24 24"
                                                                        fill="none"
                                                                        className="h-4 w-4"
                                                                        stroke="currentColor"
                                                                        strokeWidth="1.8"
                                                                    >
                                                                        <path
                                                                            strokeLinecap="round"
                                                                            strokeLinejoin="round"
                                                                            d="M13.5 6.5 17.5 10.5M4 20l4.5-1 10-10a2.83 2.83 0 0 0-4-4l-10 10L4 20Z"
                                                                        />
                                                                    </svg>
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => openDeleteModal(item)}
                                                                    disabled={deletingId === flowId}
                                                                    title="ลบข้อมูล"
                                                                    aria-label={`ลบ ${item.process || "กระบวนการ"}`}
                                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                                >
                                                                    {deletingId === flowId ? (
                                                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                                                    ) : (
                                                                        <Trash2 className="h-4 w-4" />
                                                                    )}
                                                                </button>
                                                            </div>
                                                        </div>

                                                        <div className="mt-4 rounded-xl bg-gradient-to-br from-blue-50 to-teal-50 p-4">
                                                            <p className="text-xs font-semibold text-slate-500">
                                                                รายละเอียดกระบวนการ
                                                            </p>

                                                            <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-slate-700">
                                                                {item.detail ||
                                                                    "-"}
                                                            </p>
                                                        </div>

                                                        <div className="mt-4 space-y-2 text-xs text-slate-500">
                                                            <div className="flex items-center gap-2">
                                                                <svg
                                                                    viewBox="0 0 24 24"
                                                                    fill="none"
                                                                    className="h-4 w-4 shrink-0 text-blue-500"
                                                                    stroke="currentColor"
                                                                    strokeWidth="1.8"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        d="M5 4v3M19 4v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12H4V7a1 1 0 0 1 1-1Z"
                                                                    />
                                                                </svg>

                                                                <span>
                                                                    {updatedAt}
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center gap-2">
                                                                <svg
                                                                    viewBox="0 0 24 24"
                                                                    fill="none"
                                                                    className="h-4 w-4 shrink-0 text-teal-500"
                                                                    stroke="currentColor"
                                                                    strokeWidth="1.8"
                                                                >
                                                                    <circle
                                                                        cx="12"
                                                                        cy="8"
                                                                        r="4"
                                                                    />

                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        d="M5 20a7 7 0 0 1 14 0"
                                                                    />
                                                                </svg>

                                                                <span>
                                                                    {item.updated_by
                                                                        ? `โดย ${item.updated_by}`
                                                                        : "ไม่ระบุผู้แก้ไข"}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="mt-4 rounded-xl border border-blue-100 bg-white p-3 text-xs text-slate-500">
                                                            การลากเปลี่ยนลำดับรองรับบนหน้าจอคอมพิวเตอร์
                                                        </div>
                                                    </article>
                                                );
                                            }
                                        )}
                                    </div>
                                </section>
                            )
                        )}
            </div>

            <CreateFlowModal
                open={createModalOpen}
                flowData={flowData}
                fleetTypes={fleetTypes}
                onClose={() => setCreateModalOpen(false)}
                onSuccess={async () => {
                    await refreshFlowData();
                }}
            />

            <ReorderFlowModal
                modal={reorderModal}
                affectedProcesses={affectedProcesses}
                remark={reorderRemark}
                reordering={reordering}
                onRemarkChange={setReorderRemark}
                onClose={closeReorderModal}
                onConfirm={confirmReorder}
            />

            <DeleteFlowModal
                open={deleteModalOpen}
                item={selectedDeleteItem}
                deleting={deletingId !== null}
                error={deleteError}
                onClose={closeDeleteModal}
                onConfirm={handleDelete}
            />

            <EditFlowModal
                open={editModalOpen}
                item={selectedEditItem}
                fleetTypes={fleetTypes}
                onClose={closeEditModal}
                onSuccess={async () => {
                    await refreshFlowData();
                }}
            />

        </main>
    );
}
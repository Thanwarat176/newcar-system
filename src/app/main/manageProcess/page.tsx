"use client";

import {
    DragEvent,
    useEffect,
    useMemo,
    useState,
} from "react";
import ReorderFlowModal from "./ReorderFlowModal";
import { GripVertical, LoaderCircle, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
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
        <main className="min-h-screen bg-slate-50 text-slate-800">
            <div className="mx-auto max-w-[1600px] px-3 py-4 sm:px-6">
                <header className="flex flex-wrap items-center justify-between gap-3 pb-4">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-slate-900">จัดการขั้นตอนการดำเนินงาน</h1>
                        <p className="mt-1 text-xs text-slate-500">แสดงกระบวนการแยกตามประเภทรถ · เรียงลำดับตาม Process Level</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => void refreshFlowData()} disabled={refreshing} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium hover:bg-slate-100 disabled:opacity-50">
                            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                            {refreshing ? "กำลังโหลด..." : "รีเฟรชข้อมูล"}
                        </button>
                        <button type="button" onClick={() => setCreateModalOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700">
                            <Plus className="h-4 w-4" />เพิ่มขั้นตอนใหม่
                        </button>
                    </div>
                </header>
                <div className="grid items-start gap-4 lg:grid-cols-[210px_minmax(0,1fr)]">
                    <aside className="rounded-xl border border-slate-200 bg-white lg:sticky lg:top-4">
                        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                            <h2 className="text-xs font-semibold text-slate-600">ประเภทรถทั้งหมด</h2>
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold">{fleetTypes.length}</span>
                        </div>
                        <nav aria-label="ตัวกรองประเภทรถ" className="flex gap-1 overflow-x-auto p-2 lg:flex-col">
                            {["ทั้งหมด", ...fleetTypes].map((fleetType) => {
                                const count = fleetType === "ทั้งหมด" ? flowData.length : flowData.filter(item => getFleetType(item) === fleetType).length;
                                const active = selectedFleetType === fleetType;
                                return (
                                    <button key={fleetType} type="button" aria-pressed={active} onClick={() => setSelectedFleetType(fleetType)} className={`flex shrink-0 items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-xs transition lg:w-full ${active ? "bg-blue-50 font-semibold text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}>
                                        <span className="whitespace-nowrap lg:whitespace-normal lg:break-words">{fleetType}</span>
                                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${active ? "bg-blue-100" : "bg-slate-100 text-slate-500"}`}>{count}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </aside>
                    <div className="min-w-0 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
                            <p className="text-slate-500">ประเภทที่เลือก <span className="font-semibold text-slate-800">{selectedFleetType}</span> <span className="mx-2 text-slate-300">/</span>กระบวนการที่แสดง <span className="font-semibold text-blue-700">{totalDisplayedProcesses}</span></p>
                            <p className="text-slate-400">ลากแถวเพื่อเปลี่ยนลำดับภายในประเภทรถเดียวกัน</p>
                        </div>
                        {loading && <div role="status" className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-16 text-sm text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin" />กำลังโหลดข้อมูล...</div>}
                        {!loading && error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"><p className="font-semibold">ไม่สามารถโหลดข้อมูลได้</p><p className="mt-1">{error}</p><button type="button" onClick={() => void refreshFlowData()} className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-semibold">ลองใหม่</button></div>}
                        {!loading && !error && Object.keys(groupedFlow).length === 0 && <div className="rounded-xl border border-slate-200 bg-white py-16 text-center"><h2 className="text-sm font-semibold">ไม่พบข้อมูลกระบวนการ</h2><p className="mt-1 text-xs text-slate-500">กรุณาตรวจสอบข้อมูลจาก API</p></div>}
                        {!loading && !error && Object.entries(groupedFlow).sort(([a], [b]) => a.localeCompare(b, "th")).map(([fleetType, processes]) => (
                            <section key={fleetType} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                                    <div className="flex items-center gap-2"><span className="h-4 w-1 rounded-full bg-blue-600" /><h2 className="text-sm font-semibold text-slate-900">{fleetType}</h2></div>
                                    <span className="text-xs text-slate-500">{processes.length} ขั้นตอน</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[850px] table-fixed border-collapse text-xs">
                                        <caption className="sr-only">ขั้นตอนการดำเนินงานของ {fleetType}</caption>
                                        <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                                            <tr>
                                                <th scope="col" className="w-10 px-2 py-2.5 text-center">ย้าย</th>
                                                <th scope="col" className="w-14 px-2 py-2.5 text-center" title="ขั้นตอนระดับที่ (Process Level)">ระดับ</th>
                                                <th scope="col" className="w-[24%] px-3 py-2.5 text-left">ชื่อกระบวนการ</th>
                                                <th scope="col" className="px-3 py-2.5 text-left">วิกฤต: จำเป็นต้องดำเนินการ (SLA)</th>
                                                <th scope="col" className="w-[185px] px-3 py-2.5 text-left">ปรับปรุงล่าสุด</th>
                                                <th scope="col" className="w-[90px] px-2 py-2.5 text-center">การจัดการ</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {processes.map((item, index) => {
                                                const rawLevel = Number(item.process_level);
                                                const level = Number.isFinite(rawLevel) ? rawLevel : index + 1;
                                                const itemKey = item.id ?? item.flow_id ?? `${fleetType}-${item.process_level}-${index}`;
                                                const flowId = getFlowId(item);
                                                const isDragging = draggedItem === item;
                                                const isDragOver = dragOverKey === itemKey;
                                                const date = item.updated_at ? new Date(item.updated_at) : null;
                                                const updatedAt = date && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat("th-TH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date) : item.updated_at || "-";
                                                return (
                                                    <tr key={itemKey} draggable={!reordering} onDragStart={event => handleDragStart(event, item)} onDragOver={event => handleDragOver(event, item)} onDragLeave={handleDragLeave} onDragEnd={handleDragEnd} onDrop={event => handleDrop(event, item, fleetType)} className={`transition ${isDragOver ? "bg-blue-50 ring-1 ring-inset ring-blue-400" : "hover:bg-slate-50"} ${isDragging ? "opacity-40" : ""}`}>
                                                        <td className="px-2 py-3 text-center align-top"><span title="ลากแถวเพื่อเปลี่ยนลำดับ" className="inline-flex h-7 w-6 cursor-grab items-center justify-center text-slate-400 active:cursor-grabbing"><GripVertical aria-hidden="true" className="h-4 w-4" /></span></td>
                                                        <td className="px-2 py-3 text-center align-top"><span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-blue-50 px-1 font-semibold text-blue-700">{level}</span></td>
                                                        <td className="px-3 py-3 align-top"><p className="whitespace-pre-line break-words text-sm font-medium leading-5 text-slate-900">{item.process || "-"}</p>{formatSla(item) && <span className="mt-1.5 inline-flex rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">SLA {formatSla(item)}</span>}</td>
                                                        <td className="px-3 py-3 align-top"><p className="whitespace-pre-line break-words leading-5 text-slate-600">{item.detail || "-"}</p></td>
                                                        <td className="px-3 py-3 align-top"><p className="leading-5 text-slate-700">{updatedAt}</p><p className="mt-0.5 break-words leading-5 text-slate-400">{item.updated_by ? `โดย ${item.updated_by}` : "ไม่ระบุผู้แก้ไข"}</p></td>
                                                        <td className="px-2 py-3 align-top"><div className="flex justify-center gap-1">
                                                            <button type="button" onClick={() => handleEdit(item)} title="แก้ไขข้อมูล" aria-label={`แก้ไข ${item.process || "กระบวนการ"}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-blue-50 hover:text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"><Pencil className="h-3.5 w-3.5" /></button>
                                                            <button type="button" onClick={() => openDeleteModal(item)} disabled={deletingId === flowId} title="ลบข้อมูล" aria-label={`ลบ ${item.process || "กระบวนการ"}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 disabled:opacity-50">{deletingId === flowId ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}</button>
                                                        </div></td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        ))}
                        <p className="px-1 text-[11px] text-slate-400 lg:hidden">เลื่อนตารางแนวนอนเพื่อดูข้อมูลทั้งหมด · การลากเปลี่ยนลำดับรองรับบนคอมพิวเตอร์</p>
                    </div>
                </div>
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
"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { DateRange, RangeKeyDict } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { th } from "date-fns/locale";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  Eraser,
  Eye,
  Filter,
  Inbox,
  PencilLine,
  Search,
  SlidersHorizontal,
  Truck,
  Warehouse,
  X,
} from "lucide-react";
import GMModalDetail from "./GMModalDetail";

interface SelectedDC {
  DC_CODE?: string;
  DC_NAME?: string;
  DC_TYPE?: string;
}

interface RequestItem {
  id: number | null;
  running_doc: string;
  dc_type: string;
  dc_code: string;
  date: string;
  request_date?: string;
  created_at?: string;
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
}

interface UserInfo {
  warehouse?: string;
  WAREHOUSE?: string;
  team?: string;
  TEAM?: string;
}

type StatusFilter = "all" | "reject_by_gm" | "gm_pending" | "fbp_pending";

type ActionStatus = "fbp_pending" | "reject_by_gm";

type SortKey = "request_date" | "running_doc" | "usage_date";
type SortDirection = "asc" | "desc";

export default function GmStatusPage() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [selectedDC, setSelectedDC] = useState<SelectedDC | null>(null);

  const [gmModalItem, setGmModalItem] =
    useState<RequestItem | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [openRows, setOpenRows] = useState<Record<string, boolean>>({});
  const [updatingRows, setUpdatingRows] = useState<Record<string, boolean>>({});
  const [updateMessage, setUpdateMessage] = useState<
    Record<string, { type: "success" | "error"; text: string }>
  >({});

  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: SortDirection;
  }>({
    key: "request_date",
    direction: "asc",
  });

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [searchText, setSearchText] = useState("");
  const [dcTypeFilter, setDcTypeFilter] = useState("all");
  const [dcFilter, setDcFilter] = useState("all");

  const [requestDateRange, setRequestDateRange] = useState([
    {
      startDate: new Date(),
      endDate: new Date(),
      key: "selection",
    },
  ]);

  const [confirmAction, setConfirmAction] = useState<{
    rowKey: string;
    item: RequestItem;
    status: ActionStatus;
    title: string;
    description: string;
  } | null>(null);

  const [hasRequestDateRange, setHasRequestDateRange] = useState(false);
  const [showRequestDatePicker, setShowRequestDatePicker] = useState(false);

  const requestDateButtonRef = useRef<HTMLButtonElement | null>(null);
  const requestDatePickerRef = useRef<HTMLDivElement | null>(null);

  const [requestDatePickerPosition, setRequestDatePickerPosition] = useState({
    top: 0,
    left: 0,
  });

  useEffect(() => {
    const loadSelectedDC = () => {
      const savedSelectedDC = localStorage.getItem("selected_dc");

      if (!savedSelectedDC) {
        setSelectedDC(null);
        return;
      }

      try {
        const parsedDC = JSON.parse(savedSelectedDC);
        setSelectedDC(parsedDC);
      } catch (error) {
        console.error("อ่าน selected_dc ไม่ได้:", error);
        localStorage.removeItem("selected_dc");
        setSelectedDC(null);
      }
    };

    loadSelectedDC();

    window.addEventListener("selectedDCChanged", loadSelectedDC);

    return () => {
      window.removeEventListener("selectedDCChanged", loadSelectedDC);
    };
  }, []);

  useEffect(() => {
    const savedUser =
      localStorage.getItem("user_info") ||
      localStorage.getItem("user") ||
      localStorage.getItem("userInfo");

    if (!savedUser) {
      setUserInfo(null);
      return;
    }

    try {
      setUserInfo(JSON.parse(savedUser));
    } catch (error) {
      console.error("อ่าน user info ไม่ได้:", error);
      setUserInfo(null);
    }
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(
        "http://192.168.158.210/api_new_truck/api/request_get.php",
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }
      );

      if (!res.ok) throw new Error("ไม่สามารถดึงข้อมูลได้");

      const data = await res.json();

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.data)
          ? data.data
          : Array.isArray(data.result)
            ? data.result
            : [];

      setRequests(list);
    } catch (err) {
      console.error(err);
      setError("เกิดข้อผิดพลาดในการดึงข้อมูลจาก API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    if (!showRequestDatePicker) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      const clickedButton = requestDateButtonRef.current?.contains(target);
      const clickedPicker = requestDatePickerRef.current?.contains(target);

      if (!clickedButton && !clickedPicker) {
        setShowRequestDatePicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showRequestDatePicker]);

  const handleStatusUpdate = async (
    rowKey: string,
    id: number | null,
    newStatus: ActionStatus
  ) => {
    if (!id) {
      setUpdateMessage((prev) => ({
        ...prev,
        [rowKey]: {
          type: "error",
          text: "ไม่พบ ID ของรายการนี้",
        },
      }));
      return;
    }

    setUpdatingRows((prev) => ({ ...prev, [rowKey]: true }));

    setUpdateMessage((prev) => ({
      ...prev,
      [rowKey]: { type: "success", text: "" },
    }));

    try {
      const savedUser =
        localStorage.getItem("user_info") ||
        localStorage.getItem("user") ||
        localStorage.getItem("userInfo");

      let updateBy = "";

      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          updateBy =
            parsedUser?.em_id ||
            parsedUser?.employee_id ||
            parsedUser?.id ||
            parsedUser?.name ||
            "";
        } catch {
          updateBy = "";
        }
      }

      const payload = {
        id: Number(id),
        status: newStatus,
        updated_by: updateBy,
        approved_by: updateBy,
      };

      console.log("ส่งข้อมูลไป API:", payload);

      const res = await fetch(
        "http://192.168.158.210/api_new_truck/api/request_save.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const text = await res.text();

      console.log("API status:", res.status);
      console.log("API raw response:", text);

      let data: any = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        throw new Error(`API ไม่ได้ส่ง JSON กลับมา: ${text}`);
      }

      if (!res.ok) {
        throw new Error(data?.message || `HTTP Error ${res.status}`);
      }

      if (data?.status === "error" || data?.success === false) {
        throw new Error(data?.message || "API แจ้งว่าอัปเดตไม่สำเร็จ");
      }

      setRequests((prev) =>
        prev.map((item) =>
          Number(item.id) === Number(id)
            ? {
              ...item,
              status: newStatus,
            }
            : item
        )
      );

      setUpdateMessage((prev) => ({
        ...prev,
        [rowKey]: {
          type: "success",
          text:
            newStatus === "fbp_pending"
              ? "GM อนุมัติคำขอเรียบร้อยแล้ว"
              : "GM ไม่อนุมัติคำขอเรียบร้อยแล้ว",
        },
      }));

      setConfirmAction(null);

      setTimeout(() => {
        setUpdateMessage((prev) => ({
          ...prev,
          [rowKey]: { type: "success", text: "" },
        }));
      }, 2500);
    } catch (err: any) {
      console.error("Update error:", err);

      setUpdateMessage((prev) => ({
        ...prev,
        [rowKey]: {
          type: "error",
          text: err?.message || "อัปเดตไม่สำเร็จ กรุณาลองใหม่",
        },
      }));
    } finally {
      setUpdatingRows((prev) => ({ ...prev, [rowKey]: false }));
    }
  };

  const normalizeDateKey = (value?: string) => {
    if (!value) return "ไม่ระบุวันที่";

    const raw = String(value).trim();

    if (!raw) return "ไม่ระบุวันที่";

    const dateOnly = raw.includes("T")
      ? raw.split("T")[0]
      : raw.split(" ")[0];

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
    if (!value || value === "ไม่ระบุวันที่") return "ไม่ระบุวันที่";

    const dateKey = normalizeDateKey(value);

    if (dateKey === "ไม่ระบุวันที่") return "ไม่ระบุวันที่";

    const [year, month, day] = dateKey.split("-");

    if (!year || !month || !day) return value;

    return `${day}/${month}/${year}`;
  };

  const formatDateToKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const getRequestDateKey = (item: RequestItem) => {
    const rawDate = item.request_date || item.date || item.created_at || "";

    let dateKey = normalizeDateKey(rawDate);

    if (dateKey === "ไม่ระบุวันที่") return dateKey;

    const [year, month, day] = dateKey.split("-");

    if (!year || !month || !day) return dateKey;

    let fixedYear = Number(year);

    if (fixedYear > 2400) {
      fixedYear = fixedYear - 543;
    }

    return `${fixedYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  };

  const formatThaiDateRange = () => {
    if (!hasRequestDateRange) return "เลือกช่วงวันที่ขอ";

    const startDate = requestDateRange[0].startDate;
    const endDate = requestDateRange[0].endDate;

    if (!startDate || !endDate) return "เลือกช่วงวันที่ขอ";

    return `${formatThaiDate(formatDateToKey(startDate))} - ${formatThaiDate(
      formatDateToKey(endDate)
    )}`;
  };

  const getTodayDateKey = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const isTodayRequest = (value?: string) => {
    return normalizeDateKey(value) === getTodayDateKey();
  };

  const formatNumber = (value?: number | string | null) => {
    if (value === null || value === undefined || value === "") return "-";

    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) return String(value);

    return numberValue.toLocaleString("en-US");
  };

  const normalizeStatus = (status?: string) => {
    const value = String(status || "").trim().toLowerCase();

    if (value === "reject_by_gm") {
      return "reject_by_gm";
    }

    if (value === "gm_pending") {
      return "gm_pending";
    }

    if (value === "fbp_pending") {
      return "fbp_pending";
    }

    return value;
  };

  const formatStatusText = (status?: string) => {
    const value = normalizeStatus(status);

    if (value === "reject_by_gm") return "GM ไม่อนุมัติ";
    if (value === "gm_pending") return "รอ GM อนุมัติ";
    if (value === "fbp_pending") return "GM อนุมัติแล้ว";

    return status || "-";
  };

  const getStatusClass = (status?: string) => {
    const value = normalizeStatus(status);

    if (value === "reject_by_gm") {
      return "bg-red-50 text-red-700 border-red-200";
    }

    if (value === "gm_pending") {
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    }

    if (value === "fbp_pending") {
      return "bg-green-50 text-green-700 border-green-200";
    }

    return "bg-slate-50 text-slate-600 border-slate-200";
  };

  const getStatusVisual = (status?: string) => {
    const value = normalizeStatus(status);

    if (value === "gm_pending") {
      return {
        dotClass: "bg-amber-500",
        textClass: "text-amber-700",
        hint: "รอการพิจารณา",
      };
    }

    if (value === "fbp_pending") {
      return {
        dotClass: "bg-emerald-500",
        textClass: "text-emerald-700",
        hint: "ผ่านการอนุมัติ",
      };
    }

    if (value === "reject_by_gm") {
      return {
        dotClass: "bg-rose-500",
        textClass: "text-rose-700",
        hint: "ไม่ผ่านการอนุมัติ",
      };
    }

    return {
      dotClass: "bg-slate-400",
      textClass: "text-slate-600",
      hint: "สถานะรายการ",
    };
  };

  const allowedCardStatuses = ["reject_by_gm", "gm_pending", "fbp_pending"];

  const isAllowedCardStatus = (status?: string) => {
    return allowedCardStatuses.includes(normalizeStatus(status));
  };

  const getLicenseList = (licenseReplace: string[] | string) => {
    if (Array.isArray(licenseReplace)) {
      return licenseReplace.map((item) => String(item).trim()).filter(Boolean);
    }

    if (typeof licenseReplace === "string") {
      const value = licenseReplace.trim();

      if (!value) return [];

      try {
        const parsed = JSON.parse(value);

        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item).trim()).filter(Boolean);
        }

        return [value];
      } catch {
        return value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }

    return [];
  };

  const handleSort = (key: SortKey) => {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc"
          ? "desc"
          : "asc",
    }));
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown size={13} className="opacity-50" />;
    }

    return sortConfig.direction === "asc" ? (
      <ChevronUp size={14} />
    ) : (
      <ChevronDown size={14} />
    );
  };

  const warehouseFilteredRequests = useMemo(() => {
    const userWarehouse = String(
      userInfo?.warehouse ||
      userInfo?.WAREHOUSE ||
      userInfo?.team ||
      userInfo?.TEAM ||
      ""
    )
      .trim()
      .toUpperCase();

    const selectedCode = selectedDC?.DC_CODE?.trim().toUpperCase();

    const canSeeAll =
      userWarehouse === "CENTER" ||
      userWarehouse === "WAREHOUSE" ||
      userWarehouse === "GM";

    // CENTER / WAREHOUSE / GM เห็นทั้งหมดก่อน
    // แล้วค่อยใช้ dropdown DC ด้านบนกรองเอง
    if (canSeeAll) {
      return requests;
    }

    // user คลังทั่วไป เห็นเฉพาะคลังตัวเอง
    if (userWarehouse) {
      return requests.filter((item) => {
        const itemDCCode = String(item.dc_code || "").trim().toUpperCase();
        return itemDCCode === userWarehouse;
      });
    }

    // ถ้าไม่มี userWarehouse แต่มี selectedDC ค่อย fallback ไปตาม DC ที่เลือก
    if (selectedCode) {
      return requests.filter((item) => {
        const itemDCCode = String(item.dc_code || "").trim().toUpperCase();
        return itemDCCode === selectedCode;
      });
    }

    return requests;
  }, [requests, selectedDC, userInfo]);

  const cardAllowedRequests = useMemo(() => {
    return warehouseFilteredRequests.filter((item) =>
      isAllowedCardStatus(item.status)
    );
  }, [warehouseFilteredRequests]);

  const dcTypeOptions = useMemo(() => {
    const uniqueTypes = new Set<string>();

    warehouseFilteredRequests.forEach((item) => {
      const type = String(item.dc_type || "").trim();
      if (type) uniqueTypes.add(type);
    });

    return Array.from(uniqueTypes).sort();
  }, [warehouseFilteredRequests]);

  const dcOptions = useMemo(() => {
    const uniqueDC = new Set<string>();

    warehouseFilteredRequests.forEach((item) => {
      const itemDCType = String(item.dc_type || "").trim().toUpperCase();

      const matchDCType =
        dcTypeFilter === "all" ||
        itemDCType === dcTypeFilter.trim().toUpperCase();

      if (!matchDCType) return;

      const dc = String(item.dc_code || "").trim();
      if (dc) uniqueDC.add(dc);
    });

    return Array.from(uniqueDC).sort();
  }, [warehouseFilteredRequests, dcTypeFilter]);

  const filteredRequests = useMemo(() => {
    return warehouseFilteredRequests.filter((item) => {
      const itemStatus = normalizeStatus(item.status);

      if (statusFilter === "all") {
        if (!isAllowedCardStatus(item.status)) return false;
      } else {
        if (itemStatus !== statusFilter) return false;
      }

      // filter dc type
      if (dcTypeFilter !== "all") {
        if ((item.dc_type || "").trim() !== dcTypeFilter) return false;
      }

      // filter dc
      if (dcFilter !== "all") {
        if ((item.dc_code || "").trim() !== dcFilter) return false;
      }

      // filter search
      const keyword = searchText.trim().toLowerCase();
      if (keyword) {
        const text = [
          item.running_doc,
          item.dc_type,
          item.dc_code,
          item.fleet_type,
          item.fleet_truck_type,
          item.license_replace,
          item.request_by,
          item.status,
        ]
          .join(" ")
          .toLowerCase();

        if (!text.includes(keyword)) return false;
      }

      return true;
    });
  }, [
    warehouseFilteredRequests,
    statusFilter,
    dcTypeFilter,
    dcFilter,
    searchText,
  ]);

  const sortedRequests = useMemo(() => {
    return [...filteredRequests].sort((a, b) => {
      let comparison = 0;

      if (sortConfig.key === "running_doc") {
        comparison = String(a.running_doc || "").localeCompare(
          String(b.running_doc || ""),
          "th",
          {
            numeric: true,
            sensitivity: "base",
          },
        );
      }

      if (sortConfig.key === "request_date") {
        const requestDateA = getRequestDateKey(a);
        const requestDateB = getRequestDateKey(b);

        const dateA =
          requestDateA === "ไม่ระบุวันที่"
            ? 0
            : new Date(requestDateA).getTime();

        const dateB =
          requestDateB === "ไม่ระบุวันที่"
            ? 0
            : new Date(requestDateB).getTime();

        comparison = dateA - dateB;
      }

      if (sortConfig.key === "usage_date") {
        const dateA = a.usage_date
          ? new Date(normalizeDateKey(a.usage_date)).getTime()
          : 0;

        const dateB = b.usage_date
          ? new Date(normalizeDateKey(b.usage_date)).getTime()
          : 0;

        comparison = dateA - dateB;
      }

      return sortConfig.direction === "asc" ? comparison : -comparison;
    });
  }, [filteredRequests, sortConfig]);

  const groupedFilteredByRequestDate = useMemo(() => {
    return sortedRequests.reduce<Record<string, RequestItem[]>>(
      (groups, item) => {
        const dateKey = getRequestDateKey(item);

        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }

        groups[dateKey].push(item);

        return groups;
      },
      {},
    );
  }, [sortedRequests]);

  const sortedFilteredDates = useMemo(() => {
    const dates = Object.keys(groupedFilteredByRequestDate);

    if (sortConfig.key !== "request_date") {
      return dates;
    }

    return dates.sort((a, b) => {
      if (a === "ไม่ระบุวันที่") return 1;
      if (b === "ไม่ระบุวันที่") return -1;

      const comparison = new Date(a).getTime() - new Date(b).getTime();

      return sortConfig.direction === "asc"
        ? comparison
        : -comparison;
    });
  }, [groupedFilteredByRequestDate, sortConfig]);

  const statusCounts = useMemo(() => {
    return {
      all: warehouseFilteredRequests.filter((item) =>
        isAllowedCardStatus(item.status)
      ).length,

      gmPending: warehouseFilteredRequests.filter(
        (item) => normalizeStatus(item.status) === "gm_pending"
      ).length,

      rejected: warehouseFilteredRequests.filter(
        (item) => normalizeStatus(item.status) === "reject_by_gm"
      ).length,

      fbp_pending: warehouseFilteredRequests.filter(
        (item) => normalizeStatus(item.status) === "fbp_pending"
      ).length,
    };
  }, [warehouseFilteredRequests]);

  const selectedDCLabel = useMemo(() => {
    const userWarehouse = String(
      userInfo?.warehouse ||
      userInfo?.WAREHOUSE ||
      userInfo?.team ||
      userInfo?.TEAM ||
      ""
    )
      .trim()
      .toUpperCase();

    const selectedCode = selectedDC?.DC_CODE?.trim().toUpperCase();

    if (userWarehouse === "CENTER") {
      return "CENTER - ส่วนกลาง / แสดงข้อมูลทั้งหมด";
    }

    if (!selectedCode) {
      return userWarehouse ? `${userWarehouse} - คลังของฉัน` : "-";
    }

    return selectedDC?.DC_NAME
      ? `${selectedDC.DC_CODE} - ${selectedDC.DC_NAME}`
      : selectedDC?.DC_CODE || "-";
  }, [selectedDC, userInfo]);

  const handleToggleRequestDatePicker = () => {
    if (!requestDateButtonRef.current) return;

    const rect = requestDateButtonRef.current.getBoundingClientRect();

    const calendarWidth = 330;
    const calendarHeight = 390;
    const gap = 8;
    const padding = 16;

    let top = rect.bottom + gap;
    let left = rect.right - calendarWidth;

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceBelow < calendarHeight && spaceAbove > calendarHeight) {
      top = rect.top - calendarHeight - gap;
    }

    if (left + calendarWidth > window.innerWidth - padding) {
      left = window.innerWidth - calendarWidth - padding;
    }

    if (left < padding) {
      left = padding;
    }

    if (top < padding) {
      top = padding;
    }

    setRequestDatePickerPosition({ top, left });
    setShowRequestDatePicker((prev) => !prev);
  };



  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe_0,#f5f7fb_32%,#f8fafc_100%)]">
      <main className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-4 lg:px-5">
        {/* ── HEADER ── */}
        <div className="mb-4 flex flex-col gap-3 overflow-hidden rounded-3xl border border-white/70 bg-white/90 px-4 py-4 shadow-[0_18px_50px_rgba(15,23,42,0.10)] backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600 shadow-[0_0_0_4px_rgba(37,99,235,0.12)]" />
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                New Vehicle Release
              </p>
            </div>

            <h1 className="mt-1.5 flex items-center gap-2 text-lg font-black text-slate-900 sm:text-xl">
              <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20">
                <Inbox size={18} className="shrink-0" />
              </span>
              <span className="truncate">คำขอจากคลัง</span>
            </h1>

            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600 shadow-sm">
                <Warehouse size={12} className="shrink-0 text-slate-400" />
                <span className="truncate">{selectedDCLabel}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-600 shadow-sm">
                <Filter size={12} />
                {statusFilter === "all"
                  ? "ดูทั้งหมด"
                  : statusFilter === "reject_by_gm"
                    ? "โดนปฏิเสธ"
                    : statusFilter === "gm_pending"
                      ? "รอส่วนกลางอนุมัติ"
                      : "อนุมัติแล้ว"}
              </span>
            </div>
          </div>
        </div>

        {/* ── ERROR ── */}
        {error && (
          <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-600 shadow-[0_10px_30px_rgba(239,68,68,0.1)]">
            {error}
          </div>
        )}

        {/* ── STATUS CARDS ── */}
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(
            [
              {
                key: "all",
                label: "ทั้งหมด",
                count: statusCounts.all,
                sub: "รวมมรายการทั้งหมด",
                activeClass:
                  "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-white ring-slate-400/30",
                inactiveClass:
                  "bg-gradient-to-br from-white to-slate-50 text-slate-800 ring-slate-200/80 hover:from-slate-50 hover:to-slate-100",
                iconClass: "bg-slate-100 text-slate-600",
                activeIconClass: "bg-white/15 text-white",
                countClass: "text-slate-900",
                activeCountClass: "text-white",
                dotClass: "bg-slate-400",
                shortLabel: "ALL",
              },
              {
                key: "gm_pending",
                label: "รอ GM อนุมัติ",
                count: statusCounts.gmPending,
                sub: "รายการที่รอการพิจารณาจาก GM",
                activeClass:
                  "bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-500 text-white ring-amber-300/40",
                inactiveClass:
                  "bg-gradient-to-br from-white to-amber-50 text-amber-800 ring-amber-100 hover:from-amber-50 hover:to-orange-50",
                iconClass: "bg-amber-100 text-amber-700",
                activeIconClass: "bg-white/20 text-white",
                countClass: "text-amber-900",
                activeCountClass: "text-white",
                dotClass: "bg-amber-500",
                shortLabel: "GM",
              },
              {
                key: "reject_by_gm",
                label: "GM ไม่อนุมัติ",
                count: statusCounts.rejected,
                sub: "รายการที่ไม่ผ่านการอนุมัติ",
                activeClass:
                  "bg-gradient-to-br from-rose-600 via-red-600 to-pink-600 text-white ring-rose-300/40",
                inactiveClass:
                  "bg-gradient-to-br from-white to-rose-50 text-rose-800 ring-rose-100 hover:from-rose-50 hover:to-red-50",
                iconClass: "bg-rose-100 text-rose-700",
                activeIconClass: "bg-white/20 text-white",
                countClass: "text-rose-900",
                activeCountClass: "text-white",
                dotClass: "bg-rose-500",
                shortLabel: "RJ",
              },
              {
                key: "fbp_pending",
                label: "GM อนุมัติแล้ว",
                count: statusCounts.fbp_pending,
                sub: "รายการที่ผ่านการอนุมัติแล้ว",
                activeClass:
                  "bg-gradient-to-br from-emerald-600 via-green-600 to-teal-500 text-white ring-emerald-300/40",
                inactiveClass:
                  "bg-gradient-to-br from-white to-emerald-50 text-emerald-800 ring-emerald-100 hover:from-emerald-50 hover:to-green-50",
                iconClass: "bg-emerald-100 text-emerald-700",
                activeIconClass: "bg-white/20 text-white",
                countClass: "text-emerald-900",
                activeCountClass: "text-white",
                dotClass: "bg-emerald-500",
                shortLabel: "OK",
              },
            ] as const
          ).map(
            ({
              key,
              label,
              count,
              sub,
              activeClass,
              inactiveClass,
              iconClass,
              activeIconClass,
              countClass,
              activeCountClass,
              dotClass,
              shortLabel,
            }) => {
              const isActive = statusFilter === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={`group relative overflow-hidden rounded-2xl p-4 text-left shadow-[0_10px_26px_rgba(15,23,42,0.08)] ring-1 transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(15,23,42,0.14)] ${isActive ? activeClass : inactiveClass
                    }`}
                >
                  <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/20 blur-2xl" />
                  <div className="pointer-events-none absolute -bottom-10 left-6 h-20 w-20 rounded-full bg-white/10 blur-2xl" />

                  <div className="relative flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${isActive ? "bg-white" : dotClass
                            }`}
                        />
                        <p
                          className={`truncate text-[11px] font-black ${isActive ? "text-white/90" : ""
                            }`}
                        >
                          {label}
                        </p>
                      </div>

                      <p
                        className={`mt-1 truncate text-[10px] font-bold ${isActive ? "text-white/60" : "text-slate-400"
                          }`}
                      >
                        {sub}
                      </p>
                    </div>

                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-xs font-black shadow-sm ${isActive ? activeIconClass : iconClass
                        }`}
                    >
                      {shortLabel}
                    </div>
                  </div>

                  <div className="relative mt-4 flex items-end justify-between">
                    <p
                      className={`text-3xl font-black tracking-tight ${isActive ? activeCountClass : countClass
                        }`}
                    >
                      {count}
                    </p>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black ${isActive
                        ? "bg-white/15 text-white"
                        : "bg-white/80 text-slate-400 shadow-sm"
                        }`}
                    >
                      รายการ
                    </span>
                  </div>
                </button>
              );
            }
          )}
        </div>

        <div className="relative z-30 rounded-[24px] mb-3 bg-gradient-to-b from-slate-50/90 to-white px-4 pb-4 pt-4 sm:px-5">

          {/* FILTER TITLE */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20">
                <SlidersHorizontal size={16} />
              </span>

              <div>
                <p className="text-sm font-black text-slate-800">
                  ค้นหาและตัวกรอง
                </p>

                <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                  เลือกเงื่อนไขเพื่อค้นหารายการคำขอ
                </p>
              </div>
            </div>

            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-slate-500 shadow-sm ring-1 ring-slate-100">
              พบ {filteredRequests.length} รายการ
            </span>
          </div>

          {/* FILTER INPUTS */}
          <div className="grid gap-3 lg:grid-cols-12">
            {/* SEARCH */}
            <div className="lg:col-span-4">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                ค้นหา
              </label>

              <div className="relative">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-400"
                />

                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="เลขเอกสาร, DC, ผู้ขอ, ทะเบียน..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-xs font-semibold text-slate-700 shadow-sm outline-none transition placeholder:text-slate-300 hover:border-blue-200 hover:shadow-md focus:border-blue-400 focus:ring-4 focus:ring-blue-100/70"
                />

                {searchText && (
                  <button
                    type="button"
                    onClick={() => setSearchText("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 transition hover:text-rose-500"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* DC TYPE */}
            <div className="lg:col-span-2">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                DC Type
              </label>

              <div className="relative">
                <Filter
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-400"
                />

                <select
                  value={dcTypeFilter}
                  onChange={(e) => {
                    setDcTypeFilter(e.target.value);
                    setDcFilter("all");
                  }}
                  className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs font-semibold text-slate-700 shadow-sm outline-none transition hover:border-blue-200 hover:shadow-md focus:border-blue-400 focus:ring-4 focus:ring-blue-100/70"
                >
                  <option value="all">ทุก DC Type</option>

                  {dcTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">
                  ▼
                </span>
              </div>
            </div>

            {/* DC */}
            <div className="lg:col-span-2">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                DC
              </label>

              <div className="relative">
                <Warehouse
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-400"
                />

                <select
                  value={dcFilter}
                  onChange={(e) => setDcFilter(e.target.value)}
                  className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs font-semibold text-slate-700 shadow-sm outline-none transition hover:border-blue-200 hover:shadow-md focus:border-blue-400 focus:ring-4 focus:ring-blue-100/70"
                >
                  <option value="all">ทุก DC</option>

                  {dcOptions.map((dc) => (
                    <option key={dc} value={dc}>
                      {dc}
                    </option>
                  ))}
                </select>

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">
                  ▼
                </span>
              </div>
            </div>

            {/* DATE */}
            <div className="lg:col-span-3">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                วันที่ขอ
              </label>

              <div className="relative">
                <CalendarDays
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-400"
                />

                <button
                  ref={requestDateButtonRef}
                  type="button"
                  onClick={handleToggleRequestDatePicker}
                  className={`h-10 w-full truncate rounded-xl border pl-9 pr-9 text-left text-xs font-semibold shadow-sm outline-none transition focus:ring-4 ${hasRequestDateRange
                    ? "border-blue-300 bg-blue-50 text-blue-700 focus:ring-blue-100/70"
                    : "border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:shadow-md focus:border-blue-400 focus:ring-blue-100/70"
                    }`}
                >
                  {formatThaiDateRange()}
                </button>

                {hasRequestDateRange && (
                  <button
                    type="button"
                    onClick={() => {
                      setHasRequestDateRange(false);
                      setRequestDateRange([
                        {
                          startDate: new Date(),
                          endDate: new Date(),
                          key: "selection",
                        },
                      ]);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 transition hover:text-rose-500"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {showRequestDatePicker && (
                <div
                  ref={requestDatePickerRef}
                  className="fixed z-[99999] w-[330px] overflow-hidden rounded-2xl border border-blue-100 bg-white text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.22)]"
                  style={{
                    top: requestDatePickerPosition.top,
                    left: requestDatePickerPosition.left,
                  }}
                >
                  <div className="flex items-center justify-between bg-blue-50 px-4 py-2.5">
                    <div>
                      <p className="text-xs font-black text-blue-700">
                        เลือกช่วงวันที่ขอ
                      </p>
                      <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                        Start Date – End Date
                      </p>
                    </div>

                    {hasRequestDateRange && (
                      <button
                        type="button"
                        onClick={() => {
                          setHasRequestDateRange(false);
                          setRequestDateRange([
                            {
                              startDate: new Date(),
                              endDate: new Date(),
                              key: "selection",
                            },
                          ]);
                        }}
                        className="rounded-lg bg-white px-2 py-1 text-[10px] font-black text-blue-600 shadow-sm transition hover:bg-blue-100"
                      >
                        ล้าง
                      </button>
                    )}
                  </div>

                  <DateRange
                    locale={th}
                    editableDateInputs={false}
                    moveRangeOnFirstSelection={false}
                    ranges={requestDateRange}
                    onChange={(item: RangeKeyDict) => {
                      const selection = item.selection;

                      setRequestDateRange([
                        {
                          startDate: selection.startDate || new Date(),
                          endDate:
                            selection.endDate ||
                            selection.startDate ||
                            new Date(),
                          key: "selection",
                        },
                      ]);

                      if (selection.startDate && selection.endDate) {
                        setHasRequestDateRange(true);
                      }
                    }}
                    showDateDisplay={false}
                    showPreview={false}
                    maxDate={new Date()}
                    rangeColors={["#2563eb"]}
                  />

                  <div className="flex items-center justify-between bg-white px-4 py-2.5 shadow-[0_-1px_0_rgba(226,232,240,0.8)]">
                    <p className="truncate pr-3 text-[11px] font-bold text-blue-600">
                      {hasRequestDateRange
                        ? formatThaiDateRange()
                        : "เลือกวันเริ่มต้น–สิ้นสุด"}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowRequestDatePicker(false)}
                      className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
                    >
                      เสร็จสิ้น
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* CLEAR */}
            <div className="flex items-end lg:col-span-1">
              <button
                type="button"
                onClick={() => {
                  setSearchText("");
                  setDcTypeFilter("all");
                  setDcFilter("all");
                  setStatusFilter("all");
                  setHasRequestDateRange(false);
                  setRequestDateRange([
                    {
                      startDate: new Date(),
                      endDate: new Date(),
                      key: "selection",
                    },
                  ]);
                }}
                className="group flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-500 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 hover:shadow-md"
              >
                <Eraser
                  size={13}
                  className="transition group-hover:-rotate-6"
                />

                <span className="hidden xl:inline">ล้าง</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── TABLE ── */}
        <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/95 shadow-[0_18px_55px_rgba(15,23,42,0.11)]">
          <div className="relative">
            <div className="bg-blue-50/70 px-3 py-1.5 text-[10px] font-bold text-blue-500 sm:hidden">
              เลื่อนซ้าย–ขวาเพื่อดูข้อมูลทั้งหมด →
            </div>

            <div className="max-h-[calc(100vh-430px)] min-h-[450px] overflow-auto [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-width:thin]">
              <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-blue-800 text-[10px] font-black uppercase tracking-wider text-white shadow-[0_1px_0_rgba(226,232,240,0.9)]">
                  {[
  "ลำดับ",
  "เลขที่เอกสาร",
  "DC Type",
  "DC",
  "ประเภทรถ",
  "ทะเบียนทดแทน",
  "จำนวน",
  "วันที่ใช้งาน",
  "ผู้ขอ",
  "สถานะ",
  "รายละเอียด",
].map((col, i) => {
  const sortKey: SortKey | null =
    col === "เลขที่เอกสาร"
      ? "running_doc"
      : col === "วันที่ใช้งาน"
        ? "usage_date"
        : null;

  return (
    <th
      key={col}
      onClick={() => {
        if (sortKey) {
          handleSort(sortKey);
        }
      }}
      className={`whitespace-nowrap bg-transparent px-3 py-3 ${
        i === 0
          ? "sticky left-0 z-30 w-[52px] text-center"
          : ""
      } ${i === 6 ? "text-center" : ""} ${
        i === 10 ? "text-right" : ""
      } ${
        sortKey
          ? "cursor-pointer select-none transition hover:bg-blue-700"
          : ""
      }`}
    >
      <span className="inline-flex items-center gap-1.5">
        {col}
        {sortKey && renderSortIcon(sortKey)}
      </span>
    </th>
  );
})}
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center">
                        <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500" />
                        <p className="text-xs font-medium text-slate-400">
                          กำลังโหลดข้อมูล...
                        </p>
                      </td>
                    </tr>
                  ) : filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center">
                        <p className="text-sm font-bold text-slate-400">
                          ไม่พบข้อมูลตามเงื่อนไขนี้
                        </p>
                      </td>
                    </tr>
                  ) : (
                    sortedFilteredDates.map((date) => (
                      <Fragment key={date}>
                        <tr>
                          <td
                            colSpan={11}
                            className="bg-gradient-to-r from-blue-50/80 to-slate-50 px-4 py-2 shadow-[0_1px_0_rgba(226,232,240,0.8)]"
                          >
                            <div className="inline-flex items-center gap-2 text-[11px] font-black text-blue-600">
  <button
    type="button"
    onClick={() => handleSort("request_date")}
    className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition hover:bg-blue-100 hover:text-blue-800"
    title="กดเพื่อเรียงวันที่ขอ"
  >
    <CalendarDays
      size={13}
      className="text-blue-400"
    />

    <span>วันที่ขอ: {formatThaiDate(date)}</span>

    {renderSortIcon("request_date")}
  </button>

  {isTodayRequest(date) && (
    <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black text-white shadow-sm shadow-emerald-500/20">
      New
    </span>
  )}

</div>
                          </td>
                        </tr>

                        {groupedFilteredByRequestDate[date].map((item, index) => {
                          const status = item.status || "pending";
                          const statusText = formatStatusText(status);
                          const statusVisual = getStatusVisual(status);
                          const isPending = normalizeStatus(status) === "gm_pending";

                          const rowKey =
                            item.id !== null && item.id !== undefined
                              ? String(item.id)
                              : item.running_doc || `${date}-${index}`;

                          const licenseList = getLicenseList(item.license_replace);
                          const visibleLicenses = licenseList.slice(0, 2);
                          const hiddenLicenseCount = Math.max(
                            licenseList.length - 2,
                            0
                          );

                          return (
                            <Fragment key={rowKey}>
                              <tr className="group bg-white text-xs transition hover:bg-blue-50/30">
                                <td className="sticky left-0 z-10 bg-white px-3 py-3 text-center group-hover:bg-blue-50/30">
                                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[11px] font-black text-slate-500">
                                    {index + 1}
                                  </span>
                                </td>

                                <td className="whitespace-nowrap px-3 py-3">
                                  <p className="font-black text-slate-800">
                                    {item.running_doc || "-"}
                                  </p>
                                  <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                                    ใช้: {formatThaiDate(item.usage_date)}
                                  </p>
                                </td>

                                <td className="whitespace-nowrap px-3 py-3">
                                  <span className="inline-flex rounded-lg bg-blue-50 px-2 py-0.5 text-[11px] font-black text-blue-600 ring-1 ring-blue-100">
                                    {item.dc_type || "-"}
                                  </span>
                                </td>

                                <td className="whitespace-nowrap px-3 py-3">
                                  <span className="inline-flex rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-black text-emerald-600 ring-1 ring-emerald-100">
                                    {item.dc_code || "-"}
                                  </span>
                                </td>

                                <td className="whitespace-nowrap px-3 py-3">
                                  <p className="font-bold text-slate-700">
                                    {item.fleet_truck_type || "-"}
                                  </p>
                                  <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                                    {item.fleet_type || "-"}
                                  </p>
                                </td>

                                <td className="max-w-[150px] px-3 py-3">
                                  {licenseList.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {visibleLicenses.map((lic, li) => (
                                        <span
                                          key={`${rowKey}-lic-${li}`}
                                          title={lic}
                                          className="inline-flex max-w-[86px] truncate rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200"
                                        >
                                          {lic}
                                        </span>
                                      ))}

                                      {hiddenLicenseCount > 0 && (
                                        <span className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-black text-blue-500 ring-1 ring-blue-100">
                                          +{hiddenLicenseCount}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>

                                <td className="px-3 py-3 text-center">
                                  <span className="rounded-xl bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-700 ring-1 ring-slate-200">
                                    {formatNumber(item.qty)}
                                  </span>
                                </td>

                                <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-600">
                                  {formatThaiDate(item.usage_date)}
                                </td>

                                <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-700">
                                  {item.request_by || "-"}
                                </td>

                                {/* สถานะ */}
                                <td className="whitespace-nowrap px-3 py-3">
                                  <div className="flex min-w-[135px] items-center gap-2.5">
                                    <span
                                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusVisual.dotClass}`}
                                    />

                                    <div className="min-w-0">
                                      <p
                                        className={`whitespace-nowrap text-[11px] font-black ${statusVisual.textClass}`}
                                      >
                                        {statusText}
                                      </p>

                                      <p className="mt-0.5 whitespace-nowrap text-[9px] font-semibold text-slate-400">
                                        {statusVisual.hint}
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                {/* จัดการ */}
                                <td className="whitespace-nowrap px-3 py-3 text-right">
                                  <button
                                    type="button"
                                    disabled={updatingRows[rowKey]}
                                    onClick={() => setGmModalItem(item)}
                                    className={
                                      isPending
                                        ? "inline-flex h-9 min-w-[130px] items-center justify-center gap-2 rounded-xl bg-blue-700 px-3 text-[11px] font-black text-white shadow-md shadow-blue-700/20 transition hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                                        : "inline-flex h-9 min-w-[130px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    }
                                  >
                                    {isPending ? (
                                      <>
                                        <PencilLine size={14} />
                                        อัพเดตสถานะ
                                      </>
                                    ) : (
                                      <>
                                        <Eye size={14} />
                                        ดูรายละเอียด
                                      </>
                                    )}
                                  </button>

                                  {updateMessage[rowKey]?.text && (
                                    <p
                                      className={`mt-1.5 text-[10px] font-bold ${updateMessage[rowKey].type === "success"
                                        ? "text-emerald-600"
                                        : "text-rose-600"
                                        }`}
                                    >
                                      {updateMessage[rowKey].text}
                                    </p>
                                  )}
                                </td>
                              </tr>

                              {confirmAction && (
                                <div
                                  className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-200/20 px-4"
                                  onClick={() => setConfirmAction(null)}
                                >
                                  <div
                                    className="w-full max-w-md overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-[0_16px_45px_rgba(148,163,184,0.32)] ring-1 ring-slate-200/50"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div
                                      className={`px-5 py-4 ${confirmAction.status === "fbp_pending"
                                        ? "bg-gradient-to-r from-emerald-600 to-green-600"
                                        : "bg-gradient-to-r from-rose-600 to-red-600"
                                        }`}
                                    >
                                      <p className="text-sm font-black text-white">
                                        {confirmAction.title}
                                      </p>

                                      <p className="mt-1 text-xs font-medium text-white/80">
                                        กรุณาตรวจสอบก่อนยืนยัน
                                      </p>
                                    </div>

                                    <div className="bg-gradient-to-b from-white to-slate-50 px-5 py-5">
                                      <p className="text-sm font-bold text-slate-800">
                                        {confirmAction.description}
                                      </p>

                                      <div className="mt-4 rounded-2xl bg-white p-3 text-xs shadow-sm ring-1 ring-slate-100">
                                        <div className="grid grid-cols-2 gap-2">
                                          <div>
                                            <p className="font-bold text-slate-400">เลขเอกสาร</p>
                                            <p className="mt-0.5 font-black text-slate-700">
                                              {confirmAction.item.running_doc || "-"}
                                            </p>
                                          </div>

                                          <div>
                                            <p className="font-bold text-slate-400">DC</p>
                                            <p className="mt-0.5 font-black text-slate-700">
                                              {confirmAction.item.dc_code || "-"}
                                            </p>
                                          </div>

                                          <div>
                                            <p className="font-bold text-slate-400">ประเภทรถ</p>
                                            <p className="mt-0.5 font-black text-slate-700">
                                              {confirmAction.item.fleet_truck_type || "-"}
                                            </p>
                                          </div>

                                          <div>
                                            <p className="font-bold text-slate-400">จำนวน</p>
                                            <p className="mt-0.5 font-black text-slate-700">
                                              {formatNumber(confirmAction.item.qty)}
                                            </p>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="mt-5 flex justify-end gap-2">
                                        <button
                                          type="button"
                                          disabled={updatingRows[confirmAction.rowKey]}
                                          onClick={() => setConfirmAction(null)}
                                          className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                          ยกเลิก
                                        </button>

                                        <button
                                          type="button"
                                          disabled={updatingRows[confirmAction.rowKey]}
                                          onClick={() =>
                                            handleStatusUpdate(
                                              confirmAction.rowKey,
                                              confirmAction.item.id,
                                              confirmAction.status
                                            )
                                          }
                                          className={`rounded-xl px-4 py-2 text-xs font-black text-white shadow-lg transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${confirmAction.status === "fbp_pending"
                                            ? "bg-gradient-to-r from-emerald-600 to-green-600 shadow-emerald-600/20 hover:from-emerald-700 hover:to-green-700"
                                            : "bg-gradient-to-r from-rose-600 to-red-600 shadow-rose-600/20 hover:from-rose-700 hover:to-red-700"
                                            }`}
                                        >
                                          {updatingRows[confirmAction.rowKey]
                                            ? "กำลังบันทึก..."
                                            : "ยืนยัน"}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                            </Fragment>
                          );
                        })}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {gmModalItem && (
        <GMModalDetail
          open={true}
          data={gmModalItem}
          allRequests={requests}
          onClose={() => setGmModalItem(null)}
          onSuccess={async () => {
            await fetchRequests();
            setGmModalItem(null);
          }}
        />
      )}

    </div>
  );
}
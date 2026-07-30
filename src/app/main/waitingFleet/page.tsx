"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { DateRange, RangeKeyDict } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { th } from "date-fns/locale";
import {
  CalendarDays,
  Eraser,
  Filter,
  Search,
  SlidersHorizontal,
  Truck,
  Warehouse,
  X,
} from "lucide-react";
import FleetModalDetail from "./components/FleetModalDetail";

interface SelectedDC {
  DC_CODE?: string;
  DC_NAME?: string;
  DC_TYPE?: string;
  dc_code?: string;
  dc_name?: string;
  dc_type?: string;
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
}

interface UserInfo {
  warehouse?: string;
  WAREHOUSE?: string;
  team?: string;
  TEAM?: string;
}

type StatusFilter = "all" | "fbp_pending" | "reject_by_fbp" | "approved";

export default function HomePage() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [selectedDC, setSelectedDC] = useState<SelectedDC | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(
    null
  );
  const [openDetailModal, setOpenDetailModal] = useState(false);

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

  const [hasRequestDateRange, setHasRequestDateRange] = useState(false);
  const [showRequestDatePicker, setShowRequestDatePicker] = useState(false);

  const requestDateButtonRef = useRef<HTMLButtonElement | null>(null);
  const requestDatePickerRef = useRef<HTMLDivElement | null>(null);

  const [requestDatePickerPosition, setRequestDatePickerPosition] = useState({
    top: 0,
    left: 0,
  });

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

  const selectedDcFromSidebar = useMemo(() => {
    return String(
      selectedDC?.DC_CODE ||
      selectedDC?.dc_code ||
      ""
    )
      .trim()
      .toUpperCase();
  }, [selectedDC]);

  const selectedDcNameFromSidebar = useMemo(() => {
    return String(
      selectedDC?.DC_NAME ||
      selectedDC?.dc_name ||
      ""
    ).trim();
  }, [selectedDC]);

  const selectedDcTypeFromSidebar = useMemo(() => {
    return String(
      selectedDC?.DC_TYPE ||
      selectedDC?.dc_type ||
      ""
    ).trim();
  }, [selectedDC]);

  const userWarehouse = useMemo(() => {
    return String(
      userInfo?.warehouse ||
      userInfo?.WAREHOUSE ||
      userInfo?.team ||
      userInfo?.TEAM ||
      ""
    )
      .trim()
      .toUpperCase();
  }, [userInfo]);

  const isCenterUser =
  userWarehouse === "CENTER" || selectedDcFromSidebar === "CENTER";

  const sidebarFilteredRequests = useMemo(() => {
    // CENTER เห็นข้อมูลทั้งหมด
    if (isCenterUser) {
      return requests;
    }

    // คนที่ไม่ใช่ CENTER ถ้ามี DC จาก Sidebar ให้เห็นเฉพาะ DC นั้น
    if (selectedDcFromSidebar) {
      return requests.filter((item) => {
        const itemDcCode = String(item.dc_code || "")
          .trim()
          .toUpperCase();

        return itemDcCode === selectedDcFromSidebar;
      });
    }

    // คนที่ไม่ใช่ CENTER และไม่มี selected_dc ให้เห็นเฉพาะ warehouse ตัวเอง
    if (userWarehouse) {
      return requests.filter((item) => {
        const itemDcCode = String(item.dc_code || "")
          .trim()
          .toUpperCase();

        return itemDcCode === userWarehouse;
      });
    }

    return [];
  }, [requests, selectedDcFromSidebar, isCenterUser, userWarehouse]);

  const normalizeDateKey = (value?: string) => {
    if (!value) return "ไม่ระบุวันที่";

    const raw = String(value).trim();

    if (!raw) return "ไม่ระบุวันที่";

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
    const rawDate = item.request_date || item.date || "";

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

  const formatNumber = (value?: number | string | null) => {
    if (value === null || value === undefined || value === "") return "-";

    const numberValue = Number(value);

    if (Number.isNaN(numberValue)) return String(value);

    return numberValue.toLocaleString("en-US");
  };

  const normalizeStatus = (status?: string) => {
    const value = String(status || "").trim().toLowerCase();

    if (
      value === "fbp_pending" ||
      value === "รอส่วนกลางอนุมัติ"
    ) {
      return "fbp_pending";
    }

    if (
      value === "reject_by_fbp" ||
      value === "ส่วนกลางไม่อนุมัติ"
    ) {
      return "reject_by_fbp";
    }

    if (
      value === "progress" ||
      value === "approved" ||
      value === "อนุมัติแล้ว"
    ) {
      return "approved";
    }

    return value;
  };

  const isAllowedCardStatus = (status?: string) => {
    const value = normalizeStatus(status);
  
    return (
      value === "fbp_pending" ||
      value === "reject_by_fbp" ||
      value === "approved"
    );
  };

  const formatStatusText = (status?: string) => {
    const value = normalizeStatus(status);

    if (value === "fbp_pending") return "รอส่วนกลางอนุมัติ";
    if (value === "reject_by_fbp") return "ส่วนกลางไม่อนุมัติ";
    if (value === "approved") return "อนุมัติแล้ว";

    return status || "-";
  };

  const getStatusClass = (status?: string) => {
    const value = normalizeStatus(status);

    if (value === "fbp_pending") {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }

    if (value === "reject_by_fbp") {
      return "bg-red-50 text-red-700 border-red-200";
    }

    if (value === "approved") {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }

    return "bg-slate-50 text-slate-600 border-slate-200";
  };


  const getStatusVisual = (status?: string) => {
    const value = normalizeStatus(status);

    if (value === "fbp_pending") {
      return {
        dotClass: "bg-amber-500",
        textClass: "text-amber-700",
        hint: "รอการพิจารณา",
      };
    }

    if (value === "reject_by_fbp") {
      return {
        dotClass: "bg-rose-500",
        textClass: "text-rose-700",
        hint: "ไม่ผ่านการประเมิน",
      };
    }

    if (value === "approved") {
      return {
        dotClass: "bg-emerald-500",
        textClass: "text-emerald-700",
        hint: "ผ่านการประเมิน",
      };
    }

    return {
      dotClass: "bg-slate-400",
      textClass: "text-slate-600",
      hint: "สถานะรายการ",
    };
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

  const dashboardSummary = useMemo(() => {
    const fbp_pending = sidebarFilteredRequests.filter(
      (item) => normalizeStatus(item.status) === "fbp_pending"
    ).length;
  
    const rejectedByCenter = sidebarFilteredRequests.filter(
      (item) => normalizeStatus(item.status) === "reject_by_fbp"
    ).length;
  
    const approved = sidebarFilteredRequests.filter(
      (item) => normalizeStatus(item.status) === "approved"
    ).length;
  
    return {
      total: fbp_pending + rejectedByCenter + approved,
      fbp_pending,
      rejectedByCenter,
      approved,
    };
  }, [sidebarFilteredRequests]);


  const dcTypeOptions = useMemo(() => {
    const uniqueTypes = new Set<string>();

    sidebarFilteredRequests.forEach((item) => {
      const type = String(item.dc_type || "").trim();
      if (type) uniqueTypes.add(type);
    });

    return Array.from(uniqueTypes).sort();
  }, [sidebarFilteredRequests]);

  const dcOptions = useMemo(() => {
    const uniqueDC = new Set<string>();

    sidebarFilteredRequests.forEach((item) => {
      const itemDCType = String(item.dc_type || "").trim().toUpperCase();

      const matchDCType =
        dcTypeFilter === "all" ||
        itemDCType === dcTypeFilter.trim().toUpperCase();

      if (!matchDCType) return;

      const dc = String(item.dc_code || "").trim();
      if (dc) uniqueDC.add(dc);
    });

    return Array.from(uniqueDC).sort();
  }, [sidebarFilteredRequests, dcTypeFilter]);

  const filteredRequests = useMemo(() => {
    let list = sidebarFilteredRequests;

    // ทั้งหมด = fbp_pending + reject_by_fbp เท่านั้น
    if (statusFilter === "all") {
      list = list.filter((item) => isAllowedCardStatus(item.status));
    }

    // รอส่วนกลางอนุมัติ = fbp_pending
    if (statusFilter === "fbp_pending") {
      list = list.filter((item) => normalizeStatus(item.status) === "fbp_pending");
    }

    // ส่วนกลางไม่อนุมัติ = reject_by_fbp
    if (statusFilter === "reject_by_fbp") {
      list = list.filter(
        (item) => normalizeStatus(item.status) === "reject_by_fbp"
      );
    }

    // อนุมัติแล้ว = โชว์ 0 รายการ
    if (statusFilter === "approved") {
      list = list.filter(
        (item) => normalizeStatus(item.status) === "approved"
      );
    }

    if (dcTypeFilter !== "all") {
      list = list.filter((item) => {
        const itemDCType = String(item.dc_type || "").trim().toUpperCase();
        return itemDCType === dcTypeFilter.trim().toUpperCase();
      });
    }

    if (dcFilter !== "all") {
      list = list.filter((item) => {
        const itemDCCode = String(item.dc_code || "").trim().toUpperCase();
        return itemDCCode === dcFilter.trim().toUpperCase();
      });
    }

    const keyword = searchText.trim().toLowerCase();

    if (keyword) {
      list = list.filter((item) => {
        const licenseText = getLicenseText(item.license_replace);

        return [
          item.running_doc,
          item.dc_type,
          item.dc_code,
          item.fleet_type,
          item.fleet_truck_type,
          item.request_by,
          item.remark,
          licenseText,
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      });
    }

    if (hasRequestDateRange) {
      const startDateKey = formatDateToKey(requestDateRange[0].startDate);
      const endDateKey = formatDateToKey(requestDateRange[0].endDate);

      list = list.filter((item) => {
        const itemRequestDateKey = getRequestDateKey(item);
        return itemRequestDateKey >= startDateKey && itemRequestDateKey <= endDateKey;
      });
    }

    return list;
  }, [
    sidebarFilteredRequests,
    statusFilter,
    dcTypeFilter,
    dcFilter,
    searchText,
    hasRequestDateRange,
    requestDateRange,
  ]);

  const pageTitle = useMemo(() => {
    const dcSuffix =
      isCenterUser && dcFilter !== "all"
        ? `ของ ${dcFilter}`
        : !isCenterUser && selectedDcFromSidebar
          ? `ของ ${selectedDcFromSidebar}`
          : "";

    if (statusFilter === "fbp_pending") {
      return `รายการรอส่วนกลางอนุมัติ${dcSuffix}`;
    }

    if (statusFilter === "reject_by_fbp") {
      return `รายการส่วนกลางไม่อนุมัติ${dcSuffix}`;
    }

    if (statusFilter === "approved") {
      return `รายการอนุมัติแล้ว${dcSuffix}`;
    }

    return `รายการรอประเมินกองรถ${dcSuffix}`;
  }, [
    statusFilter,
    dcFilter,
    isCenterUser,
    selectedDcFromSidebar,
  ]);

  const groupedByRequestDate = useMemo(() => {
    return filteredRequests.reduce<Record<string, RequestItem[]>>(
      (groups, item) => {
        const dateKey = normalizeDateKey(item.request_date || item.date);

        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(item);

        return groups;
      },
      {}
    );
  }, [filteredRequests]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedByRequestDate).sort((a, b) => {
      if (a === "ไม่ระบุวันที่") return 1;
      if (b === "ไม่ระบุวันที่") return -1;

      return new Date(b).getTime() - new Date(a).getTime();
    });
  }, [groupedByRequestDate]);

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

  const selectedDcLabel = useMemo(() => {
    if (selectedDcFromSidebar === "CENTER") {
      return "CENTER - ส่วนกลาง / แสดงข้อมูลทั้งหมด";
    }
  
    if (!selectedDcFromSidebar) {
      return "ไม่ได้เลือก DC จาก Sidebar / แสดงทั้งหมด";
    }
  
    return `${selectedDcFromSidebar}${
      selectedDcNameFromSidebar ? ` - ${selectedDcNameFromSidebar}` : ""
    }${selectedDcTypeFromSidebar ? ` (${selectedDcTypeFromSidebar})` : ""}`;
  }, [
    selectedDcFromSidebar,
    selectedDcNameFromSidebar,
    selectedDcTypeFromSidebar,
  ]);

  const handleOpenDetail = (item: RequestItem) => {
    setSelectedRequest(item);
    setOpenDetailModal(true);
  };

  const handleCloseDetail = () => {
    setOpenDetailModal(false);
    setSelectedRequest(null);
  };

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
                Fleet Assessment
              </p>
            </div>

            <h1 className="mt-1.5 flex items-center gap-2 text-lg font-black text-slate-900 sm:text-xl">
              <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20">
                <Truck size={18} className="shrink-0" />
              </span>
              <span className="truncate">รอประเมินกองรถ</span>
            </h1>

            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600 shadow-sm">
                <Warehouse size={12} className="shrink-0 text-slate-400" />
                <span className="truncate">
                  {isCenterUser
                    ? "CENTER - ส่วนกลาง / แสดงข้อมูลทั้งหมด"
                    : selectedDcFromSidebar
                      ? selectedDcLabel
                      : "แสดงข้อมูลตามสิทธิ์ผู้ใช้งาน"}
                </span>
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-600 shadow-sm">
                <Filter size={12} />
                {statusFilter === "all"
                  ? "ดูทั้งหมด"
                  : statusFilter === "fbp_pending"
                    ? "รอส่วนกลางอนุมัติ"
                    : statusFilter === "reject_by_fbp"
                      ? "ส่วนกลางไม่อนุมัติ"
                      : "อนุมัติแล้ว"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchRequests}
            disabled={loading}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 via-blue-900 to-slate-800 px-4 text-sm font-black text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className={loading ? "animate-spin" : ""}>↻</span>
            {loading ? "กำลังโหลด..." : "รีเฟรชข้อมูล"}
          </button>
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
                count: dashboardSummary.total,
                sub: "รวมรายการที่รอการประเมิน",
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
                key: "fbp_pending",
                label: "รอส่วนกลางอนุมัติ",
                count: dashboardSummary.fbp_pending,
                sub: "รายการที่รอการพิจารณา",
                activeClass:
                  "bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-500 text-white ring-amber-300/40",
                inactiveClass:
                  "bg-gradient-to-br from-white to-amber-50 text-amber-800 ring-amber-100 hover:from-amber-50 hover:to-orange-50",
                iconClass: "bg-amber-100 text-amber-700",
                activeIconClass: "bg-white/20 text-white",
                countClass: "text-amber-900",
                activeCountClass: "text-white",
                dotClass: "bg-amber-500",
                shortLabel: "CT",
              },
              {
                key: "reject_by_fbp",
                label: "ส่วนกลางไม่อนุมัติ",
                count: dashboardSummary.rejectedByCenter,
                sub: "รายการที่ไม่ผ่านการประเมิน",
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
                key: "approved",
                label: "อนุมัติแล้ว",
                count: dashboardSummary.approved,
                sub: "รายการที่ผ่านการประเมิน",
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
                  className={`group relative overflow-hidden rounded-2xl p-4 text-left shadow-[0_10px_26px_rgba(15,23,42,0.08)] ring-1 transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(15,23,42,0.14)] ${
                    isActive ? activeClass : inactiveClass
                  }`}
                >
                  <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/20 blur-2xl" />
                  <div className="pointer-events-none absolute -bottom-10 left-6 h-20 w-20 rounded-full bg-white/10 blur-2xl" />

                  <div className="relative flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            isActive ? "bg-white" : dotClass
                          }`}
                        />
                        <p
                          className={`truncate text-[11px] font-black ${
                            isActive ? "text-white/90" : ""
                          }`}
                        >
                          {label}
                        </p>
                      </div>

                      <p
                        className={`mt-1 truncate text-[10px] font-bold ${
                          isActive ? "text-white/60" : "text-slate-400"
                        }`}
                      >
                        {sub}
                      </p>
                    </div>

                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-xs font-black shadow-sm ${
                        isActive ? activeIconClass : iconClass
                      }`}
                    >
                      {shortLabel}
                    </div>
                  </div>

                  <div className="relative mt-4 flex items-end justify-between">
                    <p
                      className={`text-3xl font-black tracking-tight ${
                        isActive ? activeCountClass : countClass
                      }`}
                    >
                      {count}
                    </p>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                        isActive
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

        {/* ── FILTER ── */}
        <div className="relative z-30 mb-3 rounded-[24px] bg-gradient-to-b from-slate-50/90 to-white px-4 pb-4 pt-4 sm:px-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20">
                <SlidersHorizontal size={16} />
              </span>

              <div className="min-w-0">
                <p className="text-sm font-black text-slate-800">
                  ค้นหาและตัวกรอง
                </p>
                <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400">
                  เลือกเงื่อนไขเพื่อค้นหารายการรอประเมินกองรถ
                </p>
              </div>
            </div>
          </div>

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
                  className={`h-10 w-full truncate rounded-xl border pl-9 pr-9 text-left text-xs font-semibold shadow-sm outline-none transition focus:ring-4 ${
                    hasRequestDateRange
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
                title="ล้างตัวกรอง"
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
          <div className="flex flex-col gap-2 border-b border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-800">{pageTitle}</h2>
              <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                แสดง {filteredRequests.length} จากทั้งหมด {sidebarFilteredRequests.length} รายการ
              </p>
            </div>

            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black text-blue-600">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              เลือก “ประเมิน” เพื่อดูรายละเอียด
            </span>
          </div>

          <div className="relative">
            <div className="bg-blue-50/70 px-3 py-1.5 text-[10px] font-bold text-blue-500 sm:hidden">
              เลื่อนซ้าย–ขวาเพื่อดูข้อมูลทั้งหมด →
            </div>

            <div className="max-h-[calc(100vh-430px)] min-h-[450px] overflow-auto [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-width:thin]">
              <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-left">
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
                    ].map((col, index) => (
                      <th
                        key={col}
                        className={`whitespace-nowrap bg-transparent px-3 py-3 ${
                          index === 0
                            ? "sticky left-0 z-30 w-[52px] text-center"
                            : ""
                        } ${index === 6 ? "text-center" : ""} ${
                          index === 10 ? "text-right" : ""
                        }`}
                      >
                        {col}
                      </th>
                    ))}
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
                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                          <Search size={20} />
                        </span>
                        <p className="mt-3 text-sm font-bold text-slate-400">
                          ไม่พบข้อมูลตามเงื่อนไขนี้
                        </p>
                      </td>
                    </tr>
                  ) : (
                    sortedDates.map((date) => (
                      <Fragment key={date}>
                        <tr>
                          <td
                            colSpan={11}
                            className="bg-gradient-to-r from-blue-50/80 to-slate-50 px-4 py-2 shadow-[0_1px_0_rgba(226,232,240,0.8)]"
                          >
                            <div className="inline-flex items-center gap-2 text-[11px] font-black text-blue-600">
                              <CalendarDays size={13} className="text-blue-400" />
                              วันที่ขอ: {formatThaiDate(date)}
                              <span className="font-semibold text-slate-400">
                                · {groupedByRequestDate[date].length} รายการ
                              </span>
                            </div>
                          </td>
                        </tr>

                        {groupedByRequestDate[date].map((item, index) => {
                          const status = item.status || "fbp_pending";
                          const statusText = formatStatusText(status);
                          const statusVisual = getStatusVisual(status);
                          const licenseList = getLicenseList(item.license_replace);
                          const visibleLicenses = licenseList.slice(0, 2);
                          const hiddenLicenseCount = Math.max(
                            licenseList.length - 2,
                            0
                          );
                          const rowKey =
                            item.id !== null && item.id !== undefined
                              ? String(item.id)
                              : item.running_doc || `${date}-${index}`;

                          return (
                            <tr
                              key={rowKey}
                              className="group bg-white text-xs transition hover:bg-blue-50/30"
                            >
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
                                  ขอ: {formatThaiDate(item.request_date || item.date)}
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
                                    {visibleLicenses.map((license, licenseIndex) => (
                                      <span
                                        key={`${rowKey}-license-${licenseIndex}`}
                                        title={license}
                                        className="inline-flex max-w-[86px] truncate rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200"
                                      >
                                        {license}
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

                              <td className="whitespace-nowrap px-3 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleOpenDetail(item)}
                                  className="inline-flex h-9 min-w-[110px] items-center justify-center rounded-xl bg-blue-700 px-3 text-[11px] font-black text-white shadow-md shadow-blue-700/20 transition hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-lg"
                                >
                                  ประเมิน
                                </button>
                              </td>
                            </tr>
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

        {openDetailModal && selectedRequest && (
          <FleetModalDetail
            open={openDetailModal}
            onClose={handleCloseDetail}
            data={selectedRequest}
            allRequests={requests}
            onSuccess={fetchRequests}
          />
        )}
      </main>
    </div>
  );
}
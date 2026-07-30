"use client";

import NewVehicleRequestModal from "./components/NewVehicleRequestModal";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { DateRange, RangeKeyDict } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { th } from "date-fns/locale";
import { CalendarDays, Eraser, Filter, Search, SlidersHorizontal, Truck, Warehouse, X } from "lucide-react";

interface SelectedDC {
  DC_CODE?: string;
  DC_NAME?: string;
  DC_TYPE?: string;
}

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
  created_at?: string;
  fleet_type: string;
  fleet_truck_type: string;
  license_replace: string[] | string;

  qty: number | string;
  approved_qty?: number | string | null;
  approved_company_name?: string | null;
  approved_by?: string | null;

  usage_date: string;
  workload: number;
  truckturn: number;
  status: string;
  request_by: string;
  remark: string;

  details?: RequestDetailItem[];
}

interface UserInfo {
  warehouse?: string;
  WAREHOUSE?: string;
  team?: string;
  TEAM?: string;
  dc_code?: string;
  DC_CODE?: string;
  dcCode?: string;
  DCCode?: string;
  department?: string;
  DEPARTMENT?: string;
}

type StatusFilter =
  | "all"
  | "gm_pending"
  | "center_pending"
  | "process"
  | "rejected";

export default function HomePage() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [selectedDC, setSelectedDC] = useState<SelectedDC | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [openRows, setOpenRows] = useState<Record<string, boolean>>({});
  const [editingStatus, setEditingStatus] = useState<Record<string, string>>({});
  const [updatingRows, setUpdatingRows] = useState<Record<string, boolean>>({});
  const [updateMessage, setUpdateMessage] = useState<
    Record<string, { type: "success" | "error"; text: string }>
  >({});

  const [openCreateModal, setOpenCreateModal] = useState(false);
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
    newStatus: string
  ) => {
    if (!id) return;

    setUpdatingRows((prev) => ({ ...prev, [rowKey]: true }));
    setUpdateMessage((prev) => ({
      ...prev,
      [rowKey]: { type: "success", text: "" },
    }));

    try {
      const res = await fetch(
        "http://192.168.158.210/api_new_truck/api/request_update.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status: newStatus }),
        }
      );

      if (!res.ok) throw new Error("อัปเดตไม่สำเร็จ");

      setRequests((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: newStatus } : item
        )
      );

      setUpdateMessage((prev) => ({
        ...prev,
        [rowKey]: { type: "success", text: "อัปเดตสำเร็จ" },
      }));

      setTimeout(() => {
        setUpdateMessage((prev) => ({
          ...prev,
          [rowKey]: { type: "success", text: "" },
        }));
      }, 2500);
    } catch (err) {
      console.error(err);
      setUpdateMessage((prev) => ({
        ...prev,
        [rowKey]: {
          type: "error",
          text: "อัปเดตไม่สำเร็จ กรุณาลองใหม่",
        },
      }));
    } finally {
      setUpdatingRows((prev) => ({ ...prev, [rowKey]: false }));
      setEditingStatus((prev) => ({ ...prev, [rowKey]: "" }));
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

  const formatApprovedBy = (value?: string | null) => {
    const raw = String(value || "").trim();

    if (!raw) return "-";

    // ตัวอย่าง: warehouse center (warehouse)
    // ให้คงข้อความไว้ครบ แต่จัดช่องว่างให้อ่านง่าย
    return raw.replace(/\s+/g, " ");
  };

  const normalizeStatus = (status?: string) => {
    const value = String(status || "").trim().toLowerCase();

    if (
      value === "gm_pending" ||
      value === "รอ gm อนุมัติ"
    ) {
      return "gm_pending";
    }

    if (
      value === "center_pending" ||
      value === "pending" ||
      value === "รอส่วนกลางอนุมัติ" ||
      value === "รออนุมัติ"
    ) {
      return "center_pending";
    }

    if (
      value === "process" ||
      value === "progress" ||
      value === "confirm_request" ||
      value === "confirm request" ||
      value === "in_progress" ||
      value === "กำลังดำเนินการ" ||
      value === "0" ||
      value === "1" ||
      value === "2" ||
      value === "3" ||
      value === "4" ||
      value === "5" ||
      value === "6" ||
      value === "7" ||
      value === "8" ||
      value === "9"
    ) {
      return "process";
    }

    if (
      value === "rejected" ||
      value === "reject_gm" ||
      value === "reject_by_gm" ||
      value === "rejected_by_gm" ||
      value === "gm_rejected" ||
      value === "reject_center" ||
      value === "reject_by_center" ||
      value === "rejected_by_center" ||
      value === "center_rejected" ||
      value === "reject_0" ||
      value === "reject_1" ||
      value === "reject_2" ||
      value === "reject_3" ||
      value === "reject_4" ||
      value === "reject_5" ||
      value === "reject_6" ||
      value === "reject_7" ||
      value === "reject_8" ||
      value === "reject_9" ||
      value === "ไม่อนุมัติ" ||
      value === "ปฏิเสธ" ||
      value === "ยกเลิก"
    ) {
      return "rejected";
    }

    if (
      value === "completed" ||
      value === "approved" ||
      value === "อนุมัติ" ||
      value === "สำเร็จ" ||
      value === "เสร็จสิ้น"
    ) {
      return "completed";
    }

    return value;
  };

  const formatStatusText = (status?: string) => {
    const rawValue = String(status || "").trim().toLowerCase();
    const value = normalizeStatus(status);

    if (value === "gm_pending") return "รอ GM อนุมัติ";
    if (value === "center_pending") return "รอส่วนกลางอนุมัติ";
    if (value === "process") return "กำลังดำเนินการ";

    if (
      rawValue === "reject_gm" ||
      rawValue === "reject_by_gm" ||
      rawValue === "rejected_by_gm" ||
      rawValue === "gm_rejected"
    ) {
      return "GM ไม่อนุมัติ";
    }

    if (
      rawValue === "reject_center" ||
      rawValue === "reject_by_center" ||
      rawValue === "rejected_by_center" ||
      rawValue === "center_rejected"
    ) {
      return "ส่วนกลางไม่อนุมัติ";
    }

    if (rawValue.startsWith("reject_")) {
      return "ขั้นตอนดำเนินการไม่อนุมัติ";
    }

    if (value === "rejected") return "ปฏิเสธ";
    if (value === "completed") return "เสร็จสิ้น";

    return formatBackendText(status);
  };

  const getStatusClass = (status?: string) => {
    const value = normalizeStatus(status);

    if (value === "gm_pending") {
      return "bg-purple-50 text-purple-700 border-purple-200";
    }

    if (value === "center_pending") {
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    }

    if (value === "process") {
      return "bg-blue-50 text-blue-700 border-blue-200";
    }

    if (value === "completed") {
      return "bg-green-50 text-green-700 border-green-200";
    }

    if (value === "rejected") {
      return "bg-red-50 text-red-700 border-red-200";
    }

    return "bg-slate-50 text-slate-600 border-slate-200";
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

    const selectedCode = String(selectedDC?.DC_CODE || "")
      .trim()
      .toUpperCase();

    // ✅ ถ้า user เป็น CENTER หรือ selectedDC เป็น CENTER ให้เห็นทั้งหมด
    if (userWarehouse === "CENTER" || selectedCode === "CENTER") {
      return requests;
    }

    // ✅ ถ้าไม่ใช่ CENTER แต่มี DC ที่เลือก ให้แสดงเฉพาะ DC นั้น
    if (selectedCode) {
      return requests.filter((item) => {
        const itemDCCode = String(item.dc_code || "")
          .trim()
          .toUpperCase();

        return itemDCCode === selectedCode;
      });
    }

    // ✅ ถ้าไม่ได้เลือก DC ให้แสดงตาม warehouse / team ของ user
    if (userWarehouse) {
      return requests.filter((item) => {
        const itemDCCode = String(item.dc_code || "")
          .trim()
          .toUpperCase();

        return itemDCCode === userWarehouse;
      });
    }

    return [];
  }, [requests, selectedDC, userInfo]);

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
      const normalizedItemStatus = normalizeStatus(item.status);

      const matchStatus =
        statusFilter === "all" || normalizedItemStatus === statusFilter;

      const matchDCType =
        dcTypeFilter === "all" ||
        String(item.dc_type || "").trim().toUpperCase() ===
        dcTypeFilter.trim().toUpperCase();

      const matchDC =
        dcFilter === "all" ||
        String(item.dc_code || "").trim().toUpperCase() ===
        dcFilter.trim().toUpperCase();

      const itemRequestDateKey = getRequestDateKey(item);
      const startDateKey = formatDateToKey(requestDateRange[0].startDate);
      const endDateKey = formatDateToKey(requestDateRange[0].endDate);

      const matchRequestDate =
        !hasRequestDateRange ||
        (itemRequestDateKey >= startDateKey && itemRequestDateKey <= endDateKey);

      const licenseText = getLicenseList(item.license_replace).join(" ");

      const keyword = searchText.trim().toLowerCase();

      const matchSearch =
        !keyword ||
        [
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

      return matchStatus && matchDCType && matchDC && matchRequestDate && matchSearch;
    });
  }, [
    warehouseFilteredRequests,
    statusFilter,
    dcTypeFilter,
    dcFilter,
    requestDateRange,
    hasRequestDateRange,
    searchText,
  ]);

  const groupedFilteredByRequestDate = useMemo(() => {
    return filteredRequests.reduce<Record<string, RequestItem[]>>(
      (groups, item) => {
        const dateKey = getRequestDateKey(item);

        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(item);

        return groups;
      },
      {}
    );
  }, [filteredRequests]);

  const sortedFilteredDates = useMemo(() => {
    return Object.keys(groupedFilteredByRequestDate).sort((a, b) => {
      if (a === "ไม่ระบุวันที่") return 1;
      if (b === "ไม่ระบุวันที่") return -1;

      return new Date(a).getTime() - new Date(b).getTime();
    });
  }, [groupedFilteredByRequestDate]);

  const statusCounts = useMemo(() => {
    return {
      all: warehouseFilteredRequests.length,

      gmPending: warehouseFilteredRequests.filter(
        (item) => normalizeStatus(item.status) === "gm_pending"
      ).length,

      centerPending: warehouseFilteredRequests.filter(
        (item) => normalizeStatus(item.status) === "center_pending"
      ).length,

      process: warehouseFilteredRequests.filter(
        (item) => normalizeStatus(item.status) === "process"
      ).length,

      rejected: warehouseFilteredRequests.filter(
        (item) => normalizeStatus(item.status) === "rejected"
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

    if (userWarehouse === "CENTER" || selectedCode === "CENTER") {
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

  const formatBackendText = (value?: string) => {
    const rawValue = String(value || "").trim();
    const normalizedValue = rawValue.toLowerCase();

    const textMap: Record<string, string> = {
      gm_pending: "รอการอนุมัติจาก GM",
      center_pending: "รอการอนุมัติจากส่วนกลาง",
      fbp_pending: "รอส่วนกลางอนุมัติ",

      process: "อยู่ระหว่างดำเนินการ",
      in_progress: "อยู่ระหว่างดำเนินการ",
      confirm_request: "ยืนยันคำขอแล้ว",

      reject_gm: "GM ไม่อนุมัติ",
      reject_by_gm: "GM ไม่อนุมัติ",
      rejected_by_gm: "GM ไม่อนุมัติ",
      gm_rejected: "GM ไม่อนุมัติ",
      fbp_rejected: "ส่วนกลางไม่อนุมัติ",

      reject_center: "ส่วนกลางไม่อนุมัติ",
      reject_by_center: "ส่วนกลางไม่อนุมัติ",
      rejected_by_center: "ส่วนกลางไม่อนุมัติ",
      center_rejected: "ส่วนกลางไม่อนุมัติ",

      approved: "อนุมัติแล้ว",
      completed: "ดำเนินการเสร็จสิ้น",
      rejected: "ไม่อนุมัติ",
    };

    if (!rawValue) return "-";

    if (textMap[normalizedValue]) {
      return textMap[normalizedValue];
    }

    if (/^reject_[0-9]+$/.test(normalizedValue)) {
      return "ไม่อนุมัติในขั้นตอนดำเนินการ";
    }

    // กรณีไม่มีใน Map อย่างน้อยจะไม่แสดง underscore
    return rawValue
      .replace(/_/g, " ")
      .replace(/-/g, " ")
      .replace(/\s+/g, " ")
      .trim();
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
                <Truck size={18} className="shrink-0" />
              </span>
              <span className="truncate">รายการคำขอรถ</span>
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
                  : statusFilter === "gm_pending"
                    ? "รอ GM อนุมัติ"
                    : statusFilter === "center_pending"
                      ? "รอส่วนกลางอนุมัติ"
                      : statusFilter === "process"
                        ? "กำลังดำเนินการ"
                        : "โดนปฏิเสธ"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpenCreateModal(true)}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 via-blue-900 to-slate-800 px-4 text-sm font-black text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
          >
            <span className="text-base leading-none">+</span>
            คำขอออกรถใหม่
          </button>
        </div>

        {/* ── ERROR ── */}
        {error && (
          <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-600 shadow-[0_10px_30px_rgba(239,68,68,0.1)]">
            {error}
          </div>
        )}

        {/* ── STATUS CARDS ── */}
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {(
            [
              {
                key: "all",
                label: "ทั้งหมด",
                count: statusCounts.all,
                sub: "รายการทั้งหมดที่มองเห็น",
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
                sub: "รายการที่รอ GM พิจารณา",
                activeClass:
                  "bg-gradient-to-br from-purple-600 via-violet-600 to-fuchsia-600 text-white ring-purple-300/40",
                inactiveClass:
                  "bg-gradient-to-br from-white to-purple-50 text-purple-800 ring-purple-100 hover:from-purple-50 hover:to-violet-50",
                iconClass: "bg-purple-100 text-purple-700",
                activeIconClass: "bg-white/20 text-white",
                countClass: "text-purple-900",
                activeCountClass: "text-white",
                dotClass: "bg-purple-500",
                shortLabel: "GM",
              },
              {
                key: "center_pending",
                label: "รอส่วนกลางอนุมัติ",
                count: statusCounts.centerPending,
                sub: "รายการที่รอส่วนกลางพิจารณา",
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
                key: "process",
                label: "กำลังดำเนินการ",
                count: statusCounts.process,
                sub: "รายการที่อยู่ระหว่างดำเนินการ",
                activeClass:
                  "bg-gradient-to-br from-blue-600 via-sky-600 to-cyan-500 text-white ring-blue-300/40",
                inactiveClass:
                  "bg-gradient-to-br from-white to-blue-50 text-blue-800 ring-blue-100 hover:from-blue-50 hover:to-sky-50",
                iconClass: "bg-blue-100 text-blue-700",
                activeIconClass: "bg-white/20 text-white",
                countClass: "text-blue-900",
                activeCountClass: "text-white",
                dotClass: "bg-blue-500",
                shortLabel: "PR",
              },
              {
                key: "rejected",
                label: "ไม่อนุมัติ",
                count: statusCounts.rejected,
                sub: "รายการที่ไม่ผ่านการพิจารณา",
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

        {/* ── FILTER BAR COMPACT ── */}
        <div className="mb-4 overflow-visible rounded-2xl border border-slate-200/70 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.07)]">
          {/* header */}
          <div className="flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-slate-50 via-blue-50/50 to-slate-50 px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs font-black text-slate-700">
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
          <div className="relative z-30 rounded-[24px] mb-3 bg-gradient-to-b from-slate-50/90 to-white px-4 pb-4 pt-4 sm:px-5">

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
        </div>

        {/* ── TABLE ── */}
        <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/95 shadow-[0_18px_55px_rgba(15,23,42,0.11)]">
          <div className="relative">
            <div className="bg-blue-50/70 px-3 py-1.5 text-[10px] font-bold text-blue-500 sm:hidden">
              เลื่อนซ้าย–ขวาเพื่อดูข้อมูลทั้งหมด →
            </div>

            <div className="max-h-[calc(100vh-430px)] min-h-[400px] overflow-auto [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-width:thin]">
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
                      statusFilter === "rejected"
                        ? "จำนวนทั้งหมด / อนุมัติ / ไม่อนุมัติ"
                        : "จำนวน",
                      "วันที่ใช้งาน",
                      "ผู้ขอ",
                      "สถานะ",
                      "รายละเอียด",
                    ].map((col, i) => (
                      <th
                        key={col}
                        className={`whitespace-nowrap bg-transparent px-3 py-3 ${i === 0 ? "sticky left-0 z-30 w-[52px] text-center" : ""
                          } ${i === 6 ? "text-center" : ""} ${i === 10 ? "text-right" : ""
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
                              <CalendarDays size={13} className="text-blue-400" />
                              วันที่ขอ: {formatThaiDate(date)}

                              {isTodayRequest(date) && (
                                <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black text-white shadow-sm shadow-emerald-500/20">
                                  New
                                </span>
                              )}

                              <span className="font-semibold text-slate-400">
                                · {groupedFilteredByRequestDate[date].length} รายการ
                              </span>
                            </div>
                          </td>
                        </tr>

                        {groupedFilteredByRequestDate[date].map((item, index) => {
                          const status = item.status || "pending";
                          const statusClass = getStatusClass(status);
                          const statusText = formatStatusText(status);
                          const isProcessStatus =
                            normalizeStatus(item.status) === "process";

                          // จำนวนที่ขอทั้งหมด
                          const totalQtyValue = Number(item.qty);
                          const totalQty = Number.isFinite(totalQtyValue)
                            ? Math.max(totalQtyValue, 0)
                            : 0;

                          // จำนวนที่อนุมัติ
                          const approvedQtyValue = Number(item.approved_qty);
                          const approvedQty = Number.isFinite(approvedQtyValue)
                            ? Math.min(Math.max(approvedQtyValue, 0), totalQty)
                            : 0;

                          // จำนวนที่ไม่อนุมัติ = จำนวนทั้งหมด - จำนวนที่อนุมัติ
                          const rejectedQty = Math.max(totalQty - approvedQty, 0);

                          const showRejectedQty =
                            statusFilter === "rejected" &&
                            normalizeStatus(item.status) === "rejected";

                          const rowKey =
                            item.id !== null && item.id !== undefined
                              ? String(item.id)
                              : item.running_doc || `${date}-${index}`;

                          const isOpen = openRows[rowKey];
                          const licenseList = getLicenseList(item.license_replace);

                          const replacementTruckRows: RequestDetailItem[] =
                            Array.isArray(item.details) && item.details.length > 0
                              ? item.details.map((detail) => ({
                                ...detail,
                                license: String(detail.license || "").trim(),
                                province: String(detail.province || "").trim(),
                                truck_type: String(detail.truck_type || "").trim(),
                                company_id: String(detail.company_id || "").trim(),
                                company_name: String(detail.company_name || "").trim(),
                              }))
                              : licenseList.map((license, licenseIndex) => ({
                                id: `fallback-${licenseIndex}`,
                                license,
                                province: "",
                                truck_type: "",
                                company_id: "",
                                company_name: "",
                              }));

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
                                  {showRejectedQty ? (
                                    <div className="flex min-w-[230px] items-center justify-center gap-1.5">
                                      {/* จำนวนทั้งหมด */}
                                      <div className="min-w-[68px] rounded-xl bg-slate-50 px-2 py-1.5 ring-1 ring-slate-200">
                                        <p className="text-[9px] font-bold text-slate-400">
                                          ทั้งหมด
                                        </p>
                                        <p className="mt-0.5 text-sm font-black text-slate-700">
                                          {formatNumber(totalQty)}
                                        </p>
                                      </div>

                                      {/* จำนวนที่อนุมัติ */}
                                      <div className="min-w-[68px] rounded-xl bg-emerald-50 px-2 py-1.5 ring-1 ring-emerald-200">
                                        <p className="text-[9px] font-bold text-emerald-500">
                                          อนุมัติ
                                        </p>
                                        <p className="mt-0.5 text-sm font-black text-emerald-700">
                                          {formatNumber(approvedQty)}
                                        </p>
                                      </div>

                                      {/* จำนวนที่ไม่อนุมัติ */}
                                      <div className="min-w-[68px] rounded-xl bg-rose-50 px-2 py-1.5 ring-1 ring-rose-200">
                                        <p className="text-[9px] font-bold text-rose-500">
                                          ไม่อนุมัติ
                                        </p>
                                        <p className="mt-0.5 text-sm font-black text-rose-700">
                                          {formatNumber(rejectedQty)}
                                        </p>
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="rounded-xl bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-700 ring-1 ring-slate-200">
                                      {formatNumber(item.qty)}
                                    </span>
                                  )}
                                </td>

                                <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-600">
                                  {formatThaiDate(item.usage_date)}
                                </td>

                                <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-700">
                                  {item.request_by || "-"}
                                </td>

                                <td className="whitespace-nowrap px-3 py-3">
                                  <span
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black shadow-sm ${statusClass}`}
                                  >
                                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                                    {statusText}
                                  </span>
                                </td>

                                <td className="px-3 py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenRows((prev) => ({
                                        ...prev,
                                        [rowKey]: !prev[rowKey],
                                      }))
                                    }
                                    className={`rounded-xl px-3 py-1.5 text-[11px] font-black shadow-sm transition hover:-translate-y-0.5 active:translate-y-0 ${isOpen
                                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-600/20"
                                      : "bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                                      }`}
                                  >
                                    {isOpen ? "ซ่อน" : "ดู"}
                                  </button>
                                </td>
                              </tr>

                              {isOpen && (
                                <tr className="bg-slate-50">
                                  <td colSpan={11} className="px-4 py-3">
                                    <div className="grid gap-2 rounded-2xl border border-slate-100 bg-white p-3 text-[11px] shadow-[0_10px_28px_rgba(15,23,42,0.08)] sm:grid-cols-2 lg:grid-cols-4">
                                      {isProcessStatus && (
                                        <div className="overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 sm:col-span-2 lg:col-span-4">
                                          <div className="flex flex-col gap-2 border-b border-blue-100 bg-blue-700 px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                              <p className="text-xs font-black">
                                                สรุปผลการอนุมัติรถ
                                              </p>
                                              <p className="mt-0.5 text-[10px] font-medium text-white/70">
                                                แสดงเฉพาะรายการที่อยู่ระหว่างดำเนินการ
                                              </p>
                                            </div>

                                            <span className="inline-flex w-fit items-center rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black text-white">
                                              กำลังดำเนินการ
                                            </span>
                                          </div>

                                          <div className="grid gap-3 p-4 sm:grid-cols-3">
                                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center shadow-sm">
                                              <p className="text-[10px] font-bold text-slate-400">
                                                จำนวนที่ขอ
                                              </p>
                                              <p className="mt-1 text-2xl font-black text-slate-800">
                                                {formatNumber(totalQty)}
                                              </p>
                                              <p className="text-[10px] font-bold text-slate-400">
                                                คัน
                                              </p>
                                            </div>

                                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-center shadow-sm">
                                              <p className="text-[10px] font-bold text-emerald-600">
                                                จำนวนที่อนุมัติ
                                              </p>
                                              <p className="mt-1 text-2xl font-black text-emerald-700">
                                                {formatNumber(approvedQty)}
                                              </p>
                                              <p className="text-[10px] font-bold text-emerald-500">
                                                คัน
                                              </p>
                                            </div>

                                            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-center shadow-sm">
                                              <p className="text-[10px] font-bold text-amber-600">
                                                จำนวนที่ยังไม่อนุมัติ
                                              </p>
                                              <p className="mt-1 text-2xl font-black text-amber-700">
                                                {formatNumber(rejectedQty)}
                                              </p>
                                              <p className="text-[10px] font-bold text-amber-500">
                                                คัน
                                              </p>
                                            </div>
                                          </div>

                                          <div className="grid gap-3 border-t border-blue-100 bg-white/70 p-4 sm:grid-cols-2">
                                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                                              <p className="text-[10px] font-bold text-slate-400">
                                                ซัพพลายเออร์ที่ได้รับอนุมัติ
                                              </p>
                                              <p className="mt-1 text-sm font-black text-slate-800">
                                                {item.approved_company_name || "-"}
                                              </p>
                                            </div>

                                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                                              <p className="text-[10px] font-bold text-slate-400">
                                                อนุมัติโดย
                                              </p>
                                              <p className="mt-1 text-sm font-black text-blue-700">
                                                {formatApprovedBy(item.approved_by)}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                                        <p className="font-bold text-slate-400">
                                          Workload
                                        </p>
                                        <p className="mt-1 text-sm font-black text-slate-700">
                                          {formatNumber(item.workload)}
                                        </p>
                                      </div>

                                      <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
                                        <p className="font-bold text-slate-400">
                                          Truck Turn
                                        </p>
                                        <p className="mt-1 text-sm font-black text-slate-700">
                                          {formatNumber(item.truckturn)}
                                        </p>
                                      </div>

                                      <div className="rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100 sm:col-span-2">
                                        <p className="font-bold text-slate-400">
                                          หมายเหตุ
                                        </p>
                                        <p className="mt-1 font-medium text-slate-600">
                                          {item.remark || "-"}
                                        </p>
                                      </div>

                                      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white sm:col-span-2 lg:col-span-4">
                                        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                                          <div>
                                            <p className="text-xs font-black text-slate-700">
                                              รายละเอียดรถทดแทน
                                            </p>

                                            <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                                              ทะเบียน จังหวัด ประเภทรถ และซัพพลายเออร์เดิม
                                            </p>
                                          </div>

                                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700 ring-1 ring-blue-100">
                                            {replacementTruckRows.length} คัน
                                          </span>
                                        </div>

                                        <div className="max-h-[260px] overflow-auto">
                                          <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-[11px]">
                                            <thead className="sticky top-0 z-10 bg-slate-100 text-slate-500">
                                              <tr>
                                                <th className="w-[60px] border-b border-slate-200 px-3 py-2.5 text-center font-black">
                                                  ลำดับ
                                                </th>

                                                <th className="border-b border-slate-200 px-3 py-2.5 font-black">
                                                  ทะเบียนรถ
                                                </th>

                                                <th className="border-b border-slate-200 px-3 py-2.5 font-black">
                                                  จังหวัด
                                                </th>

                                                <th className="border-b border-slate-200 px-3 py-2.5 font-black">
                                                  ประเภทรถเดิม
                                                </th>

                                                <th className="border-b border-slate-200 px-3 py-2.5 font-black">
                                                  ซัพพลายเออร์เดิม
                                                </th>
                                              </tr>
                                            </thead>

                                            <tbody>
                                              {replacementTruckRows.length === 0 ? (
                                                <tr>
                                                  <td
                                                    colSpan={5}
                                                    className="px-4 py-8 text-center font-semibold text-slate-400"
                                                  >
                                                    ไม่พบข้อมูลรถทดแทน
                                                  </td>
                                                </tr>
                                              ) : (
                                                replacementTruckRows.map((truck, truckIndex) => (
                                                  <tr
                                                    key={
                                                      truck.id ||
                                                      `${rowKey}-${truck.license}-${truckIndex}`
                                                    }
                                                    className="bg-white transition hover:bg-blue-50/40"
                                                  >
                                                    <td className="border-b border-slate-100 px-3 py-3 text-center">
                                                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-black text-slate-600">
                                                        {truckIndex + 1}
                                                      </span>
                                                    </td>

                                                    <td className="border-b border-slate-100 px-3 py-3">
                                                      <span className="inline-flex rounded-lg bg-blue-50 px-2.5 py-1 font-black text-blue-700 ring-1 ring-blue-100">
                                                        {truck.license || "-"}
                                                      </span>
                                                    </td>

                                                    <td className="border-b border-slate-100 px-3 py-3 font-bold text-slate-700">
                                                      {truck.province || "-"}
                                                    </td>

                                                    <td className="border-b border-slate-100 px-3 py-3">
                                                      <span className="inline-flex rounded-lg bg-violet-50 px-2.5 py-1 font-black text-violet-700 ring-1 ring-violet-100">
                                                        {truck.truck_type || "-"}
                                                      </span>
                                                    </td>

                                                    <td className="border-b border-slate-100 px-3 py-3">
                                                      {truck.company_id || truck.company_name ? (
                                                        <div>
                                                          <p className="font-black text-slate-700">
                                                            [{truck.company_id || "-"}] {truck.company_name || "-"}
                                                          </p>

                                                        </div>
                                                      ) : (
                                                        <span className="text-slate-400">-</span>
                                                      )}
                                                    </td>
                                                  </tr>
                                                ))
                                              )}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>


                                    </div>
                                  </td>
                                </tr>
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

        <NewVehicleRequestModal
          open={openCreateModal}
          onClose={() => setOpenCreateModal(false)}
          onSuccess={() => {
            setOpenCreateModal(false);
            fetchRequests();
          }}
          existingRequests={requests}
        />
      </main>
    </div>
  );
}
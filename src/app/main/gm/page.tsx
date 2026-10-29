"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { DateRange, RangeKeyDict } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { th } from "date-fns/locale";
import {
  ArrowUpDown,
  ClipboardList,
  ShieldCheck,
  CircleCheck,
  CircleX,
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
  approve_qty_gm?: number | string | null;
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

type StatusFilter =
  | "all"
  | "reject_by_gm"
  | "gm_pending"
  | "fbp_pending";

type SortKey = "request_date" | "running_doc" | "usage_date";
type SortDirection = "asc" | "desc";

const normalizeStatus = (status?: string) => {
  const value = String(status || "").trim().toLowerCase();

  if (
    ["success", "progress", "partial_approved", "fbp_pending"].includes(
      value,
    )
  ) {
    return "fbp_pending";
  }

  return value;
};

const isAllowedCardStatus = (status?: string) =>
  ["reject_by_gm", "gm_pending", "fbp_pending"].includes(
    normalizeStatus(status),
  );

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

  if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(dateOnly)) {
    const [day, month, year] = dateOnly.split(/[/-]/);
    return `${year}-${month}-${day}`;
  }

  const parsedDate = new Date(raw);

  if (!Number.isNaN(parsedDate.getTime())) {
    return formatDateToKey(parsedDate);
  }

  return "ไม่ระบุวันที่";
};

const formatDateToKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getRequestDateKey = (item: RequestItem) => {
  const dateKey = normalizeDateKey(
    item.request_date || item.date || item.created_at || "",
  );

  if (dateKey === "ไม่ระบุวันที่") return dateKey;

  const [year, month, day] = dateKey.split("-");
  let fixedYear = Number(year);

  if (fixedYear > 2400) fixedYear -= 543;

  return `${fixedYear}-${month}-${day}`;
};

const formatThaiDate = (value?: string) => {
  const dateKey = normalizeDateKey(value);

  if (dateKey === "ไม่ระบุวันที่") return dateKey;

  const [year, month, day] = dateKey.split("-");
  return `${day}/${month}/${year}`;
};

const formatNumber = (value?: number | string | null) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const numberValue = Number(value);

  return Number.isNaN(numberValue)
    ? String(value)
    : numberValue.toLocaleString("en-US");
};

const getQtySummary = (item: RequestItem) => {
  const requestedQty = Math.max(0, Number(item.qty) || 0);
  const status = normalizeStatus(item.status);

  if (status === "reject_by_gm") {
    return {
      requestedQty,
      approvedQty: 0,
      notApprovedQty: requestedQty,
    };
  }

  if (status === "fbp_pending") {
    const approvedQty = Math.min(
      requestedQty,
      Math.max(0, Number(item.approve_qty_gm) || 0),
    );

    return {
      requestedQty,
      approvedQty,
      notApprovedQty: Math.max(requestedQty - approvedQty, 0),
    };
  }

  return {
    requestedQty,
    approvedQty: 0,
    notApprovedQty: 0,
  };
};

const formatStatusText = (status?: string) => {
  const value = normalizeStatus(status);

  if (value === "reject_by_gm") return "GM ไม่อนุมัติ";
  if (value === "gm_pending") return "รอ GM อนุมัติ";
  if (value === "fbp_pending") return "GM อนุมัติแล้ว";

  return status || "-";
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

const getLicenseList = (licenseReplace: string[] | string) => {
  if (Array.isArray(licenseReplace)) {
    return licenseReplace
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof licenseReplace !== "string") return [];

  const value = licenseReplace.trim();
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);

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
};

export default function GmStatusPage() {
  const [portalTarget, setPortalTarget] =
    useState<HTMLElement | null>(null);

  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [selectedDC, setSelectedDC] = useState<SelectedDC | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [gmModalItem, setGmModalItem] =
    useState<RequestItem | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: SortDirection;
  }>({
    key: "request_date",
    direction: "asc",
  });

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [requestTypeFilter, setRequestTypeFilter] = useState("all");
  const [truckTypeFilter, setTruckTypeFilter] = useState("all");
  const [dcTypeFilter, setDcTypeFilter] = useState("all");
  const [dcFilter, setDcFilter] = useState("all");

  // ช่องเลือกวันที่ด้านบน
  const [selectedDate, setSelectedDate] = useState("");

  const [requestDateRange, setRequestDateRange] = useState([
    {
      startDate: new Date(),
      endDate: new Date(),
      key: "selection",
    },
  ]);

  const [hasRequestDateRange, setHasRequestDateRange] = useState(false);
  const [showRequestDatePicker, setShowRequestDatePicker] =
    useState(false);

  const requestDateButtonRef = useRef<HTMLButtonElement | null>(null);
  const requestDatePickerRef = useRef<HTMLDivElement | null>(null);
  const fetchingRef = useRef(false);

  const [requestDatePickerPosition, setRequestDatePickerPosition] =
    useState({
      top: 0,
      left: 0,
    });

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    const loadSelectedDC = () => {
      const savedSelectedDC = localStorage.getItem("selected_dc");

      if (!savedSelectedDC) {
        setSelectedDC(null);
        return;
      }

      try {
        setSelectedDC(JSON.parse(savedSelectedDC));
      } catch (err) {
        console.error("อ่าน selected_dc ไม่ได้:", err);
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
    } catch (err) {
      console.error("อ่าน user info ไม่ได้:", err);
      setUserInfo(null);
    }
  }, []);

  const fetchRequests = async (): Promise<boolean> => {
    if (fetchingRef.current) return false;

    fetchingRef.current = true;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        "http://192.168.158.210/api_new_truck/api/request_get.php",
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        },
      );

      if (!res.ok) throw new Error("ไม่สามารถดึงข้อมูลได้");

      const data = await res.json();

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.result)
            ? data.result
            : null;

      if (!list) {
        throw new Error("รูปแบบข้อมูลจาก API ไม่ถูกต้อง");
      }

      setRequests(list);
      return true;
    } catch (err) {
      console.error(err);
      setError("เกิดข้อผิดพลาดในการดึงข้อมูลจาก API");
      return false;
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRequests();
  }, []);

  useEffect(() => {
    if (!showRequestDatePicker) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        !requestDateButtonRef.current?.contains(target) &&
        !requestDatePickerRef.current?.contains(target)
      ) {
        setShowRequestDatePicker(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowRequestDatePicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showRequestDatePicker]);

  const clearRequestDate = () => {
    setSelectedDate("");
    setHasRequestDateRange(false);
    setRequestDateRange([
      {
        startDate: new Date(),
        endDate: new Date(),
        key: "selection",
      },
    ]);
  };

  const handleSelectedDateChange = (value: string) => {
    setSelectedDate(value);
    setShowRequestDatePicker(false);

    if (!value) {
      setHasRequestDateRange(false);
      return;
    }

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    setRequestDateRange([
      {
        startDate: date,
        endDate: date,
        key: "selection",
      },
    ]);

    setHasRequestDateRange(true);
    setCurrentPage(1);
  };

  const formatThaiDateRange = () => {
    if (!hasRequestDateRange) return "เลือกช่วงวันที่ขอ";

    return `${formatThaiDate(
      formatDateToKey(requestDateRange[0].startDate),
    )} - ${formatThaiDate(
      formatDateToKey(requestDateRange[0].endDate),
    )}`;
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
        "",
    )
      .trim()
      .toUpperCase();

    const selectedCode = selectedDC?.DC_CODE?.trim().toUpperCase();

    if (["CENTER", "WAREHOUSE", "GM"].includes(userWarehouse)) {
      return requests;
    }

    if (userWarehouse) {
      return requests.filter(
        (item) =>
          String(item.dc_code || "").trim().toUpperCase() ===
          userWarehouse,
      );
    }

    if (selectedCode) {
      return requests.filter(
        (item) =>
          String(item.dc_code || "").trim().toUpperCase() ===
          selectedCode,
      );
    }

    return requests;
  }, [requests, selectedDC, userInfo]);

  const dcTypeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          warehouseFilteredRequests
            .map((item) => String(item.dc_type || "").trim())
            .filter(Boolean),
        ),
      ).sort(),
    [warehouseFilteredRequests],
  );

  const requestTypeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          warehouseFilteredRequests
            .map((item) => String(item.fleet_type || "").trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b, "th")),
    [warehouseFilteredRequests],
  );

  const truckTypeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          warehouseFilteredRequests
            .filter(
              (item) =>
                requestTypeFilter === "all" ||
                String(item.fleet_type || "").trim() ===
                  requestTypeFilter,
            )
            .map((item) => String(item.fleet_truck_type || "").trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b, "th")),
    [warehouseFilteredRequests, requestTypeFilter],
  );

  const dcOptions = useMemo(
    () =>
      Array.from(
        new Set(
          warehouseFilteredRequests
            .filter(
              (item) =>
                dcTypeFilter === "all" ||
                String(item.dc_type || "").trim().toUpperCase() ===
                  dcTypeFilter.trim().toUpperCase(),
            )
            .map((item) => String(item.dc_code || "").trim())
            .filter(Boolean),
        ),
      ).sort(),
    [warehouseFilteredRequests, dcTypeFilter],
  );

  const filteredRequests = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return warehouseFilteredRequests.filter((item) => {
      const itemStatus = normalizeStatus(item.status);

      if (statusFilter === "all") {
        if (!isAllowedCardStatus(item.status)) return false;
      } else if (itemStatus !== statusFilter) {
        return false;
      }

      if (
        requestTypeFilter !== "all" &&
        String(item.fleet_type || "").trim() !== requestTypeFilter
      ) {
        return false;
      }

      if (
        truckTypeFilter !== "all" &&
        String(item.fleet_truck_type || "").trim() !== truckTypeFilter
      ) {
        return false;
      }

      if (
        dcTypeFilter !== "all" &&
        String(item.dc_type || "").trim() !== dcTypeFilter
      ) {
        return false;
      }

      if (
        dcFilter !== "all" &&
        String(item.dc_code || "").trim() !== dcFilter
      ) {
        return false;
      }

      if (hasRequestDateRange) {
        const requestDateKey = getRequestDateKey(item);
        const startDateKey = formatDateToKey(
          requestDateRange[0].startDate,
        );
        const endDateKey = formatDateToKey(
          requestDateRange[0].endDate,
        );

        if (
          requestDateKey === "ไม่ระบุวันที่" ||
          requestDateKey < startDateKey ||
          requestDateKey > endDateKey
        ) {
          return false;
        }
      }

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
          formatStatusText(item.status),
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
    requestTypeFilter,
    truckTypeFilter,
    dcTypeFilter,
    dcFilter,
    searchText,
    hasRequestDateRange,
    requestDateRange,
  ]);

  const sortedRequests = useMemo(
    () =>
      [...filteredRequests].sort((a, b) => {
        let comparison = 0;

        if (sortConfig.key === "running_doc") {
          comparison = String(a.running_doc || "").localeCompare(
            String(b.running_doc || ""),
            "th",
            { numeric: true, sensitivity: "base" },
          );
        } else {
          const dateA =
            sortConfig.key === "request_date"
              ? getRequestDateKey(a)
              : normalizeDateKey(a.usage_date);

          const dateB =
            sortConfig.key === "request_date"
              ? getRequestDateKey(b)
              : normalizeDateKey(b.usage_date);

          if (dateA === "ไม่ระบุวันที่") {
            return dateB === "ไม่ระบุวันที่" ? 0 : 1;
          }

          if (dateB === "ไม่ระบุวันที่") return -1;

          comparison = dateA.localeCompare(dateB);
        }

        return sortConfig.direction === "asc"
          ? comparison
          : -comparison;
      }),
    [filteredRequests, sortConfig],
  );

  const groupedFilteredByRequestDate = useMemo(
    () =>
      sortedRequests.reduce<Record<string, RequestItem[]>>(
        (groups, item) => {
          const date = getRequestDateKey(item);
          (groups[date] ??= []).push(item);
          return groups;
        },
        {},
      ),
    [sortedRequests],
  );

  const sortedFilteredDates = useMemo(() => {
    const dates = Object.keys(groupedFilteredByRequestDate);

    if (sortConfig.key !== "request_date") return dates;

    return dates.sort((a, b) => {
      if (a === "ไม่ระบุวันที่") {
        return b === "ไม่ระบุวันที่" ? 0 : 1;
      }

      if (b === "ไม่ระบุวันที่") return -1;

      const comparison = a.localeCompare(b);

      return sortConfig.direction === "asc"
        ? comparison
        : -comparison;
    });
  }, [groupedFilteredByRequestDate, sortConfig]);

  const orderedRequests = useMemo(
    () =>
      sortedFilteredDates.flatMap(
        (date) => groupedFilteredByRequestDate[date],
      ),
    [sortedFilteredDates, groupedFilteredByRequestDate],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(orderedRequests.length / pageSize),
  );
  const activePage = Math.min(Math.max(currentPage, 1), totalPages);
  const pageStart = (activePage - 1) * pageSize;

  const paginatedRequests = useMemo(
    () => orderedRequests.slice(pageStart, pageStart + pageSize),
    [orderedRequests, pageStart, pageSize],
  );

  const paginatedGroups = useMemo(() => {
    const groups: Record<string, RequestItem[]> = {};

    for (const item of paginatedRequests) {
      const date = getRequestDateKey(item);
      (groups[date] ??= []).push(item);
    }

    return groups;
  }, [paginatedRequests]);

  const paginatedDates = Object.keys(paginatedGroups);
  const pageGroupOffsets: Record<string, number> = {};
  let groupOffset = 0;

  for (const date of paginatedDates) {
    pageGroupOffsets[date] = groupOffset;
    groupOffset += paginatedGroups[date].length;
  }

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchText,
    statusFilter,
    requestTypeFilter,
    truckTypeFilter,
    dcTypeFilter,
    dcFilter,
    hasRequestDateRange,
    requestDateRange,
    selectedDC,
    userInfo,
    sortConfig,
    pageSize,
  ]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(Math.max(page, 1), totalPages));
  }, [totalPages]);

  const statusCounts = useMemo(() => {
    const summarize = (items: RequestItem[]) => ({
      qty: items.reduce(
        (sum, item) => sum + (Number(item.qty) || 0),
        0,
      ),
      items: items.length,
    });

    return {
      all: summarize(
        warehouseFilteredRequests.filter((item) =>
          isAllowedCardStatus(item.status),
        ),
      ),
      gmPending: summarize(
        warehouseFilteredRequests.filter(
          (item) => normalizeStatus(item.status) === "gm_pending",
        ),
      ),
      rejected: summarize(
        warehouseFilteredRequests.filter(
          (item) => normalizeStatus(item.status) === "reject_by_gm",
        ),
      ),
      fbp_pending: summarize(
        warehouseFilteredRequests.filter(
          (item) => normalizeStatus(item.status) === "fbp_pending",
        ),
      ),
    };
  }, [warehouseFilteredRequests]);

  const selectedDCLabel = useMemo(() => {
    const warehouse = String(
      userInfo?.warehouse ||
        userInfo?.WAREHOUSE ||
        userInfo?.team ||
        userInfo?.TEAM ||
        "",
    )
      .trim()
      .toUpperCase();

    if (warehouse === "CENTER") {
      return "CENTER - ส่วนกลาง / แสดงข้อมูลทั้งหมด";
    }

    if (!selectedDC?.DC_CODE) {
      return warehouse ? `${warehouse} - คลังของฉัน` : "-";
    }

    return selectedDC.DC_NAME
      ? `${selectedDC.DC_CODE} - ${selectedDC.DC_NAME}`
      : selectedDC.DC_CODE;
  }, [selectedDC, userInfo]);

  const handleToggleRequestDatePicker = () => {
    if (!requestDateButtonRef.current) return;

    const rect = requestDateButtonRef.current.getBoundingClientRect();
    const calendarWidth = Math.min(330, window.innerWidth - 32);
    const calendarHeight = 390;
    const gap = 8;
    const padding = 16;

    let top = rect.bottom + gap;
    let left = rect.right - calendarWidth;

    if (
      window.innerHeight - rect.bottom < calendarHeight &&
      rect.top > calendarHeight
    ) {
      top = rect.top - calendarHeight - gap;
    }

    left = Math.max(
      padding,
      Math.min(left, window.innerWidth - calendarWidth - padding),
    );
    top = Math.max(padding, top);

    setRequestDatePickerPosition({ top, left });
    setShowRequestDatePicker((prev) => !prev);
  };

  const clearFilters = () => {
    setSearchText("");
    setRequestTypeFilter("all");
    setTruckTypeFilter("all");
    setDcTypeFilter("all");
    setDcFilter("all");
    setStatusFilter("all");
    clearRequestDate();
    setShowRequestDatePicker(false);
    setCurrentPage(1);
  };

  const selectClass =
    "h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs font-semibold text-slate-700 shadow-sm outline-none transition hover:border-blue-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100/70";

  const labelClass =
    "mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-400";

  const todayKey = formatDateToKey(new Date());

  const statusCards = [
    {
      key: "all",
      label: "ทั้งหมด",
      count: statusCounts.all.qty,
      itemCount: statusCounts.all.items,
      sub: "รวมจำนวนรถทั้งหมด",
      activeClass:
        "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-white ring-slate-400/30",
      inactiveClass:
        "bg-gradient-to-br from-white to-slate-50 text-slate-800 ring-slate-200/80 hover:to-slate-100",
      iconClass: "bg-slate-100 text-slate-600",
      countClass: "text-slate-900",
      dotClass: "bg-slate-400",
      shortLabel: "ALL",
      icon: ClipboardList,
    },
    {
      key: "gm_pending",
      label: "รอ GM อนุมัติ",
      count: statusCounts.gmPending.qty,
      itemCount: statusCounts.gmPending.items,
      sub: "จำนวนรถที่รอการพิจารณาจาก GM",
      activeClass:
        "bg-gradient-to-br from-purple-600 via-violet-600 to-fuchsia-600 text-white ring-purple-300/40",
      inactiveClass:
        "bg-gradient-to-br from-white to-purple-50 text-purple-800 ring-purple-100 hover:to-violet-50",
      iconClass: "bg-purple-100 text-purple-700",
      countClass: "text-purple-900",
      dotClass: "bg-purple-500",
      shortLabel: "GM",
      icon: ShieldCheck,
    },
    {
      key: "reject_by_gm",
      label: "GM ไม่อนุมัติ",
      count: statusCounts.rejected.qty,
      itemCount: statusCounts.rejected.items,
      sub: "จำนวนรถที่ไม่ผ่านการอนุมัติ",
      activeClass:
        "bg-gradient-to-br from-rose-600 via-red-600 to-pink-600 text-white ring-rose-300/40",
      inactiveClass:
        "bg-gradient-to-br from-white to-rose-50 text-rose-800 ring-rose-100 hover:to-red-50",
      iconClass: "bg-rose-100 text-rose-700",
      countClass: "text-rose-900",
      dotClass: "bg-rose-500",
      shortLabel: "RJ",
      icon: CircleX,
    },
    {
      key: "fbp_pending",
      label: "GM อนุมัติแล้ว",
      count: statusCounts.fbp_pending.qty,
      itemCount: statusCounts.fbp_pending.items,
      sub: "จำนวนรถที่ผ่านการอนุมัติแล้ว",
      activeClass:
        "bg-gradient-to-br from-emerald-600 via-green-600 to-teal-500 text-white ring-emerald-300/40",
      inactiveClass:
        "bg-gradient-to-br from-white to-emerald-50 text-emerald-800 ring-emerald-100 hover:to-green-50",
      iconClass: "bg-emerald-100 text-emerald-700",
      countClass: "text-emerald-900",
      dotClass: "bg-emerald-500",
      shortLabel: "OK",
      icon: CircleCheck,
    },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <main className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-4 lg:px-5">
        {/* HEADER */}
        <div className="mb-4 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600 shadow-[0_0_0_4px_rgba(37,99,235,0.12)]" />
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                Fleet Management
              </p>
            </div>

            <h1 className="mt-1.5 flex items-center gap-2 text-base font-semibold text-slate-900 sm:text-lg">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Inbox size={18} />
              </span>
              <span className="truncate">คำขอจากคลัง</span>
            </h1>

            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
                <Warehouse size={12} className="shrink-0" />
                <span className="truncate">{selectedDCLabel}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-600">
                <Filter size={12} />
                {statusFilter === "all"
                  ? "ดูทั้งหมด"
                  : formatStatusText(statusFilter)}
              </span>
            </div>
          </div>

          {/* เลือกวันที่และรีเฟรช */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <input
              type="date"
              aria-label="เลือกวันที่ขอ"
              value={selectedDate}
              max={todayKey}
              onChange={(event) =>
                handleSelectedDateChange(event.target.value)
              }
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-[11px] font-bold text-slate-700 outline-none"
            />

            <button
              type="button"
              disabled={loading}
              onClick={() => void fetchRequests()}
              className="h-9 rounded-lg bg-blue-600 px-3 text-[10px] font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "กำลังโหลด..." : "รีเฟรช"}
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-600"
          >
            {error}
          </div>
        )}

        {/* STATUS CARDS */}
        <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {statusCards.map((card) => {
            const isActive = statusFilter === card.key;
            const BackgroundIcon = card.icon;

            return (
              <button
                key={card.key}
                type="button"
                aria-pressed={isActive}
                onClick={() => setStatusFilter(card.key)}
                className={`group relative overflow-hidden rounded-xl p-3 text-left shadow-sm ring-1 transition hover:shadow-md ${
                  isActive ? card.activeClass : card.inactiveClass
                }`}
              >
                <BackgroundIcon
                  aria-hidden="true"
                  size={88}
                  strokeWidth={1.2}
                  className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${
                    isActive
                      ? "text-white opacity-[0.12]"
                      : "opacity-[0.07]"
                  }`}
                />

                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          isActive ? "bg-white" : card.dotClass
                        }`}
                      />
                      <p className="truncate text-[11px] font-semibold">
                        {card.label}
                      </p>
                    </div>

                    <p
                      className={`mt-1 text-[11px] font-bold ${
                        isActive
                          ? "text-white/60"
                          : "text-slate-400"
                      }`}
                    >
                      {card.sub}
                    </p>
                  </div>

                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-xs font-semibold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : card.iconClass
                    }`}
                  >
                    {card.shortLabel}
                  </div>
                </div>

                <div className="relative mt-3 flex items-end justify-between">
                  <p
                    className={`text-2xl font-semibold tracking-tight ${
                      isActive ? "text-white" : card.countClass
                    }`}
                  >
                    {formatNumber(card.count)}
                    <span className="ml-1 text-xs opacity-60">คัน</span>
                  </p>

                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      isActive
                        ? "bg-white/15 text-white"
                        : "bg-white/80 text-slate-400"
                    }`}
                  >
                    {formatNumber(card.itemCount)} รายการ
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* FILTERS */}
        <div className="relative z-30 mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <SlidersHorizontal size={16} />
              </span>

              <div>
                <p className="text-xs font-semibold text-slate-800">
                  ค้นหาและตัวกรอง
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  เลือกเงื่อนไขเพื่อค้นหารายการคำขอ
                </p>
              </div>
            </div>

            <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-100">
              พบ {filteredRequests.length} รายการ
            </span>
          </div>

          <div className="grid gap-3 lg:grid-cols-12">
            <div className="lg:col-span-3">
              <label className={labelClass}>ค้นหา</label>
              <div className="relative">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-400"
                />
                <input
                  type="text"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="เลขเอกสาร, DC, ผู้ขอ, ทะเบียน..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100/70"
                />
                {searchText && (
                  <button
                    type="button"
                    aria-label="ล้างคำค้นหา"
                    onClick={() => setSearchText("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="lg:col-span-2">
              <label className={labelClass}>ประเภทคำขอ</label>
              <div className="relative">
                <Filter
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-400"
                />
                <select
                  aria-label="ประเภทคำขอ"
                  value={requestTypeFilter}
                  onChange={(event) => {
                    setRequestTypeFilter(event.target.value);
                    setTruckTypeFilter("all");
                  }}
                  className={selectClass}
                >
                  <option value="all">ทุกประเภทคำขอ</option>
                  {requestTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>

            <div className="lg:col-span-2">
              <label className={labelClass}>ประเภทรถ</label>
              <div className="relative">
                <Truck
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-400"
                />
                <select
                  aria-label="ประเภทรถ"
                  value={truckTypeFilter}
                  onChange={(event) =>
                    setTruckTypeFilter(event.target.value)
                  }
                  className={selectClass}
                >
                  <option value="all">ทุกประเภทรถ</option>
                  {truckTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>

            <div className="lg:col-span-1">
              <label className={labelClass}>DC Type</label>
              <div className="relative">
                <Filter
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-400"
                />
                <select
                  aria-label="DC Type"
                  value={dcTypeFilter}
                  onChange={(event) => {
                    setDcTypeFilter(event.target.value);
                    setDcFilter("all");
                  }}
                  className={selectClass}
                >
                  <option value="all">ทุก DC Type</option>
                  {dcTypeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>

            <div className="lg:col-span-1">
              <label className={labelClass}>DC</label>
              <div className="relative">
                <Warehouse
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-400"
                />
                <select
                  aria-label="DC"
                  value={dcFilter}
                  onChange={(event) => setDcFilter(event.target.value)}
                  className={selectClass}
                >
                  <option value="all">ทุก DC</option>
                  {dcOptions.map((dc) => (
                    <option key={dc} value={dc}>
                      {dc}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={13}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>
            </div>

            <div className="lg:col-span-2">
              <label className={labelClass}>วันที่ขอ</label>

              <div className="relative">
                <CalendarDays
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-400"
                />
                <button
                  ref={requestDateButtonRef}
                  type="button"
                  onClick={handleToggleRequestDatePicker}
                  className={`h-10 w-full truncate rounded-xl border pl-9 pr-9 text-left text-xs font-semibold outline-none ${
                    hasRequestDateRange
                      ? "border-blue-300 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  {formatThaiDateRange()}
                </button>

                {hasRequestDateRange && (
                  <button
                    type="button"
                    aria-label="ล้างวันที่ขอ"
                    onClick={clearRequestDate}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-end lg:col-span-1">
              <button
                type="button"
                onClick={clearFilters}
                className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              >
                <Eraser size={13} />
                <span>ล้าง</span>
              </button>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-blue-50/70 px-3 py-1.5 text-[11px] font-bold text-blue-500 sm:hidden">
            เลื่อนซ้าย–ขวาเพื่อดูข้อมูลทั้งหมด →
          </div>

          <div className="max-h-[70vh] min-h-[360px] overflow-auto [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-width:thin]">
            <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left">
              <thead className="sticky top-0 z-20">
                <tr className="bg-blue-800 text-[11px] font-semibold uppercase tracking-wider text-white">
                  {[
                    "ลำดับ",
                    "เลขที่เอกสาร",
                    "DC Type",
                    "DC",
                    "ประเภทคำขอ",
                    "ประเภทรถ",
                    "ทะเบียนทดแทน",
                    "จำนวน",
                    "วันที่ใช้งาน",
                    "ผู้ขอ",
                    "สถานะ",
                    "รายละเอียด",
                  ].map((col, index) => {
                    const sortKey: SortKey | null =
                      col === "เลขที่เอกสาร"
                        ? "running_doc"
                        : col === "วันที่ใช้งาน"
                          ? "usage_date"
                          : null;

                    return (
                      <th
                        key={col}
                        className={`whitespace-nowrap bg-blue-800 px-3 py-3 ${
                          index === 0
                            ? "sticky left-0 z-30 w-[52px] text-center"
                            : ""
                        } ${index === 11 ? "text-right" : ""}`}
                      >
                        {sortKey ? (
                          <button
                            type="button"
                            onClick={() => handleSort(sortKey)}
                            className="inline-flex items-center gap-1.5"
                          >
                            {col}
                            {renderSortIcon(sortKey)}
                          </button>
                        ) : (
                          col
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center">
                      <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500" />
                      <p className="text-xs text-slate-400">
                        กำลังโหลดข้อมูล...
                      </p>
                    </td>
                  </tr>
                ) : orderedRequests.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center">
                      <p className="text-sm font-bold text-slate-400">
                        ไม่พบข้อมูลตามเงื่อนไขนี้
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedDates.map((date) => (
                    <Fragment key={date}>
                      <tr>
                        <td
                          colSpan={12}
                          className="bg-gradient-to-r from-blue-50/80 to-slate-50 px-4 py-2"
                        >
                          <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-blue-600">
                            <button
                              type="button"
                              onClick={() => handleSort("request_date")}
                              className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 hover:bg-blue-100"
                              title="กดเพื่อเรียงวันที่ขอ"
                            >
                              <CalendarDays size={13} />
                              <span>
                                วันที่ขอ: {formatThaiDate(date)}
                              </span>
                              {renderSortIcon("request_date")}
                            </button>

                            {date === todayKey && (
                              <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-white">
                                New
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {paginatedGroups[date].map((item, index) => {
                        const status = item.status || "pending";
                        const normalizedStatus = normalizeStatus(status);
                        const visual = getStatusVisual(status);
                        const isPending =
                          normalizedStatus === "gm_pending";

                        const rowKey =
                          item.id !== null && item.id !== undefined
                            ? String(item.id)
                            : item.running_doc || `${date}-${index}`;

                        const licenses = getLicenseList(
                          item.license_replace,
                        );
                        const qty = getQtySummary(item);

                        return (
                          <tr
                            key={rowKey}
                            className="group bg-white text-xs transition hover:bg-blue-50/30"
                          >
                            <td className="sticky left-0 z-10 bg-white px-3 py-3 text-center group-hover:bg-blue-50">
                              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-1 text-[11px] font-semibold text-slate-500">
                                {pageStart +
                                  pageGroupOffsets[date] +
                                  index +
                                  1}
                              </span>
                            </td>

                            <td className="whitespace-nowrap px-3 py-3">
                              <p className="font-semibold text-slate-800">
                                {item.running_doc || "-"}
                              </p>
                              <p className="mt-0.5 text-[11px] text-slate-400">
                                ใช้: {formatThaiDate(item.usage_date)}
                              </p>
                            </td>

                            <td className="whitespace-nowrap px-3 py-3">
                              <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600 ring-1 ring-blue-100">
                                {item.dc_type || "-"}
                              </span>
                            </td>

                            <td className="whitespace-nowrap px-3 py-3">
                              <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 ring-1 ring-emerald-100">
                                {item.dc_code || "-"}
                              </span>
                            </td>

                            <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-700">
                              {item.fleet_type || "-"}
                            </td>

                            <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-700">
                              {item.fleet_truck_type || "-"}
                            </td>

                            <td className="max-w-[150px] px-3 py-3">
                              {licenses.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {licenses.slice(0, 2).map((lic, li) => (
                                    <span
                                      key={`${rowKey}-lic-${li}`}
                                      title={lic}
                                      className="inline-block max-w-[86px] truncate rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200"
                                    >
                                      {lic}
                                    </span>
                                  ))}

                                  {licenses.length > 2 && (
                                    <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-500">
                                      +{licenses.length - 2}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>

                            <td className="px-3 py-3">
                              {normalizedStatus === "reject_by_gm" ||
                              normalizedStatus === "fbp_pending" ? (
                                <div className="grid min-w-[190px] grid-cols-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                  <div className="px-2 py-2 text-center">
                                    <p className="text-[11px] font-bold text-slate-400">
                                      จำนวนขอ
                                    </p>
                                    <p className="mt-0.5 font-semibold text-slate-700">
                                      {formatNumber(qty.requestedQty)}
                                    </p>
                                  </div>

                                  <div className="border-l border-slate-100 bg-emerald-50 px-2 py-2 text-center">
                                    <p className="text-[11px] font-bold text-emerald-500">
                                      อนุมัติ
                                    </p>
                                    <p className="mt-0.5 font-semibold text-emerald-700">
                                      {formatNumber(qty.approvedQty)}
                                    </p>
                                  </div>

                                  <div className="border-l border-slate-100 bg-rose-50 px-2 py-2 text-center">
                                    <p className="text-[11px] font-bold text-rose-500">
                                      ไม่อนุมัติ
                                    </p>
                                    <p className="mt-0.5 font-semibold text-rose-700">
                                      {formatNumber(qty.notApprovedQty)}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center">
                                  <span className="rounded-xl bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                                    {formatNumber(item.qty)}
                                  </span>
                                </div>
                              )}
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
                                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${visual.dotClass}`}
                                />
                                <div>
                                  <p
                                    className={`text-[11px] font-semibold ${visual.textClass}`}
                                  >
                                    {formatStatusText(status)}
                                  </p>
                                  <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                                    {visual.hint}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="whitespace-nowrap px-3 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => setGmModalItem(item)}
                                className={
                                  isPending
                                    ? "inline-flex h-9 min-w-[130px] items-center justify-center gap-2 rounded-xl bg-blue-700 px-3 text-[11px] font-semibold text-white shadow-md transition hover:bg-blue-800"
                                    : "inline-flex h-9 min-w-[130px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
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

          {/* PAGINATION */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">
                แสดง
              </span>

              <select
                aria-label="จำนวนรายการต่อหน้า"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setCurrentPage(1);
                }}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold"
              >
                {[20, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size} รายการ
                  </option>
                ))}
              </select>

              <span className="text-xs text-slate-400">
                แสดง {orderedRequests.length === 0 ? 0 : pageStart + 1}
                –{Math.min(pageStart + pageSize, orderedRequests.length)}
                {" "}จากทั้งหมด{" "}
                {orderedRequests.length.toLocaleString("th-TH")} รายการ
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={loading || activePage <= 1}
                onClick={() =>
                  setCurrentPage(Math.max(activePage - 1, 1))
                }
                className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 disabled:opacity-40"
              >
                ก่อนหน้า
              </button>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <span>หน้า</span>
                <select
                  aria-label="เลือกหน้า"
                  value={activePage}
                  disabled={loading || orderedRequests.length === 0}
                  onChange={(event) =>
                    setCurrentPage(Number(event.target.value))
                  }
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold disabled:opacity-40"
                >
                  {Array.from({ length: totalPages }, (_, index) => (
                    <option key={index + 1} value={index + 1}>
                      {index + 1}
                    </option>
                  ))}
                </select>
                <span>/ {totalPages}</span>
              </div>

              <button
                type="button"
                disabled={loading || activePage >= totalPages}
                onClick={() =>
                  setCurrentPage(Math.min(activePage + 1, totalPages))
                }
                className="h-9 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white disabled:opacity-40"
              >
                ถัดไป
              </button>
            </div>
          </div>
        </div>

        <style jsx>{`
          main :global(button:focus-visible),
          main :global(select:focus-visible),
          main :global(input:focus-visible) {
            outline: 2px solid #2563eb;
            outline-offset: 3px;
          }

          @media (prefers-reduced-motion: reduce) {
            main :global(*) {
              transition: none !important;
              animation: none !important;
            }
          }
        `}</style>
      </main>

      {/* DATE PICKER */}
      {portalTarget &&
        showRequestDatePicker &&
        createPortal(
          <div
            ref={requestDatePickerRef}
            className="fixed z-[99999] w-[330px] max-w-[calc(100vw-32px)] overflow-auto rounded-2xl border border-blue-100 bg-white text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.22)]"
            style={{
              top: requestDatePickerPosition.top,
              left: requestDatePickerPosition.left,
              maxHeight: `calc(100dvh - ${requestDatePickerPosition.top + 16}px)`,
            }}
          >
            <div className="flex items-center justify-between bg-blue-50 px-4 py-2.5">
              <div>
                <p className="text-xs font-semibold text-blue-700">
                  เลือกช่วงวันที่ขอ
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Start Date – End Date
                </p>
              </div>

              {hasRequestDateRange && (
                <button
                  type="button"
                  onClick={clearRequestDate}
                  className="rounded-lg bg-white px-2 py-1 text-[11px] font-semibold text-blue-600"
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
                if (!selection) return;

                const startDate = selection.startDate || new Date();
                const endDate = selection.endDate || startDate;

                setRequestDateRange([
                  {
                    startDate,
                    endDate,
                    key: "selection",
                  },
                ]);

                setHasRequestDateRange(true);

                // วันเดียวกันแสดงในช่องวันที่ด้านบนได้
                // หากเป็นช่วงหลายวัน ให้แสดงเฉพาะในปุ่มช่วงวันที่
                setSelectedDate(
                  formatDateToKey(startDate) === formatDateToKey(endDate)
                    ? formatDateToKey(startDate)
                    : "",
                );
              }}
              showDateDisplay={false}
              showPreview={false}
              maxDate={new Date()}
              rangeColors={["#2563eb"]}
            />

            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2.5">
              <p className="truncate pr-3 text-[11px] font-bold text-blue-600">
                {hasRequestDateRange
                  ? formatThaiDateRange()
                  : "เลือกวันเริ่มต้น–สิ้นสุด"}
              </p>
              <button
                type="button"
                onClick={() => setShowRequestDatePicker(false)}
                className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700"
              >
                เสร็จสิ้น
              </button>
            </div>
          </div>,
          portalTarget,
        )}

      {/* GM MODAL */}
      {portalTarget &&
        gmModalItem &&
        createPortal(
          <div style={{ position: "relative", zIndex: 100000 }}>
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
          </div>,
          portalTarget,
        )}
    </div>
  );
}
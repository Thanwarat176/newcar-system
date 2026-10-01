"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { DateRange, RangeKeyDict } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { th } from "date-fns/locale";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  Download,
  Eraser,
  Filter,
  Search,
  SlidersHorizontal,
  Truck,
  Warehouse,
  X,
} from "lucide-react";
import FlowAssessmentModal from "./component/FlowAssessmentModal";
import ExportTrackFleet from "./component/ExportTrackFleet";

interface SelectedDC {
  DC_CODE?: string;
  DC_NAME?: string;
  DC_TYPE?: string;
  dc_code?: string;
  dc_name?: string;
  dc_type?: string;
}

interface RequestItem {
  id: string | number | null;
  running_doc: string;
  dc_type: string;
  dc_code: string;
  date: string;
  request_date?: string;
  request_id?: number | string | null;
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

  success_qty?: number | string | null;
  details?: RequestDetailItem[];
  latest_process_name?: string | null;
  latest_process_level?: string | number | null;

  running_doc_vehicle_no?: string;
  vehicle_no?: string | number;
  vehicle_license?: string;
  current_step?: number;
  total_steps?: number;
  current_process?: string;
  vehicle_warehouse_info?: VehicleWarehouseInfo[];
  vehicle_info?: VehicleWarehouseInfo | null;

  // New fields from track_fleet_get.php
  incoming_truck_id?: number;
  new_truck_type?: string;
  new_vendor_id?: string;
  new_vendor_name?: string;
  car_chassis?: string;
  car_engine?: string;
  car_license?: string;
  unit_code?: string;
  replaced_old_licenses?: string[];
}

interface VehicleWarehouseInfo {
  vehicle_no?: string | number | null;
  car_chassis?: string | null;
  car_model?: string | null;
  car_brand?: string | null;
  car_engine?: string | null;
  car_license?: string | null;
}

interface RequestDetailItem {
  id: string;
  request_id: string;
  license: string | null;
  province: string | null;
  truck_type: string | null;
  company_id: string | null;
  company_name: string | null;
  license_replace: string | null;
  province_replace: string | null;
  truck_type_replace: string | null;
  company_id_replace: string | null;
  company_name_replace: string | null;
  status: string;
  warehouse_info?: VehicleWarehouseInfo | null;
}

interface UserInfo {
  warehouse?: string;
  WAREHOUSE?: string;
  team?: string;
  TEAM?: string;
}

type StatusFilter = "all" | "progress" | "cancel" | "success";

const normalizeStatus = (status?: string) => {
  return String(status || "").trim().toLowerCase();
};

const getProcessStatus = (item: RequestItem) => {
  const step = Number(
    item.current_step ?? item.latest_process_level ?? 0
  );
  const totalSteps = Number(item.total_steps || 8);
  const process = String(
    item.current_process ||
    item.latest_process_name ||
    "ยังไม่พบข้อมูลขั้นตอน"
  ).trim();
  const isRejected = normalizeStatus(item.status) === "cancel";

  return {
    value: `${step}|${process}`,
    label: isRejected
      ? process
      : `${step}/${totalSteps} : ${process}`,
  };
};

const formatVehicleValue = (value?: string | null) => {
  if (value === null || value === undefined || value.trim() === "") {
    return "ไม่มีข้อมูล ❌";
  }

  return value;
};

export default function TrackFleetPage() {
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
  const [vehicleSearchInput, setVehicleSearchInput] = useState("");
  const [vehicleSearchItems, setVehicleSearchItems] = useState<string[]>([]);
  const [debouncedSearchText, setDebouncedSearchText] = useState("");

  const [fleetTypeFilter, setFleetTypeFilter] = useState("all");
  const [truckTypeFilter, setTruckTypeFilter] = useState("all");
  const [currentProcessFilter, setCurrentProcessFilter] = useState("all");
  const [dcTypeFilter, setDcTypeFilter] = useState("all");
  const [dcFilter, setDcFilter] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [documentSort, setDocumentSort] = useState<"asc" | "desc" | null>(null);
  const [openExportModal, setOpenExportModal] = useState(false);
  const [exportApiUrl, setExportApiUrl] = useState("");

  const [summary, setSummary] = useState({
    all: { qty: 0, items: 0 },
    progress: { qty: 0, items: 0 },
    cancel: { qty: 0, items: 0 },
    success: { qty: 0, items: 0 },
  });

  const [filterOptions, setFilterOptions] = useState<{
    fleet_types: string[];
    truck_types: string[];
    dc_types: string[];
    dc_codes: string[];
    process_options: { value: string; label: string }[];
  }>({
    fleet_types: [],
    truck_types: [],
    dc_types: [],
    dc_codes: [],
    process_options: [],
  });

  const [pagination, setPagination] = useState({
    total_vehicles: 0,
    total_records: 0,
    page: 1,
    limit: 20,
    total_pages: 1,
  });

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

  // Debounce การค้นหาตัวอักษร 250ms เพื่อให้พิมพ์พิมพ์ได้อย่างลื่นไหล
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchText]);

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

  const formatDateToKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const apiBase = "http://192.168.158.210/api_new_truck/api/track_fleet_get.php";

      const params = new URLSearchParams();
      params.set("group_mode", "incoming");

      const activeWarehouse = selectedDcFromSidebar || userWarehouse;
      if (activeWarehouse && activeWarehouse !== "CENTER") {
        params.set("warehouse", activeWarehouse);
      }

      if (userInfo?.team || userInfo?.TEAM) {
        params.set("user_type", String(userInfo?.team || userInfo?.TEAM));
      }

      if (statusFilter !== "all") params.set("status", statusFilter);
      if (dcTypeFilter !== "all") params.set("dc_type", dcTypeFilter);
      if (dcFilter !== "all") params.set("dc_code", dcFilter);
      if (fleetTypeFilter !== "all") params.set("fleet_type", fleetTypeFilter);
      if (truckTypeFilter !== "all") params.set("truck_type", truckTypeFilter);
      if (currentProcessFilter !== "all") params.set("process", currentProcessFilter);

      if (debouncedSearchText.trim()) params.set("search", debouncedSearchText.trim());
      if (vehicleSearchItems.length > 0) {
        params.set(
          "vehicle_search",
          vehicleSearchItems.join(",")
        );
      }
      if (hasRequestDateRange) {
        const startDateKey = formatDateToKey(requestDateRange[0].startDate);
        const endDateKey = formatDateToKey(requestDateRange[0].endDate);
        params.set("start_date", startDateKey);
        params.set("end_date", endDateKey);
      }

      params.set("page", String(currentPage));
      params.set("limit", String(pageSize));

      const requestUrl = `${apiBase}?${params.toString()}`;
      const response = await fetch(
        requestUrl,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
          `ไม่สามารถดึงข้อมูลได้ (${response.status}): ${errorText}`
        );
      }

      const json = await response.json();

      if (json.status === "success") {
        setExportApiUrl(requestUrl);
        setRequests(json.data || []);
        const progressSummary = json.summary?.progress || { qty: 0, items: 0 };
        const cancelSummary = json.summary?.cancel || { qty: 0, items: 0 };
        const successSummary = json.summary?.success || { qty: 0, items: 0 };
        setSummary({
          all: {
            qty: Number(progressSummary.qty) + Number(cancelSummary.qty) + Number(successSummary.qty),
            items: Number(progressSummary.items) + Number(cancelSummary.items) + Number(successSummary.items),
          },
          progress: progressSummary,
          cancel: cancelSummary,
          success: successSummary,
        });
        setFilterOptions({
          fleet_types: json.filters?.fleet_types || [],
          truck_types: json.filters?.truck_types || [],
          dc_types: json.filters?.dc_types || [],
          dc_codes: json.filters?.dc_codes || [],
          process_options: json.filters?.process_options || [],
        });
        const totalVehicles = Number(
          json.pagination?.total_vehicles ??
          json.pagination?.total_records ??
          0
        );

        const responsePage = Math.max(
          1,
          Number(json.pagination?.page ?? currentPage),
        );

        const responseLimit = Math.max(
          1,
          Number(json.pagination?.limit ?? pageSize),
        );

        const totalPages = Math.max(
          1,
          Number(
            json.pagination?.total_pages ??
            Math.ceil(totalVehicles / responseLimit),
          ),
        );

        setPagination({
          total_vehicles: totalVehicles,
          total_records: Number(
            json.pagination?.total_records ?? totalVehicles,
          ),
          page: responsePage,
          limit: responseLimit,
          total_pages: totalPages,
        });

        // ให้เลขหน้าตรงกับ API เมื่อ API ปรับหน้าที่เกินกลับมา
        if (responsePage !== currentPage) {
          setCurrentPage(responsePage);
        }
        setPagination({
          total_vehicles: totalVehicles,
          total_records: Number(
            json.pagination?.total_records ?? totalVehicles
          ),
          page: Number(json.pagination?.page ?? currentPage),
          limit: Number(json.pagination?.limit ?? pageSize),
          total_pages: Math.max(1, Math.ceil(totalVehicles / pageSize)),
        });
      } else {
        throw new Error(json.message || "เกิดข้อผิดพลาดในการดึงข้อมูลจาก API");
      }
    } catch (err) {
      console.error("fetchRequests error:", err);
      if ((err as Error).name !== "AbortError") {
        setError(
          err instanceof Error
            ? err.message
            : "เกิดข้อผิดพลาดในการดึงข้อมูลจาก API"
        );
        setRequests([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [
    selectedDcFromSidebar,
    userWarehouse,
    statusFilter,
    dcTypeFilter,
    dcFilter,
    fleetTypeFilter,
    truckTypeFilter,
    currentProcessFilter,
    debouncedSearchText,
    vehicleSearchItems,
    hasRequestDateRange,
    requestDateRange,
    currentPage,
    pageSize,
  ]);

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

  const getRemainingUsageDaysClass = (usageDate?: string) => {
    if (!usageDate) return "text-slate-400";

    const dateKey = normalizeDateKey(usageDate);

    if (dateKey === "ไม่ระบุวันที่") {
      return "text-slate-400";
    }

    const [year, month, day] = dateKey.split("-").map(Number);

    const targetDate = new Date(year, month - 1, day);
    const today = new Date();

    targetDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const remainingDays = Math.round(
      (targetDate.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
    );

    if (remainingDays < 0) {
      return "text-red-600";
    }

    if (remainingDays <= 10) {
      return "text-orange-600";
    }

    return "text-emerald-600";
  };

  const getRemainingUsageDays = (usageDate?: string) => {
    if (!usageDate) return "ไม่ระบุวันที่";

    const dateKey = normalizeDateKey(usageDate);

    if (dateKey === "ไม่ระบุวันที่") {
      return "ไม่ระบุวันที่";
    }

    const [year, month, day] = dateKey.split("-").map(Number);

    const targetDate = new Date(year, month - 1, day);
    const today = new Date();

    targetDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const remainingDays = Math.round(
      (targetDate.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24)
    );

    if (remainingDays > 0) {
      return `เหลืออีก ${remainingDays} วัน`;
    }

    if (remainingDays === 0) {
      return "ถึงกำหนดวันนี้";
    }

    return `เกินกำหนด ${Math.abs(remainingDays)} วัน`;
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

  const pageTitle = useMemo(() => {
    const dcSuffix =
      isCenterUser && dcFilter !== "all"
        ? `ของ ${dcFilter}`
        : !isCenterUser && selectedDcFromSidebar
          ? `ของ ${selectedDcFromSidebar}`
          : "";

    if (statusFilter === "progress") {
      return `รายการคำขอรอพิจารณา (TCAS)${dcSuffix}`;
    }

    if (statusFilter === "cancel") {
      return `รายการไม่ผ่านกระบวนการ${dcSuffix}`;
    }

    if (statusFilter === "success") {
      return `รายการTCAS ${dcSuffix}`;
    }

    return `รายการติดตามกองรถออกใหม่/ทดแทน${dcSuffix}`;
  }, [
    statusFilter,
    dcFilter,
    isCenterUser,
    selectedDcFromSidebar,
  ]);

  // Backend กรองข้อมูลทั้งหมดก่อนแบ่งหน้าแล้ว
  // ไม่กรองซ้ำใน Frontend เพราะ requests มีเฉพาะข้อมูลของหน้าปัจจุบัน
  const filteredRequests = requests;

  // แสดงตัวเลือกขั้นตอนให้สัมพันธ์กับ Card ที่เลือก
  const visibleProcessOptions = useMemo(() => {
    if (statusFilter === "all") {
      return filterOptions.process_options;
    }

    return filterOptions.process_options.filter((option) => {
      const step = Number(String(option.value).split("|")[0]);

      if (statusFilter === "success") {
        return step === 8;
      }

      if (statusFilter === "cancel") {
        return step === 9 || step === 10;
      }

      return step >= 0 && step < 8;
    });
  }, [filterOptions.process_options, statusFilter]);

  const groupedByRequestDate = useMemo(() => {
    const groups = filteredRequests.reduce<Record<string, RequestItem[]>>(
      (groups, item) => {
        const dateKey = normalizeDateKey(item.request_date || item.date);

        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }

        groups[dateKey].push(item);

        return groups;
      },
      {}
    );

    if (documentSort) {
      const collator = new Intl.Collator("th", {
        numeric: true,
        sensitivity: "base",
      });

      Object.values(groups).forEach((items) => {
        items.sort((a, b) => {
          const documentA = String(
            a.running_doc_vehicle_no ||
            `${a.running_doc}_${a.vehicle_no ?? ""}`
          );
          const documentB = String(
            b.running_doc_vehicle_no ||
            `${b.running_doc}_${b.vehicle_no ?? ""}`
          );
          const result = collator.compare(documentA, documentB);

          return documentSort === "asc" ? result : -result;
        });
      });
    }

    return groups;
  }, [filteredRequests, documentSort]);

  const sortedDates = useMemo(() => {
    return Object.keys(groupedByRequestDate).sort((a, b) => {
      if (a === "ไม่ระบุวันที่") return 1;
      if (b === "ไม่ระบุวันที่") return -1;

      const timeA = new Date(a).getTime();
      const timeB = new Date(b).getTime();

      if (Number.isNaN(timeA)) return 1;
      if (Number.isNaN(timeB)) return -1;

      return timeB - timeA;
    });
  }, [groupedByRequestDate]);

  const selectedDcLabel = useMemo(() => {
    if (selectedDcFromSidebar === "CENTER") {
      return "CENTER - ส่วนกลาง / แสดงข้อมูลทั้งหมด";
    }

    if (!selectedDcFromSidebar) {
      return "ไม่ได้เลือก DC จาก Sidebar / แสดงทั้งหมด";
    }

    return `${selectedDcFromSidebar}${selectedDcNameFromSidebar ? ` - ${selectedDcNameFromSidebar}` : ""
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

  const addVehicleSearchItems = (value: string) => {
    const newItems = value
      .split(/[,;\n]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (newItems.length === 0) return;

    setVehicleSearchItems((previousItems) => {
      const combinedItems = [...previousItems, ...newItems];

      return combinedItems.filter(
        (item, index, array) =>
          array.findIndex(
            (currentItem) =>
              currentItem.toLowerCase() === item.toLowerCase()
          ) === index
      );
    });

    setVehicleSearchInput("");
    setCurrentPage(1);
  };

  const removeVehicleSearchItem = (itemToRemove: string) => {
    setVehicleSearchItems((previousItems) =>
      previousItems.filter(
        (item) => item !== itemToRemove
      )
    );

    setCurrentPage(1);
  };

  const handleVehicleSearchKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addVehicleSearchItems(vehicleSearchInput);
    }

    if (
      event.key === "Backspace" &&
      !vehicleSearchInput &&
      vehicleSearchItems.length > 0
    ) {
      setVehicleSearchItems((previousItems) =>
        previousItems.slice(0, -1)
      );

      setCurrentPage(1);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe_0,#f5f7fb_32%,#f8fafc_100%)]">
      <main className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-4 lg:px-5">
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
              <span className="truncate">ติดตามกองรถออกใหม่/ทดแทน</span>
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
                  : statusFilter === "progress"
                    ? "TCAS คำขอรอพิจารณา (TCAS)"
                    : statusFilter === "cancel"
                      ? "ไม่ผ่านกระบวนการ"
                      : "TCAS อนุมัติแล้ว"}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setOpenExportModal(true)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-900 via-accent-900 to-green-800 px-4 text-sm font-black text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
            >
              <Download size={16} />
              ดึงรายงาน
            </button>

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
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-600 shadow-[0_10px_30px_rgba(239,68,68,0.1)]">
            {error}
          </div>
        )}

        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(
            [
              {
                key: "all",
                label: "ทั้งหมด",
                count: summary.all.qty,
                itemCount: summary.all.items,
                sub: "รวมจำนวนรถทั้งหมด",
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
                key: "progress",
                label: "คำขอรอพิจารณา (TCAS)",
                count: summary.progress.qty,
                itemCount: summary.progress.items,
                sub: "จำนวนรถที่รอการพิจารณา",
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
                key: "cancel",
                label: "ไม่ผ่านกระบวนการ",
                count: summary.cancel.qty,
                itemCount: summary.cancel.items,
                sub: "จำนวนรถที่ไม่ผ่านกระบวนการ",
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
                key: "success",
                label: "เสร็จสิ้นกระบวนการ ",
                count: summary.success.qty,
                itemCount: summary.success.items,
                sub: "จำนวนรถที่เสร็จสิ้นกระบวนการ",
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
              itemCount,
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
                  onClick={() => {
                    setStatusFilter(key);
                    setCurrentProcessFilter("all");
                    setCurrentPage(1);
                  }}
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
                      {formatNumber(count)}
                      <span className="ml-1 text-sm font-black opacity-60">
                        คัน
                      </span>
                    </p>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black ${isActive
                        ? "bg-white/15 text-white"
                        : "bg-white/80 text-slate-400 shadow-sm"
                        }`}
                    >
                      {formatNumber(itemCount)} รายการ
                    </span>
                  </div>
                </button>
              );
            }
          )}
        </div>

        <div className="relative z-30 mb-4 w-full min-w-0 overflow-visible rounded-2xl border border-slate-200/70 bg-gradient-to-b from-slate-50/90 to-white px-3 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.07)] sm:px-4 lg:px-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20">
                <SlidersHorizontal size={16} />
              </span>

              <div className="min-w-0">
                <p className="text-sm font-black text-slate-800">
                  ค้นหาและตัวกรอง
                </p>
                <p className="mt-0.5 text-[10px] font-medium leading-relaxed text-slate-400 sm:truncate">
                  เลือกเงื่อนไขเพื่อค้นหารายการติดตามกองรถออกใหม่/ทดแทน
                </p>
              </div>
            </div>

            <span className="w-fit shrink-0 rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-slate-500 shadow-sm ring-1 ring-slate-100">
              พบ {formatNumber(pagination.total_vehicles)} คัน
            </span>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-12">
            <div className="min-w-0 md:col-span-2 lg:col-span-6 xl:col-span-4">
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
                  onChange={(e) => {
                    setSearchText(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="เลขเอกสาร, DC, ผู้ขอ, ทะเบียน..."
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-xs font-semibold text-slate-700 shadow-sm outline-none transition placeholder:text-slate-300 hover:border-blue-200 hover:shadow-md focus:border-blue-400 focus:ring-4 focus:ring-blue-100/70"
                />

                {searchText && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchText("");
                      setCurrentPage(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 transition hover:text-rose-500"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="min-w-0 md:col-span-2 lg:col-span-6 xl:col-span-4">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                ข้อมูลรถหลายรายการ
              </label>

              <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:border-blue-200 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100/70">
                <Truck size={14} className="shrink-0 text-blue-400" />

                {vehicleSearchItems.map((item) => (
                  <span
                    key={item}
                    className="flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700"
                  >
                    {item}

                    <button
                      type="button"
                      onClick={() => removeVehicleSearchItem(item)}
                      className="text-blue-400 transition hover:text-rose-500"
                      aria-label={`ลบ ${item}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}

                <input
                  type="text"
                  value={vehicleSearchInput}
                  onChange={(event) => setVehicleSearchInput(event.target.value)}
                  onKeyDown={handleVehicleSearchKeyDown}
                  onBlur={() => addVehicleSearchItems(vehicleSearchInput)}
                  onPaste={(event) => {
                    const pastedText = event.clipboardData.getData("text");

                    if (/[,;\n]/.test(pastedText)) {
                      event.preventDefault();
                      addVehicleSearchItems(pastedText);
                    }
                  }}
                  placeholder={
                    vehicleSearchItems.length === 0
                      ? "พิมพ์ทะเบียน รหัสรถ รุ่น หรือยี่ห้อ"
                      : "เพิ่มรายการ..."
                  }
                  className="min-w-[140px] flex-1 bg-transparent py-1 text-xs font-semibold text-slate-700 outline-none placeholder:text-slate-300 sm:min-w-[180px]"
                />

                {vehicleSearchItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setVehicleSearchItems([]);
                      setVehicleSearchInput("");
                      setCurrentPage(1);
                    }}
                    className="shrink-0 text-slate-300 transition hover:text-rose-500"
                    aria-label="ล้างข้อมูลรถทั้งหมด"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <p className="mt-1 text-[10px] text-slate-400">
                กด Enter หรือลูกน้ำเพื่อเพิ่มรายการ
              </p>
            </div>

            <div className="min-w-0 lg:col-span-3 xl:col-span-2">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                ประเภทคำขอ
              </label>

              <div className="relative">
                <Filter
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-400"
                />
                <select
                  value={fleetTypeFilter}
                  onChange={(e) => {
                    setFleetTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs font-semibold text-slate-700 shadow-sm outline-none transition hover:border-blue-200 hover:shadow-md focus:border-blue-400 focus:ring-4 focus:ring-blue-100/70"
                >
                  <option value="all">ทุกประเภทคำขอ</option>
                  {filterOptions.fleet_types.map((fleetType) => (
                    <option key={fleetType} value={fleetType}>
                      {fleetType}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">
                  ▼
                </span>
              </div>
            </div>

            <div className="min-w-0 lg:col-span-3 xl:col-span-2">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                ประเภทรถ
              </label>

              <div className="relative">
                <Truck
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-400"
                />
                <input
                  type="text"
                  list="truck-type-filter-options"
                  value={truckTypeFilter === "all" ? "" : truckTypeFilter}
                  onChange={(e) => {
                    setTruckTypeFilter(e.target.value || "all");
                    setCurrentPage(1);
                  }}
                  placeholder="พิมพ์ค้นหาประเภทรถ"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-semibold text-slate-700 shadow-sm outline-none transition placeholder:text-slate-300 hover:border-blue-200 hover:shadow-md focus:border-blue-400 focus:ring-4 focus:ring-blue-100/70"
                />
                <datalist id="truck-type-filter-options">
                  {filterOptions.truck_types.map((truckType) => (
                    <option key={truckType} value={truckType} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="min-w-0 lg:col-span-3 xl:col-span-2">
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
                    setCurrentPage(1);
                  }}
                  className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs font-semibold text-slate-700 shadow-sm outline-none transition hover:border-blue-200 hover:shadow-md focus:border-blue-400 focus:ring-4 focus:ring-blue-100/70"
                >
                  <option value="all">ทุก DC Type</option>
                  {filterOptions.dc_types.map((type) => (
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
            <div className="min-w-0 lg:col-span-3 xl:col-span-2">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                DC
              </label>

              <div className="relative">
                <Warehouse
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-400"
                />
                <input
                  type="text"
                  list="dc-filter-options"
                  value={dcFilter === "all" ? "" : dcFilter}
                  onChange={(e) => {
                    setDcFilter(e.target.value || "all");
                    setCurrentPage(1);
                  }}
                  placeholder="พิมพ์ค้นหา DC"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs font-semibold text-slate-700 shadow-sm outline-none transition placeholder:text-slate-300 hover:border-blue-200 hover:shadow-md focus:border-blue-400 focus:ring-4 focus:ring-blue-100/70"
                />
                <datalist id="dc-filter-options">
                  {filterOptions.dc_codes.map((dc) => (
                    <option key={dc} value={dc} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="min-w-0 md:col-span-2 lg:col-span-6 xl:col-span-4">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                ขั้นตอนปัจจุบัน
              </label>

              <div className="relative">
                <Filter
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-400"
                />

                <select
                  value={currentProcessFilter}
                  onChange={(event) => {
                    setCurrentProcessFilter(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs font-semibold text-slate-700"
                >
                  <option value="all">ทุกขั้นตอน</option>

                  {visibleProcessOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">
                  ▼
                </span>
              </div>
            </div>

            <div className="min-w-0 lg:col-span-4 xl:col-span-3">
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
                      setCurrentPage(1);
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
                  className="fixed z-[99999] w-[calc(100vw-2rem)] max-w-[330px] overflow-x-auto overflow-y-hidden rounded-2xl border border-blue-100 bg-white text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.22)] [&_.rdrCalendarWrapper]:w-full [&_.rdrMonth]:w-full [&_.rdrMonth]:px-2 sm:[&_.rdrMonth]:px-3"
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
                          setCurrentPage(1);
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
                        setCurrentPage(1);
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

            <div className="flex min-w-0 items-end md:col-span-2 lg:col-span-2 xl:col-span-1">
              <button
                type="button"
                onClick={() => {
                  setSearchText("");
                  setVehicleSearchInput("");
                  setVehicleSearchItems([]);
                  setFleetTypeFilter("all");
                  setTruckTypeFilter("all");
                  setDcTypeFilter("all");
                  setDcFilter("all");
                  setStatusFilter("all");
                  setCurrentProcessFilter("all");
                  setHasRequestDateRange(false);
                  setCurrentPage(1);
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
                <span>ล้าง</span>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/70 bg-white/95 shadow-[0_18px_55px_rgba(15,23,42,0.11)]">
          <div className="flex flex-col gap-2 border-b border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-800">{pageTitle}</h2>
              <p className="mt-0.5 text-[10px] font-medium text-slate-400">
                แสดง {requests.length} จากทั้งหมด {pagination.total_vehicles} รายการ
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
              <table className="w-full min-w-[1320px] border-separate border-spacing-0 text-left">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-blue-800 text-[10px] font-black uppercase tracking-wider text-white shadow-[0_1px_0_rgba(226,232,240,0.9)]">
                    {[
                      "ลำดับ",
                      "เลขที่เอกสาร",
                      "DC Type",
                      "DC",
                      "ประเภทคำขอ",
                      "ประเภทรถ",
                      "Vendor (ผู้ให้บริการ)",
                      "ทดแทนทะเบียนเก่า",
                      "ข้อมูลรถคันใหม่",
                      "วันที่ใช้งาน",
                      "ผู้ขอ",
                      "สถานะ",
                      "รายละเอียด",
                    ].map((col, index) => (
                      <th
                        key={col}
                        className={`whitespace-nowrap bg-transparent px-3 py-3 ${index === 0
                          ? "sticky left-0 z-30 w-[52px] text-center"
                          : ""
                          } ${index === 7 ? "text-center" : ""} ${index === 9 ? "text-right" : ""
                          }`}
                      >
                        {index === 1 ? (
                          <button
                            type="button"
                            onClick={() =>
                              setDocumentSort((current) =>
                                current === "asc" ? "desc" : "asc"
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/40"
                            title={
                              documentSort === "asc"
                                ? "เรียงเลขที่เอกสารจากหลังไปหน้า"
                                : "เรียงเลขที่เอกสารจากหน้าไปหลัง"
                            }
                          >
                            <span>{col}</span>
                            {documentSort === "asc" ? (
                              <ArrowUp size={13} />
                            ) : documentSort === "desc" ? (
                              <ArrowDown size={13} />
                            ) : (
                              <ArrowUpDown size={13} className="opacity-70" />
                            )}
                          </button>
                        ) : (
                          col
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center">
                        <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500" />
                        <p className="text-xs font-medium text-slate-400">
                          กำลังโหลดข้อมูล...
                        </p>
                      </td>
                    </tr>
                  ) : filteredRequests.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center">
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
                            colSpan={10}
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
                          const status = item.status || "progress";
                          const isRejected =
                            normalizeStatus(status) === "cancel";
                          const rowKey =
                            item.running_doc_vehicle_no ||
                            (item.id !== null && item.id !== undefined
                              ? `${item.id}-${item.vehicle_no ?? index}-${index}`
                              : item.running_doc
                                ? `${item.running_doc}-${item.vehicle_no ?? index}-${index}`
                                : `${date}-${index}`);

                          return (
                            <tr
                              key={rowKey}
                              className="group bg-white text-xs transition hover:bg-blue-50/30"
                            >
                              <td className="sticky left-0 z-10 bg-white px-3 py-3 text-center group-hover:bg-blue-50/30">
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[11px] font-black text-slate-500">
                                  {(currentPage - 1) * pageSize + index + 1}
                                </span>
                              </td>

                              <td className="whitespace-nowrap px-3 py-3">
                                <p className="font-black text-slate-800">
                                  {item.running_doc_vehicle_no ||
                                    `${item.running_doc}_${item.vehicle_no}`}
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
                                  {item.fleet_type || "-"}
                                </p>
                              </td>

                              <td className="whitespace-nowrap px-3 py-3">
                                <p className="font-bold text-slate-700">
                                  {item.new_truck_type || "-"}
                                </p>
                              </td>

                              <td className="whitespace-nowrap px-3 py-3">
                                <p className="font-bold text-slate-700">
                                  {item.new_vendor_name || "-"}
                                </p>
                              </td>

                              <td className="px-3 py-3">
                                {item.replaced_old_licenses && item.replaced_old_licenses.length > 0 ? (
                                  <ul className="space-y-1">
                                    {item.replaced_old_licenses.map((lic, idx) => (
                                      <li key={idx} className="text-[10px] text-slate-700 flex items-start gap-1">
                                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400"></span>
                                        <span className="font-bold">{lic}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <span className="text-[10px] text-slate-400">-</span>
                                )}
                              </td>

                              <td className="px-3 py-3">
                                <div className="min-w-[250px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] leading-5">
                                  <div className="grid grid-cols-[72px_1fr] gap-x-2">
                                    <span className="font-bold text-slate-400">เลขตัวถัง</span>
                                    <span className="break-all font-black text-slate-700">
                                      {formatVehicleValue(item.vehicle_info?.car_chassis)}
                                    </span>

                                    <span className="font-bold text-slate-400">รุ่นรถ</span>
                                    <span className="font-black text-slate-700">
                                      {formatVehicleValue(item.vehicle_info?.car_model)}
                                    </span>

                                    <span className="font-bold text-slate-400">ยี่ห้อ</span>
                                    <span className="font-black text-slate-700">
                                      {formatVehicleValue(item.vehicle_info?.car_brand)}
                                    </span>

                                    <span className="font-bold text-slate-400">เลขเครื่อง</span>
                                    <span className="break-all font-black text-slate-700">
                                      {formatVehicleValue(item.vehicle_info?.car_engine)}
                                    </span>

                                    <span className="font-bold text-slate-400">ทะเบียน</span>
                                    <span className="font-black text-slate-700">
                                      {formatVehicleValue(item.vehicle_info?.car_license)}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td className="whitespace-nowrap px-3 py-3">
                                <p className="font-black text-slate-700">
                                  {formatThaiDate(item.usage_date)}
                                </p>

                                {!isRejected && (
                                  <p
                                    className={`mt-1 text-[10px] font-black ${getRemainingUsageDaysClass(
                                      item.usage_date
                                    )}`}
                                  >
                                    {getRemainingUsageDays(item.usage_date)}
                                  </p>
                                )}
                              </td>

                              <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-700 text-center">
                                {item.request_by || "-"}
                              </td>

                              <td className="whitespace-nowrap px-3 py-3">
                                <div
                                  className={`min-w-[230px] rounded-xl border px-3 py-2.5 ${isRejected
                                    ? "border-red-200 bg-red-50"
                                    : "border-blue-100 bg-blue-50"
                                    }`}
                                >
                                  {item.vehicle_no !== undefined &&
                                    item.vehicle_no !== null ? (
                                    <>
                                      <div className="flex items-start gap-2">
                                        <span
                                          className={`mt-1 h-2 w-2 shrink-0 rounded-full ${isRejected
                                            ? "bg-red-500"
                                            : "bg-blue-500"
                                            }`}
                                        />

                                        <div className="min-w-0">
                                          <p
                                            className={`break-words text-[10px] font-black leading-4 ${isRejected
                                              ? "text-red-700"
                                              : "text-blue-700"
                                              }`}
                                          >
                                            {getProcessStatus(item).label}
                                          </p>
                                        </div>
                                      </div>

                                      <p
                                        className={`mt-1.5 break-words border-t pt-1.5 text-[9px] font-semibold text-slate-400 ${isRejected
                                          ? "border-red-200"
                                          : "border-blue-100"
                                          }`}
                                      >
                                        ทะเบียน: {item.vehicle_license || "-"}
                                      </p>
                                    </>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <span className="h-2 w-2 shrink-0 rounded-full bg-slate-400" />
                                      <p className="text-[10px] font-black text-slate-600">
                                        ยังไม่พบข้อมูลรถจาก Flow API
                                      </p>
                                    </div>
                                  )}
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

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">
                แสดง
              </span>

              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setCurrentPage(1);
                }}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold"
              >
                <option value={20}>20 รายการ</option>
                <option value={25}>25 รายการ</option>
                <option value={50}>50 รายการ</option>
                <option value={100}>100 รายการ</option>
              </select>

              <span className="text-xs text-slate-400">
                จากทั้งหมด{" "}
                {Number(pagination.total_vehicles).toLocaleString("th-TH")} รายการ
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={loading || currentPage <= 1}
                onClick={() =>
                  setCurrentPage((page) => Math.max(page - 1, 1))
                }
                className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 disabled:opacity-40"
              >
                ก่อนหน้า
              </button>

              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <span>หน้า</span>

                <select
                  aria-label="เลือกหน้า"
                  value={currentPage}
                  disabled={loading}
                  onChange={(event) =>
                    setCurrentPage(Number(event.target.value))
                  }
                  className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 outline-none focus:border-blue-500 disabled:opacity-40"
                >
                  {Array.from(
                    { length: Math.max(1, Number(pagination.total_pages)) },
                    (_, index) => {
                      const page = index + 1;

                      return (
                        <option key={page} value={page}>
                          {page}
                        </option>
                      );
                    },
                  )}
                </select>

                <span>
                  / {Math.max(1, Number(pagination.total_pages))}
                </span>
              </div>

              <button
                type="button"
                disabled={
                  loading ||
                  currentPage >= Math.max(1, Number(pagination.total_pages))
                }
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.min(
                      page + 1,
                      Math.max(1, Number(pagination.total_pages)),
                    ),
                  )
                }
                className="h-9 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white disabled:opacity-40"
              >
                ถัดไป
              </button>
            </div>
          </div>
        </div>

      </main>

      <ExportTrackFleet
        open={openExportModal}
        onClose={() => setOpenExportModal(false)}
        requests={sidebarFilteredRequests.map((item) => ({
          ...item,
          id:
            item.id === null || item.id === ""
              ? null
              : Number.isSafeInteger(Number(item.id))
                ? Number(item.id)
                : null,
        }))}
        dcLabel={selectedDcLabel}
        exportApiUrl={exportApiUrl}
      />

      <FlowAssessmentModal
        open={openDetailModal}
        requestId={selectedRequest?.request_id ?? selectedRequest?.id ?? null}
        vehicleNo={selectedRequest?.unit_code ?? selectedRequest?.vehicle_no ?? null}
        onClose={handleCloseDetail}
      />

    </div>
  );
}
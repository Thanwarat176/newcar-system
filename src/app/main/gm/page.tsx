"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DateRange, type RangeKeyDict } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { th } from "date-fns/locale";
import {
  ArrowUpDown,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  CircleX,
  ClipboardList,
  Eraser,
  Eye,
  Filter,
  Inbox,
  PencilLine,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
  Warehouse,
  X,
} from "lucide-react";
import GMModalDetail from "./component/GMModalDetail";

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
  usage_end_date?: string | null;
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

type StatusFilter = "all" | "gm_pending" | "reject_by_gm" | "fbp_pending";
type SortKey = "request_date" | "running_doc" | "usage_date";
type SortDirection = "asc" | "desc";

const API_URL = "http://192.168.158.210/api_new_truck/api/request_get.php";
const NO_DATE = "ไม่ระบุวันที่";

const statusCards = [
  {
    key: "all",
    label: "ทั้งหมด",
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
    sub: "รวมคำขอจากคลังและส่วนกลาง",
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

const columns: { label: string; sortKey?: SortKey }[] = [
  { label: "ลำดับ" },
  { label: "เลขที่เอกสาร", sortKey: "running_doc" },
  { label: "DC Type" },
  { label: "DC" },
  { label: "ประเภทคำขอ" },
  { label: "ประเภทรถ" },
  { label: "ทะเบียนทดแทน" },
  { label: "จำนวน" },
  { label: "วันที่ใช้งาน - วันที่สิ้นสุด", sortKey: "usage_date" },
  { label: "ผู้ขอ" },
  { label: "สถานะ" },
  { label: "รายละเอียด" },
];

const fieldClass =
  "h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100/70";
const labelClass =
  "mb-1.5 block text-[11px] font-bold tracking-wide text-slate-500";
const iconClass =
  "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-400";
const normalizeText = (value?: string) => String(value || "").trim();
const normalizeCode = (value?: string) => normalizeText(value).toUpperCase();
const rawStatus = (status?: string) => normalizeText(status).toLowerCase();

function normalizeStatus(status?: string) {
  const value = rawStatus(status);
  if (value === "gm_checking") return "gm_pending";
  if (
    ["success", "progress", "partial_approved", "fbp_pending"].includes(value)
  ) {
    return "fbp_pending";
  }
  return value;
}

function isAllowedCardStatus(status?: string) {
  return ["gm_pending", "reject_by_gm", "fbp_pending"].includes(
    normalizeStatus(status),
  );
}

function formatStatusText(status?: string) {
  if (rawStatus(status) === "gm_checking")
    return "รอ GM อนุมัติคำขอจากส่วนกลาง";

  const value = normalizeStatus(status);
  if (value === "gm_pending") return "รอ GM อนุมัติคำขอจากคลัง";
  if (value === "reject_by_gm") return "GM ไม่อนุมัติ";
  if (value === "fbp_pending") return "GM อนุมัติแล้ว";
  return status || "-";
}

function getStatusVisual(status?: string) {
  if (rawStatus(status) === "gm_checking") {
    return {
      dotClass: "bg-sky-500",
      textClass: "text-sky-700",
      hint: null,
    };
  }
  const value = normalizeStatus(status);
  if (value === "gm_pending") {
    return {
      dotClass: "bg-amber-500",
      textClass: "text-amber-700",
      hint: null,
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
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-700",
    hint: "ผ่านการอนุมัติ",
  };
}

function formatDateToKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function normalizeDateKey(value?: string) {
  const raw = normalizeText(value);
  if (!raw) return NO_DATE;

  const dateOnly = raw.split(/[T ]/)[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return dateOnly;

  if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(dateOnly)) {
    const [day, month, year] = dateOnly.split(/[/-]/);
    return [year, month, day].join("-");
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? NO_DATE : formatDateToKey(date);
}

function getRequestDateKey(item: RequestItem) {
  const date = normalizeDateKey(
    item.request_date || item.date || item.created_at,
  );
  if (date === NO_DATE) return date;

  const [year, month, day] = date.split("-");
  return [Number(year) > 2400 ? Number(year) - 543 : year, month, day].join(
    "-",
  );
}

function formatThaiDate(value?: string) {
  const date = normalizeDateKey(value);
  return date === NO_DATE ? date : date.split("-").reverse().join("/");
}

function formatUsageDates(item: RequestItem) {
  const start = formatThaiDate(item.usage_date);
  return item.usage_end_date?.trim()
    ? start + " - " + formatThaiDate(item.usage_end_date)
    : start;
}

function formatNumber(value?: number | string | null) {
  if (value === null || value === undefined || value === "") return "-";
  const number = Number(value);
  return Number.isNaN(number) ? String(value) : number.toLocaleString("en-US");
}

function getQtySummary(item: RequestItem) {
  const requested = Math.max(0, Number(item.qty) || 0);
  const approved =
    normalizeStatus(item.status) === "fbp_pending"
      ? Math.min(requested, Math.max(0, Number(item.approve_qty_gm) || 0))
      : 0;
  return [requested, approved, requested - approved];
}

function getLicenseList(value: RequestItem["license_replace"]) {
  if (Array.isArray(value))
    return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value !== "string" || !value.trim()) return [];

  const raw = value.trim();
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((item) => String(item).trim()).filter(Boolean)
      : [raw];
  } catch {
    return raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function getOptions(values: string[]) {
  return [...new Set(values.map(normalizeText).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "th"),
  );
}

function makeDateRange(startDate = new Date(), endDate = startDate) {
  return [{ startDate, endDate, key: "selection" }];
}

function FilterSelect({
  id,
  label,
  allLabel,
  icon: Icon,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  allLabel: string;
  icon: typeof Filter;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <Icon size={14} className={iconClass} />
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={fieldClass + " appearance-none"}
        >
          <option value="all">{allLabel}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown
          size={13}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>
    </div>
  );
}

function DCFilter({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showAll, setShowAll] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const matches = options.filter(
    (dc) => showAll || normalizeCode(dc).includes(normalizeCode(value)),
  );
  const activeOption = open ? matches[activeIndex] : undefined;

  useEffect(() => {
    if (!activeOption) return;
    document
      .getElementById("gm-dc-option-" + activeIndex)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, activeOption]);

  function choose(dc: string) {
    onChange(dc);
    input.current?.focus();
    setOpen(false);
    setActiveIndex(-1);
  }

  return (
    <div
      ref={root}
      className="min-w-0"
      onBlur={(event) => {
        if (!root.current?.contains(event.relatedTarget)) {
          setOpen(false);
          setActiveIndex(-1);
        }
      }}
    >
      <label htmlFor="gm-dc-input" className={labelClass}>
        DC
      </label>
      <div className="relative">
        <Warehouse size={14} className={iconClass} />
        <input
          ref={input}
          id="gm-dc-input"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="gm-dc-options"
          aria-activedescendant={
            activeOption ? "gm-dc-option-" + activeIndex : undefined
          }
          autoComplete="off"
          value={value}
          placeholder="พิมพ์หรือเลือก DC"
          className={fieldClass}
          onFocus={() => {
            setOpen(true);
            setShowAll(false);
          }}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
            setShowAll(false);
            setActiveIndex(-1);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              setActiveIndex(-1);
            } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              const step = event.key === "ArrowDown" ? 1 : -1;
              const initialIndex =
                step === 1 && matches.length ? 0 : matches.length - 1;
              setActiveIndex(
                activeIndex < 0
                  ? initialIndex
                  : Math.min(
                      matches.length - 1,
                      Math.max(0, activeIndex + step),
                    ),
              );
            } else if (event.key === "Enter" && activeOption) {
              event.preventDefault();
              choose(activeOption);
            }
          }}
        />
        <button
          type="button"
          aria-label={
            open && showAll ? "ปิดรายการ DC" : "แสดงรายการ DC ทั้งหมด"
          }
          aria-expanded={open}
          aria-controls="gm-dc-options"
          className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-xl text-slate-500 hover:bg-slate-50"
          onClick={() => {
            const nextOpen = !open || !showAll;
            input.current?.focus();
            setOpen(nextOpen);
            setShowAll(nextOpen);
            setActiveIndex(-1);
          }}
        >
          <ChevronDown size={15} />
        </button>
        <div
          hidden={!open}
          className="absolute inset-x-0 top-full z-40 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          <ul
            id="gm-dc-options"
            role="listbox"
            aria-label="รายการ DC"
            className="max-h-52 overflow-auto p-1"
          >
            {matches.map((dc, index) => (
              <li
                key={dc}
                id={"gm-dc-option-" + index}
                role="option"
                aria-selected={normalizeCode(dc) === normalizeCode(value)}
                className={
                  "cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold hover:bg-blue-50 " +
                  (activeIndex === index
                    ? "bg-blue-100 text-blue-800"
                    : "text-slate-700")
                }
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(dc)}
              >
                {dc}
              </li>
            ))}
          </ul>
          {matches.length === 0 && (
            <p className="px-3 pb-2 text-xs text-slate-500">ไม่พบรหัส DC</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GmStatusPage() {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [selectedDC, setSelectedDC] = useState<SelectedDC | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [gmModalItem, setGmModalItem] = useState<RequestItem | null>(null);
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
  const [dcFilter, setDcFilter] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [requestDateRange, setRequestDateRange] = useState(makeDateRange);
  const [hasRequestDateRange, setHasRequestDateRange] = useState(false);
  const [showRequestDatePicker, setShowRequestDatePicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
  const requestDateButtonRef = useRef<HTMLButtonElement>(null);
  const requestDatePickerRef = useRef<HTMLDivElement>(null);
  const fetchingRef = useRef(false);

  useEffect(() => {
    setPortalTarget(document.body);
    const loadSelectedDC = () => {
      try {
        setSelectedDC(
          JSON.parse(localStorage.getItem("selected_dc") || "null"),
        );
      } catch {
        localStorage.removeItem("selected_dc");
        setSelectedDC(null);
      }
    };

    loadSelectedDC();
    window.addEventListener("selectedDCChanged", loadSelectedDC);

    try {
      const savedUser =
        localStorage.getItem("user_info") ||
        localStorage.getItem("user") ||
        localStorage.getItem("userInfo");
      setUserInfo(JSON.parse(savedUser || "null"));
    } catch {
      setUserInfo(null);
    }

    return () =>
      window.removeEventListener("selectedDCChanged", loadSelectedDC);
  }, []);

  async function fetchRequests() {
    if (fetchingRef.current) return;

    fetchingRef.current = true;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(API_URL, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("ไม่สามารถดึงข้อมูลได้");

      const result = await response.json();
      const list = [result, result?.data, result?.result].find(Array.isArray);
      if (!list) throw new Error("รูปแบบข้อมูลจาก API ไม่ถูกต้อง");

      setRequests(list);
    } catch (err) {
      console.error(err);
      setError("เกิดข้อผิดพลาดในการดึงข้อมูลจาก API");
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchRequests();
  }, []);

  useEffect(() => {
    if (!showRequestDatePicker) return;
    const closeOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !requestDateButtonRef.current?.contains(target) &&
        !requestDatePickerRef.current?.contains(target)
      ) {
        setShowRequestDatePicker(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowRequestDatePicker(false);
    };
    const closeOnResize = () => setShowRequestDatePicker(false);
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnResize);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnResize);
    };
  }, [showRequestDatePicker]);

  const userWarehouse = normalizeCode(
    userInfo?.warehouse ||
      userInfo?.WAREHOUSE ||
      userInfo?.team ||
      userInfo?.TEAM,
  );
  const selectedCode = normalizeCode(selectedDC?.DC_CODE);
  const warehouseFilteredRequests = useMemo(() => {
    if (["CENTER", "WAREHOUSE", "GM"].includes(userWarehouse)) return requests;
    const code = userWarehouse || selectedCode;
    return code
      ? requests.filter((item) => normalizeCode(item.dc_code) === code)
      : requests;
  }, [requests, userWarehouse, selectedCode]);

  const dcTypeOptions = useMemo(
    () => getOptions(warehouseFilteredRequests.map((item) => item.dc_type)),
    [warehouseFilteredRequests],
  );

  const requestTypeOptions = useMemo(
    () => getOptions(warehouseFilteredRequests.map((item) => item.fleet_type)),
    [warehouseFilteredRequests],
  );

  const truckTypeOptions = useMemo(
    () =>
      getOptions(
        warehouseFilteredRequests
          .filter(
            (item) =>
              requestTypeFilter === "all" ||
              normalizeText(item.fleet_type) === requestTypeFilter,
          )
          .map((item) => item.fleet_truck_type),
      ),
    [warehouseFilteredRequests, requestTypeFilter],
  );

  const dcOptions = useMemo(
    () =>
      getOptions(
        warehouseFilteredRequests
          .filter(
            (item) =>
              dcTypeFilter === "all" ||
              normalizeCode(item.dc_type) === normalizeCode(dcTypeFilter),
          )
          .map((item) => item.dc_code),
      ),
    [warehouseFilteredRequests, dcTypeFilter],
  );

  const filteredRequests = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    const dcKeyword = normalizeCode(dcFilter);
    const hasExactDC = dcOptions.some((dc) => normalizeCode(dc) === dcKeyword);
    const { startDate, endDate } = requestDateRange[0];
    const start = formatDateToKey(startDate);
    const end = formatDateToKey(endDate);

    return warehouseFilteredRequests.filter((item) => {
      if (
        statusFilter === "all"
          ? !isAllowedCardStatus(item.status)
          : normalizeStatus(item.status) !== statusFilter
      )
        return false;
      if (
        requestTypeFilter !== "all" &&
        normalizeText(item.fleet_type) !== requestTypeFilter
      )
        return false;
      if (
        truckTypeFilter !== "all" &&
        normalizeText(item.fleet_truck_type) !== truckTypeFilter
      )
        return false;
      if (
        dcTypeFilter !== "all" &&
        normalizeCode(item.dc_type) !== normalizeCode(dcTypeFilter)
      )
        return false;

      const dcCode = normalizeCode(item.dc_code);
      if (
        dcKeyword &&
        (hasExactDC ? dcCode !== dcKeyword : !dcCode.includes(dcKeyword))
      )
        return false;

      if (hasRequestDateRange) {
        const date = getRequestDateKey(item);
        if (date === NO_DATE || date < start || date > end) return false;
      }

      return (
        !keyword ||
        [
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
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [
    warehouseFilteredRequests,
    statusFilter,
    requestTypeFilter,
    truckTypeFilter,
    dcTypeFilter,
    dcFilter,
    dcOptions,
    searchText,
    hasRequestDateRange,
    requestDateRange,
  ]);

  const orderedRequests = useMemo(() => {
    const sorted = [...filteredRequests].sort((a, b) => {
      const { key, direction } = sortConfig;
      if (key === "running_doc") {
        const comparison = normalizeText(a.running_doc).localeCompare(
          normalizeText(b.running_doc),
          "th",
          {
            numeric: true,
            sensitivity: "base",
          },
        );
        return direction === "asc" ? comparison : -comparison;
      }
      const dateA =
        key === "request_date"
          ? getRequestDateKey(a)
          : normalizeDateKey(a.usage_date);
      const dateB =
        key === "request_date"
          ? getRequestDateKey(b)
          : normalizeDateKey(b.usage_date);
      if (dateA === NO_DATE) return dateB === NO_DATE ? 0 : 1;
      if (dateB === NO_DATE) return -1;
      return direction === "asc"
        ? dateA.localeCompare(dateB)
        : dateB.localeCompare(dateA);
    });

    const groups = new Map<string, RequestItem[]>();
    for (const item of sorted) {
      const date = getRequestDateKey(item);
      const group = groups.get(date);
      if (group) group.push(item);
      else groups.set(date, [item]);
    }
    return Array.from(groups.values()).flat();
  }, [filteredRequests, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(orderedRequests.length / pageSize));
  const activePage = Math.min(Math.max(currentPage, 1), totalPages);
  const pageStart = (activePage - 1) * pageSize;
  const paginatedGroups = new Map<
    string,
    { item: RequestItem; rowNumber: number }[]
  >();

  orderedRequests
    .slice(pageStart, pageStart + pageSize)
    .forEach((item, index) => {
      const date = getRequestDateKey(item);
      const row = { item, rowNumber: pageStart + index + 1 };
      const group = paginatedGroups.get(date);
      if (group) group.push(row);
      else paginatedGroups.set(date, [row]);
    });

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
    const counts = {
      all: { qty: 0, items: 0 },
      gm_pending: { qty: 0, items: 0 },
      reject_by_gm: { qty: 0, items: 0 },
      fbp_pending: { qty: 0, items: 0 },
    };
    for (const item of warehouseFilteredRequests) {
      const status = normalizeStatus(item.status);
      if (
        status === "gm_pending" ||
        status === "reject_by_gm" ||
        status === "fbp_pending"
      ) {
        const qty = Number(item.qty) || 0;
        counts[status].qty += qty;
        counts[status].items += 1;
        counts.all.qty += qty;
        counts.all.items += 1;
      }
    }
    return counts;
  }, [warehouseFilteredRequests]);

  const selectedDCLabel =
    userWarehouse === "CENTER"
      ? "CENTER - ส่วนกลาง / แสดงข้อมูลทั้งหมด"
      : selectedDC?.DC_CODE
        ? [selectedDC.DC_CODE, selectedDC.DC_NAME].filter(Boolean).join(" - ")
        : userWarehouse
          ? userWarehouse + " - คลังของฉัน"
          : "-";

  const todayKey = formatDateToKey(new Date());
  const rangeLabel = hasRequestDateRange
    ? requestDateRange
        .flatMap(({ startDate, endDate }) => [
          formatThaiDate(formatDateToKey(startDate)),
          formatThaiDate(formatDateToKey(endDate)),
        ])
        .join(" - ")
    : "เลือกช่วงวันที่ขอ";

  function clearRequestDate() {
    setSelectedDate("");
    setHasRequestDateRange(false);
    setRequestDateRange(makeDateRange());
  }

  function handleSelectedDateChange(value: string) {
    setShowRequestDatePicker(false);
    if (!value) {
      clearRequestDate();
      return;
    }
    const [year, month, day] = value.split("-").map(Number);
    setSelectedDate(value);
    setRequestDateRange(makeDateRange(new Date(year, month - 1, day)));
    setHasRequestDateRange(true);
  }

  function toggleDatePicker() {
    if (showRequestDatePicker) {
      setShowRequestDatePicker(false);
      return;
    }
    const rect = requestDateButtonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(330, window.innerWidth - 32);
    const roomBelow = window.innerHeight - rect.bottom;
    const top =
      roomBelow < 390 && rect.top > roomBelow
        ? Math.max(16, rect.top - 398)
        : Math.max(16, Math.min(rect.bottom + 8, window.innerHeight - 180));
    const left = Math.max(
      16,
      Math.min(rect.right - width, window.innerWidth - width - 16),
    );
    setPickerPosition({ top, left });
    setShowRequestDatePicker(true);
  }

  function clearFilters() {
    setSearchText("");
    setRequestTypeFilter("all");
    setTruckTypeFilter("all");
    setDcTypeFilter("all");
    setDcFilter("");
    setStatusFilter("all");
    clearRequestDate();
    setShowRequestDatePicker(false);
    setCurrentPage(1);
  }

  function handleSort(key: SortKey) {
    setSortConfig((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  }

  function renderSortIcon(key: SortKey) {
    if (sortConfig.key !== key)
      return <ArrowUpDown size={13} className="opacity-50" />;
    return sortConfig.direction === "asc" ? (
      <ChevronUp size={14} />
    ) : (
      <ChevronDown size={14} />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <main className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-4 lg:px-5">
        <header className="mb-4 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
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
              คำขอจากคลัง
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
                  : statusCards.find((card) => card.key === statusFilter)
                      ?.label}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              aria-label="เลือกวันที่ขอ"
              value={selectedDate}
              max={todayKey}
              onChange={(event) => handleSelectedDateChange(event.target.value)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-[11px] font-bold text-slate-700 outline-none"
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => void fetchRequests()}
              className="h-9 rounded-lg bg-blue-600 px-3 text-[10px] font-black text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "กำลังโหลด..." : "รีเฟรช"}
            </button>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-600"
          >
            {error}
          </div>
        )}

        <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {statusCards.map((card) => {
            const active = statusFilter === card.key;
            const Icon = card.icon;
            const count = statusCounts[card.key];
            return (
              <button
                key={card.key}
                type="button"
                aria-pressed={active}
                onClick={() => setStatusFilter(card.key)}
                className={
                  "relative min-w-0 overflow-hidden rounded-xl p-3 text-left shadow-sm ring-1 transition hover:shadow-md " +
                  (active ? card.activeClass : card.inactiveClass)
                }
              >
                <Icon
                  aria-hidden="true"
                  size={88}
                  strokeWidth={1.2}
                  className={
                    "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 " +
                    (active ? "text-white opacity-[0.12]" : "opacity-[0.07]")
                  }
                />
                <div className="relative flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold">
                      <span
                        className={
                          "h-2 w-2 shrink-0 rounded-full " +
                          (active ? "bg-white" : card.dotClass)
                        }
                      />
                      {card.label}
                    </p>
                    <p
                      className={
                        "mt-1 text-[11px] font-bold " +
                        (active ? "text-white/70" : "text-slate-500")
                      }
                    >
                      {card.sub}
                    </p>
                  </div>
                  <span
                    className={
                      "hidden h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-xs font-semibold sm:flex " +
                      (active ? "bg-white/20 text-white" : card.iconClass)
                    }
                  >
                    {card.shortLabel}
                  </span>
                </div>
                <div className="relative mt-3 flex flex-wrap items-end justify-between gap-1">
                  <p
                    className={
                      "text-2xl font-semibold tracking-tight " +
                      (active ? "text-white" : card.countClass)
                    }
                  >
                    {formatNumber(count.qty)}
                    <span className="ml-1 text-xs opacity-60">คัน</span>
                  </p>
                  <span
                    className={
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold " +
                      (active
                        ? "bg-white/15 text-white"
                        : "bg-white/80 text-slate-500")
                    }
                  >
                    {formatNumber(count.items)} รายการ
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <section
          aria-labelledby="gm-filters-heading"
          className="relative z-30 mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <SlidersHorizontal size={16} />
              </span>
              <div>
                <h2
                  id="gm-filters-heading"
                  className="text-xs font-semibold text-slate-800"
                >
                  ค้นหาและตัวกรอง
                </h2>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  เลือกเงื่อนไขเพื่อค้นหารายการคำขอ
                </p>
              </div>
            </div>
            <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-slate-100">
              พบ {formatNumber(filteredRequests.length)} รายการ
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div className="min-w-0">
              <label htmlFor="gm-search" className={labelClass}>
                ค้นหา
              </label>
              <div className="relative">
                <Search size={14} className={iconClass} />
                <input
                  id="gm-search"
                  type="text"
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="เลขเอกสาร, DC, ผู้ขอ, ทะเบียน..."
                  className={fieldClass}
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

            <FilterSelect
              id="gm-request-type"
              label="ประเภทคำขอ"
              allLabel="ทุกประเภทคำขอ"
              icon={Filter}
              value={requestTypeFilter}
              options={requestTypeOptions}
              onChange={(value) => {
                setRequestTypeFilter(value);
                setTruckTypeFilter("all");
              }}
            />
            <FilterSelect
              id="gm-truck-type"
              label="ประเภทรถ"
              allLabel="ทุกประเภทรถ"
              icon={Truck}
              value={truckTypeFilter}
              options={truckTypeOptions}
              onChange={setTruckTypeFilter}
            />
            <FilterSelect
              id="gm-dc-type"
              label="DC Type"
              allLabel="ทุก DC Type"
              icon={Filter}
              value={dcTypeFilter}
              options={dcTypeOptions}
              onChange={(value) => {
                setDcTypeFilter(value);
                setDcFilter("");
              }}
            />
            <DCFilter
              value={dcFilter}
              options={dcOptions}
              onChange={setDcFilter}
            />

            <div className="min-w-0">
              <label htmlFor="gm-request-date" className={labelClass}>
                วันที่ขอ
              </label>
              <div className="relative">
                <CalendarDays size={14} className={iconClass} />
                <button
                  id="gm-request-date"
                  ref={requestDateButtonRef}
                  type="button"
                  aria-expanded={showRequestDatePicker}
                  title={rangeLabel}
                  onClick={toggleDatePicker}
                  className={
                    fieldClass +
                    " truncate text-left " +
                    (hasRequestDateRange
                      ? "border-blue-300 bg-blue-50 text-blue-700"
                      : "")
                  }
                >
                  {rangeLabel}
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

            <div className="flex items-end">
              <button
                type="button"
                onClick={clearFilters}
                className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              >
                <Eraser size={13} /> ล้างตัวกรอง
              </button>
            </div>
          </div>
        </section>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="bg-blue-50/70 px-3 py-1.5 text-[11px] font-bold text-blue-600 sm:hidden">
            เลื่อนซ้าย–ขวาเพื่อดูข้อมูลทั้งหมด →
          </div>
          <div className="max-h-[70vh] min-h-[360px] overflow-auto [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-width:thin]">
            <table className="w-full min-w-[980px] border-separate border-spacing-0 text-left">
              <thead className="sticky top-0 z-20">
                <tr className="bg-blue-800 text-[11px] font-semibold uppercase tracking-wider text-white">
                  {columns.map(({ label, sortKey }, index) => (
                    <th
                      key={label}
                      scope="col"
                      className={
                        "whitespace-nowrap bg-blue-800 px-3 py-3 " +
                        (index === 0
                          ? "sticky left-0 z-30 w-[52px] text-center"
                          : "") +
                        (index === columns.length - 1 ? " text-right" : "")
                      }
                    >
                      {sortKey ? (
                        <button
                          type="button"
                          onClick={() => handleSort(sortKey)}
                          className="inline-flex items-center gap-1.5"
                        >
                          {label}
                          {renderSortIcon(sortKey)}
                        </button>
                      ) : (
                        label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={columns.length} className="py-12 text-center">
                      <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500" />
                      <p className="text-xs text-slate-500">
                        กำลังโหลดข้อมูล...
                      </p>
                    </td>
                  </tr>
                ) : orderedRequests.length === 0 ? (
                  <tr>
                    <td
                      colSpan={columns.length}
                      className="py-12 text-center text-sm font-bold text-slate-500"
                    >
                      ไม่พบข้อมูลตามเงื่อนไขนี้
                    </td>
                  </tr>
                ) : (
                  Array.from(paginatedGroups, ([date, rows]) => (
                    <Fragment key={date}>
                      <tr>
                        <td
                          colSpan={columns.length}
                          className="bg-gradient-to-r from-blue-50/80 to-slate-50 px-4 py-2"
                        >
                          <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-blue-600">
                            <button
                              type="button"
                              onClick={() => handleSort("request_date")}
                              title="กดเพื่อเรียงวันที่ขอ"
                              className="inline-flex items-center gap-1.5 rounded-lg px-1.5 py-1 hover:bg-blue-100"
                            >
                              <CalendarDays size={13} />
                              <span>วันที่ขอ: {formatThaiDate(date)}</span>
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
                      {rows.map(({ item, rowNumber }) => {
                        const status = normalizeStatus(item.status);
                        const pending = status === "gm_pending";
                        const visual = getStatusVisual(item.status);
                        const licenses = getLicenseList(item.license_replace);
                        const rowKey =
                          item.id ?? (item.running_doc || rowNumber);
                        const qtyCells = [
                          {
                            label: "จำนวนขอ",
                            cellClass: "",
                            textClass: "text-slate-700",
                          },
                          {
                            label: "อนุมัติ",
                            cellClass:
                              "border-l border-slate-100 bg-emerald-50",
                            textClass: "text-emerald-700",
                          },
                          {
                            label: "ไม่อนุมัติ",
                            cellClass: "border-l border-slate-100 bg-rose-50",
                            textClass: "text-rose-700",
                          },
                        ];

                        return (
                          <tr
                            key={rowKey}
                            className="group bg-white text-xs transition hover:bg-blue-50/30"
                          >
                            <td className="sticky left-0 z-10 bg-white px-3 py-3 text-center group-hover:bg-blue-50">
                              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-1 text-[11px] font-semibold text-slate-500">
                                {rowNumber}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3">
                              <p className="font-semibold text-slate-800">
                                {item.running_doc || "-"}
                              </p>
                              <p className="mt-0.5 text-[11px] text-slate-500">
                                ใช้: {formatUsageDates(item)}
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
                              {licenses.length ? (
                                <div className="flex flex-wrap gap-1">
                                  {licenses
                                    .slice(0, 2)
                                    .map((license, index) => (
                                      <span
                                        key={index}
                                        title={license}
                                        className="inline-block max-w-[86px] truncate rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200"
                                      >
                                        {license}
                                      </span>
                                    ))}
                                  {licenses.length > 2 && (
                                    <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-600">
                                      +{licenses.length - 2}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              {status === "reject_by_gm" ||
                              status === "fbp_pending" ? (
                                <div className="grid min-w-[190px] grid-cols-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                  {getQtySummary(item).map((qty, index) => {
                                    const cell = qtyCells[index];
                                    return (
                                      <div
                                        key={cell.label}
                                        className={
                                          "px-2 py-2 text-center " +
                                          cell.cellClass
                                        }
                                      >
                                        <p
                                          className={
                                            "text-[11px] font-bold " +
                                            cell.textClass
                                          }
                                        >
                                          {cell.label}
                                        </p>
                                        <p
                                          className={
                                            "mt-0.5 font-semibold " +
                                            cell.textClass
                                          }
                                        >
                                          {formatNumber(qty)}
                                        </p>
                                      </div>
                                    );
                                  })}
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
                              {formatUsageDates(item)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 font-bold text-slate-700">
                              {item.request_by || "-"}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3">
                              <div className="flex min-w-[135px] items-center gap-2.5">
                                <span
                                  className={
                                    "h-2.5 w-2.5 shrink-0 rounded-full " +
                                    visual.dotClass
                                  }
                                />
                                <div>
                                  <p
                                    className={
                                      "text-[11px] font-semibold " +
                                      visual.textClass
                                    }
                                  >
                                    {formatStatusText(item.status)}
                                  </p>
                                  {visual.hint && (
                                    <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                                      {visual.hint}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => setGmModalItem(item)}
                                className={
                                  "inline-flex h-9 min-w-[130px] items-center justify-center gap-2 rounded-xl px-3 text-[11px] font-semibold transition " +
                                  (pending
                                    ? "bg-blue-700 text-white shadow-md hover:bg-blue-800"
                                    : "border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700")
                                }
                              >
                                {pending ? (
                                  <>
                                    <PencilLine size={14} />
                                    อัปเดตสถานะ
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

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500">แสดง</span>
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
              <span className="text-xs text-slate-500">
                แสดง {orderedRequests.length === 0 ? 0 : pageStart + 1}–
                {Math.min(pageStart + pageSize, orderedRequests.length)}{" "}
                จากทั้งหมด {orderedRequests.length.toLocaleString("th-TH")}{" "}
                รายการ
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={loading || activePage <= 1}
                onClick={() => setCurrentPage(activePage - 1)}
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
                onClick={() => setCurrentPage(activePage + 1)}
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

      {portalTarget &&
        showRequestDatePicker &&
        createPortal(
          <div
            ref={requestDatePickerRef}
            className="fixed z-[99999] w-[330px] max-w-[calc(100vw-32px)] overflow-auto rounded-2xl border border-blue-100 bg-white text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.22)]"
            style={{
              top: pickerPosition.top,
              left: pickerPosition.left,
              maxHeight: "calc(100dvh - " + (pickerPosition.top + 16) + "px)",
            }}
          >
            <div className="flex items-center justify-between bg-blue-50 px-4 py-2.5">
              <div>
                <p className="text-xs font-semibold text-blue-700">
                  เลือกช่วงวันที่ขอ
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
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
                const start = selection.startDate || new Date();
                const end = selection.endDate || start;
                setRequestDateRange(makeDateRange(start, end));
                setHasRequestDateRange(true);
                setSelectedDate(
                  formatDateToKey(start) === formatDateToKey(end)
                    ? formatDateToKey(start)
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
                {hasRequestDateRange ? rangeLabel : "เลือกวันเริ่มต้น–สิ้นสุด"}
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

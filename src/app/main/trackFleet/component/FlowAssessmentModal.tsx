"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { th } from "date-fns/locale";
import {
  AlertTriangle,
  Ban,
  Building2,
  CalendarDays,
  ClipboardList,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileUp,
  FileWarning,
  LoaderCircle,
  Play,
  RefreshCw,
  Save,
  Truck,
  X,
} from "lucide-react";
import ProvinceDatalist from "../../component/thaiProvinces";

const FLOW_API_URL =
  "http://192.168.158.210/api_new_truck/api/flow_data_get.php";

const FLOW_INITIALIZE_API_URL =
  "http://192.168.158.210/api_new_truck/api/flow_data_initialize.php";

const FLOW_UPDATE_API_URL =
  "http://192.168.158.210/api_new_truck/api/flow_data_update.php";

const VEHICLE_WAREHOUSE_INFO_API_URL =
  "http://192.168.158.210/api_new_truck/api/vehicle_warehouse_info.php";

const MASTER_FILE_API_URL =
  "http://192.168.158.210/api_new_truck/api/master_file.php";

interface FlowAssessmentModalProps {
  open: boolean;
  requestId: string | number | null;
  vehicleNo: string | number | null;
  onClose: () => void;
}

interface RequestInfo {
  id: string;
  running_doc: string;
  dc_type: string;
  dc_code: string;
  date: string;
  fleet_type: string;
  fleet_truck_type: string;
  license_replace: string;
  qty: string;
  usage_date: string;
  workload: string;
  truckturn: string;
  remark: string;
  status: string;
  request_date: string;
  request_by: string;
  approved_by: string | null;
  approved_date: string | null;
  reject_reason: string | null;
  approved_company_id: string | null;
  approved_company_name: string | null;
  approved_truck_type: string | null;
  approved_qty: string | null;
  status_details: string | null;
  details?: RequestVehicleDetail[];
  vehicle_warehouse_info?: VehicleWarehouseInfoData[];
}

interface RequestVehicleDetail {
  id?: string | number;
  request_id?: string | number;
  license?: string | null;
  province?: string | null;
  truck_type?: string | null;
  company_name?: string | null;
  license_replace?: string | null;
  province_replace?: string | null;
  truck_type_replace?: string | null;
  company_name_replace?: string | null;
  status?: string | null;
  warehouse_info?: VehicleWarehouseInfoData | null;
  warehouse_plan_date?: string | null;
  remark?: string | null;
  car_model?: string | null;
  car_brand?: string | null;
  car_chassis?: string | null;
  car_engine?: string | null;
  car_license?: string | null;
  car_province?: string | null;
}

interface MasterFileResponse {
  status?: string;
  message?: string;
  data?: {
    id?: string | number;
    file_type?: string;
    file_name?: string;
    file_url?: string | null;
    created_at?: string;
    create_by?: string;
    updated_at?: string;
    update_by?: string;
  };
}

interface ExistingMemoFile {
  id?: string | number;
  file_name: string;
  file_url?: string | null;
}

type ExistingMemoFiles = Partial<
  Record<MemoFileKey, ExistingMemoFile>
>;

interface CarItem {
  vehicle_no: number | string;
  license: string;
  province: string;
  truck_type: string;
  company_name: string;
  detail_id: string | null;

  number_fbp?: string | null;
  date_number_fbp?: string | null;
  number_tis?: string | null;
  date_number_tis?: string | null;
  number_til?: string | null;
  date_number_til?: string | null;
  number_ask?: string | null;
  date_number_ask?: string | null;
  number_kleasing?: string | null;
  date_number_kleasing?: string | null;
  number_ttb?: string | null;
  date_number_ttb?: string | null;
  number_thaiolix?: string | null;
  date_number_thaiolix?: string | null;

  warehouse_plan_date?: string | null;
  remark?: string | null;
  car_model?: string | null;
  car_brand?: string | null;
  car_chassis?: string | null;
  car_engine?: string | null;
  car_license?: string | null;
  car_province?: string | null;
  warehouse_info?: VehicleWarehouseInfoData | null;

  memo_files?: ExistingMemoFiles;
}

interface StepItem {
  id: string;
  process: string;
  detail: string | null;
  process_level: string;
  /** SLA ที่กำหนดไว้ใน Master Flow จากหลังบ้าน */
  sla?: string | number | null;
}

interface FlowItem {
  id: string;
  request_id: string;
  process_id: string;
  str_date: string | null;
  end_date: string | null;
  sla: string | number | null;
  created_by: string | null;
  created_at: string | null;
  updated_by: string | null;
  updated_at: string | null;
  vehicle_no: string | number;
  license: string;
  request_truck_detail_id: string | null;
}

interface FlowResponseData {
  request: RequestInfo;
  steps: StepItem[];
  cars: CarItem[];
  flow_data: FlowItem[];
  is_initialized: boolean;
}

interface ApiResponse {
  status?: string;
  message?: string;
  data?: FlowResponseData;
  request?: RequestInfo;
  steps?: StepItem[];
  cars?: CarItem[];
  flow_data?: FlowItem[];
  is_initialized?: boolean;
}

interface InitializeResponse {
  status?: string;
  message?: string;
  details?: {
    request_id?: number | string;
    running_doc?: string;
    fleet_type?: string;
    vehicle_count?: number;
    steps_count?: number;
    total_inserted_records?: number;
    individual_tracking?: boolean;
  };
}

interface UpdateFlowResponse {
  status?: string;
  message?: string;
  data?: unknown;
}

interface VehicleWarehouseInfoData {
  id?: string | number;
  request_id?: string | number;
  vehicle_no?: string | number;
  warehouse_plan_date?: string | null;
  remark?: string | null;
  car_model?: string | null;
  car_brand?: string | null;
  car_chassis?: string | null;
  car_engine?: string | null;
  car_license?: string | null;
  car_province?: string | null;
  number_feb?: string | null;
  date_number_feb?: string | null;
  number_fbp?: string | null;
  date_number_fbp?: string | null;
  number_tis?: string | null;
  date_number_tis?: string | null;
  number_til?: string | null;
  date_number_til?: string | null;
  number_ask?: string | null;
  date_number_ask?: string | null;
  number_kleasing?: string | null;
  date_number_kleasing?: string | null;
  number_ttb?: string | null;
  date_number_ttb?: string | null;
  number_thaiolix?: string | null;
  date_number_thaiolix?: string | null;
  created_at?: string | null;
  created_by?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
}

interface VehicleWarehouseInfoResponse {
  status?: string;
  message?: string;
  data?: VehicleWarehouseInfoData | null;
}

interface DisplayFlowRow extends FlowItem {
  process: string;
  detail: string | null;
  process_level: string;
  /** SLA เป้าหมายจาก steps.sla ของ Master Flow */
  target_sla: string | number | null;
}

interface FlowDateDraft {
  str_date: string;
  end_date: string;
}

interface CalendarPopoverPosition {
  top: number;
  left: number;
}

interface VehicleExtraForm {
  number_fbp: string;
  date_number_fbp: string;
  number_tis: string;
  date_number_tis: string;
  number_til: string;
  date_number_til: string;
  number_ask: string;
  date_number_ask: string;
  number_kleasing: string;
  date_number_kleasing: string;
  number_ttb: string;
  date_number_ttb: string;
  number_thaiolix: string;
  date_number_thaiolix: string;
  warehouse_plan_date: string;
  remark: string;
  car_model: string;
  car_brand: string;
  car_chassis: string;
  car_engine: string;
  car_license: string;
  car_province: string;
}

const emptyVehicleExtraForm: VehicleExtraForm = {
  number_fbp: "",
  date_number_fbp: "",
  number_tis: "",
  date_number_tis: "",
  number_til: "",
  date_number_til: "",
  number_ask: "",
  date_number_ask: "",
  number_kleasing: "",
  date_number_kleasing: "",
  number_ttb: "",
  date_number_ttb: "",
  number_thaiolix: "",
  date_number_thaiolix: "",
  warehouse_plan_date: "",
  remark: "",
  car_model: "",
  car_brand: "",
  car_chassis: "",
  car_engine: "",
  car_license: "",
  car_province: "",
};

const VEHICLE_DETAIL_FIELDS: Array<{
  key: keyof VehicleExtraForm;
  label: string;
  type?: "text" | "date";
}> = [
    {
      key: "warehouse_plan_date",
      label: "แผนวันที่จะเข้าคลังได้",
      type: "date",
    },
    { key: "car_model", label: "รุ่น" },
    { key: "car_brand", label: "ยี่ห้อ" },
    { key: "car_chassis", label: "เลขที่ตัวถัง" },
    { key: "car_engine", label: "เลขที่เครื่อง" },
    { key: "car_license", label: "ทะเบียนรถ" },
    { key: "car_province", label: "จังหวัด" },
  ];

type MemoFileKey =
  | "number_fbp"
  | "number_tis"
  | "number_til"
  | "number_ask"
  | "number_kleasing"
  | "number_ttb"
  | "number_thaiolix";

type MemoFiles = Partial<Record<MemoFileKey, File>>;

const MEMO_FILE_EXTENSIONS = [
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "csv",
  "zip",
  "rar",
  "txt",
  "msg",
];

const MEMO_FILE_ACCEPT = MEMO_FILE_EXTENSIONS
  .map((extension) => `.${extension}`)
  .join(",");

const MEMO_FIELDS: Array<{
  key: MemoFileKey;
  dateKey: keyof VehicleExtraForm;
  label: string;
}> = [
    {
      key: "number_fbp",
      dateKey: "date_number_fbp",
      label: "เลขบันทึกแจ้ง FBP",
    },
    {
      key: "number_tis",
      dateKey: "date_number_tis",
      label: "เลขบันทึกแจ้ง TIS",
    },
    {
      key: "number_til",
      dateKey: "date_number_til",
      label: "เลขบันทึกแจ้ง TIL",
    },
    {
      key: "number_ask",
      dateKey: "date_number_ask",
      label: "เลขบันทึกแจ้ง ASK",
    },
    {
      key: "number_kleasing",
      dateKey: "date_number_kleasing",
      label: "เลขบันทึกแจ้ง Kleasing",
    },
    {
      key: "number_ttb",
      dateKey: "date_number_ttb",
      label: "เลขบันทึกแจ้ง TTB",
    },
    {
      key: "number_thaiolix",
      dateKey: "date_number_thaiolix",
      label: "เลขบันทึกแจ้ง THAIOLIX",
    },
  ];

const emptyData: FlowResponseData = {
  request: {} as RequestInfo,
  steps: [],
  cars: [],
  flow_data: [],
  is_initialized: false,
};

function normalizeApiData(result: ApiResponse): FlowResponseData | null {
  // รองรับทั้ง:
  // 1) { status: "success", data: { request, steps, cars, flow_data } }
  // 2) { request, steps, cars, flow_data }
  const source = result.data ?? result;

  if (!source.request) return null;

  const request = source.request;
  const warehouseList = Array.isArray(request.vehicle_warehouse_info)
    ? request.vehicle_warehouse_info
    : [];
  const detailList = Array.isArray(request.details) ? request.details : [];

  const findWarehouseInfo = (
    vehicleNo: string | number,
    index: number,
    detail?: RequestVehicleDetail
  ) =>
    detail?.warehouse_info ||
    warehouseList.find(
      (info) => String(info.vehicle_no) === String(vehicleNo)
    ) ||
    warehouseList[index] ||
    null;

  const mergeCarData = (
    car: CarItem,
    index: number,
    detail?: RequestVehicleDetail
  ): CarItem => {
    const warehouseInfo = findWarehouseInfo(car.vehicle_no, index, detail);

    return {
      ...car,
      warehouse_info: warehouseInfo,
      warehouse_plan_date:
        warehouseInfo?.warehouse_plan_date ??
        detail?.warehouse_plan_date ??
        car.warehouse_plan_date ??
        null,
      remark:
        warehouseInfo?.remark ??
        detail?.remark ??
        car.remark ??
        null,
      car_model:
        warehouseInfo?.car_model ?? detail?.car_model ?? car.car_model ?? null,
      car_brand:
        warehouseInfo?.car_brand ?? detail?.car_brand ?? car.car_brand ?? null,
      car_chassis:
        warehouseInfo?.car_chassis ??
        detail?.car_chassis ??
        car.car_chassis ??
        null,
      car_engine:
        warehouseInfo?.car_engine ??
        detail?.car_engine ??
        car.car_engine ??
        null,
      car_license:
        warehouseInfo?.car_license ??
        detail?.car_license ??
        car.car_license ??
        null,
      car_province:
        warehouseInfo?.car_province ??
        detail?.car_province ??
        car.car_province ??
        null,
      number_fbp:
        warehouseInfo?.number_fbp ??
        warehouseInfo?.number_feb ??
        car.number_fbp ??
        null,
      date_number_fbp:
        warehouseInfo?.date_number_fbp ??
        warehouseInfo?.date_number_feb ??
        car.date_number_fbp ??
        null,
      number_tis: warehouseInfo?.number_tis ?? car.number_tis ?? null,
      date_number_tis:
        warehouseInfo?.date_number_tis ?? car.date_number_tis ?? null,
      number_til: warehouseInfo?.number_til ?? car.number_til ?? null,
      date_number_til:
        warehouseInfo?.date_number_til ?? car.date_number_til ?? null,
      number_ask: warehouseInfo?.number_ask ?? car.number_ask ?? null,
      date_number_ask:
        warehouseInfo?.date_number_ask ?? car.date_number_ask ?? null,
      number_kleasing:
        warehouseInfo?.number_kleasing ?? car.number_kleasing ?? null,
      date_number_kleasing:
        warehouseInfo?.date_number_kleasing ?? car.date_number_kleasing ?? null,
      number_ttb: warehouseInfo?.number_ttb ?? car.number_ttb ?? null,
      date_number_ttb:
        warehouseInfo?.date_number_ttb ?? car.date_number_ttb ?? null,
      number_thaiolix:
        warehouseInfo?.number_thaiolix ?? car.number_thaiolix ?? null,
      date_number_thaiolix:
        warehouseInfo?.date_number_thaiolix ?? car.date_number_thaiolix ?? null,
    };
  };

  const sourceCars = Array.isArray(source.cars) ? source.cars : [];
  const cars =
    sourceCars.length > 0
      ? sourceCars.map((car, index) => {
        const detail =
          detailList.find(
            (item) =>
              item.id !== null &&
              item.id !== undefined &&
              String(item.id) === String(car.detail_id)
          ) || detailList[index];

        return mergeCarData(car, index, detail);
      })
      : detailList.map((detail, index) => {
        const vehicleNo = detail.warehouse_info?.vehicle_no ?? index + 1;

        return mergeCarData(
          {
            vehicle_no: vehicleNo,
            license:
              detail.license_replace || detail.license || "-",
            province:
              detail.province_replace || detail.province || "-",
            truck_type:
              detail.truck_type_replace || detail.truck_type || "-",
            company_name:
              detail.company_name_replace || detail.company_name || "-",
            detail_id:
              detail.id === null || detail.id === undefined
                ? null
                : String(detail.id),
          },
          index,
          detail
        );
      });

  return {
    request,
    steps: Array.isArray(source.steps) ? source.steps : [],
    cars,
    flow_data: Array.isArray(source.flow_data) ? source.flow_data : [],
    is_initialized: Boolean(source.is_initialized),
  };
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  const datePart = String(value).trim().split(/[ T]/)[0];

  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const [year, month, day] = datePart.split("-");
    return `${day}/${month}/${year}`;
  }

  return value;
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const raw = String(value).trim();
  const [datePart, timePart] = raw.split(" ");

  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const [year, month, day] = datePart.split("-");
    return `${day}/${month}/${year}${timePart ? ` ${timePart.slice(0, 8)}` : ""}`;
  }

  return value;
}

function getRemainingDays(value?: string | null) {
  if (!value) return "ไม่ระบุวันที่";

  const datePart = String(value).trim().split(/[ T]/)[0];

  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return "รูปแบบวันที่ไม่ถูกต้อง";
  }

  const [year, month, day] = datePart.split("-").map(Number);

  const targetDate = new Date(year, month - 1, day);
  const today = new Date();

  // ตัดเวลาออก เพื่อเปรียบเทียบเฉพาะวันที่
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const remainingDays = Math.round(
    (targetDate.getTime() - today.getTime()) / millisecondsPerDay
  );

  if (remainingDays > 0) {
    return `เหลืออีก ${remainingDays.toLocaleString()} วัน`;
  }

  if (remainingDays === 0) {
    return "ถึงกำหนดวันนี้";
  }

  return `เกินกำหนดแล้ว ${Math.abs(remainingDays).toLocaleString()} วัน`;
}

function formatNumber(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return "-";

  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return String(value);

  return numberValue.toLocaleString("en-US");
}

function statusLabel(status?: string) {
  const value = String(status || "").trim().toLowerCase();

  if (value === "progress") return "กำลังดำเนินการ";
  if (value === "gm_pending") return "รอ GM อนุมัติ";
  if (value === "approved") return "อนุมัติแล้ว";
  if (value === "reject_by_center") return "ส่วนกลางไม่อนุมัติ";
  if (value === "reject_by_gm") return "GM ไม่อนุมัติ";

  return status || "-";
}


function toDateInputValue(value?: string | null) {
  if (!value) return "";

  const datePart = String(value).trim().split(/[ T]/)[0];

  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : "";
}

function toVehicleExtraForm(
  info?: Partial<VehicleWarehouseInfoData & CarItem> | null
): VehicleExtraForm {
  if (!info) return { ...emptyVehicleExtraForm };

  return {
    warehouse_plan_date: toDateInputValue(info.warehouse_plan_date),
    car_model: info.car_model || "",
    car_brand: info.car_brand || "",
    car_chassis: info.car_chassis || "",
    car_engine: info.car_engine || "",
    car_license: info.car_license || "",
    car_province: info.car_province || "",
    remark: info.remark || "",
    number_fbp: info.number_fbp || info.number_feb || "",
    date_number_fbp: toDateInputValue(
      info.date_number_fbp || info.date_number_feb
    ),
    number_tis: info.number_tis || "",
    date_number_tis: toDateInputValue(info.date_number_tis),
    number_til: info.number_til || "",
    date_number_til: toDateInputValue(info.date_number_til),
    number_ask: info.number_ask || "",
    date_number_ask: toDateInputValue(info.date_number_ask),
    number_kleasing: info.number_kleasing || "",
    date_number_kleasing: toDateInputValue(info.date_number_kleasing),
    number_ttb: info.number_ttb || "",
    date_number_ttb: toDateInputValue(info.date_number_ttb),
    number_thaiolix: info.number_thaiolix || "",
    date_number_thaiolix: toDateInputValue(info.date_number_thaiolix),
  };
}

function normalizeSlaDays(value?: string | number | null) {
  if (value === null || value === undefined || value === "") return 0;

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) return 0;

  return Math.ceil(parsed);
}

function toLocalDate(dateKey?: string) {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;

  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);

  return Number.isNaN(date.getTime()) ? null : date;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/**
 * คำนวณวันครบ SLA โดยนับวันเริ่มเป็นวันที่ 1
 * ตัวอย่าง SLA 1 วัน จะครบกำหนดในวันเริ่มต้น
 */
function calculateSlaDueDate(startDate?: string, slaDays?: number) {
  const start = toLocalDate(startDate);

  if (!start || !slaDays || slaDays <= 0) return "";

  const dueDate = new Date(start);
  dueDate.setDate(dueDate.getDate() + slaDays - 1);

  return toDateKey(dueDate);
}

function getDateDifferenceFromToday(dateKey?: string) {
  const targetDate = toLocalDate(dateKey);

  if (!targetDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  return Math.round(
    (targetDate.getTime() - today.getTime()) / millisecondsPerDay
  );
}

/**
 * จำนวนวันที่ใช้จริงจากวันที่เริ่มถึงวันที่สิ้นสุด
 * นับรวมวันเริ่มต้นและวันสิ้นสุด
 */
function calculateSla(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) return 0;

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end.getTime() < start.getTime()
  ) {
    return 0;
  }

  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  // นับรวมวันเริ่มต้นและวันสิ้นสุด
  return Math.floor((end.getTime() - start.getTime()) / millisecondsPerDay) + 1;
}

function parseDateValue(value?: string) {
  if (!value) return new Date();

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function formatDateRangeText(startDate?: string, endDate?: string) {
  if (!startDate && !endDate) return "เลือกวันที่เริ่ม–สิ้นสุด";
  if (startDate && !endDate) return `${formatDate(startDate)} - เลือกวันที่สิ้นสุด`;
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

/**
 * วางปฏิทินให้ชิดกับปุ่มที่กด
 * หากพื้นที่ด้านล่างไม่พอ จะเปิดเหนือปุ่มอัตโนมัติ
 */
function getCalendarPopoverPosition(
  target: HTMLElement
): CalendarPopoverPosition {
  const rect = target.getBoundingClientRect();

  const viewportPadding = 12;
  const gap = 8;
  const calendarWidth = Math.min(340, window.innerWidth - viewportPadding * 2);
  const estimatedCalendarHeight = Math.min(
    470,
    window.innerHeight - viewportPadding * 2
  );

  let top = rect.bottom + gap;
  let left = rect.left;

  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;

  if (
    spaceBelow < estimatedCalendarHeight + gap &&
    spaceAbove > spaceBelow
  ) {
    top = rect.top - estimatedCalendarHeight - gap;
  }

  if (left + calendarWidth > window.innerWidth - viewportPadding) {
    left = rect.right - calendarWidth;
  }

  top = Math.max(
    viewportPadding,
    Math.min(
      top,
      window.innerHeight - estimatedCalendarHeight - viewportPadding
    )
  );

  left = Math.max(
    viewportPadding,
    Math.min(left, window.innerWidth - calendarWidth - viewportPadding)
  );

  return { top, left };
}

function normalizeProcessName(value?: string | null) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}

const CANCEL_DOCUMENT_PROCESS = normalizeProcessName("ยกเลิกหนังสือ");
const EXPIRED_DOCUMENT_PROCESS = normalizeProcessName("หนังสือหมดอายุ");

export default function FlowAssessmentModal({
  open,
  requestId,
  vehicleNo,
  onClose,
}: FlowAssessmentModalProps) {
  const [data, setData] = useState<FlowResponseData>(emptyData);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [savingFlowId, setSavingFlowId] = useState<string | null>(null);
  const [openDatePicker, setOpenDatePicker] = useState<{
    flowId: string;
    field: keyof FlowDateDraft;
    position: CalendarPopoverPosition;
  } | null>(null);
  const [dateDrafts, setDateDrafts] = useState<Record<string, FlowDateDraft>>(
    {}
  );
  const [vehicleExtraForm, setVehicleExtraForm] =
    useState<VehicleExtraForm>(emptyVehicleExtraForm);
  const [savingMemoKey, setSavingMemoKey] = useState<MemoFileKey | null>(null);
  const [savingWarehouseInfo, setSavingWarehouseInfo] = useState(false);
  const [openWarehouseDatePicker, setOpenWarehouseDatePicker] =
    useState<CalendarPopoverPosition | null>(null);
  const [openMemoDatePicker, setOpenMemoDatePicker] = useState<{
    dateKey: keyof VehicleExtraForm;
    label: string;
    position: CalendarPopoverPosition;
  } | null>(null);

  const fetchFlowData = async () => {
    if (requestId === null || requestId === undefined || requestId === "") {
      setError("ไม่พบ Request ID");
      setData(emptyData);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${FLOW_API_URL}?request_id=${encodeURIComponent(String(requestId))}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(`โหลดข้อมูลไม่สำเร็จ (${response.status})`);
      }

      const result: ApiResponse = await response.json();

      if (result.status === "error") {
        throw new Error(result.message || "API ส่งสถานะ error");
      }

      const normalizedData = normalizeApiData(result);

      if (!normalizedData) {
        throw new Error("รูปแบบข้อมูลจาก API ไม่ถูกต้อง");
      }

      const hasSelectedVehicle =
        vehicleNo !== null &&
        vehicleNo !== undefined &&
        vehicleNo !== "";

      const filteredData: FlowResponseData = hasSelectedVehicle
        ? {
          ...normalizedData,
          cars: normalizedData.cars.filter(
            (car) => String(car.vehicle_no) === String(vehicleNo)
          ),
          flow_data: normalizedData.flow_data.filter(
            (flow) => String(flow.vehicle_no) === String(vehicleNo)
          ),
        }
        : normalizedData;

      setData(filteredData);

      const selectedCar = filteredData.cars[0];

      setVehicleExtraForm(toVehicleExtraForm(selectedCar));

      setExistingMemoFiles(
        selectedCar?.memo_files &&
          typeof selectedCar.memo_files === "object"
          ? selectedCar.memo_files
          : {}
      );

      const initialDateDrafts = filteredData.flow_data.reduce<
        Record<string, FlowDateDraft>
      >((drafts, flow) => {
        drafts[String(flow.id)] = {
          str_date: toDateInputValue(flow.str_date),
          end_date: toDateInputValue(flow.end_date),
        };

        return drafts;
      }, {});

      setDateDrafts(initialDateDrafts);
    } catch (fetchError) {
      console.error("fetchFlowData error:", fetchError);
      setData(emptyData);
      setDateDrafts({});
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "เกิดข้อผิดพลาดในการโหลดข้อมูล"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicleWarehouseInfo = async () => {
    if (
      requestId === null ||
      requestId === undefined ||
      requestId === "" ||
      vehicleNo === null ||
      vehicleNo === undefined ||
      vehicleNo === ""
    ) {
      setVehicleExtraForm(emptyVehicleExtraForm);
      return;
    }

    const url =
      `${VEHICLE_WAREHOUSE_INFO_API_URL}` +
      `?request_id=${encodeURIComponent(String(requestId))}` +
      `&vehicle_no=${encodeURIComponent(String(vehicleNo))}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const responseText = await response.text();

    let result: VehicleWarehouseInfoResponse = {};

    try {
      result = responseText
        ? (JSON.parse(responseText) as VehicleWarehouseInfoResponse)
        : {};
    } catch {
      throw new Error(
        `vehicle_warehouse_info.php ไม่ได้ส่ง JSON กลับมา: ${responseText}`
      );
    }

    if (!response.ok || result.status !== "success") {
      throw new Error(
        result.message ||
        `โหลดข้อมูลรายละเอียดรถไม่สำเร็จ (${response.status})`
      );
    }

    const info = result.data;

    if (!info) {
      return;
    }

    setVehicleExtraForm(toVehicleExtraForm(info));

    console.log("Vehicle warehouse info:", info);
  };

  const handleRefreshData = async () => {
    try {
      setError("");
      await fetchFlowData();
      await fetchVehicleWarehouseInfo();
    } catch (refreshError) {
      console.error("handleRefreshData error:", refreshError);
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "เกิดข้อผิดพลาดในการรีเฟรชข้อมูล"
      );
    }
  };

  const getCreatedBy = () => {
    if (typeof window === "undefined") return "";

    const savedUser =
      localStorage.getItem("user_info") ||
      localStorage.getItem("user") ||
      localStorage.getItem("userInfo");

    if (!savedUser) return "";

    try {
      const user = JSON.parse(savedUser);

      const name =
        user?.name ||
        "";

      const surname =
        user?.surname ||
        "";

      return [name, surname]
        .map((value) => String(value).trim())
        .filter(Boolean)
        .join(" ");
    } catch {
      return "";
    }
  };

  const getCurrentDepartment = () => {
    if (typeof window === "undefined") return "";

    const savedUser =
      localStorage.getItem("user_info") ||
      localStorage.getItem("user") ||
      localStorage.getItem("userInfo");

    if (!savedUser) return "";

    try {
      const user = JSON.parse(savedUser);

      return String(
        user?.department ||
        user?.DEPARTMENT ||
        user?.department_name ||
        user?.DEPARTMENT_NAME ||
        ""
      )
        .trim()
        .toUpperCase();
    } catch {
      return "";
    }
  };

  const canEditProcessLevel = (processLevel: string | number) => {
    const department = getCurrentDepartment();
    const level = Number(processLevel);

    if (department === "FBP") return level === 7;
    if (department === "KA") return level === 8;

    return true;
  };

  const handleVehicleExtraChange = (
    field: keyof VehicleExtraForm,
    value: string
  ) => {
    setVehicleExtraForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSaveWarehouseInfo = async () => {
    if (
      requestId === null ||
      requestId === undefined ||
      requestId === "" ||
      vehicleNo === null ||
      vehicleNo === undefined ||
      vehicleNo === ""
    ) {
      setError("ไม่พบ Request ID หรือหมายเลขรถ");
      return;
    }

    try {
      setSavingWarehouseInfo(true);
      setError("");
      setActionMessage("");

      const user = getCreatedBy();

      if (!user) {
        throw new Error("ไม่พบข้อมูลผู้ใช้งานใน localStorage");
      }

      const payload = {
        action: "warehouse_info",
        request_id: String(requestId),
        vehicle_no: String(vehicleNo),

        warehouse_plan_date:
          vehicleExtraForm.warehouse_plan_date || null,
        remark: vehicleExtraForm.remark.trim(),
        car_model: vehicleExtraForm.car_model.trim(),
        car_brand: vehicleExtraForm.car_brand.trim(),
        car_chassis: vehicleExtraForm.car_chassis.trim(),
        car_engine: vehicleExtraForm.car_engine.trim(),
        car_license: vehicleExtraForm.car_license.trim(),
        car_province: vehicleExtraForm.car_province.trim(),

        user,
      };

      console.log("Vehicle warehouse payload:", payload);

      const response = await fetch(VEHICLE_WAREHOUSE_INFO_API_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      let result: UpdateFlowResponse = {};

      try {
        result = responseText
          ? (JSON.parse(responseText) as UpdateFlowResponse)
          : {};
      } catch {
        throw new Error(
          `API ไม่ได้ส่งข้อมูล JSON กลับมา: ${responseText}`
        );
      }

      if (!response.ok || result.status !== "success") {
        throw new Error(
          result.message ||
          `บันทึกข้อมูลรายละเอียดรถไม่สำเร็จ (${response.status})`
        );
      }

      setActionMessage(
        result.message ||
        `บันทึกข้อมูลรายละเอียดรถคันที่ ${vehicleNo} เรียบร้อยแล้ว`
      );

      await fetchVehicleWarehouseInfo();
    } catch (saveError) {
      console.error("handleSaveWarehouseInfo error:", saveError);

      setError(
        saveError instanceof Error
          ? saveError.message
          : "เกิดข้อผิดพลาดในการบันทึกข้อมูลรายละเอียดรถ"
      );
    } finally {
      setSavingWarehouseInfo(false);
    }
  };

  const [memoFiles, setMemoFiles] = useState<MemoFiles>({});

  const [existingMemoFiles, setExistingMemoFiles] =
    useState<ExistingMemoFiles>({});

  const handleMemoFileChange = (
    field: MemoFileKey,
    file: File | null
  ) => {
    if (!file) {
      setMemoFiles((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });

      return;
    }

    const extension = file.name
      .split(".")
      .pop()
      ?.trim()
      .toLowerCase();

    if (!extension || !MEMO_FILE_EXTENSIONS.includes(extension)) {
      setError(
        `ไม่รองรับไฟล์ ${file.name} กรุณาเลือกไฟล์ประเภท ${MEMO_FILE_EXTENSIONS.join(
          ", "
        )}`
      );
      return;
    }

    setError("");

    setMemoFiles((current) => ({
      ...current,
      [field]: file,
    }));
  };

  const handleInitializeFlow = async () => {
    if (requestId === null || requestId === undefined || requestId === "") {
      setError("ไม่พบ Request ID");
      return;
    }

    if (data.is_initialized) {
      setActionMessage("รายการนี้เริ่มต้นกระบวนการแล้ว");
      return;
    }

    const confirmed = window.confirm(
      `ยืนยันเริ่มต้นกระบวนการสำหรับ Request ID ${requestId} หรือไม่?`
    );

    if (!confirmed) return;

    try {
      setInitializing(true);
      setError("");
      setActionMessage("");

      const createdBy = getCreatedBy();

      const payload: Record<string, string | number> = {
        request_id: Number.isNaN(Number(requestId))
          ? String(requestId)
          : Number(requestId),
      };

      if (createdBy) {
        payload.created_by = createdBy;
      }

      const response = await fetch(FLOW_INITIALIZE_API_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result: InitializeResponse = await response.json();

      if (!response.ok || result.status !== "success") {
        throw new Error(
          result.message || `เริ่มต้นกระบวนการไม่สำเร็จ (${response.status})`
        );
      }

      const inserted = result.details?.total_inserted_records;
      const vehicleCount = result.details?.vehicle_count;
      const stepsCount = result.details?.steps_count;

      setActionMessage(
        [
          result.message || "เริ่มต้นกระบวนการทำงานสำเร็จแล้ว!",
          inserted !== undefined ? `สร้าง ${inserted} รายการ` : "",
          vehicleCount !== undefined ? `${vehicleCount} คัน` : "",
          stepsCount !== undefined ? `${stepsCount} ขั้นตอน` : "",
        ]
          .filter(Boolean)
          .join(" · ")
      );

      // โหลดข้อมูลใหม่ เพื่อเปลี่ยน is_initialized และดึง flow_data ล่าสุด
      await fetchFlowData();
    } catch (initializeError) {
      console.error("handleInitializeFlow error:", initializeError);
      setError(
        initializeError instanceof Error
          ? initializeError.message
          : "เกิดข้อผิดพลาดในการเริ่มต้นกระบวนการ"
      );
    } finally {
      setInitializing(false);
    }
  };

  const handleAssessmentClick = () => {
    document
      .getElementById("flow-assessment-table")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleFlowDateChange = (
    flowId: string,
    field: keyof FlowDateDraft,
    value: string
  ) => {
    setDateDrafts((current) => ({
      ...current,
      [flowId]: {
        str_date: current[flowId]?.str_date || "",
        end_date: current[flowId]?.end_date || "",
        [field]: value,
      },
    }));
  };

  const handleClearFlowDates = (flowId: string) => {
    setDateDrafts((current) => ({
      ...current,
      [flowId]: {
        str_date: "",
        end_date: "",
      },
    }));
  };

  const handleSaveFlowDates = async (flow: DisplayFlowRow) => {
    const flowId = String(flow.id);

    if (!canEditProcessLevel(flow.process_level)) {
      const department = getCurrentDepartment();

      setError(
        department === "FBP"
          ? "แผนก FBP สามารถกรอกได้เฉพาะ Process Level 7"
          : department === "KA"
            ? "แผนก KA สามารถกรอกได้เฉพาะ Process Level 8"
            : "คุณไม่มีสิทธิ์แก้ไขขั้นตอนนี้"
      );
      return;
    }

    const documentFinalStatus = data.flow_data.reduce<
      "cancelled" | "expired" | null
    >((status, item) => {
      if (status || String(item.vehicle_no) !== String(flow.vehicle_no)) {
        return status;
      }

      const processName = normalizeProcessName(
        data.steps.find((step) => String(step.id) === String(item.process_id))
          ?.process
      );
      const hasFinalDate = Boolean(item.str_date || item.end_date);

      if (!hasFinalDate) return null;
      if (processName === CANCEL_DOCUMENT_PROCESS) return "cancelled";
      if (processName === EXPIRED_DOCUMENT_PROCESS) return "expired";

      return null;
    }, null);

    if (documentFinalStatus) {
      setError(
        documentFinalStatus === "cancelled"
          ? "ไม่สามารถแก้ไขได้แล้ว เนื่องจากเอกสารถูกยกเลิก"
          : "ไม่สามารถแก้ไขได้แล้ว เนื่องจากเอกสารหมดอายุ"
      );
      return;
    }

    // ถ้ามีวันที่ในฐานข้อมูลครบแล้ว ไม่อนุญาตให้บันทึกซ้ำ
    const isAlreadySaved = Boolean(flow.str_date && flow.end_date);

    if (isAlreadySaved) {
      setError("ขั้นตอนนี้กำหนดวันที่และบันทึกเรียบร้อยแล้ว ไม่สามารถแก้ไขซ้ำได้");
      return;
    }

    const draft = dateDrafts[flowId] || {
      str_date: toDateInputValue(flow.str_date),
      end_date: toDateInputValue(flow.end_date),
    };

    // บังคับเฉพาะวันที่เริ่ม
    if (!draft.str_date) {
      setError("กรุณาเลือกวันที่เริ่ม");
      return;
    }

    // ตรวจวันที่สิ้นสุดเฉพาะกรณีที่มีการกรอก
    if (draft.end_date && draft.end_date < draft.str_date) {
      setError("วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่ม");
      return;
    }

    // จำนวนวันที่ใช้จริง แยกจาก SLA เป้าหมายใน Master Flow
    const actualDays = draft.end_date
      ? calculateSla(draft.str_date, draft.end_date)
      : 0;

    if (draft.end_date && actualDays <= 0) {
      setError("ไม่สามารถคำนวณจำนวนวันที่ใช้จริงได้");
      return;
    }

    const user = getCreatedBy();

    if (!user) {
      setError("ไม่พบข้อมูลผู้ใช้งานใน localStorage");
      return;
    }

    try {
      setSavingFlowId(flowId);
      setError("");
      setActionMessage("");

      const payload = {
        request_id: String(flow.request_id || requestId || ""),
        process_id: String(flow.process_id || ""),
        vehicle_no: String(flow.vehicle_no || ""),
        str_date: draft.str_date,
        end_date: draft.end_date || null,
        // flow_data.sla เก็บจำนวนวันที่ใช้จริง
        // SLA เป้าหมายอ่านจาก steps.sla โดยไม่เขียนทับค่า Master
        sla: draft.end_date ? String(actualDays) : "0",
        user,
      };

      const response = await fetch(FLOW_UPDATE_API_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let result: UpdateFlowResponse = {};

      try {
        result = await response.json();
      } catch {
        throw new Error("API ไม่ได้ส่งข้อมูล JSON กลับมา");
      }

      if (!response.ok || result.status !== "success") {
        throw new Error(
          result.message || `บันทึกวันที่ไม่สำเร็จ (${response.status})`
        );
      }

      setActionMessage(
        result.message ||
        `บันทึกวันที่ขั้นตอน “${flow.process}” ของรถคันที่ ${flow.vehicle_no} สำเร็จ`
      );

      await fetchFlowData();
    } catch (saveError) {
      console.error("handleSaveFlowDates error:", saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : "เกิดข้อผิดพลาดในการบันทึกวันที่"
      );
    } finally {
      setSavingFlowId(null);
    }
  };

  const handleSpecialProcessAction = async (
    targetFlow: DisplayFlowRow | null | undefined,
    actionLabel: "ยกเลิกหนังสือ" | "หนังสือหมดอายุ",
    confirmMessage?: string
  ) => {
    if (!targetFlow) {
      setError(`ไม่พบ Process “${actionLabel}” ใน Master Flow`);
      return;
    }

    if (targetFlow.str_date || targetFlow.end_date) {
      setActionMessage(`รายการ “${actionLabel}” ถูกบันทึกแล้ว`);
      return;
    }

    const confirmed = window.confirm(
      confirmMessage ||
      (actionLabel === "ยกเลิกหนังสือ"
        ? "ยืนยันยกเลิกหนังสือของรถคันนี้หรือไม่? ระบบจะบันทึกสถานะยกเลิกทันที"
        : "ยืนยันบันทึกเป็นหนังสือหมดอายุหรือไม่?")
    );

    if (!confirmed) return;

    const user = getCreatedBy();

    if (!user) {
      setError("ไม่พบข้อมูลผู้ใช้งานใน localStorage");
      return;
    }

    const today = toDateKey(new Date());
    const flowId = String(targetFlow.id);

    try {
      setSavingFlowId(flowId);
      setError("");
      setActionMessage("");

      const payload = {
        request_id: String(targetFlow.request_id || requestId || ""),
        process_id: String(targetFlow.process_id || ""),
        vehicle_no: String(targetFlow.vehicle_no || ""),
        str_date: today,
        end_date: today,
        sla: "1",
        user,
      };

      const response = await fetch(FLOW_UPDATE_API_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let result: UpdateFlowResponse = {};

      try {
        result = await response.json();
      } catch {
        throw new Error("API ไม่ได้ส่งข้อมูล JSON กลับมา");
      }

      if (!response.ok || result.status !== "success") {
        throw new Error(
          result.message || `บันทึก “${actionLabel}” ไม่สำเร็จ (${response.status})`
        );
      }

      setActionMessage(
        result.message ||
        `บันทึก “${actionLabel}” สำหรับรถคันที่ ${targetFlow.vehicle_no} เรียบร้อยแล้ว`
      );

      setOpenDatePicker(null);

      await fetchFlowData();
    } catch (actionError) {
      console.error("handleSpecialProcessAction error:", actionError);
      setError(
        actionError instanceof Error
          ? actionError.message
          : `เกิดข้อผิดพลาดในการบันทึก “${actionLabel}”`
      );
    } finally {
      setSavingFlowId(null);
    }
  };

  const handleSaveMemo = async (
    field: (typeof MEMO_FIELDS)[number]
  ) => {
    if (
      requestId === null ||
      requestId === undefined ||
      requestId === "" ||
      vehicleNo === null ||
      vehicleNo === undefined ||
      vehicleNo === ""
    ) {
      setError("ไม่พบ Request ID หรือหมายเลขรถ");
      return;
    }

    const memoNumber = String(
      vehicleExtraForm[field.key] || ""
    ).trim();

    const memoDate = String(
      vehicleExtraForm[field.dateKey] || ""
    ).trim();

    const selectedFile = memoFiles[field.key];
    const existingFile = existingMemoFiles[field.key];

    if (!memoNumber) {
      setError(`กรุณากรอก${field.label}`);
      return;
    }

    if (!memoDate) {
      setError(`กรุณาเลือกวันที่ของ${field.label}`);
      return;
    }

    try {
      setSavingMemoKey(field.key);
      setError("");
      setActionMessage("");

      const user = getCreatedBy();

      if (!user) {
        throw new Error("ไม่พบข้อมูลผู้ใช้งานใน localStorage");
      }

      /*
       * 1) บันทึกเลขบันทึกและวันที่ลง vehicle_warehouse_info
       * บันทึกเฉพาะรายการที่กด ไม่กระทบคอลัมน์อื่น
       */
      const memoPayload = {
        action: "memo",
        request_id: String(requestId),
        vehicle_no: String(vehicleNo),
        memo_type: field.key,
        memo_number: memoNumber,
        memo_date: memoDate,
        user,
      };

      const memoResponse = await fetch(
        VEHICLE_WAREHOUSE_INFO_API_URL,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(memoPayload),
        }
      );

      const memoResponseText = await memoResponse.text();
      let memoResult: VehicleWarehouseInfoResponse = {};

      try {
        memoResult = memoResponseText
          ? (JSON.parse(memoResponseText) as VehicleWarehouseInfoResponse)
          : {};
      } catch {
        throw new Error(
          `vehicle_warehouse_info.php ไม่ได้ส่ง JSON กลับมา: ${memoResponseText}`
        );
      }

      if (!memoResponse.ok || memoResult.status !== "success") {
        throw new Error(
          memoResult.message ||
          `บันทึก${field.label}ไม่สำเร็จ (${memoResponse.status})`
        );
      }

      let fileMessage = "";

      /*
       * 2) ถ้ามีไฟล์ใหม่ จึงส่งไฟล์ไป master_file.php
       */
      if (selectedFile) {
        const selectedCar = data.cars.find(
          (car) => String(car.vehicle_no) === String(vehicleNo)
        );

        const fileFormData = new FormData();
        fileFormData.append("request_id", String(requestId));
        fileFormData.append("vehicle_no", String(vehicleNo));
        fileFormData.append("file_type", field.label);
        fileFormData.append("memo_type", field.key);
        fileFormData.append("memo_number", memoNumber);
        fileFormData.append("memo_date", memoDate);
        fileFormData.append("create_by", user);
        fileFormData.append("update_by", user);
        fileFormData.append("file", selectedFile, selectedFile.name);

        if (data.request?.running_doc) {
          fileFormData.append(
            "running_doc",
            String(data.request.running_doc)
          );
        }

        if (selectedCar?.detail_id) {
          fileFormData.append(
            "request_truck_detail_id",
            String(selectedCar.detail_id)
          );
        }

        if (existingFile?.id) {
          fileFormData.append("id", String(existingFile.id));
        }

        const fileResponse = await fetch(MASTER_FILE_API_URL, {
          method: "POST",
          headers: {
            Accept: "application/json",
          },
          body: fileFormData,
        });

        const fileResponseText = await fileResponse.text();
        let fileResult: MasterFileResponse = {};

        try {
          fileResult = fileResponseText
            ? (JSON.parse(fileResponseText) as MasterFileResponse)
            : {};
        } catch {
          throw new Error(
            `บันทึกเลขบันทึกแล้ว แต่ master_file.php ไม่ได้ส่ง JSON กลับมา: ${fileResponseText}`
          );
        }

        if (!fileResponse.ok || fileResult.status !== "success") {
          throw new Error(
            fileResult.message ||
            `บันทึกเลขบันทึกแล้ว แต่อัปโหลดไฟล์ของ${field.label}ไม่สำเร็จ (${fileResponse.status})`
          );
        }

        setExistingMemoFiles((current) => ({
          ...current,
          [field.key]: {
            id: fileResult.data?.id || existingFile?.id,
            file_name:
              selectedFile.name ||
              fileResult.data?.file_name ||
              existingFile?.file_name ||
              "",
            file_url:
              fileResult.data?.file_url ||
              existingFile?.file_url ||
              null,
          },
        }));

        fileMessage = " พร้อมอัปโหลดไฟล์แล้ว";
      }

      setMemoFiles((current) => {
        const next = { ...current };
        delete next[field.key];
        return next;
      });

      /* ดึงค่าล่าสุดจากฐานข้อมูลกลับมาแสดง */
      await fetchVehicleWarehouseInfo();

      setActionMessage(
        `${memoResult.message || `บันทึก${field.label}เรียบร้อยแล้ว`}${fileMessage}`
      );
    } catch (saveError) {
      console.error("handleSaveMemo error:", saveError);
      setError(
        saveError instanceof Error
          ? saveError.message
          : `เกิดข้อผิดพลาดในการบันทึก${field.label}`
      );
    } finally {
      setSavingMemoKey(null);
    }
  };

  useEffect(() => {
    if (!open) return;

    setActionMessage("");
    setError("");

    const loadModalData = async () => {
      try {
        await fetchFlowData();
        await fetchVehicleWarehouseInfo();
      } catch (loadError) {
        console.error("loadModalData error:", loadError);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "เกิดข้อผิดพลาดในการโหลดข้อมูล"
        );
      }
    };

    void loadModalData();
  }, [open, requestId, vehicleNo]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  const stepMap = useMemo(() => {
    return new Map(data.steps.map((step) => [String(step.id), step]));
  }, [data.steps]);

  const flowRows = useMemo<DisplayFlowRow[]>(() => {
    if (data.flow_data.length > 0) {
      return data.flow_data
        .map((flow) => {
          const step = stepMap.get(String(flow.process_id));

          return {
            ...flow,
            process: step?.process || `Process ID ${flow.process_id}`,
            detail: step?.detail ?? null,
            process_level: step?.process_level || flow.process_id,
            target_sla: step?.sla ?? null,
          };
        })
        .sort((a, b) => {
          const vehicleCompare =
            Number(a.vehicle_no || 0) - Number(b.vehicle_no || 0);

          if (vehicleCompare !== 0) return vehicleCompare;

          return Number(a.process_level || 0) - Number(b.process_level || 0);
        });
    }

    // กรณียังไม่ Initialize Flow ให้แสดงขั้นตอน Master แยกตามรถ
    return data.cars.flatMap((car) =>
      data.steps.map((step) => ({
        id: `${car.vehicle_no}-${step.id}`,
        request_id: data.request?.id || String(requestId || ""),
        process_id: step.id,
        str_date: null,
        end_date: null,
        sla: "0",
        created_by: null,
        created_at: null,
        updated_by: null,
        updated_at: null,
        vehicle_no: car.vehicle_no,
        license: car.license,
        request_truck_detail_id: car.detail_id,
        process: step.process,
        detail: step.detail,
        process_level: step.process_level,
        target_sla: step.sla ?? null,
      }))
    );
  }, [data, requestId, stepMap]);

  const flowRowsByVehicle = useMemo(() => {
    const vehicleMap = new Map<
      string,
      {
        vehicle_no: string | number;
        license: string;
        rows: DisplayFlowRow[];
        cancelDocumentFlow: DisplayFlowRow | null;
        expiredDocumentFlow: DisplayFlowRow | null;
      }
    >();

    flowRows.forEach((flow) => {
      const vehicleKey = String(flow.vehicle_no);

      if (!vehicleMap.has(vehicleKey)) {
        vehicleMap.set(vehicleKey, {
          vehicle_no: flow.vehicle_no,
          license: flow.license,
          rows: [],
          cancelDocumentFlow: null,
          expiredDocumentFlow: null,
        });
      }

      const vehicle = vehicleMap.get(vehicleKey);
      if (!vehicle) return;

      const processName = normalizeProcessName(flow.process);

      // ไม่แสดงเป็นการ์ดแยก แต่เก็บไว้ใช้เป็นปุ่มใน “รอไฟแนนซ์อนุมัติ”
      if (processName === CANCEL_DOCUMENT_PROCESS) {
        vehicle.cancelDocumentFlow = flow;
        return;
      }

      if (processName === EXPIRED_DOCUMENT_PROCESS) {
        vehicle.expiredDocumentFlow = flow;
        return;
      }

      vehicle.rows.push(flow);
    });

    return Array.from(vehicleMap.values())
      .map((vehicle) => ({
        ...vehicle,
        rows: vehicle.rows.sort(
          (a, b) =>
            Number(a.process_level || 0) - Number(b.process_level || 0)
        ),
      }))
      .sort(
        (a, b) => Number(a.vehicle_no || 0) - Number(b.vehicle_no || 0)
      );
  }, [flowRows]);

  if (!open) return null;

  const request = data.request;

  const toDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const getTodayDateKey = () => {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-5">
      <button
        type="button"
        aria-label="ปิดหน้าต่าง"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <section className="relative flex max-h-[96vh] w-full max-w-[1440px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-2xl sm:max-h-[94vh]">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-6 sm:py-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-blue-500">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
                <ClipboardList size={14} />
              </span>
              Fleet Process Tracking
            </div>

            <h2 className="mt-1 truncate text-lg font-black text-slate-900 sm:text-xl">
              {request?.running_doc || `Request ID: ${requestId}`}
            </h2>

            <p className="mt-1 text-xs font-semibold text-slate-400">
              รายละเอียดคำขอ รถ และขั้นตอนการดำเนินงาน
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {!loading &&
              request?.id &&
              data.is_initialized && (
                <button
                  type="button"
                  onClick={handleAssessmentClick}
                  disabled={initializing}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle2 size={15} />
                  ประเมิน
                </button>
              )}

            <button
              type="button"
              onClick={handleRefreshData}
              disabled={
                loading ||
                initializing ||
                savingFlowId !== null ||
                savingMemoKey !== null ||
                savingWarehouseInfo
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 text-xs font-black text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={15}
                className={loading ? "animate-spin" : ""}
              />
              <span className="hidden sm:inline">รีเฟรช</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              disabled={
                initializing ||
                savingFlowId !== null ||
                savingMemoKey !== null ||
                savingWarehouseInfo
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex min-h-[430px] flex-col items-center justify-center">
              <LoaderCircle size={34} className="animate-spin text-blue-600" />
              <p className="mt-3 text-sm font-bold text-slate-500">
                กำลังโหลดข้อมูล Request ID {requestId}...
              </p>
            </div>
          ) : error ? (
            <div className="flex min-h-[430px] flex-col items-center justify-center text-center">
              <div className="rounded-2xl bg-rose-50 px-5 py-4 text-sm font-bold text-rose-600">
                {error}
              </div>
              <button
                type="button"
                onClick={handleRefreshData}
                className="mt-4 rounded-xl bg-blue-700 px-4 py-2 text-xs font-black text-white"
              >
                ลองใหม่
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {actionMessage && (
                <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">
                  <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
                  <span>{actionMessage}</span>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <InfoCard
                  icon={<ClipboardList size={17} />}
                  label="เลขที่เอกสาร"
                  value={request?.running_doc || "-"}
                  subValue={`Request ID: ${request?.id || requestId}`}
                />
                <InfoCard
                  icon={<Building2 size={17} />}
                  label="DC"
                  value={request?.dc_code || "-"}
                  subValue={request?.dc_type || "-"}
                />
                <InfoCard
                  icon={<Truck size={17} />}
                  label="ประเภทรถ"
                  value={request?.fleet_truck_type || "-"}
                  subValue={`${request?.fleet_type || "-"} · ${formatNumber(
                    request?.qty
                  )} คัน`}
                />
                <InfoCard
                  icon={<CalendarDays size={17} />}
                  label="วันที่ต้องการใช้งาน"
                  value={formatDate(request?.usage_date)}
                  subValue={getRemainingDays(request?.usage_date)}
                />
              </div>

              <div className="">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-8">
                  <h3 className="text-sm font-black text-slate-800">
                    ข้อมูลคำขอ
                  </h3>

                  <div className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailItem
                      label="วันที่ขอ"
                      value={formatDateTime(request?.request_date)}
                    />

                    <DetailItem
                      label="ผู้ขอ"
                      value={request?.request_by}
                    />

                    <DetailItem
                      label="จำนวนรถที่ขอ"
                      value={`${formatNumber(request?.qty)} คัน`}
                    />

                    <DetailItem
                      label="จำนวนรถที่อนุมัติ"
                      value={`${formatNumber(request?.approved_qty ?? 0)} คัน`}
                    />

                    <DetailItem
                      label="จำนวนรถที่ไม่อนุมัติ"
                      value={`${formatNumber(
                        Math.max(
                          Number(request?.qty ?? 0) -
                          Number(request?.approved_qty ?? 0),
                          0
                        )
                      )} คัน`}
                    />


                    <DetailItem
                      label="บริษัทที่อนุมัติ"
                      value={
                        request?.approved_company_name ||
                        "รออนุมัติ"
                      }
                    />

                    <DetailItem
                      label="ประเภทรถที่อนุมัติ"
                      value={
                        request?.approved_truck_type || "-"
                      }
                    />

                    <DetailItem
                      label="ผู้อนุมัติ"
                      value={request?.approved_by || "-"}
                    />

                    <DetailItem
                      label="Workload"
                      value={formatNumber(request?.workload)}
                    />

                    <DetailItem
                      label="Truck Turn"
                      value={formatNumber(request?.truckturn)}
                    />


                    <DetailItem
                      label="หมายเหตุ"
                      value={request?.remark || "-"}
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-slate-800">
                      ข้อมูลเพิ่มเติมของรถ
                    </h3>
                    <p className="mt-1 truncate text-[10px] font-semibold text-slate-400">
                      รถคันที่ {vehicleNo || "-"} ·{" "}
                      {request?.running_doc && vehicleNo !== null &&
                        vehicleNo !== undefined
                        ? `${request.running_doc}_${vehicleNo}`
                        : "-"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.45fr)]">
                  <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="text-xs font-black text-slate-800">
                          ข้อมูลรายละเอียดรถ
                        </h4>

                        <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                          ข้อมูลแผนเข้าคลังและรายละเอียดตัวรถ
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                      {VEHICLE_DETAIL_FIELDS.map((field) => (
                        <div key={field.key} className="block">
                          <span className="mb-1.5 block text-[10px] font-black text-slate-500">
                            {field.label}
                          </span>

                          {field.key === "warehouse_plan_date" ? (
                            <button
                              type="button"
                              onClick={(event) =>
                                setOpenWarehouseDatePicker(
                                  getCalendarPopoverPosition(event.currentTarget)
                                )
                              }
                              disabled={savingWarehouseInfo}
                              className="flex h-10 w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-xs font-bold text-slate-700 outline-none transition hover:border-blue-300 hover:bg-blue-50 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                            >
                              <CalendarDays
                                size={14}
                                className="shrink-0 text-blue-500"
                              />

                              <span className="truncate">
                                {vehicleExtraForm.warehouse_plan_date
                                  ? formatDate(vehicleExtraForm.warehouse_plan_date)
                                  : "เลือกวันที่จะเข้าคลัง"}
                              </span>
                            </button>
                          ) : (
                            <>
                              <input
                                type="text"
                                list={
                                  field.key === "car_province"
                                    ? `car-province-options-${vehicleNo}`
                                    : undefined
                                }
                                value={vehicleExtraForm[field.key]}
                                onChange={(event) =>
                                  handleVehicleExtraChange(
                                    field.key,
                                    event.target.value
                                  )
                                }
                                placeholder={
                                  field.key === "car_province"
                                    ? "เลือกหรือพิมพ์จังหวัด"
                                    : `กรอก${field.label}`
                                }
                                disabled={savingWarehouseInfo}
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                              />

                              {field.key === "car_province" && (
                                <ProvinceDatalist
                                  id={`car-province-options-${vehicleNo}`}
                                />
                              )}
                            </>
                          )}
                        </div>
                      ))}

                      {/* หมายเหตุ */}
                      <div className="sm:col-span-2 xl:col-span-1 2xl:col-span-2">
                        <label
                          htmlFor={`vehicle-remark-${vehicleNo}`}
                          className="mb-1.5 block text-[10px] font-black text-slate-500"
                        >
                          หมายเหตุ
                        </label>

                        <textarea
                          id={`vehicle-remark-${vehicleNo}`}
                          rows={3}
                          value={vehicleExtraForm.remark || ""}
                          onChange={(event) =>
                            handleVehicleExtraChange("remark", event.target.value)
                          }
                          placeholder="กรอกหมายเหตุเพิ่มเติม"
                          disabled={savingWarehouseInfo}
                          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                        />
                      </div>

                      {/* ปุ่มบันทึกด้านล่าง */}
                      <div className="mt-4 flex justify-end border-t border-slate-200 pt-4">
                        <button
                          type="button"
                          onClick={handleSaveWarehouseInfo}
                          disabled={
                            savingWarehouseInfo ||
                            loading ||
                            vehicleNo === null ||
                            vehicleNo === undefined ||
                            vehicleNo === ""
                          }
                          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-xs font-black text-white shadow-md shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                        >
                          {savingWarehouseInfo ? (
                            <LoaderCircle size={14} className="animate-spin" />
                          ) : (
                            <Save size={14} />
                          )}

                          {savingWarehouseInfo
                            ? "กำลังบันทึก..."
                            : "บันทึกรายละเอียดรถ"}
                        </button>
                      </div>
                    </div>


                  </section>

                  <section className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                    <div className="mb-3">
                      <h4 className="text-xs font-black text-slate-800">
                        ข้อมูลเลขบันทึกเอกสาร
                      </h4>

                      <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                        กรอกเลขบันทึก เลือกวันที่ แนบไฟล์ และบันทึกแยกรายการ
                      </p>
                    </div>

                    <div className="space-y-3">
                      {MEMO_FIELDS.map((field) => {
                        const isSavingThisMemo =
                          savingMemoKey === field.key;

                        const selectedFile =
                          memoFiles[field.key];

                        const existingFile =
                          existingMemoFiles[field.key];

                        const memoNumber = String(
                          vehicleExtraForm[field.key] || ""
                        ).trim();

                        const memoDate = String(
                          vehicleExtraForm[field.dateKey] || ""
                        ).trim();

                        const hasExistingData = Boolean(
                          memoNumber ||
                          memoDate ||
                          existingFile?.file_name
                        );

                        return (
                          <div
                            key={field.key}
                            className="rounded-xl border border-blue-100 bg-white/70 p-3"
                          >
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                              <span className="text-[10px] font-black text-slate-500">
                                {field.label}
                              </span>

                              {hasExistingData && (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-black text-emerald-600">
                                  มีข้อมูลแล้ว
                                </span>
                              )}
                            </div>

                            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_170px_minmax(180px,0.8fr)_110px]">
                              {/* เลขบันทึก */}
                              <input
                                type="text"
                                value={vehicleExtraForm[field.key]}
                                onChange={(event) => {
                                  const value = event.target.value;

                                  setVehicleExtraForm((previous) => {
                                    const previousMemoNumber = String(
                                      previous[field.key] || ""
                                    ).trim();

                                    const previousMemoDate = String(
                                      previous[field.dateKey] || ""
                                    ).trim();

                                    const shouldSetCurrentDate =
                                      value.trim() !== "" &&
                                      previousMemoNumber === "" &&
                                      previousMemoDate === "";

                                    return {
                                      ...previous,
                                      [field.key]: value,
                                      [field.dateKey]: shouldSetCurrentDate
                                        ? getTodayDateKey()
                                        : previous[field.dateKey],
                                    };
                                  });
                                }}
                                placeholder={`กรอก${field.label}`}
                                disabled={savingMemoKey !== null}
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                              />

                              {/* วันที่เพิ่มเลขบันทึก */}
                              <div className="flex h-10 w-full items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3 text-xs font-bold text-slate-700">
                                <CalendarDays
                                  size={14}
                                  className="shrink-0 text-blue-500"
                                />

                                <div className="min-w-0">
                                  <p className="truncate">
                                    {memoDate
                                      ? formatDate(memoDate)
                                      : "รอกรอกเลขบันทึก"}
                                  </p>

                                  {memoDate && (
                                    <p className="truncate text-[8px] font-semibold text-slate-400">
                                      วันที่เพิ่มเลขบันทึก
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* แนบไฟล์ */}
                              <div className="flex min-w-0 items-center gap-1.5">
                                <label
                                  className={`flex h-10 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-xl border px-3 text-xs font-bold transition ${selectedFile
                                    ? "border-violet-300 bg-violet-50 text-violet-700"
                                    : existingFile?.file_name
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : "border-violet-200 bg-white text-violet-700 hover:border-violet-400 hover:bg-violet-50"
                                    } ${savingMemoKey !== null
                                      ? "pointer-events-none cursor-not-allowed opacity-50"
                                      : ""
                                    }`}
                                >
                                  <FileUp size={14} className="shrink-0" />

                                  <span className="truncate">
                                    {selectedFile?.name ||
                                      existingFile?.file_name ||
                                      "เลือกไฟล์"}
                                  </span>

                                  <input
                                    type="file"
                                    accept={MEMO_FILE_ACCEPT}
                                    disabled={savingMemoKey !== null}
                                    className="hidden"
                                    onChange={(event) => {
                                      const file =
                                        event.target.files?.[0] || null;

                                      handleMemoFileChange(field.key, file);
                                      event.target.value = "";
                                    }}
                                  />
                                </label>

                                {selectedFile && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleMemoFileChange(field.key, null)
                                    }
                                    disabled={savingMemoKey !== null}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-white text-rose-500 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    title="ยกเลิกไฟล์ใหม่"
                                  >
                                    <X size={14} />
                                  </button>
                                )}
                              </div>

                              {/* บันทึก */}
                              <button
                                type="button"
                                onClick={() => handleSaveMemo(field)}
                                disabled={
                                  savingMemoKey !== null ||
                                  !memoNumber ||
                                  !memoDate
                                }
                                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-blue-700 px-3 text-xs font-black text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                              >
                                {isSavingThisMemo ? (
                                  <LoaderCircle
                                    size={14}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Save size={14} />
                                )}

                                {isSavingThisMemo
                                  ? "กำลังบันทึก"
                                  : hasExistingData
                                    ? "อัปเดต"
                                    : "บันทึก"}
                              </button>
                            </div>

                            {existingFile?.file_name &&
                              !selectedFile && (
                                <div className="mt-2 flex items-center gap-2 text-[10px] font-semibold">
                                  <span className="text-slate-400">
                                    ไฟล์เดิม:
                                  </span>

                                  {existingFile.file_url ? (
                                    <a
                                      href={existingFile.file_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="max-w-[260px] truncate text-blue-600 underline hover:text-blue-800"
                                    >
                                      {existingFile.file_name}
                                    </a>
                                  ) : (
                                    <span className="max-w-[260px] truncate text-emerald-600">
                                      {existingFile.file_name}
                                    </span>
                                  )}
                                </div>
                              )}

                            {selectedFile && (
                              <p className="mt-2 truncate text-[10px] font-semibold text-violet-600">
                                ไฟล์ใหม่: {selectedFile.name}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>
              </div>

              <div
                id="flow-assessment-table"
                className="scroll-mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-800">
                      ขั้นตอนการดำเนินงาน
                    </h3>
                    <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                      เลื่อนซ้าย–ขวาเพื่อดูขั้นตอน และเลือกวันที่เริ่ม–สิ้นสุดของแต่ละขั้นตอน
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black text-blue-600">
                      <Clock3 size={12} />
                      SLA จาก Master Flow
                    </span>

                    <span
                      className={`w-fit rounded-full px-3 py-1 text-[10px] font-black ${data.is_initialized
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-amber-50 text-amber-600"
                        }`}
                    >
                      {data.is_initialized
                        ? "Initialize แล้ว"
                        : "ยังไม่ Initialize"}
                    </span>
                  </div>
                </div>

                {!data.is_initialized ? (
                  <div className="px-4 py-10 text-center">
                    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 ring-1 ring-amber-100">
                      <Play size={26} />
                    </span>

                    <p className="mt-4 text-sm font-black text-slate-700">
                      กรุณาเริ่มต้นกระบวนการก่อนเลือกวันที่
                    </p>

                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      กดปุ่มด้านล่างเพื่อสร้างรายการติดตามของรถแต่ละคัน
                    </p>

                    <button
                      type="button"
                      onClick={handleInitializeFlow}
                      disabled={initializing || !request?.id}
                      className="mt-5 inline-flex h-11 min-w-[190px] items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 text-xs font-black text-white shadow-lg shadow-blue-700/20 transition hover:-translate-y-0.5 hover:bg-blue-800 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {initializing ? (
                        <LoaderCircle size={16} className="animate-spin" />
                      ) : (
                        <Play size={16} />
                      )}

                      {initializing
                        ? "กำลังเริ่มต้นกระบวนการ..."
                        : "เริ่มต้นกระบวนการ"}
                    </button>
                  </div>
                ) : flowRowsByVehicle.length === 0 ? (
                  <div className="px-4 py-10 text-center text-xs font-semibold text-slate-400">
                    ไม่พบข้อมูลขั้นตอน
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {flowRowsByVehicle.map((vehicle) => (
                      <section
                        key={String(vehicle.vehicle_no)}
                        className="bg-white"
                      >
                        <div className="flex flex-col gap-2 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-xs font-black text-white shadow-md shadow-blue-700/20">
                              {vehicle.vehicle_no}
                            </span>

                            <div className="min-w-0">
                              <p className="truncate text-xs font-black text-slate-800">
                                รถคันที่ {vehicle.vehicle_no}
                              </p>
                              <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-400">
                                {vehicle.license || "-"} · {vehicle.rows.length} ขั้นตอน
                              </p>
                            </div>
                          </div>

                          <span className="w-fit rounded-full bg-white px-3 py-1 text-[10px] font-black text-slate-500 ring-1 ring-slate-200">
                            เลื่อนแนวนอน →
                          </span>
                        </div>

                        <div className="flex flex-col gap-2 border-b border-slate-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                              การดำเนินการหนังสือ
                            </p>
                            <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                              เลือกยกเลิกหนังสือหรือกำหนดให้หนังสือหมดอายุได้ทันที
                            </p>
                          </div>

                          {Boolean(
                            vehicle.expiredDocumentFlow?.str_date ||
                            vehicle.expiredDocumentFlow?.end_date
                          ) ? (
                            <span className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-amber-100 px-4 text-[11px] font-black text-amber-700 ring-1 ring-amber-200">
                              <FileWarning size={15} />
                              หนังสือหมดอายุแล้ว
                            </span>
                          ) : Boolean(
                            vehicle.cancelDocumentFlow?.str_date ||
                            vehicle.cancelDocumentFlow?.end_date
                          ) ? (
                            <span className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-100 px-4 text-[11px] font-black text-rose-700 ring-1 ring-rose-200">
                              <Ban size={15} />
                              ยกเลิกหนังสือแล้ว
                            </span>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2">
                              {vehicle.cancelDocumentFlow && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSpecialProcessAction(
                                      vehicle.cancelDocumentFlow,
                                      "ยกเลิกหนังสือ"
                                    )
                                  }
                                  disabled={savingFlowId !== null}
                                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 text-[11px] font-black text-white shadow-lg shadow-rose-600/25 transition hover:-translate-y-0.5 hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {savingFlowId === String(vehicle.cancelDocumentFlow.id) ? (
                                    <LoaderCircle size={14} className="animate-spin" />
                                  ) : (
                                    <Ban size={15} />
                                  )}
                                  ยกเลิกหนังสือ
                                </button>
                              )}

                              {vehicle.expiredDocumentFlow && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSpecialProcessAction(
                                      vehicle.expiredDocumentFlow,
                                      "หนังสือหมดอายุ"
                                    )
                                  }
                                  disabled={savingFlowId !== null}
                                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 text-[11px] font-black text-white shadow-lg shadow-amber-500/25 transition hover:-translate-y-0.5 hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {savingFlowId === String(vehicle.expiredDocumentFlow.id) ? (
                                    <LoaderCircle size={14} className="animate-spin" />
                                  ) : (
                                    <FileWarning size={15} />
                                  )}
                                  หนังสือหมดอายุ
                                </button>
                              )}

                              {!vehicle.cancelDocumentFlow && !vehicle.expiredDocumentFlow && (
                                <span className="text-[10px] font-bold text-slate-400">
                                  ไม่พบ Process ดำเนินการหนังสือ
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="overflow-x-auto px-4 py-5 [scrollbar-color:#94a3b8_#f1f5f9] [scrollbar-width:thin]">
                          <div className="flex min-w-max items-stretch gap-0">
                            {vehicle.rows.map((flow, flowIndex) => {
                              const flowId = String(flow.id);
                              const currentDepartment = getCurrentDepartment();
                              const canEditThisProcess = canEditProcessLevel(
                                flow.process_level
                              );
                              const permissionMessage = !canEditThisProcess
                                ? currentDepartment === "FBP"
                                  ? "แผนก FBP แก้ไขได้เฉพาะ Process Level 7"
                                  : currentDepartment === "KA"
                                    ? "แผนก KA แก้ไขได้เฉพาะ Process Level 8"
                                    : "ไม่มีสิทธิ์แก้ไขขั้นตอนนี้"
                                : "";
                              const draft = dateDrafts[flowId] || {
                                str_date: toDateInputValue(flow.str_date),
                                end_date: toDateInputValue(flow.end_date),
                              };

                              const actualDays = calculateSla(
                                draft.str_date,
                                draft.end_date
                              );

                              /**
                               * อ่าน SLA จาก steps.sla โดยตรงผ่าน process_id
                               * เพื่อไม่พึ่งเฉพาะ flow.target_sla ซึ่งอาจไม่ได้ถูกแนบ
                               * เข้ามาใน flowRows ของไฟล์เดิม
                               */
                              const masterStep = stepMap.get(
                                String(flow.process_id)
                              );

                              const targetSlaDays = normalizeSlaDays(
                                masterStep?.sla ?? flow.target_sla
                              );

                              const hasTargetSla = targetSlaDays > 0;

                              const slaDueDate = calculateSlaDueDate(
                                draft.str_date,
                                targetSlaDays
                              );

                              const remainingToDueDate = getDateDifferenceFromToday(
                                slaDueDate
                              );

                              const invalidDateRange = Boolean(
                                draft.str_date &&
                                draft.end_date &&
                                draft.end_date < draft.str_date
                              );

                              const hasStarted = Boolean(draft.str_date);
                              const hasCompleted = Boolean(
                                draft.str_date &&
                                draft.end_date &&
                                !invalidDateRange
                              );

                              const isOverSla =
                                hasCompleted &&
                                hasTargetSla &&
                                actualDays > targetSlaDays;

                              const slaDifference =
                                hasCompleted && hasTargetSla
                                  ? Math.abs(actualDays - targetSlaDays)
                                  : 0;

                              const dueStatusText = (() => {
                                if (
                                  !draft.str_date ||
                                  !hasTargetSla ||
                                  !slaDueDate ||
                                  remainingToDueDate === null
                                ) {
                                  return "";
                                }

                                if (hasCompleted) {
                                  if (actualDays === targetSlaDays) {
                                    return "เสร็จตรงตามกำหนด";
                                  }

                                  if (actualDays > targetSlaDays) {
                                    return `เสร็จเกินกำหนด ${formatNumber(
                                      actualDays - targetSlaDays
                                    )} วัน`;
                                  }

                                  return `เสร็จก่อนกำหนด ${formatNumber(
                                    targetSlaDays - actualDays
                                  )} วัน`;
                                }

                                if (remainingToDueDate > 0) {
                                  return `เหลืออีก ${formatNumber(
                                    remainingToDueDate
                                  )} วันจะครบกำหนด`;
                                }

                                if (remainingToDueDate === 0) {
                                  return "ครบกำหนดวันนี้";
                                }

                                return `เกินกำหนด ${formatNumber(
                                  Math.abs(remainingToDueDate)
                                )} วันแล้ว`;
                              })();

                              const isCurrentlyOverdue =
                                !hasCompleted &&
                                remainingToDueDate !== null &&
                                remainingToDueDate < 0;

                              const cancelDocumentFlow =
                                vehicle.cancelDocumentFlow;
                              const expiredDocumentFlow =
                                vehicle.expiredDocumentFlow;

                              const isDocumentCancelled = Boolean(
                                cancelDocumentFlow?.str_date ||
                                cancelDocumentFlow?.end_date
                              );

                              const isDocumentExpired = Boolean(
                                expiredDocumentFlow?.str_date ||
                                expiredDocumentFlow?.end_date
                              );

                              const hasDocumentFinalStatus =
                                isDocumentCancelled || isDocumentExpired;

                              // เมนูหนังสือหมดอายุถูกย้ายไปอยู่ข้างปุ่มยกเลิกหนังสือแล้ว
                              const isFinanceApprovalProcess = false;
                              const shouldShowExpiredAction = false;

                              const documentLockedMessage = isDocumentCancelled
                                ? "ไม่สามารถแก้ไขได้แล้ว เนื่องจากเอกสารถูกยกเลิก"
                                : isDocumentExpired
                                  ? "ไม่สามารถแก้ไขได้แล้ว เนื่องจากเอกสารหมดอายุ"
                                  : "";

                              // ล็อกเฉพาะวันที่ที่บันทึกและโหลดกลับมาจากฐานข้อมูลแล้ว
                              const isStartSaved = Boolean(
                                flow.str_date && !flow.end_date
                              );

                              const isAlreadySaved = Boolean(
                                flow.str_date && flow.end_date
                              );

                              return (
                                <div
                                  key={flowId}
                                  className="flex shrink-0 self-stretch items-stretch"
                                >
                                  <article
                                    className={`relative flex h-full w-[270px] flex-col rounded-2xl border p-4 shadow-sm transition ${hasDocumentFinalStatus
                                      ? "border-slate-300 bg-slate-100 text-slate-500"
                                      : invalidDateRange
                                        ? "border-rose-300 bg-rose-50/60"
                                        : hasCompleted
                                          ? "border-emerald-200 bg-emerald-50/40"
                                          : hasStarted
                                            ? "border-blue-200 bg-blue-50/40"
                                            : "border-slate-200 bg-white"
                                      }`}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <span
                                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${hasDocumentFinalStatus
                                          ? "bg-slate-300 text-slate-600"
                                          : hasCompleted
                                            ? "bg-emerald-600 text-white"
                                            : hasStarted
                                              ? "bg-blue-600 text-white"
                                              : "bg-slate-100 text-slate-500"
                                          }`}
                                      >
                                        {flow.process_level}
                                      </span>

                                      <span
                                        className={`rounded-full px-2 py-1 text-[9px] font-black ${hasDocumentFinalStatus
                                          ? "bg-slate-200 text-slate-500"
                                          : hasCompleted
                                            ? "bg-emerald-100 text-emerald-700"
                                            : hasStarted
                                              ? "bg-blue-100 text-blue-700"
                                              : "bg-slate-100 text-slate-400"
                                          }`}
                                      >
                                        {hasDocumentFinalStatus
                                          ? "ไม่สามารถแก้ไขได้"
                                          : isAlreadySaved
                                            ? "บันทึกครบแล้ว"
                                            : isStartSaved
                                              ? "บันทึกวันเริ่มแล้ว"
                                              : hasCompleted
                                                ? "พร้อมบันทึก"
                                                : hasStarted
                                                  ? "เลือกวันเริ่มแล้ว"
                                                  : "รอดำเนินการ"}
                                      </span>
                                    </div>

                                    <div className="mt-3 min-h-[58px]">
                                      <p className="text-xs font-black leading-5 text-slate-800">
                                        {flow.process}
                                      </p>

                                      {flow.detail && (
                                        <p className="mt-1 line-clamp-2 text-[10px] font-medium text-slate-400">
                                          {flow.detail}
                                        </p>
                                      )}
                                    </div>

                                    <div className="mt-4 space-y-3">
                                      {/* วันที่เริ่ม */}
                                      <div>
                                        <span className="mb-1.5 block text-[9px] font-black uppercase tracking-wide text-slate-400">
                                          วันที่เริ่ม
                                        </span>

                                        <button
                                          type="button"
                                          disabled={
                                            !canEditThisProcess ||
                                            hasDocumentFinalStatus ||
                                            isAlreadySaved ||
                                            isStartSaved
                                          }
                                          title={permissionMessage}
                                          onClick={(event) => {
                                            if (
                                              canEditThisProcess &&
                                              !hasDocumentFinalStatus &&
                                              !isAlreadySaved &&
                                              !isStartSaved
                                            ) {
                                              setOpenDatePicker({
                                                flowId,
                                                field: "str_date",
                                                position:
                                                  getCalendarPopoverPosition(
                                                    event.currentTarget
                                                  ),
                                              });
                                            }
                                          }}
                                          className={`flex h-10 w-full items-center gap-2 rounded-xl border px-3 text-left text-[11px] font-bold outline-none transition focus:ring-4 disabled:cursor-not-allowed ${hasDocumentFinalStatus
                                            ? "border-slate-300 bg-slate-200 text-slate-400"
                                            : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 focus:border-blue-500 focus:ring-blue-100 disabled:border-emerald-200 disabled:bg-emerald-50 disabled:text-emerald-700"
                                            }`}
                                        >
                                          <CalendarDays
                                            size={14}
                                            className={`shrink-0 ${hasDocumentFinalStatus ? "text-slate-400" : "text-blue-500"}`}
                                          />

                                          <span className="truncate">
                                            {draft.str_date
                                              ? formatDate(draft.str_date)
                                              : "เลือกวันที่เริ่ม"}
                                          </span>
                                        </button>
                                      </div>

                                      {/* วันที่สิ้นสุด */}
                                      <div>
                                        <span className="mb-1.5 block text-[9px] font-black uppercase tracking-wide text-slate-400">
                                          วันที่สิ้นสุด
                                        </span>

                                        <button
                                          type="button"
                                          disabled={
                                            !canEditThisProcess ||
                                            hasDocumentFinalStatus ||
                                            isAlreadySaved ||
                                            !draft.str_date
                                          }
                                          title={permissionMessage}
                                          onClick={(event) => {
                                            if (
                                              canEditThisProcess &&
                                              !hasDocumentFinalStatus &&
                                              !isAlreadySaved &&
                                              draft.str_date
                                            ) {
                                              setOpenDatePicker({
                                                flowId,
                                                field: "end_date",
                                                position:
                                                  getCalendarPopoverPosition(
                                                    event.currentTarget
                                                  ),
                                              });
                                            }
                                          }}
                                          className={`flex h-10 w-full items-center gap-2 rounded-xl border px-3 text-left text-[11px] font-bold outline-none transition focus:ring-4 disabled:cursor-not-allowed ${hasDocumentFinalStatus
                                            ? "border-slate-300 bg-slate-200 text-slate-400"
                                            : invalidDateRange
                                              ? "border-rose-400 bg-white text-rose-700 focus:border-rose-500 focus:ring-rose-100"
                                              : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 focus:border-blue-500 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400"
                                            }`}
                                        >
                                          <CalendarDays
                                            size={14}
                                            className={`shrink-0 ${hasDocumentFinalStatus
                                              ? "text-slate-400"
                                              : invalidDateRange
                                                ? "text-rose-500"
                                                : "text-blue-500"
                                              }`}
                                          />

                                          <span className="truncate">
                                            {draft.end_date
                                              ? formatDate(draft.end_date)
                                              : "เลือกวันที่สิ้นสุด"}
                                          </span>
                                        </button>

                                        {invalidDateRange && (
                                          <p className="mt-1 text-[9px] font-bold text-rose-500">
                                            วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่ม
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {hasDocumentFinalStatus && (
                                      <div className="mt-3 rounded-xl border border-slate-300 bg-slate-200/80 px-3 py-2.5">
                                        <div className="flex items-start gap-2 text-slate-600">
                                          {isDocumentCancelled ? (
                                            <Ban size={14} className="mt-0.5 shrink-0" />
                                          ) : (
                                            <FileWarning size={14} className="mt-0.5 shrink-0" />
                                          )}
                                          <p className="text-[10px] font-black leading-4">
                                            {documentLockedMessage}
                                          </p>
                                        </div>
                                      </div>
                                    )}

                                    <div
                                      className={`mt-4 rounded-xl px-3 py-2.5 ${invalidDateRange
                                        ? "bg-rose-100"
                                        : isOverSla || isCurrentlyOverdue
                                          ? "bg-rose-50 ring-1 ring-rose-200"
                                          : hasCompleted
                                            ? "bg-emerald-50 ring-1 ring-emerald-100"
                                            : "bg-blue-50"
                                        }`}
                                    >
                                      <div className="flex items-center justify-between gap-3">
                                        <span className="text-[10px] font-black text-slate-500">
                                          SLA กำหนด
                                        </span>

                                        <span
                                          className={`text-xs font-black ${invalidDateRange
                                            ? "text-rose-600"
                                            : hasTargetSla
                                              ? "text-blue-700"
                                              : "text-slate-400"
                                            }`}
                                        >
                                          {invalidDateRange
                                            ? "วันที่ไม่ถูกต้อง"
                                            : hasTargetSla
                                              ? `${formatNumber(targetSlaDays)} วัน`
                                              : "ไม่ได้กำหนด"}
                                        </span>
                                      </div>

                                      {draft.str_date &&
                                        hasTargetSla &&
                                        !invalidDateRange && (
                                          <div className="mt-2 space-y-2 border-t border-black/5 pt-2">
                                            <div className="flex items-center justify-between gap-3">
                                              <span className="text-[9px] font-bold text-slate-400">
                                                วันครบกำหนด
                                              </span>

                                              <span className="text-[10px] font-black text-slate-700">
                                                {formatDate(slaDueDate)}
                                              </span>
                                            </div>

                                            <div className="flex items-start justify-between gap-3">
                                              <span className="text-[9px] font-bold text-slate-400">
                                                สถานะ SLA
                                              </span>

                                              <p
                                                className={`max-w-[145px] text-right text-[10px] font-black ${isOverSla || isCurrentlyOverdue
                                                  ? "text-rose-600"
                                                  : hasCompleted
                                                    ? "text-emerald-600"
                                                    : remainingToDueDate === 0
                                                      ? "text-amber-600"
                                                      : "text-blue-700"
                                                  }`}
                                              >
                                                {dueStatusText}
                                              </p>
                                            </div>

                                            {hasCompleted && (
                                              <div className="flex items-center justify-between gap-3">
                                                <span className="text-[9px] font-bold text-slate-400">
                                                  ใช้จริง
                                                </span>

                                                <div className="text-right">
                                                  <p
                                                    className={`text-[10px] font-black ${isOverSla
                                                      ? "text-rose-600"
                                                      : "text-emerald-600"
                                                      }`}
                                                  >
                                                    {formatNumber(actualDays)} วัน
                                                  </p>

                                                  <p
                                                    className={`mt-0.5 text-[9px] font-bold ${isOverSla
                                                      ? "text-rose-500"
                                                      : "text-emerald-500"
                                                      }`}
                                                  >
                                                    {actualDays === targetSlaDays
                                                      ? "ตรงตาม SLA"
                                                      : isOverSla
                                                        ? `เกิน SLA ${formatNumber(
                                                          slaDifference
                                                        )} วัน`
                                                        : `เร็วกว่า SLA ${formatNumber(
                                                          slaDifference
                                                        )} วัน`}
                                                  </p>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                    </div>

                                    <div className="min-h-3 flex-1" />

                                    <button
                                      type="button"
                                      onClick={() => handleSaveFlowDates(flow)}
                                      disabled={
                                        !canEditThisProcess ||
                                        hasDocumentFinalStatus ||
                                        isAlreadySaved ||
                                        savingFlowId !== null ||
                                        !draft.str_date ||
                                        invalidDateRange
                                      }
                                      title={permissionMessage}
                                      className={`mt-auto inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl px-3 text-[11px] font-black transition ${hasDocumentFinalStatus
                                        ? "cursor-not-allowed bg-slate-300 text-slate-500"
                                        : isAlreadySaved
                                          ? "cursor-not-allowed bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
                                          : "bg-blue-700 text-white shadow-md shadow-blue-700/20 hover:-translate-y-0.5 hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                                        }`}
                                    >
                                      {savingFlowId === flowId ? (
                                        <LoaderCircle
                                          size={14}
                                          className="animate-spin"
                                        />
                                      ) : hasDocumentFinalStatus ? (
                                        <Ban size={14} />
                                      ) : isAlreadySaved ? (
                                        <CheckCircle2 size={14} />
                                      ) : (
                                        <Save size={14} />
                                      )}
                                      {savingFlowId === flowId
                                        ? "กำลังบันทึก..."
                                        : !canEditThisProcess
                                          ? "ไม่มีสิทธิ์แก้ไข"
                                          : hasDocumentFinalStatus
                                            ? "ไม่สามารถแก้ไขได้"
                                            : isAlreadySaved
                                              ? "บันทึกครบแล้ว"
                                              : isStartSaved
                                                ? "บันทึกวันสิ้นสุด"
                                                : draft.end_date
                                                  ? "บันทึกวันที่"
                                                  : "บันทึกวันเริ่ม"}
                                    </button>

                                    {isFinanceApprovalProcess && (
                                      <div
                                        className={`mt-3 rounded-2xl border-2 border-dashed p-3 ${shouldShowExpiredAction &&
                                          !hasDocumentFinalStatus
                                          ? "border-rose-300 bg-rose-50/80"
                                          : "border-amber-200 bg-amber-50/60"
                                          }`}
                                      >
                                        <div className="flex items-start gap-2">
                                          <span
                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${shouldShowExpiredAction &&
                                              !hasDocumentFinalStatus
                                              ? "bg-rose-100 text-rose-600"
                                              : "bg-amber-100 text-amber-600"
                                              }`}
                                          >
                                            <AlertTriangle size={16} />
                                          </span>

                                          <div className="min-w-0 flex-1">
                                            <p
                                              className={`text-[10px] font-black ${shouldShowExpiredAction &&
                                                !hasDocumentFinalStatus
                                                ? "text-rose-700"
                                                : "text-amber-700"
                                                }`}
                                            >
                                              สถานะหนังสือไฟแนนซ์
                                            </p>

                                            <p className="mt-0.5 text-[9px] font-semibold leading-4 text-slate-500">
                                              {shouldShowExpiredAction &&
                                                !hasDocumentFinalStatus
                                                ? "ครบกำหนด SLA แล้ว กรุณาเร่งดำเนินการ"
                                                : "ใช้เมนูนี้เฉพาะเมื่อต้องเปลี่ยนสถานะหนังสือ"}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="mt-3">
                                          {isDocumentExpired ? (
                                            <div className="flex items-center justify-center gap-2 rounded-xl bg-amber-100 px-3 py-2.5 text-[10px] font-black text-amber-700 ring-1 ring-amber-200">
                                              <FileWarning size={14} />
                                              หนังสือหมดอายุแล้ว
                                            </div>
                                          ) : isDocumentCancelled ? (
                                            <div className="flex items-center justify-center gap-2 rounded-xl bg-rose-100 px-3 py-2.5 text-[10px] font-black text-rose-700 ring-1 ring-rose-200">
                                              <Ban size={14} />
                                              หนังสือถูกยกเลิกแล้ว
                                            </div>
                                          ) : expiredDocumentFlow &&
                                            !hasCompleted ? (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleSpecialProcessAction(
                                                  expiredDocumentFlow,
                                                  "หนังสือหมดอายุ",
                                                  shouldShowExpiredAction
                                                    ? "ขั้นตอนรอไฟแนนซ์อนุมัติครบหรือเกินกำหนด SLA แล้ว ยืนยันตั้งสถานะเป็นหนังสือหมดอายุหรือไม่?"
                                                    : "ขั้นตอนรอไฟแนนซ์อนุมัติยังไม่ครบกำหนด SLA คุณต้องการตั้งสถานะเป็นหนังสือหมดอายุก่อนกำหนดหรือไม่?"
                                                )
                                              }
                                              disabled={savingFlowId !== null}
                                              className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-2 bg-white px-3 text-[10px] font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${shouldShowExpiredAction
                                                ? "border-rose-500 text-rose-700 hover:bg-rose-100"
                                                : "border-amber-400 text-amber-700 hover:bg-amber-100"
                                                }`}
                                            >
                                              {savingFlowId ===
                                                String(expiredDocumentFlow.id) ? (
                                                <LoaderCircle
                                                  size={15}
                                                  className="animate-spin"
                                                />
                                              ) : (
                                                <AlertTriangle size={16} />
                                              )}

                                              {shouldShowExpiredAction
                                                ? "ตั้งสถานะ: หนังสือหมดอายุ"
                                                : "หนังสือหมดอายุ"}
                                            </button>
                                          ) : null}
                                        </div>
                                      </div>
                                    )}

                                    <p className="mt-3 truncate text-[9px] font-semibold text-slate-400">
                                      {flow.updated_by ||
                                        flow.created_by ||
                                        "ยังไม่มีผู้แก้ไข"}
                                    </p>
                                  </article>

                                  {flowIndex < vehicle.rows.length - 1 && (
                                    <div className="flex w-10 shrink-0 items-center justify-center">
                                      <div className="h-0.5 w-5 bg-slate-200" />
                                      <ChevronRight
                                        size={15}
                                        className="-ml-1 text-slate-300"
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {openMemoDatePicker &&
        (() => {
          const selectedValue = String(
            vehicleExtraForm[openMemoDatePicker.dateKey] || ""
          );

          return (
            <div
              className="fixed inset-0 z-[100002]"
              onMouseDown={() => setOpenMemoDatePicker(null)}
            >
              <div
                className="fixed max-h-[calc(100vh-24px)] w-[340px] max-w-[calc(100vw-24px)] overflow-y-auto rounded-2xl border border-blue-100 bg-white text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.28)]"
                style={{
                  top: openMemoDatePicker.position.top,
                  left: openMemoDatePicker.position.left,
                }}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between bg-blue-50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-blue-700">
                      เลือกวันที่เอกสาร
                    </p>
                    <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-400">
                      {openMemoDatePicker.label}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOpenMemoDatePicker(null)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm transition hover:bg-rose-50 hover:text-rose-600"
                  >
                    <X size={15} />
                  </button>
                </div>

                <Calendar
                  locale={th}
                  date={
                    selectedValue
                      ? parseDateValue(selectedValue)
                      : new Date()
                  }
                  onChange={(date) => {
                    handleVehicleExtraChange(
                      openMemoDatePicker.dateKey,
                      toDateKey(date)
                    );
                    setOpenMemoDatePicker(null);
                  }}
                  showMonthAndYearPickers
                  color="#2563eb"
                />

                <div className="border-t border-slate-100 bg-white px-4 py-3">
                  <p className="text-[10px] font-semibold text-slate-400">
                    วันที่ที่เลือก
                  </p>
                  <p className="mt-1 text-xs font-black text-blue-700">
                    {selectedValue
                      ? formatDate(selectedValue)
                      : "ยังไม่ได้เลือกวันที่"}
                  </p>

                  {selectedValue && (
                    <button
                      type="button"
                      onClick={() => {
                        handleVehicleExtraChange(
                          openMemoDatePicker.dateKey,
                          ""
                        );
                        setOpenMemoDatePicker(null);
                      }}
                      className="mt-3 h-9 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                    >
                      ล้างวันที่
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      {openWarehouseDatePicker && (
        <div
          className="fixed inset-0 z-[100001]"
          onMouseDown={() => setOpenWarehouseDatePicker(null)}
        >
          <div
            className="fixed max-h-[calc(100vh-24px)] w-[340px] max-w-[calc(100vw-24px)] overflow-y-auto rounded-2xl border border-blue-100 bg-white text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.28)]"
            style={{
              top: openWarehouseDatePicker.top,
              left: openWarehouseDatePicker.left,
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-blue-50 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-black text-blue-700">
                  เลือกวันที่จะเข้าคลัง
                </p>
                <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-400">
                  รถคันที่ {vehicleNo || "-"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpenWarehouseDatePicker(null)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm transition hover:bg-rose-50 hover:text-rose-600"
              >
                <X size={15} />
              </button>
            </div>

            <Calendar
              locale={th}
              date={
                vehicleExtraForm.warehouse_plan_date
                  ? parseDateValue(vehicleExtraForm.warehouse_plan_date)
                  : new Date()
              }
              onChange={(date) => {
                handleVehicleExtraChange(
                  "warehouse_plan_date",
                  toDateKey(date)
                );
                setOpenWarehouseDatePicker(null);
              }}
              showMonthAndYearPickers
              color="#2563eb"
            />

            <div className="border-t border-slate-100 bg-white px-4 py-3">
              <p className="text-[10px] font-semibold text-slate-400">
                วันที่ที่เลือก
              </p>
              <p className="mt-1 text-xs font-black text-blue-700">
                {vehicleExtraForm.warehouse_plan_date
                  ? formatDate(vehicleExtraForm.warehouse_plan_date)
                  : "ยังไม่ได้เลือกวันที่"}
              </p>

              {vehicleExtraForm.warehouse_plan_date && (
                <button
                  type="button"
                  onClick={() => {
                    handleVehicleExtraChange("warehouse_plan_date", "");
                    setOpenWarehouseDatePicker(null);
                  }}
                  className="mt-3 h-9 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                >
                  ล้างวันที่
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {openDatePicker &&
        (() => {
          const activeFlow = flowRows.find(
            (flow) =>
              String(flow.id) === openDatePicker.flowId
          );

          if (!activeFlow) return null;

          const activeDraft =
            dateDrafts[openDatePicker.flowId] || {
              str_date: toDateInputValue(activeFlow.str_date),
              end_date: toDateInputValue(activeFlow.end_date),
            };

          const selectedValue =
            activeDraft[openDatePicker.field];

          const selectedDate = selectedValue
            ? parseDateValue(selectedValue)
            : new Date();

          const isEndDate =
            openDatePicker.field === "end_date";

          return (
            <div
              className="fixed inset-0 z-[100000]"
              onMouseDown={() => setOpenDatePicker(null)}
            >
              <div
                className="fixed max-h-[calc(100vh-24px)] w-[340px] max-w-[calc(100vw-24px)] overflow-y-auto rounded-2xl border border-blue-100 bg-white text-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.28)]"
                style={{
                  top: openDatePicker.position.top,
                  left: openDatePicker.position.left,
                }}
                onMouseDown={(event) =>
                  event.stopPropagation()
                }
              >
                <div className="flex items-center justify-between bg-blue-50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-blue-700">
                      {isEndDate
                        ? "เลือกวันที่สิ้นสุด"
                        : "เลือกวันที่เริ่ม"}
                    </p>

                    <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-400">
                      {activeFlow.process} · รถคันที่{" "}
                      {activeFlow.vehicle_no}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setOpenDatePicker(null)
                    }
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm transition hover:bg-rose-50 hover:text-rose-600"
                  >
                    <X size={15} />
                  </button>
                </div>

                <Calendar
                  locale={th}
                  date={selectedDate}
                  minDate={
                    isEndDate && activeDraft.str_date
                      ? parseDateValue(activeDraft.str_date)
                      : undefined
                  }
                  onChange={(date) => {
                    const selectedDateKey = toDateKey(date);

                    handleFlowDateChange(
                      openDatePicker.flowId,
                      openDatePicker.field,
                      selectedDateKey
                    );

                    setOpenDatePicker(null);
                  }}
                  showMonthAndYearPickers
                  color="#2563eb"
                />

                <div className="border-t border-slate-100 bg-white px-4 py-3">
                  <p className="text-[10px] font-semibold text-slate-400">
                    วันที่ที่เลือก
                  </p>

                  <p className="mt-1 text-xs font-black text-blue-700">
                    {selectedValue
                      ? formatDate(selectedValue)
                      : "ยังไม่ได้เลือกวันที่"}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
  subValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
            {label}
          </p>
          <p className="mt-1 truncate text-sm font-black text-slate-800">
            {value}
          </p>
          <p className="mt-1 truncate text-[10px] font-semibold text-slate-400">
            {subValue}
          </p>
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 break-words text-xs font-bold text-slate-700">
        {value || "-"}
      </p>
    </div>
  );
}

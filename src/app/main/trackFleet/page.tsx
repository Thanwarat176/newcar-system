"use client";

import { Suspense, Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import { Calendar, DateRange } from "react-date-range";
import type { RangeKeyDict } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { th } from "date-fns/locale";
import {
  AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, CalendarDays,
  CircleCheck, CircleX, ClipboardList, Download, Eraser, Filter,
  RefreshCw, Search, SlidersHorizontal, Truck, Upload, Warehouse, X,
} from "lucide-react";
import FlowAssessmentModal from "./component/FlowAssessmentModal";
import ExportTrackFleet from "./component/ExportTrackFleet";

/*
 * วางไฟล์นี้แทน page.tsx ในโฟลเดอร์ trackFleet เดิม
 * ใช้ component และ dependencies เดิมของโปรเจกต์
 * ใช้ group_mode=document กับ PHP ในชุดนี้: แบ่งหน้าตามเอกสารและส่งรถครบ
 * รองรับ API รายคันเดิมโดยรวมเฉพาะข้อมูลในหน้า
 * รวมทะเบียนเก่าทุกคัน เลือกรถอ้างอิงที่มีจริง และแสดงแบบประเมินชุดเดียว
 * ใช้ร่วมกับ component/FlowAssessmentModal.tsx ที่แนบในชุดนี้
 */
interface RequestDateOptions {
  years: number[];
  first_date: string | null;
  last_date: string | null;
}

interface SelectedDC {
  DC_CODE?: string; DC_NAME?: string; DC_TYPE?: string;
  dc_code?: string; dc_name?: string; dc_type?: string;
}
interface UserInfo {
  warehouse?: string; WAREHOUSE?: string; team?: string; TEAM?: string;
}
interface VehicleWarehouseInfo {
  supplier_alloc?: string | null;
  id?: string | number;
  vehicle_no?: string | number | null;
  unit_code?: string | null;
  car_chassis?: string | null; car_model?: string | null;
  car_brand?: string | null; car_engine?: string | null;
  car_license?: string | null;
}
interface RequestDetailItem {
  id: string; request_id: string;
  license: string | null; province: string | null; truck_type: string | null;
  company_id: string | null; company_name: string | null;
  license_replace: string | null; province_replace: string | null;
  truck_type_replace: string | null; company_id_replace: string | null;
  company_name_replace: string | null; status: string;
  warehouse_info?: VehicleWarehouseInfo | null;
}
interface RequestItem {
  supplier_alloc?: string | null;
  id: string | number | null; running_doc: string; dc_type: string;
  dc_code: string; date: string; request_date?: string;
  request_id?: number | string | null;
  fleet_type: string; fleet_truck_type: string; license_replace: string[] | string;
  qty: number; usage_date: string; usage_end_date?: string | null; workload: number; truckturn: number;
  status: string; request_by: string; remark: string;
  success_qty?: number | string | null; details?: RequestDetailItem[];
  latest_process_name?: string | null;
  latest_process_str_date?: string | null;
  latest_process_end_date?: string | null;
  latest_process_level?: string | number | null;
  running_doc_vehicle_no?: string; vehicle_no?: string | number;
  warehouse_vehicle_no?: string | number;
  vehicle_license?: string; current_step?: number; total_steps?: number;
  current_process?: string; vehicle_warehouse_info?: VehicleWarehouseInfo[];
  vehicle_info?: VehicleWarehouseInfo | null;
  warehouse_info?: VehicleWarehouseInfo | null;
  incoming_truck_id?: string | number; new_truck_type?: string;
  new_vendor_id?: string; new_vendor_name?: string;
  car_chassis?: string | null; car_engine?: string | null;
  car_license?: string | null; car_model?: string | null;
  car_brand?: string | null; unit_code?: string;
  replaced_old_licenses?: string[];
  matches_filters?: boolean;
}
interface DocumentGroup {
  key: string; running_doc: string; vehicles: RequestItem[];
}
type StatusFilter = "all" | "progress" | "cancel" | "success";
type Summary = Record<StatusFilter, { qty: number; items: number }>;
interface FilterOptions {
  fleet_types: string[]; truck_types: string[]; dc_types: string[];
  dc_codes: string[]; process_options: { value: string; label: string }[];
}
interface Pagination {
  total_vehicles: number; total_records: number;
  total_documents: number | null;
  page: number; limit: number; total_pages: number;
}
const API_BASE = "http://192.168.158.210/api_new_truck/api/track_fleet_get.php";
const EMPTY_SUMMARY: Summary = {
  all: { qty: 0, items: 0 }, progress: { qty: 0, items: 0 },
  cancel: { qty: 0, items: 0 }, success: { qty: 0, items: 0 },
};
const normalizeStatus = (value?: string) => {
  const status = String(value || "").trim().toLowerCase();
  return ["reject_by_gm", "reject_by_fbp"].includes(status) ? "cancel" : status;
};
const textValue = (value: unknown) => String(value ?? "").trim();
const EXCEL_FIELDS = [
  "warehouse_plan_date", "car_model", "car_brand", "supplier_alloc", "car_chassis",
  "car_engine", "car_license", "car_province", "remark",
] as const;
const EXCEL_MEMOS = [
  ["fbp", "เลขบันทึก FBP", "วันที่เข้ามากรอกเลขบันทึก FBP"],
  ["tis", "เลขบันทึกแจ้ง TIS", "วันที่เข้ามากรอกเลขบันทึกแจ้ง TIS"],
  ["til", "เลขบันทึกแจ้ง TIL", "วันที่เข้ามากรอกเลขบันทึกแจ้ง TIL"],
  ["ask", "เลขบันทึกแจ้ง ASK", "วันที่เข้ามากรอกเลขบันทึกแจ้ง ASK"],
  ["kleasing", "เลขบันทึกแจ้ง Kleasing", "วันที่เข้ามากรอกเลขบันทึกแจ้ง Kleasing"],
  ["ttb", "เลขบันทึกแจ้ง TTB2", "วันที่เข้ามากรอกเลขบันทึกแจ้ง TTB2"],
  ["thaiolix", "เลขบันทึกแจ้ง THAIOLIX", "วันที่เข้ามากรอกเลขบันทึกแจ้ง THAIOLIX"],
] as const;
const EXCEL_FLOW_NAMES = [
  "รอจัดสรรตามโควต้า", "รอลงนามหนังสือจัดสรร", "รอไฟแนนซ์อนุมัติ", "รอส่งรถเข้าอู่",
  "ประกอบตู้/เครื่องทำความเย็น", "รอจดทะเบียนรถ", "ส่งมอบคลังแล้ว",
];
const EXCEL_REPORT_COLUMNS: ReadonlyArray<readonly [string, string]> = [
  ["sequence", "ลำดับ"],
  ["request_date", "วันที่สร้างคำขอ"],
  ["fleet_type", "ประเภทคำขอ"],
  ["status", "สถานะปัจจุบัน"],
  ["running_doc", "เลขที่เอกสาร"],
  ["dc_type", "ประเภทคลัง"],
  ["dc_name", "ชื่อคลัง"],
  ["fleet_truck_type", "ประเภทรถ"],
  ["qty", "จำนวนรถที่ขอ (คัน) *"],
  ["replaced_old_licenses", "ทะเบียนทดแทน1(ระบุทะเบียน)"],
  ["usage_date", "วันที่ใช้งาน"],
  ["approved_truck_type", "ประเภทรถที่อนุมัติ"],
  ["approved_qty", "จำนวนรถที่อนุมัติ"],
  ["vendor_short_name", "ชื่อบริษัทขนส่ง (ย่อ)2"],
  ["new_vendor_id", "VENDOR CODE"],
  ["new_vendor_name", "ชื่อบริษัทขนส่ง"],
  ["replaced_truck_types", "ประเภทรถที่ถูกทดแทน"],
  ["replaced_companies", "บริษัทขนส่งที่ถูกทดแทน"],
  ["assessment_remark", "หมายเหตุการประเมินกองรถ"],
  ["assessment_status", "สถานะการประเมินกองรถ"],
  ["assessment_date", "วันที่ประเมินกองรถ"],
  ["warehouse_plan_date", "คาดการณ์วันเข้าคลัง"],
  ["car_brand", "จัดสรรยี่ห้อรถ"],
  ["supplier_alloc", "จัดสรรผู้ผลิต"],
  ["car_model", "จัดสรรรุ่นรถ"],
  ["car_engine", "เลขเครื่อง"],
  ["car_chassis", "เลข Chassis"],
  ["car_license", "ทะเบียน"],
  ...EXCEL_MEMOS.flatMap(([key, number, date]): Array<[string, string]> => [
    [`number_${key}`, number], [`date_number_${key}`, date],
  ]),
  ...EXCEL_FLOW_NAMES.flatMap((name, index): Array<[string, string]> => [
    [`flow_start_${index}`, `วันที่เริ่ม${name}`], [`flow_end_${index}`, `วันที่สิ้นสุด${name}`],
  ]),
  ["document_expired_date", "วันที่สิ้นสุดหนังสือหมดอายุ"],
  ["document_cancelled_date", "วันที่ยกเลิกหนังสือ"],
  ["remark", "Remark"],
  ["unit_code", "unit_code"],
];
const EXCEL_FILE_EDITABLE_FIELDS = ["usage_date", "approved_truck_type", "approved_qty"] as const;
const EXCEL_MAX_ROWS = 500;
type ExcelField = typeof EXCEL_FIELDS[number];
type WarehouseRecord = Record<string, unknown> & { id?: unknown; unit_code?: unknown };
type ExcelVehicle = Partial<Omit<RequestItem, "warehouse_info" | "vehicle_info">> & {
  warehouse_info?: WarehouseRecord | null;
  vehicle_info?: WarehouseRecord | null;
  dc_name?: string;
  vendor_short_name?: string;
  assessment_remark?: string;
  assessment_status?: string;
  assessment_date?: string;
};

function excelMessage(error: unknown) {
  return error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง";
}

async function excelApi<T extends { status?: string; message?: string }>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" }).catch(() => {
    throw new Error("โหลดรายการรถเพื่อส่งออกไม่ได้ กรุณาตรวจสอบการเชื่อมต่อ track_fleet_get.php");
  });
  let result: T;
  try {
    result = await response.json();
  } catch {
    throw new Error(`API ไม่ได้ส่งข้อมูลที่อ่านได้ (${response.status})`);
  }
  if (!response.ok || result?.status !== "success") {
    throw new Error(result?.message || `ดำเนินการไม่สำเร็จ (${response.status})`);
  }
  return result;
}

async function getExcelVehicles(url: URL) {
  const vehicles: ExcelVehicle[] = [];
  url.searchParams.set("group_mode", "incoming");
  url.searchParams.set("limit", "100");
  for (let page = 1; ; page += 1) {
    url.searchParams.set("page", String(page));
    const result = await excelApi<{ status?: string; message?: string; data?: ExcelVehicle[]; pagination?: { total_pages?: number; page?: number } }>(url.toString());
    if (!Array.isArray(result.data)) throw new Error("API ไม่ได้ส่งรายการรถ");
    if (Number(result.pagination?.page ?? page) !== page) throw new Error("รายการรถเปลี่ยนระหว่างโหลด กรุณาลองอีกครั้ง");
    vehicles.push(...result.data);
    if (vehicles.length > EXCEL_MAX_ROWS) throw new Error("กรุณาเพิ่มตัวกรองให้เหลือไม่เกิน 500 คันก่อนส่งออก");
    if (page >= Number(result.pagination?.total_pages || 1)) return vehicles;
  }
}

function exactWarehouse(vehicle: ExcelVehicle) {
  const code = textValue(vehicle.unit_code);
  const warehouse = vehicle.warehouse_info;
  return code && textValue(vehicle.request_id) && warehouse && textValue(warehouse.id)
    && textValue(warehouse.unit_code) === code ? warehouse : null;
}

function indexExcelVehicles(vehicles: ExcelVehicle[]) {
  const index = new Map<string, ExcelVehicle | null>();
  for (const vehicle of vehicles) {
    const code = textValue(vehicle.unit_code);
    const lookup = code.toUpperCase();
    if (code) index.set(lookup, index.has(lookup) ? null : vehicle);
  }
  return index;
}

function warehouseValue(field: ExcelField, value: unknown) {
  const text = String(value ?? "");
  return field === "warehouse_plan_date" ? text.split(/[T ]/)[0] : text;
}

function excelReportValues(vehicle: ExcelVehicle, warehouse: WarehouseRecord | null, sequence: number) {
  const dateOnly = (value: unknown) => textValue(value).split(/[T ]/)[0];
  const oldLicenses = vehicle.replaced_old_licenses ?? vehicle.license_replace;
  const status = textValue(vehicle.status);
  const values: Record<string, unknown> = {
    sequence,
    request_date: dateOnly(vehicle.request_date || vehicle.date),
    fleet_type: vehicle.fleet_type,
    status: status === "progress" ? "คำขอรอพิจารณา (TCAS)" : status,
    running_doc: vehicle.running_doc,
    dc_type: vehicle.dc_type,
    dc_name: vehicle.dc_name || vehicle.dc_code,
    fleet_truck_type: vehicle.fleet_truck_type,
    qty: vehicle.qty,
    replaced_old_licenses: Array.isArray(oldLicenses) ? oldLicenses.join(", ") : oldLicenses,
    vendor_short_name: vehicle.vendor_short_name,
    new_vendor_id: vehicle.new_vendor_id,
    new_vendor_name: vehicle.new_vendor_name,
    replaced_truck_types: Array.from(new Set(vehicle.details?.map(detail => detail.truck_type_replace).filter(Boolean))).join(", "),
    replaced_companies: Array.from(new Set(vehicle.details?.map(detail => detail.company_name_replace).filter(Boolean))).join(", "),
    assessment_remark: vehicle.assessment_remark,
    assessment_status: vehicle.assessment_status,
    assessment_date: dateOnly(vehicle.assessment_date),
    unit_code: textValue(vehicle.unit_code),
  };

  for (const field of EXCEL_FIELDS) {
    const reportedValue = field === "remark" ? undefined : vehicle[field as keyof ExcelVehicle];
    values[field] = warehouseValue(field, warehouse?.[field] ?? vehicle.vehicle_info?.[field] ?? reportedValue);
  }
  for (const [key] of EXCEL_MEMOS) {
    const storedKey = key === "fbp" ? "feb" : key;
    values[`number_${key}`] = warehouse?.[`number_${key}`] ?? warehouse?.[`number_${storedKey}`];
    values[`date_number_${key}`] = dateOnly(warehouse?.[`date_number_${key}`] ?? warehouse?.[`date_number_${storedKey}`]);
  }
  const process = textValue(vehicle.latest_process_name);
  const index = EXCEL_FLOW_NAMES.indexOf(process);
  const start = dateOnly(vehicle.latest_process_str_date);
  const end = dateOnly(vehicle.latest_process_end_date);
  if (index !== -1) {
    values[`flow_start_${index}`] = start;
    values[`flow_end_${index}`] = end;
  }
  const level = Number(vehicle.latest_process_level);
  if (level === 9) values.document_cancelled_date = end || start;
  if (level === 10) values.document_expired_date = end;
  return values;
}

type TcasExcelField = typeof EXCEL_FILE_EDITABLE_FIELDS[number];
type TcasExcelValue = string | number | null;
type TcasExcelValues = Record<TcasExcelField, TcasExcelValue>;
type TcasExcelChange = { unit_code: string; changes: Partial<Record<TcasExcelField, { before: TcasExcelValue; after: string | number }>> };
type TcasExcelReply = {
  status?: string;
  message?: string;
  issues?: string[];
  data?: { unit_code: string; values: TcasExcelValues }[];
  updated?: number;
};
const TCAS_EXCEL_BASELINE = "_tcas_excel_original_v1";
const TCAS_EXCEL_API = "/api/tcas-excel";

class TcasExcelApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function tcasExcelApi(fleetGroup: FleetGroup, warehouse: string, action: "read" | "save", rows: ({ unit_code: string } | TcasExcelChange)[]) {
  const result = await fetch(TCAS_EXCEL_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, fleet_group: fleetGroup, warehouse, rows }),
  }).catch(() => {
    throw new TcasExcelApiError("หน้าเว็บติดต่อเซิร์ฟเวอร์ Excel ไม่ได้ กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่", 0);
  });
  if (result.status === 404) {
    throw new TcasExcelApiError("ไม่พบ API ของหน้าเว็บ กรุณาตรวจสอบเส้นทาง /api/tcas-excel", 404);
  }
  const payload: TcasExcelReply = await result.json().catch(() => ({}));
  if (!result.ok || payload.status !== "success") {
    const reason = payload.message || `เชื่อมต่อ API สำหรับ Excel ไม่สำเร็จ (${result.status})`;
    throw new TcasExcelApiError([reason, ...(payload.issues || [])].join("\n"), result.status);
  }
  return payload;
}

function tcasExcelValue(value: import("exceljs").CellValue, field: TcasExcelField): TcasExcelValue {
  if (value == null || (typeof value === "string" && !value.trim())) return null;
  if (field === "approved_qty") {
    const qty = typeof value === "number" ? value : typeof value === "string" && /^\d+$/.test(value.trim()) ? Number(value) : NaN;
    if (!Number.isSafeInteger(qty) || qty < 0 || qty > 2147483647) throw new Error("จำนวนรถที่อนุมัติต้องเป็นจำนวนเต็มตั้งแต่ 0");
    return qty;
  }
  if (field === "usage_date") {
    let dateText = value instanceof Date && Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10)
      : typeof value === "string" ? value.trim() : "";
    const local = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dateText);
    if (local) {
      const year = Number(local[3]);
      dateText = `${year >= 2400 ? year - 543 : year}-${local[2].padStart(2, "0")}-${local[1].padStart(2, "0")}`;
    }
    const date = new Date(`${dateText}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== dateText) {
      throw new Error("กรุณากรอกวันที่ใช้งานเป็นวันที่จริง เช่น 2026-11-09");
    }
    return dateText;
  }
  if (typeof value !== "string" || value.trim().length > 100 || /[\x00-\x1F\x7F]/.test(value.trim())) {
    throw new Error("กรุณากรอกประเภทรถที่อนุมัติเป็นข้อความไม่เกิน 100 ตัวอักษร");
  }
  return value.trim();
}

type TcasExportRequest = {
  id?: number | string;
  dc_code?: string;
  status?: string;
  usage_date?: string | null;
  approved_truck_type?: string | null;
  approved_qty?: number | string | null;
};

async function readTcasExportRequests(vehicles: ExcelVehicle[]) {
  const requestIds = Array.from(new Set(vehicles.map(vehicle => textValue(vehicle.request_id))));
  if (requestIds.some(id => !/^[1-9]\d*$/.test(id))) {
    throw new Error("ไม่พบรหัสคำขอของรถบางคัน กรุณารีเฟรชหน้า TCAS แล้วลองใหม่");
  }
  const requests = new Map<string, TcasExportRequest>();
  for (let i = 0; i < requestIds.length; i += 6) {
    await Promise.all(requestIds.slice(i, i + 6).map(async id => {
      const url = new URL("request_get_export.php", API_BASE);
      url.searchParams.set("id", id);
      const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) }).catch(() => {
        throw new Error("ติดต่อ request_get_export.php เพื่อดาวน์โหลดข้อมูลไม่ได้");
      });
      const payload: { status?: string; message?: string; data?: TcasExportRequest } =
        await response.json().catch(() => ({}));
      const request = payload.data;
      if (!response.ok || payload.status !== "success" || !request || textValue(request.id) !== id) {
        throw new Error(payload.message || `อ่านข้อมูลคำขอ ${id} จาก request_get_export.php ไม่สำเร็จ (${response.status})`);
      }
      requests.set(id, request);
    }));
  }

  const originals = new Map<string, TcasExcelValues>();
  const issues: string[] = [];
  for (const vehicle of vehicles) {
    const code = textValue(vehicle.unit_code);
    const request = requests.get(textValue(vehicle.request_id));
    if (!request || textValue(request.status).toLowerCase() !== "progress"
      || textValue(request.dc_code).toUpperCase() !== textValue(vehicle.dc_code).toUpperCase()) {
      issues.push(`${code}: สถานะหรือคลังเปลี่ยนแล้ว กรุณารีเฟรชหน้า TCAS`);
      continue;
    }
    originals.set(code, {
      usage_date: tcasExcelValue(textValue(request.usage_date).split(/[T ]/)[0], "usage_date"),
      approved_truck_type: tcasExcelValue(request.approved_truck_type, "approved_truck_type"),
      approved_qty: tcasExcelValue(request.approved_qty, "approved_qty"),
    });
  }
  return { originals, issues };
}

async function readTcasExcel(buffer: ArrayBuffer) {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.getWorksheet("ข้อมูลปัจจุบัน");
  const baseline = workbook.getWorksheet(TCAS_EXCEL_BASELINE);
  if (!sheet || !baseline) throw new Error("กรุณาดาวน์โหลด Excel จากหน้า TCAS อีกครั้ง แล้วใช้ไฟล์นั้นกรอกข้อมูล");
  if (sheet.actualRowCount > EXCEL_MAX_ROWS + 1 || baseline.actualRowCount > EXCEL_MAX_ROWS + 1) {
    throw new Error("รองรับไฟล์ไม่เกิน 500 แถว");
  }
  const allowed = new Map<string, string>(EXCEL_REPORT_COLUMNS.filter(([key]) =>
    key === "unit_code" || EXCEL_FILE_EDITABLE_FIELDS.some(field => field === key),
  ).map(([key, title]) => [title, key]));
  const columns = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, index) => {
    const field = allowed.get(textValue(cell.value));
    if (!field) return;
    if (columns.has(field)) throw new Error("พบหัวคอลัมน์ซ้ำในไฟล์");
    columns.set(field, index);
  });
  if (columns.size !== 4) throw new Error("หัวคอลัมน์ไม่ครบ กรุณาดาวน์โหลดไฟล์ใหม่");
  const originals = new Map<string, TcasExcelValues>();
  baseline.eachRow((row, index) => {
    if (index === 1) return;
    const code = row.getCell(1).value;
    if (typeof code !== "string" || !code || originals.has(code)) throw new Error("ข้อมูลอ้างอิงในไฟล์ไม่ถูกต้อง");
    originals.set(code, {
      usage_date: tcasExcelValue(row.getCell(2).value, "usage_date"),
      approved_truck_type: tcasExcelValue(row.getCell(3).value, "approved_truck_type"),
      approved_qty: tcasExcelValue(row.getCell(4).value, "approved_qty"),
    });
  });
  const seen = new Set<string>();
  const changes: TcasExcelChange[] = [];
  sheet.eachRow((row, index) => {
    if (index === 1) return;
    try {
      const code = row.getCell(columns.get("unit_code")!).value;
      const original = typeof code === "string" ? originals.get(code) : undefined;
      if (typeof code !== "string" || !original || seen.has(code)) throw new Error("unit_code ไม่ตรงกับไฟล์ต้นฉบับหรือซ้ำกัน");
      seen.add(code);
      const change: TcasExcelChange = { unit_code: code, changes: {} };
      for (const field of EXCEL_FILE_EDITABLE_FIELDS) {
        const after = tcasExcelValue(row.getCell(columns.get(field)!).value, field);
        if (after !== null && after !== original[field]) change.changes[field] = { before: original[field], after };
      }
      if (Object.keys(change.changes).length) changes.push(change);
    } catch (error) {
      throw new Error(`แถว ${index} · ${excelMessage(error)}`);
    }
  });
  return changes;
}

async function makeExcelWorkbook(vehicles: ExcelVehicle[], originals: Map<string, TcasExcelValues>) {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet("ข้อมูลปัจจุบัน");
  const baseline = workbook.addWorksheet(TCAS_EXCEL_BASELINE);
  baseline.state = "veryHidden";
  baseline.addRow(["unit_code", ...EXCEL_FILE_EDITABLE_FIELDS]);
  sheet.columns = EXCEL_REPORT_COLUMNS.map(([field, header]) => ({
    header, key: field, width: field === "sequence" ? 9 : Math.min(36, Math.max(18, header.length)),
    style: { numFmt: "@" },
  }));
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.getRow(1).height = 34;
  sheet.getRow(1).alignment = { wrapText: true, vertical: "middle" };
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
  for (const field of EXCEL_FILE_EDITABLE_FIELDS) {
    sheet.getRow(1).getCell(field).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } };
  }

  let included = 0;
  for (const vehicle of indexExcelVehicles(vehicles).values()) {
    if (!vehicle) continue;
    const code = textValue(vehicle.unit_code);
    const original = originals.get(code);
    if (!original) continue;
    const row = sheet.addRow({ ...excelReportValues(vehicle, exactWarehouse(vehicle), included + 1), ...original });
    baseline.addRow([code, ...EXCEL_FILE_EDITABLE_FIELDS.map(field => original[field])]);
    for (const field of EXCEL_FILE_EDITABLE_FIELDS) {
      row.getCell(field).protection = { locked: false };
    }
    included += 1;
  }
  if (!included) throw new Error(vehicles.length
    ? "ไม่มีรถ TCAS ที่ส่งออกเพื่อแก้ไขได้ กรุณาตรวจสอบรหัสรถและสิทธิ์ของคลัง"
    : "ไม่มีรถตรงกับตัวกรองที่เลือกสำหรับส่งออก");

  const password = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, "0")).join("");
  await sheet.protect(password, { selectLockedCells: true, selectUnlockedCells: true });
  return { workbook, included };
}

const formatNumber = (value: number | string | null | undefined) => {
  if (value == null || value === "") return "-";
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString("th-TH") : String(value);
};
const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const normalizeDateKey = (value?: string) => {
  const raw = textValue(value);
  if (!raw) return "ไม่ระบุวันที่";
  const onlyDate = raw.split(/[T ]/)[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(onlyDate)) return onlyDate;
  if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(onlyDate)) {
    const [day, month, year] = onlyDate.split(/[/-]/);
    return `${year}-${month}-${day}`;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? onlyDate : dateKey(parsed);
};
const formatThaiDate = (value?: string) => {
  const key = normalizeDateKey(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return key;
  const [year, month, day] = key.split("-");
  return `${day}/${month}/${year}`;
};
const remainingUsage = (value?: string) => {
  const key = normalizeDateKey(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    return { label: "ไม่ระบุวันที่", className: "text-slate-400" };
  }
  const [year, month, day] = key.split("-").map(Number);
  const now = new Date();
  const days = Math.round((Date.UTC(year, month - 1, day) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
  return {
    label: days > 0 ? `เหลืออีก ${days} วัน` : days === 0 ? "ถึงกำหนดวันนี้" : `เกินกำหนด ${Math.abs(days)} วัน`,
    className: days < 0 ? "text-red-600" : days <= 10 ? "text-orange-600" : "text-emerald-600",
  };
};
const vehicleCode = (vehicle: RequestItem, index: number) =>
  vehicle.unit_code || vehicle.running_doc_vehicle_no || textValue(vehicle.vehicle_no) || `คันที่ ${index + 1}`;
// จัดกลุ่ม -N01, -N02 เป็นเอกสารเดียวกัน และแยกเลขท้าย -005, -006
const getDocumentGroupInfo = (vehicle: RequestItem, index: number): { key: string; displayDocument: string } => {
  const runningDoc = textValue(vehicle.running_doc);
  const code = [vehicle.unit_code, vehicle.running_doc_vehicle_no]
    .map(textValue)
    .find((value) => /-(?:N\d+|\d+)$/i.test(value));

  if (code) {
    if (/-N\d+$/i.test(code)) {
      const base = code.replace(/-N\d+$/i, "");
      return { key: `new:${base.toUpperCase()}`, displayDocument: base };
    }
    return { key: `numbered:${code.toUpperCase()}`, displayDocument: code };
  }
  if (/-N\d+$/i.test(runningDoc)) {
    const base = runningDoc.replace(/-N\d+$/i, "");
    return { key: `new:${base.toUpperCase()}`, displayDocument: base };
  }
  if (runningDoc) return { key: `document:${runningDoc.toUpperCase()}`, displayDocument: runningDoc };
  return { key: `missing-document-${vehicle.id ?? index}-${index}`, displayDocument: "" };
};
const vehicleKey = (vehicle: RequestItem, index: number) =>
  `${vehicle.request_id ?? ""}-${vehicle.incoming_truck_id ?? vehicle.id ?? vehicleCode(vehicle, index)}-${index}`;
const getProcessStatus = (item: RequestItem) => {
  const step = Number(item.current_step ?? item.latest_process_level ?? 0);
  const process = textValue(item.current_process || item.latest_process_name) || "ยังไม่พบข้อมูลขั้นตอน";
  return normalizeStatus(item.status) === "cancel" ? process : `${step}/${item.total_steps || 8} : ${process}`;
};
const vehicleInfo = (item: RequestItem) => item.vehicle_info || item.warehouse_info;
const uniqueValues = (vehicles: RequestItem[], getValue: (item: RequestItem) => unknown) =>
  Array.from(new Set(vehicles.map((item) => textValue(getValue(item))).filter(Boolean)));
function DocumentValues({ vehicles, getValue }: { vehicles: RequestItem[]; getValue: (item: RequestItem) => unknown }) {
  const values = uniqueValues(vehicles, getValue);
  return values.length ? <div className="space-y-1">{values.map((value) => <p key={value} className="font-semibold text-slate-700">{value}</p>)}</div> : <span className="text-slate-400">-</span>;
}
// รวมเฉพาะค่าที่แสดงในคอลัมน์เดียวกัน ไม่ลบรถออกจากเอกสาร
function groupVehicleValues(
  vehicles: RequestItem[],
  groupBy?: (vehicle: RequestItem) => unknown,
) {
  const groups = new Map<string, { vehicle: RequestItem; index: number; codes: string[] }>();
  vehicles.forEach((vehicle, index) => {
    const key = groupBy ? JSON.stringify(groupBy(vehicle)) ?? "null" : `vehicle-${index}`;
    const code = vehicleCode(vehicle, index);
    const group = groups.get(key);
    if (group) group.codes.push(code);
    else groups.set(key, { vehicle, index, codes: [code] });
  });
  return Array.from(groups.values());
}
const oldLicenses = (vehicle: RequestItem): string[] => {
  const licenses = vehicle.replaced_old_licenses?.length
    ? vehicle.replaced_old_licenses
    : Array.isArray(vehicle.license_replace)
      ? vehicle.license_replace
      : vehicle.license_replace ? [vehicle.license_replace] : [];
  return Array.from(new Set(licenses.map(textValue).filter(Boolean))).sort();
};
const displayVehicleFields = (vehicle: RequestItem) => {
  const info = vehicleInfo(vehicle);
  return [
    ["ยี่ห้อ", textValue(info?.car_brand || vehicle.car_brand)],
    ["จัดสรรผู้ผลิต", textValue(info?.supplier_alloc || vehicle.supplier_alloc)],
    ["รุ่นรถ", textValue(info?.car_model || vehicle.car_model)],
    ["เลขเครื่อง", textValue(info?.car_engine || vehicle.car_engine)],
    ["เลขตัวถัง", textValue(info?.car_chassis || vehicle.car_chassis)],
    ["ทะเบียน", textValue(info?.car_license || vehicle.car_license)],
  ];
};
const documentLicenses = (vehicles: RequestItem[]) => Array.from(new Set(
  vehicles.flatMap(oldLicenses).map((license) => license.replace(/\s+-\s+/g, ", ")),
));
// ไม่บังคับว่าทุกเอกสารต้องใช้รหัส -N01
const assessmentReference = (vehicles: RequestItem[]) => {
  const named = vehicles.find((vehicle) => /-N01$/i.test(textValue(vehicle.unit_code || vehicle.running_doc_vehicle_no)));
  if (named) return named;
  const first = vehicles.find((vehicle) => textValue(vehicle.warehouse_vehicle_no) === "1" || textValue(vehicle.vehicle_no) === "1");
  if (first) return first;
  const collator = new Intl.Collator("th", { numeric: true, sensitivity: "base" });
  return [...vehicles].sort((a, b) => {
    const ordinalA = Number(a.warehouse_vehicle_no ?? a.vehicle_info?.vehicle_no ?? a.vehicle_no);
    const ordinalB = Number(b.warehouse_vehicle_no ?? b.vehicle_info?.vehicle_no ?? b.vehicle_no);
    const rankA = Number.isFinite(ordinalA) && ordinalA > 0 ? ordinalA : Number.MAX_SAFE_INTEGER;
    const rankB = Number.isFinite(ordinalB) && ordinalB > 0 ? ordinalB : Number.MAX_SAFE_INTEGER;
    return rankA - rankB || collator.compare(vehicleCode(a, 0), vehicleCode(b, 0))
      || collator.compare(textValue(a.incoming_truck_id || a.id), textValue(b.incoming_truck_id || b.id));
  })[0];
};
function VehicleBlocks({ vehicles, children, groupBy }: {
  vehicles: RequestItem[];
  children: (vehicle: RequestItem, index: number) => ReactNode;
  groupBy?: (vehicle: RequestItem) => unknown;
}) {
  const groups = groupVehicleValues(vehicles, groupBy);
  const shared = Boolean(groupBy) && groups.length === 1;
  return <div style={{ width: "100%", minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>{groups.map(({ vehicle, index, codes }) => (
    <div key={vehicleKey(vehicle, index)} style={{ minWidth: 0, padding: shared ? "4px 0" : 10 }} className={shared
      ? "py-1"
      : "rounded-xl border border-slate-200 bg-slate-50 p-3"}>
      {!shared && <div style={{ marginBottom: 8, display: "flex", flexDirection: "column", gap: 4 }}>{codes.map((code, codeIndex) => <p key={`${code}-${codeIndex}`} style={{ margin: 0, whiteSpace: "normal", overflowWrap: "anywhere", fontSize: 10, lineHeight: "16px", color: "#2563eb", fontWeight: 600 }}>{code}</p>)}</div>}
      {children(vehicle, index)}
    </div>
  ))}</div>;
}
const inputClass = "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return <div className={`min-w-0 ${className}`}><label className="mb-1.5 block text-[11px] font-bold text-slate-400">{label}</label>{children}</div>;
}

type FleetGroup = "new-replacement" | "supplement";

export default function TrackFleetPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">กำลังโหลดหน้าติดตามกองรถ…</div>}>
      <TrackFleetRoute />
    </Suspense>
  );
}

function TrackFleetRoute() {
  const searchParams = useSearchParams();
  const fleetGroup: FleetGroup = searchParams?.get("fleet_group") === "supplement"
    ? "supplement"
    : "new-replacement";

  // เปลี่ยนกลุ่มแล้วเริ่มหน้าแรกและล้างข้อมูล/ตัวกรอง/Modal ของกลุ่มก่อนหน้า
  return <TrackFleetContent key={fleetGroup} fleetGroup={fleetGroup} />;
}

function TrackFleetContent({ fleetGroup }: { fleetGroup: FleetGroup }) {
  const fleetGroupLabel = fleetGroup === "supplement" ? "รถเสริม" : "รถออกใหม่/ทดแทน";
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [selectedDC, setSelectedDC] = useState<SelectedDC | null>(null);
  const [contextReady, setContextReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedRequest, setSelectedRequest] = useState<RequestItem | null>(null);
  const [selectedDocumentNo, setSelectedDocumentNo] = useState("");
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [openDetailModal, setOpenDetailModal] = useState(false);
  const [selectedDocumentLicenses, setSelectedDocumentLicenses] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [oldLicenseSearchInput, setOldLicenseSearchInput] = useState("");
  const [oldLicenseSearchItems, setOldLicenseSearchItems] = useState<string[]>([]);
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [vehicleSearchInput, setVehicleSearchInput] = useState("");
  const [vehicleSearchItems, setVehicleSearchItems] = useState<string[]>([]);
  const [fleetTypeFilter, setFleetTypeFilter] = useState("all");
  const [truckTypeFilter, setTruckTypeFilter] = useState("all");
  const [currentProcessFilter, setCurrentProcessFilter] = useState("all");
  const [processDateField, setProcessDateField] = useState<"str_date" | "end_date">("str_date");
  const [processCalendarPosition, setProcessCalendarPosition] = useState({ top: 0, left: 0 });
  const [activeProcessCalendar, setActiveProcessCalendar] = useState<"from" | "to" | null>(null);
  const [processDateFrom, setProcessDateFrom] = useState("");
  const [processDateTo, setProcessDateTo] = useState("");
  const [dcTypeFilter, setDcTypeFilter] = useState("all");
  const [dcFilter, setDcFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [documentSort, setDocumentSort] = useState<"asc" | "desc" | null>(null);
  const [openExportModal, setOpenExportModal] = useState(false);
  const [exportApiUrl, setExportApiUrl] = useState("");
  const [excelBusy, setExcelBusy] = useState<"export" | "import" | null>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const [excelResult, setExcelResult] = useState<{ summary: string; issues: string[] } | null>(null);
  const excelBusyRef = useRef(false);
  const [showSystemUpdateModal, setShowSystemUpdateModal] = useState(true);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ fleet_types: [], truck_types: [], dc_types: [], dc_codes: [], process_options: [] });
  const [pagination, setPagination] = useState<Pagination>({ total_vehicles: 0, total_records: 0, total_documents: null, page: 1, limit: 20, total_pages: 1 });
  const [requestDateRange, setRequestDateRange] = useState([{ startDate: new Date(), endDate: new Date(), key: "selection" }]);
  const [hasRequestDateRange, setHasRequestDateRange] = useState(false);
  const [requestDateOptions, setRequestDateOptions] = useState<RequestDateOptions | null>(null);
  const [showRequestDatePicker, setShowRequestDatePicker] = useState(false);
  const [requestDatePickerPosition, setRequestDatePickerPosition] = useState({ top: 0, left: 0 });
  const requestDateButtonRef = useRef<HTMLButtonElement | null>(null);
  const requestDatePickerRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const sequenceRef = useRef(0);

  useEffect(() => {
    setPortalTarget(document.body);
    try {
      const saved = localStorage.getItem("user_info") || localStorage.getItem("user") || localStorage.getItem("userInfo");
      setUserInfo(saved ? JSON.parse(saved) : null);
    } catch { setUserInfo(null); }
    const loadSelectedDC = () => {
      try {
        const saved = localStorage.getItem("selected_dc");
        setSelectedDC(saved ? JSON.parse(saved) : null);
      } catch { setSelectedDC(null); }
      setRequestDateOptions(null);
      setHasRequestDateRange(false);
      setCurrentPage(1);
    };
    loadSelectedDC();
    setContextReady(true);
    window.addEventListener("selectedDCChanged", loadSelectedDC);
    return () => window.removeEventListener("selectedDCChanged", loadSelectedDC);
  }, []);
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearchText(searchText), 250);
    return () => clearTimeout(timeout);
  }, [searchText]);

  const selectedDcFromSidebar = textValue(selectedDC?.DC_CODE || selectedDC?.dc_code).toUpperCase();
  const userWarehouse = textValue(userInfo?.warehouse || userInfo?.WAREHOUSE || userInfo?.team || userInfo?.TEAM).toUpperCase();
  const activeWarehouse = selectedDcFromSidebar || userWarehouse;
  const isCenterUser = activeWarehouse === "CENTER";
  const selectedDcLabel = activeWarehouse === "CENTER" ? "CENTER - ส่วนกลาง / แสดงข้อมูลทั้งหมด" : activeWarehouse
    ? `${activeWarehouse}${selectedDC?.DC_NAME || selectedDC?.dc_name ? ` - ${selectedDC.DC_NAME || selectedDC.dc_name}` : ""}${selectedDC?.DC_TYPE || selectedDC?.dc_type ? ` (${selectedDC.DC_TYPE || selectedDC.dc_type})` : ""}`
    : "แสดงข้อมูลตามสิทธิ์ผู้ใช้งาน";

  const fetchRequests = useCallback(async () => {
    if (!contextReady) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const sequence = ++sequenceRef.current;
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 15000);
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ fleet_group: fleetGroup, group_mode: "document", page: String(currentPage), limit: String(pageSize) });
      if (activeWarehouse && activeWarehouse !== "CENTER") params.set("warehouse", activeWarehouse);
      const userType = textValue(userInfo?.team || userInfo?.TEAM);
      if (userType) params.set("user_type", userType);
      const filters = { status: statusFilter, dc_type: dcTypeFilter, dc_code: dcFilter, fleet_type: fleetTypeFilter, truck_type: truckTypeFilter, process: currentProcessFilter };
      Object.entries(filters).forEach(([key, value]) => { if (value !== "all") params.set(key, value); });
      if (debouncedSearchText.trim()) params.set("search", debouncedSearchText.trim());
      if (vehicleSearchItems.length) params.set("vehicle_search", vehicleSearchItems.join(","));
      if (oldLicenseSearchItems.length) params.set("old_license", oldLicenseSearchItems.join(","));
      if (processDateFrom && processDateTo && processDateTo < processDateFrom) {
        throw new Error("ช่วงวันที่ขั้นตอนไม่ถูกต้อง: ถึงวันที่ต้องไม่น้อยกว่าจากวันที่");
      }
      if (processDateFrom || processDateTo) {
        params.set("process_date_field", processDateField);
        if (processDateFrom) params.set("process_date_from", processDateFrom);
        if (processDateTo) params.set("process_date_to", processDateTo);
      }
      if (hasRequestDateRange) {
        params.set("start_date", dateKey(requestDateRange[0].startDate));
        params.set("end_date", dateKey(requestDateRange[0].endDate));
      } else {
        params.set("request_date_scope", "all");
      }
      const url = `${API_BASE}?${params}`;
      const response = await fetch(url, { method: "GET", headers: { Accept: "application/json" }, cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error(`ไม่สามารถดึงข้อมูลได้ (${response.status})`);
      const json = await response.json();
      if (sequence !== sequenceRef.current || controller.signal.aborted) return;
      if (json.status !== "success") throw new Error(json.message || "เกิดข้อผิดพลาดในการดึงข้อมูล");
      setRequestDateOptions(json.request_date_options ?? null);
      const data = Array.isArray(json.data) ? json.data : [];
      // รับได้ทั้ง API ใหม่แบบเอกสารและ API เดิมแบบรายคัน
      const vehicles: RequestItem[] = data.flatMap((item: RequestItem | { vehicles: RequestItem[] }) =>
        "vehicles" in item && Array.isArray(item.vehicles) ? item.vehicles : [item as RequestItem],
      );
      setRequests(vehicles);
      const exportUrl = new URL(url);
      exportUrl.searchParams.set("group_mode", "incoming");
      setExportApiUrl(exportUrl.toString());
      const readSummary = (value: { qty?: unknown; items?: unknown } | undefined) => ({ qty: Number(value?.qty || 0), items: Number(value?.items || 0) });
      const progress = readSummary(json.summary?.progress);
      const cancel = readSummary(json.summary?.cancel);
      const success = readSummary(json.summary?.success);
      // all.items ต้องมาจาก API โดยตรง ไม่บวกจำนวนเอกสารหลายสถานะซ้ำกัน
      setSummary({ all: readSummary(json.summary?.all), progress, cancel, success });
      setFilterOptions({ fleet_types: json.filters?.fleet_types || [], truck_types: json.filters?.truck_types || [], dc_types: json.filters?.dc_types || [], dc_codes: json.filters?.dc_codes || [], process_options: json.filters?.process_options || [] });
      const totalVehicles = Math.max(0, Number(json.pagination?.total_vehicles ?? json.pagination?.total_records ?? 0));
      const totalDocuments = json.pagination?.total_documents == null ? null : Math.max(0, Number(json.pagination.total_documents));
      const responseLimit = Math.max(1, Number(json.pagination?.limit ?? pageSize));
      const responsePage = Math.max(1, Number(json.pagination?.page ?? currentPage));
      setPagination({
        total_vehicles: totalVehicles,
        total_records: Number(json.pagination?.total_records ?? totalVehicles),
        total_documents: totalDocuments, page: responsePage, limit: responseLimit,
        total_pages: Math.max(1, Number(json.pagination?.total_pages ?? Math.ceil((totalDocuments ?? totalVehicles) / responseLimit))),
      });
      if (responsePage !== currentPage) setCurrentPage(responsePage);
    } catch (err) {
      if (sequence !== sequenceRef.current) return;
      if (controller.signal.aborted && !timedOut) return;
      setError(timedOut ? "ใช้เวลาโหลดข้อมูลนานเกินไป กรุณาลองรีเฟรชอีกครั้ง" : err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการดึงข้อมูล");
      setRequests([]);
      setExportApiUrl("");
      setSummary(EMPTY_SUMMARY);
    } finally {
      clearTimeout(timeout);
      if (sequence === sequenceRef.current) setLoading(false);
    }
  }, [fleetGroup, contextReady, activeWarehouse, userInfo?.team, userInfo?.TEAM, currentPage, pageSize, statusFilter, dcTypeFilter, dcFilter, fleetTypeFilter, truckTypeFilter, currentProcessFilter, debouncedSearchText, oldLicenseSearchItems, processDateField, processDateFrom, processDateTo, vehicleSearchItems, hasRequestDateRange, requestDateRange]);
  useEffect(() => {
    void fetchRequests();
    return () => { ++sequenceRef.current; controllerRef.current?.abort(); };
  }, [fetchRequests]);
  useEffect(() => {
    if (!showRequestDatePicker) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!requestDateButtonRef.current?.contains(target) && !requestDatePickerRef.current?.contains(target)) setShowRequestDatePicker(false);
    };
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") setShowRequestDatePicker(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, [showRequestDatePicker]);

  // กรอง warehouse ที่ใช้แสดงและส่งออกให้ตรงกัน; backend ยังต้องตรวจสิทธิ์เอง
  const visibleRequests = useMemo(() => {
    if (!activeWarehouse || isCenterUser) return requests;
    return requests.filter((item) => textValue(item.dc_code).toUpperCase() === activeWarehouse);
  }, [requests, activeWarehouse, isCenterUser]);
  const groupedDocuments = useMemo(() => {
    const groups = new Map<string, DocumentGroup>();
    visibleRequests.forEach((item, index) => {
      const { key, displayDocument } = getDocumentGroupInfo(item, index);
      const group = groups.get(key);
      if (group) group.vehicles.push(item);
      else groups.set(key, { key, running_doc: displayDocument, vehicles: [item] });
    });
    const collator = new Intl.Collator("th", { numeric: true, sensitivity: "base" });
    const documents = Array.from(groups.values());
    documents.forEach((document) => document.vehicles.sort((a, b) => collator.compare(vehicleCode(a, 0), vehicleCode(b, 0))));
    return documents;
  }, [visibleRequests]);
  const groupedByRequestDate = useMemo(() => {
    const groups: Record<string, DocumentGroup[]> = {};
    groupedDocuments.forEach((document) => {
      // เลือกวันที่แรกสุดอย่างคงที่ แม้วันที่ของรถในเอกสารเดียวกันต่างกัน
      const dates = document.vehicles.map((v) => normalizeDateKey(v.request_date || v.date)).filter((d) => d !== "ไม่ระบุวันที่").sort();
      const key = dates[0] || "ไม่ระบุวันที่";
      (groups[key] ??= []).push(document);
    });
    if (documentSort) {
      const collator = new Intl.Collator("th", { numeric: true, sensitivity: "base" });
      Object.values(groups).forEach((documents) => documents.sort((a, b) => {
        const result = collator.compare(a.running_doc, b.running_doc);
        return documentSort === "asc" ? result : -result;
      }));
    }
    return groups;
  }, [groupedDocuments, documentSort]);
  const sortedDates = useMemo(() => Object.keys(groupedByRequestDate).sort((a, b) => a === "ไม่ระบุวันที่" ? 1 : b === "ไม่ระบุวันที่" ? -1 : b.localeCompare(a)), [groupedByRequestDate]);
  const documentRowNumbers = useMemo(() => {
    const numbers = new Map<string, number>();
    // API เดิมแบ่งหน้ารายคัน จึงแสดงลำดับเอกสารภายในหน้าแทนการอ้างยอดเอกสารรวมที่ไม่ทราบ
    let number = pagination.total_documents == null ? 0 : (currentPage - 1) * pageSize;
    sortedDates.forEach((date) => groupedByRequestDate[date].forEach((document) => numbers.set(document.key, ++number)));
    return numbers;
  }, [sortedDates, groupedByRequestDate, currentPage, pageSize, pagination.total_documents]);
  const visibleProcessOptions = useMemo(() => filterOptions.process_options.filter((option) => {
    const step = Number(option.value.split("|")[0]);
    return statusFilter === "all" || (statusFilter === "success" ? step === 8 : statusFilter === "cancel" ? step === 9 || step === 10 : step >= 0 && step < 8);
  }), [filterOptions.process_options, statusFilter]);
  const pageTitle = `รายการติดตามกอง${fleetGroupLabel}${dcFilter !== "all" ? ` ของ ${dcFilter}` : activeWarehouse && !isCenterUser ? ` ของ ${activeWarehouse}` : ""}`;
  const rangeLabel = hasRequestDateRange ? `${formatThaiDate(dateKey(requestDateRange[0].startDate))} - ${formatThaiDate(dateKey(requestDateRange[0].endDate))}` : "ทุกวันที่ขอ";
  const firstRequestDate = requestDateOptions?.first_date ? new Date(`${requestDateOptions.first_date}T00:00:00`) : null;
  const lastRequestDate = requestDateOptions?.last_date ? new Date(`${requestDateOptions.last_date}T00:00:00`) : null;
  const handleOpenDocument = (document: DocumentGroup) => {
    const requestIds = Array.from(new Set(
      document.vehicles
        .map((vehicle) => textValue(vehicle.request_id))
        .filter(Boolean),
    ));
    // ไม่ใช้ incoming_truck_id เป็น requestId และไม่เลือกคำขอแรกเงียบ ๆ
    if (requestIds.length !== 1) {
      setError(requestIds.length === 0
        ? "ไม่พบ request_id ของเอกสารนี้ จึงยังเปิดการประเมินไม่ได้"
        : "เอกสารนี้ผูกกับหลาย request_id ต้องให้ Modal รองรับหลายคำขอก่อน จึงจะเปิดข้อมูลได้ครบ");
      return;
    }
    const request = assessmentReference(document.vehicles);
    if (!request) { setError("ไม่พบข้อมูลรถของเอกสารนี้ กรุณารีเฟรชข้อมูล"); return; }
    setSelectedDocumentNo(document.running_doc);
    setSelectedDocumentLicenses(documentLicenses(document.vehicles));
    setSelectedRequest(request);
    setOpenDetailModal(true);
  };
  const handleCloseDetail = () => {
    setOpenDetailModal(false);
    setSelectedRequest(null);
    setSelectedDocumentNo("");
    setSelectedDocumentLicenses([]);
  };
  const addVehicleSearchItems = (value: string) => {
    const items = value.split(/[,;\n]+/).map((v) => v.trim()).filter(Boolean);
    if (!items.length) return;
    setVehicleSearchItems((previous) => Array.from(new Map([...previous, ...items].map((v) => [v.toLowerCase(), v])).values()));
    setVehicleSearchInput(""); setCurrentPage(1);
  };
  const handleVehicleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addVehicleSearchItems(vehicleSearchInput); }
    if (event.key === "Backspace" && !vehicleSearchInput) { setVehicleSearchItems((items) => items.slice(0, -1)); setCurrentPage(1); }
  };
  const addOldLicenseSearchItems = (value: string) => {
    const items = value.split(/[,;\r\n]+/).map((item) => item.trim()).filter(Boolean);
    if (!items.length) return;
    setOldLicenseSearchItems((previous) => {
      const unique = new Map<string, string>();
      [...previous, ...items].forEach((item) => {
        if (!unique.has(item.toLowerCase())) unique.set(item.toLowerCase(), item);
      });
      return Array.from(unique.values());
    });
    setOldLicenseSearchInput("");
    setCurrentPage(1);
  };
  const removeOldLicenseSearchItem = (value: string) => {
    setOldLicenseSearchItems((previous) => previous.filter((item) => item !== value));
    setCurrentPage(1);
  };
  const handleOldLicenseSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Enter" || event.key === "," || event.key === ";") {
      event.preventDefault();
      addOldLicenseSearchItems(oldLicenseSearchInput);
    }
    if (event.key === "Backspace" && !oldLicenseSearchInput && oldLicenseSearchItems.length) {
      setOldLicenseSearchItems((previous) => previous.slice(0, -1));
      setCurrentPage(1);
    }
  };
  const toggleDatePicker = () => {
    const rect = requestDateButtonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(330, window.innerWidth - 32);
    const top = window.innerHeight - rect.bottom < 390 && rect.top > 390 ? rect.top - 390 : rect.bottom + 8;
    setRequestDatePickerPosition({ top: Math.max(16, top), left: Math.max(16, Math.min(rect.right - width, window.innerWidth - width - 16)) });
    setShowRequestDatePicker((open) => !open);
  };
  const clearDates = () => { setHasRequestDateRange(false); setCurrentPage(1); setRequestDateRange([{ startDate: new Date(), endDate: new Date(), key: "selection" }]); };
  const clearFilters = () => {
    setSearchText(""); setOldLicenseSearchInput(""); setOldLicenseSearchItems([]); setVehicleSearchInput(""); setVehicleSearchItems([]);
    setFleetTypeFilter("all"); setTruckTypeFilter("all"); setDcTypeFilter("all");
    setDcFilter("all"); setStatusFilter("all"); setCurrentProcessFilter("all");
    setProcessDateField("str_date"); setProcessDateFrom(""); setProcessDateTo(""); setActiveProcessCalendar(null); clearDates();
  };


  const showExcelTools = statusFilter === "progress";
  const canExportFleetExcel = showExcelTools && Boolean(activeWarehouse) && !loading && Boolean(
    exportApiUrl && new URL(exportApiUrl).searchParams.get("status") === statusFilter,
  );

  async function exportFleetExcel() {
    if (!canExportFleetExcel || excelBusyRef.current) return;
    excelBusyRef.current = true;
    setExcelBusy("export");
    setExcelResult(null);
    try {
      const vehicles = await getExcelVehicles(new URL(exportApiUrl));
      if (!vehicles.length) throw new Error("ไม่มีรถตรงกับตัวกรองที่เลือกสำหรับส่งออก");
      const eligible = Array.from(indexExcelVehicles(vehicles).values()).filter(vehicle => vehicle !== null);
      if (!eligible.length) throw new Error("ไม่พบ unit_code ที่ไม่ซ้ำสำหรับส่งออก");
      let originals: Map<string, TcasExcelValues>;
      const issues: string[] = [];
      try {
        const codes = eligible.map(vehicle => ({ unit_code: textValue(vehicle.unit_code) }));
        const result = await tcasExcelApi(fleetGroup, activeWarehouse, "read", codes);
        originals = new Map((result.data || []).map(row => [row.unit_code, row.values]));
        issues.push(...(result.issues || []));
      } catch (error) {
        if (!(error instanceof TcasExcelApiError) || ![0, 404, 502, 503, 504].includes(error.status)) throw error;
        const report = await readTcasExportRequests(eligible);
        originals = report.originals;
        issues.push(...report.issues);
        issues.push("ดาวน์โหลดจาก API รายงานเดิม การอัปโหลดกลับยังต้องเชื่อมต่อ API บันทึกของ TCAS");
      }
      const { workbook, included } = await makeExcelWorkbook(vehicles, originals);
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `track-fleet-${fleetGroup}-${dateKey(new Date())}.xlsx`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      if (vehicles.length > eligible.length) issues.push(`ข้าม ${vehicles.length - eligible.length} คันที่ไม่มี unit_code หรือรหัสซ้ำ`);
      setExcelResult({ summary: `ส่งออก Excel แล้ว ${included} คัน`, issues });
    } catch (error) {
      setExcelResult({ summary: "ส่งออก Excel ไม่สำเร็จ", issues: [excelMessage(error)] });
    } finally {
      excelBusyRef.current = false;
      setExcelBusy(null);
    }
  }

  async function importFleetExcel(file: File) {
    if (!showExcelTools || !activeWarehouse || excelBusyRef.current) return;
    excelBusyRef.current = true;
    setExcelBusy("import");
    setExcelResult(null);
    try {
      if (!/\.xlsx$/i.test(file.name) || file.size > 5 * 1024 * 1024) throw new Error("กรุณาเลือกไฟล์ .xlsx ขนาดไม่เกิน 5 MB");
      const rows = await readTcasExcel(await file.arrayBuffer());
      if (!rows.length) {
        setExcelResult({ summary: "ไม่มีค่าที่เปลี่ยนในสามคอลัมน์สีเขียว", issues: [] });
        return;
      }
      if (!window.confirm(`พบการแก้ไข ${rows.length} แถว ต้องการบันทึกข้อมูลจาก Excel หรือไม่?`)) return;
      const result = await tcasExcelApi(fleetGroup, activeWarehouse, "save", rows);
      setExcelResult({ summary: `บันทึกแล้ว ${result.updated ?? 0} คำขอ`, issues: [] });
      void fetchRequests();
    } catch (error) {
      setExcelResult({ summary: "นำเข้า Excel ไม่สำเร็จ", issues: excelMessage(error).split("\n") });
    } finally {
      excelBusyRef.current = false;
      setExcelBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <main className="mx-auto w-full max-w-[1440px] px-3 py-4 sm:px-4 lg:px-5">
        <div className="mb-4 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Fleet Management</p>
            <h1 className="mt-2 flex items-center gap-2 text-base font-semibold text-slate-900 sm:text-lg"><Truck size={22} className="text-blue-600" />ติดตามกอง{fleetGroupLabel}</h1>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600"><Warehouse size={12} />{selectedDcLabel}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setOpenExportModal(true)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-semibold hover:bg-blue-50"><Download size={16} />ดึงรายงาน</button>
            <button type="button" onClick={() => void fetchRequests()} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><RefreshCw size={15} className={loading ? "animate-spin" : ""} />{loading ? "กำลังโหลด..." : "รีเฟรชข้อมูล"}</button>
          </div>
        </div>
        {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-600">{error}</div>}

        <div className="mb-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
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
                backgroundIcon: ClipboardList,
              },
              {
                key: "progress",
                label: "คำขอรอพิจารณา (TCAS)",
                count: summary.progress.qty,
                itemCount: summary.progress.items,
                sub: "จำนวนรถที่รอการพิจารณา",
                activeClass:
                  "bg-gradient-to-br from-blue-600 via-sky-600 to-cyan-500 text-white ring-blue-300/40",
                inactiveClass:
                  "bg-gradient-to-br from-white to-blue-50 text-blue-800 ring-blue-100 hover:from-blue-50 hover:to-sky-50",
                iconClass: "bg-blue-100 text-blue-700",
                activeIconClass: "bg-white/20 text-white",
                countClass: "text-blue-900",
                activeCountClass: "text-white",
                dotClass: "bg-blue-500",
                shortLabel: "CT",
                backgroundIcon: Truck,
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
                backgroundIcon: CircleX,
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
                backgroundIcon: CircleCheck,
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
              backgroundIcon: BackgroundIcon,
            }) => {
              const isActive = statusFilter === key;

              return (
                <button
                  key={key}
                  aria-pressed={isActive}
                  type="button"
                  onClick={() => {
                    setStatusFilter(key);
                    setCurrentProcessFilter("all");
                    setCurrentPage(1);
                  }}
                  className={`group relative overflow-hidden rounded-xl p-3 text-left shadow-sm ring-1 transition duration-200 hover:shadow-md ${isActive ? activeClass : inactiveClass
                    }`}
                >
                  <BackgroundIcon aria-hidden="true" size={88} strokeWidth={1.2} className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none ${isActive ? "text-white opacity-[0.12]" : "opacity-[0.07]"}`} />
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
                          className={`truncate text-[11px] font-semibold ${isActive ? "text-white/90" : ""
                            }`}
                        >
                          {label}
                        </p>
                      </div>

                      <p
                        className={`mt-1 truncate text-[11px] font-bold ${isActive ? "text-white/60" : "text-slate-400"
                          }`}
                      >
                        {sub}
                      </p>
                    </div>

                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-xs font-semibold shadow-sm ${isActive ? activeIconClass : iconClass
                        }`}
                    >
                      {shortLabel}
                    </div>
                  </div>

                  <div className="relative mt-3 flex items-end justify-between">
                    <p
                      className={`text-2xl font-semibold tracking-tight ${isActive ? activeCountClass : countClass
                        }`}
                    >
                      {formatNumber(count)}
                      <span className="ml-1 text-xs font-semibold opacity-60">
                      รายการ
                      </span>
                    </p>

                    {/* <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${isActive
                        ? "bg-white/15 text-white"
                        : "bg-white/80 text-slate-400 shadow-sm"
                        }`}
                    >
                      {formatNumber(itemCount)} เอกสาร
                    </span> */}
                  </div>
                </button>
              );
            }
          )}
        </div>

        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><SlidersHorizontal size={17} className="text-blue-600" /><p className="text-xs font-semibold">ค้นหาและตัวกรอง</p></div><span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] text-blue-700">พบ {formatNumber(pagination.total_vehicles)} คัน{pagination.total_documents != null ? ` / ${formatNumber(pagination.total_documents)} เอกสาร` : ""}</span></div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Field label="ค้นหา"><div className="relative"><Search size={14} className="absolute left-3 top-3 text-blue-400" /><input className={`${inputClass} pl-9 pr-8`} value={searchText} onChange={(event) => { setSearchText(event.target.value); setCurrentPage(1); }} placeholder="เลขเอกสาร, DC, ผู้ขอ, ทะเบียน..." />{searchText && <button type="button" aria-label="ล้างคำค้นหา" className="absolute right-3 top-3 text-slate-400" onClick={() => { setSearchText(""); setCurrentPage(1); }}><X size={14} /></button>}</div></Field>
            <Field label="ค้นหาทะเบียนเก่าหลายทะเบียน">
              <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 px-2 py-1 focus-within:border-blue-500">
                <Truck size={14} className="shrink-0 text-blue-400" />
                {oldLicenseSearchItems.map((item) => (
                  <span key={item} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">
                    {item}<button type="button" aria-label={`ลบทะเบียนเก่า ${item}`} onClick={() => removeOldLicenseSearchItem(item)}><X size={12} /></button>
                  </span>
                ))}
                <input className="min-w-[130px] flex-1 bg-transparent py-1.5 text-xs outline-none"
                  value={oldLicenseSearchInput} onChange={(event) => setOldLicenseSearchInput(event.target.value)}
                  onKeyDown={handleOldLicenseSearchKeyDown} onBlur={() => addOldLicenseSearchItems(oldLicenseSearchInput)}
                  onPaste={(event) => {
                    const value = event.clipboardData.getData("text");
                    if (/[,;\r\n]/.test(value)) { event.preventDefault(); addOldLicenseSearchItems(value); }
                  }}
                  placeholder={oldLicenseSearchItems.length ? "เพิ่มทะเบียนเก่า..." : "พิมพ์ทะเบียนเก่า แล้วกด Enter"} />
                {oldLicenseSearchItems.length > 0 && <button type="button" aria-label="ล้างทะเบียนเก่าทั้งหมด"
                  onClick={() => { setOldLicenseSearchItems([]); setOldLicenseSearchInput(""); setCurrentPage(1); }}><X size={14} className="text-slate-400" /></button>}
              </div>
              <p className="mt-1 text-[10px] text-slate-400">กด Enter หรือลูกน้ำเพื่อเพิ่มรายการ</p>
            </Field>
            <Field label="ข้อมูลรถหลายรายการ" className="md:col-span-1">
              <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 px-2 py-1 focus-within:border-blue-500">
                {vehicleSearchItems.map((item) => <span key={item} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">{item}<button type="button" aria-label={`ลบ ${item}`} onClick={() => { setVehicleSearchItems((items) => items.filter((v) => v !== item)); setCurrentPage(1); }}><X size={12} /></button></span>)}
                <input className="min-w-[130px] flex-1 bg-transparent py-1.5 text-xs outline-none" value={vehicleSearchInput} onChange={(event) => setVehicleSearchInput(event.target.value)} onKeyDown={handleVehicleSearchKeyDown} onBlur={() => addVehicleSearchItems(vehicleSearchInput)} onPaste={(event) => { const value = event.clipboardData.getData("text"); if (/[,;\n]/.test(value)) { event.preventDefault(); addVehicleSearchItems(value); } }} placeholder="ทะเบียน รหัสรถ รุ่น หรือยี่ห้อ" />
                {vehicleSearchItems.length > 0 && <button type="button" aria-label="ล้างข้อมูลรถทั้งหมด" onClick={() => { setVehicleSearchItems([]); setVehicleSearchInput(""); setCurrentPage(1); }}><X size={14} className="text-slate-400" /></button>}
              </div><p className="mt-1 text-[10px] text-slate-400">กด Enter หรือลูกน้ำเพื่อเพิ่มรายการ</p>
            </Field>
            <Field label="ประเภทคำขอ"><select className={inputClass} value={fleetTypeFilter} onChange={(event) => { setFleetTypeFilter(event.target.value); setCurrentPage(1); }}><option value="all">ทุกประเภทคำขอ</option>{filterOptions.fleet_types.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
            <Field label="ประเภทรถ"><input className={inputClass} list="truck-type-filter-options" placeholder="พิมพ์ค้นหาประเภทรถ" value={truckTypeFilter === "all" ? "" : truckTypeFilter} onChange={(event) => { setTruckTypeFilter(event.target.value || "all"); setCurrentPage(1); }} /><datalist id="truck-type-filter-options">{filterOptions.truck_types.map((value) => <option key={value} value={value} />)}</datalist></Field>
            <Field label="DC Type"><select className={inputClass} value={dcTypeFilter} onChange={(event) => { setDcTypeFilter(event.target.value); setDcFilter("all"); setCurrentPage(1); }}><option value="all">ทุก DC Type</option>{filterOptions.dc_types.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
            <Field label="DC"><input className={inputClass} list="dc-filter-options" placeholder="พิมพ์ค้นหา DC" value={dcFilter === "all" ? "" : dcFilter} onChange={(event) => { setDcFilter(event.target.value || "all"); setCurrentPage(1); }} /><datalist id="dc-filter-options">{filterOptions.dc_codes.map((value) => <option key={value} value={value} />)}</datalist></Field>
            <Field label="วันที่ขอ"><div className="flex gap-1"><button ref={requestDateButtonRef} type="button" onClick={toggleDatePicker} className={`${inputClass} flex items-center gap-2 text-left`}><CalendarDays size={14} className="shrink-0 text-blue-500" /><span className="truncate">{rangeLabel}</span></button>{hasRequestDateRange && <button type="button" aria-label="ล้างช่วงวันที่" onClick={clearDates} className="rounded-xl border border-slate-200 px-2 text-slate-400"><X size={14} /></button>}</div></Field>
            <div className="min-w-0 md:col-span-2 xl:col-span-4">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span id="process-date-group-label" className="text-[11px] font-bold text-slate-400">ขั้นตอนและวันที่</span>
                <button type="button"
                  disabled={currentProcessFilter === "all" && processDateField === "str_date" && !processDateFrom && !processDateTo}
                  onClick={() => { setCurrentProcessFilter("all"); setProcessDateField("str_date"); setProcessDateFrom(""); setProcessDateTo(""); setActiveProcessCalendar(null); setCurrentPage(1); }}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 transition hover:text-rose-500 disabled:cursor-default disabled:opacity-40">
                  <X size={11} />ล้าง
                </button>
              </div>
              <div role="group" aria-labelledby="process-date-group-label"
                className="flex w-full min-w-0 flex-row flex-nowrap items-end gap-3 overflow-x-auto rounded-xl border border-slate-200 bg-white p-3">
                <div className="min-w-0 flex-1">
                  <label htmlFor="process-filter" className="mb-1.5 block whitespace-nowrap text-[10px] font-medium text-slate-400">ขั้นตอนปัจจุบัน</label>
                  <select id="process-filter" className={`${inputClass} h-10 w-full`} value={currentProcessFilter}
                    onChange={(event) => { setCurrentProcessFilter(event.target.value); setCurrentPage(1); }}>
                    <option value="all">ทุกขั้นตอน</option>
                    {visibleProcessOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                {(["from", "to"] as const).map((side) => {
                  const value = side === "from" ? processDateFrom : processDateTo;
                  return <div key={side} className="min-w-0 flex-1">
                    <label htmlFor={`process-date-${side}`} className="mb-1.5 block whitespace-nowrap text-[10px] font-medium text-slate-400">{side === "from" ? "จากวันที่" : "ถึงวันที่"}</label>
                    <button id={`process-date-${side}`} type="button" aria-haspopup="dialog" aria-expanded={activeProcessCalendar === side}
                      onClick={(event) => {
                        const rect = event.currentTarget.getBoundingClientRect();
                        const width = Math.min(330, window.innerWidth - 32);
                        const height = 390;
                        setProcessCalendarPosition({
                          left: Math.max(16, Math.min(rect.left, window.innerWidth - width - 16)),
                          top: Math.max(16, rect.bottom + height + 8 <= window.innerHeight ? rect.bottom + 8 : Math.min(rect.top - height - 8, window.innerHeight - height - 16)),
                        });
                        setShowRequestDatePicker(false); setActiveProcessCalendar(side);
                      }}
                      className={`${inputClass} flex h-10 w-full items-center justify-between gap-2 whitespace-nowrap text-left`}>
                      <span className={value ? "text-slate-700" : "text-slate-400"}>{value ? formatThaiDate(value) : "เลือกวันที่"}</span>
                      <CalendarDays size={15} className="shrink-0 text-blue-500" />
                    </button>
                  </div>;
                })}
              </div>
            </div>
          </div>
          <div className="mt-3 flex justify-end"><button type="button" onClick={clearFilters} className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-600"><Eraser size={14} />ล้างตัวกรอง</button></div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <div><h2 className="text-xs font-semibold">{pageTitle}</h2><p className="mt-1 text-[11px] text-slate-400">แสดง {groupedDocuments.length} เอกสาร จากข้อมูลรถ {visibleRequests.length} คันในหน้านี้</p></div>
            {showExcelTools && <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:ml-auto">
              <div>
                <h3 className="text-xs font-semibold text-slate-800">รายงาน Excel</h3>
                <p className="mt-1 text-[11px] text-slate-600">แก้เฉพาะสามคอลัมน์หัวสีเขียว แล้วอัปโหลดกลับเพื่อบันทึก</p>
              </div>
              <input ref={excelInputRef} type="file" accept=".xlsx" className="hidden" onChange={event => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (file) void importFleetExcel(file);
              }} />
              {/* <button type="button" disabled={Boolean(excelBusy) || !canExportFleetExcel} onClick={() => void exportFleetExcel()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 px-4 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"><Download size={16} />{excelBusy === "export" ? "กำลังเตรียมไฟล์…" : "1. ดาวน์โหลด Excel"}</button>
              <button type="button" disabled={Boolean(excelBusy) || !activeWarehouse} onClick={() => excelInputRef.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 px-4 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"><Upload size={16} />{excelBusy === "import" ? "กำลังบันทึก…" : "2. อัปโหลดไฟล์ที่แก้แล้ว"}</button> */}
            </div>}
          </div>
          {showExcelTools && excelResult && <section aria-label="ผลการทำงาน Excel" className="border-b border-slate-100 bg-white px-4 py-3 text-xs">
            <div className="flex items-start justify-between gap-3">
              <p role="status" className="font-semibold text-slate-800">{excelResult.summary}</p>
              <button type="button" aria-label="ปิดผลการทำงาน Excel" onClick={() => setExcelResult(null)}><X size={16} /></button>
            </div>
            {excelResult.issues.length > 0 && <ul className="mt-2 max-h-40 list-inside list-disc space-y-1 overflow-auto text-amber-800">
              {excelResult.issues.map((issue, index) => <li key={index}>{issue}</li>)}
            </ul>}
          </section>}
          {pagination.total_documents == null && <p className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-[11px] leading-5 text-amber-800">API ปัจจุบันแบ่งหน้าตามรถ จึงรวมเอกสารเฉพาะรถที่อยู่ในหน้านี้ หากต้องการให้รถของเอกสารเดียวกันอยู่ด้วยกันครบทุกคัน ต้องปรับ API ให้แบ่งหน้าตามเลขเอกสาร</p>}
          {visibleRequests.some((vehicle) => vehicle.matches_filters === false) && <p className="border-b border-blue-100 bg-blue-50 px-4 py-2 text-[11px] leading-5 text-blue-700">แสดงรถครบทุกคันของเอกสารที่ตรงเงื่อนไข จึงอาจมีรถบางคันที่ไม่ตรงตัวกรองอยู่ในเอกสารเดียวกัน</p>}
          <div className="bg-blue-50 px-3 py-1.5 text-[11px] text-blue-500 sm:hidden">เลื่อนซ้าย–ขวาเพื่อดูข้อมูลทั้งหมด →</div>
          <div className="fleet-table-scroll" style={{ maxHeight: "70vh", minHeight: 360, width: "100%", overflow: "auto" }}>
            <table className="fleet-document-table border-separate border-spacing-0 text-left text-xs" style={{ tableLayout: "fixed", width: 2420, minWidth: 2420, borderSpacing: 0 }}>
              <colgroup>{[60, 240, 90, 100, 210, 140, 230, 240, 300, 160, 140, 290, 220].map((width, index) => <col key={index} style={{ width }} />)}</colgroup>
              <thead className="sticky top-0 z-20"><tr className="text-[11px] font-semibold text-white">
                {["ลำดับ", "เลขที่เอกสาร", "DC Type", "DC", "ประเภทคำขอ", "ประเภทรถ", "Vendor (ผู้ให้บริการ)", "ทดแทนทะเบียนเก่า", "ข้อมูลรถคันใหม่", "วันที่ใช้งาน - วันที่สิ้นสุด", "ผู้ขอ", "สถานะ", "รายละเอียด"].map((column, index) => <th key={column} className={`whitespace-nowrap bg-blue-800 px-3 py-3 ${index === 0 ? "sticky left-0 z-30 text-center" : ""}`}>{index === 1 ? <button type="button" onClick={() => setDocumentSort((sort) => sort === "asc" ? "desc" : "asc")} className="inline-flex items-center gap-2" title="เรียงเลขเอกสารภายในหน้าปัจจุบัน">{column}{documentSort === "asc" ? <ArrowUp size={13} /> : documentSort === "desc" ? <ArrowDown size={13} /> : <ArrowUpDown size={13} />}</button> : column}</th>)}
              </tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={13} className="py-16 text-center text-slate-400"><RefreshCw size={24} className="mx-auto mb-3 animate-spin text-blue-500" />กำลังโหลดข้อมูล...</td></tr> : !groupedDocuments.length ? <tr><td colSpan={13} className="py-16 text-center text-slate-400"><Search size={28} className="mx-auto mb-3" />ไม่พบข้อมูลตามเงื่อนไขนี้</td></tr> : sortedDates.map((date) => <Fragment key={date}>
                  <tr><td colSpan={13} className="border-b border-slate-100 bg-blue-50 px-4 py-2"><div className="flex items-center gap-2 text-[11px] font-semibold text-blue-600"><CalendarDays size={13} />วันที่ขอ: {formatThaiDate(date)}<span className="text-slate-400">· {groupedByRequestDate[date].length} เอกสาร / {groupedByRequestDate[date].reduce((sum, document) => sum + document.vehicles.length, 0)} คันในเอกสาร</span></div></td></tr>
                  {groupedByRequestDate[date].map((document) => {
                    const { vehicles } = document;
                    return <tr key={document.key} className="group bg-white hover:bg-blue-50/20 [&>td]:border-b [&>td]:border-slate-100 [&>td]:px-3 [&>td]:py-3 [&>td]:align-top">
                      <td className="sticky left-0 z-10 bg-white text-center group-hover:bg-blue-50"><span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-1 text-[11px] font-semibold text-slate-500">{documentRowNumbers.get(document.key)}</span></td>
                      <td className="whitespace-nowrap"><p className="font-semibold text-slate-800">{document.running_doc || "ไม่ระบุเลขเอกสาร"}</p><span className="mt-2 inline-flex rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">{vehicles.length} คันในเอกสาร</span><div className="mt-2 space-y-1 text-[11px] text-slate-400">{uniqueValues(vehicles, (v) => normalizeDateKey(v.request_date || v.date)).map((value) => <p key={value}>ขอ: {formatThaiDate(value)}</p>)}</div></td>
                      <td><DocumentValues vehicles={vehicles} getValue={(v) => v.dc_type} /></td>
                      <td><DocumentValues vehicles={vehicles} getValue={(v) => v.dc_code} /></td>
                      <td className="min-w-[170px]"><DocumentValues vehicles={vehicles} getValue={(v) => v.fleet_type} /></td>
                      <td><VehicleBlocks vehicles={vehicles} groupBy={(v) => textValue(v.new_truck_type || v.fleet_truck_type)}>{(v) => <p className="font-semibold">{v.new_truck_type || v.fleet_truck_type || "-"}</p>}</VehicleBlocks></td>
                      <td><VehicleBlocks vehicles={vehicles} groupBy={(v) => textValue(v.new_vendor_name)}>{(v) => <p className="font-semibold">{v.new_vendor_name || "-"}</p>}</VehicleBlocks></td>
                      <td>{documentLicenses(vehicles).length ? <ul style={{ margin: 0, paddingLeft: 16, listStyleType: "disc" }}>
                        {documentLicenses(vehicles).map((license) => <li key={license} style={{ marginBottom: 6, fontSize: 11, fontWeight: 600 }}>{license}</li>)}
                      </ul> : <span className="text-slate-400">-</span>}</td>
                      <td><VehicleBlocks vehicles={vehicles} groupBy={displayVehicleFields}>{(v) => {
                        const fields = displayVehicleFields(v);
                        return <div style={{ display: "grid", gridTemplateColumns: "70px minmax(0, 1fr)", columnGap: 8, rowGap: 5, fontSize: 11, lineHeight: "18px", width: "100%" }}>{fields.map(([label, value]) => <Fragment key={label}><span className="font-semibold text-slate-400">{label}</span><span className={`break-all font-semibold ${textValue(value) ? "text-slate-700" : "text-slate-400"}`}>{textValue(value) || "ไม่มีข้อมูล"}</span></Fragment>)}</div>;
                      }}</VehicleBlocks></td>
                      <td><VehicleBlocks vehicles={vehicles} groupBy={(v) => [normalizeDateKey(v.usage_date), v.usage_end_date?.trim() ? normalizeDateKey(v.usage_end_date) : "", normalizeStatus(v.status) === "cancel"]}>{(v) => { const remaining = remainingUsage(v.usage_date); return <><p className="whitespace-nowrap font-semibold">{formatThaiDate(v.usage_date)}{v.usage_end_date?.trim() ? ` - ${formatThaiDate(v.usage_end_date)}` : ""}</p>{normalizeStatus(v.status) !== "cancel" && <p className={`mt-1 whitespace-nowrap text-[11px] ${remaining.className}`}>{remaining.label}</p>}</>; }}</VehicleBlocks></td>
                      <td><DocumentValues vehicles={vehicles} getValue={(v) => v.request_by} /></td>
                      <td>{(() => { const reference = assessmentReference(vehicles); return reference ? <div className="rounded-xl border border-blue-100 bg-blue-50 p-3"><p className="text-[11px] font-semibold leading-5 text-blue-700">{getProcessStatus(reference)}</p><div className="mt-2 space-y-1 border-t border-blue-100 pt-2 text-[11px] text-slate-600">
                        <p>วันที่เริ่ม: {reference.latest_process_str_date ? formatThaiDate(reference.latest_process_str_date) : "-"}</p>
                        <p>วันที่สิ้นสุด: {reference.latest_process_end_date ? formatThaiDate(reference.latest_process_end_date) : "-"}</p>
                      </div></div> : <span className="text-amber-600">ไม่พบข้อมูลรถอ้างอิง</span>; })()}</td>
                      <td><button type="button" onClick={() => handleOpenDocument(document)} className="inline-flex h-9 min-w-[110px] items-center justify-center rounded-xl bg-blue-700 px-3 text-[11px] font-semibold text-white hover:bg-blue-800">ประเมิน</button></td>
                    </tr>;
                  })}
                </Fragment>)}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><span>แสดง</span><select className="h-9 rounded-lg border border-slate-200 px-2" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setCurrentPage(1); }}>{[20, 25, 50, 100].map((size) => <option key={size} value={size}>{size} {pagination.total_documents == null ? "คัน / หน้า" : "เอกสาร / หน้า"}</option>)}</select><span>ทั้งหมด {pagination.total_documents == null ? `${formatNumber(pagination.total_vehicles)} คัน` : `${formatNumber(pagination.total_documents)} เอกสาร`}</span></div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600"><button type="button" disabled={loading || currentPage <= 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} className="h-9 rounded-lg border border-slate-200 px-3 disabled:opacity-40">ก่อนหน้า</button><span>หน้า</span><select aria-label="เลือกหน้า" value={currentPage} disabled={loading} onChange={(event) => setCurrentPage(Number(event.target.value))} className="h-9 rounded-lg border border-slate-200 px-2">{Array.from({ length: Math.max(pagination.total_pages, currentPage) }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select><span>/ {pagination.total_pages}</span><button type="button" disabled={loading || currentPage >= pagination.total_pages} onClick={() => setCurrentPage((page) => Math.min(pagination.total_pages, page + 1))} className="h-9 rounded-lg bg-blue-600 px-3 text-white disabled:opacity-40">ถัดไป</button></div>
          </div>
        </div>
        <style jsx>{`
          .fleet-table-scroll { overscroll-behavior-x: contain; }
          :global(table.fleet-document-table) { display: table !important; table-layout: fixed !important; width: 2420px !important; min-width: 2420px !important; max-width: none !important; }
          :global(.fleet-document-table thead) { display: table-header-group !important; }
          :global(.fleet-document-table tbody) { display: table-row-group !important; }
          :global(.fleet-document-table tr) { display: table-row !important; }
          :global(.fleet-document-table th), :global(.fleet-document-table td) { display: table-cell !important; box-sizing: border-box; padding: 12px !important; vertical-align: top !important; text-align: left; }
          :global(.fleet-document-table td) { white-space: normal !important; overflow-wrap: break-word; line-height: 20px; border-bottom: 1px solid #f1f5f9; }
          :global(.fleet-document-table th) { white-space: nowrap; background: #1e40af; color: white; }
          :global(.fleet-document-table td p) { margin-top: 0; }
          main :global(button:focus-visible), main :global(select:focus-visible), main :global(input:focus-visible) { outline: 2px solid #2563eb; outline-offset: 3px; }
          @media (prefers-reduced-motion: reduce) { main :global(*) { transition: none !important; animation: none !important; } }
        `}</style>
      </main>

      {portalTarget && activeProcessCalendar && createPortal(
        <div className="fixed inset-0 z-[100002]"
          onClick={(event) => { if (event.target === event.currentTarget) setActiveProcessCalendar(null); }}
          onKeyDown={(event) => { if (event.key === "Escape") setActiveProcessCalendar(null); }}>
          <section style={processCalendarPosition} role="dialog" aria-modal="true" aria-labelledby="process-calendar-title"
            className="fixed z-[100002] !w-[330px] !max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-32px)] overflow-x-auto overflow-y-auto rounded-2xl border border-blue-100 bg-white text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.22)] [&_.rdrCalendarWrapper]:w-full [&_.rdrMonth]:w-full [&_.rdrMonth]:px-2 sm:[&_.rdrMonth]:px-3">
            <div className="flex items-center justify-between bg-blue-50 px-4 py-2.5">
              <p id="process-calendar-title" className="text-xs font-semibold text-slate-700">{activeProcessCalendar === "from" ? "จากวันที่" : "ถึงวันที่"} · วันที่เริ่มขั้นตอน</p>
              <button type="button" autoFocus aria-label="ปิดปฏิทิน" onClick={() => setActiveProcessCalendar(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
            </div>
            <Calendar className="!w-full !max-w-[330px] !text-xs [&_.rdrMonth]:!box-border [&_.rdrMonth]:!w-full [&_.rdrMonth]:!px-2.5 [&_.rdrMonth]:!pb-2 [&_.rdrMonths]:!w-full [&_.rdrMonthAndYearWrapper]:!h-12 [&_.rdrMonthAndYearWrapper]:!pt-0 [&_.rdrDays]:!w-full [&_.rdrWeekDays]:!w-full [&_.rdrDay]:!h-[34px]" locale={th} color="#2563eb"
              date={(() => { const value = activeProcessCalendar === "from" ? processDateFrom : processDateTo; return value ? new Date(`${value}T00:00:00`) : new Date(); })()}
              minDate={activeProcessCalendar === "to" && processDateFrom ? new Date(`${processDateFrom}T00:00:00`) : undefined}
              maxDate={activeProcessCalendar === "from" && processDateTo ? new Date(`${processDateTo}T00:00:00`) : undefined}
              onChange={(date: Date) => { if (activeProcessCalendar === "from") setProcessDateFrom(dateKey(date)); else setProcessDateTo(dateKey(date)); setProcessDateField("str_date"); setCurrentPage(1); setActiveProcessCalendar(null); }} />
            <div className="border-t border-slate-100 px-4 py-2 text-right"><button type="button" className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100" onClick={() => { if (activeProcessCalendar === "from") setProcessDateFrom(""); else setProcessDateTo(""); setCurrentPage(1); setActiveProcessCalendar(null); }}>ล้างวันที่</button></div>
          </section>
        </div>, portalTarget)}

      {portalTarget && showRequestDatePicker && createPortal(<div ref={requestDatePickerRef} className="fixed z-[100001] max-h-[calc(100dvh-32px)] w-[calc(100vw-2rem)] max-w-[330px] overflow-auto rounded-2xl border border-blue-100 bg-white shadow-2xl [&_.rdrCalendarWrapper]:w-full [&_.rdrMonth]:w-full [&_.rdrMonth]:px-2" style={requestDatePickerPosition}>
        <div className="flex items-center justify-between bg-blue-50 px-4 py-3 text-xs font-semibold text-blue-700"><span>เลือกช่วงวันที่ขอ</span><button type="button" onClick={clearDates}>ล้าง</button></div>
        {firstRequestDate && lastRequestDate && requestDateOptions?.years.length ? (
          <DateRange
            locale={th}
            editableDateInputs={false}
            moveRangeOnFirstSelection={false}
            ranges={hasRequestDateRange ? requestDateRange : [{ key: "selection" }]}
            shownDate={lastRequestDate}
            minDate={firstRequestDate}
            maxDate={lastRequestDate}
            navigatorRenderer={(focusedDate, changeShownDate) => {
              const year = focusedDate.getFullYear();
              const month = focusedDate.getMonth();
              const firstMonth = year === firstRequestDate.getFullYear() ? firstRequestDate.getMonth() : 0;
              const lastMonth = year === lastRequestDate.getFullYear() ? lastRequestDate.getMonth() : 11;
              return (
                <div className="flex justify-center gap-2 px-3 py-2 text-xs">
                  <select aria-label="เลือกเดือน" className="rounded-lg border border-slate-200 px-2 py-1"
                    value={month} onChange={(event) => changeShownDate(Number(event.target.value) - month, "monthOffset")}>
                    {Array.from({ length: lastMonth - firstMonth + 1 }, (_, offset) => {
                      const value = firstMonth + offset;
                      return <option key={value} value={value}>{new Date(year, value, 1).toLocaleString("th-TH", { month: "long" })}</option>;
                    })}
                  </select>
                  <select aria-label="เลือกปี" className="rounded-lg border border-slate-200 px-2 py-1"
                    value={year} onChange={(event) => {
                      const nextYear = Number(event.target.value);
                      const minMonth = nextYear === firstRequestDate.getFullYear() ? firstRequestDate.getMonth() : 0;
                      const maxMonth = nextYear === lastRequestDate.getFullYear() ? lastRequestDate.getMonth() : 11;
                      const nextMonth = Math.min(maxMonth, Math.max(minMonth, month));
                      changeShownDate((nextYear - year) * 12 + nextMonth - month, "monthOffset");
                    }}>
                    {requestDateOptions.years.map((value) => <option key={value} value={value}>{value}</option>)}
                  </select>
                </div>
              );
            }}
            onChange={(item: RangeKeyDict) => {
              const { startDate, endDate } = item.selection || {};
              if (!startDate || !endDate) return;
              setRequestDateRange([{ startDate, endDate, key: "selection" }]);
              setHasRequestDateRange(true);
              setCurrentPage(1);
            }}
            showDateDisplay={false}
            showPreview={false}
            rangeColors={["#2563eb"]}
          />
        ) : (
          <p className="px-4 py-3 text-xs text-slate-500">{loading ? "กำลังโหลดช่วงวันที่…" : requestDateOptions ? "ไม่มีข้อมูลวันที่ขอในกลุ่มนี้" : "โหลดช่วงวันที่ไม่ได้ กรุณารีเฟรช"}</p>
        )}
        <div className="flex items-center justify-between gap-2 px-4 py-3"><span className="text-[10px] text-blue-600">{rangeLabel}</span><button type="button" onClick={() => setShowRequestDatePicker(false)} className="rounded-lg bg-blue-600 px-3 py-2 text-[11px] text-white">เสร็จสิ้น</button></div>
      </div>, portalTarget)}

      {portalTarget && createPortal(<div style={{ position: "relative", zIndex: 100000 }}>
        <ExportTrackFleet open={openExportModal} onClose={() => setOpenExportModal(false)} requests={visibleRequests.map((item) => ({ ...item, id: item.id == null || item.id === "" ? null : Number.isSafeInteger(Number(item.id)) ? Number(item.id) : null }))} dcLabel={selectedDcLabel} exportApiUrl={exportApiUrl} />
        <FlowAssessmentModal documentNo={selectedDocumentNo} open={openDetailModal} requestId={selectedRequest?.request_id ?? null} vehicleNo={selectedRequest?.unit_code || selectedRequest?.warehouse_vehicle_no || selectedRequest?.vehicle_no || null} documentMode referenceVehicleNo={selectedRequest?.warehouse_vehicle_no ?? selectedRequest?.vehicle_info?.vehicle_no ?? null} replacedOldLicenses={selectedDocumentLicenses} onClose={handleCloseDetail} />
      </div>, portalTarget)}

    </div>
  );
}

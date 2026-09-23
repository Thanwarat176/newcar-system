"use client";

import NewVehicleRequestModal from "./components/NewVehicleRequestModal";
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
  Download,
  Eraser,
  Eye,
  Filter,
  PencilLine,
  Search,
  SlidersHorizontal,
  Truck,
  Warehouse,
  X,
} from "lucide-react";
import ExportRequestModal from "./components/ExportRequestModal";

const VEHICLE_WAREHOUSE_INFO_API_URL =
  "http://192.168.158.210/api_new_truck/api/vehicle_warehouse_info.php";

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

interface FlowStepDetail {
  id: string;
  process: string;
  detail: string | null;
  process_level: string;
}

interface FlowCarDetail {
  vehicle_no: string | number;
  running_doc_vehicle_no?: string | null;
  license: string;
  province: string;
  truck_type: string;
  company_name: string;
  detail_id: string | null;
}

interface FlowTrackingDetail {
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
  running_doc_vehicle_no?: string | null;
  license: string;
  request_truck_detail_id: string | null;
}

interface FlowRequestSummary {
  usage_date?: string;
  dc_type?: string;
  dc_code?: string;
  request_by?: string;
}

interface FlowDetailData {
  request: FlowRequestSummary;
  steps: FlowStepDetail[];
  cars: FlowCarDetail[];
  flow_data: FlowTrackingDetail[];
  is_initialized: boolean;
}

interface FlowDetailApiResponse {
  status: string;
  message?: string;
  data?: FlowDetailData;
}

interface VehicleProgress {
  vehicle_no: string | number;
  running_doc_vehicle_no: string;
  license: string;
  current_step: number;
  total_steps: number;
  current_process: string;
  flow_status: "process" | "completed" | "rejected";
}

interface FetchVehicleProgressResult {
  vehicleProgress: VehicleProgress[];
  usageDate: string;
  dcType: string;
  dcCode: string;
  requestBy: string;
  totalSteps: number;
}

interface VehicleWarehouseInfo {
  id?: string | number;
  request_id?: string | number;
  vehicle_no?: string | number;
  warehouse_plan_date?: string | null;
  car_model?: string | null;
  car_brand?: string | null;
  car_chassis?: string | null;
  car_engine?: string | null;
  car_license?: string | null;
}

interface VehicleWarehouseInfoResponse {
  status?: string;
  message?: string;
  data?: VehicleWarehouseInfo | VehicleWarehouseInfo[] | null;
}

interface RequestItem {
  id: number | null;
  request_id?: number | string | null;
  running_doc: string;
  dc_type: string;
  dc_code: string;
  date: string;
  request_date?: string;
  created_at?: string;
  fleet_type: string;
  fleet_truck_type: string;
  license_replace: string[] | string;
  status_details?: string | null;

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

  vehicle_no?: string | number;
  running_doc_vehicle_no?: string;
  vehicle_license?: string;
  current_step?: number;
  total_steps?: number;
  current_process?: string;

  warehouse_plan_date?: string | null;
  car_model?: string | null;
  car_brand?: string | null;
  car_chassis?: string | null;
  car_engine?: string | null;
  car_license?: string | null;

  details?: RequestDetailItem[];

  latest_process_id?: string | number | null;
  latest_process_name?: string | null;
  latest_process_level?: string | number | null;
  latest_str_date?: string | null;
  latest_end_date?: string | null;
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
  | "fbp_pending"
  | "process"
  | "completed"
  | "rejected";

type ProcessStageFilter =
  | "all"
  | "not_started"
  | "waiting"
  | "active"
  | "completed"
  | "no_data";

type SortKey = "running_doc" | "request_date" | "usage_date";
type SortDirection = "asc" | "desc";

export default function AddFleetPage() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [summary, setSummary] = useState({
    all: {
      qty: 0,
      items: 0,
    },
    progress: {
      qty: 0,
      items: 0,
    },
    gm_pendding: {
      qty: 0,
      items: 0,
    },
    reject_by_center: {
      qty: 0,
      items: 0,
    },
    approved: {
      qty: 0,
      items: 0,
    },
  });
  const [processVehicleRows, setProcessVehicleRows] = useState<RequestItem[]>(
    [],
  );
  const [selectedDC, setSelectedDC] = useState<SelectedDC | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [openRows, setOpenRows] = useState<Record<string, boolean>>({});
  const [flowLoading, setFlowLoading] = useState<Record<string, boolean>>({});
  const [flowLoaded, setFlowLoaded] = useState<Record<string, boolean>>({});
  const [flowErrors, setFlowErrors] = useState<Record<string, string>>({});
  const [warehouseInfoLoading, setWarehouseInfoLoading] = useState<
    Record<string, boolean>
  >({});
  const [warehouseInfoErrors, setWarehouseInfoErrors] = useState<
    Record<string, string>
  >({});

  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: SortDirection;
  } | null>(null);

  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openExportModal, setOpenExportModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Filter ขั้นตอนปัจจุบันของรถใน TCAS
  // value จะผูกกับ current_process + current_step + total_steps
  const [currentProcessFilter, setCurrentProcessFilter] = useState("all");

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [searchText, setSearchText] = useState("");
  const [truckTypeSearch, setTruckTypeSearch] = useState("");
  const [dcTypeFilter, setDcTypeFilter] = useState("all");
  const [fleetTypeFilter, setFleetTypeFilter] = useState("all");
  const [truckTypeFilter, setTruckTypeFilter] = useState("all");
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

  const fetchVehicleProgress = async (
    requestId: string | number,
  ): Promise<FetchVehicleProgressResult> => {
    const emptyResult: FetchVehicleProgressResult = {
      vehicleProgress: [],
      usageDate: "",
      dcType: "",
      dcCode: "",
      requestBy: "",
      totalSteps: 0,
    };

    try {
      const response = await fetch(
        `http://192.168.158.210/api_new_truck/api/flow_data_get.php?request_id=${encodeURIComponent(
          String(requestId),
        )}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(
          `โหลดข้อมูล Flow ของ Request ID ${requestId} ไม่สำเร็จ (${response.status})`,
        );
      }

      const result = (await response.json()) as FlowDetailApiResponse;

      if (result.status !== "success" || !result.data) {
        throw new Error(
          result.message || "Flow API ไม่ได้ส่งข้อมูลรายละเอียดกลับมา",
        );
      }

      const {
        request,
        steps = [],
        cars = [],
        flow_data: flowData = [],
      } = result.data;

      const totalSteps = steps.length;
      const sortedSteps = [...steps].sort(
        (a, b) => Number(a.process_level) - Number(b.process_level),
      );

      const processStepMap = new Map<string, FlowStepDetail>(
        steps.map((step) => [String(step.id), step]),
      );

      const processLevelMap = new Map<string, FlowStepDetail>(
        steps.map((step) => [String(step.process_level), step]),
      );

      /**
       * flow_data.process_id รองรับ 2 รูปแบบ:
       * 1) id จริงของ steps เช่น 21, 22, 23
       * 2) process_level เช่น 1, 2, 3
       *
       * ตัวอย่าง process_id = 2 จะตรงกับ process_level = 2
       */
      const resolveFlowStep = (
        flow: FlowTrackingDetail,
      ): FlowStepDetail | undefined => {
        const processId = String(flow.process_id ?? "").trim();

        // ถ้าตรงกับ steps.id จริง ให้ใช้ id จริงก่อน
        const stepById = processStepMap.get(processId);
        if (stepById) return stepById;

        // ถ้าไม่ใช่ steps.id ให้จับคู่กับ process_level โดยตรง
        const stepByLevel = processLevelMap.get(processId);
        if (stepByLevel) return stepByLevel;

        return undefined;
      };

      const getFlowProcessLevel = (flow: FlowTrackingDetail) => {
        const resolvedStep = resolveFlowStep(flow);
        const processLevel = Number(resolvedStep?.process_level);

        if (resolvedStep && !Number.isNaN(processLevel)) {
          return processLevel;
        }

        return 0;
      };

      const vehicleProgress: VehicleProgress[] = cars.map((car) => {
        const vehicleFlows = flowData.filter(
          (flow) => String(flow.vehicle_no) === String(car.vehicle_no),
        );

        const startedFlows = vehicleFlows
          .filter((flow) => Boolean(flow.str_date || flow.end_date))
          .sort((a, b) => getFlowProcessLevel(b) - getFlowProcessLevel(a));

        const activeFlow = startedFlows.find(
          (flow) => Boolean(flow.str_date) && !flow.end_date,
        );

        const latestStartedFlow = startedFlows[0];

        let currentStep = 0;
        let currentProcess = "ยังไม่เริ่มดำเนินการ";

        if (activeFlow) {
          currentStep = getFlowProcessLevel(activeFlow);

          const activeStep = resolveFlowStep(activeFlow);

          currentProcess = activeStep?.process || `ขั้นตอนที่ ${currentStep}`;
        } else if (latestStartedFlow) {
          const latestLevel = getFlowProcessLevel(latestStartedFlow);
          const latestStep = resolveFlowStep(latestStartedFlow);

          currentStep = latestLevel;
          currentProcess =
            latestStep?.process || `ขั้นตอนที่ ${latestLevel}`;
        } else if (sortedSteps.length > 0) {
          const firstStep = sortedSteps[0];
          currentStep = Number(firstStep.process_level) || 1;
          currentProcess = `รอเริ่ม: ${firstStep.process}`;
        }

        const runningDocVehicleNo =
          car.running_doc_vehicle_no ||
          vehicleFlows.find((flow) => flow.running_doc_vehicle_no)
            ?.running_doc_vehicle_no ||
          "";

        const flowStatus: VehicleProgress["flow_status"] =
          currentStep === 8
            ? "completed"
            : currentStep === 9 || currentStep === 10
              ? "rejected"
              : "process";

        return {
          vehicle_no: car.vehicle_no,
          running_doc_vehicle_no: runningDocVehicleNo,
          license: car.license || "",
          current_step: currentStep,
          total_steps: totalSteps,
          current_process: currentProcess,
          flow_status: flowStatus,
        };
      });

      return {
        vehicleProgress,
        usageDate: request.usage_date || "",
        dcType: request.dc_type || "",
        dcCode: request.dc_code || "",
        requestBy: request.request_by || "",
        totalSteps,
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "ไม่สามารถโหลดข้อมูล Flow ได้";

      console.error("fetchVehicleProgress:", message);

      throw new Error(message);
    }
  };

  const fetchVehicleWarehouseInfo = async (
    requestId: string | number,
    vehicleNo: string | number,
  ): Promise<VehicleWarehouseInfo | null> => {
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
        `vehicle_warehouse_info.php ไม่ได้ส่ง JSON กลับมา: ${responseText}`,
      );
    }

    if (!response.ok || result.status !== "success") {
      throw new Error(
        result.message ||
        `โหลดข้อมูลรถ Request ${requestId} คันที่ ${vehicleNo} ไม่สำเร็จ (${response.status})`,
      );
    }

    const responseData = result.data;

    // รองรับทั้ง data แบบ Object และ Array
    const info = Array.isArray(responseData)
      ? responseData[0] || null
      : responseData || null;

    console.log("Vehicle warehouse info:", {
      requestId,
      vehicleNo,
      url,
      result,
      info,
    });

    return info;
  };

  const loadVehicleWarehouseInfo = async (
    item: RequestItem,
    rowKey: string,
  ) => {
    if (
      item.id === null ||
      item.id === undefined ||
      item.vehicle_no === null ||
      item.vehicle_no === undefined ||
      item.vehicle_no === ""
    ) {
      setWarehouseInfoErrors((current) => ({
        ...current,
        [rowKey]: "ไม่พบ Request ID หรือหมายเลขรถ",
      }));
      return;
    }

    try {
      setWarehouseInfoLoading((current) => ({
        ...current,
        [rowKey]: true,
      }));
      setWarehouseInfoErrors((current) => ({
        ...current,
        [rowKey]: "",
      }));

      const info = await fetchVehicleWarehouseInfo(item.id, item.vehicle_no);

      if (!info) {
        throw new Error(
          `ยังไม่พบข้อมูลของ Request ${item.id} รถคันที่ ${item.vehicle_no}`,
        );
      }

      setProcessVehicleRows((current) =>
        current.map((row) => {
          const isSameRequest = String(row.id) === String(item.id);
          const isSameVehicle =
            String(row.vehicle_no) === String(item.vehicle_no);

          if (!isSameRequest || !isSameVehicle) return row;

          return {
            ...row,
            warehouse_plan_date: info.warehouse_plan_date || null,
            car_model: info.car_model || null,
            car_brand: info.car_brand || null,
            car_chassis: info.car_chassis || null,
            car_engine: info.car_engine || null,
            car_license: info.car_license || null,
          };
        }),
      );
    } catch (loadError) {
      console.error("loadVehicleWarehouseInfo error:", loadError);
      setWarehouseInfoErrors((current) => ({
        ...current,
        [rowKey]:
          loadError instanceof Error
            ? loadError.message
            : "โหลดข้อมูลรายละเอียดรถไม่สำเร็จ",
      }));
    } finally {
      setWarehouseInfoLoading((current) => ({
        ...current,
        [rowKey]: false,
      }));
    }
  };

  const loadFlowByRequestId = async (
    item: RequestItem,
    originalRowKey: string,
  ) => {
    if (item.id === null || item.id === undefined) {
      setFlowErrors((current) => ({
        ...current,
        [originalRowKey]: "ไม่พบ Request ID",
      }));
      return;
    }

    const requestKey = String(item.id);

    // ป้องกันการเรียก API ซ้ำ
    if (flowLoaded[requestKey] || flowLoading[requestKey]) {
      return;
    }

    try {
      setFlowLoading((current) => ({
        ...current,
        [requestKey]: true,
      }));

      setFlowErrors((current) => ({
        ...current,
        [requestKey]: "",
      }));

      const flowDetail = await fetchVehicleProgress(item.id);

      const requestBase: RequestItem = {
        ...item,
        usage_date: flowDetail.usageDate || item.usage_date,
        dc_type: flowDetail.dcType || item.dc_type,
        dc_code: flowDetail.dcCode || item.dc_code,
        request_by: flowDetail.requestBy || item.request_by,
      };

      // Flow API ยังไม่มีข้อมูลรถ
      if (flowDetail.vehicleProgress.length === 0) {
        setProcessVehicleRows((current) =>
          current.map((row) =>
            String(row.id) === requestKey
              ? {
                ...requestBase,
                running_doc_vehicle_no: item.running_doc,
                current_step: 0,
                total_steps: flowDetail.totalSteps || 0,
                current_process: "ยังไม่พบข้อมูลรถจาก Flow API",
              }
              : row,
          ),
        );

        setFlowLoaded((current) => ({
          ...current,
          [requestKey]: true,
        }));

        return;
      }

      const vehicleRows: RequestItem[] = flowDetail.vehicleProgress.map(
        (vehicle) => ({
          ...requestBase,
          status: vehicle.flow_status,
          vehicle_no: vehicle.vehicle_no,
          running_doc_vehicle_no:
            vehicle.running_doc_vehicle_no ||
            `${item.running_doc}_${vehicle.vehicle_no}`,
          vehicle_license: vehicle.license,
          current_step: vehicle.current_step,
          total_steps: vehicle.total_steps,
          current_process: vehicle.current_process,
          qty: 1,

          warehouse_plan_date: null,
          car_model: null,
          car_brand: null,
          car_chassis: null,
          car_engine: null,
          car_license: null,
        }),
      );

      // แทนแถว Request เดิมด้วยแถวรถที่ได้จาก Flow API
      setProcessVehicleRows((current) => {
        const nextRows: RequestItem[] = [];

        current.forEach((row) => {
          if (
            String(row.id) === requestKey &&
            (row.vehicle_no === undefined || row.vehicle_no === null)
          ) {
            nextRows.push(...vehicleRows);
          } else {
            nextRows.push(row);
          }
        });

        return nextRows;
      });

      setFlowLoaded((current) => ({
        ...current,
        [requestKey]: true,
      }));

      // เปิดรายละเอียดรถคันแรกหลังโหลดเสร็จ
      const firstVehicle = vehicleRows[0];

      if (
        firstVehicle.vehicle_no !== undefined &&
        firstVehicle.vehicle_no !== null
      ) {
        const firstRowKey = `${requestKey}-${firstVehicle.vehicle_no}`;

        setOpenRows((current) => ({
          ...current,
          [originalRowKey]: false,
          [firstRowKey]: true,
        }));

        await loadVehicleWarehouseInfo(firstVehicle, firstRowKey);
      }
    } catch (loadError) {
      console.error("loadFlowByRequestId error:", loadError);

      setFlowErrors((current) => ({
        ...current,
        [requestKey]:
          loadError instanceof Error
            ? loadError.message
            : "โหลดข้อมูล Flow ไม่สำเร็จ",
      }));
    } finally {
      setFlowLoading((current) => ({
        ...current,
        [requestKey]: false,
      }));
    }
  };

  const handleToggleRow = (
    item: RequestItem,
    rowKey: string,
    isOpen: boolean,
  ) => {
    setOpenRows((current) => ({
      ...current,
      [rowKey]: !isOpen,
    }));
  };

  const handleSort = (key: SortKey) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }

      return {
        key,
        direction: "asc",
      };
    });
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortConfig?.key !== key) {
      return <ArrowUpDown size={13} className="opacity-50" />;
    }

    return sortConfig.direction === "asc" ? (
      <ChevronUp size={14} />
    ) : (
      <ChevronDown size={14} />
    );
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const [requestResponse, flowSummaryResponse] = await Promise.all([
        fetch(
          "http://192.168.158.210/api_new_truck/api/request_track_fleet.php",
          {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
          },
        ),
        fetch(
          "http://192.168.158.210/api_new_truck/api/flow_data_get.php",
          {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
          },
        ),
      ]);

      if (!requestResponse.ok) {
        throw new Error(
          `ไม่สามารถดึงข้อมูลคำขอได้ (${requestResponse.status})`,
        );
      }

      if (!flowSummaryResponse.ok) {
        throw new Error(
          `ไม่สามารถดึงข้อมูลขั้นตอนล่าสุดได้ (${flowSummaryResponse.status})`,
        );
      }

      const requestJson = await requestResponse.json();
      const flowSummaryJson = await flowSummaryResponse.json();

      const requestList: RequestItem[] = Array.isArray(requestJson)
        ? requestJson
        : Array.isArray(requestJson.data)
          ? requestJson.data
          : Array.isArray(requestJson.result)
            ? requestJson.result
            : [];

      const flowSummaryList: RequestItem[] = Array.isArray(flowSummaryJson)
        ? flowSummaryJson
        : Array.isArray(flowSummaryJson.data)
          ? flowSummaryJson.data
          : Array.isArray(flowSummaryJson.result)
            ? flowSummaryJson.result
            : [];

      const requestMap = new Map(
        requestList.map((item) => [String(item.id), item]),
      );

      const flowSummaryMap = new Map(
        flowSummaryList.map((item) => [String(item.id), item]),
      );

      const allRequestIds = new Set([
        ...requestMap.keys(),
        ...flowSummaryMap.keys(),
      ]);

      const mergedList: RequestItem[] = Array.from(allRequestIds).map(
        (requestId) => {
          const requestItem = requestMap.get(requestId);
          const flowSummaryItem = flowSummaryMap.get(requestId);

          const rawId =
            flowSummaryItem?.id ??
            requestItem?.id ??
            requestId;

          const numericId = Number(rawId);

          return {
            ...(requestItem || {}),
            ...(flowSummaryItem || {}),

            id:
              Number.isFinite(numericId) && numericId > 0
                ? numericId
                : null,

            running_doc:
              flowSummaryItem?.running_doc ||
              requestItem?.running_doc ||
              "",

            dc_type:
              flowSummaryItem?.dc_type ||
              requestItem?.dc_type ||
              "",

            dc_code:
              flowSummaryItem?.dc_code ||
              requestItem?.dc_code ||
              "",

            date:
              flowSummaryItem?.date ||
              requestItem?.date ||
              "",

            fleet_type:
              flowSummaryItem?.fleet_type ||
              requestItem?.fleet_type ||
              "",

            fleet_truck_type:
              flowSummaryItem?.fleet_truck_type ||
              requestItem?.fleet_truck_type ||
              "",

            license_replace:
              requestItem?.license_replace ||
              flowSummaryItem?.license_replace ||
              "",

            status_details:
              requestItem?.status_details ??
              flowSummaryItem?.status_details ??
              null,

            qty: Math.max(
              Number(
                requestItem?.qty ??
                flowSummaryItem?.qty ??
                0,
              ) || 0,
              0,
            ),

            approved_qty: (() => {
              const rawVal = Number(
                flowSummaryItem?.approved_qty ??
                requestItem?.approved_qty ??
                0,
              );
              return Number.isFinite(rawVal) && rawVal > 0 && rawVal <= 100 ? Math.floor(rawVal) : 0;
            })(),

            usage_date:
              flowSummaryItem?.usage_date ||
              requestItem?.usage_date ||
              "",

            workload:
              flowSummaryItem?.workload ??
              requestItem?.workload ??
              0,

            truckturn:
              flowSummaryItem?.truckturn ??
              requestItem?.truckturn ??
              0,

            status:
              flowSummaryItem?.status ||
              requestItem?.status ||
              "",

            request_by:
              flowSummaryItem?.request_by ||
              requestItem?.request_by ||
              "",

            remark:
              flowSummaryItem?.remark ||
              requestItem?.remark ||
              "",

            latest_process_id:
              flowSummaryItem?.latest_process_id ?? null,

            latest_process_name:
              flowSummaryItem?.latest_process_name ?? null,

            latest_process_level:
              flowSummaryItem?.latest_process_level ?? null,

            latest_str_date:
              flowSummaryItem?.latest_str_date ?? null,

            latest_end_date:
              flowSummaryItem?.latest_end_date ?? null,
          };
        },
      );

      const classifiedList: RequestItem[] = mergedList.map((item) => {
        const backendStatus = String(item.status || "").trim().toLowerCase();
        const fleetType = String(item.fleet_type || "").trim();
        const statusDetails = String(item.status_details || "").trim();

        const levelFromStatusDetails = Number(
          statusDetails.match(/^(\d+)\s*\./)?.[1],
        );

        const latestLevel = Number(item.latest_process_level);

        const currentLevel = Number.isFinite(latestLevel) && latestLevel > 0
          ? latestLevel
          : Number.isFinite(levelFromStatusDetails)
            ? levelFromStatusDetails
            : 0;

        const currentProcess =
          String(item.latest_process_name || "").trim() ||
          statusDetails.replace(/^\d+\s*[.:]\s*/, "").trim() ||
          "ยังไม่เริ่มดำเนินการ";

        let nextStatus = item.status;

        if (currentLevel >= 1 && currentLevel <= 7) {
          nextStatus = "process";
        } else if (currentLevel === 8) {
          nextStatus = "completed";
        } else if (currentLevel === 9 || currentLevel === 10) {
          nextStatus = "rejected";
        }

        // รถเสริมถือว่าเสร็จสิ้นทันที เมื่อ Backend ส่งสถานะ progress
        if (backendStatus === "progress" && fleetType === "รถเสริม") {
          nextStatus = "completed";
        }

        return {
          ...item,
          status: nextStatus,
          current_step: currentLevel,
          total_steps: 8,
          current_process: currentProcess,
        };
      });

      setRequests(classifiedList);

      const processRequests = classifiedList.filter((item) => {
        const normalizedStatus = normalizeStatus(item.status);

        return (
          normalizedStatus === "process" ||
          normalizedStatus === "completed"
        );
      });

      setProcessVehicleRows(
        processRequests.map((item) => ({
          ...item,
          vehicle_no: undefined,
          running_doc_vehicle_no: item.running_doc,
          vehicle_license: "",
        })),
      );

      setOpenRows({});
      setFlowLoaded({});
      setFlowErrors({});
    } catch (err) {
      console.error(err);
      setRequests([]);
      setProcessVehicleRows([]);
      setError(
        err instanceof Error
          ? err.message
          : "เกิดข้อผิดพลาดในการดึงข้อมูลจาก API",
      );
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
      formatDateToKey(endDate),
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

    if (value === "gm_pending" || value === "gm กำลังอนุมัติ") {
      return "gm_pending";
    }

    if (
      value === "fbp_pending" ||
      value === "กำลังประเมินกองรถ (fbp)"
    ) {
      return "fbp_pending";
    }

    if (
      value === "reject_by_gm" ||
      value === "gm ไม่อนุมัติ"
    ) {
      return "reject_by_gm";
    }

    if (
      value === "progress" ||
      value === "รอดำเนินการตามกระบวนการ (tcas)"
    ) {
      return "progress";
    }

    return value;
  };

  const formatStatusText = (status?: string) => {
    const rawValue = String(status || "")
      .trim()
      .toLowerCase();
    const value = normalizeStatus(status);

    if (value === "gm_pending") return "รอ GM อนุมัติ";
    if (value === "fbp_pending") return "กำลังประเมินกองรถ (FBP)";
    if (value === "process") return "ดำเนินการตามกระบวนการ (TCAS)";

    if (
      rawValue === "reject_gm" ||
      rawValue === "reject_by_gm" ||
      rawValue === "rejected_by_gm" ||
      rawValue === "gm_rejected" ||
      rawValue === "9. ยกเลิกหนังสือ" ||
      rawValue === "rejected_by_gm"
    ) {
      return "GM ไม่อนุมัติ";
    }

    if (
      rawValue === "reject_by_fbp" ||
      rawValue === "fbp_rejected" ||
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

    if (value === "fbp_pending") {
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

  const getStatusVisual = (status?: string) => {
    const rawValue = String(status || "")
      .trim()
      .toLowerCase();

    const value = normalizeStatus(status);

    // FBP กำลังพิจารณา
    // normalizeStatus("fbp_pending") จะได้ fbp_pending
    if (rawValue === "fbp_pending" || value === "fbp_pending") {
      return {
        dotClass: "bg-amber-500",
        textClass: "text-amber-700",
        hint: "รอการพิจารณา",
      };
    }

    // FBP ไม่อนุมัติ
    if (
      rawValue === "reject_by_fbp" ||
      rawValue === "fbp_rejected" ||
      rawValue === "reject_center" ||
      rawValue === "reject_by_center" ||
      rawValue === "rejected_by_center" ||
      rawValue === "center_rejected"
    ) {
      return {
        dotClass: "bg-rose-500",
        textClass: "text-rose-700",
        hint: "ไม่ผ่านการประเมิน",
      };
    }

    // อนุมัติ / เสร็จสิ้น
    // normalizeStatus("approved") จะได้ completed
    if (rawValue === "approved" || value === "completed") {
      return {
        dotClass: "bg-emerald-500",
        textClass: "text-emerald-700",
        hint: "ผ่านการประเมิน",
      };
    }

    // รอ GM
    if (value === "gm_pending") {
      return {
        dotClass: "bg-purple-500",
        textClass: "text-purple-700",
        hint: "รอ GM พิจารณา",
      };
    }

    // อยู่ระหว่าง TCAS
    if (value === "process") {
      const backendStatus = String(status || "")
        .trim()
        .toLowerCase();

      const backendStatusText: Record<string, string> = {
        progress: "กำลังดำเนินการ",
        process: "ดำเนินการตามกระบวนการ",
        confirm_request: "ยืนยันคำขอแล้ว",
        in_progress: "อยู่ระหว่างดำเนินการ",
      };

      return {
        dotClass: "bg-blue-500",
        textClass: "text-blue-700",
        hint: backendStatusText[backendStatus] || status || "กำลังดำเนินการ",
      };
    }

    // สถานะไม่อนุมัติอื่น ๆ
    if (value === "rejected") {
      return {
        dotClass: "bg-rose-500",
        textClass: "text-rose-700",
        hint: "ไม่อนุมัติ",
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

  const getProcessStage = (
    item: RequestItem,
  ): Exclude<ProcessStageFilter, "all"> => {
    const currentProcess = String(item.current_process || "")
      .trim()
      .toLowerCase();

    const hasVehicleNo =
      item.vehicle_no !== null &&
      item.vehicle_no !== undefined &&
      item.vehicle_no !== "";

    if (
      !hasVehicleNo ||
      !currentProcess ||
      currentProcess.includes("ยังไม่พบข้อมูลขั้นตอน") ||
      currentProcess.includes("ยังไม่พบข้อมูลรถ")
    ) {
      return "no_data";
    }

    if (
      currentProcess.includes("ดำเนินการครบทุกขั้นตอน") ||
      currentProcess.includes("เสร็จสิ้น") ||
      currentProcess.includes("completed")
    ) {
      return "completed";
    }

    if (
      currentProcess.includes("ยังไม่เริ่มดำเนินการ") ||
      currentProcess.startsWith("รอเริ่ม")
    ) {
      return "not_started";
    }

    if (
      currentProcess.startsWith("รอดำเนินการ") ||
      currentProcess.includes("รอดำเนินการ:")
    ) {
      return "waiting";
    }

    return "active";
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

  const warehouseFilteredProcessRows = useMemo(() => {
    const userWarehouse = String(
      userInfo?.warehouse ||
      userInfo?.WAREHOUSE ||
      userInfo?.team ||
      userInfo?.TEAM ||
      "",
    )
      .trim()
      .toUpperCase();

    const selectedCode = String(selectedDC?.DC_CODE || "")
      .trim()
      .toUpperCase();

    if (userWarehouse === "CENTER" || selectedCode === "CENTER") {
      return processVehicleRows;
    }

    if (selectedCode) {
      return processVehicleRows.filter(
        (item) =>
          String(item.dc_code || "")
            .trim()
            .toUpperCase() === selectedCode,
      );
    }

    if (userWarehouse) {
      return processVehicleRows.filter(
        (item) =>
          String(item.dc_code || "")
            .trim()
            .toUpperCase() === userWarehouse,
      );
    }

    return [];
  }, [processVehicleRows, selectedDC, userInfo]);

  const warehouseFilteredAllRows = useMemo(() => {
    // Request ที่ยังไม่เข้า TCAS ใช้ข้อมูลเดิม
    const normalRows = warehouseFilteredRequests.filter(
      (item) => {
        const normalizedStatus = normalizeStatus(item.status);
        return (
          normalizedStatus !== "process" &&
          normalizedStatus !== "completed"
        );
      },
    );

    // Request ที่เข้า TCAS ใช้ข้อมูลรายคัน ซึ่งแยกสถานะตาม process_id แล้ว
    return [...normalRows, ...warehouseFilteredProcessRows];
  }, [warehouseFilteredRequests, warehouseFilteredProcessRows]);

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
      const itemDCType = String(item.dc_type || "")
        .trim()
        .toUpperCase();

      const matchDCType =
        dcTypeFilter === "all" ||
        itemDCType === dcTypeFilter.trim().toUpperCase();

      if (!matchDCType) return;

      const dc = String(item.dc_code || "").trim();
      if (dc) uniqueDC.add(dc);
    });

    return Array.from(uniqueDC).sort();
  }, [warehouseFilteredRequests, dcTypeFilter]);

  const currentProcessOptions = useMemo(() => {
    const optionMap = new Map<
      string,
      {
        value: string;
        label: string;
        currentStep: number;
        totalSteps: number;
      }
    >();

    const optionStatus =
      statusFilter === "rejected" ? "rejected" : "process";

    warehouseFilteredProcessRows
      .filter((item) => normalizeStatus(item.status) === optionStatus)
      .forEach((item) => {
        const processText =
          String(item.current_process || "").trim() || "ยังไม่เริ่ม";

        const currentStep = Number(item.current_step ?? 0);
        const totalSteps = Number(item.total_steps ?? 0);

        const value = `${currentStep}|${totalSteps}|${processText}`;

        optionMap.set(value, {
          value,
          label: `${processText} (${currentStep}/${totalSteps})`,
          currentStep,
          totalSteps,
        });
      });

    return Array.from(optionMap.values()).sort((a, b) => {
      if (a.totalSteps !== b.totalSteps) {
        return a.totalSteps - b.totalSteps;
      }

      if (a.currentStep !== b.currentStep) {
        return a.currentStep - b.currentStep;
      }

      return a.label.localeCompare(b.label, "th");
    });
  }, [warehouseFilteredProcessRows, statusFilter]);

  const truckTypeOptions = useMemo(() => {
    const uniqueTruckTypes = new Set<string>();

    warehouseFilteredRequests.forEach((item) => {
      const truckType = String(item.fleet_truck_type || "").trim();

      if (truckType) {
        uniqueTruckTypes.add(truckType);
      }
    });

    return Array.from(uniqueTruckTypes).sort();
  }, [warehouseFilteredRequests]);

  const fleetTypeOptions = useMemo(() => {
    const uniqueFleetTypes = new Set<string>();

    warehouseFilteredRequests.forEach((item) => {
      const fleetType = String(item.fleet_type || "").trim();
      if (fleetType) uniqueFleetTypes.add(fleetType);
    });

    return Array.from(uniqueFleetTypes).sort((a, b) =>
      a.localeCompare(b, "th"),
    );
  }, [warehouseFilteredRequests]);

  const filteredRequests = useMemo(() => {
    const sourceRequests = warehouseFilteredAllRows;

    return sourceRequests.filter((item) => {
      const normalizedItemStatus = normalizeStatus(item.status);

      const matchStatus =
        statusFilter === "all" || normalizedItemStatus === statusFilter;

      const itemProcessText =
        String(item.current_process || "").trim() || "ยังไม่เริ่ม";

      const itemCurrentStep = Number(item.current_step ?? 0);
      const itemTotalSteps = Number(item.total_steps ?? 0);

      const itemCurrentProcessValue = `${itemCurrentStep}|${itemTotalSteps}|${itemProcessText}`;

      // ใช้ Filter ขั้นตอนตอนดูรายการกำลังดำเนินการหรือไม่อนุมัติ
      const canFilterCurrentProcess =
        statusFilter === "process" || statusFilter === "rejected";

      const matchCurrentProcess =
        !canFilterCurrentProcess ||
        currentProcessFilter === "all" ||
        itemCurrentProcessValue === currentProcessFilter;

      const matchDCType =
        dcTypeFilter === "all" ||
        String(item.dc_type || "")
          .trim()
          .toUpperCase() === dcTypeFilter.trim().toUpperCase();

      const matchDC =
        dcFilter === "all" ||
        String(item.dc_code || "")
          .trim()
          .toUpperCase() === dcFilter.trim().toUpperCase();

      const matchFleetType =
        fleetTypeFilter === "all" ||
        String(item.fleet_type || "").trim() === fleetTypeFilter;

      const matchTruckTypeFilter =
        truckTypeFilter === "all" ||
        String(item.fleet_truck_type || "").trim() === truckTypeFilter;

      const truckTypeKeyword = truckTypeSearch.trim().toLowerCase();
      const matchTruckType =
        !truckTypeKeyword ||
        String(item.fleet_truck_type || "")
          .trim()
          .toLowerCase()
          .includes(truckTypeKeyword);

      const itemRequestDateKey = getRequestDateKey(item);
      const startDateKey = formatDateToKey(requestDateRange[0].startDate);
      const endDateKey = formatDateToKey(requestDateRange[0].endDate);

      const matchRequestDate =
        !hasRequestDateRange ||
        (itemRequestDateKey >= startDateKey &&
          itemRequestDateKey <= endDateKey);

      const licenseText = getLicenseList(item.license_replace).join(" ");
      const keyword = searchText.trim().toLowerCase();

      const matchSearch =
        !keyword ||
        [
          item.running_doc,
          item.running_doc_vehicle_no,
          item.vehicle_no,
          item.vehicle_license,
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

      return (
        matchStatus &&
        matchCurrentProcess &&
        matchFleetType &&
        matchTruckTypeFilter &&
        matchTruckType &&
        matchDCType &&
        matchDC &&
        matchRequestDate &&
        matchSearch
      );
    });
  }, [
    warehouseFilteredAllRows,
    statusFilter,
    currentProcessFilter,
    fleetTypeFilter,
    truckTypeFilter,
    truckTypeSearch,
    dcTypeFilter,
    dcFilter,
    requestDateRange,
    hasRequestDateRange,
    searchText,
  ]);

  const sortedRequests = useMemo(() => {
    if (!sortConfig) return filteredRequests;

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

  const totalPages = Math.max(
    1,
    Math.ceil(sortedRequests.length / pageSize),
  );

  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;

    return sortedRequests.slice(
      startIndex,
      startIndex + pageSize,
    );
  }, [sortedRequests, currentPage, pageSize]);

  const groupedFilteredByRequestDate = useMemo(() => {
    return paginatedRequests.reduce<Record<string, RequestItem[]>>(
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
  }, [paginatedRequests]);

  const sortedFilteredDates = useMemo(() => {
    return Object.keys(groupedFilteredByRequestDate).sort((a, b) => {
      if (a === "ไม่ระบุวันที่") return 1;
      if (b === "ไม่ระบุวันที่") return -1;

      const comparison =
        new Date(a).getTime() - new Date(b).getTime();

      if (
        sortConfig?.key === "request_date" &&
        sortConfig.direction === "desc"
      ) {
        return -comparison;
      }

      return comparison;
    });
  }, [groupedFilteredByRequestDate, sortConfig]);

  const getRequestVehicleQty = (item: RequestItem) => {
    const status = normalizeStatus(item.status);

    const requestQty = Number(item.qty || 0);
    const rawApprovedQty = Number(item.approved_qty || 0);
    const approvedQty = (rawApprovedQty > 0 && rawApprovedQty <= 100) ? rawApprovedQty : 0;

    if (status === "process") {
      // ใช้ approved_qty เมื่อมีค่ามากกว่า 0 และไม่เกิน 100 (ไม่ใช่รหัสผู้ขาย/ผู้อนุมัติ)
      // ถ้ายังเป็น 0 หรือเป็นรหัส ให้ใช้ qty ของคำขอแทน
      const quantity = approvedQty > 0 ? approvedQty : requestQty;

      return Number.isFinite(quantity) ? Math.max(Math.floor(quantity), 0) : 0;
    }

    return Number.isFinite(requestQty)
      ? Math.max(Math.floor(requestQty), 0)
      : 0;
  };

  const getVisibleVehicleQty = (item: RequestItem) => {
    if (
      item.vehicle_no !== null &&
      item.vehicle_no !== undefined &&
      item.vehicle_no !== ""
    ) {
      return 1;
    }

    return getRequestVehicleQty(item);
  };

  const statusCounts = useMemo(() => {
    const result = {
      all: { qty: 0, items: 0 },
      gmPending: { qty: 0, items: 0 },
      centerPending: { qty: 0, items: 0 },
      process: { qty: 0, items: 0 },
      completed: { qty: 0, items: 0 },
      rejected: { qty: 0, items: 0 },
    };

    const requestKeys = {
      all: new Set<string>(),
      gmPending: new Set<string>(),
      centerPending: new Set<string>(),
      process: new Set<string>(),
      completed: new Set<string>(),
      rejected: new Set<string>(),
    };

    warehouseFilteredAllRows.forEach((item, index) => {
      const status = normalizeStatus(item.status);
      const vehicleQty = getVisibleVehicleQty(item);

      // ใช้ key เดียวกันสำหรับรถทุกคันที่อยู่ภายใต้คำขอเดียวกัน
      const requestKey = String(
        item.request_id ??
        item.id ??
        item.running_doc ??
        `request-${index}`,
      );

      // ตัวเลขหลักนับจำนวนรถ ส่วน Set ใช้นับจำนวนคำขอโดยไม่ซ้ำ
      result.all.qty += vehicleQty;
      requestKeys.all.add(requestKey);

      if (status === "gm_pending") {
        result.gmPending.qty += vehicleQty;
        requestKeys.gmPending.add(requestKey);
        return;
      }

      if (status === "fbp_pending") {
        result.centerPending.qty += vehicleQty;
        requestKeys.centerPending.add(requestKey);
        return;
      }

      if (status === "process") {
        result.process.qty += vehicleQty;
        requestKeys.process.add(requestKey);
        return;
      }

      if (status === "completed") {
        result.completed.qty += vehicleQty;
        requestKeys.completed.add(requestKey);
        return;
      }

      if (status === "rejected") {
        result.rejected.qty += vehicleQty;
        requestKeys.rejected.add(requestKey);
      }
    });

    result.all.items = requestKeys.all.size;
    result.gmPending.items = requestKeys.gmPending.size;
    result.centerPending.items = requestKeys.centerPending.size;
    result.process.items = requestKeys.process.size;
    result.completed.items = requestKeys.completed.size;
    result.rejected.items = requestKeys.rejected.size;

    return result;
  }, [warehouseFilteredAllRows]);

  const filteredVehicleCount = useMemo(() => {
    return filteredRequests.reduce(
      (total, item) => total + getVisibleVehicleQty(item),
      0,
    );
  }, [filteredRequests]);

  const selectedDCLabel = useMemo(() => {
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
      fbp_pending: "กำลังประเมินกองรถ (FBP)",

      process: "อยู่ระหว่างดำเนินการ",

      reject_by_gm: "GM ไม่อนุมัติ",
      reject_by_fbp: "ส่วนกลางไม่อนุมัติ",

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

  const getDateGroupVehicleCount = (items: RequestItem[]) => {
    return items.reduce((total, item) => total + getVisibleVehicleQty(item), 0);
  };

  const exportRequests = useMemo(() => {
    // รายการที่ยังไม่เข้า TCAS ใช้ข้อมูลระดับ Request ตามเดิม
    const normalRequests = warehouseFilteredRequests.filter(
      (item) => {
        const normalizedStatus = normalizeStatus(item.status);
        return (
          normalizedStatus !== "process" &&
          normalizedStatus !== "completed"
        );
      },
    );

    // รายการ TCAS ใช้ processVehicleRows
    // ซึ่งถูกแตกเป็น 1 รถ = 1 row อยู่แล้ว
    const processRequests = warehouseFilteredProcessRows;

    return [...normalRequests, ...processRequests];
  }, [warehouseFilteredRequests, warehouseFilteredProcessRows]);

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
              <span className="truncate">รายการคำขอเพิ่มรถ</span>
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
                    : statusFilter === "fbp_pending"
                      ? "กำลังประเมินกองรถ (FBP)"
                      : statusFilter === "process"
                        ? "ดำเนินการตามกระบวนการ (TCAS)"
                        : statusFilter === "completed"
                          ? "เสร็จสิ้นกระบวนการ"
                          : "ไม่อนุมัติ"}
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
              onClick={() => setOpenCreateModal(true)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-900 via-blue-900 to-slate-800 px-4 text-sm font-black text-white shadow-lg shadow-blue-900/20 transition hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
            >
              <span className="text-base leading-none">+</span>
              สร้างคำขอ
            </button>
          </div>
        </div>

        {/* ── ERROR ── */}
        {error && (
          <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-600 shadow-[0_10px_30px_rgba(239,68,68,0.1)]">
            {error}
          </div>
        )}

        {/* ── STATUS CARDS ── */}
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {(
            [
              {
                key: "all",
                label: "ทั้งหมด",
                count: statusCounts.all.qty,
                itemCount: statusCounts.all.items,
                sub: "จำนวนรถรวมทุกสถานะ",
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
                count: statusCounts.gmPending.qty,
                itemCount: statusCounts.gmPending.items,
                sub: "จำนวนรถที่รอ GM พิจารณา",
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
                key: "fbp_pending",
                label: "รอ FBP พิจารณา",
                count: statusCounts.centerPending.qty,
                itemCount: statusCounts.centerPending.items,
                sub: "จำนวนรถที่รอ FBP พิจารณา",
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
                label: "กำลังดำเนินการ (TCAS)",
                count: statusCounts.process.qty,
                itemCount: statusCounts.process.items,
                sub: "จำนวนรถที่ได้รับการอนุมัติ",
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
                key: "completed",
                label: "เสร็จสิ้นกระบวนการ",
                count: statusCounts.completed.qty,
                itemCount: statusCounts.completed.items,
                sub: "จำนวนรถที่ส่งมอบคลังแล้ว",
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
              {
                key: "rejected",
                label: "ไม่อนุมัติ",
                count: statusCounts.rejected.qty,
                itemCount: statusCounts.rejected.items,
                sub: "จำนวนรถที่ไม่ผ่านการพิจารณา",
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
                      {count.toLocaleString("th-TH")}
                      <span className="ml-1 text-sm font-black opacity-60">คัน</span>
                    </p>

                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black ${isActive
                        ? "bg-white/15 text-white"
                        : "bg-white/80 text-slate-400 shadow-sm"
                        }`}
                    >
                      {itemCount.toLocaleString("th-TH")} รายการ
                    </span>
                  </div>

                </button>
              );
            },
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
              พบ {formatNumber(filteredVehicleCount)} คัน
            </span>
          </div>

          {/* FILTER INPUTS */}
          <div className="relative z-30 rounded-[24px] mb-3 bg-gradient-to-b from-slate-50/90 to-white px-4 pb-4 pt-4 sm:px-5">
            <div className="grid gap-3 lg:grid-cols-[repeat(16,minmax(0,1fr))]">
              {/* SEARCH */}
              <div
                className={
                  statusFilter === "process" ? "lg:col-span-2" : "lg:col-span-4"
                }
              >
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

              {/* FLEET TYPE */}
              <div className="lg:col-span-2">
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
                    onChange={(e) => setFleetTypeFilter(e.target.value)}
                    className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs font-semibold text-slate-700 shadow-sm outline-none transition hover:border-blue-200 hover:shadow-md focus:border-blue-400 focus:ring-4 focus:ring-blue-100/70"
                  >
                    <option value="all">ทุกประเภทคำขอ</option>

                    {fleetTypeOptions.map((fleetType) => (
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

              {/* TRUCK TYPE SEARCH */}
              <div className="lg:col-span-2">
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  ประเภทรถ
                </label>

                <div className="relative">
                  <Truck
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-400"
                  />

                  <select
                    value={truckTypeFilter}
                    onChange={(e) => setTruckTypeFilter(e.target.value)}
                    className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs font-semibold text-slate-700 shadow-sm outline-none transition hover:border-blue-200 hover:shadow-md focus:border-blue-400 focus:ring-4 focus:ring-blue-100/70"
                  >
                    <option value="all">ทุกประเภทรถ</option>

                    {truckTypeOptions.map((truckType) => (
                      <option key={truckType} value={truckType}>
                        {truckType}
                      </option>
                    ))}
                  </select>

                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-400">
                    ▼
                  </span>
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

              {/* CURRENT PROCESS / TCAS STEP */}
              {(statusFilter === "process" || statusFilter === "rejected") && (
                <div className="lg:col-span-3">
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    สถานะ / ขั้นตอน
                  </label>

                  <div className="relative">
                    <Filter
                      size={14}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-400"
                    />

                    <select
                      value={currentProcessFilter}
                      onChange={(e) => setCurrentProcessFilter(e.target.value)}
                      className="h-10 w-full appearance-none truncate rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-xs font-semibold text-slate-700 shadow-sm outline-none transition hover:border-blue-200 hover:shadow-md focus:border-blue-400 focus:ring-4 focus:ring-blue-100/70"
                    >
                      <option value="all">ทุกขั้นตอน</option>

                      {currentProcessOptions.map((option) => (
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
              )}

              {/* DATE */}
              <div
                className={
                  statusFilter === "process" ? "lg:col-span-2" : "lg:col-span-3"
                }
              >
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
                    setTruckTypeSearch("");
                    setFleetTypeFilter("all");
                    setTruckTypeFilter("all");
                    setDcTypeFilter("all");
                    setDcFilter("all");
                    setStatusFilter("all");
                    setCurrentProcessFilter("all");
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
                    {(statusFilter === "process"
                      ? [
                        "ลำดับ",
                        "เลขที่เอกสาร",
                        "DC Type",
                        "DC",
                        "ประเภทรถ",
                        "ประเภทคำขอ",
                        "จำนวน",
                        "วันที่ใช้งาน",
                        "ผู้ขอ",
                        "สถานะ",
                        "รายละเอียด",
                      ]
                      : [
                        "ลำดับ",
                        "เลขที่เอกสาร",
                        "DC Type",
                        "DC",
                        "ประเภทรถ",
                        "ประเภทคำขอ",
                        "ทะเบียนทดแทน",
                        statusFilter === "rejected"
                          ? "จำนวนทั้งหมด / อนุมัติ / ไม่อนุมัติ"
                          : "จำนวน",
                        "วันที่ใช้งาน",
                        "ผู้ขอ",
                        "สถานะ",
                        "รายละเอียด",
                      ]
                    ).map((col, i) => {
                      const isDocumentColumn = col === "เลขที่เอกสาร";
                      const isUsageDateColumn = col === "วันที่ใช้งาน";
                      const isSortable = isDocumentColumn || isUsageDateColumn;

                      const sortKey: SortKey | null = isDocumentColumn
                        ? "running_doc"
                        : isUsageDateColumn
                          ? "usage_date"
                          : null;

                      return (
                        <th
                          key={col}
                          onClick={() => {
                            if (sortKey) handleSort(sortKey);
                          }}
                          className={`whitespace-nowrap px-3 py-3 text-left ${isSortable
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
                      <td
                        colSpan={statusFilter === "process" ? 10 : 11}
                        className="py-12 text-center"
                      >
                        <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-4 border-blue-100 border-t-blue-500" />
                        <p className="text-xs font-medium text-slate-400">
                          กำลังโหลดข้อมูล...
                        </p>
                      </td>
                    </tr>
                  ) : filteredRequests.length === 0 ? (
                    <tr>
                      <td
                        colSpan={statusFilter === "process" ? 10 : 11}
                        className="py-12 text-center"
                      >
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
                            colSpan={statusFilter === "process" ? 10 : 11}
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
                              <span className="font-semibold text-slate-400">
                                ·{" "}
                                {formatNumber(
                                  getDateGroupVehicleCount(
                                    groupedFilteredByRequestDate[date],
                                  ),
                                )}{" "}
                                คัน
                              </span>
                            </div>
                          </td>
                        </tr>

                        {groupedFilteredByRequestDate[date].map(
                          (item, index) => {
                            const status = item.status || "pending";
                            const statusClass = getStatusClass(status);
                            const statusText = formatStatusText(status);
                            const statusVisual = getStatusVisual(status);
                            const isProcessStatus =
                              normalizeStatus(item.status) === "process";
                            const isCompletedStatus =
                              normalizeStatus(item.status) === "completed";
                            const isRejectedStatus =
                              normalizeStatus(item.status) === "rejected";
                            const hasTcasVehicleDetail =
                              (isProcessStatus || isCompletedStatus) &&
                              item.vehicle_no !== null &&
                              item.vehicle_no !== undefined;

                            // จำนวนที่ขอทั้งหมด
                            const totalQtyValue = Number(item.qty);
                            const totalQty = Number.isFinite(totalQtyValue)
                              ? Math.max(totalQtyValue, 0)
                              : 0;

                            // จำนวนที่อนุมัติ
                            const rawApprovedQtyValue = Number(item.approved_qty);
                            const approvedQtyValue = (rawApprovedQtyValue > 0 && rawApprovedQtyValue <= 100) ? rawApprovedQtyValue : 0;
                            const approvedQty = Number.isFinite(
                              approvedQtyValue,
                            )
                              ? Math.min(
                                Math.max(approvedQtyValue, 0),
                                totalQty,
                              )
                              : 0;

                            // จำนวนที่ไม่อนุมัติ = จำนวนทั้งหมด - จำนวนที่อนุมัติ
                            const rejectedQty = Math.max(
                              totalQty - approvedQty,
                              0,
                            );

                            const showRejectedQty =
                              statusFilter === "rejected" &&
                              normalizeStatus(item.status) === "rejected";

                            const rowKey =
                              hasTcasVehicleDetail
                                ? `${item.id ?? item.running_doc}-${item.vehicle_no ?? "no-vehicle"}`
                                : item.id !== null && item.id !== undefined
                                  ? String(item.id)
                                  : item.running_doc || `${date}-${index}`;

                            const isOpen = Boolean(openRows[rowKey]);

                            // สำหรับตรวจสอบสถานะโหลด Flow ของ Request ID นี้
                            const requestFlowKey =
                              item.id !== null && item.id !== undefined
                                ? String(item.id)
                                : rowKey;

                            const isFlowLoading = Boolean(flowLoading[requestFlowKey]);

                            const licenseList = getLicenseList(
                              item.license_replace,
                            );

                            const replacementTruckRows: RequestDetailItem[] =
                              Array.isArray(item.details) &&
                                item.details.length > 0
                                ? item.details.map((detail) => ({
                                  ...detail,
                                  license: String(
                                    detail.license || "",
                                  ).trim(),
                                  province: String(
                                    detail.province || "",
                                  ).trim(),
                                  truck_type: String(
                                    detail.truck_type || "",
                                  ).trim(),
                                  company_id: String(
                                    detail.company_id || "",
                                  ).trim(),
                                  company_name: String(
                                    detail.company_name || "",
                                  ).trim(),
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
                              0,
                            );

                            const normalizedFleetType = String(
                              item.fleet_type || "",
                            ).trim();

                            const hideReplacementTruckDetails =
                              normalizeStatus(item.status) === "gm_pending" &&
                              ["รถออกใหม่", "รถเสริม"].includes(
                                normalizedFleetType,
                              );

                            const showReplacementTruckDetails =
                              !hasTcasVehicleDetail &&
                              !hideReplacementTruckDetails;

                            const warehouseInfoFields = [
                              {
                                key: "warehouse_plan_date",
                                label: "แผนวันที่จะเข้าคลังได้",
                                value: item.warehouse_plan_date
                                  ? formatThaiDate(item.warehouse_plan_date)
                                  : "-",
                              },
                              {
                                key: "car_model",
                                label: "รุ่น",
                                value: item.car_model || "-",
                              },
                              {
                                key: "car_brand",
                                label: "ยี่ห้อ",
                                value: item.car_brand || "-",
                              },
                              {
                                key: "car_chassis",
                                label: "เลขที่ตัวถัง",
                                value: item.car_chassis || "-",
                              },
                              {
                                key: "car_engine",
                                label: "เลขที่เครื่อง",
                                value: item.car_engine || "-",
                              },
                              {
                                key: "car_license",
                                label: "ทะเบียนรถ",
                                value:
                                  item.car_license ||
                                  item.vehicle_license ||
                                  "-",
                              },
                            ] as const;

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
                                      {statusFilter === "process"
                                        ? item.running_doc_vehicle_no ||
                                        (item.vehicle_no !== undefined &&
                                          item.vehicle_no !== null
                                          ? `${item.running_doc}_${item.vehicle_no}`
                                          : item.running_doc || "-")
                                        : item.running_doc || "-"}
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
                                      {item.fleet_type || "-"}
                                    </p>
                                  </td>

                                  <td className="whitespace-nowrap px-3 py-3">
                                    <p className="font-bold text-slate-700">
                                      {item.fleet_truck_type || "-"}
                                    </p>
                                  </td>

                                  {statusFilter !== "process" && (
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
                                        <span className="text-slate-300">
                                          -
                                        </span>
                                      )}
                                    </td>
                                  )}

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
                                    {isProcessStatus || isCompletedStatus || isRejectedStatus ? (
                                      <div
                                        className={`min-w-[230px] rounded-xl border px-3 py-2.5 ${isRejectedStatus
                                          ? "border-red-200 bg-red-50"
                                          : isCompletedStatus
                                            ? "border-emerald-100 bg-emerald-50"
                                            : "border-blue-100 bg-blue-50"
                                          }`}
                                      >
                                        <div className="flex items-start gap-2">
                                          <span
                                            className={`mt-1 h-2 w-2 shrink-0 rounded-full ${isRejectedStatus
                                              ? "bg-red-500"
                                              : isCompletedStatus
                                                ? "bg-emerald-500"
                                                : "bg-blue-500"
                                              }`}
                                          />

                                          <div className="min-w-0">
                                            {!isRejectedStatus && (
                                              <p
                                                className={`text-[10px] font-black ${isCompletedStatus
                                                  ? "text-emerald-700"
                                                  : "text-blue-700"
                                                  }`}
                                              >
                                                ขั้นตอน{" "}
                                                {item.vehicle_no !== undefined &&
                                                  item.vehicle_no !== undefined
                                                  ? item.current_step ?? 0
                                                  : item.latest_process_level ?? 0}
                                                /8
                                              </p>
                                            )}

                                            <p
                                              className={`break-words text-[10px] font-black leading-4 ${isRejectedStatus
                                                ? "text-red-700"
                                                : "mt-0.5 text-slate-700"
                                                }`}
                                            >
                                              {item.vehicle_no !== undefined &&
                                                item.vehicle_no !== null
                                                ? item.current_process ||
                                                (isRejectedStatus
                                                  ? "ไม่ผ่านการประเมิน"
                                                  : "ยังไม่พบข้อมูลขั้นตอน")
                                                : item.latest_process_name ||
                                                (isRejectedStatus
                                                  ? "ไม่ผ่านการประเมิน"
                                                  : "ยังไม่พบข้อมูลขั้นตอน")}
                                            </p>
                                          </div>
                                        </div>

                                        {item.vehicle_no !== undefined &&
                                          item.vehicle_no !== null && (
                                            <p
                                              className={`mt-1.5 break-words border-t pt-1.5 text-[9px] font-semibold text-slate-400 ${isRejectedStatus
                                                ? "border-red-200"
                                                : isCompletedStatus
                                                  ? "border-emerald-100"
                                                  : "border-blue-100"
                                                }`}
                                            >
                                              รถคันที่ {item.vehicle_no} · ทะเบียน:{" "}
                                              {item.vehicle_license || "-"}
                                            </p>
                                          )}
                                      </div>
                                    ) : (
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
                                    )}
                                  </td>

                                  <td className="whitespace-nowrap px-3 py-3 text-right">
                                    <button
                                      type="button"
                                      disabled={isFlowLoading}
                                      onClick={() =>
                                        handleToggleRow(item, rowKey, Boolean(isOpen))
                                      }
                                      className={`inline-flex h-9 min-w-[130px] items-center justify-center gap-2 rounded-xl px-3 text-[11px] font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${isOpen
                                        ? "bg-blue-700 text-white shadow-md shadow-blue-700/20 hover:bg-blue-800"
                                        : "border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                        }`}
                                    >
                                      {isFlowLoading ? (
                                        <>
                                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-200 border-t-blue-700" />
                                          กำลังโหลด...
                                        </>
                                      ) : isOpen ? (
                                        <>
                                          <PencilLine size={14} />
                                          ซ่อน
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

                                {isOpen && (
                                  <tr className="bg-slate-50/70">
                                    <td
                                      colSpan={
                                        statusFilter === "process" ||
                                          statusFilter === "completed"
                                          ? 10
                                          : 11
                                      }
                                      className="px-3 py-2"
                                    >
                                      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                        {/* Header: แสดงข้อมูลสำคัญก่อน ไม่ใช้หัวข้อใหญ่ซ้ำหลายชั้น */}
                                        <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                          <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                              <p className="text-xs font-black text-slate-800">
                                                {hasTcasVehicleDetail
                                                  ? `รถคันที่ ${item.vehicle_no ?? "-"}`
                                                  : "รายละเอียดคำขอ"}
                                              </p>

                                              {hasTcasVehicleDetail && (
                                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700 ring-1 ring-blue-100">
                                                  {item.current_process ||
                                                    "ยังไม่เริ่ม"}{" "}
                                                  ({item.current_step ?? 0}/
                                                  {item.total_steps ?? 0})
                                                </span>
                                              )}
                                            </div>

                                            <p className="mt-1 truncate text-[10px] font-semibold text-slate-400">
                                              {hasTcasVehicleDetail
                                                ? `ทะเบียน ${item.car_license || item.vehicle_license || "-"}`
                                                : item.running_doc || "-"}
                                            </p>
                                          </div>

                                          <span
                                            className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[10px] font-black ${hasTcasVehicleDetail
                                              ? isCompletedStatus
                                                ? "bg-emerald-600 text-white"
                                                : "bg-blue-600 text-white"
                                              : "bg-slate-200 text-slate-600"
                                              }`}
                                          >
                                            {hasTcasVehicleDetail
                                              ? isCompletedStatus
                                                ? "เสร็จสิ้นกระบวนการ"
                                                : "ดำเนินการตามกระบวนการ (TCAS)"
                                              : formatStatusText(item.status)}
                                          </span>
                                        </div>

                                        {/* เนื้อหาหลัก: 2 คอลัมน์ ลดความสูงและลดการ์ดซ้อน */}
                                        <div
                                          className={`grid ${hasTcasVehicleDetail
                                            ? "lg:grid-cols-[0.9fr_1.1fr]"
                                            : "lg:grid-cols-1"
                                            }`}
                                        >
                                          {/* ซ้าย: สรุปคำขอ */}
                                          <section className="min-w-0 p-4 lg:border-r lg:border-slate-200">
                                            <div className="mb-3 flex items-center justify-between">
                                              <h4 className="text-[11px] font-black text-slate-700">
                                                สรุปคำขอ
                                              </h4>
                                              <span className="text-[10px] font-semibold text-slate-400">
                                                {item.fleet_truck_type || "-"}
                                              </span>
                                            </div>

                                            {/* จำนวน: เปลี่ยนจากการ์ดสูง 3 ใบ เป็นแถบสรุปบรรทัดเดียว */}
                                            {/* {isProcessStatus && (
                                            <div className="mb-4 grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200">
                                              <div className="bg-slate-50 px-2 py-2 text-center">
                                                <p className="text-[9px] font-bold text-slate-400">ขอ</p>
                                                <p className="mt-0.5 text-base font-black text-slate-800">
                                                  {formatNumber(totalQty)}
                                                </p>
                                              </div>

                                              <div className="border-x border-slate-200 bg-emerald-50 px-2 py-2 text-center">
                                                <p className="text-[9px] font-bold text-emerald-600">อนุมัติ</p>
                                                <p className="mt-0.5 text-base font-black text-emerald-700">
                                                  {formatNumber(approvedQty)}
                                                </p>
                                              </div>

                                              <div className="bg-amber-50 px-2 py-2 text-center">
                                                <p className="text-[9px] font-bold text-amber-600">คงเหลือ</p>
                                                <p className="mt-0.5 text-base font-black text-amber-700">
                                                  {formatNumber(rejectedQty)}
                                                </p>
                                              </div>
                                            </div>
                                          )} */}

                                            {/* ข้อมูลทั่วไปแบบ label/value ไม่ต้องทำเป็นการ์ดแยกทุกช่อง */}
                                            <dl className="grid gap-x-5 gap-y-3 sm:grid-cols-2">
                                              {hasTcasVehicleDetail && (
                                                <>
                                                  <div className="min-w-0">
                                                    <dt className="text-[9px] font-bold text-slate-400">
                                                      ผู้ประกอบการขนส่งที่อนุมัติ
                                                    </dt>
                                                    <dd className="mt-0.5 break-words text-[11px] font-black text-slate-700">
                                                      {item.approved_company_name ||
                                                        "-"}
                                                    </dd>
                                                  </div>

                                                  <div className="min-w-0">
                                                    <dt className="text-[9px] font-bold text-slate-400">
                                                      อนุมัติโดย
                                                    </dt>
                                                    <dd className="mt-0.5 break-words text-[11px] font-black text-blue-700">
                                                      {formatApprovedBy(
                                                        item.approved_by,
                                                      )}
                                                    </dd>
                                                  </div>
                                                </>
                                              )}

                                              <div>
                                                <dt className="text-[9px] font-bold text-slate-400">
                                                  Workload
                                                </dt>
                                                <dd className="mt-0.5 text-[11px] font-black text-slate-700">
                                                  {formatNumber(item.workload)}
                                                </dd>
                                              </div>

                                              <div>
                                                <dt className="text-[9px] font-bold text-slate-400">
                                                  Truck Turn
                                                </dt>
                                                <dd className="mt-0.5 text-[11px] font-black text-slate-700">
                                                  {formatNumber(item.truckturn)}
                                                </dd>
                                              </div>
                                            </dl>

                                            <div className="mt-4 border-t border-slate-100 pt-3">
                                              <p className="text-[9px] font-bold text-slate-400">
                                                หมายเหตุ
                                              </p>
                                              <p className="mt-1 whitespace-pre-wrap break-words text-[11px] font-medium leading-5 text-slate-600">
                                                {item.remark || "-"}
                                              </p>
                                            </div>
                                          </section>

                                          {/* ขวา: ข้อมูลรถ */}
                                          {hasTcasVehicleDetail ? (
                                            <section className="min-w-0 border-t border-slate-200 p-4 lg:border-t-0">
                                              <div className="mb-3 flex items-center justify-between">
                                                <h4 className="text-[11px] font-black text-slate-700">
                                                  ข้อมูลรถที่จะเข้าคลัง
                                                </h4>
                                                <span className="text-[10px] font-semibold text-slate-400">
                                                  อัปเดตล่าสุดจากคลัง
                                                </span>
                                              </div>

                                              {warehouseInfoLoading[rowKey] ? (
                                                <div className="flex min-h-[96px] items-center justify-center rounded-lg border border-dashed border-blue-200 bg-blue-50/50 text-[11px] font-black text-blue-600">
                                                  กำลังโหลดข้อมูลรถคันที่{" "}
                                                  {item.vehicle_no}...
                                                </div>
                                              ) : warehouseInfoErrors[
                                                rowKey
                                              ] ? (
                                                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-3">
                                                  <p className="text-[11px] font-black text-rose-700">
                                                    โหลดข้อมูลรถไม่สำเร็จ
                                                  </p>
                                                  <p className="mt-1 break-words text-[10px] font-semibold text-rose-600">
                                                    {
                                                      warehouseInfoErrors[
                                                      rowKey
                                                      ]
                                                    }
                                                  </p>
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      void loadVehicleWarehouseInfo(
                                                        item,
                                                        rowKey,
                                                      )
                                                    }
                                                    className="mt-2 rounded-md bg-rose-600 px-2.5 py-1.5 text-[10px] font-black text-white transition hover:bg-rose-700"
                                                  >
                                                    โหลดใหม่
                                                  </button>
                                                </div>
                                              ) : (
                                                <dl className="grid border-t border-l border-slate-200 sm:grid-cols-2">
                                                  {warehouseInfoFields.map(
                                                    (field) => (
                                                      <div
                                                        key={`${rowKey}-${field.key}`}
                                                        className="min-w-0 border-r border-b border-slate-200 px-3 py-2.5"
                                                      >
                                                        <dt className="text-[9px] font-bold text-slate-400">
                                                          {field.label}
                                                        </dt>
                                                        <dd
                                                          className={`mt-0.5 break-words text-[11px] font-black ${field.key ===
                                                            "warehouse_plan_date"
                                                            ? "text-blue-700"
                                                            : field.key ===
                                                              "car_license"
                                                              ? "text-emerald-700"
                                                              : "text-slate-700"
                                                            }`}
                                                        >
                                                          {field.value}
                                                        </dd>
                                                      </div>
                                                    ),
                                                  )}
                                                </dl>
                                              )}
                                            </section>
                                          ) : showReplacementTruckDetails &&
                                            replacementTruckRows.length > 0 ? (
                                            <section className="border-t border-slate-200">
                                              <div className="flex items-center justify-between px-4 py-2.5">
                                                <div>
                                                  <h4 className="text-[11px] font-black text-slate-700">
                                                    รายละเอียดรถทดแทน
                                                  </h4>
                                                  <p className="mt-0.5 text-[9px] font-medium text-slate-400">
                                                    ทะเบียน จังหวัด ประเภทรถ
                                                    และผู้ประกอบการขนส่งเดิม
                                                  </p>
                                                </div>

                                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700 ring-1 ring-blue-100">
                                                  {replacementTruckRows.length}{" "}
                                                  คัน
                                                </span>
                                              </div>

                                              <div className="max-h-[220px] overflow-auto border-t border-slate-200">
                                                <table className="w-full min-w-[680px] text-left text-[10px]">
                                                  <thead className="sticky top-0 z-10 bg-slate-100 text-slate-500">
                                                    <tr>
                                                      <th className="w-[54px] px-3 py-2 text-center font-black">
                                                        #
                                                      </th>
                                                      <th className="px-3 py-2 font-black">
                                                        ทะเบียนรถ
                                                      </th>
                                                      <th className="px-3 py-2 font-black">
                                                        จังหวัด
                                                      </th>
                                                      <th className="px-3 py-2 font-black">
                                                        ประเภทรถเดิม
                                                      </th>
                                                      <th className="px-3 py-2 font-black">
                                                        ผู้ประกอบการขนส่งเดิม
                                                      </th>
                                                    </tr>
                                                  </thead>

                                                  <tbody>
                                                    {replacementTruckRows.map(
                                                      (truck, truckIndex) => (
                                                        <tr
                                                          key={
                                                            truck.id ||
                                                            `${rowKey}-${truck.license}-${truckIndex}`
                                                          }
                                                          className="border-t border-slate-100 hover:bg-blue-50/40"
                                                        >
                                                          <td className="px-3 py-2 text-center font-black text-slate-400">
                                                            {truckIndex + 1}
                                                          </td>

                                                          <td className="px-3 py-2 font-black text-blue-700">
                                                            {truck.license ||
                                                              "-"}
                                                          </td>

                                                          <td className="px-3 py-2 font-bold text-slate-600">
                                                            {truck.province ||
                                                              "-"}
                                                          </td>

                                                          <td className="px-3 py-2 font-bold text-slate-600">
                                                            {truck.truck_type ||
                                                              "-"}
                                                          </td>

                                                          <td className="px-3 py-2 font-bold text-slate-700">
                                                            {truck.company_id ||
                                                              truck.company_name
                                                              ? `[${truck.company_id || "-"}] ${truck.company_name || "-"}`
                                                              : "-"}
                                                          </td>
                                                        </tr>
                                                      ),
                                                    )}
                                                  </tbody>
                                                </table>
                                              </div>
                                            </section>
                                          ) : null}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            );
                          },
                        )}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3">
                <div className="flex items-center gap-2">
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
                    จากทั้งหมด {sortedRequests.length.toLocaleString("th-TH")} รายการ
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage((page) => Math.max(page - 1, 1))
                    }
                    className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 disabled:opacity-40"
                  >
                    ก่อนหน้า
                  </button>

                  <span className="min-w-[90px] text-center text-xs font-bold text-slate-600">
                    หน้า {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.min(page + 1, totalPages),
                      )
                    }
                    className="h-9 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white disabled:opacity-40"
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ExportRequestModal
          open={openExportModal}
          onClose={() => setOpenExportModal(false)}
          requests={exportRequests}
          dcLabel={selectedDCLabel}
        />
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
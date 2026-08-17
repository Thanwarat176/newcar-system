"use client";

import React, {
  ChangeEvent,
  DragEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import * as XLSX from "xlsx";

import {
  AlertCircle,
  CheckCircle2,
  CloudUpload,
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
  RefreshCcw,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";

export default function ImportPage() {
  // API สำหรับ Import
  const IMPORT_API =
    "http://192.168.158.210/api_new_truck/api/import_excel.php";

  // ขนาดไฟล์สูงสุด
  const MAX_FILE_SIZE = 100 * 1024 * 1024;

  // ประเภทไฟล์ที่รองรับ
  const ALLOWED_EXTENSIONS = ["xlsx", "xls", "csv"];

  // Mapping Column ภาษาไทยเป็นภาษาอังกฤษ
  const COLUMN_MAP: Record<string, string> = {
    ลำดับ: "no",
    วันที่สร้างคำขอ: "request_date",
    ประเภทคำขอ: "request_type",
    สถานะปัจจุบัน: "current_status",
    เลขที่เอกสาร: "running_doc",
    ประเภทคลัง: "dc_type",
    ชื่อคลัง: "dc_code",
    "DC ZONE": "dc_zone",
    ประเภทรถ: "truck_type",
    "จำนวนรถที่ขอ (คัน) *": "qty",
    "รอรับ Workload": "workload",
    "จำนวน truckturn": "truckturn",
    "ทะเบียนทดแทน1(ระบุทะเบียน)": "license_replace",
    หมายเหตุที่แจ้งขอ: "remark",
    วันที่ใช้งาน: "usage_date",
    ผู้แจ้งขอ: "request_by",

    "สถานะอนุมัติจาก GM": "gm_status",
    "วันที่ GM อนุมัติ": "gm_approved_date",

    ประเภทรถที่อนุมัติ: "approved_truck_type",
    จำนวนรถที่อนุมัติ: "approved_qty",

    "ชื่อบริษัทขนส่ง (ย่อ)2": "company_short_name",
    "VENDOR CODE": "company_id",
    ชื่อบริษัทขนส่ง: "company_name",

    ประเภทรถที่ถูกทดแทน: "replaced_truck_type",
    บริษัทขนส่งที่ถูกทดแทน: "replaced_company",

    หมายเหตุการประเมินกองรถ: "fleet_remark",
    สถานะการประเมินกองรถ: "fleet_status",
    วันที่ประเมินกองรถ: "fleet_assessment_date",

    คาดการณ์วันเข้าคลัง: "expected_delivery_date",

    จัดสรรยี่ห้อรถ: "truck_brand",
    จัดสรรผู้ผลิต: "truck_manufacturer",
    จัดสรรรุ่นรถ: "truck_model",

    เลขเครื่อง: "engine_no",
    "เลข Chassis": "chassis_no",
    ทะเบียน: "license_province",

    "เลขบันทึก FBP": "fbp_doc_no",
    "วันที่เข้ามากรอกเลขบันทึก FBP": "fbp_doc_date",

    "เลขบันทึกแจ้ง TIS": "tis_doc_no",
    "วันที่เข้ามากรอกเลขบันทึกแจ้ง TIS": "tis_doc_date",

    "เลขบันทึกแจ้ง TIL": "til_doc_no",
    "วันที่เข้ามากรอกเลขบันทึกแจ้ง TIL": "til_doc_date",

    "เลขบันทึกแจ้ง ASK": "ask_doc_no",
    "วันที่เข้ามากรอกเลขบันทึกแจ้ง ASK": "ask_doc_date",

    "เลขบันทึกแจ้ง Kleasing": "kleasing_doc_no",
    "วันที่เข้ามากรอกเลขบันทึกแจ้ง Kleasing": "kleasing_doc_date",

    "เลขบันทึกแจ้ง TTB2": "ttb2_doc_no",
    "วันที่เข้ามากรอกเลขบันทึกแจ้ง TTB2": "ttb2_doc_date",

    "เลขบันทึกแจ้ง THAIOLIX": "thaiolix_doc_no",
    "วันที่เข้ามากรอกเลขบันทึกแจ้ง THAIOLIX": "thaiolix_doc_date",

    วันที่เริ่มรอจัดสรรตามโควต้า: "quota_start_date",
    วันที่สิ้นสุดรอจัดสรรตามโควต้า: "quota_end_date",

    วันที่เริ่มรอลงนามหนังสือจัดสรร: "allocation_sign_start_date",
    วันที่สิ้นสุดรอลงนามหนังสือจัดสรร: "allocation_sign_end_date",

    วันที่เริ่มรอไฟแนนซ์อนุมัติ: "finance_start_date",
    วันที่สิ้นสุดรอไฟแนนซ์อนุมัติ: "finance_end_date",

    วันที่เริ่มรอส่งรถเข้าอู่: "garage_start_date",
    วันที่สิ้นสุดรอส่งรถเข้าอู่: "garage_end_date",

    "วันที่เริ่มประกอบตู้/เครื่องทำความเย็น": "body_install_start_date",
    "วันที่สิ้นสุดประกอบตู้/เครื่องทำความเย็น": "body_install_end_date",

    วันที่เริ่มรอจดทะเบียนรถ: "registration_start_date",
    วันที่สิ้นสุดรอจดทะเบียนรถ: "registration_end_date",

    วันที่เริ่มส่งมอบคลังแล้ว: "delivery_start_date",
    วันที่สิ้นสุดส่งมอบคลังแล้ว: "delivery_end_date",

    วันที่สิ้นสุดหนังสือหมดอายุ: "document_expired_date",
    วันที่ยกเลิกหนังสือ: "document_cancelled_date",

    Remark: "tracking_remark",
    Remark_1: "tracking_remark_2",
  };

  // ใช้แสดงหัวตารางใน Preview ให้เหมือนกับหัวข้อภาษาไทยใน Excel
  // ส่วนข้อมูลที่ส่งเข้า API ยังคงใช้ key ภาษาอังกฤษจาก COLUMN_MAP ตามเดิม
  const COLUMN_LABEL_MAP: Record<string, string> = Object.fromEntries(
    Object.entries(COLUMN_MAP).map(([thaiLabel, englishKey]) => [
      englishKey,
      thaiLabel,
    ]),
  );

  const getPreviewColumnLabel = (column: string) =>
    COLUMN_LABEL_MAP[column] || column;

  // Ref สำหรับเลือกไฟล์
  const inputRef = useRef<HTMLInputElement | null>(null);

  // เก็บไฟล์ที่เลือก
  const [file, setFile] = useState<File | null>(null);

  // สถานะ Drag
  const [isDragging, setIsDragging] = useState(false);

  // สถานะ Import
  const [status, setStatus] = useState<
    "idle" | "selected" | "uploading" | "success" | "error"
  >("idle");

  // Error
  const [error, setError] = useState("");

  // Preview
  const [previewData, setPreviewData] = useState<Record<string, any>[]>([]);

  // Column Preview
  const [previewColumns, setPreviewColumns] = useState<string[]>([]);

  // Sheet Preview
  const [sheetName, setSheetName] = useState("");

  // สถานะอ่านไฟล์
  const [readingFile, setReadingFile] = useState(false);

  // ข้อมูลทุก Sheet
  const [allSheetsData, setAllSheetsData] = useState<
    Record<string, Record<string, any>[]>
  >({});

  // ปรับชื่อ Column
  const normalizeColumnName = (value: string) =>
    String(value)
      .replace(/\u00A0/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  // ป้องกัน Browser เปิดไฟล์เองตอน Drop
  useEffect(() => {
    const handleDragOver = (event: globalThis.DragEvent) => {
      event.preventDefault();

      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }
    };

    const handleDrop = (event: globalThis.DragEvent) => {
      event.preventDefault();
    };

    window.addEventListener("dragover", handleDragOver);

    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragover", handleDragOver);

      window.removeEventListener("drop", handleDrop);
    };
  }, []);

  // อ่านข้อมูลทุก Sheet จากไฟล์ Excel
  useEffect(() => {
    if (!file) {
      setPreviewData([]);
      setPreviewColumns([]);
      setSheetName("");
      setAllSheetsData({});
      return;
    }

    const readFile = async () => {
      try {
        setReadingFile(true);
        setError("");

        console.clear();

        console.log("====================================");
        console.log("กำลังอ่านไฟล์:", file.name);
        console.log("ขนาดไฟล์:", file.size, "bytes");
        console.log("ขนาดไฟล์:", (file.size / 1024 / 1024).toFixed(4), "MB");
        console.log("MIME TYPE:", file.type);

        const arrayBuffer = await file.arrayBuffer();

        if (arrayBuffer.byteLength === 0) {
          throw new Error("ไฟล์ไม่มีข้อมูล");
        }

        console.log("ARRAY BUFFER SIZE:", arrayBuffer.byteLength);

        const uint8Array = new Uint8Array(arrayBuffer);

        const fileHeader = Array.from(uint8Array.slice(0, 10));

        const fileHeaderText = String.fromCharCode(...uint8Array.slice(0, 4));

        console.log("FILE HEADER:", fileHeader);

        console.log("FILE HEADER TEXT:", fileHeaderText);

        const extension = file.name.split(".").pop()?.toLowerCase() || "";

        if (extension === "xlsx") {
          const isZip = uint8Array[0] === 80 && uint8Array[1] === 75;

          console.log("XLSX ZIP HEADER:", isZip);

          if (!isZip) {
            throw new Error(
              "ไฟล์นี้ใช้นามสกุล .xlsx แต่โครงสร้างภายในไม่ใช่ไฟล์ Excel XLSX",
            );
          }
        }

        console.log("กำลัง Parse Workbook...");

        const workbook = XLSX.read(uint8Array, {
          type: "array",
          cellDates: true,
        });

        console.log("WORKBOOK:", workbook);

        console.log("SHEET NAMES:", workbook.SheetNames);

        console.log("SHEETS:", workbook.Sheets);

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error("อ่านไฟล์ได้ แต่ไม่พบ Sheet ภายในไฟล์ Excel");
        }

        const allSheets: Record<string, Record<string, any>[]> = {};

        workbook.SheetNames.forEach((name, index) => {
          const worksheet = workbook.Sheets[name];

          console.log("------------------------------------");

          console.log(`SHEET ${index + 1}:`, name);

          if (!worksheet) {
            console.warn(`ไม่พบ Worksheet: ${name}`);

            allSheets[name] = [];

            return;
          }

          console.log("RANGE:", worksheet["!ref"]);

          // อ่านเป็น Array ก่อน เพื่อควบคุมหัวตารางเอง
          // ป้องกัน SheetJS สร้างชื่อ __EMPTY, __EMPTY_1 จากช่องว่าง/Merge Cell
          const sheetRows = XLSX.utils.sheet_to_json<any[]>(worksheet, {
            header: 1,
            defval: "",
            raw: false,
            blankrows: false,
          });

          const cleanCellText = (value: any) =>
            String(value ?? "")
              .replace(/\u00A0/g, " ")
              .replace(/\s+/g, " ")
              .trim();

          // เลือกแถวหัวตารางจาก 20 แถวแรก
          // ให้คะแนนหัวข้อที่ตรงกับ COLUMN_MAP สูงกว่าข้อความชื่อรายงานทั่วไป
          const headerCandidates = sheetRows.slice(0, 20);
          let headerRowIndex = 0;
          let bestHeaderScore = -1;

          headerCandidates.forEach((row, rowIndex) => {
            const cells = Array.isArray(row) ? row : [];
            const nonEmptyCells = cells.map(cleanCellText).filter(Boolean);
            const knownHeaders = nonEmptyCells.filter((cell) =>
              Boolean(COLUMN_MAP[cell]),
            ).length;
            const hasSequenceHeader = nonEmptyCells.includes("ลำดับ");
            const hasVehicleIdHeader = nonEmptyCells.some(
              (cell) =>
                cell.toLowerCase() === "vehicle_id" ||
                cell.toLowerCase() === "vehicle id",
            );
            const score =
              (hasSequenceHeader ? 10000 : 0) +
              (hasVehicleIdHeader ? 10000 : 0) +
              knownHeaders * 100 +
              nonEmptyCells.length;

            if (score > bestHeaderScore) {
              bestHeaderScore = score;
              headerRowIndex = rowIndex;
            }
          });

          const sourceHeaderRow = Array.isArray(sheetRows[headerRowIndex])
            ? sheetRows[headerRowIndex]
            : [];

          const dataRows = sheetRows.slice(headerRowIndex + 1);
          const maxColumnCount = Math.max(
            sourceHeaderRow.length,
            ...dataRows.map((row) => (Array.isArray(row) ? row.length : 0)),
            0,
          );

          // เก็บเฉพาะ Column ที่มีหัวข้อหรือมีข้อมูลจริง
          const usedColumnIndexes = Array.from(
            { length: maxColumnCount },
            (_, columnIndex) => columnIndex,
          ).filter((columnIndex) => {
            const header = cleanCellText(sourceHeaderRow[columnIndex]);
            const hasData = dataRows.some(
              (row) => cleanCellText(row?.[columnIndex]) !== "",
            );

            return header !== "" || hasData;
          });

          const usedKeys = new Set<string>();
          const parsedColumns = usedColumnIndexes.map((columnIndex) => {
            const originalLabel =
              cleanCellText(sourceHeaderRow[columnIndex]) ||
              `คอลัมน์ ${columnIndex + 1}`;
            const baseKey = COLUMN_MAP[originalLabel] || originalLabel;
            let uniqueKey = baseKey;
            let duplicateNo = 2;

            while (usedKeys.has(uniqueKey)) {
              uniqueKey = `${baseKey}_${duplicateNo}`;
              duplicateNo += 1;
            }

            usedKeys.add(uniqueKey);

            return {
              columnIndex,
              key: uniqueKey,
              label: originalLabel,
            };
          });

          const rawData = dataRows
            .filter((row) =>
              usedColumnIndexes.some(
                (columnIndex) => cleanCellText(row?.[columnIndex]) !== "",
              ),
            )
            .map((row) => {
              const newRow: Record<string, any> = {};

              parsedColumns.forEach(({ columnIndex, key }) => {
                const value = row?.[columnIndex] ?? "";
                newRow[key] = typeof value === "string" ? value.trim() : value;
              });

              return newRow;
            });

          console.log("จำนวนข้อมูลต้นฉบับ:", rawData.length);

          const normalizedData = rawData;

          // จำ label จริงของหัวข้อ เพื่อให้ Preview เหมือน Sheet
          parsedColumns.forEach(({ key, label }) => {
            COLUMN_LABEL_MAP[key] = label;
          });

          allSheets[name] = normalizedData;

          console.log("จำนวนข้อมูลหลังแปลง:", normalizedData.length);

          console.log("INDEX 0:", normalizedData[0] ?? null);

          if (normalizedData.length > 0) {
            console.table([normalizedData[0]]);
          }
        });

        console.log("====================================");

        console.log("อ่าน Excel สำเร็จ");

        console.log("จำนวน Sheet:", Object.keys(allSheets).length);

        console.log("Sheet ที่อ่านได้:", Object.keys(allSheets));

        console.log("====================================");

        setAllSheetsData(allSheets);

        const firstSheetName = workbook.SheetNames[0];

        const firstSheetData = allSheets[firstSheetName] || [];

        // รวม Column จากทุกแถว เพราะบาง Sheet อาจมี Column
        // ที่ไม่มีอยู่ในข้อมูลแถวแรก
        const columns = Array.from(
          new Set(firstSheetData.flatMap((row) => Object.keys(row))),
        );

        setPreviewData(firstSheetData);

        setPreviewColumns(columns);

        setSheetName(firstSheetName);

        setStatus("selected");
      } catch (err) {
        console.error("====================================");

        console.error("READ FILE ERROR:", err);

        console.error("====================================");

        setPreviewData([]);
        setPreviewColumns([]);
        setSheetName("");
        setAllSheetsData({});

        setStatus("error");

        setError(
          err instanceof Error ? err.message : "ไม่สามารถอ่านไฟล์ Excel ได้",
        );
      } finally {
        setReadingFile(false);
      }
    };

    readFile();
  }, [file]);

  // ตรวจสอบไฟล์
  const handleSelectedFile = (selectedFile: File) => {
    const extension = selectedFile.name.split(".").pop()?.toLowerCase() || "";

    console.log("SELECT FILE:", selectedFile);

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setFile(null);

      setPreviewData([]);
      setPreviewColumns([]);
      setSheetName("");
      setAllSheetsData({});

      setStatus("error");

      setError(`ไม่รองรับไฟล์ .${extension} รองรับเฉพาะ .xlsx, .xls และ .csv`);

      return;
    }

    if (selectedFile.size === 0) {
      setFile(null);

      setStatus("error");

      setError("ไฟล์ไม่มีข้อมูล");

      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setFile(null);

      setStatus("error");

      setError(
        `ไฟล์มีขนาด ${(selectedFile.size / 1024 / 1024).toFixed(
          2,
        )} MB เกินกำหนด 100 MB`,
      );

      return;
    }

    setError("");

    setStatus("selected");

    setFile(selectedFile);
  };

  // รับไฟล์จาก File Picker
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    handleSelectedFile(selectedFile);
  };

  // รับไฟล์จาก Drag & Drop
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(false);

    console.log("DROP EVENT:", event.dataTransfer);

    const selectedFile = event.dataTransfer.files?.[0];

    if (!selectedFile) {
      setStatus("error");

      setError("ไม่พบไฟล์ที่ลากเข้ามา");

      return;
    }

    handleSelectedFile(selectedFile);
  };

  // ล้างไฟล์
  const handleRemoveFile = () => {
    setFile(null);

    setPreviewData([]);

    setPreviewColumns([]);

    setSheetName("");

    setAllSheetsData({});

    setStatus("idle");

    setError("");

    setIsDragging(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  // ดาวน์โหลดไฟล์ Template
  const handleDownloadTemplate = () => {
    const link = document.createElement("a");

    link.href = "/file/Template-รายงานสถานะออกรถขนส่ง.xlsx";

    link.download = "Template-รายงานสถานะออกรถขนส่ง.xlsx";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);
  };
  // ส่งข้อมูลไป API
  const handleImport = async () => {
    if (!file) {
      setStatus("error");

      setError("กรุณาเลือกไฟล์ก่อน");

      return;
    }

    if (Object.keys(allSheetsData).length === 0) {
      setStatus("error");

      setError("ไม่พบ Sheet ภายในไฟล์");

      return;
    }

    const totalRows = Object.values(allSheetsData).reduce(
      (total, rows) => total + rows.length,
      0,
    );

    if (totalRows === 0) {
      setStatus("error");

      setError("พบ Sheet แต่ไม่พบข้อมูลสำหรับ Import");

      return;
    }

    try {
      setStatus("uploading");

      setError("");

      const payload = {
        file_name: file.name,

        sheets: allSheetsData,
      };

      const payloadJson = JSON.stringify(payload);

      console.log("====================================");

      console.log("IMPORT PAYLOAD:");

      console.log(payload);

      console.log("จำนวน Sheet:", Object.keys(allSheetsData).length);

      console.log("จำนวนรายการรวม:", totalRows);

      console.log(
        "Payload Size:",
        (new Blob([payloadJson]).size / 1024 / 1024).toFixed(2),
        "MB",
      );

      console.log("====================================");

      const response = await fetch(IMPORT_API, {
        method: "POST",

        headers: {
          Accept: "application/json",

          "Content-Type": "application/json",
        },

        body: payloadJson,
      });

      const responseText = await response.text();

      console.log("HTTP STATUS:", response.status);

      console.log("API RESPONSE:", responseText);

      let data: any = {};

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          `API ตอบกลับไม่ใช่ JSON: ${responseText || "ไม่มีข้อมูลตอบกลับ"}`,
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.message || data?.error || `HTTP ${response.status}`,
        );
      }

      if (data?.success === false) {
        throw new Error(
          data?.message || data?.error || "Import ข้อมูลไม่สำเร็จ",
        );
      }

      console.log("IMPORT SUCCESS:", data);

      setStatus("success");

      alert(data?.message || "Import ข้อมูลเรียบร้อยแล้ว");
    } catch (err) {
      console.error("IMPORT ERROR:", err);

      setStatus("error");

      setError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการ Import",
      );
    }
  };

  const totalRows = Object.values(allSheetsData).reduce(
    (total, rows) => total + rows.length,
    0,
  );

  // เปลี่ยน Sheet ที่กำลังแสดงใน Preview
  const handleSelectSheet = (name: string) => {
    const selectedSheetData = allSheetsData[name] || [];

    const columns = Array.from(
      new Set(selectedSheetData.flatMap((row) => Object.keys(row))),
    );

    setSheetName(name);
    setPreviewData(selectedSheetData);
    setPreviewColumns(columns);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                <FileSpreadsheet className="h-5 w-5" />
              </div>

              <div>
                <h1 className="text-xl font-black text-slate-900">
                  Import ข้อมูลคำขอ
                </h1>

                <p className="mt-0.5 text-sm text-slate-500">
                  นำเข้าข้อมูลจากไฟล์ Excel หรือ CSV
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-5">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <CloudUpload className="h-5 w-5" />
                  </div>

                  <div>
                    <h2 className="text-sm font-black text-slate-900">
                      อัปโหลดไฟล์
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                      เลือกไฟล์หรือลากไฟล์มาวาง
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                {!file ? (
                  <div
                    onClick={() => inputRef.current?.click()}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      event.stopPropagation();

                      event.dataTransfer.dropEffect = "copy";

                      setIsDragging(true);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.stopPropagation();

                      event.dataTransfer.dropEffect = "copy";

                      setIsDragging(true);
                    }}
                    onDragLeave={(event) => {
                      event.preventDefault();
                      event.stopPropagation();

                      setIsDragging(false);
                    }}
                    onDrop={handleDrop}
                    className={`flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 text-center transition ${
                      isDragging
                        ? "border-blue-500 bg-blue-50 ring-4 ring-blue-500/10"
                        : "border-slate-300 bg-slate-50/50 hover:border-blue-400 hover:bg-blue-50/30"
                    }`}
                  >
                    <div className="pointer-events-none mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm">
                      <Upload className="h-7 w-7" />
                    </div>

                    <h3 className="pointer-events-none text-base font-black text-slate-900">
                      {isDragging ? "วางไฟล์ตรงนี้" : "ลากไฟล์มาวางที่นี่"}
                    </h3>

                    <p className="pointer-events-none mt-2 text-sm text-slate-500">
                      หรือคลิกเพื่อเลือกไฟล์จากเครื่อง
                    </p>

                    <div className="pointer-events-none mt-5 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-xs font-black text-slate-700 shadow-sm">
                      เลือกไฟล์
                    </div>

                    <p className="pointer-events-none mt-5 text-xs text-slate-400">
                      รองรับ .xlsx, .xls และ .csv • สูงสุด 100 MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 sm:p-5">
                      <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-600 shadow-sm">
                          <FileSpreadsheet className="h-7 w-7" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />

                            <span className="text-xs font-bold text-emerald-700">
                              ไฟล์ถูกเลือกแล้ว
                            </span>
                          </div>

                          <p className="mt-1 truncate text-sm font-black text-slate-900">
                            {file.name}
                          </p>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span>{(file.size / 1024).toFixed(1)} KB</span>

                            <span>•</span>

                            <span>
                              {Object.keys(allSheetsData).length} Sheet
                            </span>

                            <span>•</span>

                            <span>{totalRows} รายการ</span>
                          </div>
                        </div>

                        {status !== "uploading" && (
                          <button
                            type="button"
                            onClick={handleRemoveFile}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {readingFile && (
                      <div className="mt-4 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />

                        <div>
                          <p className="text-sm font-black text-blue-900">
                            กำลังอ่านไฟล์...
                          </p>

                          <p className="mt-0.5 text-xs text-blue-600">
                            กำลังตรวจสอบโครงสร้างและอ่านทุก Sheet
                          </p>
                        </div>
                      </div>
                    )}

                    {status === "success" && (
                      <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />

                        <div>
                          <p className="text-sm font-black text-emerald-900">
                            Import สำเร็จ
                          </p>

                          <p className="mt-0.5 text-xs text-emerald-600">
                            ระบบนำเข้าข้อมูลเรียบร้อยแล้ว
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        disabled={readingFile || status === "uploading"}
                        onClick={() => inputRef.current?.click()}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <RefreshCcw className="h-4 w-4" />
                        เปลี่ยนไฟล์
                      </button>

                      <button
                        type="button"
                        onClick={handleImport}
                        disabled={
                          readingFile ||
                          status === "uploading" ||
                          Object.keys(allSheetsData).length === 0 ||
                          totalRows === 0
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {status === "uploading" ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            กำลัง Import...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            Import ข้อมูล
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {!readingFile && sheetName && (
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600" />

                      <h2 className="text-sm font-black text-slate-900">
                        ตรวจสอบข้อมูลก่อน Import
                      </h2>
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      Sheet:{" "}
                      <span className="font-bold text-slate-700">
                        {sheetName}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                      <span className="text-slate-500">ข้อมูล</span>

                      <span className="ml-2 font-black text-slate-900">
                        {previewData.length}
                      </span>

                      <span className="ml-1 text-slate-500">รายการ</span>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                      <span className="text-slate-500">Column</span>

                      <span className="ml-2 font-black text-slate-900">
                        {previewColumns.length}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="max-h-[520px] overflow-auto">
                  <table className="min-w-max border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-slate-100">
                      <tr>
                        <th className="sticky left-0 z-20 whitespace-nowrap border-b border-r border-slate-200 bg-slate-100 px-4 py-3 text-center text-[11px] font-black text-slate-500">
                          #
                        </th>

                        {previewColumns.map((column) => (
                          <th
                            key={column}
                            className="whitespace-nowrap border-b border-r border-slate-200 px-4 py-3 text-xs font-black text-slate-700 last:border-r-0"
                          >
                            {getPreviewColumnLabel(column)}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {previewData.length === 0 ? (
                        <tr>
                          <td
                            colSpan={Math.max(previewColumns.length + 1, 1)}
                            className="px-4 py-12 text-center text-sm font-semibold text-slate-400"
                          >
                            Sheet นี้ไม่มีข้อมูล
                          </td>
                        </tr>
                      ) : (
                        previewData.slice(0, 100).map((row, rowIndex) => (
                          <tr
                            key={rowIndex}
                            className="border-b border-slate-100 transition hover:bg-slate-50"
                          >
                            <td className="sticky left-0 whitespace-nowrap border-r border-slate-100 bg-white px-4 py-3 text-center text-xs font-bold text-slate-400">
                              {rowIndex + 1}
                            </td>

                            {previewColumns.map((column) => (
                              <td
                                key={`${rowIndex}-${column}`}
                                className="max-w-[300px] whitespace-nowrap border-r border-slate-100 px-4 py-3 text-xs text-slate-700 last:border-r-0"
                              >
                                {row[column] === "" ||
                                row[column] === null ||
                                row[column] === undefined ? (
                                  <span className="text-slate-300">-</span>
                                ) : (
                                  String(row[column])
                                )}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col gap-1 border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                  <p>
                    แสดง{" "}
                    <span className="font-black text-slate-700">
                      {Math.min(previewData.length, 100)}
                    </span>{" "}
                    จาก{" "}
                    <span className="font-black text-slate-700">
                      {previewData.length}
                    </span>{" "}
                    รายการ
                  </p>

                  {previewData.length > 100 && (
                    <span className="font-bold text-amber-600">
                      Preview สูงสุด 100 รายการ
                    </span>
                  )}
                </div>
              </section>
            )}

            {status === "error" && error && (
              <section className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <XCircle className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-black text-red-900">
                    เกิดข้อผิดพลาด
                  </p>

                  <p className="mt-1 text-sm leading-6 text-red-700">{error}</p>
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-5">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-sm font-black text-slate-900">
                      Template
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">
                      รูปแบบไฟล์สำหรับ Import
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <p className="text-xs leading-5 text-slate-500">
                  รองรับไฟล์ Excel และ CSV โดยระบบจะอ่านข้อมูลทุก Sheet
                  และแปลงชื่อ Column ก่อน Import
                </p>

                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
                >
                  <Download className="h-4 w-4" />
                  ดาวน์โหลด Template
                </button>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Info className="h-5 w-5" />
                  </div>

                  <p className="text-sm font-black text-slate-900">
                    วิธีใช้งาน
                  </p>
                </div>
              </div>

              <div className="space-y-5 p-5">
                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">
                    1
                  </div>

                  <div>
                    <p className="text-xs font-black text-slate-800">
                      เลือกไฟล์
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      รองรับ .xlsx, .xls และ .csv
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">
                    2
                  </div>

                  <div>
                    <p className="text-xs font-black text-slate-800">
                      อ่านข้อมูล
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      ระบบตรวจสอบและอ่านทุก Sheet
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">
                    3
                  </div>

                  <div>
                    <p className="text-xs font-black text-slate-800">
                      ตรวจ Preview
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      ตรวจข้อมูลก่อนนำเข้า
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">
                    4
                  </div>

                  <div>
                    <p className="text-xs font-black text-slate-800">Import</p>

                    <p className="mt-1 text-xs text-slate-500">
                      ส่งข้อมูลไปยังระบบ
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <p className="text-sm font-black text-slate-900">
                  Sheet ที่อ่านได้
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  ทั้งหมด {Object.keys(allSheetsData).length} Sheet •{" "}
                  {totalRows} รายการ
                </p>
              </div>

              <div className="p-3">
                {Object.keys(allSheetsData).length === 0 ? (
                  <p className="px-3 py-4 text-xs text-slate-400">
                    ยังไม่มีข้อมูล
                  </p>
                ) : (
                  Object.entries(allSheetsData).map(([name, data], index) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => handleSelectSheet(name)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                        sheetName === name
                          ? "border-blue-200 bg-blue-50 shadow-sm"
                          : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-black ${
                          sheetName === name
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {index + 1}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-slate-700">
                          {name}
                        </p>

                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {data.length} รายการ
                        </p>
                      </div>

                      {sheetName === name && (
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-[9px] font-black text-blue-700">
                          กำลังแสดง
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </section>

            <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />

              <p className="text-xs leading-5 text-amber-800">
                ถ้าเลือกไฟล์แล้วขึ้นว่าไม่พบ Sheet ให้เปิด Console ดูค่า FILE
                HEADER, XLSX ZIP HEADER, BOOK TYPE และ SHEET NAMES
                เพื่อเช็กโครงสร้างไฟล์
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
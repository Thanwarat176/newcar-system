"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PATHS } from "../../lib/paths";

type WarehouseItem = {
  DC_NAME: string;
  DC_CODE: string;
  DC_TYPE: string;
};

type UserData = {
  em_id?: string | number;
  employee_id?: string | number;
  EMPLOYEE_ID?: string | number;
  warehouse?: string;
  WAREHOUSE?: string;
  team?: string;
  TEAM?: string;
  department?: string;
  DEPARTMENT?: string;
  [key: string]: unknown;
};

const CENTER_DEPARTMENTS: WarehouseItem[] = [
  {
    DC_CODE: "TCIA",
    DC_NAME: "ฝ่ายพัฒนาศักยภาพการขนส่งและวิเคราะห์ข้อมูลเชิงลึก",
    DC_TYPE: "CENTER",
  },
  {
    DC_CODE: "KA",
    DC_NAME: "ฝ่ายสื่อสารระบบกระจายสินค้าระบบงานขนส่ง",
    DC_TYPE: "CENTER",
  },
  {
    DC_CODE: "IMP",
    DC_NAME: "ฝ่ายพัฒนาและเพิ่มประสิทธิภาพระบบงานขนส่ง",
    DC_TYPE: "CENTER",
  },
  {
    DC_CODE: "TCAS",
    DC_NAME: "ฝ่ายสัญญาและสนับสนุนงานบริการระบบงานขนส่ง",
    DC_TYPE: "CENTER",
  },
  {
    DC_CODE: "FBP",
    DC_NAME: "ฝ่ายดูแลและพัฒนาคู่ค้าระบบงานขนส่ง",
    DC_TYPE: "CENTER",
  },
  {
    DC_CODE: "TSC",
    DC_NAME: "ฝ่ายบริการระบบงานขนส่ง",
    DC_TYPE: "CENTER",
  },
];

const SELECTION_KEYS = [
  "selected_dc",
  "selected_dcs",
  "selected_departments",
  "selected_department_codes",
] as const;

const normalize = (value: unknown): string =>
  String(value ?? "").trim().toUpperCase();

const getUserText = (...values: unknown[]): string => {
  for (const value of values) {
    const text = String(value ?? "").trim();

    if (text && text !== "-") {
      return text;
    }
  }

  return "";
};

export default function SelectDCPage() {
  const router = useRouter();

  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<WarehouseItem[]>([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [isCenter, setIsCenter] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const initializePage = async () => {
      try {
        setLoading(true);
        setErrorText("");

        // เปิดหน้ามาไม่เลือกรายการใดไว้ล่วงหน้า
        setSelectedItems([]);

        const savedUser = localStorage.getItem("user");

        if (!savedUser) {
          throw new Error("ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่");
        }

        const parsedUser: unknown = JSON.parse(savedUser);

        if (
          !parsedUser ||
          typeof parsedUser !== "object" ||
          Array.isArray(parsedUser)
        ) {
          throw new Error("ข้อมูลผู้ใช้งานไม่ถูกต้อง กรุณาเข้าสู่ระบบใหม่");
        }

        const user = parsedUser as UserData;

        setUserData(user);

        const loginUser = normalize(
          getUserText(
            user.em_id,
            user.employee_id,
            user.EMPLOYEE_ID
          )
        );

        const userWarehouse = normalize(
          getUserText(user.warehouse, user.WAREHOUSE)
        );

        // ใช้ข้อมูล user จริง ไม่ใช้ selected_dc มาตรวจ
        const centerLogin =
          loginUser === "CENTER" || userWarehouse === "CENTER";

        setIsCenter(centerLogin);

        const response = await fetch(
          "http://192.168.158.210/api_new_truck/api/warehouses.php",
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
            signal: controller.signal,
          }
        );

        const data = await response.json();

        if (
          !response.ok ||
          data.status !== "success" ||
          !Array.isArray(data.data)
        ) {
          throw new Error("โหลดข้อมูล Warehouse ไม่สำเร็จ");
        }

        const apiWarehouses: WarehouseItem[] = [];

        for (const row of data.data) {
          if (!row || typeof row !== "object") {
            continue;
          }

          const code = String(row.DC_CODE ?? "").trim();

          if (!code) {
            continue;
          }

          apiWarehouses.push({
            DC_CODE: code,
            DC_NAME: String(row.DC_NAME ?? "").trim(),
            DC_TYPE: String(row.DC_TYPE ?? "").trim(),
          });
        }

        const combinedItems = centerLogin
          ? [...CENTER_DEPARTMENTS, ...apiWarehouses]
          : apiWarehouses;

        const seenCodes = new Set<string>();

        const uniqueItems = combinedItems.filter((item) => {
          const code = normalize(item.DC_CODE);

          if (seenCodes.has(code)) {
            return false;
          }

          seenCodes.add(code);
          return true;
        });

        if (controller.signal.aborted) {
          return;
        }

        setWarehouses(uniqueItems);

        // ไม่โหลดค่าที่เคยเลือกกลับมา
        setSelectedItems([]);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error("INITIALIZE PAGE ERROR:", error);

        setErrorText(
          error instanceof Error
            ? error.message
            : "ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง"
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void initializePage();

    return () => {
      controller.abort();
    };
  }, []);

  const originalDepartment = userData
    ? getUserText(userData.department, userData.DEPARTMENT)
    : "";

  const originalWarehouse = userData
    ? getUserText(userData.warehouse, userData.WAREHOUSE)
    : "";

  const originalTeam = userData
    ? getUserText(userData.team, userData.TEAM)
    : "";

  const selectedCodes = useMemo(
    () => new Set(selectedItems.map((item) => normalize(item.DC_CODE))),
    [selectedItems]
  );

  const filteredWarehouses = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) {
      return warehouses;
    }

    return warehouses.filter((item) =>
      [item.DC_CODE, item.DC_NAME, item.DC_TYPE].some((value) =>
        value.toLowerCase().includes(keyword)
      )
    );
  }, [searchText, warehouses]);

  const allCenterSelected = CENTER_DEPARTMENTS.every((item) =>
    selectedCodes.has(normalize(item.DC_CODE))
  );

  const handleSelectItem = (item: WarehouseItem) => {
    setErrorText("");

    setSelectedItems((currentItems) => {
      const itemCode = normalize(item.DC_CODE);

      const alreadySelected = currentItems.some(
        (selectedItem) => normalize(selectedItem.DC_CODE) === itemCode
      );

      // กดรายการเดิมซ้ำเพื่อยกเลิกได้
      if (alreadySelected) {
        return currentItems.filter(
          (selectedItem) => normalize(selectedItem.DC_CODE) !== itemCode
        );
      }

      // CENTER เลือกได้หลายรายการ
      if (isCenter) {
        return [...currentItems, item];
      }

      // ผู้ใช้ทั่วไปเลือกได้หนึ่งรายการ
      return [item];
    });
  };

  const handleSelectAllCenter = () => {
    if (!isCenter) {
      return;
    }

    setErrorText("");

    setSelectedItems((currentItems) => {
      const centerCodes = new Set(
        CENTER_DEPARTMENTS.map((item) => normalize(item.DC_CODE))
      );

      const hasAllCenter = CENTER_DEPARTMENTS.every((department) =>
        currentItems.some(
          (item) =>
            normalize(item.DC_CODE) === normalize(department.DC_CODE)
        )
      );

      if (hasAllCenter) {
        // ยกเลิกเฉพาะฝ่ายส่วนกลาง เก็บ Warehouse ที่เลือกไว้
        return currentItems.filter(
          (item) => !centerCodes.has(normalize(item.DC_CODE))
        );
      }

      const currentCodes = new Set(
        currentItems.map((item) => normalize(item.DC_CODE))
      );

      return [
        ...currentItems,
        ...CENTER_DEPARTMENTS.filter(
          (item) => !currentCodes.has(normalize(item.DC_CODE))
        ),
      ];
    });
  };

  const handleContinue = () => {
    if (loading || !userData) {
      return;
    }

    try {
      setErrorText("");

      if (selectedItems.length === 0) {
        // ไม่เลือกอะไร: ล้างค่าที่เลือกทับไว้
        // เพื่อให้ส่วนอื่นกลับไปอ่านข้อมูลเดิมจาก user
        SELECTION_KEYS.forEach((key) => {
          localStorage.removeItem(key);
        });
      } else if (isCenter) {
        const selectedDepartments = selectedItems
          .filter((item) => normalize(item.DC_TYPE) === "CENTER")
          .map((item) => ({
            value: item.DC_CODE,
            label: item.DC_NAME,
            type: "CENTER",
          }));

        const selectedWarehouses = selectedItems
          .filter((item) => normalize(item.DC_TYPE) !== "CENTER")
          .map((item) => ({
            DC_CODE: item.DC_CODE,
            DC_NAME: item.DC_NAME || "",
            DC_TYPE: item.DC_TYPE || "",
          }));

        localStorage.setItem(
          "selected_departments",
          JSON.stringify(selectedDepartments)
        );

        localStorage.setItem(
          "selected_department_codes",
          JSON.stringify(selectedDepartments.map((item) => item.value))
        );

        localStorage.setItem(
          "selected_dcs",
          JSON.stringify(selectedWarehouses)
        );

        // รองรับ Component เดิมที่อ่าน selected_dc
        if (selectedWarehouses.length > 0) {
          localStorage.setItem(
            "selected_dc",
            JSON.stringify(selectedWarehouses[0])
          );
        } else {
          localStorage.removeItem("selected_dc");
        }
      } else {
        const selectedDC = selectedItems[0];

        localStorage.setItem(
          "selected_dc",
          JSON.stringify({
            DC_CODE: selectedDC.DC_CODE,
            DC_NAME: selectedDC.DC_NAME || "",
            DC_TYPE: selectedDC.DC_TYPE || "",
          })
        );

        localStorage.removeItem("selected_dcs");
        localStorage.removeItem("selected_departments");
        localStorage.removeItem("selected_department_codes");
      }

      // ไม่แก้ไขข้อมูลต้นฉบับใน localStorage.user
      window.dispatchEvent(new Event("selectedDCChanged"));

      router.push(PATHS.main.addFleet);
    } catch (error) {
      console.error("SAVE SELECTION ERROR:", error);
      setErrorText("ไม่สามารถบันทึกการเลือกได้ กรุณาลองใหม่อีกครั้ง");
    }
  };

  return (
    <main className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-100 p-3">
      <div
        className="flex min-h-0 w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-blue-100 bg-white p-4 shadow-lg"
        style={{ height: "min(640px, calc(100dvh - 24px))" }}
      >
        {/* หัวข้อ */}
        <div className="shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-800">
              {isCenter
                ? "เลือกฝ่าย / Warehouse"
                : "เลือก DC / Warehouse"}
            </h1>
  
            {isCenter && (
              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                CENTER
              </span>
            )}
          </div>
  
          <p className="mt-1 text-[11px] text-slate-500">
            ไม่เลือกอะไรเพื่อใช้ข้อมูลเดิมของผู้ใช้
            {isCenter && " หรือเลือกได้หลายรายการ"}
          </p>
        </div>
  
        {/* ข้อมูลเดิม */}
        {userData && (
          <div className="mt-3 shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-semibold text-slate-700">
              ข้อมูลเดิมของผู้ใช้
            </p>
  
            <p
              className="mt-1 truncate text-[11px] text-slate-500"
              title={`ฝ่าย: ${originalDepartment || "-"} / Warehouse: ${
                originalWarehouse || "-"
              } / Team: ${originalTeam || "-"}`}
            >
              ฝ่าย: {originalDepartment || "-"}
              {" / "}Warehouse: {originalWarehouse || "-"}
              {" / "}Team: {originalTeam || "-"}
            </p>
          </div>
        )}
  
        {/* ช่องค้นหา */}
        <div className="mt-3 shrink-0">
          <label
            htmlFor="warehouse-search"
            className="mb-1 block text-xs font-semibold text-slate-700"
          >
            {isCenter ? "ค้นหาฝ่าย / Warehouse" : "ค้นหา DC"}
          </label>
  
          <input
            id="warehouse-search"
            type="search"
            value={searchText}
            disabled={loading}
            placeholder={
              loading
                ? "กำลังโหลดข้อมูล..."
                : "พิมพ์รหัสหรือชื่อที่ต้องการค้นหา"
            }
            onChange={(event) => setSearchText(event.target.value)}
            className="w-full rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
          />
        </div>
  
        {/* เครื่องมือเลือก */}
        <div className="mt-2 flex shrink-0 items-center justify-between gap-2">
          <p className="text-[10px] text-slate-500">
            {loading
              ? "กำลังโหลด..."
              : selectedItems.length > 0
                ? `เลือกแล้ว ${selectedItems.length} รายการ`
                : "ยังไม่ได้เลือก · ใช้ข้อมูลเดิม"}
          </p>
  
          <div className="flex items-center gap-2">
            {selectedItems.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedItems([]);
                  setErrorText("");
                }}
                className="rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-500 hover:bg-slate-100"
              >
                ล้างการเลือก
              </button>
            )}
  
            {isCenter && !loading && warehouses.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAllCenter}
                className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700 hover:bg-blue-100"
              >
                {allCenterSelected
                  ? "ยกเลิกทุกฝ่าย"
                  : "เลือกทุกฝ่าย"}
              </button>
            )}
          </div>
        </div>
  
        {/* รายการ: รับพื้นที่ที่เหลือและเลื่อนเฉพาะส่วนนี้ */}
        <div className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-xl border border-blue-100 bg-white">
          {loading ? (
            <div className="px-3 py-6 text-center text-xs text-slate-400">
              กำลังโหลดข้อมูล...
            </div>
          ) : filteredWarehouses.length > 0 ? (
            filteredWarehouses.map((item) => {
              const selected = selectedCodes.has(
                normalize(item.DC_CODE)
              );
  
              const centerItem =
                normalize(item.DC_TYPE) === "CENTER";
  
              return (
                <button
                  key={normalize(item.DC_CODE)}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => handleSelectItem(item)}
                  className={`flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left transition last:border-b-0 ${
                    selected
                      ? "bg-blue-50"
                      : "bg-white hover:bg-slate-50"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
                      isCenter ? "rounded" : "rounded-full"
                    } ${
                      selected
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {selected && (
                      <span className="text-[10px] font-bold">✓</span>
                    )}
                  </span>
  
                  <div className="min-w-0 flex-1">
                    <p
                      className={`break-words text-xs font-bold ${
                        selected ? "text-blue-700" : "text-slate-800"
                      }`}
                    >
                      {item.DC_CODE}
                    </p>
  
                    <p className="mt-0.5 break-words text-[11px] leading-4 text-slate-500">
                      {item.DC_NAME || "-"}
                    </p>
                  </div>
  
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                      centerItem
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {centerItem ? "ส่วนกลาง" : item.DC_TYPE || "DC"}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="px-3 py-6 text-center text-xs text-slate-400">
              ไม่พบรายการ
            </div>
          )}
        </div>
  
        {/* รายการที่เลือก: แถวเดียว ไม่ดันกล่องสูงขึ้น */}
        {selectedItems.length > 0 && (
          <div className="mt-2 flex shrink-0 items-center gap-2 overflow-hidden rounded-lg bg-green-50 px-2 py-1.5">
            <span className="shrink-0 text-[10px] text-green-700">
              เลือกแล้ว
            </span>
  
            <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
              {selectedItems.map((item) => (
                <button
                  key={normalize(item.DC_CODE)}
                  type="button"
                  onClick={() => handleSelectItem(item)}
                  aria-label={`นำ ${item.DC_CODE} ออกจากรายการที่เลือก`}
                  className="shrink-0 whitespace-nowrap rounded-full border border-green-200 bg-white px-2 py-1 text-[10px] font-semibold text-green-700 hover:bg-green-100"
                >
                  {item.DC_CODE} ×
                </button>
              ))}
            </div>
          </div>
        )}
  
        {/* ปุ่มอยู่ในกล่อง ไม่เลื่อนไปกับรายการ */}
        <div className="mt-3 shrink-0">
          {errorText && (
            <p
              role="alert"
              className="mb-2 max-h-12 overflow-y-auto rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-600"
            >
              {errorText}
            </p>
          )}
  
          <button
            type="button"
            onClick={handleContinue}
            disabled={loading || !userData}
            className="w-full rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading
              ? "กำลังโหลด..."
              : selectedItems.length === 0
                ? "ใช้ข้อมูลเดิมของผู้ใช้"
                : `ยืนยันรายการที่เลือก (${selectedItems.length})`}
          </button>
        </div>
      </div>
    </main>
  );
}
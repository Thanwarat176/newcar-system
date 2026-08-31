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
  warehouse?: string;
  WAREHOUSE?: string;
  team?: string;
  TEAM?: string;
  department?: string;
  DEPARTMENT?: string;
  [key: string]: unknown;
};

/*
 * รายการฝ่ายสำหรับผู้ใช้งานส่วนกลาง
 */
const CENTER_DEPARTMENTS: WarehouseItem[] = [
  {
    DC_CODE: "TCIA",
    DC_NAME:
      "ฝ่ายพัฒนาศักยภาพการขนส่งและวิเคราะห์ข้อมูลเชิงลึก",
    DC_TYPE: "CENTER",
  },
  {
    DC_CODE: "KEY_ACCOUNT",
    DC_NAME:
      "ฝ่ายสื่อสารระบบกระจายสินค้าระบบงานขนส่ง",
    DC_TYPE: "CENTER",
  },
  {
    DC_CODE: "IMP",
    DC_NAME:
      "ฝ่ายพัฒนาและเพิ่มประสิทธิภาพระบบงานขนส่ง",
    DC_TYPE: "CENTER",
  },
  {
    DC_CODE: "TCAS",
    DC_NAME:
      "ฝ่ายสัญญาและสนับสนุนงานบริการระบบงานขนส่ง",
    DC_TYPE: "CENTER",
  },
  {
    DC_CODE: "FBP",
    DC_NAME:
      "ฝ่ายดูแลและพัฒนาคู่ค้าระบบงานขนส่ง",
    DC_TYPE: "CENTER",
  },
  {
    DC_CODE: "TSC",
    DC_NAME: "ฝ่ายบริการระบบงานขนส่ง",
    DC_TYPE: "CENTER",
  },
];

export default function SelectDCPage() {
  const router = useRouter();

  const [warehouses, setWarehouses] = useState<
    WarehouseItem[]
  >([]);

  const [selectedItems, setSelectedItems] = useState<
    WarehouseItem[]
  >([]);

  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [isCenter, setIsCenter] = useState(false);

  useEffect(() => {
    const initializePage = async () => {
      try {
        setLoading(true);
        setErrorText("");
  
        const savedUser =
          localStorage.getItem("user");
  
        if (!savedUser) {
          setErrorText(
            "ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบใหม่"
          );
  
          return;
        }
  
        const user = JSON.parse(savedUser);
  
        /*
         * ตรวจจาก User ที่ Login
         * ไม่เกี่ยวกับ warehouse
         */
        const loginUser = String(
          user.em_id ||
            user.employee_id ||
            user.EMPLOYEE_ID ||
            ""
        )
          .trim()
          .toUpperCase();
  
        const centerLogin =
          loginUser === "CENTER";
  
        setIsCenter(centerLogin);
  
        /*
         * โหลด Warehouse API ทุกกรณี
         */
        const res = await fetch(
          "http://192.168.158.210/api_new_truck/api/warehouses.php",
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          }
        );
  
        const data = await res.json();
  
        if (
          !res.ok ||
          data.status !== "success" ||
          !Array.isArray(data.data)
        ) {
          throw new Error(
            "โหลดข้อมูล Warehouse ไม่สำเร็จ"
          );
        }
  
        const apiWarehouses = (
          data.data as WarehouseItem[]
        ).filter((item) => {
          return Boolean(
            String(item.DC_CODE || "").trim()
          );
        });
  
        /*
         * User CENTER:
         * แสดงทั้งฝ่ายส่วนกลางและ Warehouse
         */
        if (centerLogin) {
          const combinedItems = [
            ...CENTER_DEPARTMENTS,
            ...apiWarehouses,
          ];
  
          /*
           * ป้องกัน DC_CODE ซ้ำ
           */
          const uniqueItems =
            combinedItems.filter(
              (item, index, array) => {
                const currentCode = String(
                  item.DC_CODE || ""
                )
                  .trim()
                  .toUpperCase();
  
                return (
                  array.findIndex(
                    (checkItem) =>
                      String(
                        checkItem.DC_CODE || ""
                      )
                        .trim()
                        .toUpperCase() ===
                      currentCode
                  ) === index
                );
              }
            );
  
          setWarehouses(uniqueItems);
  
          /*
           * โหลดฝ่ายและ Warehouse
           * ที่เคยเลือกไว้
           */
          const savedDepartments =
            localStorage.getItem(
              "selected_departments"
            );
  
          const savedDCs =
            localStorage.getItem(
              "selected_dcs"
            );
  
          const selectedCodes: string[] = [];
  
          if (savedDepartments) {
            try {
              const departments =
                JSON.parse(
                  savedDepartments
                ) as Array<{
                  value?: string;
                }>;
  
              departments.forEach((item) => {
                const code = String(
                  item.value || ""
                )
                  .trim()
                  .toUpperCase();
  
                if (code) {
                  selectedCodes.push(code);
                }
              });
            } catch (error) {
              console.error(
                "อ่าน selected_departments ไม่สำเร็จ:",
                error
              );
            }
          }
  
          if (savedDCs) {
            try {
              const selectedWarehouses =
                JSON.parse(
                  savedDCs
                ) as WarehouseItem[];
  
              selectedWarehouses.forEach(
                (item) => {
                  const code = String(
                    item.DC_CODE || ""
                  )
                    .trim()
                    .toUpperCase();
  
                  if (code) {
                    selectedCodes.push(code);
                  }
                }
              );
            } catch (error) {
              console.error(
                "อ่าน selected_dcs ไม่สำเร็จ:",
                error
              );
            }
          }
  
          const restoredItems =
            uniqueItems.filter((item) =>
              selectedCodes.includes(
                String(item.DC_CODE || "")
                  .trim()
                  .toUpperCase()
              )
            );
  
          setSelectedItems(restoredItems);
  
          return;
        }
  
        /*
         * User ทั่วไป:
         * เห็นเฉพาะ Warehouse จาก API
         */
        setWarehouses(apiWarehouses);
  
        const savedSelectedDC =
          localStorage.getItem(
            "selected_dc"
          );
  
        if (savedSelectedDC) {
          try {
            const previousDC =
              JSON.parse(
                savedSelectedDC
              ) as WarehouseItem;
  
            const matchedDC =
              apiWarehouses.find(
                (item) =>
                  String(item.DC_CODE || "")
                    .trim()
                    .toUpperCase() ===
                  String(
                    previousDC.DC_CODE || ""
                  )
                    .trim()
                    .toUpperCase()
              );
  
            if (matchedDC) {
              setSelectedItems([matchedDC]);
            }
          } catch (error) {
            console.error(
              "อ่าน selected_dc ไม่สำเร็จ:",
              error
            );
          }
        }
      } catch (error) {
        console.error(
          "INITIALIZE PAGE ERROR:",
          error
        );
  
        setErrorText(
          "ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง"
        );
      } finally {
        setLoading(false);
      }
    };
  
    initializePage();
  }, []);

  const filteredWarehouses = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) {
      return warehouses;
    }

    return warehouses.filter((item) => {
      const dcCode = String(
        item.DC_CODE || ""
      ).toLowerCase();

      const dcName = String(
        item.DC_NAME || ""
      ).toLowerCase();

      const dcType = String(
        item.DC_TYPE || ""
      ).toLowerCase();

      return (
        dcCode.includes(keyword) ||
        dcName.includes(keyword) ||
        dcType.includes(keyword)
      );
    });
  }, [searchText, warehouses]);

  /*
   * ตรวจสอบว่ารายการถูกเลือกอยู่หรือไม่
   */
  const isItemSelected = (itemCode: string) => {
    const normalizedCode = itemCode.trim().toUpperCase();

    return selectedItems.some(
      (item) =>
        item.DC_CODE.trim().toUpperCase() ===
        normalizedCode
    );
  };

  /*
   * เลือกรายการ
   */
  const handleSelectItem = (item: WarehouseItem) => {
    setErrorText("");

    /*
     * CENTER เลือกได้หลายฝ่าย
     */
    if (isCenter) {
      setSelectedItems((currentItems) => {
        const alreadySelected = currentItems.some(
          (selectedItem) =>
            selectedItem.DC_CODE.trim().toUpperCase() ===
            item.DC_CODE.trim().toUpperCase()
        );

        /*
         * ถ้าเลือกอยู่แล้ว ให้กดเพื่อนำออก
         */
        if (alreadySelected) {
          return currentItems.filter(
            (selectedItem) =>
              selectedItem.DC_CODE.trim().toUpperCase() !==
              item.DC_CODE.trim().toUpperCase()
          );
        }

        /*
         * ถ้ายังไม่ได้เลือก ให้เพิ่มเข้าไป
         */
        return [...currentItems, item];
      });

      return;
    }

    /*
     * Warehouse เลือกได้เพียง 1 DC
     */
    setSelectedItems([item]);
  };

  /*
   * เลือกฝ่ายส่วนกลางทั้งหมด
   */
  const handleSelectAllCenter = () => {
    if (!isCenter) {
      return;
    }

    const allSelected =
      selectedItems.length === CENTER_DEPARTMENTS.length;

    if (allSelected) {
      setSelectedItems([]);
    } else {
      setSelectedItems(CENTER_DEPARTMENTS);
    }

    setErrorText("");
  };

  const handleContinue = () => {
    if (selectedItems.length === 0) {
      setErrorText(
        isCenter
          ? "กรุณาเลือกฝ่ายหรือ Warehouse อย่างน้อย 1 รายการ"
          : "กรุณาเลือก DC ก่อนดำเนินการต่อ"
      );
  
      return;
    }
  
    /*
     * User CENTER เลือกได้หลายรายการ
     */
    if (isCenter) {
      /*
       * แยกรายการฝ่ายส่วนกลาง
       */
      const selectedDepartments =
        selectedItems
          .filter(
            (item) =>
              String(item.DC_TYPE || "")
                .trim()
                .toUpperCase() === "CENTER"
          )
          .map((item) => ({
            value: item.DC_CODE,
            label: item.DC_NAME,
            type: "CENTER",
          }));
  
      /*
       * แยกรายการ Warehouse
       */
      const selectedWarehouses =
        selectedItems
          .filter(
            (item) =>
              String(item.DC_TYPE || "")
                .trim()
                .toUpperCase() !== "CENTER"
          )
          .map((item) => ({
            DC_CODE: item.DC_CODE,
            DC_NAME: item.DC_NAME || "",
            DC_TYPE: item.DC_TYPE || "",
          }));
  
      localStorage.setItem(
        "selected_departments",
        JSON.stringify(
          selectedDepartments
        )
      );
  
      localStorage.setItem(
        "selected_department_codes",
        JSON.stringify(
          selectedDepartments.map(
            (item) => item.value
          )
        )
      );
  
      localStorage.setItem(
        "selected_dcs",
        JSON.stringify(
          selectedWarehouses
        )
      );
  
      /*
       * selected_dc ใช้ DC แรก
       * เพื่อรองรับ Component เดิม
       */
      if (selectedWarehouses.length > 0) {
        localStorage.setItem(
          "selected_dc",
          JSON.stringify(
            selectedWarehouses[0]
          )
        );
      } else {
        localStorage.removeItem(
          "selected_dc"
        );
      }
    } else {
      /*
       * User ทั่วไปเลือกได้ 1 Warehouse
       */
      const selectedDC =
        selectedItems[0];
  
      localStorage.setItem(
        "selected_dc",
        JSON.stringify({
          DC_CODE: selectedDC.DC_CODE,
          DC_NAME:
            selectedDC.DC_NAME || "",
          DC_TYPE:
            selectedDC.DC_TYPE || "",
        })
      );
  
      localStorage.removeItem(
        "selected_dcs"
      );
  
      localStorage.removeItem(
        "selected_departments"
      );
  
      localStorage.removeItem(
        "selected_department_codes"
      );
    }
  
    window.dispatchEvent(
      new Event("selectedDCChanged")
    );
  
    router.push(PATHS.main.addFleet);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 px-4 py-8">
      <div className="w-full max-w-2xl rounded-3xl border border-blue-100 bg-white/90 p-8 shadow-xl backdrop-blur-md">
        {/* หัวข้อ */}
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">
              {isCenter
                ? "เลือกฝ่ายส่วนกลาง"
                : "เลือก DC / Warehouse"}
            </h1>

            {isCenter && (
              <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                CENTER
              </span>
            )}
          </div>

          <p className="mt-2 text-sm text-slate-500">
            {isCenter
              ? "สามารถเลือกฝ่ายส่วนกลางได้มากกว่า 1 ฝ่าย"
              : "กรุณาเลือก DC ก่อนเข้าสู่หน้าเพิ่มกองรถ"}
          </p>
        </div>

        {/* ช่องค้นหา */}
        <div className="mt-6">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            {isCenter ? "ค้นหาฝ่าย" : "ค้นหา DC"}
          </label>

          <input
            type="text"
            value={searchText}
            disabled={loading}
            placeholder={
              loading
                ? "กำลังโหลดข้อมูล..."
                : isCenter
                  ? "ค้นหา เช่น TCIA, TCAS หรือ FBP"
                  : "พิมพ์ DC_CODE หรือชื่อ DC"
            }
            onChange={(event) => {
              setSearchText(event.target.value);
              setErrorText("");
            }}
            className="w-full rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </div>

        {/* ปุ่มเลือกทั้งหมดสำหรับ CENTER */}
        {isCenter && !loading && (
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              เลือกแล้ว {selectedItems.length} 
            </p>

            <button
              type="button"
              onClick={handleSelectAllCenter}
              className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
            >
              {selectedItems.length ===
              CENTER_DEPARTMENTS.length
                ? "ยกเลิกเลือกทั้งหมด"
                : "เลือกทั้งหมด"}
            </button>
          </div>
        )}

        {/* รายการตัวเลือก */}
        <div className="mt-4 max-h-[360px] overflow-y-auto rounded-2xl border border-blue-100 bg-white">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              กำลังโหลดข้อมูล...
            </div>
          ) : filteredWarehouses.length > 0 ? (
            filteredWarehouses.map((item) => {
              const selected = isItemSelected(
                item.DC_CODE
              );

              return (
                <button
                  key={item.DC_CODE}
                  type="button"
                  onClick={() =>
                    handleSelectItem(item)
                  }
                  className={`flex w-full items-center gap-3 border-b border-slate-100 px-4 py-4 text-left transition last:border-b-0 ${
                    selected
                      ? "bg-blue-50"
                      : "bg-white hover:bg-slate-50"
                  }`}
                >
                  {/* Checkbox / Radio */}
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center border transition ${
                      isCenter
                        ? "rounded-md"
                        : "rounded-full"
                    } ${
                      selected
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {selected && (
                      <span className="text-xs font-bold">
                        ✓
                      </span>
                    )}
                  </div>

                  {/* รายละเอียด */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-bold ${
                        selected
                          ? "text-blue-700"
                          : "text-slate-800"
                      }`}
                    >
                      {item.DC_CODE}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {item.DC_NAME || "-"}
                    </p>
                  </div>

                  {/* ประเภท */}
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                      item.DC_TYPE === "CENTER"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {item.DC_TYPE === "CENTER"
                      ? "ส่วนกลาง"
                      : item.DC_TYPE || "DC"}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              {isCenter
                ? "ไม่พบฝ่ายที่ค้นหา"
                : "ไม่พบข้อมูล DC ที่ค้นหา"}
            </div>
          )}
        </div>

        {/* Error */}
        {errorText && (
          <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {errorText}
          </p>
        )}

        {/* รายการที่เลือก */}
        {selectedItems.length > 0 && (
          <div className="mt-4 rounded-2xl border border-green-100 bg-green-50 px-4 py-4">
            <p className="text-sm font-bold text-green-700">
              {isCenter
                ? `เลือกแล้ว ${selectedItems.length} ฝ่าย`
                : "DC ที่เลือก"}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {selectedItems.map((item) => (
                <button
                  key={item.DC_CODE}
                  type="button"
                  onClick={() =>
                    handleSelectItem(item)
                  }
                  className="rounded-full border border-green-200 bg-white px-3 py-1.5 text-xs font-semibold text-green-700 shadow-sm transition hover:bg-green-100"
                  title="กดเพื่อนำออก"
                >
                  {item.DC_CODE}
                  {isCenter ? " ×" : ""}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ปุ่มดำเนินการต่อ */}
        <button
          type="button"
          onClick={handleContinue}
          disabled={
            loading || selectedItems.length === 0
          }
          className="mt-6 w-full rounded-2xl bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          {isCenter
            ? `ยืนยันฝ่ายที่เลือก${
                selectedItems.length > 0
                  ? ` (${selectedItems.length})`
                  : ""
              }`
            : "ไปหน้าเพิ่มกองรถ"}
        </button>
      </div>
    </main>
  );
}
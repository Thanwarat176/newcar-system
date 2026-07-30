"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PATHS } from "../../lib/paths";

type WarehouseItem = {
  DC_NAME: string;
  DC_CODE: string;
  DC_TYPE: string;
};

const CENTER_ITEM: WarehouseItem = {
  DC_CODE: "CENTER",
  DC_NAME: "ส่วนกลาง",
  DC_TYPE: "CENTER",
};

export default function SelectDCPage() {
  const router = useRouter();

  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [selectedDC, setSelectedDC] = useState<WarehouseItem | null>(null);
  const [searchText, setSearchText] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        setLoading(true);
        setErrorText("");

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

        if (!res.ok || data.status !== "success" || !Array.isArray(data.data)) {
          throw new Error("โหลดข้อมูล DC ไม่สำเร็จ");
        }

        const apiWarehouses = data.data as WarehouseItem[];

        const hasCenter = apiWarehouses.some(
          (item) => item.DC_CODE?.toUpperCase() === "CENTER"
        );

        setWarehouses(hasCenter ? apiWarehouses : [CENTER_ITEM, ...apiWarehouses]);

      } catch (error) {
        console.error("FETCH DC ERROR:", error);
        setErrorText("ไม่สามารถโหลดข้อมูล DC ได้");
      } finally {
        setLoading(false);
      }
    };

    fetchWarehouses();
  }, []);

  const filteredWarehouses = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    if (!keyword) {
      return warehouses.filter((item) => item.DC_CODE).slice(0, 20);
    }

    return warehouses
      .filter((item) => {
        const dcCode = item.DC_CODE?.toLowerCase() || "";
        const dcName = item.DC_NAME?.toLowerCase() || "";
        const dcType = item.DC_TYPE?.toLowerCase() || "";

        return (
          dcCode.includes(keyword) ||
          dcName.includes(keyword) ||
          dcType.includes(keyword)
        );
      })
      .slice(0, 30);
  }, [searchText, warehouses]);

  const handleSelectDC = (dc: WarehouseItem) => {
    setSelectedDC(dc);
    setSearchText(`${dc.DC_CODE} - ${dc.DC_NAME || ""}`);
    setShowDropdown(false);
    setErrorText("");
  };

  const handleContinue = () => {
    if (!selectedDC) {
      setErrorText("กรุณาเลือก DC ก่อนดำเนินการต่อ");
      return;
    }

    const selectedDCData = {
      DC_CODE: selectedDC.DC_CODE,
      DC_NAME: selectedDC.DC_NAME || "",
      DC_TYPE: selectedDC.DC_TYPE || "",
    };

    localStorage.setItem("selected_dc", JSON.stringify(selectedDCData));

    // ส่ง event ให้ component อื่น เช่น Sidebar รู้ว่ามีการเปลี่ยน DC
    window.dispatchEvent(new Event("selectedDCChanged"));

    router.push(PATHS.main.addFleet);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 px-4">
      <div className="w-full max-w-xl rounded-3xl border border-blue-100 bg-white/90 p-8 shadow-xl backdrop-blur-md">
        <h1 className="text-2xl font-bold text-slate-800">
          เลือก DC / Warehouse
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          กรุณาเลือกว่าต้องการทำรายการจาก DC ไหน ก่อนเข้าสู่หน้าเพิ่มกองรถ
        </p>

        <div className="relative mt-6">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            พิมพ์ค้นหา DC
          </label>

          <input
            type="text"
            value={searchText}
            disabled={loading}
            placeholder={
              loading ? "กำลังโหลดข้อมูล..." : "พิมพ์ DC_CODE หรือชื่อ DC"
            }
            onFocus={() => setShowDropdown(true)}
            onChange={(e) => {
              setSearchText(e.target.value);
              setSelectedDC(null);
              setShowDropdown(true);
              setErrorText("");
            }}
            className="w-full rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
          />

          {showDropdown && !loading && (
            <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-blue-100 bg-white shadow-xl">
              {filteredWarehouses.length > 0 ? (
                filteredWarehouses.map((item) => {
                  const isCenter = item.DC_CODE?.toUpperCase() === "CENTER";

                  return (
                    <button
                      key={item.DC_CODE}
                      type="button"
                      onClick={() => handleSelectDC(item)}
                      className={`block w-full border-b border-slate-100 px-4 py-3 text-left text-sm transition ${isCenter ? "bg-blue-50 hover:bg-blue-100" : "hover:bg-blue-50"
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`font-bold ${isCenter ? "text-blue-700" : "text-slate-800"
                            }`}
                        >
                          {item.DC_CODE}
                        </div>

                        {isCenter && (
                          <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                            ส่วนกลาง
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500">
                        {item.DC_NAME || "-"}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-3 text-sm text-slate-400">
                  ไม่พบข้อมูล DC ที่ค้นหา
                </div>
              )}
            </div>
          )}

          {errorText && (
            <p className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">
              {errorText}
            </p>
          )}

          {selectedDC && (
            <div className="mt-4 rounded-2xl border border-green-100 bg-green-50 px-4 py-3">
              <p className="text-sm font-bold text-green-700">
                เลือกแล้ว: {selectedDC.DC_CODE}
              </p>
              <p className="text-xs text-green-600">
                {selectedDC.DC_NAME || "-"}
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleContinue}
          disabled={loading}
          className="mt-6 w-full rounded-2xl bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          ไปหน้าเพิ่มกองรถ
        </button>
      </div>
    </main>
  );
}
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Building2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Save,
  Search,
  Star,
} from "lucide-react";

const API_BASE = "http://192.168.158.210/api_new_truck/api";

const SUPPLIERS_API = `${API_BASE}/suppliers.php`;
const RATING_API = `${API_BASE}/rate_supplier.php`;

const PAGE_SIZE = 20;

type Rating = "" | "E" | "G" | "P" | "I";

type SupplierApiItem = Record<string, unknown>;

interface Supplier {
  // ใช้ส่งให้ rate_supplier.php
  id: string;

  // รหัสที่แสดงบนหน้าจอ
  code: string;

  name: string;
}

interface RatingState {
  value: Rating;
  savedValue: Rating;
  loading: boolean;
  saving: boolean;
  loaded: boolean;
  error: string;
  success: string;
}

interface ApiResponse {
  success?: boolean;
  message?: string;
  data?: {
    rating?: unknown;
  } | null;
}

const ratingOptions: {
  value: Rating;
  label: string;
}[] = [
  {
    value: "",
    label: "เลือกระดับคะแนน",
  },
  {
    value: "E",
    label: "E - Excellent",
  },
  {
    value: "G",
    label: "G - Good",
  },
  {
    value: "P",
    label: "P - Pass",
  },
  {
    value: "I",
    label: "I - Improvement Required",
  },
];

const initialRatingState: RatingState = {
  value: "",
  savedValue: "",
  loading: false,
  saving: false,
  loaded: false,
  error: "",
  success: "",
};

function getValueIgnoreCase(
  item: SupplierApiItem,
  ...keys: string[]
): unknown {
  for (const key of keys) {
    const actualKey = Object.keys(item).find(
      (itemKey) => itemKey.toLowerCase() === key.toLowerCase()
    );

    if (!actualKey) continue;

    const value = item[actualKey];

    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return value;
    }
  }

  return "";
}

function toText(value: unknown): string {
  return String(value ?? "").trim();
}

function toRating(value: unknown): Rating {
  const rating = toText(value).toUpperCase();

  if (
    rating === "E" ||
    rating === "G" ||
    rating === "P" ||
    rating === "I"
  ) {
    return rating;
  }

  return "";
}

function normalizeSupplier(item: SupplierApiItem): Supplier {
  // ลำดับการหา ID อิงตามโค้ดเดิมใน FleetModalDetail
  const id = toText(
    getValueIgnoreCase(
      item,
      "id",
      "company_id",
      "supplier_id"
    )
  );

  const name = toText(
    getValueIgnoreCase(
      item,
      "company_name",
      "name"
    )
  );

  // ถ้า API ไม่มีฟิลด์ code จะแสดง ID แทน
  const code =
    toText(
      getValueIgnoreCase(
        item,
        "code",
        "company_code",
        "supplier_code",
        "vendor_code"
      )
    ) || id;

  return {
    id,
    code,
    name,
  };
}

function extractSupplierList(result: unknown): SupplierApiItem[] {
  if (Array.isArray(result)) {
    return result.filter(
      (item): item is SupplierApiItem =>
        item !== null && typeof item === "object"
    );
  }

  if (result && typeof result === "object") {
    const response = result as Record<string, unknown>;

    if (Array.isArray(response.data)) {
      return response.data.filter(
        (item): item is SupplierApiItem =>
          item !== null && typeof item === "object"
      );
    }

    if (Array.isArray(response.result)) {
      return response.result.filter(
        (item): item is SupplierApiItem =>
          item !== null && typeof item === "object"
      );
    }
  }

  throw new Error("รูปแบบข้อมูลรายชื่อผู้ประกอบการไม่ถูกต้อง");
}

async function readJson(response: Response): Promise<ApiResponse> {
  const responseText = await response.text();

  try {
    return JSON.parse(responseText) as ApiResponse;
  } catch {
    const message = responseText
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    throw new Error(
      `API ตอบกลับไม่ใช่ JSON (HTTP ${response.status}): ${
        message.slice(0, 200) || "ไม่มีข้อความตอบกลับ"
      }`
    );
  }
}

export default function SupplierRatingPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ratings, setRatings] = useState<Record<string, RatingState>>({});

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [pageError, setPageError] = useState("");

  const loadSuppliers = useCallback(async () => {
    setLoadingSuppliers(true);
    setPageError("");

    try {
      const response = await fetch(SUPPLIERS_API, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          `โหลดรายชื่อผู้ประกอบการไม่สำเร็จ (HTTP ${response.status})`
        );
      }

      const result: unknown = await response.json();

      const rawItems = extractSupplierList(result);

      const normalized = rawItems
        .map(normalizeSupplier)
        .filter((item) => item.id && item.name);

      // ป้องกันข้อมูลซ้ำจาก API โดยยึด ID ที่ใช้บันทึกคะแนน
      const uniqueItems = Array.from(
        new Map(normalized.map((item) => [item.id, item])).values()
      ).sort((a, b) =>
        a.name.localeCompare(b.name, "th", {
          numeric: true,
        })
      );

      setSuppliers(uniqueItems);
      setRatings({});
      setPage(1);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "เกิดข้อผิดพลาดในการโหลดรายชื่อ"
      );
    } finally {
      setLoadingSuppliers(false);
    }
  }, []);

  useEffect(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  const filteredSuppliers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return suppliers;
    }

    return suppliers.filter((supplier) =>
      [supplier.name, supplier.code, supplier.id].some((value) =>
        value.toLowerCase().includes(keyword)
      )
    );
  }, [suppliers, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredSuppliers.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const visibleSuppliers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;

    return filteredSuppliers.slice(start, start + PAGE_SIZE);
  }, [currentPage, filteredSuppliers]);

  const loadRating = useCallback(async (supplierId: string) => {
    setRatings((current) => ({
      ...current,
      [supplierId]: {
        ...(current[supplierId] || initialRatingState),
        loading: true,
        error: "",
        success: "",
      },
    }));

    try {
      const response = await fetch(
        `${RATING_API}?id=${encodeURIComponent(supplierId)}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      const result = await readJson(response);

      if (!response.ok || result.success !== true) {
        throw new Error(
          result.message ||
            `โหลดคะแนนไม่สำเร็จ (HTTP ${response.status})`
        );
      }

      const rating = toRating(result.data?.rating);

      setRatings((current) => ({
        ...current,
        [supplierId]: {
          ...(current[supplierId] || initialRatingState),
          value: rating,
          savedValue: rating,
          loading: false,
          loaded: true,
          error: "",
          success: "",
        },
      }));
    } catch (error) {
      setRatings((current) => ({
        ...current,
        [supplierId]: {
          ...(current[supplierId] || initialRatingState),
          loading: false,
          loaded: true,
          error:
            error instanceof Error
              ? error.message
              : "โหลดคะแนนไม่สำเร็จ",
          success: "",
        },
      }));
    }
  }, []);

  // โหลดคะแนนเฉพาะผู้ประกอบการที่แสดงในหน้าปัจจุบัน
  useEffect(() => {
    for (const supplier of visibleSuppliers) {
      const state = ratings[supplier.id];

      if (!state || (!state.loaded && !state.loading)) {
        void loadRating(supplier.id);
      }
    }
  }, [visibleSuppliers, ratings, loadRating]);

  const handleRatingChange = (
    supplierId: string,
    value: string
  ) => {
    setRatings((current) => ({
      ...current,
      [supplierId]: {
        ...(current[supplierId] || initialRatingState),
        value: toRating(value),
        error: "",
        success: "",
      },
    }));
  };

  const saveRating = async (supplier: Supplier) => {
    const currentRating = ratings[supplier.id];

    if (!currentRating?.value) {
      setRatings((current) => ({
        ...current,
        [supplier.id]: {
          ...(current[supplier.id] || initialRatingState),
          error: "กรุณาเลือกระดับคะแนน",
          success: "",
        },
      }));

      return;
    }

    const ratingToSave = currentRating.value;

    setRatings((current) => ({
      ...current,
      [supplier.id]: {
        ...(current[supplier.id] || initialRatingState),
        saving: true,
        error: "",
        success: "",
      },
    }));

    try {
      const response = await fetch(RATING_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          id: supplier.id,
          rating: ratingToSave,
        }),
      });

      const result = await readJson(response);

      if (!response.ok || result.success !== true) {
        throw new Error(
          result.message ||
            `บันทึกคะแนนไม่สำเร็จ (HTTP ${response.status})`
        );
      }

      setRatings((current) => ({
        ...current,
        [supplier.id]: {
          ...(current[supplier.id] || initialRatingState),
          value: ratingToSave,
          savedValue: ratingToSave,
          saving: false,
          loaded: true,
          error: "",
          success: "บันทึกคะแนนเรียบร้อยแล้ว",
        },
      }));
    } catch (error) {
      setRatings((current) => ({
        ...current,
        [supplier.id]: {
          ...(current[supplier.id] || initialRatingState),
          saving: false,
          error:
            error instanceof Error
              ? error.message
              : "บันทึกคะแนนไม่สำเร็จ",
          success: "",
        },
      }));
    }
  };

  const startItem =
    filteredSuppliers.length === 0
      ? 0
      : (currentPage - 1) * PAGE_SIZE + 1;

  const endItem = Math.min(
    currentPage * PAGE_SIZE,
    filteredSuppliers.length
  );

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* หัวข้อหน้า */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-white shadow-sm">
              <Star className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">
                ให้คะแนนผู้ประกอบการ
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                ค้นหาและกำหนดคะแนนผู้ให้บริการรถ
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadSuppliers()}
            disabled={loadingSuppliers}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loadingSuppliers ? "animate-spin" : ""
              }`}
            />
            โหลดข้อมูลใหม่
          </button>
        </div>

        {/* ช่องค้นหา */}
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full sm:max-w-md">
              <label
                htmlFor="supplier-search"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                ค้นหาผู้ประกอบการ
              </label>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  id="supplier-search"
                  type="text"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="ค้นหาชื่อซับ หรือรหัส"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="text-sm text-slate-500">
              พบ{" "}
              <span className="font-bold text-slate-800">
                {filteredSuppliers.length.toLocaleString()}
              </span>{" "}
              รายการ
            </div>
          </div>
        </div>

        {/* ข้อผิดพลาดระดับหน้า */}
        {pageError && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {pageError}
          </div>
        )}

        {/* ตาราง */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-700" />

              <h2 className="text-sm font-bold text-slate-800">
                รายชื่อผู้ประกอบการ
              </h2>
            </div>
          </div>

          {loadingSuppliers ? (
            <div className="px-4 py-16 text-center text-sm text-slate-500">
              กำลังโหลดรายชื่อผู้ประกอบการ...
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <Building2 className="mx-auto mb-3 h-9 w-9 text-slate-300" />

              <p className="text-sm font-semibold text-slate-600">
                ไม่พบข้อมูลผู้ประกอบการ
              </p>

              <p className="mt-1 text-xs text-slate-400">
                ลองค้นหาด้วยชื่อหรือรหัสอื่น
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left">
                  <thead className="bg-slate-50">
                    <tr className="text-xs font-semibold text-slate-500">
                      <th className="w-20 px-4 py-3 text-center">
                        ลำดับ
                      </th>

                      <th className="w-40 px-4 py-3">
                        รหัสซับ
                      </th>

                      <th className="px-4 py-3">
                        ชื่อผู้ประกอบการ
                      </th>

                      <th className="w-72 px-4 py-3">
                        คะแนน
                      </th>

                      <th className="w-32 px-4 py-3 text-center">
                        จัดการ
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {visibleSuppliers.map((supplier, index) => {
                      const ratingState =
                        ratings[supplier.id] || initialRatingState;

                      const hasChanges =
                        ratingState.value !== ratingState.savedValue;

                      return (
                        <tr
                          key={supplier.id}
                          className="align-top transition hover:bg-slate-50/70"
                        >
                          <td className="px-4 py-4 text-center text-sm text-slate-500">
                            {(currentPage - 1) * PAGE_SIZE + index + 1}
                          </td>

                          <td className="px-4 py-4">
                            <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                              {supplier.code || "-"}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <p className="text-sm font-semibold text-slate-800">
                              {supplier.name}
                            </p>
                          </td>

                          <td className="px-4 py-3">
                            <select
                              aria-label={`คะแนน ${supplier.name}`}
                              value={ratingState.value}
                              onChange={(event) =>
                                handleRatingChange(
                                  supplier.id,
                                  event.target.value
                                )
                              }
                              disabled={
                                ratingState.loading ||
                                ratingState.saving ||
                                !!ratingState.error &&
                                  !ratingState.savedValue &&
                                  ratingState.value === ""
                              }
                              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                            >
                              {ratingOptions.map((option) => (
                                <option
                                  key={option.value || "empty"}
                                  value={option.value}
                                >
                                  {option.label}
                                </option>
                              ))}
                            </select>

                            {ratingState.loading && (
                              <p className="mt-1 text-xs text-slate-400">
                                กำลังโหลดคะแนน...
                              </p>
                            )}

                            {!ratingState.loading &&
                              ratingState.loaded &&
                              !ratingState.error &&
                              !ratingState.savedValue && (
                                <p className="mt-1 text-xs text-slate-400">
                                  ยังไม่มีคะแนน
                                </p>
                              )}

                            {hasChanges && !ratingState.error && (
                              <p className="mt-1 text-xs text-amber-600">
                                มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก
                              </p>
                            )}

                            {ratingState.error && (
                              <div className="mt-1">
                                <p
                                  role="alert"
                                  className="text-xs text-rose-600"
                                >
                                  {ratingState.error}
                                </p>

                                {!ratingState.value && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void loadRating(supplier.id)
                                    }
                                    className="mt-1 text-xs font-semibold text-blue-700 underline"
                                  >
                                    โหลดคะแนนอีกครั้ง
                                  </button>
                                )}
                              </div>
                            )}

                            {ratingState.success && (
                              <p
                                role="status"
                                className="mt-1 text-xs text-emerald-600"
                              >
                                {ratingState.success}
                              </p>
                            )}
                          </td>

                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => void saveRating(supplier)}
                              disabled={
                                !ratingState.value ||
                                ratingState.loading ||
                                ratingState.saving ||
                                !hasChanges
                              }
                              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-blue-700 px-3 text-xs font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                            >
                              <Save className="h-4 w-4" />

                              {ratingState.saving
                                ? "กำลังบันทึก..."
                                : "บันทึก"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* เปลี่ยนหน้า */}
              <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  แสดง {startItem.toLocaleString()} -{" "}
                  {endItem.toLocaleString()} จาก{" "}
                  {filteredSuppliers.length.toLocaleString()} รายการ
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                    disabled={currentPage <= 1}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    ก่อนหน้า
                  </button>

                  <span className="min-w-20 text-center text-xs font-semibold text-slate-600">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) =>
                        Math.min(totalPages, current + 1)
                      )
                    }
                    disabled={currentPage >= totalPages}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ถัดไป
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <p className="mt-4 text-xs text-slate-400">
          คะแนนที่บันทึกในหน้านี้ใช้ API เดียวกับส่วนให้คะแนนในรายละเอียดคำขอ
        </p>
      </div>
    </div>
  );
}
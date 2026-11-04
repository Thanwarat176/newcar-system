"use client";

import React, { useEffect, useState } from "react";

import WarehouseVehicleRequestModal, {
  type VehicleRequestModalProps,
} from "./WarehouseVehicleRequestModal";

import CenterVehicleRequestModal from "./CenterVehicleRequestModal";

export type {
  ProviderOption,
} from "./CenterVehicleRequestModal";

type Props = Omit<
  VehicleRequestModalProps,
  "renderSourceTabs"
>;

const normalize = (value: unknown): string =>
  String(value ?? "").trim().toUpperCase();

function readStorage(key: string): unknown {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function canAccessCenter(): boolean {
  const user = readStorage("user");

  if (!isRecord(user)) return false;

  // บัญชีเดิมต้องเป็น CENTER ก่อน
  const warehouse =
    normalize(user.warehouse) ||
    normalize(user.WAREHOUSE);

  if (warehouse !== "CENTER") {
    return false;
  }

  const departments = readStorage(
    "selected_departments"
  );
  const dcs = readStorage("selected_dcs");
  const dc = readStorage("selected_dc");

  const hasSelectedDepartment =
    Array.isArray(departments) &&
    departments.some(
      (item) =>
        isRecord(item) &&
        normalize(item.value) !== "" &&
        normalize(item.type) === "CENTER"
    );

  const hasSelectedWarehouse =
    (Array.isArray(dcs) &&
      dcs.some(
        (item) =>
          isRecord(item) &&
          normalize(item.DC_CODE) !== ""
      )) ||
    (isRecord(dc) &&
      normalize(dc.DC_CODE) !== "");

  // เลือกฝ่ายส่วนกลาง → เห็น TC
  if (hasSelectedDepartment) {
    return true;
  }

  // เลือกเฉพาะคลัง → ซ่อน TC
  if (hasSelectedWarehouse) {
    return false;
  }

  // ไม่เลือกอะไร → ใช้ข้อมูลเดิมของบัญชี CENTER
  return true;
}

export default function NewVehicleRequestModal(
  props: Props
) {
  if (!props.open) return null;

  return <RequestSourceSwitch {...props} />;
}

function RequestSourceSwitch(props: Props) {
  const [source, setSource] =
    useState<"DC" | "TC">("DC");

  const [isCenter, setIsCenter] = useState(false);

  useEffect(() => {
    const updatePermission = () => {
      const allowed = canAccessCenter();

      setIsCenter(allowed);

      if (!allowed) {
        setSource("DC");
      }
    };

    updatePermission();

    const events = [
      "userChanged",
      "selectedDCChanged",
      "selectedDepartmentsChanged",
      "storage",
      "focus",
    ];

    events.forEach((event) => {
      window.addEventListener(
        event,
        updatePermission
      );
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(
          event,
          updatePermission
        );
      });
    };
  }, []);

  const renderSourceTabs = (saving: boolean) => {
    if (!isCenter) return null;

    return (
      <div
        role="tablist"
        aria-label="แหล่งคำขอออกรถใหม่"
        className="mb-4 flex gap-2 rounded-xl bg-slate-100 p-1"
      >
        {(
          [
            {
              value: "DC",
              label: "คำขอจากคลัง",
            },
            {
              value: "TC",
              label: "คำขอจากส่วนกลาง",
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={source === tab.value}
            disabled={saving}
            onClick={() => setSource(tab.value)}
            className={`flex-1 rounded-lg px-4 py-2.5 font-semibold transition ${
              source === tab.value
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-500 hover:text-blue-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  };

  if (isCenter && source === "TC") {
    return (
      <CenterVehicleRequestModal
        {...props}
        renderSourceTabs={renderSourceTabs}
      />
    );
  }

  return (
    <WarehouseVehicleRequestModal
      {...props}
      renderSourceTabs={renderSourceTabs}
    />
  );
}
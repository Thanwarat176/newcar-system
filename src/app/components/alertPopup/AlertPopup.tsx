"use client";

type AlertType = "success" | "error" | "warning" | "info";

interface AlertPopupProps {
  type: AlertType;
  message: string;
}

export default function AlertPopup({
  type,
  message,
}: AlertPopupProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
      <div
        className={`pointer-events-auto min-w-[320px] max-w-[420px] rounded-2xl border px-5 py-4 shadow-2xl backdrop-blur-xl animate-[fadeIn_.25s_ease]
        
        ${
          type === "success"
            ? "border-green-200 bg-green-50/95 text-green-700"
            : type === "error"
            ? "border-red-200 bg-red-50/95 text-red-700"
            : type === "warning"
            ? "border-yellow-200 bg-yellow-50/95 text-yellow-700"
            : "border-blue-200 bg-blue-50/95 text-blue-700"
        }`}
        role="alert"
      >
        <div className="flex items-center">
          <svg
            className="me-3 h-5 w-5 shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8h.01M11 12h1v4h1m-1-12a9 9 0 100 18 9 9 0 000-18z"
            />
          </svg>

          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold whitespace-nowrap">
              {type === "success"
                ? "สำเร็จ"
                : type === "error"
                ? "เกิดข้อผิดพลาด"
                : type === "warning"
                ? "แจ้งเตือน"
                : "ข้อมูล"}
            </p>

            <p className="text-sm opacity-90">
              {message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
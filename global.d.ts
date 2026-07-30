import type React from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "calendar-date": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          value?: string;
          min?: string;
          max?: string;
          onchange?: (event: any) => void;
        },
        HTMLElement
      >;

      "calendar-month": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}

export {};
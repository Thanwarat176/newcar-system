import "./globals.css";
import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
// import { ThemeProvider } from "./components/theme-provider";

const noto = Noto_Sans_Thai({
  weight: ["400", "500", "600", "700"],
  subsets: ["thai"],
  variable: "--font-noto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "New Vehicle System",
  description: "Powered by Improvement Transportation Team",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning className={noto.variable}>
      <body className="font-noto text-base-content text-gray-800">
          {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "دوّار — ألعاب البث التفاعلية",
  description: "منصة ألعاب تفاعلية للبث المباشر"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <Providers>
          <NavBar />
          {children}
        </Providers>
      </body>
    </html>
  );
}

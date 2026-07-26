import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sora",
});

export const metadata: Metadata = {
  title: "Calume CRM",
  description: "CRM inmobiliario de Desarrolladora Calume",
  icons: { icon: "/brand/calume-icon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" className={sora.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

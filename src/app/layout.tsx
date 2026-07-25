import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Calume CRM",
  description: "CRM inmobiliario de Desarrolladora Calume",
  icons: { icon: "/brand/calume-icon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

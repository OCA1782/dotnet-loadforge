import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "LoadForge",
  description: "Modern Load Testing Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

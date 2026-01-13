import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Grocery AI",
  description: "Wizard-of-Oz research tool prototype"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

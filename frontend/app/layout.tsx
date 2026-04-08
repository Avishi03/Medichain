import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "MediChain — Fake Medicine Detection",
  description:
    "Verify the authenticity of any medicine using blockchain technology. Every medicine. Verified. Always.",
  keywords: ["blockchain", "medicine", "pharmaceutical", "supply chain", "ethereum", "verification"],
  openGraph: {
    title: "MediChain — Fake Medicine Detection",
    description: "Scan any QR code to instantly verify if your medicine is genuine.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-text-primary min-h-screen">
        <Navbar />
        <main className="pt-16">{children}</main>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#0D1528",
              color: "#F1F5F9",
              border: "1px solid #1E2D45",
              borderRadius: "12px",
            },
            success: {
              iconTheme: { primary: "#00C9A7", secondary: "#0D1528" },
            },
            error: {
              iconTheme: { primary: "#EF4444", secondary: "#0D1528" },
            },
          }}
        />
      </body>
    </html>
  );
}

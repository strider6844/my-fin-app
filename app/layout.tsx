import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

export const metadata: Metadata = {
  title: "my-fin-app — Management Reporting",
  description:
    "Ingest trial balances, compute management P&L variances, edit commentary, and publish board-ready reports.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex min-h-screen flex-col md:flex-row">
          <Sidebar />
          <div className="min-w-0 flex-1">
            <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}

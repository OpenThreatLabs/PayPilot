import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "PayPilot — Autonomous Financial Engine & Spend Guardian",
  description: "Enterprise subscription and recurring payment management powered by PayPal and Agentic AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-[#171719] text-[#ffffff]">
        <Toaster 
          theme="dark" 
          position="top-right" 
          toastOptions={{
            style: {
              background: '#131217',
              borderColor: '#222224',
              color: '#ffffff',
              fontSize: '13px',
              fontFamily: 'inherit',
            }
          }}
        />
        {children}
      </body>
    </html>
  );
}

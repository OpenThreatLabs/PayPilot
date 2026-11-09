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
          position="bottom-right" 
          closeButton
          duration={2500}
          visibleToasts={3}
          toastOptions={{
            duration: 2500,
            style: {
              background: '#141519',
              borderColor: '#26262b',
              color: '#ffffff',
              fontSize: '13px',
              fontFamily: 'inherit',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
            },
            classNames: {
              closeButton: '!bg-[#222224] !text-[#86868b] hover:!text-white !border-[#333336]',
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { GlobalSecurity } from './components/GlobalSecurity';
import { ToastProvider } from "./context/ToastContext";

export const metadata: Metadata = {
  title: "Smart EDMS",
  description: "Browse documents and analyze images from the EDMS.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans">
        <GlobalSecurity />
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
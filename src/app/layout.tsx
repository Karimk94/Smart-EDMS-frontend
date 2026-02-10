import type { Metadata } from "next";
import "./globals.css";
import { GlobalSecurity } from './components/GlobalSecurity';
import { ToastProvider } from "./context/ToastContext";
import { UserProvider } from "./context/UserContext";
import Providers from "./providers";

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
          <Providers>
            <UserProvider>
              {children}
            </UserProvider>
          </Providers>
        </ToastProvider>
      </body>
    </html>
  );
}
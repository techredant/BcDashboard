import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "BroadCast Admin — Mobile Operations",
  description: "BroadCast admin console for managing the mobile platform",
  authors: [{ name: "BroadCast" }],
  openGraph: {
    title: "BroadCast Admin",
    description: "Operations dashboard for the BroadCast mobile app",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@BroadCast",
  },
  icons: {
    icon: "/icon.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

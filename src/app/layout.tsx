import type { Metadata } from "next";
import { BEE_ROLE_ICON_PATHS } from "@/lib/config/bee-role-icons";
import "./globals.css";

export const metadata: Metadata = {
  title: "HivemindOS",
  applicationName: "HivemindOS",
  description: "Local-first control room for HivemindOS fleets.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {BEE_ROLE_ICON_PATHS.map((href) => (
          <link key={href} rel="preload" as="image" href={href} />
        ))}
      </head>
      <body>{children}</body>
    </html>
  );
}

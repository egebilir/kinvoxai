import type { Metadata } from "next";
import "./globals.css";
import { LocaleProvider } from "../i18n/LocaleProvider";

export const metadata: Metadata = {
  title: "KinvoxAI – AI-Powered Creative Platform",
  description:
    "Generate text, images, and audio with cutting-edge AI models. KinvoxAI brings creative AI tools together in one platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}

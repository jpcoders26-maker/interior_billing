import "./globals.css";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Teakworks";

export const metadata = {
  title: APP_NAME + " — Quote to Cash ERP",
  description: "Furniture quotation-to-invoice ERP/CRM with GST billing.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

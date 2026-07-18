import type { Metadata, Viewport } from "next";
import { Montserrat, Inter } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["400", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  themeColor: "#b60065",
};

export const metadata: Metadata = {
  title: "Super IN – Domicilios de comida típica en Barranquilla",
  description: "Disfruta del mejor almuerzo casero y comida típica a domicilio en Barranquilla y Soledad. Realiza tu pedido en línea rápido o cotiza eventos especiales.",
  keywords: ["domicilios", "comida típica", "almuerzos", "Barranquilla", "Soledad", "eventos", "catering"],
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Super IN",
  },
  openGraph: {
    title: "Super IN – Domicilios de comida típica en Barranquilla",
    description: "Disfruta del mejor almuerzo casero y comida típica a domicilio en Barranquilla y Soledad.",
    locale: "es_CO",
    type: "website",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "name": "Super IN",
    "image": "https://lh3.googleusercontent.com/aida-public/AB6AXuACbxDzIS5TpzpHjUnqgnSh-l5bPnVhVjrv0d9iZR2XxFzv2KcJIaWY1gLoikX1pbx26N8zQLQkVBmpNqZXN0FzUWruU9m1vv8V-At-XSKzmOUNTS5XkLCkdG89ar_oU4Z1YBQwt4lVUH-pntrFMaRv3MYqqIwewMfnCgaEV4nsbDk-Ehr5ypYFdWfm8jcZqLGZ9BxxKK01C7LclYFeK_0KkJb5qV9zP3KKX5_5AVlZN3C04YM3NNhizm24bPy7NxCRi-ULPhgIISE",
    "priceRange": "$$",
    "telephone": "+573001234567",
    "servesCuisine": "Colombian, Regional",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Barranquilla",
      "addressLocality": "Barranquilla",
      "addressRegion": "Atlántico",
      "addressCountry": "CO"
    },
    "openingHoursSpecification": {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": [
        "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
      ],
      "opens": "10:00",
      "closes": "15:00"
    },
    "hasMenu": {
      "@type": "FoodMenu",
      "name": "Menú del Día Super IN",
      "description": "Platos típicos costeños del día y almuerzos armables personalizados",
      "inLanguage": "es"
    }
  };

  return (
    <html
      lang="es"
      className={`${montserrat.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-on-background">
        {children}
      </body>
    </html>
  );
}

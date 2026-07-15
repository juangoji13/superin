import { CartProvider } from '@/context/CartContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        {/* pt-0 on mobile since there is no fixed top bar, pt-20 on desktop for the fixed header */}
        {/* pb-16 on mobile for the fixed bottom navigation bar */}
        <main className="flex-1 flex flex-col md:pt-20 pb-16 md:pb-0">
          {children}
        </main>
        <Footer />
      </div>
    </CartProvider>
  );
}

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-primary text-on-primary py-xl px-container-margin md:px-xl mt-auto relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container rounded-full opacity-20 blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-xl relative z-10">
        <div className="flex flex-col gap-sm">
          <div className="font-headline-lg text-headline-lg font-bold tracking-tight mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-[32px] text-secondary-container">restaurant_menu</span>
            Super IN
          </div>
          <p className="font-body-md text-sm text-on-primary/80 max-w-sm">
            Los mejores almuerzos ejecutivos directos a tu mesa. Preparados al día con ingredientes frescos para acompañar tu jornada laboral.
          </p>
        </div>
        
        <div className="flex flex-col gap-sm">
          <h4 className="font-title-md font-bold mb-2">Enlaces Rápidos</h4>
          <nav className="flex flex-col gap-3 font-body-md text-sm text-on-primary/80">
            <Link href="/" className="hover:text-white transition-colors w-fit">Inicio</Link>
            <Link href="/domicilios" className="hover:text-white transition-colors w-fit">Menú del Día</Link>
            <Link href="/eventos" className="hover:text-white transition-colors w-fit">Salón de Eventos</Link>
            <Link href="/carrito" className="hover:text-white transition-colors w-fit">Mi Pedido</Link>
          </nav>
        </div>
        
        <div className="flex flex-col gap-sm">
          <h4 className="font-title-md font-bold mb-2">Contáctanos</h4>
          <div className="flex flex-col gap-3 font-body-md text-sm text-on-primary/80">
            <a href="tel:+573004870606" className="flex items-center gap-2 hover:text-white transition-colors w-fit">
              <span className="material-symbols-outlined text-[18px]">call</span>
              +57 300 4870606
            </a>
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] mt-0.5">location_on</span>
              <p>Cl. 70 #43-37 Nte.<br/>Centro Histórico, Barranquilla</p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="material-symbols-outlined text-[18px]">schedule</span>
              Lunes a Sábado: 09:00 AM - 05:30 PM
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto mt-xl pt-lg border-t border-on-primary/20 flex flex-col md:flex-row justify-between items-center gap-md relative z-10 text-xs text-on-primary/60 font-medium">
        <p>© {new Date().getFullYear()} Super IN. Todos los derechos reservados.</p>
        <p className="flex items-center gap-1">
          Hecho con <span className="material-symbols-outlined text-[14px] text-error" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span> en Barranquilla
        </p>
      </div>
    </footer>
  );
}

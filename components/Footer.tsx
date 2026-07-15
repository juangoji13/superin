export default function Footer() {
  return (
    <footer className="bg-surface-container-high py-xl px-container-margin md:px-xl border-t border-outline-variant/50 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-lg">
        <div className="text-center md:text-left">
          <div className="font-headline-lg text-headline-lg text-primary font-bold tracking-tight mb-2">
            Super IN
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Barranquilla, Colombia
          </p>
        </div>
        <div className="flex gap-md text-on-surface-variant">
          <span className="font-body-md text-body-md">Precios en COP</span>
        </div>
      </div>
    </footer>
  );
}

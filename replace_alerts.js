const fs = require('fs');
const path = require('path');

const files = [
  'app/reparto/page.tsx',
  'app/admin/pedidos/page.tsx',
  'app/admin/menu/page.tsx',
  'app/cocina/page.tsx',
  'app/admin/ajustes/page.tsx',
  'app/(client)/pedido/[id]/page.tsx',
  'app/(client)/domicilios/page.tsx',
  'app/(client)/carrito/page.tsx'
];

files.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (!fs.existsSync(fullPath)) return;

  let content = fs.readFileSync(fullPath, 'utf8');
  
  if (content.includes('alert(')) {
    // Add import if missing
    if (!content.includes('react-hot-toast')) {
      // Find last import
      const lines = content.split('\n');
      let lastImportIndex = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('import ')) {
          lastImportIndex = i;
        }
      }
      lines.splice(lastImportIndex + 1, 0, "import { toast } from 'react-hot-toast';");
      content = lines.join('\n');
    }

    // Replace alerts
    content = content.replace(/alert\((.*?)\)/g, (match, p1) => {
      const lower = p1.toLowerCase();
      if (lower.includes('error') || lower.includes('no se pudo') || lower.includes('por favor') || lower.includes('solo se pueden')) {
        return `toast.error(${p1})`;
      } else if (lower.includes('correctamente') || lower.includes('éxito')) {
        return `toast.success(${p1})`;
      }
      return `toast(${p1})`;
    });

    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});

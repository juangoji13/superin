import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Super IN Delivery',
    short_name: 'Super IN',
    description: 'La mejor comida casera, a tu puerta.',
    start_url: '/',
    display: 'standalone',
    background_color: '#E8FBFF',
    theme_color: '#E3037F',
    icons: [
      {
        src: '/icon-512x512.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}

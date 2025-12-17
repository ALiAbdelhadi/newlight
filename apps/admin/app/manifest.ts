import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        "name": "New Light Admin",
        "short_name": "NL Admin",
        "description": "Admin panel for New Light ecommerce",
        "orientation": "any",
        "dir": "ltr",
        "lang": "en",
        "start_url": "/",
        "scope": "/",
        "icons": [
            {
                "src": "/icon-192x192.png",
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "any"
            },
            {
                "src": "/icon-192x192.png",
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "maskable"
            },
            {
                "src": "/icon-512x512.png",
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "any"
            },
            {
                "src": "/icon-512x512.png",
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "maskable"
            }
        ],
        "theme_color": "#ffffff",
        "background_color": "#ffffff",
        "display": "standalone",
        "categories": ["business", "productivity"]
    }
}


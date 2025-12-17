# PWA Setup Instructions for Admin App

## Icons Required

To complete the PWA setup, you need to add the following icon files to `apps/admin/public/`:

1. `icon-192x192.png` - 192x192 pixels
2. `icon-512x512.png` - 512x512 pixels

## How to Generate Icons

### Option 1: Using Online Tools
1. Visit https://realfavicongenerator.net/ or https://www.pwabuilder.com/imageGenerator
2. Upload your logo/icon (at least 512x512px)
3. Generate and download the PWA icons
4. Place the 192x192 and 512x512 icons in `apps/admin/public/`

### Option 2: Using Image Editing Software
1. Create or use your existing logo
2. Resize to 192x192 and 512x512 pixels
3. Save as PNG files
4. Place in `apps/admin/public/`

### Option 3: Copy from www app (temporary)
If you want to use the same icons as the main site temporarily:
```bash
cp apps/www/public/web-app-manifest-192x192.png apps/admin/public/icon-192x192.png
cp apps/www/public/web-app-manifest-512x512.png apps/admin/public/icon-512x512.png
```

## Testing PWA

After adding the icons:

1. Build the app: `pnpm build` (in apps/admin)
2. Start production server: `pnpm start`
3. Open in browser (Chrome/Edge recommended)
4. Look for "Install" button in address bar
5. Or check DevTools > Application > Manifest

## Notes

- PWA features are disabled in development mode
- Service worker only registers in production builds
- Icons must be in PNG format
- Icons should have transparent backgrounds for best results



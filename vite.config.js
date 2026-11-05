import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// base: './' → 어느 경로(GitHub Pages 하위 경로 포함)에 올려도 동작한다.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: '더바른행정사법인 계약서 작성',
        short_name: '더바른행정사법인 계약서 작성',
        description: '더바른행정사법인 행정사 대행 계약서를 휴대전화에서 작성하는 앱',
        lang: 'ko',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f3f4f6',
        theme_color: '#1e3a8a',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 앱 본체는 설치 시 미리 저장 → 오프라인에서도 열림
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        // 글자 인식 엔진(약 5MB)은 처음 쓸 때 내려받아 저장 (앱 설치를 가볍게)
        globIgnores: ['ocr/**', '**/tesseract*.js'],
        navigateFallback: 'index.html',
        // 한글 웹폰트 조각(woff2)은 처음 쓰일 때 저장
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/ocr/'),
            handler: 'CacheFirst',
            options: { cacheName: 'ocr', expiration: { maxEntries: 20 } },
          },
          {
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', expiration: { maxEntries: 400 } },
          },
        ],
      },
    }),
  ],
});

import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    // 關鍵：使用相對路徑，這樣拖曳到 Netlify 或丟到 GitHub Pages 都不會白畫面
    base: './', 
    plugins: [react(), tailwindcss(), {
      name:'offline-app-shell', apply:'build',
      closeBundle(){
        const files=fs.readdirSync('dist/assets').filter(f=>/\.(js|css)$/.test(f)).map(f=>'./assets/'+f);
        const version='healthguardian-'+Date.now();
        const script=`const CACHE=${JSON.stringify(version)};const FILES=${JSON.stringify(['./','./index.html',...files])};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('healthguardian-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/'))return;
if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.open(CACHE).then(c=>c.match('./index.html'))));return;}
if(url.pathname.includes('/assets/'))event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));});`;
        fs.writeFileSync(path.join('dist','sw.js'),script);
      }
    }],
    server: {
      host: true,
      port: 5173,
      allowedHosts: true,
    },

  };
});
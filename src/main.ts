import { createApp } from 'vue'
import App from './App.vue'
import './styles/main.css'

createApp(App).mount('#app')

// PWA: register service worker (v1.10) — https or localhost only
if ('serviceWorker' in navigator) {
  const isSecure = location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname)
  if (isSecure) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        // registration failure is non-fatal (e.g. subpath deploy restrictions)
      })
    })
  }
}

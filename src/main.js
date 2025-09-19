import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useSettingsStore } from '@/stores/settings'
import App from './App.vue'
import router from './router'
import './assets/styles/variables.css'
import './assets/styles/global.css'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(ElementPlus)
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
app.mount('#app')

// Persist settings after Pinia is installed
try {
  const settings = useSettingsStore()
  settings.$subscribe((_mutation, state) => {
    try { localStorage.setItem('settings', JSON.stringify(state)) } catch {}
  })
} catch {}



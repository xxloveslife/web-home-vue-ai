<template>
  <div class="app-layout" :navbar-position="navbarPosition">
    <Sidebar v-if="isLeftNavbar" />
    <router-view />
  </div>
  
</template>

<script>
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import Sidebar from './views/Home/Sidebar.vue'
export default {
  name: 'App',
  components: { Sidebar },
  setup() {
    const settings = useSettingsStore()
    const navbarPosition = computed(() => settings.navbarPosition)
    const isLeftNavbar = computed(() => settings.isLeftNavbar)
    return { navbarPosition, isLeftNavbar }
  }
}
</script>

<style>
html, body, #app { height: 100%; }
body { margin: 0; }
.app-layout { display:flex; height: 100%; }
.app-layout[navbar-position="left"] > *:last-child { flex: 1; }
</style>



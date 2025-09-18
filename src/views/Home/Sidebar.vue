<template>
  <div class="sidebar">
    <el-tooltip content="对话" placement="right">
      <el-button :class="['icon-btn', isActive('/') && 'active']" text @click="goHome"><el-icon><ChatLineSquare /></el-icon></el-button>
    </el-tooltip>
    <el-tooltip content="应用（占位）" placement="right">
      <el-button :class="['icon-btn', isActive('/apps') && 'active']" text @click="goApps"><el-icon><Grid /></el-icon></el-button>
    </el-tooltip>
    <el-tooltip content="翻译（占位）" placement="right">
      <el-button :class="['icon-btn', isActive('/translate') && 'active']" text @click="goTranslate"><el-icon><Notebook /></el-icon></el-button>
    </el-tooltip>
    <el-tooltip content="文件（占位）" placement="right">
      <el-button :class="['icon-btn', isActive('/files') && 'active']" text @click="goFiles"><el-icon><Folder /></el-icon></el-button>
    </el-tooltip>
  </div>
  
</template>

<script>
import { useRouter, useRoute } from 'vue-router'
import { ChatLineSquare, Grid, Notebook, Folder } from '@element-plus/icons-vue'
export default {
  name: 'Sidebar',
  setup() {
    const router = useRouter()
    const route = useRoute()
    const goHome = () => router.push('/')
    const goApps = () => router.push('/apps')
    const goTranslate = () => router.push('/translate')
    const goFiles = () => router.push('/files')
    const isActive = (path) => route.path === path
    return { goHome, goApps, goTranslate, goFiles, isActive, ChatLineSquare, Grid, Notebook, Folder }
  }
}
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  min-width: var(--sidebar-width);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  gap: 8px;
}
.icon-btn { width: 40px; height: 40px; display:flex; align-items:center; justify-content:center; border-radius:10px; }
.icon-btn.active, .icon-btn:hover { background: var(--color-background-mute); }
</style>



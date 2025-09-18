<template>
  <div class="settings-tab">
    <div class="row">
      <label>消息样式</label>
      <el-select v-model="messageStyle" size="small" style="width: 180px;">
        <el-option label="经典" value="classic" />
        <el-option label="气泡" value="bubble" />
      </el-select>
    </div>
    <div class="row">
      <label>话题栏位置</label>
      <el-select v-model="topicPosition" size="small" style="width: 180px;">
        <el-option label="左侧" value="left" />
        <el-option label="右侧" value="right" />
      </el-select>
    </div>
    <div class="row">
      <label>导航栏位置</label>
      <el-select v-model="navbarPosition" size="small" style="width: 180px;">
        <el-option label="左侧" value="left" />
        <el-option label="顶部" value="top" />
      </el-select>
    </div>
    <div class="row">
      <label>显示消息时间</label>
      <el-switch v-model="showMessageTime" size="small" />
    </div>
    <div class="row">
      <label>时间显示</label>
      <el-select v-model="timeFormat" size="small" style="width: 180px;">
        <el-option label="完整时间" value="full" />
        <el-option label="相对时间" value="relative" />
      </el-select>
    </div>
    <div class="row">
      <label>数据</label>
      <el-button size="small" type="danger" @click="resetAll">清空数据并还原示例</el-button>
    </div>
  </div>
  
</template>

<script>
import { computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'

export default {
  name: 'SettingsTab',
  props: { assistant: Object },
  setup() {
    const settings = useSettingsStore()
    const messageStyle = computed({ get: () => settings.messageStyle, set: (v) => settings.messageStyle = v })
    const topicPosition = computed({ get: () => settings.topicPosition, set: (v) => settings.setTopicPosition(v) })
    const navbarPosition = computed({ get: () => settings.navbarPosition, set: (v) => settings.setNavbarPosition(v) })
    const showMessageTime = computed({ get: () => settings.showMessageTime, set: (v) => settings.setShowMessageTime(v) })
    const timeFormat = computed({ get: () => settings.timeFormat, set: (v) => settings.setTimeFormat(v) })
    const resetAll = () => {
      if (!window.confirm('确认清空所有本地数据并还原示例吗？')) return
      try {
        localStorage.removeItem('assistants')
        localStorage.removeItem('messages')
        localStorage.removeItem('settings')
        window.location.reload()
      } catch {}
    }
    return { messageStyle, topicPosition, navbarPosition, showMessageTime, timeFormat, resetAll }
  }
}
</script>

<style scoped>
.settings-tab { padding: 12px; }
.row { display:flex; align-items:center; gap:12px; margin-bottom:12px; }
label { width: 100px; color: var(--color-text-secondary); }
select { background: transparent; color: var(--color-text); border:1px solid var(--color-border); border-radius:6px; height:28px; }
</style>



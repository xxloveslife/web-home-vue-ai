<template>
  <div class="home-tabs" :class="{ right: position==='right' && topicPosition==='right' }" :style="borderStyle">
    <el-tabs v-if="position==='left' && topicPosition==='left'" v-model="tab" class="tabs" stretch>
      <el-tab-pane label="助手" name="assistants" />
      <el-tab-pane label="话题" name="topic" />
      <el-tab-pane label="设置" name="settings" />
    </el-tabs>

    <el-tabs v-if="position==='right' && topicPosition==='right'" v-model="tab" class="tabs" stretch>
      <el-tab-pane label="话题" name="topic" />
      <el-tab-pane label="设置" name="settings" />
    </el-tabs>

    <div class="content">
      <AssistantsTab
        v-if="tab==='assistants'"
        :active-assistant="activeAssistant"
        @update:assistant="$emit('update:assistant', $event)"
      />
      <TopicsTab
        v-if="tab==='topic'"
        :assistant="activeAssistant"
        :active-topic="activeTopic"
        @update:topic="$emit('update:topic', $event)"
        :position="position"
      />
      <SettingsTab v-if="tab==='settings'" :assistant="activeAssistant" />
    </div>
  </div>
  
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { bus, EVENT_NAMES } from '@/plugins/eventBus'
  import AssistantsTab from './AssistantsTab.vue'
import TopicsTab from './TopicsTab.vue'
import SettingsTab from './SettingsTab.vue'

let _tab = ''

export default {
  name: 'HomeTabs',
  components: { AssistantsTab, TopicsTab, SettingsTab },
  props: {
    activeAssistant: Object,
    activeTopic: Object,
    position: String
  },
  emits: ['update:assistant','update:topic'],
  setup(props) {
    const settings = useSettingsStore()
    const topicPosition = computed(() => settings.topicPosition)
    const isLeftNavbar = computed(() => settings.isLeftNavbar)
    const showTab = computed(() => props.position === 'left' && topicPosition.value === 'left')
    const tab = ref(props.position === 'left' ? (_tab || 'assistants') : 'topic')

    const borderStyle = computed(() => {
      const style = '0.5px solid var(--color-border)'
      return props.position === 'left'
        ? { borderRight: isLeftNavbar.value ? style : 'none' }
        : { borderLeft: isLeftNavbar.value ? style : 'none', borderTopLeftRadius: 0 }
    })

    const showAssistantsTab = () => { showTab.value && (tab.value = 'assistants') }
    const showTopicTab = () => { showTab.value && (tab.value = 'topic') }
    const showSettingsTab = () => { showTab.value && (tab.value = 'settings') }

    const switchTopicSidebar = () => {
      showTab.value && (tab.value = 'topic')
      if (props.position === 'left' && topicPosition.value === 'right') {
        settings.toggleShowTopics()
      }
    }

    const onShowAssistants = () => showAssistantsTab()
    const onShowTopicSidebar = () => showTopicTab()
    const onShowChatSettings = () => showSettingsTab()
    const onSwitchTopicSidebar = () => switchTopicSidebar()

    onMounted(() => {
      bus.on(EVENT_NAMES.SHOW_ASSISTANTS, onShowAssistants)
      bus.on(EVENT_NAMES.SHOW_TOPIC_SIDEBAR, onShowTopicSidebar)
      bus.on(EVENT_NAMES.SHOW_CHAT_SETTINGS, onShowChatSettings)
      bus.on(EVENT_NAMES.SWITCH_TOPIC_SIDEBAR, onSwitchTopicSidebar)
    })
    onBeforeUnmount(() => {
      bus.off(EVENT_NAMES.SHOW_ASSISTANTS, onShowAssistants)
      bus.off(EVENT_NAMES.SHOW_TOPIC_SIDEBAR, onShowTopicSidebar)
      bus.off(EVENT_NAMES.SHOW_CHAT_SETTINGS, onShowChatSettings)
      bus.off(EVENT_NAMES.SWITCH_TOPIC_SIDEBAR, onSwitchTopicSidebar)
    })

    // 记忆左侧 tab
    if (props.position === 'left' && topicPosition.value === 'left') {
      _tab = tab.value
    }

    return { tab, topicPosition, isLeftNavbar, showTab, borderStyle }
  }
}
</script>

<style scoped>
.home-tabs {
  display: flex;
  flex-direction: column;
  max-width: var(--assistants-width);
  min-width: var(--assistants-width);
  overflow: hidden;
}
.home-tabs.right { height: calc(100vh - var(--navbar-height)); }
.tabs {
  display: flex;
  margin: 0 12px;
  padding: 6px 0;
  border-bottom: 1px solid var(--color-border);
}
.tab {
  flex: 1;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 400;
  cursor: pointer;
  border-radius: 8px;
  margin: 0 2px;
}
.tab.active { color: var(--color-text); font-weight: 600; }
.content { display:flex; flex:1; flex-direction:column; overflow:hidden; }
.tabs :deep(.el-tabs__header) { margin: 0 12px; }
.tabs :deep(.el-tabs__item.is-active) { color: var(--color-text); font-weight: 600; }
.tabs :deep(.el-tabs__active-bar) { background-color: var(--color-primary); }
.tabs :deep(.el-tabs__item) { color: var(--color-text-secondary); }
</style>



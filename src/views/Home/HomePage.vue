<template>
  <div id="home-page" :navbar-position="isLeftNavbar ? 'left' : 'top'">
    <Navbar
      v-if="isLeftNavbar"
      :active-assistant="activeAssistant"
      :active-topic="activeTopic"
      @update:assistant="setActiveAssistant"
      @update:topic="setActiveTopic"
      position="left"
    />
    <div :id="isLeftNavbar ? 'content-container' : undefined" class="content-container">
      <HomeTabs
        v-if="showAssistants"
        :active-assistant="activeAssistant"
        :active-topic="activeTopic"
        @update:assistant="setActiveAssistant"
        @update:topic="setActiveTopic"
        position="left"
      />
      <Chat
        :assistant="activeAssistant"
        :active-topic="activeTopic"
        @update:assistant="setActiveAssistant"
        @update:topic="setActiveTopic"
      />
    </div>
  </div>
  
</template>

<script>
import Navbar from './Navbar.vue'
import HomeTabs from './Tabs/index.vue'
import Chat from './Chat.vue'
import { computed, onMounted, onBeforeUnmount } from 'vue'
import { useAssistantsStore } from '@/stores/assistants'
import { useSettingsStore } from '@/stores/settings'
import { useMessagesStore } from '@/stores/messages'
import { useActiveTopicEffect } from '@/composables/useActiveTopic'
import { useShortcuts } from '@/composables/useShortcuts'
import { bus, EVENT_NAMES } from '@/plugins/eventBus'

export default {
  name: 'HomePage',
  components: { Navbar, HomeTabs, Chat },
  setup() {
    const assistants = useAssistantsStore()
    const settings = useSettingsStore()
    const messages = useMessagesStore()
    useActiveTopicEffect()
    const { register, unregisterAll } = useShortcuts()

    const activeAssistant = computed(() => assistants.activeAssistant)
    const activeTopic = computed(() => assistants.activeTopic)
    const isLeftNavbar = computed(() => settings.isLeftNavbar)
    const showAssistants = computed(() => settings.showAssistants)

    const setActiveAssistant = (a) => assistants.setActiveAssistant(a)
    const setActiveTopic = (t) => {
      assistants.setActiveTopic(t)
      messages.setTopicFulfilled({ topicId: t.id, fulfilled: false })
    }

    onMounted(() => {
      register('ctrl+f', () => bus.emit(EVENT_NAMES.OPEN_SEARCH_POPUP))
      register('alt+a', () => settings.toggleShowAssistants())
      register('alt+t', () => settings.toggleShowTopics())
      register('esc', () => bus.emit(EVENT_NAMES.SEARCH_IN_CHAT, { keyword: '', includeUser: true }))
      register('ctrl+enter', () => bus.emit(EVENT_NAMES.SEND_MESSAGE_AGAIN))
      register('shift+enter', () => bus.emit(EVENT_NAMES.CONTINUE_CONVERSATION))
      register('ctrl+l', () => bus.emit(EVENT_NAMES.FOCUS_INPUT))
      // 上下滚动
      register('alt+j', () => bus.emit(EVENT_NAMES.SCROLL_TO_BOTTOM))
      register('alt+k', () => bus.emit(EVENT_NAMES.SCROLL_TO_TOP))
      // 搜索命中跳转
      register('f3', () => bus.emit(EVENT_NAMES.NEXT_SEARCH_MATCH))
      register('shift+f3', () => bus.emit(EVENT_NAMES.PREV_SEARCH_MATCH))
      // 多选复制/复制到输入框
      register('ctrl+c', () => bus.emit(EVENT_NAMES.MULTI_SELECT_BATCH_COPY))
      register('ctrl+shift+c', () => bus.emit(EVENT_NAMES.MULTI_SELECT_BATCH_COPY_TO_INPUT))
    })
    onBeforeUnmount(() => unregisterAll())

    // 监听新建话题，创建并切换
    bus.on(EVENT_NAMES.ADD_NEW_TOPIC, () => {
      const a = assistants.activeAssistant
      if (!a) return
      const tid = 't' + Math.random().toString(36).slice(2, 9)
      const newTopic = { id: tid, assistantId: a.id, name: '新话题' }
      assistants.addTopicToAssistant(a.id, newTopic)
      assistants.setActiveTopic(newTopic)
      messages.setTopicFulfilled({ topicId: tid, fulfilled: false })
    })

    // 监听切换助手
    bus.on(EVENT_NAMES.SWITCH_ASSISTANT, ({ assistantId }) => {
      const target = assistants.assistants.find((x) => x.id === assistantId)
      if (target) {
        assistants.setActiveAssistant(target)
      }
    })

    // 当 Topic 栏在左侧时，其他模块请求显示话题栏
    bus.on(EVENT_NAMES.SHOW_TOPIC_SIDEBAR, () => {
      settings.setShowAssistants(true)
    })

    return { activeAssistant, activeTopic, isLeftNavbar, showAssistants, setActiveAssistant, setActiveTopic }
  }
}
</script>

<style scoped>
#home-page {
  display: flex;
  flex-direction: column;
  flex: 1;
}
.content-container {
  display: flex;
  flex: 1;
  flex-direction: row;
  overflow: hidden;
}
</style>



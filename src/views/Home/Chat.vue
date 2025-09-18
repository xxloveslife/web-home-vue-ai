<template>
  <div id="chat" :class="[{ 'multi-select-mode': false }, messageStyle]" style="width: 100%;">
    <div class="chat-navbar" v-if="isTopNavbar">
      <div class="left">聊天</div>
      <div class="right">
        <SelectModelButton :assistant="assistant" />
        <UpdateAppButton />
        <el-button text size="small" @click="openSearch">搜索</el-button>
        <el-button text size="small" @click="clearHighlight" :disabled="!messagesRef?.getKeyword || !messagesRef?.getKeyword()">清除高亮</el-button>
        <el-button text size="small" @click="toggleTopics">切换话题栏</el-button>
        <el-divider direction="vertical" />
        <el-button text size="small" @click="toggleMultiSelect">{{ multiSelect ? '退出多选' : '多选' }}</el-button>
        <el-button text size="small" :disabled="!multiSelect || selectedCount===0" @click="selectAll">全选</el-button>
        <el-button text size="small" :disabled="!multiSelect || selectedCount===0" @click="invertSelection">反选</el-button>
        <el-button text size="small" type="danger" :disabled="!multiSelect || selectedCount===0" @click="batchDelete">批量删除</el-button>
        <el-button text size="small" :disabled="!multiSelect || selectedCount===0" @click="batchCopy">复制选中</el-button>
        <el-button text size="small" :disabled="!multiSelect || selectedCount===0" @click="batchCopyToInput">复制到输入框</el-button>
        <el-tag v-if="generating" type="warning" effect="dark" size="small">
          正在生成...
          <el-button link type="primary" size="small" @click="stopGenerating">停止</el-button>
        </el-tag>
      </div>
      <SearchPopup ref="searchPopupRef" />
    </div>
    <div class="hstack">
      <div class="main" :style="{ maxWidth, height: mainHeight }">
        <div class="generate-indicator" v-if="generating">
          <el-tag type="warning" effect="dark" size="small">
            正在生成...
            <el-button link type="primary" size="small" @click="stopGenerating">停止</el-button>
          </el-tag>
        </div>
        <div class="new-msg" v-if="!atBottom && newCount>0">
          新消息 {{ newCount }}
          <el-button link type="primary" size="small" @click="goBottomAndClear">查看</el-button>
        </div>
        <Messages ref="messagesRef" :assistant="assistant" :topic="activeTopic" :multiSelect="multiSelect" @updated="onMessagesUpdate" @first-update="onMessagesFirstUpdate" @scrolled="onMessagesScrolled" />
        <transition name="fade">
          <el-button v-if="!atBottom" class="back-to-bottom" type="primary" circle @click="scrollToBottom">
            ↓
          </el-button>
        </transition>
        <div class="nav-buttons" v-if="messageNavigation==='buttons'">
          <button @click="scrollToTop">↑</button>
          <button @click="messagesRef?.prevMatch?.()">⟨</button>
          <button @click="messagesRef?.nextMatch?.()">⟩</button>
          <button @click="scrollToBottom">↓</button>
        </div>
        <Inputbar ref="inputbarRef" :assistant="assistant" :topic="activeTopic" @send="onSend" />
      </div>
      <Tabs
        v-if="topicPosition==='right' && showTopics"
        :active-assistant="assistant"
        :active-topic="activeTopic"
        @update:assistant="$emit('update:assistant', $event)"
        @update:topic="$emit('update:topic', $event)"
        position="right"
      />
    </div>
    <ShortcutsHelp />
  </div>
  
</template>

<script>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useAssistantsStore } from '@/stores/assistants'
import { useMessagesStore } from '@/stores/messages'
import { useRuntimeStore } from '@/stores/runtime'
import { useChatScroll } from '@/composables/useChatScroll'
import { bus, EVENT_NAMES } from '@/plugins/eventBus'
import Messages from './Messages/Messages.vue'
import Inputbar from './Inputbar/Inputbar.vue'
import Tabs from './Tabs/index.vue'
import SelectModelButton from './components/SelectModelButton.vue'
import UpdateAppButton from './components/UpdateAppButton.vue'
import SearchPopup from './components/SearchPopup.vue'
import ShortcutsHelp from './components/ShortcutsHelp.vue'

export default {
  name: 'Chat',
  props: {
    assistant: Object,
    activeTopic: Object
  },
  emits: ['update:assistant','update:topic'],
  components: { Messages, Inputbar, Tabs, SelectModelButton, UpdateAppButton, SearchPopup, ShortcutsHelp },
  setup(props) {
    const settings = useSettingsStore()
    const assistants = useAssistantsStore()
    const messages = useMessagesStore()
    const runtime = useRuntimeStore()
    const messageStyle = computed(() => settings.messageStyle)
    const topicPosition = computed(() => settings.topicPosition)
    const showTopics = computed(() => settings.showTopics)
    const isTopNavbar = computed(() => settings.isTopNavbar)
    const messageNavigation = ref('buttons')

    const showAssistants = computed(() => settings.showAssistants)
    const showRightTopics = computed(() => showTopics.value && topicPosition.value === 'right')
    const sidebarWidth = computed(() => settings.isLeftNavbar ? ' - var(--sidebar-width)' : '')
    const minusAssistantsWidth = computed(() => showAssistants.value ? ' - var(--assistants-width)' : '')
    const minusRightTopicsWidth = computed(() => showRightTopics.value ? ' - var(--assistants-width)' : '')
    const maxWidth = computed(() => `calc(100vw${sidebarWidth.value}${minusAssistantsWidth.value}${minusRightTopicsWidth.value})`)

    const mainHeight = computed(() => isTopNavbar.value
      ? 'calc(100vh - var(--navbar-height) - var(--navbar-height) - 12px)'
      : 'calc(100vh - var(--navbar-height))')

    const toggleTopics = () => {
      if (topicPosition.value === 'right') {
        settings.toggleShowTopics()
      } else {
        settings.toggleShowAssistants()
      }
    }

    const messagesRef = ref(null)
    const searchPopupRef = ref(null)
    const inputbarRef = ref(null)
    const generating = ref(false)
    const getContainer = () => document.getElementById('messages')
    const {
      atBottom, newCount, autoScrollEnabled,
      scrollToTop, scrollToBottom, goBottomAndClear,
      onFirstUpdate: onMessagesFirstUpdate, onMessagesUpdate, onScrolled, onUserScrollIntent, onSendHook, onEditToggle
    } = useChatScroll({
      getContainer,
      ensureTyping: () => ensureTypingTimers(),
      bottomThreshold: 0,
      smooth: true,
      autoFollowOnSend: true,
      autoFollowOnReturnBottom: true,
      pauseOnEdit: true,
      onAutoFollowChange: ({ autoFollow }) => {}
    })
    const multiSelect = ref(false)
    const selectedCount = computed(() => messagesRef.value?.getSelectedIds?.().length || 0)
    const onContentSearch = ({ keyword, includeUser }) => {
      messagesRef.value?.setKeyword?.(keyword)
    }

    bus.on(EVENT_NAMES.SEARCH_IN_CHAT, ({ keyword, includeUser }) => {
      onContentSearch({ keyword, includeUser })
    })

    const openSearch = async () => {
      const keyword = await searchPopupRef.value?.open()
      if (keyword) {
        onContentSearch({ keyword, includeUser: true })
      }
    }

    // 顶部模式需要在本组件监听 OPEN_SEARCH_POPUP
    const onOpenSearch = async () => { await openSearch() }
    bus.on(EVENT_NAMES.OPEN_SEARCH_POPUP, onOpenSearch)
    bus.on(EVENT_NAMES.NEXT_SEARCH_MATCH, () => messagesRef.value?.nextMatch?.())
    bus.on(EVENT_NAMES.PREV_SEARCH_MATCH, () => messagesRef.value?.prevMatch?.())

    // 对齐: 支持 LOCATE_MESSAGE:<id>
    const locateHandler = (payload) => {
      const { messageId } = payload || {}
      if (!messageId) return
      messagesRef.value?.locateMessageById?.(messageId)
    }
    bus.on(EVENT_NAMES.LOCATE_MESSAGE, locateHandler)
    let lastTopicId = props.activeTopic?.id
    bus.on(EVENT_NAMES.CHANGE_TOPIC, (topic) => {
      if (lastTopicId) runtime.clearSelected(lastTopicId)
      lastTopicId = topic?.id
      if (lastTopicId) runtime.clearSelected(lastTopicId)
    })

    // useChatScroll 已提供 onMessagesUpdate / onMessagesFirstUpdate / onScrolled

    // 注册滚动事件放在方法定义之后

    const onSend = (content) => {
      // 简化：直接以 Mock 的形式插入一条 assistant 回复
      const topicId = props.activeTopic?.id
      if (!topicId) return
      const id = 'm' + Math.random().toString(36).slice(2, 9)
      messages.addMessage({ topicId, message: { id, topicId, role: 'user', content, status: 'SUCCESS', blocks: [] } })
      const id2 = 'm' + Math.random().toString(36).slice(2, 9)
      // 打字机效果：先插入空内容，目标内容放在 __targetContent，状态为 GENERATING
      messages.addMessage({ topicId, message: { id: id2, topicId, role: 'assistant', content: '', __targetContent: '已收到：' + content, __typing: true, status: 'GENERATING', blocks: [], createdAt: new Date().toISOString() } })
      ensureTypingTimers()
      onSendHook()
    }

    // 快捷键事件：再次发送最近一条用户消息
    bus.on(EVENT_NAMES.SEND_MESSAGE_AGAIN, () => {
      const topicId = props.activeTopic?.id
      if (!topicId) return
      const ids = messages.messageIdsByTopic[topicId] || []
      for (let i = ids.length - 1; i >= 0; i--) {
        const m = messages.entities[ids[i]]
        if (m && m.role === 'user' && m.content) {
          onSend(m.content)
          break
        }
      }
    })
    // 仅依据是否处于底部决定自动滚动，不引入额外抑制逻辑

    // 快捷键事件：基于最近的助手回复继续对话（Mock）
    bus.on(EVENT_NAMES.CONTINUE_CONVERSATION, () => {
      const topicId = props.activeTopic?.id
      if (!topicId) return
      const ids = messages.messageIdsByTopic[topicId] || []
      for (let i = ids.length - 1; i >= 0; i--) {
        const m = messages.entities[ids[i]]
        if (m && m.role === 'assistant' && m.content) {
          const id = 'm' + Math.random().toString(36).slice(2, 9)
          messages.addMessage({ topicId, message: { id, topicId, role: 'assistant', content: '（继续）' + m.content, status: 'SUCCESS', blocks: [] } })
          break
        }
      }
    })
    // 聚焦输入框
    bus.on(EVENT_NAMES.FOCUS_INPUT, () => inputbarRef.value?.focus?.())
    // 追加文本到输入框
    bus.on(EVENT_NAMES.APPEND_TO_INPUT, (t) => inputbarRef.value?.appendText?.(t || ''))

    // 滚动方法由 useChatScroll 提供

    bus.on(EVENT_NAMES.SCROLL_TO_BOTTOM, scrollToBottom)
    bus.on(EVENT_NAMES.SCROLL_TO_TOP, scrollToTop)

    bus.on(EVENT_NAMES.START_GENERATING, () => { generating.value = true })
    bus.on(EVENT_NAMES.STOP_GENERATING, () => { stopAllTyping(); generating.value = false })
    bus.on(EVENT_NAMES.STOP_GENERATING_MESSAGE, ({ messageId }) => {
      try {
        const m = messages.entities[messageId]
        if (m && m.__typing === true) {
          messages.updateMessage({ messageId, changes: { __typing: false, status: 'SUCCESS' } })
          const t = typingTimers.get(messageId)
          if (t) { clearInterval(t); typingTimers.delete(messageId) }
          if (!hasAnyTyping()) generating.value = false
        }
      } catch {}
    })

    // 编辑开启/结束 -> 暂停/在底部则恢复
    bus.on(EVENT_NAMES.EDIT_MESSAGE, onEditToggle)

    const stopGenerating = () => bus.emit(EVENT_NAMES.STOP_GENERATING)
    bus.on(EVENT_NAMES.MULTI_SELECT_ON, () => { multiSelect.value = true })
    bus.on(EVENT_NAMES.MULTI_SELECT_OFF, () => { multiSelect.value = false; messagesRef.value?.clearSelection?.() })

    const toggleMultiSelect = () => {
      if (multiSelect.value) {
        bus.emit(EVENT_NAMES.MULTI_SELECT_OFF)
      } else {
        bus.emit(EVENT_NAMES.MULTI_SELECT_ON)
      }
    }
    const selectAll = () => messagesRef.value?.selectAll?.()
    const invertSelection = () => messagesRef.value?.invertSelection?.()
    const batchDelete = () => {
      const ids = messagesRef.value?.getSelectedIds?.() || []
      const topicId = props.activeTopic?.id
      if (!topicId || !ids.length) return
      if (!window.confirm(`确认删除选中的 ${ids.length} 条消息吗？`)) return
      ids.forEach((id) => messages.removeMessage({ topicId, messageId: id }))
      messagesRef.value?.clearSelection?.()
    }
    const batchCopy = async () => {
      const ids = messagesRef.value?.getSelectedIds?.() || []
      if (!ids.length) return
      const texts = ids.map((id) => messages.entities[id]?.content || '').filter(Boolean)
      try { await navigator.clipboard.writeText(texts.join('\n\n')) } catch {}
    }
    const exportSelectedMd = async () => {
      const ids = messagesRef.value?.getSelectedIds?.() || []
      const topicId = props.activeTopic?.id
      if (!topicId || !ids.length) return
      const lines = []
      const formatSize = (s) => {
        if (!s && s !== 0) return ''
        const u = ['B','KB','MB','GB']
        let n = Number(s) || 0, i = 0
        while (n >= 1024 && i < u.length-1) { n /= 1024; i++ }
        return n.toFixed(n >= 10 || i === 0 ? 0 : 1) + u[i]
      }
      const msgToMd = (m) => {
        const out = []
        const prefix = m.role === 'user' ? '用户' : '助手'
        out.push(`## ${prefix}`)
        if (m.createdAt) out.push(`> ${new Date(m.createdAt).toLocaleString()}`)
        out.push('')
        if (m.content) { out.push(m.content, '') }
        if (Array.isArray(m.blocks)) {
          for (const b of m.blocks) {
            if (!b) continue
            if (b.type === 'tool-result') {
              out.push('#### 工具执行结果', '')
              const cmd = b.payload?.command || b.command
              const exitCode = (b.payload?.exitCode ?? b.exitCode)
              if (cmd) { out.push('命令:', '```bash', cmd, '```', '') }
              if (typeof exitCode !== 'undefined') out.push(`退出码: ${exitCode}`, '')
              const stdout = b.payload?.stdout || b.stdout
              const stderr = b.payload?.stderr || b.stderr
              if (stdout) { out.push('stdout:', '```text', stdout, '```', '') }
              if (stderr) { out.push('stderr:', '```text', stderr, '```', '') }
            } else if (b.type === 'table') {
              const headers = b.headers || []
              const rows = b.rows || []
              if (headers.length) {
                out.push(headers.join(' | '))
                out.push(headers.map(() => '---').join(' | '))
                for (const r of rows) out.push((r || []).join(' | '))
                out.push('')
              }
            } else if (b.type === 'file') {
              const name = b.name || '文件'
              const url = b.url || ''
              const size = b.size ? ` (${formatSize(b.size)})` : ''
              out.push(`- [${name}](${url})${size}`)
            } else if (b.type === 'alert') {
              const level = { success: '成功', warning: '警告', error: '错误', info: '提示' }[b.level || 'info']
              out.push(`> [${level}] ${b.text || b.message || ''}`)
            }
          }
          out.push('')
        }
        return out
      }
      for (const id of ids) {
        const m = messages.entities[id]
        if (!m) continue
        lines.push(...msgToMd(m))
      }
      try { await navigator.clipboard.writeText(lines.join('\n')) } catch {}
    }
    const downloadSelectedMd = async () => {
      const ids = messagesRef.value?.getSelectedIds?.() || []
      const topicId = props.activeTopic?.id
      if (!topicId || !ids.length) return
      const lines = []
      // 复用 exportSelectedMd 的 msgToMd 逻辑
      const formatSize = (s) => {
        if (!s && s !== 0) return ''
        const u = ['B','KB','MB','GB']
        let n = Number(s) || 0, i = 0
        while (n >= 1024 && i < u.length-1) { n /= 1024; i++ }
        return n.toFixed(n >= 10 || i === 0 ? 0 : 1) + u[i]
      }
      const msgToMd = (m) => {
        const out = []
        const prefix = m.role === 'user' ? '用户' : '助手'
        out.push(`## ${prefix}`)
        if (m.createdAt) out.push(`> ${new Date(m.createdAt).toLocaleString()}`)
        out.push('')
        if (m.content) { out.push(m.content, '') }
        if (Array.isArray(m.blocks)) {
          for (const b of m.blocks) {
            if (!b) continue
            if (b.type === 'tool-result') {
              out.push('#### 工具执行结果', '')
              const cmd = b.payload?.command || b.command
              const exitCode = (b.payload?.exitCode ?? b.exitCode)
              if (cmd) { out.push('命令:', '```bash', cmd, '```', '') }
              if (typeof exitCode !== 'undefined') out.push(`退出码: ${exitCode}`, '')
              const stdout = b.payload?.stdout || b.stdout
              const stderr = b.payload?.stderr || b.stderr
              if (stdout) { out.push('stdout:', '```text', stdout, '```', '') }
              if (stderr) { out.push('stderr:', '```text', stderr, '```', '') }
            } else if (b.type === 'table') {
              const headers = b.headers || []
              const rows = b.rows || []
              if (headers.length) {
                out.push(headers.join(' | '))
                out.push(headers.map(() => '---').join(' | '))
                for (const r of rows) out.push((r || []).join(' | '))
                out.push('')
              }
            } else if (b.type === 'file') {
              const name = b.name || '文件'
              const url = b.url || ''
              const size = b.size ? ` (${formatSize(b.size)})` : ''
              out.push(`- [${name}](${url})${size}`)
            } else if (b.type === 'alert') {
              const level = { success: '成功', warning: '警告', error: '错误', info: '提示' }[b.level || 'info']
              out.push(`> [${level}] ${b.text || b.message || ''}`)
            }
          }
          out.push('')
        }
        return out
      }
      for (const id of ids) {
        const m = messages.entities[id]
        if (!m) continue
        lines.push(...msgToMd(m))
      }
      const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${props.activeTopic?.name || 'messages'}.md`
      a.click()
      URL.revokeObjectURL(url)
    }
    const batchCopyToInput = () => {
      const ids = messagesRef.value?.getSelectedIds?.() || []
      if (!ids.length) return
      const texts = ids.map((id) => messages.entities[id]?.content || '').filter(Boolean)
      inputbarRef.value?.appendText?.(texts.join('\n\n'))
    }
    // 复制选中到输入框
    bus.on(EVENT_NAMES.MULTI_SELECT_BATCH_COPY_TO_INPUT, () => {
      const ids = messagesRef.value?.getSelectedIds?.() || []
      if (!ids.length) return
      const texts = ids.map((id) => messages.entities[id]?.content || '').filter(Boolean)
      inputbarRef.value?.appendText?.(texts.join('\n\n'))
    })

    // 将 Navbar 发出的多选批量操作事件接到 Chat（便于顶部或左侧统一操作）
    bus.on(EVENT_NAMES.MULTI_SELECT_SELECT_ALL, selectAll)
    bus.on(EVENT_NAMES.MULTI_SELECT_INVERT, invertSelection)
    bus.on(EVENT_NAMES.MULTI_SELECT_BATCH_DELETE, batchDelete)
    bus.on(EVENT_NAMES.MULTI_SELECT_BATCH_COPY, batchCopy)
    bus.on(EVENT_NAMES.MULTI_SELECT_EXPORT_MD, exportSelectedMd)
    bus.on(EVENT_NAMES.MULTI_SELECT_EXPORT_MD_FILE, downloadSelectedMd)

    // 打字机：管理 __typing 消息的逐字渲染
    const typingTimers = new Map()
    const TYPING_INTERVAL_MS = 20
    const hasAnyTyping = () => {
      const ids = messages.messageIdsByTopic[props.activeTopic?.id] || []
      return ids.some(id => messages.entities[id]?.__typing === true)
    }
    const startTypingFor = (messageId) => {
      if (typingTimers.has(messageId)) return
      const timer = setInterval(() => {
        const m = messages.entities[messageId]
        if (!m || m.__typing !== true) { clearInterval(timer); typingTimers.delete(messageId); if (!hasAnyTyping()) generating.value = false; return }
        const target = String(m.__targetContent || '')
        const current = String(m.content || '')
        if (current.length >= target.length) {
          messages.updateMessage({ messageId, changes: { __typing: false, __targetContent: undefined, status: 'SUCCESS' } })
          clearInterval(timer); typingTimers.delete(messageId); if (!hasAnyTyping()) generating.value = false; return
        }
        // 自适应步长：文本越长，步长越大（防止长文过慢）。范围 2~24
        const step = Math.max(2, Math.min(24, Math.ceil(target.length / 400)))
        const next = target.slice(0, Math.min(target.length, current.length + step))
        messages.updateMessage({ messageId, changes: { content: next } })
        if (autoScrollEnabled.value) scrollToBottom()
      }, TYPING_INTERVAL_MS)
      typingTimers.set(messageId, timer)
      generating.value = true
    }
    const ensureTypingTimers = () => {
      const topicId = props.activeTopic?.id
      if (!topicId) return
      const ids = messages.messageIdsByTopic[topicId] || []
      ids.forEach((id) => { const m = messages.entities[id]; if (m && m.__typing === true) startTypingFor(id) })
    }
    const stopAllTyping = () => {
      typingTimers.forEach((t) => clearInterval(t))
      typingTimers.clear()
      const topicId = props.activeTopic?.id
      if (!topicId) return
      const ids = messages.messageIdsByTopic[topicId] || []
      ids.forEach((id) => { const m = messages.entities[id]; if (m && m.__typing === true) messages.updateMessage({ messageId: id, changes: { __typing: false, status: 'SUCCESS' } }) })
    }
    bus.on(EVENT_NAMES.CHANGE_TOPIC, () => stopAllTyping())

    // 用户滚动意图（滚轮/拖动/触摸）立即关闭自动滚动
    const disableAutoOnUserScroll = () => { onUserScrollIntent() }
    onMounted(() => {
      const el = document.getElementById('messages')
      if (!el) return
      el.addEventListener('wheel', disableAutoOnUserScroll, { passive: true })
      el.addEventListener('touchstart', disableAutoOnUserScroll, { passive: true })
      el.addEventListener('mousedown', disableAutoOnUserScroll, { passive: true })
    })
    onBeforeUnmount(() => {
      const el = document.getElementById('messages')
      if (!el) return
      el.removeEventListener('wheel', disableAutoOnUserScroll)
      el.removeEventListener('touchstart', disableAutoOnUserScroll)
      el.removeEventListener('mousedown', disableAutoOnUserScroll)
    })

    const clearHighlight = async () => { await messagesRef.value?.clearKeyword?.() }
    return { messageStyle, topicPosition, showTopics, isTopNavbar, messageNavigation, maxWidth, mainHeight, toggleTopics, onContentSearch, onMessagesUpdate, onMessagesFirstUpdate, onSend, scrollToTop, scrollToBottom, messagesRef, searchPopupRef, inputbarRef, openSearch, generating, stopGenerating, atBottom, newCount, goBottomAndClear, multiSelect, selectedCount, toggleMultiSelect, selectAll, invertSelection, batchDelete, batchCopy, batchCopyToInput, exportSelectedMd, downloadSelectedMd, clearHighlight }
  }
}
</script>

<style scoped>
#chat { display:flex; flex-direction:column; height: calc(100vh - var(--navbar-height)); }
.chat-navbar { height: var(--navbar-height); display:flex; align-items:center; justify-content:space-between; padding:0 8px; border-bottom:1px solid var(--color-border); }
.hstack { display:flex; }
.main { flex:1; display:flex; flex-direction:column; justify-content:space-between; position:relative; }
.generate-indicator { position: absolute; top: 8px; left: 8px; z-index: 2; }
.content-search { display:flex; gap:8px; padding:8px; border-top:1px solid var(--color-border); }
.nav-buttons { position:absolute; right:8px; bottom:64px; display:flex; flex-direction:column; gap:6px; }
.icon { height: 30px; padding: 0 7px; border-radius: 8px; background: transparent; border: 1px solid var(--color-border); color: var(--color-icon); cursor: pointer; }
.icon:hover { background: var(--color-background-mute); color: var(--color-icon-white); }
.back-to-bottom { position: absolute; right: 12px; bottom: 12px; z-index: 2; }
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>



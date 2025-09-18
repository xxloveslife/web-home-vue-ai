<template>
  <div class="inputbar">
    <el-input
      v-model="content"
      type="textarea"
      :autosize="{ minRows: 2, maxRows: 6 }"
      placeholder="输入消息，回车发送（Ctrl+Enter换行）"
      @keydown.enter.exact.prevent="send"
      @keydown.ctrl.enter.prevent="newline"
      ref="textareaRef"
    />
    <div class="tools">
      <el-dropdown trigger="click" @command="onTool">
        <span class="el-dropdown-link">
          <el-button>工具</el-button>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="clear-topic">清空当前话题消息</el-dropdown-item>
            <el-dropdown-item command="new-topic">新建话题</el-dropdown-item>
            <el-dropdown-item command="web-search">Web 搜索（Mock）</el-dropdown-item>
            <el-dropdown-item command="upload-file">上传文件（Mock）</el-dropdown-item>
            <el-dropdown-item command="start">开始生成（Mock）</el-dropdown-item>
            <el-dropdown-item command="stop">停止生成（Mock）</el-dropdown-item>
            <el-dropdown-item command="copy-selected-to-input">复制选中到输入框（Mock）</el-dropdown-item>
            <el-dropdown-item command="resend-last-user">再次发送最近一条用户消息</el-dropdown-item>
            <el-dropdown-item command="continue-from-last-assistant">继续对话（基于最近助手回复）</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-button type="primary" @click="send">发送</el-button>
    </div>
  </div>
  
</template>

<script>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useMessagesStore } from '@/stores/messages'
import { useRuntimeStore } from '@/stores/runtime'
import { bus, EVENT_NAMES } from '@/plugins/eventBus'
export default {
  name: 'Inputbar',
  props: { assistant: Object, topic: Object },
  emits: ['send'],
  setup(props, { emit, expose }) {
    const content = ref('')
    const textareaRef = ref(null)
    const messages = useMessagesStore()
    const runtime = useRuntimeStore()
    const send = () => {
      if (!content.value.trim()) return
      emit('send', content.value.trim())
      content.value = ''
    }
    const newline = () => { content.value += '\n' }
    const appendText = (text) => {
      if (!text) return
      content.value = (content.value ? content.value + '\n\n' : '') + text
    }
    const focus = () => {
      try { textareaRef.value?.focus?.() } catch {}
    }
    const appendFilesToInput = async (files) => {
      const desc = Array.from(files || [])
        .map((f) => `[File] ${f.name}${typeof f.size === 'number' ? ` (${Math.round(f.size/1024)}KB)` : ''}`)
        .join('\n')
      if (desc) appendText(desc)
    }
    const onPaste = async (e) => {
      try {
        const files = Array.from(e.clipboardData?.files || []).filter(Boolean)
        if (files.length) {
          e.preventDefault()
          await appendFilesToInput(files)
        }
      } catch {}
    }
    const onDrop = async (e) => {
      try {
        const files = Array.from(e.dataTransfer?.files || []).filter(Boolean)
        if (files.length) {
          e.preventDefault()
          await appendFilesToInput(files)
        }
      } catch {}
    }
    const onDragOver = (e) => { e.preventDefault() }
    const onTool = (cmd) => {
      if (cmd === 'clear-topic' && props.topic?.id) {
        if (window.confirm('确认清空当前话题的消息吗？')) messages.clearTopicMessages(props.topic.id)
      }
      if (cmd === 'new-topic') {
        bus.emit(EVENT_NAMES.ADD_NEW_TOPIC)
      }
      if (cmd === 'web-search') {
        // 模拟：在输入框插入一个提示词
        content.value = (content.value ? content.value + '\n' : '') + '[WebSearch] 关键词：'
      }
      if (cmd === 'upload-file') {
        // 模拟：插入一个文件占位
        content.value = (content.value ? content.value + '\n' : '') + '[File] example.txt 已选择（Mock）'
      }
      if (cmd === 'start') {
        bus.emit(EVENT_NAMES.START_GENERATING)
      }
      if (cmd === 'stop') {
        bus.emit(EVENT_NAMES.STOP_GENERATING)
      }
      if (cmd === 'copy-selected-to-input') {
        const topicId = props.topic?.id
        if (!topicId) return
        const ids = runtime.getSelectedIds(topicId)
        const texts = ids.map((id) => messages.entities[id]?.content || '').filter(Boolean)
        if (texts.length) appendText(texts.join('\n\n'))
      }
      if (cmd === 'resend-last-user') {
        const topicId = props.topic?.id
        if (!topicId) return
        const ids = messages.messageIdsByTopic[topicId] || []
        for (let i = ids.length - 1; i >= 0; i--) {
          const m = messages.entities[ids[i]]
          if (m && m.role === 'user' && m.content) {
            emit('send', m.content)
            break
          }
        }
      }
      if (cmd === 'continue-from-last-assistant') {
        const topicId = props.topic?.id
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
      }
    }
    onMounted(async () => {
      await nextTick()
      const ta = textareaRef.value?.textarea || textareaRef.value?.$el?.querySelector('textarea')
      if (ta) {
        ta.addEventListener('paste', onPaste)
        ta.addEventListener('drop', onDrop)
        ta.addEventListener('dragover', onDragOver)
      }
    })
    onBeforeUnmount(() => {
      try {
        const ta = textareaRef.value?.textarea || textareaRef.value?.$el?.querySelector('textarea')
        if (ta) {
          ta.removeEventListener('paste', onPaste)
          ta.removeEventListener('drop', onDrop)
          ta.removeEventListener('dragover', onDragOver)
        }
      } catch {}
    })

    expose({ appendText, focus })
    return { content, send, newline, onTool, appendText, textareaRef }
  }
}
</script>

<style scoped>
.inputbar { display:flex; gap:8px; border-top:1px solid var(--color-border); padding:8px; }
.el-textarea { flex:1; }
.tools { display:flex; gap:8px; align-items:flex-end; }
</style>



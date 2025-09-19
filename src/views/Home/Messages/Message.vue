<template>
  <div class="message" :class="[cls, { selected: selected }]" @click="onSelect">
    <div class="bubble" @dblclick.stop="onDblclick">
      <div class="content">
        <template v-if="isEditing">
          <el-input v-model="editContent" type="textarea" :autosize="{minRows:2,maxRows:6}" @keydown.enter.ctrl.prevent="saveEdit" @keydown.esc.prevent="cancelEdit" />
          <div class="edit-actions">
            <el-button size="small" type="primary" @click="saveEdit">保存</el-button>
            <el-button size="small" @click="cancelEdit">取消</el-button>
          </div>
        </template>
        <template v-else>
          <MessageContent ref="contentRef" :text="message.content" :highlight="highlightKeyword" :typing="message.__typing===true" />
        </template>
      </div>
      <div class="quick-actions" v-if="!isEditing">
        <el-button text size="small" @click="quickCopy">复制</el-button>
      </div>
      <div class="meta" v-if="showTime && message.createdAt">
        <span v-if="message.__typing===true" class="gen-flag"><span class="mini-spinner"></span>生成中… <el-button link size="small" @click="stopThis">停止</el-button></span>
        {{ formatTime(message.createdAt) }}
      </div>
      <MessageBlocks v-if="message.blocks && message.blocks.length" :blocks="message.blocks" />
      <div class="tools" v-if="!isEditing">
        <el-dropdown trigger="click" @command="onCommand">
          <span class="el-dropdown-link">
            <el-button text size="small">更多</el-button>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="copy">复制内容</el-dropdown-item>
              <el-dropdown-item command="copy-md">复制为 Markdown</el-dropdown-item>
              <el-dropdown-item command="quote">引用到输入框</el-dropdown-item>
              <el-dropdown-item divided command="expand-codes">展开全部代码</el-dropdown-item>
              <el-dropdown-item command="collapse-codes">收起全部代码</el-dropdown-item>
              <el-dropdown-item command="locate">定位到消息</el-dropdown-item>
              <el-dropdown-item command="edit">编辑消息</el-dropdown-item>
              <el-dropdown-item v-if="message.role==='assistant'" command="regenerate">重新生成</el-dropdown-item>
              <el-dropdown-item v-if="message.role==='assistant'" command="resend">再次发送（Mock）</el-dropdown-item>
              <el-dropdown-item command="delete" divided>删除消息</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
  </div>
  
</template>

<script>
import { computed, ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useMessagesStore } from '@/stores/messages'
import { ElMessage } from 'element-plus'
import { bus, EVENT_NAMES } from '@/plugins/eventBus'
import MessageContent from './MessageContent.vue'
import MessageBlocks from './MessageBlocks.vue'
export default {
  name: 'Message',
  components: { MessageContent, MessageBlocks },
  props: { message: Object, highlightKeyword: String, topicId: String, selectable: Boolean, selected: Boolean },
  emits: ['toggle-select'],
  setup(props, { emit }) {
    const settings = useSettingsStore()
    const contentRef = ref(null)
    const messages = useMessagesStore()
    const isEditing = computed(() => props.message?.__editing === true)
    const editContent = computed({
      get: () => props.message?.__editingContent ?? props.message?.content ?? '',
      set: (v) => messages.updateMessage({ messageId: props.message?.id, changes: { __editingContent: v } })
    })
    const cls = computed(() => ({
      'message-user': props.message?.role === 'user',
      'message-assistant': props.message?.role === 'assistant'
    }))
    const highlightedParts = computed(() => [])
    const showTime = computed(() => settings.showMessageTime)
    const formatTime = (iso) => {
      try {
        if (settings.timeFormat === 'relative') {
          const d = new Date(iso)
          const diff = Date.now() - d.getTime()
          const mins = Math.floor(diff / 60000)
          if (mins < 1) return '刚刚'
          if (mins < 60) return mins + ' 分钟前'
          const hours = Math.floor(mins / 60)
          if (hours < 24) return hours + ' 小时前'
          const days = Math.floor(hours / 24)
          return days + ' 天前'
        }
        return new Date(iso).toLocaleString()
      } catch { return '' }
    }

    const onCommand = async (cmd) => {
      if (cmd === 'copy') {
        try { await navigator.clipboard.writeText(props.message?.content || ''); ElMessage.success('已复制') } catch {}
      }
      if (cmd === 'locate') {
        bus.emit(EVENT_NAMES.LOCATE_MESSAGE, { messageId: props.message?.id })
      }
      if (cmd === 'quote') {
        const raw = props.message?.content || ''
        const quoted = raw.split('\n').map((l) => '> ' + l).join('\n') + '\n\n'
        bus.emit(EVENT_NAMES.APPEND_TO_INPUT, quoted)
      }
      if (cmd === 'expand-codes') contentRef.value?.expandAll?.()
      if (cmd === 'collapse-codes') contentRef.value?.collapseAll?.()
      if (cmd === 'copy-md') {
        const prefix = props.message?.role === 'user' ? '用户' : '助手'
        const lines = [`## ${prefix}`, '', props.message?.content || '', '']
        try { await navigator.clipboard.writeText(lines.join('\n')); ElMessage.success('已复制 Markdown') } catch {}
      }
      if (cmd === 'edit') {
        bus.emit(EVENT_NAMES.EDIT_MESSAGE, { messageId: props.message?.id, editing: true })
        messages.updateMessage({ messageId: props.message?.id, changes: { __editing: true, __editingContent: props.message?.content || '' } })
      }
      if (cmd === 'regenerate' && props.message?.role === 'assistant') {
        // 简化：追加一条“再生”消息
        const id = 'm' + Math.random().toString(36).slice(2, 9)
        messages.addMessage({ topicId: props.topicId, message: { id, topicId: props.topicId, role: 'assistant', content: '（再生）' + (props.message?.content || ''), status: 'SUCCESS', blocks: [] } })
      }
      if (cmd === 'resend' && props.message?.role === 'assistant') {
        // 简化：再次发送 = 在当前话题尾部复制一条
        const id = 'm' + Math.random().toString(36).slice(2, 9)
        messages.addMessage({ topicId: props.topicId, message: { id, topicId: props.topicId, role: 'assistant', content: '', __targetContent: '（再次发送）' + (props.message?.content || ''), __typing: true, status: 'GENERATING', blocks: [] } })
      }
      if (cmd === 'delete') {
        if (window.confirm('确认删除该消息吗？')) {
          messages.removeMessage({ topicId: props.topicId, messageId: props.message?.id })
        }
      }
    }
    const saveEdit = () => {
      messages.updateMessage({ messageId: props.message?.id, changes: { content: editContent.value, __editing: false, __editingContent: undefined } })
      bus.emit(EVENT_NAMES.EDIT_MESSAGE, { messageId: props.message?.id, editing: false })
    }
    const cancelEdit = () => {
      messages.updateMessage({ messageId: props.message?.id, changes: { __editing: false, __editingContent: undefined } })
      bus.emit(EVENT_NAMES.EDIT_MESSAGE, { messageId: props.message?.id, editing: false })
    }
    const stopThis = () => {
      bus.emit(EVENT_NAMES.STOP_GENERATING_MESSAGE, { messageId: props.message?.id })
    }
    const quickCopy = async () => {
      try { await navigator.clipboard.writeText(props.message?.content || ''); ElMessage.success('已复制') } catch {}
    }
    const onDblclick = (e) => {
      // 仅用户消息支持双击进入编辑，且避免在点击下拉或按钮时触发冒泡
      if (e?.target?.closest('.el-dropdown') || e?.target?.closest('.el-button')) return
      if (props.message?.role === 'user' && !isEditing.value) {
        messages.updateMessage({ messageId: props.message?.id, changes: { __editing: true, __editingContent: props.message?.content || '' } })
      }
    }
    const onSelect = (e) => {
      if (!props.selectable) return
      if (e.target.closest('.el-dropdown')) return
      emit('toggle-select', { id: props.message?.id, shiftKey: !!e.shiftKey, ctrlKey: !!e.ctrlKey || !!e.metaKey })
    }
    return { cls, highlightedParts, onCommand, isEditing, editContent, saveEdit, cancelEdit, formatTime, onSelect, showTime, quickCopy, onDblclick, stopThis, contentRef }
  }
}
</script>

<style scoped>
.message { display:flex; padding: 4px 0; }
.message.selected .bubble { outline: 2px solid var(--color-primary); }
.message-user { justify-content:flex-end; }
.message-assistant { justify-content:flex-start; }
.bubble { max-width: 78%; padding:12px 14px; border:1px solid var(--color-border); border-radius:12px; box-shadow: 0 1px 2px rgba(0,0,0,.15); }
.message-user .bubble { background: rgba(78,140,255,.08); border-color: rgba(78,140,255,.35); }
.message-assistant .bubble { background: var(--color-background-mute); }
.tools { margin-top:6px; text-align:right; }
.hl { background: rgba(255, 214, 10, 0.35); color: #fff; border-radius: 2px; padding: 0 1px; }
.meta { margin-top: 6px; color: var(--color-text-secondary); font-size: 12px; }
.gen-flag { margin-right: 8px; }
.quick-actions { position:absolute; right: 6px; top: 6px; opacity: 0; transition: opacity .15s; }
.bubble { position: relative; }
.bubble:hover .quick-actions { opacity: 1; }
.typing-indicator { position:absolute; left: -22px; top: 10px; }
.mini-spinner { display:inline-block; width: 14px; height: 14px; margin-right: 6px; border: 2px solid rgba(255,255,255,.25); border-top-color: #ffd60a; border-radius: 50%; animation: spin 1s linear infinite; vertical-align: middle; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>



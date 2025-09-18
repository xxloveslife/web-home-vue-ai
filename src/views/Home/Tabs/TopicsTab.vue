<template>
  <div class="topics-tab">
    <ul class="list">
      <li
        v-for="t in topicsSorted"
        :key="t.id"
        :class="{ active: t.id===activeTopic?.id }">
        <div class="row" @click="$emit('update:topic', t)">
          <div class="name">
            <el-icon v-if="t.pinned" class="pin"><StarFilled /></el-icon>
            {{ t.name }}
          </div>
        </div>
        <div class="ops">
          <el-button text size="small" @click.stop="togglePin(t)">{{ t.pinned ? '取消置顶' : '置顶' }}</el-button>
          <el-button text size="small" @click.stop="rename(t)">重命名</el-button>
          <el-button text size="small" type="danger" @click.stop="remove(t)">删除</el-button>
          <el-dropdown trigger="click" @command="(cmd) => onCommand(cmd, t)">
            <span class="el-dropdown-link">
              <el-button text size="small">更多</el-button>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="copy">复制话题</el-dropdown-item>
                <el-dropdown-item command="move">移动到其他助手</el-dropdown-item>
                <el-dropdown-item command="clear">清空消息</el-dropdown-item>
                <el-dropdown-item command="copy-selected">复制选中消息到话题（Mock）</el-dropdown-item>
                <el-dropdown-item command="move-selected">移动选中消息到话题（Mock）</el-dropdown-item>
                <el-dropdown-item divided command="export-md">导出为 Markdown（复制）</el-dropdown-item>
                <el-dropdown-item command="download-md">下载 Markdown</el-dropdown-item>
                <el-dropdown-item command="copy-image">复制话题图片（Mock）</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </li>
    </ul>

    <!-- 复制选中消息到话题 对话框 -->
    <el-dialog v-model="copyDialogVisible" title="复制选中消息到话题" width="520px">
      <el-form label-width="96px">
        <el-form-item label="目标助手">
          <el-select v-model="copyToAssistantId" placeholder="选择助手">
            <el-option v-for="a in assistantOptions" :key="a.id" :label="a.name + ' (' + a.id + ')'" :value="a.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="复制到">
          <el-radio-group v-model="copyMode">
            <el-radio label="existing">已有话题</el-radio>
            <el-radio label="new">新建话题</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="copyMode==='existing'" label="选择话题">
          <el-select v-model="copyToTopicId" placeholder="选择话题">
            <el-option v-for="t in targetAssistantTopics" :key="t.id" :label="t.name" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="copyMode==='new'" label="新话题名">
          <el-input v-model="copyNewTopicName" placeholder="请输入新话题名" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="copyDialogVisible=false">取消</el-button>
        <el-button type="primary" @click="onCopyDialogConfirm">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="dialogVisible" :title="dialogMode==='copy' ? '复制话题到助手' : '移动话题到助手'" width="420px">
      <el-form label-width="96px">
        <el-form-item label="目标助手">
          <el-select v-model="targetAssistantId" placeholder="选择助手">
            <el-option v-for="a in assistantOptions" :key="a.id" :label="a.name + ' (' + a.id + ')'" :value="a.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="onDialogCancel">取消</el-button>
        <el-button type="primary" @click="onDialogConfirm">确定</el-button>
      </template>
    </el-dialog>
    <!-- 截图预览对话框 -->
    <el-dialog v-model="imageDialogVisible" title="话题截图预览" width="720px">
      <div style="max-height:60vh; overflow:auto; text-align:center;">
        <img v-if="imageDataUrl" :src="imageDataUrl" style="max-width:100%; border-radius:8px;" />
      </div>
      <template #footer>
        <el-button @click="downloadPreview">下载 PNG</el-button>
        <el-button type="primary" @click="copyPreviewToClipboard">复制到剪贴板</el-button>
        <el-button @click="imageDialogVisible=false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
  
</template>

<script>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useAssistantsStore } from '@/stores/assistants'
import { useMessagesStore } from '@/stores/messages'
import { useRuntimeStore } from '@/stores/runtime'
import { StarFilled } from '@element-plus/icons-vue'
export default {
  name: 'TopicsTab',
  props: {
    assistant: Object,
    activeTopic: Object,
    position: String
  },
  emits: ['update:topic'],
  setup(props, { emit }) {
    const assistants = useAssistantsStore()
    const messages = useMessagesStore()
    const dialogVisible = ref(false)
    const dialogMode = ref('copy') // 'copy' | 'move'
    const targetAssistantId = ref('')
    const actionTopic = ref(null)
    const assistantOptions = computed(() => assistants.assistants || [])
    const topicsSorted = computed(() => {
      const arr = (props.assistant?.topics || []).slice()
      arr.sort((a, b) => (b.pinned === true) - (a.pinned === true))
      return arr
    })
    const rename = async (t) => {
      const name = window.prompt('重命名话题', t.name)
      if (!name || name === t.name) return
      t.name = name
    }
    const remove = async (t) => {
      if (!window.confirm('确认删除该话题吗？')) return
      const a = assistants.assistants.find(x => x.id === props.assistant.id)
      if (!a) return
      a.topics = (a.topics || []).filter(x => x.id !== t.id)
      messages.removeTopic(t.id)
      if (props.activeTopic?.id === t.id) {
        const next = a.topics?.[0]
        next && emit('update:topic', next)
      }
    }
    const togglePin = (t) => { t.pinned = !t.pinned }
    const copyDialogVisible = ref(false)
    const copyMode = ref('new') // 'existing' | 'new'
    const copyToAssistantId = ref('')
    const copyToTopicId = ref('')
    const copyNewTopicName = ref('选中汇总')
    const targetAssistantTopics = computed(() => {
      const id = copyToAssistantId.value || props.assistant?.id
      const a = assistants.assistants.find(x => x.id === id)
      return a?.topics || []
    })

    const onCommand = async (cmd, t) => {
      if (cmd === 'copy' || cmd === 'move') {
        dialogMode.value = cmd
        actionTopic.value = t
        targetAssistantId.value = props.assistant?.id || ''
        dialogVisible.value = true
      }
      if (cmd === 'clear') {
        messages.clearTopicMessages(t.id)
      }
      if (cmd === 'copy-selected') {
        copyToAssistantId.value = props.assistant?.id || ''
        copyMode.value = 'new'
        copyToTopicId.value = ''
        copyNewTopicName.value = '选中汇总'
        copyDialogVisible.value = true
      }
      if (cmd === 'move-selected') {
        copyToAssistantId.value = props.assistant?.id || ''
        copyMode.value = 'existing'
        copyToTopicId.value = ''
        copyNewTopicName.value = '目标话题'
        copyDialogVisible.value = true
        dialogMode.value = 'move-selected'
      }
      if (cmd === 'export-md') {
        const ids = messages.messageIdsByTopic[t.id] || []
        const lines = ['# ' + (t.name || '未命名话题'), '']
        ids.forEach((id) => {
          const m = messages.entities[id]
          if (!m) return
          const prefix = m.role === 'user' ? '用户' : '助手'
          lines.push(`## ${prefix}`)
          lines.push('')
          lines.push(m.content || '')
          lines.push('')
        })
        try { await navigator.clipboard.writeText(lines.join('\n')) } catch {}
      }
      if (cmd === 'download-md') {
        const ids = messages.messageIdsByTopic[t.id] || []
        const lines = ['# ' + (t.name || '未命名话题'), '']
        ids.forEach((id) => {
          const m = messages.entities[id]
          if (!m) return
          const prefix = m.role === 'user' ? '用户' : '助手'
          lines.push(`## ${prefix}`)
          lines.push('')
          lines.push(m.content || '')
          lines.push('')
        })
        const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${t.name || 'topic'}.md`
        a.click()
        URL.revokeObjectURL(url)
      }
      if (cmd === 'copy-image') {
        try {
          actionTopic.value = t
          const { default: html2canvas } = await import('html2canvas')
          const el = document.getElementById('messages')
          if (!el) return
          const canvas = await html2canvas(el, { backgroundColor: null, scale: 1 })
          imageDataUrl.value = canvas.toDataURL('image/png')
          imageDialogVisible.value = true
        } catch (e) {
          console.warn('复制话题图片失败（Mock）：', e)
        }
      }
    }

    const onDialogConfirm = () => {
      const toAssistant = assistants.assistants.find(x => x.id === targetAssistantId.value)
      if (!toAssistant || !actionTopic.value) { dialogVisible.value = false; return }
      if (dialogMode.value === 'copy') {
        const newTopic = { id: 't' + Math.random().toString(36).slice(2, 9), assistantId: toAssistant.id, name: actionTopic.value.name + ' - 副本' }
        assistants.addTopicToAssistant(toAssistant.id, newTopic)
        messages.copyTopicMessages(actionTopic.value.id, newTopic.id)
        emit('update:topic', newTopic)
      }
      if (dialogMode.value === 'move') {
        assistants.moveTopicToAssistant(actionTopic.value.id, props.assistant.id, toAssistant.id)
        emit('update:topic', assistants.activeTopic)
      }
      dialogVisible.value = false
    }

    const onDialogCancel = () => { dialogVisible.value = false }
    const imageDialogVisible = ref(false)
    const imageDataUrl = ref('')
    const copyPreviewToClipboard = async () => {
      if (!imageDataUrl.value) return
      try {
        if (navigator.clipboard && window.ClipboardItem) {
          const resp = await fetch(imageDataUrl.value)
          const blob = await resp.blob()
          await navigator.clipboard.write([new window.ClipboardItem({ [blob.type]: blob })])
          ElMessage.success('已复制到剪贴板')
        } else {
          await navigator.clipboard.writeText(imageDataUrl.value)
          ElMessage.success('已复制图片数据链接')
        }
      } catch (e) {
        console.warn('复制到剪贴板失败：', e)
      }
    }
    const downloadPreview = () => {
      if (!imageDataUrl.value) return
      const a = document.createElement('a')
      a.href = imageDataUrl.value
      const name = (actionTopic.value?.name || 'topic') + '.png'
      a.download = name
      a.click()
    }

    const onCopyDialogConfirm = () => {
      const fromTopicId = props.activeTopic?.id
      if (!fromTopicId) { copyDialogVisible.value = false; return }
      const runtime = useRuntimeStore()
      const selected = runtime.getSelectedIds(fromTopicId)
      if (!selected || selected.length === 0) { copyDialogVisible.value = false; return }
      const toAssistantId = copyToAssistantId.value || props.assistant?.id
      const toAssistant = assistants.assistants.find(x => x.id === toAssistantId)
      if (!toAssistant) { copyDialogVisible.value = false; return }
      const moveMode = dialogMode.value === 'move-selected'
      if (copyMode.value === 'existing') {
        if (!copyToTopicId.value) { return }
        if (moveMode) messages.moveMessagesToTopic(fromTopicId, selected, copyToTopicId.value)
        else messages.copyMessagesToTopic(fromTopicId, selected, copyToTopicId.value)
        const targetTopic = toAssistant.topics.find(x => x.id === copyToTopicId.value)
        targetTopic && emit('update:topic', targetTopic)
      } else {
        const name = (copyNewTopicName.value || '选中汇总').trim()
        const newTopic = { id: 't' + Math.random().toString(36).slice(2, 9), assistantId: toAssistant.id, name }
        assistants.addTopicToAssistant(toAssistant.id, newTopic)
        if (moveMode) messages.moveMessagesToTopic(fromTopicId, selected, newTopic.id)
        else messages.copyMessagesToTopic(fromTopicId, selected, newTopic.id)
        emit('update:topic', newTopic)
      }
      copyDialogVisible.value = false
    }

    return { rename, remove, onCommand, dialogVisible, dialogMode, targetAssistantId, assistantOptions, onDialogConfirm, onDialogCancel, topicsSorted, togglePin, StarFilled, copyDialogVisible, copyMode, copyToAssistantId, copyToTopicId, copyNewTopicName, targetAssistantTopics, onCopyDialogConfirm, imageDialogVisible, imageDataUrl, copyPreviewToClipboard, downloadPreview }
  }
}
</script>

<style scoped>
.topics-tab { display:flex; flex-direction:column; height:100%; }
.list { list-style:none; padding:0; margin:0; overflow:auto; }
.list li { padding:10px 12px; border-bottom:1px solid var(--color-border); display:flex; flex-direction:column; gap:6px; }
.row { cursor:pointer; }
.list li.active { background: var(--color-background-mute); }
.name { font-weight:600; }
.ops { display:flex; gap:6px; opacity: 0; transition: opacity .2s; }
.list li:hover .ops { opacity: 1; }
.pin { color: var(--color-primary); margin-right: 6px; }
</style>


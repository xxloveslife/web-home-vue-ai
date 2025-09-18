<template>
  <div class="assistants-tab">
    <div class="header">
      <el-button size="small" @click="createDefault">创建默认助手</el-button>
      <el-button size="small" @click="createEmpty">新增助手</el-button>
      <el-button size="small" @click="triggerImport">导入助手（Mock）</el-button>
      <input ref="fileRef" type="file" accept="application/json" style="display:none" @change="onImport" />
    </div>
    <ul class="list">
      <li v-for="a in assistants" :key="a.id" :class="{ active: a.id===activeAssistant?.id }">
        <div class="row" @click="$emit('update:assistant', a)">
          <div class="name">{{ a.name }}</div>
          <div class="model">{{ a.model?.name }}</div>
        </div>
        <div class="ops">
          <el-dropdown trigger="click" @command="(cmd) => onCmd(cmd, a)">
            <span class="el-dropdown-link">
              <el-button text size="small">更多</el-button>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="duplicate">复制助手（Mock）</el-dropdown-item>
                <el-dropdown-item command="export">导出配置（Mock）</el-dropdown-item>
                <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </li>
    </ul>
  </div>
  
</template>

<script>
import { computed, ref } from 'vue'
import { useAssistantsStore } from '@/stores/assistants'

export default {
  name: 'AssistantsTab',
  props: { activeAssistant: Object },
  emits: ['update:assistant'],
  setup() {
    const assistants = useAssistantsStore()
    const list = computed(() => assistants.assistants)
    const active = computed(() => assistants.activeAssistant)
    const fileRef = ref(null)

    const createDefault = () => {
      const id = 'a' + Math.random().toString(36).slice(2, 8)
      const tId = 't' + Math.random().toString(36).slice(2, 8)
      const a = { id, name: '默认助手', model: { id: 'gpt-4o', name: 'GPT-4o' }, topics: [{ id: tId, assistantId: id, name: '新话题' }] }
      assistants.addAssistant(a)
    }
    const createEmpty = () => {
      const id = 'a' + Math.random().toString(36).slice(2, 8)
      const a = { id, name: '新助手', model: { id: 'gpt-4o-mini', name: 'GPT-4o-mini' }, topics: [] }
      assistants.addAssistant(a)
    }
    const triggerImport = () => fileRef.value && fileRef.value.click()
    const onImport = async (e) => {
      const f = e?.target?.files?.[0]
      if (!f) return
      try {
        const text = await f.text()
        const obj = JSON.parse(text)
        const id = obj.id || ('a' + Math.random().toString(36).slice(2, 8))
        const fixed = { id, name: obj.name || '导入助手', model: obj.model || { id: 'gpt-4o', name: 'GPT-4o' }, topics: Array.isArray(obj.topics) ? obj.topics : [] }
        assistants.addAssistant(fixed)
      } catch {}
      e.target.value = ''
    }
    const remove = (a) => {
      if (!window.confirm('确认删除该助手吗？')) return
      assistants.removeAssistant(a.id)
    }
    const onCmd = (cmd, a) => {
      if (cmd === 'duplicate') {
        const id = 'a' + Math.random().toString(36).slice(2, 8)
        const tId = 't' + Math.random().toString(36).slice(2, 8)
        const copy = { id, name: a.name + ' 副本', model: a.model, topics: [{ id: tId, assistantId: id, name: '新话题' }] }
        assistants.addAssistant(copy)
      }
      if (cmd === 'export') {
        // Mock：下载 JSON
        const blob = new Blob([JSON.stringify(a, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${a.name}.json`
        link.click()
        URL.revokeObjectURL(url)
      }
      if (cmd === 'delete') remove(a)
    }

    return { assistants: list, activeAssistant: active, createDefault, createEmpty, remove, onCmd, fileRef, triggerImport, onImport }
  }
}
</script>

<style scoped>
.assistants-tab { display:flex; flex-direction:column; height:100%; }
.header { display:flex; gap:8px; padding:8px 12px; border-bottom:1px solid var(--color-border); }
.list { list-style:none; padding:0; margin:0; overflow:auto; }
.list li { padding:10px 12px; border-bottom:1px solid var(--color-border); }
.row { cursor:pointer; }
.list li.active { background: var(--color-background-mute); }
.name { font-weight:600; }
.model { color: var(--color-text-secondary); font-size:12px; }
.ops { margin-top:6px; }
</style>



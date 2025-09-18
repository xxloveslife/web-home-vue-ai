<template>
  <el-dialog v-model="visible" title="搜索消息" width="720px" :destroy-on-close="true">
    <div class="search-bar">
      <el-input v-model="keyword" placeholder="输入关键字后回车或点击搜索" @keydown.enter.native.prevent="doSearch" clearable />
      <el-radio-group v-model="scope" size="small">
        <el-radio-button label="current">当前助手</el-radio-button>
        <el-radio-button label="all">全部助手</el-radio-button>
      </el-radio-group>
      <el-checkbox v-model="includeUser" style="margin-left:8px;">包含用户消息</el-checkbox>
      <el-button type="primary" @click="doSearch">搜索</el-button>
    </div>
    <div class="results" v-if="searched">
      <div v-if="results.length === 0" class="empty">无匹配结果</div>
      <div v-else class="groups">
        <div v-for="assistantGroup in groupedResults" :key="assistantGroup.assistant.id" class="assistant-group">
          <div class="assistant-title">{{ assistantGroup.assistant.name }}</div>
          <div v-for="topicGroup in assistantGroup.topics" :key="topicGroup.topic.id" class="topic-group">
            <div class="topic-title">{{ topicGroup.topic.name }}</div>
            <ul class="list">
              <li v-for="item in topicGroup.items" :key="item.message.id" class="result-item">
                <div class="snippet" v-html="item.highlight"></div>
                <div class="actions">
                  <el-button size="small" @click="locate(item)">定位到消息</el-button>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
  
</template>

<script>
import { ref, computed, nextTick } from 'vue'
import { useAssistantsStore } from '@/stores/assistants'
import { useMessagesStore } from '@/stores/messages'
import { messagesMockByTopic } from '@/mocks'
import { bus as eventBus, EVENT_NAMES } from '@/plugins/eventBus'

const resolver = {
  _resolve: null,
  show() { return new Promise((resolve) => (this._resolve = resolve)) },
  resolve(v) { this._resolve && this._resolve(v); this._resolve = null }
}

export default {
  name: 'SearchPopup',
  setup() {
    const visible = ref(false)
    const keyword = ref('')
    const scope = ref('current')
    const includeUser = ref(true)
    const searched = ref(false)
    const results = ref([])
    const groupedResults = computed(() => {
      const map = new Map()
      for (const item of results.value) {
        const aId = item.assistant.id
        const tId = item.topic.id
        if (!map.has(aId)) map.set(aId, { assistant: item.assistant, topics: new Map() })
        const aGroup = map.get(aId)
        if (!aGroup.topics.has(tId)) aGroup.topics.set(tId, { topic: item.topic, items: [] })
        aGroup.topics.get(tId).items.push(item)
      }
      return Array.from(map.values()).map((g) => ({ assistant: g.assistant, topics: Array.from(g.topics.values()) }))
    })

    const assistants = useAssistantsStore()
    const messages = useMessagesStore()

    const open = async () => { visible.value = true; searched.value = false; results.value = []; keyword.value=''; return await resolver.show() }

    const highlight = (text, kw) => {
      if (!kw) return text
      try {
        const re = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
        return text.replace(re, (m) => `<mark>${m}</mark>`)
      } catch (_) {
        return text
      }
    }

    const doSearch = () => {
      const kw = keyword.value.trim()
      searched.value = true
      results.value = []
      if (!kw) return
      const items = []
      const assistantsToSearch = scope.value === 'all' ? (assistants.assistants || []) : [assistants.activeAssistant].filter(Boolean)
      for (const a of assistantsToSearch) {
        for (const t of a.topics || []) {
          const ids = messages.messageIdsByTopic[t.id]
          const arr = Array.isArray(ids) && ids.length
            ? ids.map((id) => messages.entities[id]).filter(Boolean)
            : (messagesMockByTopic[t.id] || [])
          for (const m of arr) {
            if (!includeUser.value && m.role !== 'assistant') continue
            if ((m.content || '').toLowerCase().includes(kw.toLowerCase())) {
              items.push({ assistant: a, topic: t, message: m, highlight: highlight(m.content || '', kw) })
            }
          }
        }
      }
      results.value = items
    }

    const locate = async (item) => {
      // 切换到对应助理与话题
      assistants.setActiveAssistant(item.assistant)
      assistants.setActiveTopic(item.topic)
      // 等待渲染后定位
      await nextTick()
      setTimeout(() => {
        eventBus.emit(EVENT_NAMES.LOCATE_MESSAGE, { messageId: item.message.id })
      }, 250)
      visible.value = false
      resolver.resolve({})
    }

    return { visible, keyword, scope, includeUser, searched, results, groupedResults, open, doSearch, locate }
  }
}
</script>

<style scoped>
.search-bar { display:flex; gap:8px; align-items:center; margin-bottom:12px; }
.results { max-height:60vh; overflow:auto; }
.list { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:10px; }
.result-item { border:1px solid var(--color-border); border-radius:8px; padding:10px 12px; background: var(--color-background-mute); }
.meta { color: var(--color-text-secondary); font-size:12px; margin-bottom:6px; }
.sep { margin: 0 6px; }
.snippet :deep(mark) { background: rgba(255, 214, 10, 0.35); color: #fff; border-radius:2px; padding:0 1px; }
.actions { margin-top:8px; display:flex; justify-content:flex-end; }
.empty { color: var(--color-text-secondary); text-align:center; padding:24px 0; }
</style>



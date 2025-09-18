<template>
  <div id="messages" class="messages" @scroll="onScroll">
    <div
      v-for="m in filteredMessages"
      :key="m.id"
      class="message-row"
      :data-id="m.id"
      :ref="(el) => setMessageEl(m.id, el)"
    >
      <Message :message="m" :highlight-keyword="keyword" :topic-id="topic?.id" :selectable="multiSelect" :selected="isSelected(m.id)" @toggle-select="toggleSelect" />
    </div>
    <div ref="bottomSentinel" class="bottom-sentinel"></div>
  </div>
  
</template>

<script>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useMessagesStore } from '@/stores/messages'
import { useRuntimeStore } from '@/stores/runtime'
import Message from './Message.vue'

export default {
  name: 'Messages',
  components: { Message },
  props: {
    assistant: Object,
    topic: Object,
    multiSelect: Boolean
  },
  emits: ['updated','first-update','scrolled'],
  setup(props, { emit, expose }) {
    const store = useMessagesStore()
    const runtime = useRuntimeStore()
    const keyword = ref('')
    const messages = computed(() => {
      const ids = store.messageIdsByTopic[props.topic?.id] || []
      return ids.map(id => store.entities[id]).filter(Boolean)
    })
    const filteredMessages = computed(() => {
      const kw = keyword.value.trim()
      if (!kw) return messages.value
      try {
        const re = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
        return messages.value.filter(m => re.test(m.content || ''))
      } catch (_) {
        return messages.value
      }
    })

    const highlights = ref([])
    const messageEls = new Map()
    const currentIndex = ref(0)

    const collectHighlights = () => {
      const container = document.getElementById('messages')
      highlights.value = container ? Array.from(container.querySelectorAll('.hl')) : []
    }

    const scrollToMatch = (idx) => {
      const el = highlights.value[idx]
      if (!el) return
      const row = el.closest('.message-row') || el
      const container = document.getElementById('messages')
      if (!container) return
      const targetTop = (row.offsetTop || 0) - Math.max(0, Math.floor(container.clientHeight * 0.25))
      container.scrollTo({ top: targetTop, behavior: 'smooth' })
    }

    const setMessageEl = (id, el) => {
      if (!id) return
      if (el) messageEls.set(id, el)
      else messageEls.delete(id)
    }

    onMounted(() => emit('first-update'))
    watch(messages, () => emit('updated'))
    // 话题切换时，触发一次 first-update 以便外层执行进入话题的滚底逻辑
    watch(() => props.topic?.id, async () => {
      await nextTick()
      emit('first-update')
    })

    const onScroll = (e) => {
      const el = e?.target || document.getElementById('messages')
      if (!el) return
      emit('scrolled', { scrollTop: el.scrollTop, clientHeight: el.clientHeight, scrollHeight: el.scrollHeight })
    }

    // Multi-select
    const selectedIds = ref(new Set())
    const topicIdRef = computed(() => props.topic?.id)
    const selectedIdsRef = computed(() => new Set(runtime.getSelectedIds(topicIdRef.value)))
    const lastIndex = ref(-1)
    const idIndexMap = computed(() => {
      const map = new Map()
      filteredMessages.value.forEach((m, i) => map.set(m.id, i))
      return map
    })
    const toggleSelect = (payload) => {
      const { id, shiftKey } = payload || {}
      const topicId = topicIdRef.value
      if (!id) return
      if (shiftKey && lastIndex.value >= 0) {
        const start = Math.min(lastIndex.value, idIndexMap.value.get(id) ?? lastIndex.value)
        const end = Math.max(lastIndex.value, idIndexMap.value.get(id) ?? lastIndex.value)
        const ids = filteredMessages.value.slice(start, end + 1).map(m => m.id)
        runtime.setSelectedIds(topicId, ids)
      } else {
        runtime.toggle(topicId, id)
        lastIndex.value = idIndexMap.value.get(id) ?? -1
      }
    }
    const isSelected = (id) => selectedIdsRef.value.has(id)
    const getSelectedIds = () => Array.from(selectedIdsRef.value)
    const clearSelection = () => runtime.clearSelected(topicIdRef.value)
    const selectAll = () => runtime.setSelectedIds(topicIdRef.value, filteredMessages.value.map(m => m.id))
    const invertSelection = () => {
      const next = []
      const set = selectedIdsRef.value
      const ids = filteredMessages.value.map(m => m.id)
      ids.forEach(id => { if (!set.has(id)) next.push(id) })
      runtime.setSelectedIds(topicIdRef.value, next)
    }
    const setKeyword = async (kw) => {
      keyword.value = kw || ''
      await nextTick()
      collectHighlights()
      currentIndex.value = 0
      if (highlights.value.length > 0) {
        scrollToMatch(0)
      }
    }

    const nextMatch = () => {
      if (!highlights.value.length) return
      currentIndex.value = (currentIndex.value + 1) % highlights.value.length
      scrollToMatch(currentIndex.value)
    }

    const prevMatch = () => {
      if (!highlights.value.length) return
      currentIndex.value = (currentIndex.value - 1 + highlights.value.length) % highlights.value.length
      scrollToMatch(currentIndex.value)
    }

    const locateMessageById = async (id) => {
      await nextTick()
      const el = messageEls.get(id)
      const container = document.getElementById('messages')
      if (!el || !container) return
      const top = (el.offsetTop || 0) - Math.max(0, Math.floor(container.clientHeight * 0.25))
      container.scrollTo({ top, behavior: 'smooth' })
      el.classList.add('locating')
      setTimeout(() => el.classList.remove('locating'), 1500)
    }

    // 底部哨兵：用 IntersectionObserver 判断是否在底部
    const bottomSentinel = ref(null)
    let observer = null
    onMounted(() => {
      const container = document.getElementById('messages')
      if (!container || !bottomSentinel.value) return
      try {
        observer = new IntersectionObserver((entries) => {
          const vis = entries.some((e) => e.isIntersecting)
          emit('scrolled', { atBottom: vis })
        }, { root: container, threshold: 0.01 })
        observer.observe(bottomSentinel.value)
      } catch {}
    })
    onBeforeUnmount(() => { try { observer && observer.disconnect() } catch {} })

    const getKeyword = () => keyword.value
    const clearKeyword = async () => { await setKeyword('') }
    expose({ getSelectedIds, clearSelection, selectAll, invertSelection, toggleSelect, isSelected, setKeyword, getKeyword, clearKeyword })
    return { messages, filteredMessages, keyword, setKeyword, onScroll, nextMatch, prevMatch, setMessageEl, locateMessageById, toggleSelect, isSelected, getSelectedIds, clearSelection, selectAll, invertSelection, bottomSentinel }
  }
}
</script>

<style scoped>
.messages { flex:1; overflow:auto; padding: 12px; display:flex; flex-direction:column; gap: 10px; }
.message-row.locating { outline: 2px solid var(--color-primary); outline-offset: 2px; border-radius: 6px; }
.bottom-sentinel { height: 1px; }
</style>



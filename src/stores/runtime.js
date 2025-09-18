import { defineStore } from 'pinia'

export const useRuntimeStore = defineStore('runtime', {
  state: () => ({
    selectedIdsByTopic: {},
    scrollTopByTopic: {}
  }),
  getters: {
    getSelectedIds: (s) => (topicId) => s.selectedIdsByTopic[topicId] || [],
    getScrollTop: (s) => (topicId) => s.scrollTopByTopic[topicId] ?? 0
  },
  actions: {
    setSelectedIds(topicId, ids) {
      this.selectedIdsByTopic[topicId] = Array.from(new Set(ids))
    },
    clearSelected(topicId) {
      this.selectedIdsByTopic[topicId] = []
    },
    toggle(topicId, id) {
      const list = new Set(this.selectedIdsByTopic[topicId] || [])
      if (list.has(id)) list.delete(id)
      else list.add(id)
      this.selectedIdsByTopic[topicId] = Array.from(list)
    },
    setScrollTop(topicId, scrollTop) {
      if (!topicId) return
      this.scrollTopByTopic[topicId] = Math.max(0, Number(scrollTop) || 0)
    }
  }
})



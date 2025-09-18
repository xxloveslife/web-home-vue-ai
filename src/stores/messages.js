import { defineStore } from 'pinia'
import { messagesMockByTopic } from '@/mocks'

export const useMessagesStore = defineStore('messages', {
  state: () => {
    try {
      const raw = localStorage.getItem('messages')
      if (raw) return JSON.parse(raw)
    } catch {}
    return {
      entities: {},
      messageIdsByTopic: {},
      loadingByTopic: {},
      fulfilledByTopic: {},
      displayCount: 20
    }
  },
  actions: {
    loadTopicMessages(topicId) {
      // 如果该话题已在内存中有消息（例如刚复制/新增），避免被 Mock 覆盖
      const existing = this.messageIdsByTopic[topicId]
      if (existing && existing.length > 0) {
        this.loadingByTopic[topicId] = false
        return
      }
      const arr = messagesMockByTopic[topicId] || []
      arr.forEach(m => { this.entities[m.id] = m })
      this.messageIdsByTopic[topicId] = arr.map(m => m.id)
      this.loadingByTopic[topicId] = false
    },
    setTopicFulfilled({ topicId, fulfilled }) {
      this.fulfilledByTopic[topicId] = fulfilled
    },
    addMessage({ topicId, message }) {
      this.entities[message.id] = message
      this.messageIdsByTopic[topicId] = this.messageIdsByTopic[topicId] || []
      this.messageIdsByTopic[topicId].push(message.id)
    },
    updateMessage({ messageId, changes }) {
      const current = this.entities[messageId]
      if (!current) return
      this.entities[messageId] = { ...current, ...changes }
    },
    removeMessage({ topicId, messageId }) {
      const ids = this.messageIdsByTopic[topicId] || []
      this.messageIdsByTopic[topicId] = ids.filter((id) => id !== messageId)
      delete this.entities[messageId]
    },
    copyTopicMessages(fromTopicId, toTopicId) {
      const srcIds = this.messageIdsByTopic[fromTopicId] || []
      if (!srcIds.length) return
      const genId = () => 'm' + Math.random().toString(36).slice(2, 10)
      this.messageIdsByTopic[toTopicId] = this.messageIdsByTopic[toTopicId] || []
      for (const mid of srcIds) {
        const src = this.entities[mid]
        if (!src) continue
        const newId = genId()
        const cloned = { ...src, id: newId, topicId: toTopicId }
        this.entities[newId] = cloned
        this.messageIdsByTopic[toTopicId].push(newId)
      }
      this.loadingByTopic[toTopicId] = false
      this.fulfilledByTopic[toTopicId] = true
    },
    clearTopicMessages(topicId) {
      const ids = this.messageIdsByTopic[topicId] || []
      ids.forEach((id) => delete this.entities[id])
      this.messageIdsByTopic[topicId] = []
      this.loadingByTopic[topicId] = false
      this.fulfilledByTopic[topicId] = false
    },
    copyMessagesToTopic(fromTopicId, messageIds, toTopicId) {
      const ids = (messageIds && messageIds.length) ? messageIds : (this.messageIdsByTopic[fromTopicId] || [])
      const genId = () => 'm' + Math.random().toString(36).slice(2, 10)
      this.messageIdsByTopic[toTopicId] = this.messageIdsByTopic[toTopicId] || []
      ids.forEach((mid) => {
        const src = this.entities[mid]
        if (!src) return
        const newId = genId()
        this.entities[newId] = { ...src, id: newId, topicId: toTopicId }
        this.messageIdsByTopic[toTopicId].push(newId)
      })
      this.loadingByTopic[toTopicId] = false
      this.fulfilledByTopic[toTopicId] = true
    },
    moveMessagesToTopic(fromTopicId, messageIds, toTopicId) {
      const ids = (messageIds && messageIds.length) ? messageIds : (this.messageIdsByTopic[fromTopicId] || [])
      if (!ids.length) return
      this.copyMessagesToTopic(fromTopicId, ids, toTopicId)
      // 从来源话题中移除这些消息
      const fromIds = this.messageIdsByTopic[fromTopicId] || []
      this.messageIdsByTopic[fromTopicId] = fromIds.filter((id) => !ids.includes(id))
      ids.forEach((id) => { delete this.entities[id] })
      this.loadingByTopic[fromTopicId] = false
    },
    removeTopic(topicId) {
      const ids = this.messageIdsByTopic[topicId] || []
      // 可选：移除实体，避免内存堆积
      ids.forEach(id => { delete this.entities[id] })
      delete this.messageIdsByTopic[topicId]
      delete this.loadingByTopic[topicId]
      delete this.fulfilledByTopic[topicId]
    }
  }
})

// persist
try {
  useMessagesStore().$subscribe((_m, state) => {
    try { localStorage.setItem('messages', JSON.stringify(state)) } catch {}
  })
} catch {}



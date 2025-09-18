import { defineStore } from 'pinia'
import { assistantsMock } from '@/mocks'

export const useAssistantsStore = defineStore('assistants', {
  state: () => {
    try {
      const raw = localStorage.getItem('assistants')
      if (raw) {
        const parsed = JSON.parse(raw)
        return {
          assistants: parsed.assistants || assistantsMock,
          activeAssistantId: parsed.activeAssistantId ?? (assistantsMock?.[0]?.id || null),
          activeTopicId: parsed.activeTopicId ?? (assistantsMock?.[0]?.topics?.[0]?.id || null)
        }
      }
    } catch {}
    return {
      assistants: assistantsMock,
      activeAssistantId: assistantsMock?.[0]?.id || null,
      activeTopicId: assistantsMock?.[0]?.topics?.[0]?.id || null
    }
  },
  getters: {
    activeAssistant(s) { return s.assistants.find(a => a.id === s.activeAssistantId) || null },
    activeTopic(s) {
      const a = this.activeAssistant
      return a?.topics?.find(t => t.id === s.activeTopicId) || null
    }
  },
  actions: {
    setActiveAssistant(assistant) {
      if (!assistant || assistant.id === this.activeAssistantId) return
      this.activeAssistantId = assistant.id
      const firstTopic = assistant.topics?.[0] || null
      if (firstTopic) this.setActiveTopic(firstTopic)
    },
    setActiveTopic(topic) {
      if (!topic || topic.id === this.activeTopicId) return
      this.activeTopicId = topic.id
    },
    addAssistant(assistant) { this.assistants.push(assistant) },
    updateAssistantModel(assistantId, model) {
      const a = this.assistants.find(x => x.id === assistantId)
      if (a) a.model = model
    },
    removeAssistant(assistantId) {
      const idx = this.assistants.findIndex(a => a.id === assistantId)
      if (idx >= 0) {
        this.assistants.splice(idx, 1)
        if (this.activeAssistantId === assistantId) {
          const first = this.assistants[0]
          this.activeAssistantId = first?.id || null
          this.activeTopicId = first?.topics?.[0]?.id || null
        }
      }
    },
    addTopicToAssistant(assistantId, topic) {
      const a = this.assistants.find(x => x.id === assistantId)
      if (!a) return
      a.topics = a.topics || []
      a.topics.push(topic)
      this.activeAssistantId = assistantId
      this.activeTopicId = topic.id
    },
    removeTopicFromAssistant(assistantId, topicId) {
      const a = this.assistants.find(x => x.id === assistantId)
      if (!a) return
      a.topics = (a.topics || []).filter(t => t.id !== topicId)
      if (this.activeTopicId === topicId) {
        const first = a.topics?.[0]
        this.activeTopicId = first?.id || null
      }
    },
    moveTopicToAssistant(topicId, fromAssistantId, toAssistantId) {
      if (fromAssistantId === toAssistantId) return
      const from = this.assistants.find(x => x.id === fromAssistantId)
      const to = this.assistants.find(x => x.id === toAssistantId)
      if (!from || !to) return
      const idx = (from.topics || []).findIndex(t => t.id === topicId)
      if (idx < 0) return
      const topic = { ...from.topics[idx], assistantId: toAssistantId }
      from.topics.splice(idx, 1)
      to.topics = to.topics || []
      to.topics.push(topic)
      this.activeAssistantId = toAssistantId
      this.activeTopicId = topic.id
    }
  }
})

// persist
try {
  useAssistantsStore().$subscribe((_m, state) => {
    try { localStorage.setItem('assistants', JSON.stringify(state)) } catch {}
  })
} catch {}



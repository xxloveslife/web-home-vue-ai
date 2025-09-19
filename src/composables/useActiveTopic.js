import { watch } from 'vue'
import { useAssistantsStore } from '@/stores/assistants'
import { useMessagesStore } from '@/stores/messages'
import { bus, EVENT_NAMES } from '@/plugins/eventBus'

export function useActiveTopicEffect() {
  const assistants = useAssistantsStore()
  const messages = useMessagesStore()

  watch(() => assistants.activeTopicId, (topicId) => {
    if (!topicId) return
    messages.loadTopicMessages(topicId)
    const topic = assistants.activeTopic
    bus.emit(EVENT_NAMES.CHANGE_TOPIC, topic)
  }, { immediate: true })
}




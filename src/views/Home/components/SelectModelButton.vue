<template>
  <el-dropdown trigger="click" @command="onSelect">
    <span class="el-dropdown-link">
      模型：{{ currentModel?.name || '未选择' }}
    </span>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item v-for="m in models" :key="m.id" :command="m">{{ m.name }}</el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
  
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'SelectModelButton',
  props: { assistant: Object },
  setup(props) {
    const models = computed(() => [
      { id: 'gpt-4o', name: 'GPT-4o' },
      { id: 'gpt-4o-mini', name: 'GPT-4o-mini' },
      { id: 'qwen2.5', name: 'Qwen2.5' }
    ])
    const currentModel = computed(() => props.assistant?.model)
    const onSelect = (m) => {
      if (!props.assistant) return
      const { useAssistantsStore } = require('@/stores/assistants')
      const store = useAssistantsStore()
      store.updateAssistantModel(props.assistant.id, m)
    }
    return { models, currentModel, onSelect }
  }
}
</script>

<style scoped>
.el-dropdown-link { cursor:pointer; color: var(--color-text); }
</style>



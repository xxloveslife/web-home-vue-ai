<template>
  <el-drawer v-model="visible" title="助理列表" size="30%" :with-header="true" append-to-body destroy-on-close>
    <ul class="list">
      <li v-for="a in assistants" :key="a.id" @click="select(a)">
        <div class="name">{{ a.name }}</div>
        <div class="model">{{ a.model?.name }}</div>
      </li>
    </ul>
  </el-drawer>
  
</template>

<script>
import { ref, computed } from 'vue'
import { useAssistantsStore } from '@/stores/assistants'

const bus = {
  _resolve: null,
  show() {
    return new Promise((resolve) => {
      this._resolve = resolve
    })
  },
  resolve(v) { this._resolve && this._resolve(v); this._resolve = null }
}

export default {
  name: 'AssistantsDrawer',
  setup() {
    const store = useAssistantsStore()
    const visible = ref(false)
    const assistants = computed(() => store.assistants)

    const select = (a) => {
      store.setActiveAssistant(a)
      visible.value = false
      bus.resolve(a)
    }

    const open = async () => {
      visible.value = true
      return await bus.show()
    }

    return { visible, assistants, select, open }
  }
}
</script>

<style scoped>
.list { list-style:none; padding:0; margin:0; }
.list li { padding:10px 12px; border-bottom:1px solid var(--color-border); cursor:pointer; }
.name { font-weight:600; }
.model { color: var(--color-text-secondary); font-size:12px; }
</style>



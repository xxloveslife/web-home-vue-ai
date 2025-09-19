<template>
  <el-dialog v-model="visible" title="快捷键帮助" width="520px">
    <ul class="list">
      <li><b>Ctrl+F</b> 打开搜索</li>
      <li><b>F3 / Shift+F3</b> 下一个/上一个命中</li>
      <li><b>Alt+J / Alt+K</b> 底部/顶部</li>
      <li><b>Ctrl+L</b> 聚焦输入框</li>
      <li><b>Ctrl+C / Ctrl+Shift+C</b> 复制选中/复制到输入框</li>
      <li><b>Ctrl+A / Ctrl+I</b> 全选/反选（多选模式）</li>
      <li><b>Ctrl+Enter / Shift+Enter</b> 再次发送/继续对话</li>
      <li><b>Esc</b> 清除搜索高亮</li>
    </ul>
    <template #footer>
      <el-button type="primary" @click="visible=false">知道了</el-button>
    </template>
  </el-dialog>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { bus, EVENT_NAMES } from '@/plugins/eventBus'
export default {
  name: 'ShortcutsHelp',
  setup() {
    const visible = ref(false)
    const open = () => (visible.value = true)
    onMounted(() => bus.on(EVENT_NAMES.OPEN_SHORTCUTS, open))
    onBeforeUnmount(() => bus.off && bus.off(EVENT_NAMES.OPEN_SHORTCUTS, open))
    return { visible }
  }
}
</script>

<style scoped>
.list { list-style: none; padding: 0; margin: 0; }
.list li { padding: 6px 0; display:flex; gap: 8px; align-items: baseline; }
.list b { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
</style>


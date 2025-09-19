<template>
  <el-button text size="small" @click="onClick">检查更新</el-button>
</template>

<script>
import { defineComponent } from 'vue'
import { ElMessage } from 'element-plus'

export default defineComponent({
  name: 'UpdateAppButton',
  setup() {
    const onClick = () => {
      try { ElMessage.info('暂未接入更新流程（占位）') } catch {}
    }
    return { onClick }
  }
})
</script>

<style scoped>
</style>



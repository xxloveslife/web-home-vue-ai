<template>
  <el-button text size="small" @click="check">检查更新</el-button>
</template>

<script>
export default {
  name: 'UpdateAppButton',
  setup() {
    const check = () => {
      // Web 端模拟：弹提示
      window?.alert?.('已是最新版本（Mock）')
    }
    return { check }
  }
}
</script>

<style scoped>
</style>



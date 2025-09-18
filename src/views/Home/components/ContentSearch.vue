<template>
  <div class="content-search">
    <el-input v-model="keyword" placeholder="搜索内容" />
    <el-checkbox v-model="includeUser">包含用户消息</el-checkbox>
    <el-button @click="doSearch">搜索</el-button>
  </div>
  
</template>

<script>
import { ref } from 'vue'
export default {
  name: 'ContentSearch',
  emits: ['search'],
  setup(_, { emit }) {
    const keyword = ref('')
    const includeUser = ref(false)
    const doSearch = () => emit('search', { keyword: keyword.value, includeUser: includeUser.value })
    return { keyword, includeUser, doSearch }
  }
}
</script>

<style scoped>
.content-search { display:flex; align-items:center; gap:8px; padding:8px; border-top:1px solid var(--color-border); }
</style>



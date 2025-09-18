<template>
  <div class="home-navbar">
    <div class="navbar-left" v-if="showAssistants">
      <el-tooltip content="隐藏侧边栏" placement="bottom">
        <el-button text size="small" @click="toggleAssistants"><el-icon><ArrowLeft /></el-icon></el-button>
      </el-tooltip>
      <el-tooltip content="新建话题" placement="bottom">
        <el-button text size="small" @click="addNewTopic"><el-icon><CirclePlus /></el-icon></el-button>
      </el-tooltip>
    </div>
    <div class="navbar-right">
      <div class="right-actions">
        <el-tooltip v-if="!showAssistants" content="显示侧边栏" placement="bottom">
          <el-button text size="small" @click="toggleAssistants"><el-icon><ArrowRight /></el-icon></el-button>
        </el-tooltip>
        <el-tooltip content="助理列表" placement="bottom">
          <el-button text size="small" @click="showAssistantsDrawer"><el-icon><Menu /></el-icon></el-button>
        </el-tooltip>
        <el-tooltip content="切换话题栏" placement="bottom">
          <el-button text size="small" @click="toggleTopics"><el-icon><Switch /></el-icon></el-button>
        </el-tooltip>
        <SelectModelButton :assistant="activeAssistant" />
        <UpdateAppButton />
        <el-tooltip content="搜索消息" placement="bottom">
          <el-button text size="small" @click="openSearch"><el-icon><Search /></el-icon></el-button>
        </el-tooltip>
        <el-button text size="small" @click="openShortcuts">快捷键</el-button>
        <el-button text size="small" @click="clearHighlight">清除高亮</el-button>
        <el-divider direction="vertical" />
        <el-button text size="small" @click="toggleMultiSelect">多选</el-button>
        <el-button text size="small" @click="selectAll">全选</el-button>
        <el-button text size="small" @click="invertSelect">反选</el-button>
        <el-button text size="small" type="danger" @click="batchDelete">批量删除</el-button>
        <el-button text size="small" @click="batchCopy">复制选中</el-button>
        <el-button text size="small" @click="exportSelectedMd">导出选中为 Markdown</el-button>
        <el-button text size="small" @click="downloadSelectedMd">下载选中为 Markdown</el-button>
        <el-button text size="small" @click="batchCopyToInput">复制到输入框</el-button>
      </div>
    </div>
    <AssistantsDrawer ref="assistantsDrawerRef" />
    <SearchPopup ref="searchPopupRef" />
  </div>
  
</template>

<script>
import { computed, ref } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { bus, EVENT_NAMES } from '@/plugins/eventBus'
import { ArrowLeft, ArrowRight, CirclePlus, Menu, Switch, Search } from '@element-plus/icons-vue'
import AssistantsDrawer from './components/AssistantsDrawer.vue'
import SelectModelButton from './components/SelectModelButton.vue'
import UpdateAppButton from './components/UpdateAppButton.vue'
import SearchPopup from './components/SearchPopup.vue'

export default {
  name: 'Navbar',
  components: { AssistantsDrawer, SelectModelButton, UpdateAppButton, SearchPopup },
  props: {
    activeAssistant: Object,
    activeTopic: Object,
    position: String
  },
  emits: ['update:assistant','update:topic'],
  setup() {
    const settings = useSettingsStore()
    const assistantsDrawerRef = ref(null)
    const searchPopupRef = ref(null)
    const showAssistants = computed(() => settings.showAssistants)
    const showTopics = computed(() => settings.showTopics)
    const topicPosition = computed(() => settings.topicPosition)

    const toggleAssistants = () => settings.toggleShowAssistants()
    const toggleTopics = () => {
      if (topicPosition.value === 'right') {
        settings.toggleShowTopics()
      } else {
        settings.toggleShowAssistants()
      }
    }
    const addNewTopic = () => bus.emit(EVENT_NAMES.ADD_NEW_TOPIC)
    const showAssistantsDrawer = async () => {
      await assistantsDrawerRef.value?.open()
    }
    const openSearch = async () => {
      const keyword = await searchPopupRef.value?.open()
      if (keyword) {
        const { bus, EVENT_NAMES } = await import('@/plugins/eventBus')
        bus.emit(EVENT_NAMES.SEARCH_IN_CHAT, { keyword, includeUser: true })
      }
    }
    const clearHighlight = () => {
      bus.emit(EVENT_NAMES.SEARCH_IN_CHAT, { keyword: '', includeUser: true })
    }
    const openShortcuts = () => bus.emit(EVENT_NAMES.OPEN_SHORTCUTS)

    // 监听 OPEN_SEARCH_POPUP（Ctrl+F）来打开弹窗
    const onOpenSearch = async () => {
      await openSearch()
    }
    bus.on(EVENT_NAMES.OPEN_SEARCH_POPUP, onOpenSearch)

    const toggleMultiSelect = () => bus.emit(EVENT_NAMES.MULTI_SELECT_ON)
    const selectAll = () => bus.emit(EVENT_NAMES.MULTI_SELECT_SELECT_ALL)
    const invertSelect = () => bus.emit(EVENT_NAMES.MULTI_SELECT_INVERT)
    const batchDelete = () => bus.emit(EVENT_NAMES.MULTI_SELECT_BATCH_DELETE)
    const batchCopy = () => bus.emit(EVENT_NAMES.MULTI_SELECT_BATCH_COPY)
    const batchCopyToInput = () => bus.emit(EVENT_NAMES.MULTI_SELECT_BATCH_COPY_TO_INPUT)
    const exportSelectedMd = () => bus.emit(EVENT_NAMES.MULTI_SELECT_EXPORT_MD)
    const downloadSelectedMd = () => bus.emit(EVENT_NAMES.MULTI_SELECT_EXPORT_MD_FILE)

    return { showAssistants, showTopics, toggleAssistants, toggleTopics, addNewTopic, showAssistantsDrawer, assistantsDrawerRef, searchPopupRef, openSearch, clearHighlight, openShortcuts, toggleMultiSelect, selectAll, invertSelect, batchDelete, batchCopy, batchCopyToInput, exportSelectedMd, downloadSelectedMd, ArrowLeft, ArrowRight, CirclePlus, Menu, Switch, Search }
  }
}
</script>

<style scoped>
.home-navbar {
  height: var(--navbar-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  background: var(--color-background);
  border-bottom: 1px solid var(--color-border);
}
.navbar-left, .navbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.icon {
  height: 30px;
  padding: 0 7px;
  border-radius: 8px;
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-icon);
  cursor: pointer;
}
.icon:hover { background: var(--color-background-mute); color: var(--color-icon-white); }
</style>



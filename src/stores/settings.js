import { defineStore } from 'pinia'
import { settingsMock } from '@/mocks'

export const useSettingsStore = defineStore('settings', {
  state: () => {
    let init = { ...settingsMock }
    try {
      const raw = localStorage.getItem('settings')
      if (raw) init = { ...init, ...JSON.parse(raw) }
    } catch {}
    return init
  },
  getters: {
    isLeftNavbar: (s) => s.navbarPosition === 'left',
    isTopNavbar: (s) => s.navbarPosition === 'top'
  },
  actions: {
    setThemeMode(mode) { this.themeMode = mode },
    setPrimaryColor(c) { this.primaryColor = c },
    setNavbarPosition(pos) { this.navbarPosition = pos },
    setTopicPosition(pos) { this.topicPosition = pos },
    setShowAssistants(v) { this.showAssistants = !!v },
    setShowTopics(v) { this.showTopics = !!v },
    setShowMessageTime(v) { this.showMessageTime = !!v },
    setTimeFormat(v) { this.timeFormat = v },
    toggleShowAssistants() { this.showAssistants = !this.showAssistants },
    toggleShowTopics() { this.showTopics = !this.showTopics }
  }
})

// 持久化：监听 settings 改变保存到 localStorage（简化）
try {
  const unsub = useSettingsStore().$subscribe((_mutation, state) => {
    try { localStorage.setItem('settings', JSON.stringify(state)) } catch {}
  })
} catch {}



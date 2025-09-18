import { ref } from 'vue'

export function useChatScroll({
  getContainer,
  ensureTyping,
  bottomThreshold = 0,
  smooth = true,
  autoFollowOnSend = true,
  autoFollowOnReturnBottom = true,
  pauseOnEdit = false,
  onAutoFollowChange,
  rememberPosition = false,
  getPositionKey,
  readPosition,
  writePosition
} = {}) {
  const atBottom = ref(true)
  const lastAtBottom = ref(true)
  const newCount = ref(0)
  const autoScrollEnabled = ref(true)
  const manualPause = ref(false)
  const firstUpdateCompleted = ref(false)

  const emitAutoFollow = () => {
    try { onAutoFollowChange && onAutoFollowChange({ autoFollow: autoScrollEnabled.value }) } catch {}
  }

  const scrollToTop = () => {
    const el = getContainer && getContainer()
    el && el.scrollTo({ top: 0, behavior: smooth ? 'smooth' : 'auto' })
  }

  const scrollToBottom = () => {
    const el = getContainer && getContainer()
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
      autoScrollEnabled.value = true
      manualPause.value = false
      emitAutoFollow()
    }
  }

  const goBottomAndClear = () => {
    scrollToBottom()
    newCount.value = 0
    autoScrollEnabled.value = true
    manualPause.value = false
    emitAutoFollow()
  }

  const onFirstUpdate = () => {
    setTimeout(() => {
      if (rememberPosition && typeof readPosition === 'function' && typeof getPositionKey === 'function') {
        try {
          const key = getPositionKey()
          const saved = readPosition(key)
          const el = getContainer && getContainer()
          if (el && (saved || saved === 0)) {
            const pos = Math.max(0, Number(saved) || 0)
            // 多次尝试恢复，确保内容渲染完成后仍能命中
            const restore = () => {
              const el2 = getContainer && getContainer()
              el2 && el2.scrollTo({ top: pos, behavior: 'auto' })
            }
            // 立即一次
            restore()
            // 下一帧一次
            try { requestAnimationFrame(restore) } catch { setTimeout(restore, 0) }
            // 稍后一次
            setTimeout(restore, 120)
            autoScrollEnabled.value = false
            manualPause.value = true
          } else {
            scrollToBottom()
            autoScrollEnabled.value = true
            newCount.value = 0
          }
        } catch {
          scrollToBottom()
          autoScrollEnabled.value = true
          newCount.value = 0
        }
      } else {
        // 进入话题后默认滚到底并开启自动跟随
        scrollToBottom()
        autoScrollEnabled.value = true
        newCount.value = 0
      }
      firstUpdateCompleted.value = true
      emitAutoFollow()
    }, 100)
  }

  const onMessagesUpdate = () => {
    if (!firstUpdateCompleted.value) return
    if (autoScrollEnabled.value) {
      scrollToBottom()
      newCount.value = 0
    } else {
      newCount.value++
    }
    ensureTyping && ensureTyping()
  }

  const onScrolled = ({ atBottom: isBottom, scrollTop, clientHeight, scrollHeight }) => {
    if (typeof isBottom === 'boolean') {
      atBottom.value = !!isBottom
    } else if (
      typeof scrollTop === 'number' &&
      typeof clientHeight === 'number' &&
      typeof scrollHeight === 'number'
    ) {
      const dist = Math.max(0, scrollHeight - (scrollTop + clientHeight))
      atBottom.value = dist <= bottomThreshold
    } else {
      atBottom.value = false
    }

    // 回到底部：根据配置恢复自动跟随并清零新消息
    if (atBottom.value) {
      newCount.value = 0
      if (autoFollowOnReturnBottom) {
        autoScrollEnabled.value = true
        manualPause.value = false
        emitAutoFollow()
      }
    }
    lastAtBottom.value = atBottom.value

    // 记忆当前位置
    if (rememberPosition && typeof writePosition === 'function' && typeof getPositionKey === 'function') {
      try {
        if (typeof scrollTop === 'number') {
          const key = getPositionKey()
          writePosition(key, Math.max(0, Number(scrollTop) || 0))
        }
      } catch {}
    }
  }

  const onUserScrollIntent = () => {
    autoScrollEnabled.value = false
    manualPause.value = true
    emitAutoFollow()
  }

  const onSendHook = () => {
    if (autoFollowOnSend) {
      autoScrollEnabled.value = true
      manualPause.value = false
      emitAutoFollow()
      scrollToBottom()
    }
  }

  const onEditToggle = ({ editing }) => {
    if (!pauseOnEdit) return
    if (editing) {
      autoScrollEnabled.value = false
      manualPause.value = true
    } else if (atBottom.value) {
      autoScrollEnabled.value = true
      manualPause.value = false
    }
    emitAutoFollow()
  }

  return {
    // state
    atBottom, newCount, autoScrollEnabled, manualPause,
    // actions
    scrollToTop, scrollToBottom, goBottomAndClear,
    onFirstUpdate, onMessagesUpdate, onScrolled, onUserScrollIntent, onSendHook, onEditToggle,
  }
}



import hotkeys from 'hotkeys-js'

export function useShortcuts() {
  const register = (combo, handler) => {
    hotkeys(combo, (e) => {
      e.preventDefault()
      handler && handler(e)
    })
  }
  const unregister = (combo) => hotkeys.unbind(combo)
  const unregisterAll = () => hotkeys.unbind()
  return { register, unregister, unregisterAll }
}




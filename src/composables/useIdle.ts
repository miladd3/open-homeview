import { onBeforeUnmount, onMounted } from 'vue'

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel'] as const

/** Calls `onIdle` after `timeoutMs` without any user input. */
export function useIdle(timeoutMs: number, onIdle: () => void) {
  let timer: ReturnType<typeof setTimeout> | undefined

  function reset() {
    clearTimeout(timer)
    timer = setTimeout(onIdle, timeoutMs)
  }

  onMounted(() => {
    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, reset, { passive: true }))
    reset()
  })

  onBeforeUnmount(() => {
    clearTimeout(timer)
    ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, reset))
  })

  return { reset }
}

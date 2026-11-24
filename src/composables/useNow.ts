import { onBeforeUnmount, onMounted, ref } from 'vue'

/** Reactive current time, updated on each wall-clock second. */
export function useNow() {
  const now = ref(new Date())
  let timer: ReturnType<typeof setTimeout> | undefined

  function tick() {
    now.value = new Date()
    timer = setTimeout(tick, 1000 - now.value.getMilliseconds())
  }

  onMounted(tick)
  onBeforeUnmount(() => clearTimeout(timer))

  return now
}

/** 09:41 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

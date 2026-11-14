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

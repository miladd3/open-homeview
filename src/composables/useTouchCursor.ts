import { onBeforeUnmount, onMounted } from 'vue'

const HIDDEN_CLASS = '-touch'

/**
 * Hides the mouse cursor while the screen is used by touch. Media queries can't do
 * this on the Pi: under cage, Chromium also sees a pointer device, so `hover: none`
 * never matches. Starts hidden on any device with a touchscreen; a real mouse
 * moving shows the cursor again, and the next touch hides it.
 */
export function useTouchCursor() {
  const root = document.documentElement

  function onPointer(event: PointerEvent) {
    root.classList.toggle(HIDDEN_CLASS, event.pointerType === 'touch')
  }

  onMounted(() => {
    root.classList.toggle(HIDDEN_CLASS, matchMedia('(any-pointer: coarse)').matches)
    window.addEventListener('pointerdown', onPointer, { passive: true })
    window.addEventListener('pointermove', onPointer, { passive: true })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('pointerdown', onPointer)
    window.removeEventListener('pointermove', onPointer)
    root.classList.remove(HIDDEN_CLASS)
  })
}

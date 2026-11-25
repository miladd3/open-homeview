import { onBeforeUnmount } from 'vue'

const LONG_PRESS_MS = 500
const MOVE_TOLERANCE_PX = 10

/**
 * Calls `onLongPress` when a pointer stays down for half a second without moving.
 * Bind the returned handlers on the element; `onClickCapture` swallows the click
 * that ends a long-press, so it doesn't also tap what is under it. `when` can
 * skip a press (e.g. one that starts on a widget).
 */
export function useLongPress(
  onLongPress: () => void,
  when: (event: PointerEvent) => boolean = () => true,
) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let start: { x: number; y: number } | undefined
  let fired = false

  function cancel() {
    clearTimeout(timer)
    start = undefined
  }

  onBeforeUnmount(cancel)

  return {
    onPointerdown(event: PointerEvent) {
      fired = false
      if (!when(event)) return
      start = { x: event.clientX, y: event.clientY }
      timer = setTimeout(() => {
        fired = true
        start = undefined
        onLongPress()
      }, LONG_PRESS_MS)
    },
    onPointermove(event: PointerEvent) {
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > MOVE_TOLERANCE_PX)
        cancel()
    },
    onPointerup: cancel,
    onPointercancel: cancel,
    onClickCapture(event: MouseEvent) {
      if (!fired) return
      event.stopPropagation()
      fired = false
    },
  }
}

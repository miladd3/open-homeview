import { defineComponent, inject, type InjectionKey, type VNode } from 'vue'

/** Given by StandbyHost: the widget in a slot of the face it shows, or nothing. */
export const FACE_SLOTS: InjectionKey<(name: string) => VNode | undefined> = Symbol('face slots')

/**
 * Where a face puts the widget kiosk.yaml set for a slot: `<FaceSlot name="right1" />`.
 * It renders the widget in its place (a class on it styles the widget's box),
 * or nothing when the slot is empty.
 */
export default defineComponent({
  name: 'FaceSlot',
  props: { name: { type: String, required: true } },
  setup(props) {
    const widgetIn = inject(FACE_SLOTS, () => undefined)
    return () => widgetIn(props.name)
  },
})

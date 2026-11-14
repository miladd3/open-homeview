<script setup lang="ts">
// iOS style on/off switch. Native button attributes (aria-label, disabled…) fall
// through; bind with v-model or :model-value + @update:model-value.
const model = defineModel<boolean>({ required: true })
</script>

<template>
  <button
    class="toggle-switch"
    :class="{ '-on': model }"
    type="button"
    role="switch"
    :aria-checked="model"
    @click="model = !model"
  >
    <span class="knob" aria-hidden="true" />
  </button>
</template>

<style scoped lang="scss">
.toggle-switch {
  position: relative;
  flex: none;
  width: 84px;
  height: 50px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-pill);
  background: rgb(120 120 128 / 36%);
  cursor: pointer;
  transition: background-color var(--duration-base) ease;

  &:disabled {
    opacity: 0.4;
    pointer-events: none;
  }

  > .knob {
    position: absolute;
    top: 4px;
    left: 4px;
    width: 42px;
    height: 42px;
    border-radius: var(--radius-pill);
    background: #fff;
    box-shadow: 0 3px 8px rgb(0 0 0 / 25%);
    transition: transform var(--duration-base) var(--ease-spring);
  }

  &:active > .knob {
    width: 50px;
  }

  &.-on {
    background: var(--color-success);

    > .knob {
      transform: translateX(34px);
    }

    &:active > .knob {
      transform: translateX(26px);
    }
  }
}
</style>

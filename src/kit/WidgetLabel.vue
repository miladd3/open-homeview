<script setup lang="ts">
// A widget's name with one line of detail under it ("Living Room", "On · 80%").
defineProps<{ name: string; detail?: string }>()
</script>

<template>
  <span class="kit-widget-label">
    <span class="name">{{ name }}</span>
    <span v-if="detail" class="detail">{{ detail }}</span>
  </span>
</template>

<style scoped lang="scss">
.kit-widget-label {
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin-top: auto;
  line-height: 1.2;

  > .name,
  > .detail {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  > .name {
    font-size: calc(var(--u) * 11);
    font-weight: 600;
  }

  > .detail {
    color: var(--widget-detail-color, var(--color-text-secondary));
    font-size: calc(var(--u) * 10);
    font-weight: 500;
  }
}
</style>

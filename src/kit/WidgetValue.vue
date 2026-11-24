<script setup lang="ts">
// The big number of a widget (21°, 42%). It grows with the widget: twice as big in 2x2.
</script>

<template>
  <span class="kit-widget-value"><slot /></span>
</template>

<style scoped lang="scss">
.kit-widget-value {
  font-size: 30cqmin;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.03em;
  white-space: nowrap;
}
</style>

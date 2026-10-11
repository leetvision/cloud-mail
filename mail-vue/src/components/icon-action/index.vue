<template>
  <button type="button" class="icon-action" :aria-label="label" :title="label">
    <Icon :icon="icon" :width="width" :height="height" :color="color" aria-hidden="true" />
  </button>
</template>

<script setup>
import { Icon } from '@iconify/vue'

defineProps({
  icon: { type: String, required: true },
  label: { type: String, required: true },
  width: { type: [String, Number], default: 20 },
  height: { type: [String, Number], default: 20 },
  color: String,
})
</script>

<style scoped>
.icon-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: var(--control-size);
  height: var(--control-size);
  border-radius: var(--control-radius);
  color: inherit;
  cursor: pointer;
  transition: background-color 150ms ease;
}

.icon-action:hover {
  background: var(--el-fill-color-light);
}

.icon-action:active {
  background: var(--el-fill-color);
}

.icon-action:disabled {
  color: var(--el-text-color-disabled);
  cursor: default;
}
</style>

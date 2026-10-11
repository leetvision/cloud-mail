<template>
  <iframe
      ref="frame"
      class="email-frame"
      :style="{ height: `${height}px` }"
      :srcdoc="html"
      sandbox="allow-same-origin"
      referrerpolicy="no-referrer"
      csp="default-src 'none'; img-src 'self' data: blob:; style-src 'unsafe-inline'; font-src 'self' data:; base-uri 'none'; form-action 'none';"
      title="Email content"
      @load="measureContent"
  />
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'

defineProps({
  html: { type: String, required: true },
})

const frame = ref(null)
const height = ref(160)
let observer
let resizeFrame

function measureContent() {
  observer?.disconnect()
  const document = frame.value?.contentDocument
  if (!document?.body) return
  height.value = 160
  const resize = () => {
    cancelAnimationFrame(resizeFrame)
    resizeFrame = requestAnimationFrame(() => {
      height.value = Math.max(160, document.body.scrollHeight, document.documentElement.scrollHeight)
    })
  }
  observer = new ResizeObserver(resize)
  observer.observe(document.body)
  resize()
}

onBeforeUnmount(() => {
  observer?.disconnect()
  cancelAnimationFrame(resizeFrame)
})
</script>

<style scoped>
.email-frame {
  display: block;
  width: 100%;
  border: 0;
  background: #fff;
}
</style>

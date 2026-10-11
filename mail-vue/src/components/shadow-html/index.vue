<template>
  <iframe
      ref="frame"
      class="email-frame"
      :style="{ height: `${height}px` }"
      :srcdoc="documentHtml"
      sandbox="allow-same-origin"
      referrerpolicy="no-referrer"
      csp="default-src 'none'; img-src 'self' data: blob:; style-src 'unsafe-inline'; font-src 'self' data:; base-uri 'none'; form-action 'none';"
      title="Email content"
      @load="measureContent"
  />
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'

const props = defineProps({
  html: { type: String, required: true },
})

// Defaults for unstyled messages; later sender-provided styles retain precedence.
const documentHtml = computed(() => `<style>body{margin:0;font:14px/1.6 Arial,sans-serif;color:#202124;overflow-wrap:anywhere}img{max-width:100%;height:auto}</style>${props.html}`)

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

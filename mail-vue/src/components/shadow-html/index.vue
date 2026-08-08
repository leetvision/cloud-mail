<template>
  <iframe
      class="email-frame"
      :srcdoc="html"
      sandbox="allow-same-origin"
      referrerpolicy="no-referrer"
      csp="default-src 'none'; img-src 'self' data: blob:; style-src 'unsafe-inline'; font-src 'self' data:; base-uri 'none'; form-action 'none';"
      title="Email content"
  />
</template>

<script setup>
defineProps({
  html: {
    type: String,
    required: true
  }
})
</script>

<style scoped>
.email-frame {
  width: 100%;
  height: 100%;
  border: 0;
  background: #fff;
}
</style>

<template>
  <div class="layout" :inert="uiStore.composerModal">
    <header class="app-header" :inert="isMobile && uiStore.asideShow"><Header /></header>
    <div class="workspace">
      <el-aside id="mail-navigation" class="aside" :inert="isMobile && !uiStore.asideShow" :class="uiStore.asideShow ? 'aside-show' : 'aside-hide'" :role="isMobile && uiStore.asideShow ? 'dialog' : undefined" :aria-modal="isMobile && uiStore.asideShow ? true : undefined" :aria-label="$t('mailNavigation')">
        <div v-if="isMobile && uiStore.asideShow" class="navigation-header"><span>{{ $t('mailNavigation') }}</span><button type="button" class="navigation-close" :aria-label="$t('closeNavigation')" @click="uiStore.asideShow = false"><Icon icon="material-symbols:close-rounded" width="24" /></button></div>
        <Aside />
      </el-aside>
      <div v-if="uiStore.asideShow && isMobile" class="navigation-overlay" @click="uiStore.asideShow = false"></div>
      <main id="mail-main" class="main-container" :inert="isMobile && uiStore.asideShow"><Main /></main>
    </div>
  </div>
  <writer ref="writerRef" />
</template>

<script setup>
import Aside from '@/layout/aside/index.vue'
import Header from '@/layout/header/index.vue'
import Main from '@/layout/main/index.vue'
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import {useUiStore} from "@/store/ui.js";
import writer from '@/layout/write/index.vue'
import { Icon } from '@iconify/vue';

const uiStore = useUiStore();
const writerRef = ref({})
const isMobile = ref(window.innerWidth < 1025)
const handleResize = () => {
  const mobile = window.innerWidth < 1025;
  if (mobile !== isMobile.value) uiStore.asideShow = !mobile;
  isMobile.value = mobile;
}

onMounted(() => {
  uiStore.writerRef = writerRef

  window.addEventListener('resize', handleResize)
  window.addEventListener('keydown', handleDrawerKey)
  uiStore.asideShow = !isMobile.value;
  handleResize()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('keydown', handleDrawerKey)
})

let drawerFocus;
watch(() => uiStore.asideShow, async visible => {
  if (!isMobile.value) return;
  if (visible) drawerFocus = document.activeElement;
  await nextTick();
  if (visible) document.querySelector('.aside button')?.focus();
  else drawerFocus?.focus();
});
function handleDrawerKey(event) {
  if (event.defaultPrevented || event.target.closest?.('.el-dialog, .el-message-box, .el-popper')) return;
  if (!isMobile.value || !uiStore.asideShow || uiStore.composerShow) return;
  if (event.key === 'Escape') { event.preventDefault(); uiStore.asideShow = false; return; }
  if (event.key !== 'Tab') return;
  const items = [...document.querySelectorAll('.aside button, .aside .el-menu-item, .aside [tabindex="0"]')].filter(el => el.getClientRects().length);
  if (!items.length) return;
  const current = items.indexOf(document.activeElement);
  event.preventDefault();
  items[(current + (event.shiftKey ? -1 : 1) + items.length) % items.length]?.focus();
}
</script>

<style scoped>
.layout { height: 100dvh; display: grid; grid-template-rows: var(--app-header-height) minmax(0, 1fr); background: var(--mail-shell); overflow: hidden; }
.app-header { min-width: 0; }
.workspace { display: flex; min-height: 0; position: relative; }
.aside { flex: 0 0 256px; width: 256px; background: var(--mail-shell); display: flex; flex-direction: column; }
.aside :deep(.navigation-scroll) { flex: 1; min-height: 0; height: auto; }
.aside-hide { flex-basis: 72px; width: 72px; }
.navigation-header { display: flex; align-items: center; justify-content: space-between; min-height: 56px; padding: 8px 12px 0 24px; font-weight: 500; }
.navigation-close { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 50%; color: var(--secondary-text-color); cursor: pointer; }
.navigation-close:hover { background: var(--mail-nav-hover); }
.main-container { flex: 1; min-width: 0; min-height: 0; margin: 0 16px 16px 0; background: var(--el-bg-color); border-radius: 16px; overflow: hidden; }
.navigation-overlay { position: fixed; inset: 0; background: rgb(0 0 0 / .32); z-index: 99; }
@media (max-width: 1024px) {
  .aside-hide { position: absolute; transform: translateX(-100%); visibility: hidden; }
  .aside-show { position: fixed; inset: 0 auto 0 0; z-index: 101; max-width: calc(100vw - 48px); box-shadow: 4px 0 24px rgb(0 0 0 / .16); }
  .main-container { margin-left: 16px; }
}
@media (max-width: 767px) { .main-container { margin: 0; border-radius: 0; } }
</style>

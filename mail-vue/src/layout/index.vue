<template>
  <el-container class="layout" :inert="uiStore.composerShow">
    <el-aside
        class="aside"
        :inert="!uiStore.asideShow"
        :class="uiStore.asideShow ? 'aside-show' : 'el-aside-hide'">
      <Aside />
    </el-aside>
    <div
        :class="(uiStore.asideShow && isMobile)? 'overlay-show':'overlay-hide'"
        @click="uiStore.asideShow = false"
    ></div>
    <el-container class="main-container" :inert="isMobile && uiStore.asideShow">
      <el-main>
        <el-header>
            <Header />
        </el-header>
        <Main />
      </el-main>
    </el-container>
  </el-container>
  <writer ref="writerRef" />
</template>

<script setup>
import Aside from '@/layout/aside/index.vue'
import Header from '@/layout/header/index.vue'
import Main from '@/layout/main/index.vue'
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import {useUiStore} from "@/store/ui.js";
import writer from '@/layout/write/index.vue'

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
  if (visible) document.querySelector('.aside .el-menu-item')?.focus();
  else drawerFocus?.focus();
});
function handleDrawerKey(event) {
  if (!isMobile.value || !uiStore.asideShow || uiStore.composerShow) return;
  if (event.key === 'Escape') { uiStore.asideShow = false; return; }
  if (event.key !== 'Tab') return;
  const items = [...document.querySelectorAll('.aside button, .aside .el-menu-item, .aside [tabindex="0"]')].filter(el => el.getClientRects().length);
  if (!items.length) return;
  const current = items.indexOf(document.activeElement);
  event.preventDefault();
  items[(current + (event.shiftKey ? -1 : 1) + items.length) % items.length]?.focus();
}
</script>

<style lang="scss" scoped>
.el-aside-hide {
  position: fixed;
  left: 0;
  height: 100%;
  z-index: 100;
  transform: translateX(-100%);
  transition: all 100ms ease;
}

.aside-show {
  -webkit-box-shadow: var(--aside-right-border);
  box-shadow: var(--aside-right-border);
  transform: translateX(0);
  transition: all 100ms ease;
  z-index: 101;
  @media (max-width: 1024px) {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 101;
    height: 100%;
    background: var(--el-bg-color);
  }
}

.el-aside {
  width: auto;
  max-width: calc(100% - 44px);
  transition: all 100ms ease;
}

.layout {
  height: 100%;
  height: 100dvh;
  position: fixed;
  width: 100%;
  top: 0;
  left: 0;
  overflow: hidden;
}

.main-container {
  min-width: 0;
  min-height: 0;
  height: 100%;
  background: var(--el-bg-color);
  overflow: hidden;
  -webkit-overflow-scrolling: touch;
}

.el-main {
  display: grid;
  grid-template-rows: var(--app-header-height) minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  padding: 0;
}

.el-header {
  background: var(--el-bg-color);
  border-bottom: solid 1px var(--el-border-color);
  padding: 0 env(safe-area-inset-right) 0 env(safe-area-inset-left);
}

.overlay-show {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100dvh;
  background: rgba(0, 0, 0, 0.4);
  z-index: 99;
  transition: all 0.3s;
}

.overlay-hide {
  display: flex;
  pointer-events: none;
  opacity: 0;
}
</style>

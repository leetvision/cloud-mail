<template>
  <div :class="accountShow && hasPerm('account:query') ? 'main-box-show' : 'main-box-hide'">
    <div :class="accountShow && hasPerm('account:query') ? 'block-show' : 'block-hide'" @click="uiStore.accountShow = false"></div>
    <account :inert="!(accountShow && hasPerm('account:query'))" :class="accountShow && hasPerm('account:query') ? 'show' : 'hide'" />
    <router-view :inert="mobileAccountOpen" class="main-view" v-slot="{ Component,route }">
      <keep-alive :include="['email','all-email','send','sys-setting','star','user','role','analysis','reg-key','draft']">
        <component :is="Component" :key="route.name"/>
      </keep-alive>
    </router-view>
  </div>
</template>
<script setup>
import account from '@/layout/account/index.vue'
import {useUiStore} from "@/store/ui.js";
import {useSettingStore} from "@/store/setting.js";
import {computed, onBeforeUnmount, onMounted, watch, ref, nextTick} from "vue";
import { useRoute } from 'vue-router'
import { hasPerm } from "@/perm/perm.js"

const settingStore = useSettingStore()
const uiStore = useUiStore();
const route = useRoute()
let  innerWidth =  window.innerWidth

let elNotification = null
let noticeStyle

const accountShow = computed(() => {
  return uiStore.accountShow && settingStore.settings.manyEmail === 0
})

const isNarrow = ref(window.innerWidth < 768);
const mobileAccountOpen = computed(() => isNarrow.value && accountShow.value && hasPerm('account:query'));
let accountFocus;
watch(mobileAccountOpen, async visible => {
  if (visible) accountFocus = document.activeElement;
  await nextTick();
  if (visible) document.querySelector('.account-box button')?.focus();
  else accountFocus?.focus();
});
function handleAccountKey(event) {
  if (!mobileAccountOpen.value || uiStore.composerShow || event.target.closest?.('.el-dialog, .el-popper, .el-message-box')) return;
  if (event.key === 'Escape') { uiStore.accountShow = false; return; }
  if (event.key !== 'Tab') return;
  const controls = [...document.querySelectorAll('.account-box button, .account-box [tabindex="0"]')].filter(el => el.getClientRects().length && !el.closest('[inert]'));
  if (!controls.length) return;
  const first = controls[0], last = controls.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}

watch(() => uiStore.changeNotice, () => {

  const settings = settingStore.settings

  let data = {
    notice: settings.notice,
    noticeWidth: settings.noticeWidth,
    noticeTitle: settings.noticeTitle,
    noticeContent: settings.noticeContent,
    noticeType: settings.noticeType,
    noticeDuration: settings.noticeDuration,
    noticePosition: settings.noticePosition,
    noticeOffset: settings.noticeOffset
  }

  showNotice(data)
})

watch(() => uiStore.changePreview, () => {
  showNotice(uiStore.previewData)
})

function showNotice(data) {

  if (data.notice === 1) {
    return;
  }

  if (elNotification) {
    elNotification.close()
  }

  if (!noticeStyle) {
    noticeStyle = document.createElement('style');
    document.head.appendChild(noticeStyle);
  }
  const noticeWidth = Math.min(Math.max(Number(data.noticeWidth) || 400, 240), 1200);
  noticeStyle.textContent = `
  .custom-notice.el-notification {
    --el-notification-width: min(${noticeWidth}px, var(--overlay-width)) !important;
    --notice-offset: ${Math.max(0, Number(data.noticeOffset) || 0)}px;
  }
  `;

  elNotification = ElNotification({
    title: data.noticeTitle,
    message: String(data.noticeContent || ''),
    type: data.noticeType === 'none' ? '' : data.noticeType,
    duration: data.noticeDuration,
    position: data.noticePosition,
    offset: data.noticeOffset,
    dangerouslyUseHTMLString: false,
    customClass: `custom-notice ${data.noticePosition?.startsWith('bottom') ? 'notice-bottom' : 'notice-top'}`
  })
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  window.addEventListener('keydown', handleAccountKey)
  handleResize()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('keydown', handleAccountKey)
  elNotification?.close()
  noticeStyle?.remove()
})

const handleResize = () => {
  const width = window.innerWidth;
  isNarrow.value = width < 768;
  if (['content', 'email', 'send'].includes(route.meta.name) && (innerWidth > 767) !== (width > 767)) {
    uiStore.accountShow = width > 767;
  }
  innerWidth = width;
}

</script>
<style lang="scss" scoped>

.block-show {
  position: fixed;
  @media (max-width: 767px) {
    position: absolute;
    right: 0;
    border: 0;
    height: 100%;
    width: 100%;
    background: #000000;
    opacity: 0.6;
    z-index: 10;
    transition: all 300ms;
  }
}

.block-hide {
  position: fixed;
  pointer-events: none;
  transition: all 300ms;
}

.show {
  transition: all 100ms;
  @media (max-width: 767px) {
    position: absolute;
    inset: 0 auto 0 0;
    z-index: 100;
    width: min(var(--mailbox-width), 100%);
  }
}

.hide {
  transition: all 100ms;
  position: absolute;
  inset: 0 auto 0 0;
  width: var(--mailbox-width);
  transform: translateX(-100%);
  opacity: 0;
  @media (max-width: 1024px) {
    width: 260px;
    z-index: 100;
  }
}


.main-box-show {
  display: grid;
  grid-template-columns: var(--mailbox-width) minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  min-width: 0;
  position: relative;
  overflow: hidden;
  @media (max-width: 767px) {
    grid-template-columns: minmax(0, 1fr);
  }
}

.main-box-hide {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  height: 100%;
  min-height: 0;
  min-width: 0;
  position: relative;
  overflow: hidden;
}


.main-view {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding-bottom: env(safe-area-inset-bottom);
  background: var(--el-bg-color);
}


.navigation {
  height: 30px;
  border-bottom: solid 1px var(--el-menu-border-color);
  display: inline-flex;
  justify-items: center;
  align-items: center;
  width: 100%;
  .tag {
    background: var(--el-bg-color);
    margin-left: 5px;
  }
}
</style>

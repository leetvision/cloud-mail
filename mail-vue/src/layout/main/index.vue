<template>
  <div class="main-box">
    <router-view class="main-view" v-slot="{ Component, route }">
      <keep-alive :include="['email','all-email','send','sys-setting','star','user','role','analysis','reg-key','draft']">
        <component :is="Component" :key="route.name" />
      </keep-alive>
    </router-view>
  </div>
</template>
<script setup>
import {useUiStore} from "@/store/ui.js";
import {useSettingStore} from "@/store/setting.js";
import {onBeforeUnmount, watch} from "vue";

const settingStore = useSettingStore()
const uiStore = useUiStore();

let elNotification = null
let noticeStyle

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

onBeforeUnmount(() => {
  elNotification?.close()
  noticeStyle?.remove()
})
</script>
<style scoped>
.main-box { height: 100%; min-width: 0; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr); }
.main-view { min-width: 0; min-height: 0; overflow: auto; background: var(--el-bg-color); padding-bottom: env(safe-area-inset-bottom); }
</style>

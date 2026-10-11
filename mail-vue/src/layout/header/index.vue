<template>
  <div class="header">
    <div class="header-brand">
      <button type="button" class="icon-item menu-toggle" :aria-label="$t('toggleNavigation')" :aria-expanded="uiStore.asideShow" aria-controls="mail-navigation" @click="changeAside"><Icon icon="material-symbols:menu-rounded" width="24" /></button>
      <router-link to="/inbox" class="brand-link"><Icon icon="material-symbols:mail-outline-rounded" width="32" /><span>{{ settingStore.settings.title }}</span></router-link>
    </div>
    <form v-if="searchable" class="mail-search" role="search" @submit.prevent="searchMail">
      <button type="submit" class="icon-item" :aria-label="$t('search')"><Icon icon="material-symbols:search-rounded" width="24" /></button>
      <input ref="searchRef" v-model="searchText" type="search" maxlength="200" :placeholder="t('searchFolder', {folder: searchFolderLabel})" :aria-label="t('searchFolder', {folder: searchFolderLabel})" @keydown.esc.prevent="clearSearch" />
      <button v-if="searchText" type="button" class="icon-item" :aria-label="$t('clearSearch')" @click="clearSearch"><Icon icon="material-symbols:close-rounded" width="22" /></button>
    </form>
    <h1 v-else class="page-title">{{ $t(route.meta.title) }}</h1>
    <button type="button" :aria-label="$t('compose')" v-perm="'email:send'" class="mobile-compose" @click="openSend"><Icon icon="material-symbols:edit-outline-rounded" width="24" /><span>{{ $t('composeShort') }}</span></button>
    <div class="toolbar">
      <button type="button" :aria-label="$t('settings')" class="icon-item header-settings" @click="router.push('/settings')"><Icon icon="material-symbols:settings-outline-rounded" width="24" /></button>
      <button type="button" :aria-label="$t('lightTheme')" v-if="uiStore.dark" class="sun-icon icon-item" @click="openDark($event)">
        <Icon icon="material-symbols:light-mode-outline-rounded"/>
      </button>
      <button type="button" :aria-label="$t('darkTheme')" v-else class="dark-icon icon-item" @click="openDark($event)">
        <Icon icon="material-symbols:dark-mode-outline-rounded"/>
      </button>
      <button type="button" :aria-label="$t('announcements')" class="notice icon-item" @click="openNotice">
        <Icon icon="streamline-plump:announcement-megaphone"/>
      </button>
      <el-dropdown :popper-options="viewportPopperOptions" ref="userinfoRef" @visible-change="e => userInfoShow = e" trigger="click" popper-class="detail-dropdown">
        <button type="button" :aria-label="$t('profile')" class="avatar" @click="userInfoHide" >
          <div class="avatar-text">
            <div>{{ formatName(userStore.user.email) }}</div>
          </div>
          <Icon class="setting-icon" icon="mingcute:down-small-fill" width="24" height="24"/>
        </button>
        <template #dropdown>
          <div class="user-details">
            <div class="details-avatar">
              {{ formatName(userStore.user.email) }}
            </div>
            <div class="user-name">
              {{ userStore.user.name }}
            </div>
            <div class="detail-email" @click="copyEmail(userStore.user.email)">
              {{ userStore.user.email }}
            </div>
            <div class="detail-user-type">
              <el-tag>{{ userStore.user.role.name }}</el-tag>
            </div>
            <div class="action-info">
              <div>
                <span style="margin-right: 10px">{{ $t('sendCount') }}</span>
                <span style="margin-right: 10px">{{ $t('accountCount') }}</span>
              </div>
              <div>
                <div>
                  <span v-if="sendCount" style="margin-right: 5px">{{ sendCount }}</span>
                  <el-tag v-if="!hasPerm('email:send')">{{ sendType }}</el-tag>
                  <el-tag v-else>{{ sendType }}</el-tag>
                </div>
                <div>
                  <el-tag v-if="settingStore.settings.manyEmail || settingStore.settings.addEmail">
                    {{ $t('disabled') }}
                  </el-tag>
                  <span v-else-if="accountCount && hasPerm('account:add')"
                        style="margin-right: 5px">{{ $t('totalUserAccount', {msg: accountCount}) }}</span>
                  <el-tag v-else-if="!accountCount && hasPerm('account:add')">{{ $t('unlimited') }}</el-tag>
                  <el-tag v-else-if="!hasPerm('account:add')">{{ $t('unauthorized') }}</el-tag>
                </div>
              </div>
            </div>
            <div class="logout">
              <el-button type="primary" :loading="logoutLoading" @click="clickLogout">{{ $t('logOut') }}</el-button>
            </div>
          </div>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup>
import {viewportPopperOptions} from '@/utils/overlay.js'
import router from "@/router";
import {logout} from "@/request/login.js";
import {Icon} from "@iconify/vue";
import {useUiStore} from "@/store/ui.js";
import {useUserStore} from "@/store/user.js";
import {useRoute} from "vue-router";
import {computed, ref, watch, onMounted, onBeforeUnmount} from "vue";
import {useSettingStore} from "@/store/setting.js";
import {hasPerm} from "@/perm/perm.js"
import {useI18n} from "vue-i18n";
import {setExtend} from "@/utils/day.js"

const {t} = useI18n();
const route = useRoute();
const settingStore = useSettingStore();
const userStore = useUserStore();
const uiStore = useUiStore();
const searchText = ref(uiStore.mailSearch);
const searchRef = ref(null);
const searchable = computed(() => ['email', 'send', 'star', 'draft', 'content'].includes(route.name));
const searchFolderLabel = computed(() => t(({email:'inbox', send:'sent', star:'starred', draft:'drafts'})[route.name === 'content' ? uiStore.mailFolder : route.name] || 'inbox'));
watch(() => uiStore.mailSearch, value => { searchText.value = value; });
function searchMail() {
  uiStore.mailSearch = searchText.value.trim();
  if (route.name === 'content') router.push({name: uiStore.mailFolder});
}
function clearSearch() { searchText.value = ''; uiStore.mailSearch = ''; searchRef.value?.focus(); }
function handleShortcut(event) {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || uiStore.composerShow || event.target.closest?.('input, textarea, [contenteditable="true"], .el-dialog, .el-popper, .el-message-box')) return;
  if (event.key === '/' && searchable.value) { event.preventDefault(); searchRef.value?.focus(); }
  if (event.key === 'c' && hasPerm('email:send')) { event.preventDefault(); openSend(); }
}
onMounted(() => window.addEventListener('keydown', handleShortcut));
onBeforeUnmount(() => window.removeEventListener('keydown', handleShortcut));
const logoutLoading = ref(false)
const userInfoShow = ref(false)
const userinfoRef = ref({})

const accountCount = computed(() => {
  return userStore.user.role.accountCount
})

const sendType = computed(() => {

  if (settingStore.settings.send === 1) {
    return t('disabled')
  }

  if (!hasPerm('email:send')) {
    return t('unauthorized')
  }

  if (userStore.user.role.sendType === 'ban') {
    return t('sendBanned')
  }

  if (userStore.user.role.sendType === 'internal') {
    return t('sendInternal')
  }

  if (!userStore.user.role.sendCount) {
    return t('unlimited')
  }

  if (userStore.user.role.sendType === 'day') {
    return t('daily')
  }

  if (userStore.user.role.sendType === 'count') {
    return t('total')
  }
})

const sendCount = computed(() => {


  if (!hasPerm('email:send')) {
    return null
  }

  if (userStore.user.role.sendType === 'ban') {
    return null
  }

  if (userStore.user.role.sendType === 'internal') {
    return null
  }

  if (!userStore.user.role.sendCount) {
    return null
  }

  if (settingStore.settings.send === 1) {
    return null
  }

  return userStore.user.sendCount + '/' + userStore.user.role.sendCount
})

function userInfoHide(e) {
    if (userInfoShow.value) {
        userinfoRef.value.handleClose()
    } else {
        userinfoRef.value.handleOpen()
    }
}

async function copyEmail(email) {
  try {
    await navigator.clipboard.writeText(email);
    ElMessage({
      message: t('copySuccessMsg'),
      type: 'success',
      plain: true,
    })
  } catch (err) {
    console.error(`${t('copyFailMsg')}:`, err);
    ElMessage({
      message: t('copyFailMsg'),
      type: 'error',
      plain: true,
    })
  }
}

function changeLang(lang) {
  setExtend('en')
  settingStore.lang = 'en'
}

function openNotice() {
  uiStore.showNotice()
}

function openDark(e) {

  const nextIsDark = !uiStore.dark
  const root = document.documentElement

  if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    switchDark(nextIsDark, root);
    return
  }

  const x = e.clientX
  const y = e.clientY

  const maxX = Math.max(x, window.innerWidth - x)
  const maxY = Math.max(y, window.innerHeight - y)
  const endRadius = Math.hypot(maxX, maxY)

  // Mark the transition target for CSS selectors.
  root.setAttribute('data-theme-to', nextIsDark ? 'dark' : 'light')
  root.style.setProperty('--vt-x', `${x}px`)
  root.style.setProperty('--vt-y', `${y}px`)
  root.style.setProperty('--vt-end-radius', `${endRadius + 10}px`)

  const transition = document.startViewTransition(() => {
    switchDark(nextIsDark, root);
  })

  transition.finished.finally(() => {
    // Clear the transition marker.
    root.removeAttribute('data-theme-to')
  })
}

function switchDark(nextIsDark, root) {
  root.setAttribute('class', nextIsDark ? 'dark' : '')
  const metaTag = document.getElementById('theme-color-meta');
  const isMobile =  !window.matchMedia("(pointer: fine) and (hover: hover)").matches;
  metaTag?.setAttribute('content', nextIsDark ? '#202124' : '#f6f8fc');
  uiStore.dark = nextIsDark
}

function openSend() {
  uiStore.writerRef.open()
}

function changeAside() {
  uiStore.asideShow = !uiStore.asideShow
}

function clickLogout() {
  logoutLoading.value = true
  logout().then(() => {
		localStorage.removeItem('authenticated')
    router.replace('/login')
  }).finally(() => {
    logoutLoading.value = false
  })
}

function formatName(email) {
  return email?.[0]?.toUpperCase() || ''
}

</script>
<style>
.detail-dropdown {
  color: var(--el-text-color-primary) !important;
}
</style>
<style lang="scss" scoped>

:deep(.el-popper.is-pure) {
  border-radius: 6px;
}

.user-details {
  width: 250px;
  font-size: 14px;
  display: grid;
  grid-template-columns: 1fr;
  justify-items: center;

  .user-name {
    font-weight: bold;
    margin-top: 10px;
    padding-left: 20px;
    padding-right: 20px;
    width: 250px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    text-align: center;
  }

  .detail-user-type {
    margin-top: 10px;
  }

  .action-info {
    width: 100%;
    display: grid;
    grid-template-columns: auto auto;
    margin-top: 10px;

    > div:first-child {
      display: grid;
      align-items: center;
      gap: 10px;
    }

    > div:last-child {
      display: grid;
      gap: 10px;
      text-align: center;

      > div {
        display: flex;
        align-items: center;
      }
    }
  }

  .detail-email {
    padding-left: 20px;
    padding-right: 20px;
    width: 250px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    text-align: center;
    color: var(--regular-text-color);
    cursor: pointer;
  }

  .logout {
    margin-top: 20px;
    width: 100%;
    padding-left: 10px;
    padding-right: 10px;
    padding-bottom: 10px;

    .el-button {
      border-radius: 6px;
      height: 28px;
      width: 100%;
    }
  }

  .details-avatar {
    margin-top: 20px;
    height: 40px;
    width: 40px;
    background: var(--el-bg-color);
    color: var(--el-text-color-primary);
    border: 1px solid var(--dark-border);
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
  }
}


.header { display: grid; grid-template-columns: 240px minmax(160px, 720px) minmax(0, 1fr); align-items: center; gap: 16px; padding: 8px 16px 8px 12px; height: 100%; }
.header-brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
.brand-link { display: flex; align-items: center; gap: 12px; min-width: 0; color: var(--el-text-color-primary); text-decoration: none; font-size: 22px; font-weight: 400; }
.brand-link svg { flex-shrink: 0; color: var(--el-color-primary); }
.brand-link span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.icon-item { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; color: var(--secondary-text-color); cursor: pointer; }
.icon-item:hover { background: var(--mail-nav-hover); }
.mail-search { display: flex; align-items: center; min-width: 0; height: 48px; border-radius: 24px; padding: 0 4px; background: var(--mail-search); }
.mail-search:focus-within { background: var(--el-bg-color); box-shadow: 0 1px 6px rgb(0 0 0 / .2); }
.mail-search input { width: 100%; min-width: 0; height: 100%; color: var(--el-text-color-primary); font-size: 16px; }
.mail-search input:focus-visible { outline: none; }
.mail-search input::placeholder { color: var(--secondary-text-color); opacity: 1; }
.mail-search input::-webkit-search-cancel-button { display: none; }
.page-title { font-size: 20px; font-weight: 400; text-align: left; }
.toolbar { display: flex; align-items: center; justify-content: flex-end; gap: 4px; }
.toolbar .notice { font-size: 20px; }
.toolbar .sun-icon, .toolbar .dark-icon { font-size: 22px; }
.avatar { display: flex; align-items: center; justify-content: center; min-width: 40px; min-height: 40px; cursor: pointer; border-radius: 50%; }
.avatar-text { background: var(--mail-avatar); color: white; width: 32px; height: 32px; display: grid; place-items: center; border-radius: 50%; font-size: 16px; }
.avatar .setting-icon { display: none; }
.mobile-compose { display: none; }
.user-details { max-width: var(--overlay-width); }
.user-details .user-name, .user-details .detail-email { max-width: 100%; }
.user-details .action-info { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; padding-inline: 10px; overflow-wrap: anywhere; }
.user-details .action-info > div:last-child > div { flex-wrap: wrap; }
@media (max-width: 1024px) {
  .header { grid-template-columns: 44px minmax(0, 1fr) auto; gap: 8px; }
  .brand-link { display: none; }
  .mobile-compose { display: flex; align-items: center; gap: 12px; position: fixed; z-index: 20; right: 16px; bottom: max(24px, env(safe-area-inset-bottom)); height: 56px; padding: 0 20px; border-radius: 16px; background: var(--mail-compose); color: var(--mail-on-compose); box-shadow: 0 2px 8px rgb(0 0 0 / .18); cursor: pointer; font-weight: 500; }
}
@media (max-width: 767px) {
  .header { padding: 8px; gap: 4px; }
  .mail-search { height: 44px; }
  .mail-search input { font-size: 14px; }
  .header-settings, .toolbar .notice { display: none; }
}
</style>

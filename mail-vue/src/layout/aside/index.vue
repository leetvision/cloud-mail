<template>
  <el-scrollbar class="navigation-scroll" :class="{'navigation-collapsed': !uiStore.asideShow}">
    <nav :aria-label="$t('mailNavigation')">
      <button type="button" class="compose-button" :aria-label="$t('compose')" :title="$t('composeShort')" v-perm="'email:send'" @click="compose">
        <Icon icon="material-symbols:edit-outline-rounded" width="24" />
        <span>{{ $t('composeShort') }}</span>
      </button>
      <el-menu :default-active="activeFolder" class="folder-menu">
        <el-menu-item v-for="item in visibleFolders" :key="item.name" :index="item.name" :aria-label="$t(item.label)" :title="$t(item.label)" @click="router.push({name: item.name})" :aria-current="activeFolder === item.name ? 'page' : undefined">
          <Icon :icon="item.icon" width="20" /><span>{{ $t(item.label) }}</span>
        </el-menu-item>
      </el-menu>
      <section v-if="hasPerm('account:query') && settingStore.settings.manyEmail === 0" class="mailbox-section">
        <button type="button" class="mailbox-toggle" :aria-expanded="uiStore.accountShow" aria-controls="mailbox-list" @click="uiStore.accountShow = !uiStore.accountShow">
          <span class="mailbox-heading">{{ $t('mailboxes') }}</span>
          <Icon :icon="uiStore.accountShow ? 'material-symbols:expand-less-rounded' : 'material-symbols:expand-more-rounded'" width="20" />
        </button>
        <p class="current-mailbox" :title="accountStore.currentAccount.email">{{ accountStore.currentAccount.email }}</p>
        <Account id="mailbox-list" v-show="uiStore.accountShow" :inert="!uiStore.accountShow" />
      </section>
      <div v-if="visibleAdministration.length" class="admin-section">
        <p class="section-title">{{ $t('manage') }}</p>
        <el-menu :default-active="activeFolder" class="folder-menu">
          <el-menu-item v-for="item in visibleAdministration" :key="item.name" :index="item.name" :aria-label="$t(item.label)" :title="$t(item.label)" @click="router.push({name: item.name})" :aria-current="activeFolder === item.name ? 'page' : undefined">
            <Icon :icon="item.icon" width="20" /><span>{{ $t(item.label) }}</span>
          </el-menu-item>
        </el-menu>
      </div>
    </nav>
  </el-scrollbar>
</template>
<script setup>
import router from '@/router';
import { useRoute } from 'vue-router';
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import { useSettingStore } from '@/store/setting';
import { useUiStore } from '@/store/ui';
import { useAccountStore } from '@/store/account';
import { hasPerm } from '@/perm/perm';
import Account from '@/layout/account/index.vue';
const settingStore = useSettingStore(), uiStore = useUiStore(), accountStore = useAccountStore();
const route = useRoute();
const activeFolder = computed(() => route.name === 'content' ? uiStore.mailFolder : route.meta.name);
const folders = [
  { name: 'email', label: 'inbox', icon: 'material-symbols:inbox-outline-rounded' },
  { name: 'star', label: 'starred', icon: 'material-symbols:star-outline-rounded' },
  { name: 'send', label: 'sent', icon: 'material-symbols:send-outline-rounded', permission: 'email:send' },
  { name: 'draft', label: 'drafts', icon: 'material-symbols:draft-outline-rounded', permission: 'email:send' },
  { name: 'setting', label: 'settings', icon: 'material-symbols:settings-outline-rounded' },
];
const administration = [
  { name: 'analysis', label: 'analytics', icon: 'fluent:data-pie-20-regular', permission: 'analysis:query' },
  { name: 'user', label: 'allUsers', icon: 'si:user-alt-2-line', permission: 'user:query' },
  { name: 'all-email', label: 'allMail', icon: 'material-symbols:mail-outline-rounded', permission: 'all-email:query' },
  { name: 'role', label: 'permissions', icon: 'fluent:lock-closed-16-regular', permission: 'role:query' },
  { name: 'reg-key', label: 'inviteCode', icon: 'fluent:fingerprint-20-filled', permission: 'reg-key:query' },
  { name: 'sys-setting', label: 'SystemSettings', icon: 'material-symbols:settings-outline-rounded', permission: 'setting:query' },
];
const visibleFolders = computed(() => folders.filter(item => !item.permission || hasPerm(item.permission)));
const visibleAdministration = computed(() => administration.filter(item => hasPerm(item.permission)));
function compose() {
  if (window.innerWidth < 1025) uiStore.asideShow = false;
  uiStore.writerRef.open();
}
</script>
<style scoped>
.navigation-scroll { height: 100%; }
nav { padding: 8px 12px 24px 0; }
.compose-button { display: flex; align-items: center; gap: 16px; margin: 0 0 16px 12px; padding: 0 24px; height: 56px; border-radius: 16px; background: var(--mail-compose); color: var(--mail-on-compose); font-weight: 500; cursor: pointer; transition: box-shadow 150ms ease; }
.compose-button:hover { box-shadow: 0 2px 6px rgb(0 0 0 / .18); }
.folder-menu { border: 0; background: transparent; }
.folder-menu .el-menu-item { height: 36px; gap: 18px; padding: 0 24px !important; border-radius: 0 20px 20px 0; color: var(--el-text-color-primary); }
.folder-menu .el-menu-item:hover { background: var(--mail-nav-hover); }
.folder-menu .el-menu-item.is-active { color: var(--mail-on-selected); background: var(--mail-selected); font-weight: 600; }
.mailbox-section, .admin-section { margin-top: 24px; }
.mailbox-toggle { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 8px 20px 4px 24px; min-height: 36px; color: var(--el-text-color-primary); cursor: pointer; }
.mailbox-heading, .section-title { font-weight: 500; font-size: 14px; }
.section-title { padding: 0 24px; margin-bottom: 8px; }
.current-mailbox { font-size: 12px; color: var(--secondary-text-color); padding: 0 20px 8px 24px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; }
@media (pointer: coarse) { .folder-menu .el-menu-item { height: 44px; } }
@media (min-width: 1025px) {
  .navigation-collapsed nav { padding-right: 0; }
  .navigation-collapsed .compose-button { margin-left: 8px; padding: 0; width: 56px; justify-content: center; }
  .navigation-collapsed .compose-button span, .navigation-collapsed .el-menu-item span, .navigation-collapsed .mailbox-section, .navigation-collapsed .section-title { display: none; }
  .navigation-collapsed .folder-menu .el-menu-item { padding: 0 !important; width: 48px; height: 40px; justify-content: center; margin: 0 12px 4px; border-radius: 20px; }
}
@media (max-width: 1024px) { nav { padding-top: 8px; } }
</style>

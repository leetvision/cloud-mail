<template>
  <el-dialog append-to-body :model-value="true" :title="$t('mailboxMembers')" width="min(560px, calc(100vw - 32px))" @close="$emit('close')">
    <p class="mailbox-address">{{ mailbox.email }}</p>
    <p class="help">{{ $t('mailboxAccessHelp') }}</p>
    <el-alert v-if="error" :title="error" type="error" :closable="false" />
    <el-button v-if="error" text @click="load">{{ $t('mailboxRetry') }}</el-button>
    <div v-loading="loading" class="member-list">
      <p v-if="owner">{{ $t('mailboxOwner', {email: owner}) }}</p>
      <p v-if="!loading && !error && !members.length" class="help">{{ $t('mailboxNoMembers') }}</p>
      <div v-for="member in members" :key="member.userId" class="member">
        <div class="member-info"><span>{{ member.email }}</span><small>{{ roleLabel(member.role) }}</small></div>
        <el-button text :disabled="busy" @click="edit(member)">{{ $t('mailboxEdit') }}</el-button>
        <el-button text type="danger" :disabled="busy" @click="remove(member)">{{ $t('mailboxRemoveMember') }}</el-button>
      </div>
    </div>
    <el-form label-position="top" @submit.prevent="save">
      <el-form-item :label="$t('mailboxMemberEmail')">
        <el-input v-model="email" type="email" autocomplete="off" :disabled="busy" />
      </el-form-item>
      <el-form-item :label="$t('mailboxAccessLevel')">
        <el-select v-model="role" :disabled="busy" class="role-select">
          <el-option v-for="value in roles" :key="value" :value="value" :label="roleLabel(value)" />
        </el-select>
      </el-form-item>
      <el-button type="primary" native-type="submit" :loading="busy" :disabled="loading || !!error || !email.trim()">{{ $t('mailboxAddMember') }}</el-button>
    </el-form>
  </el-dialog>
</template>
<script setup>
import {onMounted, ref} from 'vue';
import {useI18n} from 'vue-i18n';
import {ElMessageBox} from 'element-plus';
import {mailboxMembers, saveMailboxMember, removeMailboxMember} from '@/request/account';
const props = defineProps({mailbox: {type: Object, required: true}});
defineEmits(['close']);
const {t} = useI18n();
const roles = ['reader', 'sender', 'manager'];
const roleLabel = role => t({reader: 'mailboxReader', sender: 'mailboxSender', manager: 'mailboxManager'}[role]);
const members = ref([]), owner = ref(''), email = ref(''), role = ref('reader');
const loading = ref(true), busy = ref(false), error = ref('');
async function load() {
  loading.value = true;
  try {
    const data = await mailboxMembers(props.mailbox.accountId);
    members.value = data.members; owner.value = data.owner; error.value = '';
  } catch { error.value = t('mailboxAccessFailed'); }
  finally { loading.value = false; }
}
function edit(member) { email.value = member.email; role.value = member.role; }
async function save() {
  if (busy.value || !email.value.trim()) return;
  busy.value = true;
  try {
    await saveMailboxMember(props.mailbox.accountId, email.value.trim(), role.value);
    email.value = ''; role.value = 'reader'; await load();
  } catch { /* The request layer displays the server's error. */ }
  finally { busy.value = false; }
}
async function remove(member) {
  try {
    await ElMessageBox.confirm(t('mailboxRemoveConfirm', {email: member.email}), {confirmButtonText: t('confirm'), cancelButtonText: t('cancel'), type: 'warning'});
  } catch { return; }
  busy.value = true;
  try { await removeMailboxMember(props.mailbox.accountId, member.userId); await load(); }
  catch { /* The request layer displays the server's error. */ }
  finally { busy.value = false; }
}
onMounted(load);
</script>
<style scoped>
.mailbox-address { font-weight: 600; overflow-wrap: anywhere; margin: 0 0 12px; }
.help { color: var(--el-text-color-regular); line-height: 1.6; }
.member-list { min-height: 56px; margin: 20px 0; }
.member { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 12px 0; border-bottom: 1px solid var(--el-border-color); }
.member-info { flex: 1 1 180px; min-width: 0; overflow-wrap: anywhere; }
.member-info small { display: block; color: var(--el-text-color-regular); margin-top: 4px; }
.role-select { width: 100%; }
</style>

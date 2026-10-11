<template>
  <div class="send" :class="{'composer-modal': composerModal, 'composer-expanded': expanded}" v-show="show" :inert="!show" role="dialog" :aria-modal="composerModal" :aria-label="t('compose')" @keydown.tab="trapFocus">
    <div class="write-box">
      <div class="title">
        <div class="title-left"><span>{{ t('newMessage') }}</span></div>
        <div class="composer-window-actions">
          <IconAction class="expand-composer" :label="t(expanded ? 'collapseComposer' : 'expandComposer')" @click="expanded = !expanded" :icon="expanded ? 'material-symbols:close-fullscreen-rounded' : 'material-symbols:open-in-full-rounded'" width="18" />
          <IconAction :label="$t('closeComposer')" @click="close" icon="material-symbols:close-rounded" width="20" />
        </div>
      </div>
      <div class="container">
        <div class="from-line"><span>{{ t('from') }}</span><span>{{ form.sendEmail }}</span></div>
        <el-input-tag  @add-tag="addTagChange" tag-type="primary" @input="inputChange" size="default" v-model="form.receiveEmail" :aria-label="t('recipient')" >
          <template #prefix>
            <div class="item-title" >{{ $t('recipient') }}</div>
            <el-select :popper-options="viewportPopperOptions"
                ref="mySelect"
                class="write-select"
                popper-class="write-select"
                :show-arrow="false"
                :no-match-text="' '"
                :no-data-text="' '"
                @visible-change="selectStatusChange"
                @change="selectChange"
            >
              <el-option
                  v-for="item in selectRecipientList"
                  :key="item"
                  :label="item"
                  :value="item"
                  style="color: #999896;"
              />
            </el-select>
          </template>
          <template #suffix>
            <div style="display: flex;margin-right: 3px;">
              <IconAction icon="fa7-solid:user-plus" width="20" height="20" class="add-contact" :label="t('recentContacts')" @click.stop="openContacts" />
            </div>
          </template>
        </el-input-tag>
        <el-input v-model="form.subject" :placeholder="t('subject')" :aria-label="t('subject')" />
        <tinyEditor :def-value="defValue" ref="editor" @change="change" @focus="focusChange" @send="sendEmail" @escape="closeFromEditor" />
        <div class="button-item">
          <div class="send-controls"><el-button type="primary" :loading="sending" @click="sendEmail">{{ t(form.sendType === 'reply' ? 'reply' : form.sendType === 'forward' ? 'forward' : 'send') }}</el-button></div>
          <button type="button" class="att-add" :aria-label="$t('addAttachment')" @click="chooseFile">
            <Icon icon="iconamoon:attachment-fill" width="24" height="24"/>
          </button>
          <button type="button" class="att-clear" :aria-label="$t('clearComposer')" @click="clearContent">
            <Icon icon="icon-park-outline:clear-format" width="24" height="24 "/>
          </button>
          <div class="att-list">
            <div class="att-item" v-for="(item,index) in form.attachments" :key="index">
              <Icon v-bind="getIconByName(item.filename)"/>
              <span class="att-filename">{{ item.filename }}</span>
              <span class="att-size">{{ formatBytes(item.size) }}</span>
              <IconAction :label="t('delete')" icon="material-symbols-light:close-rounded" @click="delAtt(index)"
                    width="22" height="22"/>
            </div>
          </div>

        </div>
      </div>
    </div>
    <el-dialog width="420" append-to-body top="10vh" v-model="showContacts" @closed="clearSelectContact" :title="t('recentContacts')">
      <el-table ref="contactsTabRef" row-key="email" :data="contacts" style="height: 445px">
        <el-table-column type="selection" width="32" />
        <el-table-column property="email" :label="t('emailAccount')" >
          <template #default="props">
            <div class="email-row">{{ props.row.email }}</div>
          </template>
        </el-table-column>
        <el-table-column width="55" label="" >
          <template #default>
            <div style="display: flex;">
              <Icon icon="mage:user" style="color: var(--el-text-color-primary)" width="22" height="22" color="#606266" />
            </div>
          </template>
        </el-table-column>
      </el-table>
      <div class="contacts-bottom">
        <el-button type="default" @click="deleteContact">{{t('clear')}}</el-button>
        <el-button type="primary" @click="chooseContact">{{t('selectContacts')}}</el-button>
      </div>
    </el-dialog>
  </div>
</template>
<script setup>
import {viewportPopperOptions} from '@/utils/overlay.js'
import {mailboxAccess} from "@/request/account";
import IconAction from '@/components/icon-action/index.vue'
import tinyEditor from '@/components/tiny-editor/index.vue'
import {h, nextTick, onMounted, onUnmounted, reactive, ref, toRaw, computed, watch} from "vue";
import {Icon} from "@iconify/vue";
import {useUserStore} from "@/store/user.js";
import {emailSend} from "@/request/email.js";
import {isEmail} from "@/utils/verify-utils.js";
import {useAccountStore} from "@/store/account.js";
import {useEmailStore} from "@/store/email.js";
import {fileToBase64, formatBytes} from "@/utils/file-utils.js";
import {getIconByName} from "@/utils/icon-utils.js";
import sendPercent from "@/components/send-percent/index.vue"
import {formatDetailDate} from "@/utils/day.js";
import {userDraftStore} from "@/store/draft.js";
import {useWriterStore} from "@/store/writer.js";
import db from "@/db/db.js";
import dayjs from "dayjs";
import {useI18n} from "vue-i18n";
import router from "@/router/index.js";
import {ElMessageBox} from "element-plus";
import {useUiStore} from "@/store/ui.js";

defineExpose({
  open,
  openReply,
  openForward,
  openDraft
})

const {t} = useI18n()
const writerStore = useWriterStore();
const draftStore = userDraftStore()
const emailStore = useEmailStore();
const accountStore = useAccountStore()
const editor = ref({})
const userStore = useUserStore();
const show = ref(false);
const expanded = ref(false);
const narrow = ref(window.innerWidth < 768);
const composerModal = computed(() => show.value && (expanded.value || narrow.value));
function resizeComposer() { narrow.value = window.innerWidth < 768; }
onMounted(() => window.addEventListener('resize', resizeComposer));
onUnmounted(() => window.removeEventListener('resize', resizeComposer));
const uiStore = useUiStore();
watch(composerModal, value => { uiStore.composerModal = value; });
let previousFocus;
watch(show, async visible => {
  if (visible) previousFocus = document.activeElement;
  uiStore.composerShow = visible;
  await nextTick();
  if (visible) document.querySelector('.send .el-input-tag__input')?.focus();
  else previousFocus?.focus();
});
function trapFocus(event) {
  if (!composerModal.value || event.target.closest('.el-dialog')) return;
  const controls = [...document.querySelectorAll('.send .write-box button:not(:disabled), .send .write-box input:not(:disabled), .send .write-box iframe, .send .write-box [tabindex="0"]')].filter(el => el.getClientRects().length && !el.closest('[inert]'));
  const first = controls[0], last = controls.at(-1);
  if (event.shiftKey && event.target === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && event.target === last) { event.preventDefault(); first?.focus(); }
}
const percent = ref(0)
let percentMessage = null
const sending = ref(false)
const defValue = ref('')
const contactsTabRef = ref({})
const showContacts = ref(false)
const mySelect = ref()
let selectStatus = false
const backReply = reactive({
  receiveEmail: [],
  subject: '',
  content: '',
  sendType: ''
})
const form = reactive({
  sendEmail: '',
  receiveEmail: [],
  accountId: -1,
  name: '',
  subject: '',
  content: '',
  sendType: '',
  text: '',
  emailId: 0,
  attachments: [],
  draftId: null,
})

const selectRecipientList = ref([])

const contacts = computed(() => writerStore.sendRecipientRecord.map(item => ({email: item})))

function openContacts() {
  showContacts.value = true
  nextTick(() => {
    form.receiveEmail.forEach(item => {
      if (writerStore.sendRecipientRecord.includes(item)) {
        contactsTabRef.value.toggleRowSelection({email: item});
      }
    })
  })
}

function deleteContact() {
  ElMessageBox.confirm(t('confirmDeletionOfContacts'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    const contactList = contactsTabRef.value.getSelectionRows().map(item => item.email);
    form.receiveEmail = form.receiveEmail.filter(item => !contactList.includes(item));
    writerStore.sendRecipientRecord = writerStore.sendRecipientRecord.filter(item => !contactList.includes(item));
  })
}

function chooseContact() {

  const contactList = contactsTabRef.value.getSelectionRows().map(item => item.email);
  contactList.forEach(item => {
    if (!form.receiveEmail.includes(item)) {
      form.receiveEmail.push(item);
    }
  })

  form.receiveEmail = form.receiveEmail.filter(item => {
    return contactList.includes(item) || !writerStore.sendRecipientRecord.includes(item);
  });

  showContacts.value = false
}

function clearSelectContact() {
  contactsTabRef.value.clearSelection();
}

function selectChange(value) {
  form.receiveEmail.push(value)
}

function selectStatusChange(status) {
  selectStatus = status
}

const openSelect = () => {
  mySelect.value.toggleMenu()
}

function inputChange(value) {

  selectRecipientList.value = writerStore.sendRecipientRecord.filter(item => value && !form.receiveEmail.includes(item) && item.startsWith(value)).slice(0, 10);

  if (!selectStatus && selectRecipientList.value.length > 0) {
    openSelect()
  }

  if (selectStatus && selectRecipientList.value.length === 0) {
    openSelect()
  }

}

function addTagChange(val) {

  const emails = Array.from(new Set(
      val.split(/[,，]/).map(item => item.trim()).filter(item => item)
  ));

  form.receiveEmail.splice(form.receiveEmail.length - 1, 1)

  let has = false
  emails.forEach(email => {
    if (isEmail(email) && !form.receiveEmail.includes(email)) {
      form.receiveEmail.push(email)
      has = true
    }
  })
  if (selectStatus && has) openSelect()
}

function clearContent() {
  ElMessageBox.confirm(t('clearContentConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    resetForm()
  }).catch(() => {})

}

function delAtt(index) {
  form.attachments.splice(index, 1);
}

function chooseFile() {
  const doc = document.createElement("input")
  doc.setAttribute("type", "file")
  doc.multiple = true;
  doc.click()
  doc.onchange = async (e) => {

    const fileList = e.target.files;

    for (const file of fileList) {

      const size = file.size
      const filename = file.name
      const contentType = file.type

      const content = await fileToBase64(file)
      form.attachments.push({content, filename, size, contentType})

    }

  }
}

async function sendEmail() {

  if (form.receiveEmail.length === 0) {
    ElMessage({
      message: t('emptyRecipientMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (!form.subject) {
    ElMessage({
      message: t('emptySubjectMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (!form.content) {
    form.content = editor.value.getContent();
  }

  if (!form.content) {
    ElMessage({
      message: t('emptyContentMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (form.manyType === 'divide' && form.attachments.length > 0) {
    ElMessage({
      message: t('noSeparateSendMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (sending.value) {
    ElMessage({
      message: t('sendingErrorMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  percentMessage = ElMessage({
    message: () => h(sendPercent, {value: percent.value, desc: t('sending')}),
    plain: true,
    duration: 0,
    customClass: 'message-bottom'
  })

  sending.value = true

  show.value = false

  emailSend(form, (e) => {
    percent.value = Math.round((e.loaded * 98) / e.total)
  }).then(emailList => {
    emailStore.sentRevision++
    const email = emailList[0]
    emailList.forEach(item => {
      emailStore.sendScroll?.addItem(item)
    })

    ElNotification({
      title: t('sendSuccessMsg'),
      type: "success",
      message: h('span', {style: 'color: teal'}, email.subject),
      position: 'bottom-right'
    })

    userStore.refreshUserInfo();

    addRecipientRecord();

    if (form.draftId) {
      form.subject = ''
      form.content = ''
      form.receiveEmail = []
      draftStore.setDraft = {...toRaw(form)}
    }

    show.value = false
    resetForm();
  }).catch((e) => {
    ElNotification({
      title: t('sendFailMsg'),
      type: e.code === 403 ? 'warning' : 'error',
      message: h('span', {style: 'color: teal'}, e.message),
      position: 'bottom-right'
    })
    if (e.code === 401) {
		localStorage.removeItem('authenticated');
      router.replace('/login');
    }
    expanded.value = false
    show.value = true
    addRecipientRecord();
  }).finally(() => {
    percentMessage.close()
    percent.value = 0
    sending.value = false
  })
}

function addRecipientRecord() {
  writerStore.sendRecipientRecord = writerStore.sendRecipientRecord.filter(
      email => !form.receiveEmail.includes(email)
  );

  writerStore.sendRecipientRecord.unshift(...form.receiveEmail);
  writerStore.sendRecipientRecord = writerStore.sendRecipientRecord.slice(0, 500);
}

function resetForm() {
  form.receiveEmail = []
  form.subject = ''
  form.content = ''
  form.manyType = null
  form.attachments = []
  form.sendType = ''
  form.emailId = 0
  form.draftId = null
  backReply.content = ''
  backReply.subject = ''
  backReply.receiveEmail = []
  backReply.sendType = ''
  editor.value.clearEditor()
}

function change(content, text) {
  form.content = content;
  form.text = text
}

function focusChange() {
  if (selectStatus) openSelect()
}

function openForward(email) {
  resetForm();

  email.subject = email.subject || ''

  form.subject = email.subject
  form.sendType = 'forward'

  defValue.value = ''

  setTimeout(() => {
    defValue.value = `
      ${formatImage(email.content) || `<pre style="font-family: inherit;word-break: break-word;white-space: pre-wrap;margin: 0">${email.text}</pre>`}
    `
    open()

    nextTick(() => {
      backReply.content = editor.value.getContent()
      backReply.subject = form.subject
      backReply.receiveEmail = form.receiveEmail
      backReply.sendType = form.sendType
    })

  });
}

function openReply(email) {

  resetForm();

  email.subject = email.subject || ''

  form.receiveEmail.push(email.sendEmail)
  form.subject = (
      email.subject.startsWith('Re:') ||
      email.subject.startsWith('Re：') ||
      email.subject.startsWith('Re:')) ? email.subject : 'Re: ' + email.subject
  form.sendType = 'reply'
  form.emailId = email.emailId

  defValue.value = ''

  setTimeout(() => {
    defValue.value = `
    <div></div>
    <div>
    <br>
        ${formatDetailDate(email.createTime)} ${email.name} &lt${email.sendEmail}&gt ${t('wrote')}:
    </div>
    <blockquote class="mceNonEditable" style="margin: 0 0 0 0.8ex;border-left: 1px solid rgb(204,204,204);padding-left: 1ex;">
      <articl>
          ${formatImage(email.content) || `<pre style="font-family: inherit;word-break: break-word;white-space: pre-wrap;margin: 0">${email.text}</pre>`}
      </article>
    </blockquote>`
    open(email)

    nextTick(() => {
      backReply.content = editor.value.getContent()
      backReply.subject = form.subject
      backReply.receiveEmail = form.receiveEmail
      backReply.sendType = form.sendType
    })
  })

}

function formatImage(content) {
  content = content || '';
  return content.replace(/{{domain}}/g, '/api/oss/');
}

async function open(message) {
  const accountId = message?.accountId || accountStore.currentAccount.accountId || userStore.user.account.accountId;
  try {
    const mailbox = await mailboxAccess(accountId);
    if (mailbox.accessRole === 'reader') {
      ElMessage.error(t('mailboxReadOnly'));
      return;
    }
    form.sendEmail = mailbox.email;
    form.accountId = mailbox.accountId;
    form.name = mailbox.name;
    expanded.value = false
    show.value = true;
    editor.value.focus();
  } catch { /* The request layer displays revoked access. */ }
}

function openDraft(draft) {
  Object.assign(form, {...draft})
  defValue.value = ''
  setTimeout(() => defValue.value = form.content)
  expanded.value = false
  show.value = true;
  editor.value.focus()
}

const handleKeyDown = (event) => {
  if (show.value && (event.ctrlKey || event.metaKey) && event.key === 'Enter' && event.target.closest?.('.write-box') && !event.target.closest('.el-popper')) {
    event.preventDefault();
    sendEmail();
    return;
  }
  if (event.defaultPrevented || event.target.closest?.('.el-dialog, .el-popper, .tox-dialog, .el-message-box')) return;
  if (event.key === 'Escape' && (composerModal.value || event.target.closest?.('.send')) && show.value && !showContacts.value && !document.querySelector('.tox-dialog, .el-message-box, .el-select__popper:not([style*="display: none"])')) {
    close()
  }
};

function closeFromEditor() {
  if (show.value && !showContacts.value && !document.querySelector('.tox-dialog, .el-message-box, .el-select__popper:not([style*="display: none"])')) close();
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  uiStore.composerShow = false;
});

function close() {

  if (selectStatus) openSelect();

  if (!form.content) {
    form.content = editor.value.getContent();
  }

  if (form.draftId) {
    draftStore.setDraft = {...toRaw(form)}
    show.value = false
    resetForm()
    return;
  }

  if (!(form.content || form.subject || form.receiveEmail.length > 0)) {
    show.value = false
    resetForm()
    return;
  }

  if (backReply.sendType === 'reply' || backReply.sendType === 'forward') {
    let subjectFlag = form.subject === backReply.subject
    let contentFlag = editor.value.getContent() === backReply.content
    let receiveFlag = form.receiveEmail.length === 1 && form.receiveEmail[0] === backReply.receiveEmail[0]
    if (backReply.sendType === 'forward' && form.receiveEmail.length === 0) {
      receiveFlag = true;
    }
    if (subjectFlag && contentFlag && receiveFlag) {
      resetForm();
      close()
      return;
    }
  }

  ElMessageBox.confirm(t('saveDraftConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning',
    distinguishCancelAndClose: true
  }).then(async () => {
    const formData = {...toRaw(form)};
    delete formData.draftId
    delete formData.attachments
    formData.createTime = dayjs().utc().format('YYYY-MM-DD HH:mm:ss');
    const draftId = await db.value.draft.add({...formData})
    db.value.att.add({draftId, attachments: toRaw(form.attachments)})
    draftStore.refreshList++
    show.value = false
    await nextTick(() => {
      resetForm()
    })
  }).catch((action) => {
    if (action === 'cancel') {
      show.value = false
      resetForm()
    }
  })

}

</script>
<style>
.write-select .el-select-dropdown__list {
  padding: 4px 4px !important;
}
.write-select .el-select-dropdown__item {
  padding: 0 10px 0 10px;
}

.write-select .el-select-dropdown {
  min-width: 0 !important;
}
</style>
<style scoped lang="scss">
.send {
  z-index: var(--layer-composer);
  background: transparent;
  pointer-events: none;
  padding: 0 24px;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  height: 100dvh;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;

  .write-box {
    background: var(--el-bg-color);
    width: min(600px, calc(100vw - 48px));
    height: min(580px, calc(100dvh - 80px));
    pointer-events: auto;
    box-shadow: var(--el-box-shadow-light);
    border: none;
    transition: var(--el-transition-duration);
    padding: 0;
    border-radius: 12px 12px 0 0;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    overflow: hidden;
    @media (max-width: 767px) {
      width: 100%;
      height: 100%;
      border-radius: 0;
      border: 0;
      padding-top: 10px;
    }

    @media (min-width: 768px) {
      height: min(580px, calc(100dvh - 80px));
    }

    .title {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0;
      background: var(--mail-read-row);
      padding: 8px 12px;
      font-weight: 500;

      .title-left {
        min-width: 0;
        align-items: center;
        display: grid;
        grid-template-columns: auto auto auto minmax(0, 1fr);
      }

      .title-text {
      }

      .sender {
        margin-left: 8px;
      }

      .sender-name {
        margin-left: 8px;
        font-weight: bold;
      }

      .send-email {
        color: #999896;
        margin-left: 5px;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
      }


      div {
        display: flex;
        align-items: center;
      }
    }

    .container {
      min-width: 0;
      min-height: 0;
      overflow-y: auto;
      height: 100%;
      display: grid;
      grid-template-rows: auto auto auto minmax(120px, 1fr) auto;
      gap: 0;
      padding: 0 16px 12px;

      .item-title {
      }

      .button-item {
        display: grid;
        grid-template-columns: auto auto auto minmax(0, 1fr);
        align-items: center;
        gap: var(--space-2);

        .att-add {
          display: flex;
          align-items: center;
          justify-content: center;
          width: var(--control-size);
          height: var(--control-size);
          cursor: pointer;
        }

        .att-clear {
          display: flex;
          align-items: center;
          justify-content: center;
          width: var(--control-size);
          height: var(--control-size);
          cursor: pointer;
        }

        .att-list {
          display: grid;
          gap: 5px;
          grid-template-columns: repeat(auto-fill, minmax(min(100%, 230px), 1fr));
          padding-left: 10px;
          padding-right: 10px;
          max-height: 110px;
          overflow-y: auto;
          @media (max-width: 450px) {
            grid-template-columns: repeat(auto-fill, minmax(min(100%, 140px), 1fr));
          }

          .att-item {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr) auto auto;
            gap: 5px;
            min-height: var(--control-size);
            align-items: center;
            font-size: 14px;
            padding: 4px 5px;
            background: var(--light-ill);
            border-radius: 4px;
            .att-filename {
              white-space: nowrap;
              text-overflow: ellipsis;
              overflow: hidden;
            }
          }
        }
      }
    }
  }

}

.email-row {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}



.contacts-bottom {
  display: flex;
  justify-content: end;
  margin-top: 10px;
}

.add-contact {
  color: var(--regular-text-color)
}

.write-select {
  position: absolute;
  width: 300px;
  left: 60px;
  z-index: 0;
  opacity: 0;
  pointer-events: none;
}

:deep(.el-input-tag__suffix) {
  padding-right: 4px;
}

.icon {
  cursor: pointer;
}

@media (max-width: 767px) {
  .send .write-box {
    padding: max(var(--space-3), env(safe-area-inset-top)) var(--space-3) max(var(--space-3), env(safe-area-inset-bottom));
  }
  .send .write-box .title .sender-name { max-width: 96px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .send .write-box .container .button-item { grid-template-columns: auto auto minmax(0, 1fr); }
  .send .write-box .container .button-item > div:last-child { grid-column: 3; grid-row: 1; justify-self: end; }
  .send .write-box .container .button-item .att-list { grid-column: 1 / -1; grid-row: 2; padding: 0; }
  .send .write-box .container .button-item .att-list:empty { display: none; }
}


.send .write-box { min-width: 0; min-height: 0; max-height: 100%; }
.send .write-box .title { min-width: 0; gap: 8px; }
.send .write-box .title .title-left { flex: 1; display: grid; }
.send .write-box .title .sender-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.send .write-box .container { overscroll-behavior: contain; }
.contacts-bottom { flex-wrap: wrap; gap: 8px; }
.contacts-bottom .el-button { margin: 0; }
@media (max-height: 500px) {
  .send .write-box .container { grid-template-rows: auto auto minmax(180px, 1fr) auto; }
}
@media (max-width: 380px) {
  .send .write-box .title .title-left { grid-template-columns: auto auto minmax(0, 1fr); row-gap: 2px; }
  .send .write-box .title .send-email { grid-column: 2 / -1; margin-left: 8px; }
}


.from-line { display: flex; gap: 16px; align-items: center; min-height: 40px; font-size: 13px; color: var(--secondary-text-color); border-bottom: 1px solid var(--mail-row-border); overflow: hidden; }
.from-line span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.composer-window-actions { display: flex; gap: 2px; }
.send .write-box .container :deep(.el-input__wrapper), .send .write-box .container :deep(.el-input-tag) { border-radius: 0; box-shadow: none; border-bottom: 1px solid var(--mail-row-border); min-height: 40px; padding-inline: 0; background: transparent; }
.send-controls .el-button { border-radius: 20px; padding: 0 24px; height: 40px; }
.send .write-box .container .button-item { padding-top: 12px; }
.send .write-box .container .button-item .att-list { grid-column: 1 / -1; grid-row: 1; max-height: 90px; }
.send .write-box .container .button-item .att-list:empty { display: none; }
.send .write-box .container .button-item .send-controls { grid-column: 1; grid-row: 2; }
.send .write-box .container .button-item .att-add { grid-column: 2; grid-row: 2; }
.send .write-box .container .button-item .att-clear { grid-column: 3; grid-row: 2; }
.send.composer-modal { background: rgb(0 0 0 / .32); pointer-events: auto; align-items: center; justify-content: center; }
.send.composer-expanded .write-box { width: min(1100px, calc(100vw - 80px)); height: calc(100dvh - 80px); border-radius: 12px; }
@media (max-width: 767px) {
  .send { padding: 0; }
  .send .write-box { width: 100%; height: 100dvh; border-radius: 0; padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); }
  .expand-composer { display: none; }
}
</style>

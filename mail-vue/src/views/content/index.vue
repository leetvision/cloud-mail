<template>
  <div class="box">
    <div class="header-actions">
      <IconAction class="icon" icon="material-symbols-light:arrow-back-ios-new" width="20" height="20" @click="handleBack" :label="$t('back')"/>
      <IconAction v-if="email.canManage !== 0" v-perm="'email:delete'" class="icon" icon="uiw:delete" width="16" height="16" @click="handleDelete" :label="$t('delete')"/>
      <span class="star" v-if="emailStore.contentData.showStar">
        <IconAction class="icon" @click="changeStar" v-if="email.isStar" icon="fluent-color:star-16" width="20" height="20" :label="$t('star')"/>
        <IconAction class="icon" @click="changeStar" v-else icon="solar:star-line-duotone" width="18" height="18" :label="$t('star')"/>
      </span>
      <IconAction class="icon" v-if="emailStore.contentData.showReply && email.canSend !== 0" v-perm="'email:send'"  @click="openReply()" icon="la:reply" width="21" height="21"  :label="$t('reply')"/>
      <IconAction class="icon" v-if="emailStore.contentData.showReply && email.canSend !== 0" v-perm="'email:send'"  @click="openForward()" icon="iconoir:arrow-up-right" width="20" height="20"  :label="$t('forward')"/>
    </div>
    <el-scrollbar class="scrollbar">
      <div class="container">
        <div class="email-title">
          {{ email.subject }}
        </div>
        <p v-if="threadLoading" class="thread-status" role="status">{{ $t('threadLoading') }}</p>
        <div v-else-if="threadFailed" class="thread-status" role="alert">
          <span>{{ $t('threadLoadFailed') }}</span>
          <el-button @click="loadThread">{{ $t('mailboxRetry') }}</el-button>
        </div>
        <p v-else-if="messages.length > 1" class="thread-status">{{ $t('threadMessageCount', messages.length) }}</p>
        <div class="content" v-for="message in messages" :key="message.emailId">
          <div class="email-info">
            <div>
              <div class="send"><span class="send-source">{{$t('from')}}</span>
                <div class="send-name">
                  <span class="send-name-title">{{ message.name }}</span>
                  <span><{{ message.sendEmail }}></span>
                </div>
              </div>
              <div class="receive"><span class="source">{{$t('recipient')}}</span><span class="receive-email">{{  formateReceive(message.recipient) }}</span></div>
              <div class="date">
                <div>{{ formatDetailDate(message.createTime) }}</div>
              </div>
            </div>
            <el-alert v-if="message.status === 3" :closable="false" :title="toMessage(message.message)" class="email-msg" type="error" show-icon />
            <el-alert v-if="message.status === 4" :closable="false" :title="$t('complained')" class="email-msg" type="warning" show-icon />
            <el-alert v-if="message.status === 5" :closable="false" :title="$t('delayed')" class="email-msg" type="warning" show-icon />
          </div>
          <div class="htm-scrollbar" :class="!message.attList?.length ? 'bottom-distance' : ''">
            <ShadowHtml class="shadow-html" :html="formatImage(message.content)" v-if="message.content" />
            <pre v-else class="email-text" >{{message.text}}</pre>
          </div>
          <div class="att" v-if="message.attList?.length > 0">
            <div class="att-title">
              <span>{{$t('attachments')}}</span>
              <span>{{$t('attCount',{total: message.attList.length})}}</span>
            </div>
            <div class="att-box">

              <div class="att-item" v-for="att in message.attList" :key="att.attId">
                <div class="att-icon" @click="showImage(att.key)">
                  <Icon v-bind="getIconByName(att.filename)" />
                </div>
                <div class="att-name" @click="showImage(att.key)">
                  {{ att.filename }}
                </div>
                <div class="att-size">{{ formatBytes(att.size) }}</div>
                <div class="opt-icon att-icon">
                  <Icon v-if="isImage(att.filename)" icon="hugeicons:view" width="22" height="22" @click="showImage(att.key)"/>
                  <a :href="cvtR2Url(att.key)" download>
                    <Icon icon="system-uicons:push-down" width="22" height="22"/>
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div class="message-actions" v-if="emailStore.contentData.showReply && message.canSend !== 0">
            <el-button v-if="message.type === 0" v-perm="'email:send'" @click="openReply(message)">{{ $t('reply') }}</el-button>
            <el-button v-perm="'email:send'" @click="openForward(message)">{{ $t('forward') }}</el-button>
          </div>
        </div>
      </div>
    </el-scrollbar>
    <el-image-viewer
        v-if="showPreview"
        :url-list="srcList"
        show-progress
        @close="showPreview = false"
    />
  </div>
</template>
<script setup>
import IconAction from '@/components/icon-action/index.vue'
import ShadowHtml from '@/components/shadow-html/index.vue'
import {computed, reactive, ref, watch, onMounted, onUnmounted} from "vue";
import {useRouter} from 'vue-router'
import {ElMessage, ElMessageBox} from 'element-plus'
import {emailDelete, emailRead, emailThread} from "@/request/email.js";
import {Icon} from "@iconify/vue";
import {useEmailStore} from "@/store/email.js";
import {useAccountStore} from "@/store/account.js";
import {formatDetailDate} from "@/utils/day.js";
import {starAdd, starCancel} from "@/request/star.js";
import {getExtName, formatBytes} from "@/utils/file-utils.js";
import {cvtR2Url} from "@/utils/convert.js";
import {getIconByName} from "@/utils/icon-utils.js";
import {allEmailDelete} from "@/request/all-email.js";
import {useUiStore} from "@/store/ui.js";
import {useI18n} from "vue-i18n";
import {EmailUnreadEnum} from "@/enums/email-enum.js";

const uiStore = useUiStore();
const accountStore = useAccountStore();
const emailStore = useEmailStore();
const router = useRouter()
const email = computed(() => emailStore.contentData.email || {
  emailId: 0,
  attList: [],
  content: '',
  text: '',
  recipient: '[]',
})
const threadMessages = ref([])
const threadLoading = ref(false)
const threadFailed = ref(false)
const messages = computed(() => threadMessages.value.length ? threadMessages.value : (email.value.emailId ? [email.value] : []))
const replyEmail = computed(() => messages.value.findLast(message => message.type === 0) || messages.value.at(-1) || email.value)
let threadRequest = 0

async function loadThread() {
  const emailId = email.value.emailId
  if (!emailId || emailStore.contentData.delType === 'physics') return
  const request = ++threadRequest
  threadLoading.value = true
  threadFailed.value = false
  try {
    const list = await emailThread(emailId)
    if (request !== threadRequest) return
    emailStore.applyFullList(list)
    threadMessages.value = list.map(item => emailStore.detailMap[item.emailId])
    await markMessagesRead(threadMessages.value)
  } catch (error) {
    if (request === threadRequest) threadFailed.value = true
    console.error(error)
  } finally {
    if (request === threadRequest) threadLoading.value = false
  }
}

async function markMessagesRead(list) {
  if (!emailStore.contentData.showUnread) return
  const unread = list.filter(message => message.type === 0 && message.unread === EmailUnreadEnum.UNREAD)
  if (!unread.length) return
  try {
    // The read endpoint accepts at most 95 IDs; conversations can be much longer.
    for (let offset = 0; offset < unread.length; offset += 50) {
      const batch = unread.slice(offset, offset + 50)
      await emailRead(batch.map(message => message.emailId))
      for (const message of batch) {
        message.unread = EmailUnreadEnum.READ
        if (emailStore.detailMap[message.emailId]) emailStore.detailMap[message.emailId].unread = EmailUnreadEnum.READ
        if (email.value.emailId === message.emailId) email.value.unread = EmailUnreadEnum.READ
        emailStore.markListRead(message.emailId)
      }
    }
  } catch (error) {
    console.error(error)
  }
}

watch(() => email.value.emailId, () => {
  threadRequest++
  threadMessages.value = []
  loadThread()
}, { immediate: true })

watch(() => emailStore.sentRevision, () => loadThread())

const showPreview = ref(false)
const srcList = reactive([])

const { t } = useI18n()
watch(() => accountStore.currentAccountId, () => {
  handleBack()
})

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
})

onUnmounted(() => {
  emailStore.contentData.showUnread = false;
  threadRequest++
  window.removeEventListener('keydown', handleKeyDown);
})

function handleKeyDown(event) {
  if (event.key !== 'Escape') return;
  if (showPreview.value) return;
  if (document.querySelector('.el-message-box')) return;
  const writeBox = document.querySelector('.write-box');
  if (writeBox && writeBox.offsetParent !== null) return;
  handleBack();
}

function openReply(message = replyEmail.value) {
  uiStore.writerRef.openReply(message)
}

function openForward(message = replyEmail.value) {
  uiStore.writerRef.openForward(message)
}

function toMessage(message) {
  return  message ? JSON.parse(message).message : '';
}

function formatImage(content) {
  content = content || '';
  return content.replace(/{{domain}}/g, '/api/oss/');
}

function showImage(key) {
  if (!isImage(key)) return;
  const url = cvtR2Url(key)
  srcList.length = 0
  srcList.push(url)
  showPreview.value = true
}

function isImage(filename) {
  return ['png', 'jpg', 'jpeg', 'bmp', 'gif','jfif'].includes(getExtName(filename))
}

function formateReceive(recipient) {
  if (!recipient) return ''
  recipient = JSON.parse(recipient)
  return recipient.map(item => item.address).join(', ')
}

function changeStar() {
  if (email.value.isStar) {
    email.value.isStar = 0;
    starCancel(email.value.emailId).then(() => {
      email.value.isStar = 0;
      emailStore.cancelStarEmailId = email.value.emailId
      setTimeout(() => emailStore.cancelStarEmailId = 0)
      emailStore.starScroll?.deleteEmail([email.value.emailId])
    }).catch((e) => {
      console.error(e)
      email.value.isStar = 1;
    })
  } else {
    email.value.isStar = 1;
    starAdd(email.value.emailId).then(() => {
      email.value.isStar = 1;
      emailStore.addStarEmailId = email.value.emailId
      setTimeout(() => emailStore.addStarEmailId = 0)
      emailStore.starScroll?.addItem(email.value)
    }).catch((e) => {
      console.error(e)
      email.value.isStar = 0;
    })
  }
}

const handleBack = () => {
  router.back()
}

const handleDelete = () => {
  ElMessageBox.confirm(t('delEmailConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    if (emailStore.contentData.delType === 'logic') {
      emailDelete(email.value.emailId).then(() => {
        ElMessage({
          message: t('delSuccessMsg'),
          type: 'success',
          plain: true,
        })
        emailStore.deleteIds = [email.value.emailId]
      })
    } else  {

      allEmailDelete(email.value.emailId).then(() => {
        ElMessage({
          message: t('delSuccessMsg'),
          type: 'success',
          plain: true,
        })
        emailStore.deleteIds = [email.value.emailId]
      })
    }

    router.back()
  })
}
</script>
<style scoped lang="scss">
.box {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
  position: relative;
  height: 100%;
  overflow: hidden;
}

.header-actions {
  padding: var(--space-1) var(--space-3);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  box-shadow: var(--header-actions-border);
  font-size: 18px;
  .star {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 21px;
  }
  .icon {
    cursor: pointer;
  }
}


.scrollbar {
  height: 100%;
  min-height: 0;
  width: 100%;
}

.container {
  font-size: 14px;
  padding-left: 20px;
  padding-right: 20px;
  padding-top: 10px;
  @media (max-width: 1023px) {
    padding-left: 15px;
    padding-right: 15px;
  }

  .email-title {
    font-size: 20px;
    overflow-wrap: anywhere;
    font-weight: bold;
    margin-bottom: 10px;
  }

  .thread-status {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
    color: var(--secondary-text-color);
    margin-bottom: var(--space-3);
  }

  .message-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-block: var(--space-3);

    .el-button + .el-button {
      margin-left: 0;
    }
  }

  .content + .content {
    border-top: 1px solid var(--light-border-color);
    padding-top: var(--space-4);
  }

  .htm-scrollbar {
    width: 100%;
    min-width: 0;
  }

  .content {
    margin-bottom: var(--space-4);
    min-width: 0;
    overflow-wrap: anywhere;
    display: flex;
    flex-direction: column;

    .att {
      margin-top: 30px;
      margin-bottom: 30px;
      border: 1px solid var(--light-border-color);
      padding: 14px;
      border-radius: 6px;
      width: 100%;
      max-width: 640px;
      min-width: 0;
      .att-box {
        min-width: 0;
        max-width: 100%;
        display: grid;
        gap: 12px;
        grid-template-rows: 1fr;
      }

      .att-title {
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
        span:first-child {
          font-weight: bold;
        }
      }

      .att-item {
        cursor: pointer;
        div {
          align-self: center;
        }
        background: var(--light-ill);
        padding: 5px 7px;
        border-radius: 4px;
        align-self: start;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto auto;
        .att-icon {
          display: grid;
        }

        .att-size {
          color: var(--secondary-text-color);
        }

        .att-name {
          min-width: 0;
          margin-left: 8px;
          margin-right: 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          word-break: break-all;
        }

        .att-image {
          width: 60px;
          height: 60px;
          object-fit: contain;
        }

        .opt-icon {
          padding-left: 10px;
          color: var(--secondary-text-color);
          align-items: center;
          display: flex;
          gap: 8px;
          cursor: pointer;
          a {
            color: var(--secondary-text-color);
            align-items: center;
            display: flex;
          }
        }
      }
    }

    .email-info {

      border-bottom: 1px solid var(--light-border-color);
      margin-bottom: 20px;
      padding-bottom: 8px;
      @media (max-width: 1024px) {
        margin-bottom: 15px;
      }
      .date {
        color: var(--regular-text-color);
        margin-bottom: 6px;
      }

      .email-msg {
        max-width: 400px;
        width: fit-content;
        margin-bottom: 15px;
      }

      .send {
        display: flex;
        margin-bottom: 6px;

        .send-name {
          color: var(--regular-text-color);
          display: flex;
          flex-wrap: wrap;
        }

        .send-name-title {
          padding-right: 5px;
        }
      }

      .receive {
        margin-bottom: 6px;
        display: flex;
        .receive-email {
          max-width: 700px;
          word-break: break-word;
        }
        span:nth-child(2) {
          color: var(--regular-text-color);
        }
      }

      .send-source {
        white-space: nowrap;
        font-weight: bold;
        padding-right: 10px;
      }

      .source {
        white-space: nowrap;
        font-weight: bold;
        padding-right: 10px;
      }
    }
  }
}

.shadow-html::after  {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--message-block-color); /* Semi-transparent dark overlay. */
  pointer-events: none; /* Do not intercept clicks. */
}

.email-text {
  font-family: inherit;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

.bottom-distance {
  margin-bottom: 30px;
}


</style>

import { defineStore } from 'pinia'
import { EmailUnreadEnum } from '@/enums/email-enum.js'

export const useEmailStore = defineStore('email', {
    state: () => ({
        deleteIds: 0,
        starScroll: null,
        emailScroll: null,
        cancelStarEmailId: 0,
        addStarEmailId: 0,
        contentData: {
            email: null,
            delType: null,
            showStar: true,
            showReply: true,
            showUnread: false
        },
        sendScroll: null,
        detailMap: {},
    }),
    persist: {
        pick: ['contentData'],
    },
    actions: {
        fetchList(request) {
            return request(0).then(data => {
                request(1).then(fullData => {
                    const list = Array.isArray(fullData) ? fullData : fullData?.list
                    this.applyFullList(list)
                }).catch(e => {
                    console.error(e)
                })
                return data
            })
        },
        applyFullList(list) {
            if (!list?.length) return
            const currentId = this.contentData.email?.emailId
            for (const item of list) {
                if (!item?.emailId) continue
                if (!item.attList) item.attList = []
                // A full refresh can beat the mark-read response; preserve the local read state.
                const prev = this.detailMap[item.emailId]
                const keepRead = prev?.unread === EmailUnreadEnum.READ
                    || (currentId === item.emailId && this.contentData.email?.unread === EmailUnreadEnum.READ)
                if (keepRead) {
                    item.unread = EmailUnreadEnum.READ
                }
                this.detailMap[item.emailId] = item
                if (currentId && item.emailId === currentId) {
                    this.contentData.email = item
                }
            }
        },
        toContentEmail(email) {
            const id = email?.emailId
            if (id && this.detailMap[id]) {
                return this.detailMap[id]
            }
            return {
                ...email,
                emailId: id || 0,
                content: '',
                text: '',
                attList: [],
                recipient: email?.recipient || '[]',
            }
        },
        markListRead(emailId) {
            const scrolls = [this.emailScroll, this.starScroll, this.sendScroll]
            for (const scroll of scrolls) {
                const list = scroll?.emailList
                if (!list?.length) continue
                const item = list.find(e => e.emailId === emailId)
                if (item) item.unread = EmailUnreadEnum.READ
            }
        },
    },
})

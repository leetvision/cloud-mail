import http from '@/axios/index.js'

export function accountList(accountId, size, lastSort) {
    return http.get('/account/list', {params: {accountId, size, lastSort}});
}

export function accountAdd(email,token) {
    return http.post('/account/add', {email,token})
}

export function accountSetName(accountId,name) {
    return http.put('/account/setName', {name,accountId})
}

export function accountDelete(accountId) {
    return http.delete('/account/delete', {params: {accountId}})
}

export function accountSetAllReceive(accountId) {
    return http.put('/account/setAllReceive', {accountId})
}

export function accountSetAsTop(accountId) {
    return http.put('/account/setAsTop', {accountId})
}

export function mailboxMembers(accountId) {
    return http.get('/account/members', {params: {accountId}})
}
export function saveMailboxMember(accountId, email, role) {
    return http.put('/account/members', {accountId, email, role})
}
export function removeMailboxMember(accountId, userId) {
    return http.delete('/account/members', {params: {accountId, userId}})
}
export function mailboxAccess(accountId) {
    return http.get('/account/access', {params: {accountId}})
}

export const mailbox = { accountId: 1, userId: 1, email: 'alex@example.com', name: 'Alex Morgan', allReceive: 0, accessRole: 'owner' };
export const sharedMailbox = { accountId: 2, userId: 2, email: 'team@example.com', name: 'Team', allReceive: 0, accessRole: 'reader' };
export const messages = Array.from({ length: 18 }, (_, i) => ({
  emailId: 100 - i, accountId: 1, userId: 1, name: ['Maya Chen', 'Design team', 'Jordan Lee', 'Cloud Mail'][i % 4],
  sendEmail: ['maya@example.com', 'design@example.com', 'jordan@example.com', 'hello@example.com'][i % 4],
  toEmail: mailbox.email, recipient: JSON.stringify([{address:mailbox.email}]),
  subject: ['A few thoughts on the next release', 'Design review · Thursday', 'Weekend plans', 'Welcome to your inbox'][i % 4],
  text: 'Hi Alex, here are the notes we discussed. Let me know what you think when you have a moment.',
  content: '<p>Hi Alex,</p><p>Here are the notes we discussed. Let me know what you think when you have a moment.</p><p>Thanks,<br>Maya</p>',
  listText: 'Hi Alex, here are the notes we discussed. Let me know what you think when you have a moment.',
  unread: i < 3 ? 0 : 1, isStar: i === 2 ? 1 : 0, type: 0, status: 0, isDel: 0,
  canSend: 1, canManage: 1, attList: [], createTime: `2026-10-11 ${String(13 - Math.floor(i / 4)).padStart(2, '0')}:30:00`,
}));

// Browser fixtures never contact a live mail service or send real messages.
export async function installMailbox(page, options = {}) {
  const calls = [];
  let listFailed = options.failList || false;
  let sendFailed = options.failSend || false;
  let rows = options.empty ? [] : structuredClone(messages);
  if (options.attachments && rows.length) rows[0].attList = structuredClone(options.attachments);
  await page.addInitScript(() => localStorage.setItem('authenticated', 'ui-test-only'));
  await page.route('**/api/**', async route => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace('/api', '');
    calls.push({ path, method: req.method(), query: Object.fromEntries(url.searchParams), body: req.postDataJSON() });
    let data;
    if (path === '/setting/websiteConfig') {
      data = { title: 'Cloud Mail', domainList: ['example.com'], manyEmail: 0, addEmail: 0, send: 0, autoRefresh: 0, notice: 1 };
    } else if (path === '/my/loginUserInfo') {
      data = { userId: 1, email: mailbox.email, name: mailbox.name, account: mailbox, role: { name: 'Member', sendType: 'internal', accountCount: 0 }, permKeys: options.permissions || ['email:send', 'email:delete', 'account:query', 'account:add'] };
    } else if (path === '/account/list') data = [mailbox, sharedMailbox];
    else if (path === '/account/access') data = url.searchParams.get('accountId') === '2' ? sharedMailbox : mailbox;
    else if (path === '/email/thread') data = [rows.find(row => row.emailId === Number(url.searchParams.get('emailId'))) || messages[0]];
    else if (path === '/email/list' || path === '/star/list') {
      const delay = options.delayQueries?.[url.searchParams.get('query')] || options.delayList;
      if (delay) await new Promise(resolve => setTimeout(resolve, delay));
      if (listFailed) {
        await route.fulfill({ status: 500, json: { code: 500, message: 'Fixture list failure' } });
        return;
      }
      const query = (url.searchParams.get('query') || '').toLowerCase();
      let list = rows.filter(row => [row.name, row.sendEmail, row.subject, row.text].join(' ').toLowerCase().includes(query));
      if (path === '/star/list') list = list.filter(row => row.isStar);
      const reader = url.searchParams.get('accountId') === '2';
      data = { list: list.map(row => ({ ...row, canSend: reader ? 0 : 1, canManage: reader ? 0 : 1 })), total: list.length, latestEmail: { emailId: 100 } };
    } else if (path === '/email/delete') {
      const ids = url.searchParams.get('emailIds').split(',').map(Number);
      rows = rows.filter(row => !ids.includes(row.emailId));
      data = null;
    } else if (path === '/email/send') {
      if (sendFailed) { await route.fulfill({json:{code:502,message:'Fixture send failure'}}); return; }
      data = [{ ...messages[0], emailId: 101, type: 1 }];
    }
    else data = null;
    await route.fulfill({ json: { code: 200, data } });
  });
  return { calls, recover: () => { listFailed = false; sendFailed = false; } };
}

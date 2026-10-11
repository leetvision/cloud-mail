import { test, expect } from '@playwright/test';
import { installMailbox } from './mail-fixture.js';

async function navigate(page, label) {
  if (await page.locator('.aside').evaluate(el => el.hasAttribute('inert'))) await page.getByRole('button', {name:'Toggle navigation'}).click();
  await page.getByRole('menuitem', {name:label, exact:true}).click();
}
async function compose(page) {
  const floating = page.locator('.mobile-compose');
  if (await floating.isVisible()) await floating.click();
  else await page.locator('.compose-button').click();
  await expect(page.getByRole('dialog', {name:'Compose message', exact:true})).toBeVisible();
}
async function fillMessage(page) {
  await page.locator('.send .el-input-tag__input').fill('maya@example.com');
  await page.locator('.send .el-input-tag__input').press('Enter');
  await page.getByRole('textbox', {name:'Subject', exact:true}).fill('Release notes');
  await page.frameLocator('.tox-edit-area__iframe').locator('body').fill('Here are the release notes.');
}

test('inbox rows stay compact on desktop and readable on mobile; select and mark read', async ({page}, testInfo) => {
  const fixture = await installMailbox(page);
  await page.goto('/inbox');
  const row = page.locator('.email-row').first();
  await expect(row).toBeVisible();
  expect((await row.boundingBox()).height).toBe(testInfo.project.name === 'mobile' ? 88 : 44);
  await row.locator('.el-checkbox').click();
  await expect(page.getByText('1 selected', {exact:true})).toBeVisible();
  await page.locator('.header-actions').getByRole('button', {name:'Mark as Read', exact:true}).click();
  await expect.poll(() => fixture.calls.filter(call => call.path === '/email/read').length).toBeGreaterThan(0);
  await expect(row).not.toHaveClass(/is-unread/);
});

test('folder search reaches the API, shows results, and clears', async ({page}) => {
  const fixture = await installMailbox(page);
  await page.goto('/inbox');
  const search = page.getByRole('searchbox');
  await search.fill('Maya'); await search.press('Enter');
  await expect(page.locator('.email-row')).toHaveCount(5);
  expect(fixture.calls.some(call => call.path === '/email/list' && call.query.query === 'Maya')).toBe(true);
  await search.fill('no matching messages'); await search.press('Enter');
  await expect(page.getByRole('heading', {name:'No messages found'})).toBeVisible();
  await page.locator('.mail-state').getByRole('button', {name:'Clear search'}).click();
  await expect(page.locator('.email-row')).toHaveCount(18);
  await navigate(page, 'Starred');
  await expect(page.locator('.email-row')).toHaveCount(1);
  await expect(search).toHaveAttribute('placeholder', 'Search in Starred');
});

test('list failures have a working retry and an empty inbox explains the state', async ({page}) => {
  const fixture = await installMailbox(page, {failList:true});
  await page.goto('/inbox');
  await expect(page.getByRole('heading', {name:'Could not load your messages'})).toBeVisible();
  fixture.recover();
  await page.locator('.mail-state').getByRole('button', {name:'Try again'}).click();
  await expect(page.locator('.email-row')).toHaveCount(18);
});

test('empty inbox is accessible and has no fake messages', async ({page}) => {
  await installMailbox(page, {empty:true});
  await page.goto('/inbox');
  await expect(page.getByRole('heading', {name:'Your inbox is clear'})).toBeVisible();
  await expect(page.locator('.email-container')).toHaveAttribute('aria-busy', 'false');
});

test('keyboard opening a message loads the conversation and reply; back preserves the inbox', async ({page}) => {
  const fixture = await installMailbox(page);
  await page.goto('/inbox');
  await page.locator('.email-row').first().focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/mail$/);
  await expect(page.locator('.email-title')).toHaveText('A few thoughts on the next release');
  await expect.poll(() => fixture.calls.some(call => call.path === '/email/thread')).toBe(true);
  await page.locator('.message-actions').getByRole('button', {name:'Reply', exact:true}).click();
  await expect(page.getByRole('textbox', {name:'Subject', exact:true})).toHaveValue(/Re:/);
  await page.getByRole('button', {name:'Close composer', exact:true}).click();
  await page.getByRole('button', {name:'Back to messages'}).click();
  await expect(page).toHaveURL(/\/inbox$/);
});

test('compose sends the entered recipient, subject, and body without touching live mail', async ({page}) => {
  const fixture = await installMailbox(page);
  await page.goto('/inbox');
  await compose(page); await fillMessage(page);
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', {name:'Add attachment'}).click();
  await (await chooser).setFiles({name:'notes.txt', mimeType:'text/plain', buffer:Buffer.from('Release notes attachment')});
  await expect(page.locator('.att-filename')).toHaveText('notes.txt');
  await page.locator('.send-controls').getByRole('button', {name:'Send', exact:true}).click();
  await expect(page.getByRole('dialog', {name:'Compose message', exact:true})).not.toBeVisible();
  const sent = fixture.calls.find(call => call.path === '/email/send');
  expect(sent.body.receiveEmail).toEqual(['maya@example.com']);
  expect(sent.body.subject).toBe('Release notes');
  expect(sent.body.attachments[0].filename).toBe('notes.txt');
  expect(sent.body.text).toContain('release notes');
});

test('closing compose saves a draft that can be reopened', async ({page}) => {
  await installMailbox(page); await page.goto('/inbox');
  await compose(page); await fillMessage(page);
  await page.getByRole('button', {name:'Close composer', exact:true}).click();
  await page.locator('.el-message-box').getByRole('button', {name:'Confirm', exact:true}).click();
  await expect(page.getByRole('dialog', {name:'Compose message', exact:true})).not.toBeVisible();
  await navigate(page, 'Drafts');
  await page.getByRole('link', {name:/Release notes/}).click();
  await expect(page.getByRole('textbox', {name:'Subject', exact:true})).toHaveValue('Release notes');
});

test('mailbox switching preserves reader restrictions', async ({page}) => {
  const fixture = await installMailbox(page); await page.goto('/inbox');
  if (await page.locator('.aside').evaluate(el => el.hasAttribute('inert'))) await page.getByRole('button', {name:'Toggle navigation'}).click();
  await page.getByRole('button', {name:'Mailboxes', exact:true}).click();
  await page.getByRole('button', {name:/team@example.com/}).first().click();
  await expect.poll(() => fixture.calls.some(call => call.path === '/email/list' && call.query.accountId === '2')).toBe(true);
  await expect(page.locator('.email-row').first().locator('.row-actions').getByRole('button', {name:'Delete', exact:true})).toHaveCount(0);
  const floating = page.locator('.mobile-compose');
  if (await floating.isVisible()) await floating.click(); else await page.locator('.compose-button').click();
  await expect(page.getByText('You can read this mailbox, but cannot send from it.', {exact:true})).toBeVisible();
  await expect(page.getByRole('dialog', {name:'Compose message', exact:true})).not.toBeVisible();
});

test('theme and navigation remain operable without overflow', async ({page}) => {
  await installMailbox(page); await page.goto('/inbox');
  await expect(page.locator('.email-row').first()).toBeVisible();
  await page.getByRole('button', {name:'Use dark theme'}).click();
  await expect(page.locator('html')).toHaveClass('dark');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', {name:'Toggle navigation'}).click();
  const close = page.getByRole('button', {name:'Close navigation'});
  if (await close.isVisible()) await close.click();
  else await page.getByRole('button', {name:'Toggle navigation'}).click();
});

test('a slower earlier search cannot replace the latest results', async ({page}) => {
  await installMailbox(page, {delayQueries:{Maya:800,Jordan:30}}); await page.goto('/inbox');
  await expect(page.locator('.email-row')).toHaveCount(18);
  const search = page.getByRole('searchbox');
  await search.fill('Maya'); await search.press('Enter');
  await search.fill('Jordan'); await search.press('Enter');
  await expect(page.locator('.email-row')).toHaveCount(4);
  await page.waitForTimeout(900); // Both deliberately reordered fixture responses have now arrived.
  await expect(page.locator('.email-row')).toHaveCount(4);
  await expect(page.locator('.email-row').first()).toHaveAttribute('aria-label', /Jordan/);
});

test('keyboard search, compose, modal expansion, and focus return work', async ({page}, testInfo) => {
  await installMailbox(page); await page.goto('/inbox');
  await page.locator('.email-row').first().focus();
  await page.keyboard.press('/');
  await expect(page.getByRole('searchbox')).toBeFocused();
  await page.locator('.email-row').first().focus();
  await page.keyboard.press('c');
  const dialog = page.getByRole('dialog', {name:'Compose message',exact:true});
  await expect(dialog).toBeVisible();
  if (testInfo.project.name === 'desktop') {
    await expect(dialog).toHaveAttribute('aria-modal','false');
    await page.getByRole('button',{name:'Expand composer'}).click();
  }
  await expect(dialog).toHaveAttribute('aria-modal','true');
  await expect(page.locator('.layout')).toHaveAttribute('inert','');
  await page.getByRole('button',{name:'Close composer'}).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.layout')).not.toHaveAttribute('inert','');
});

test('a failed send preserves the draft and permits a successful retry', async ({page}) => {
  const fixture = await installMailbox(page,{failSend:true}); await page.goto('/inbox');
  await compose(page); await fillMessage(page);
  await page.locator('.send-controls').getByRole('button',{name:'Send',exact:true}).click();
  await expect(page.getByText('Fixture send failure',{exact:true})).toBeVisible();
  await expect(page.getByRole('textbox',{name:'Subject',exact:true})).toHaveValue('Release notes');
  fixture.recover();
  await page.getByRole('textbox',{name:'Subject',exact:true}).press('Control+Enter');
  await expect(page.getByRole('dialog',{name:'Compose message',exact:true})).not.toBeVisible();
  expect(fixture.calls.filter(call=>call.path === '/email/send')).toHaveLength(2);
});

test('typed compose content survives dark and light theme changes', async ({page}) => {
  await installMailbox(page); await page.setViewportSize({width:1280,height:800});
  await page.goto('/inbox'); await compose(page); await fillMessage(page);
  for (const name of ['Use dark theme', 'Use light theme']) {
    const oldFrame = await page.locator('.tox-edit-area__iframe').elementHandle();
    await page.getByRole('button', {name}).click();
    await page.waitForFunction(frame => !frame.isConnected, oldFrame);
    await expect(page.frameLocator('.tox-edit-area__iframe').locator('body')).toHaveText('Here are the release notes.');
    await expect(page.getByRole('textbox', {name:'Subject',exact:true})).toHaveValue('Release notes');
  }
});

test('Compose remains visible in collapsed desktop navigation and on tablets; drawer protects focus', async ({page}) => {
  await installMailbox(page); await page.setViewportSize({width:1280,height:800}); await page.goto('/inbox');
  await page.getByRole('button', {name:'Toggle navigation'}).click();
  await expect(page.locator('.compose-button')).toBeVisible();
  expect((await page.locator('.aside').boundingBox()).width).toBe(72);
  expect((await page.locator('.main-container').boundingBox()).x).toBe(72);
  await compose(page); await page.getByRole('button',{name:'Close composer'}).click();
  await page.setViewportSize({width:900,height:800});
  await expect(page.locator('.mobile-compose')).toBeVisible();
  await compose(page); await page.getByRole('button',{name:'Close composer'}).click();
  await page.getByRole('button', {name:'Toggle navigation'}).click();
  const drawer = page.getByRole('dialog', {name:'Mail navigation',exact:true});
  await expect(drawer).toHaveAttribute('aria-modal','true');
  await expect(page.locator('.app-header')).toHaveAttribute('inert','');
  await expect(page.locator('#mail-main')).toHaveAttribute('inert','');
  await expect(drawer.getByRole('button',{name:'Close navigation'})).toBeFocused();
  await expect(drawer.getByRole('button',{name:'Close navigation'}).locator('svg')).toBeVisible();
  await page.keyboard.press('Shift+Tab');
  expect(await drawer.evaluate(el=>el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(drawer).not.toBeVisible();
  await expect(page.getByRole('button', {name:'Toggle navigation'})).toBeFocused();
});

test('more than fifty local drafts do not repeat; deleting them refreshes counts and empty state', async ({page}, testInfo) => {
  await installMailbox(page); await page.goto('/inbox'); await navigate(page,'Drafts');
  await expect(page.locator('.mail-state')).toBeVisible();
  await page.evaluate(async () => {
    const database = await new Promise((resolve,reject) => {
      const request = indexedDB.open('alex@example.com');
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    await new Promise((resolve,reject) => {
      const tx = database.transaction('draft','readwrite');
      for (let i = 1; i <= 55; i++) tx.objectStore('draft').add({
        subject:`Draft ${String(i).padStart(2,'0')}`,text:'Draft notes',content:'<p>Draft notes</p>',receiveEmail:['maya@example.com'],
        sendEmail:'alex@example.com',accountId:1,createTime:`2026-10-11 13:00:${String(i).padStart(2,'0')}`,
      });
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    });
    database.close();
  });
  await page.getByRole('button', {name:'Refresh',exact:true}).click();
  await expect(page.locator('.email-count')).toHaveText('Total 55');
  await page.locator('.virtual').evaluate(el => el.scrollTop = el.scrollHeight);
  await expect(page.getByRole('link',{name:'Draft 01',exact:true})).toBeVisible();
  const height = await page.locator('.virtual').evaluate(el=>el.scrollHeight);
  expect(height).toBeLessThanOrEqual(56 * (testInfo.project.name === 'mobile' ? 88 : 44));
  await page.locator('.header-actions > .el-checkbox').click();
  await expect(page.getByText('55 selected',{exact:true})).toBeVisible();
  await page.locator('.header-actions').getByRole('button',{name:'Delete',exact:true}).click();
  await page.locator('.el-message-box').getByRole('button',{name:'Confirm',exact:true}).click();
  await expect(page.locator('.mail-state')).toBeVisible();
  await expect(page.locator('.email-count')).toHaveCount(0);
  await expect(page.locator('.email-container')).toHaveAttribute('aria-busy','false');
});

test('message deletion updates the total and clears the final selection', async ({page}, testInfo) => {
  await installMailbox(page); await page.goto('/inbox');
  const firstRow = page.locator('.email-row').first();
  if (testInfo.project.name === 'desktop') {
    await firstRow.hover();
    await firstRow.locator('.row-actions').getByRole('button',{name:'Delete',exact:true}).click();
  } else {
    await firstRow.locator('.el-checkbox').click();
    await page.locator('.header-actions').getByRole('button',{name:'Delete',exact:true}).click();
    await page.locator('.el-message-box').getByRole('button',{name:'Confirm',exact:true}).click();
  }
  await expect(page.locator('.email-count')).toHaveText('Total 17');
  await page.locator('.header-actions > .el-checkbox').click();
  await page.locator('.header-actions').getByRole('button',{name:'Delete',exact:true}).click();
  await page.locator('.el-message-box').getByRole('button',{name:'Confirm',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Your inbox is clear'})).toBeVisible();
  await expect(page.locator('.email-count')).toHaveCount(0);
  await expect(page.locator('.header-actions > .el-checkbox')).not.toHaveClass(/is-checked/);
});

test('attachment preview and download actions have filenames and work from the keyboard', async ({page}) => {
  await installMailbox(page,{attachments:[{attId:1,filename:'release.png',key:'fixture-image',size:128},{attId:2,filename:'notes.txt',key:'fixture-text',size:64}]});
  await page.goto('/inbox'); await page.locator('.email-row').first().click();
  const preview = page.getByRole('button',{name:'Preview release.png',exact:true});
  await preview.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.el-image-viewer__wrapper')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.el-image-viewer__wrapper')).not.toBeVisible();
  await expect(page.getByRole('link',{name:'Download release.png',exact:true})).toHaveAttribute('download','release.png');
  await expect(page.getByRole('link',{name:'Download notes.txt',exact:true})).toHaveAttribute('download','notes.txt');
});

test('Escape clears reader search without navigating, and closes the composer from its editor', async ({page}) => {
  await installMailbox(page); await page.goto('/inbox'); await page.locator('.email-row').first().click();
  await page.getByRole('searchbox').fill('Maya'); await page.getByRole('searchbox').press('Escape');
  await expect(page.getByRole('searchbox')).toHaveValue(''); await expect(page).toHaveURL(/\/mail$/);
  await compose(page);
  await page.frameLocator('.tox-edit-area__iframe').locator('body').press('Escape');
  await expect(page.getByRole('dialog',{name:'Compose message',exact:true})).not.toBeVisible();
});

test('enabled selection controls have contrasting boundaries in both themes', async ({page}) => {
  await installMailbox(page); await page.goto('/inbox');
  for (const name of ['Use dark theme', 'Use light theme']) {
    await page.getByRole('button',{name}).click();
    const ratios = await page.locator('.email-row').evaluateAll(rows => {
      const luminance = color => {
        const values = color.match(/[\d.]+/g).slice(0,3).map(Number).map(value=>value/255).map(value=>value<=0.04045 ? value/12.92 : ((value+0.055)/1.055)**2.4);
        return values[0]*0.2126+values[1]*0.7152+values[2]*0.0722;
      };
      return rows.map(row => {
        const border = luminance(getComputedStyle(row.querySelector('.el-checkbox__inner')).borderColor);
        const background = luminance(getComputedStyle(row).backgroundColor);
        return (Math.max(border,background)+0.05)/(Math.min(border,background)+0.05);
      });
    });
    expect(ratios.length).toBeGreaterThan(0); expect(Math.min(...ratios)).toBeGreaterThanOrEqual(3);
  }
});

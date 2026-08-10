import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

When('I open the first job', async function () {
  await this.page.getByRole('button', { name: 'View', exact: true }).first().click();
  await this.page.waitForSelector('.job-comments', { timeout: 15000 });
});

When('I post the comment {string}', async function (body) {
  // Comments are kept, so a scenario re-run would otherwise find its own
  // wording from last time and prove nothing. Each run posts its own.
  this.lastComment = `${body} (run ${Date.now().toString().slice(-6)})`;

  const thread = this.page.locator('.job-comments');
  await thread.locator('textarea').fill(this.lastComment);
  await thread.getByRole('button', { name: /post comment/i }).click();
  // The comment is only kept once the server has answered.
  await expect(
    thread.locator('.job-comments-list article').filter({ hasText: this.lastComment }),
  ).toHaveCount(1, { timeout: 15000 });
});

Then('the thread should show {string}', async function (body) {
  expect(this.lastComment, 'no comment was posted in this scenario').toContain(body);
  const comment = this.page.locator('.job-comments-list article').filter({ hasText: this.lastComment });
  await expect(comment).toHaveCount(1);
});

Then('the comment should be attributed to me', async function () {
  const mine = this.page.locator('.job-comments-list article').filter({ hasText: this.lastComment });
  await expect(mine).toHaveClass(/is-mine/);
  await expect(mine.locator('strong')).toHaveText(this.account.name);
});

When('I close the job and open it again', async function () {
  await this.page.keyboard.press('Escape');
  const closer = this.page.locator('.job-modal-close, [aria-label="Close"], .modal-close').first();
  if (await closer.count()) await closer.click().catch(() => {});
  await this.page.waitForTimeout(400);

  // Reloading proves the comment came back from the server rather than from
  // whatever the page was still holding in memory.
  await this.page.reload();
  await this.page.waitForLoadState('networkidle');
  await this.page.getByRole('button', { name: 'View', exact: true }).first().click();
  await this.page.waitForSelector('.job-comments', { timeout: 15000 });
});

Then('the post button should be disabled', async function () {
  const button = this.page.locator('.job-comments form button[type="submit"]');
  await expect(button).toBeDisabled();
});

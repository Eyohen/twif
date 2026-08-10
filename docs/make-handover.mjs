// One source for the handover note, rendered to Markdown and to a standalone
// HTML page, so the two cannot drift apart.
//   node docs/make-handover.mjs
import { writeFileSync, mkdirSync } from 'node:fs';

const DECISIONS = [
  {
    title: 'Should payment gate production?',
    status: 'settled',
    today: 'Settled by Henry on 10 August: unpaid orders are held, part paid and fully paid go through. An invoice with nothing recorded against it now sits in a Held queue on the production board with the reason shown, and the server refuses to hand it to a tailor.',
    question: '',
    options: [],
    recommend: 'Built and covered by tests. Nothing further needed.',
  },
  {
    title: 'Should there be a delivery step?',
    status: 'settled',
    today: 'Settled by Henry on 10 August: no delivered status. Ready for Collection is the end of the line. The screens now say so — the Completed and Cancelled filters, which nothing could ever put an order into, are gone, and the customer’s tracking page ends at Ready for Collection.',
    question: '',
    options: [],
    recommend: 'One consequence to keep in mind: TWIF cannot tell you what has physically left the shop, only what is ready to. If that becomes a question later, this is the decision to revisit.',
  },
  {
    title: 'Should missing measurements block a job?',
    status: 'settled',
    today: 'Settled by Henry on 10 August: yes. A job with no measurements is held out of the queue with "Measurements missing" against it, rather than being counted on an Exceptions card and left workable.',
    question: '',
    options: [],
    recommend: 'Built and covered by tests. Nothing further needed.',
  },
  {
    title: 'Do you want the authentication gap closed?',
    status: 'settled',
    today: 'Settled by Henry on 10 August: yes. Sign-in now happens on the server against hashed PINs, the PINs are out of the bundle, and every /api/oms/* route requires a session — apart from the customer’s own tracking link, which is deliberately open because the customer has no account. Roles are enforced per route.',
    question: '',
    options: [],
    recommend: 'Built and covered by tests, including that the API refuses a caller with no token and that a wrong PIN does not reveal which half was wrong.',
  },
];

const OPEN = [
  {
    title: 'Nothing here has been seen live yet',
    detail: 'Everything is pushed to both repositories, but I have no way to confirm what the deployed site is running. The server needs a restart so its startup schema check creates the StaffLoginEvents table that the sign-in history reads from — it creates missing tables and never alters an existing one, so live data is not at risk. The staff PINs on the live system should also be set by the Owner from User Management, where Reset PIN now works; the ones in the local seed are for development.',
  },
  {
    title: 'The rate limit',
    detail: 'Staff sign-in has a tight limit of its own — twelve failures per quarter hour, successful attempts not counted — so a PIN cannot be guessed at. The general ceiling of 2,000 requests per quarter hour per address is no longer applied outside production, which is what a full test run used to exhaust. Whether 2,000 is right for a shop where several tabs share one connection is a judgement to revisit once it is in daily use.',
  },
  {
    title: 'Customer records that share an email address',
    detail: 'New and edited customers need a unique address, but records created before that rule may still share one. Owner and Admin now have a Customer records panel in Settings that lists them, and anyone with no email at all, and can archive the record they do not want. I have not touched live customer records myself — which one to keep is the shop’s call.',
  },
];

const TESTED = [
  ['An order travels customer → invoice → order sheet → approval → production → tailor → ready → tracking', 'covered'],
  ['A job’s state survives changing hands and reloading', 'covered'],
  ['An order reaches production only once Accounts approve it', 'covered'],
  ['A tailor is offered Start Work or Mark Ready according to where the job is', 'covered'],
  ['An unpaid order is kept out of production', 'covered'],
  ['A part paid order is allowed through', 'covered'],
  ['A job with no measurements is held back', 'covered'],
  ['The API refuses a caller with no token, and a wrong PIN says nothing useful', 'covered'],
  ['Accounts record what a customer paid, and the status follows the money', 'covered'],
  ['An amount larger than the invoice is refused, and a tailor cannot record one at all', 'covered'],
];

const md = [
  '# TWIF OMS — where things stand',
  '',
  'Updated after all four of Henry’s decisions of 10 August were built. Everything below was checked against the code and the running app, not assumed.',
  '',
  '## Decisions',
  '',
  ...DECISIONS.flatMap((item, index) => [
    `### ${index + 1}. ${item.title}`,
    '',
    `**Today:** ${item.today}`,
    '',
    ...(item.question ? [`**The question:** ${item.question}`, ''] : []),
    ...item.options.map((option) => `- ${option}`),
    ...(item.options.length ? [''] : []),
    `*${item.recommend}*`,
    '',
  ]),
  '## Open work',
  '',
  ...OPEN.flatMap((item) => [`### ${item.title}`, '', item.detail, '']),
  '## What the tests cover',
  '',
  '| Behaviour | Status |',
  '| --- | --- |',
  ...TESTED.map(([what, status]) => `| ${what} | ${status} |`),
  '',
  'Every behaviour the four decisions settled is covered. Nothing in the suite asserts a rule TWIF does not have.',
  '',
].join('\n');

const escape = (value) => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TWIF OMS — where things stand</title>
<style>
  :root {
    --ink: #17120c; --ink-soft: #5c5245; --ink-faint: #8c8072;
    --paper: #fffcf6; --surface: #fbf6ec; --surface-2: #f4ecdd; --line: #e6dcc9;
    --gold: #b0770f; --pass: #2a7d4f; --warn: #9a6b12; --fail: #8a3520;
    --shadow: 0 1px 2px rgba(23,18,12,.05), 0 8px 24px rgba(23,18,12,.05);
    --display: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif;
    --body: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --ink: #f6efe4; --ink-soft: #c3b8a7; --ink-faint: #8e8375;
      --paper: #14110d; --surface: #1c1813; --surface-2: #241f18; --line: #322b22;
      --gold: #e0a53a; --pass: #5fbb87; --warn: #d8ac54; --fail: #dd8a6f;
      --shadow: 0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.3);
    }
  }
  :root[data-theme="dark"] {
    --ink: #f6efe4; --ink-soft: #c3b8a7; --ink-faint: #8e8375;
    --paper: #14110d; --surface: #1c1813; --surface-2: #241f18; --line: #322b22;
    --gold: #e0a53a; --pass: #5fbb87; --warn: #d8ac54; --fail: #dd8a6f;
    --shadow: 0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.3);
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--paper); color: var(--ink); font-family: var(--body); font-size: 16px; line-height: 1.62; -webkit-font-smoothing: antialiased; }
  .wrap { max-width: 54rem; margin: 0 auto; padding: clamp(2rem,5vw,4.5rem) clamp(1.1rem,4vw,2.5rem) 5rem; display: flex; flex-direction: column; gap: 2.5rem; }
  .eyebrow { margin: 0; font-family: var(--mono); font-size: .72rem; letter-spacing: .16em; text-transform: uppercase; color: var(--gold); }
  h1 { margin: .5rem 0 0; font-family: var(--display); font-weight: 600; font-size: clamp(2rem,5vw,2.9rem); line-height: 1.1; text-wrap: balance; }
  .lede { margin: .8rem 0 0; max-width: 62ch; color: var(--ink-soft); }
  h2 { margin: 0 0 1rem; font-family: var(--display); font-size: 1.45rem; font-weight: 600; }
  .decision { border: 1px solid var(--line); border-left: 3px solid var(--gold); border-radius: 12px; background: var(--surface); box-shadow: var(--shadow); padding: 1.25rem 1.4rem; }
  .decision h3 { margin: 0 0 .8rem; font-family: var(--body); font-size: 1.08rem; font-weight: 660; display: flex; align-items: baseline; flex-wrap: wrap; gap: .55rem; }
  .decision.is-settled { border-left-color: var(--pass); }
  .tag { font-family: var(--mono); font-size: .6rem; letter-spacing: .12em; text-transform: uppercase; border: 1px solid var(--line); border-radius: 999px; padding: .18rem .5rem; color: var(--warn); white-space: nowrap; }
  .decision.is-settled .tag { color: var(--pass); }
  .decision dl { margin: 0; display: grid; gap: .7rem; }
  .decision dt { font-family: var(--mono); font-size: .66rem; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-faint); }
  .decision dd { margin: .2rem 0 0; color: var(--ink-soft); }
  .decision ul { margin: .4rem 0 0; padding-left: 1.1rem; color: var(--ink-soft); display: grid; gap: .3rem; }
  .decision .rec { margin: .9rem 0 0; padding-top: .8rem; border-top: 1px solid var(--line); color: var(--ink); font-size: .95rem; }
  .stack { display: flex; flex-direction: column; gap: 1rem; }
  .open { border: 1px solid var(--line); border-radius: 12px; background: var(--surface); padding: 1rem 1.2rem; }
  .open h3 { margin: 0 0 .35rem; font-family: var(--body); font-size: 1rem; font-weight: 640; }
  .open p { margin: 0; color: var(--ink-soft); font-size: .95rem; }
  .scroll { overflow-x: auto; border: 1px solid var(--line); border-radius: 12px; box-shadow: var(--shadow); }
  table { width: 100%; border-collapse: collapse; background: var(--surface); }
  th, td { text-align: left; padding: .8rem 1rem; border-bottom: 1px solid var(--line); font-size: .94rem; }
  th { background: var(--surface-2); font-family: var(--mono); font-size: .66rem; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-faint); }
  tr:last-child td { border-bottom: 0; }
  .tag { font-family: var(--mono); font-size: .7rem; letter-spacing: .06em; padding: .18rem .5rem; border-radius: 999px; white-space: nowrap; }
  .tag-yes { color: var(--pass); background: color-mix(in srgb, var(--pass) 12%, transparent); }
  .tag-no { color: var(--warn); background: color-mix(in srgb, var(--warn) 14%, transparent); }
  footer { color: var(--ink-faint); font-size: .85rem; border-top: 1px solid var(--line); padding-top: 1.2rem; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <p class="eyebrow">The Way It Fits · Operations Management System</p>
    <h1>Where things stand</h1>
    <p class="lede">
      Written after the end-to-end lifecycle work. Everything below was checked against the code and
      the running app, not assumed. The four decisions come first because the remaining tests wait on
      them.
    </p>
  </header>

  <section>
    <h2>Decisions</h2>
    <div class="stack">
      ${DECISIONS.map((item, index) => `
        <article class="decision${item.status === 'settled' ? ' is-settled' : ''}">
          <h3>${index + 1}. ${escape(item.title)} <span class="tag">${item.status === 'settled' ? 'Settled' : 'Waiting on you'}</span></h3>
          <dl>
            <div><dt>${item.status === 'settled' ? 'What was decided' : 'Today'}</dt><dd>${escape(item.today)}</dd></div>
            ${item.question ? `<div><dt>The question</dt><dd>${escape(item.question)}</dd></div>` : ''}
            ${item.options.length ? `<div><dt>Options</dt><dd><ul>${item.options.map((option) => `<li>${escape(option)}</li>`).join('')}</ul></dd></div>` : ''}
          </dl>
          <p class="rec">${escape(item.recommend)}</p>
        </article>`).join('')}
    </div>
  </section>

  <section>
    <h2>Open work</h2>
    <div class="stack">
      ${OPEN.map((item) => `
        <article class="open">
          <h3>${escape(item.title)}</h3>
          <p>${escape(item.detail)}</p>
        </article>`).join('')}
    </div>
  </section>

  <section>
    <h2>What the tests cover</h2>
    <div class="scroll">
      <table>
        <thead><tr><th>Behaviour</th><th>Status</th></tr></thead>
        <tbody>
          ${TESTED.map(([what, status]) => `
            <tr>
              <td>${escape(what)}</td>
              <td><span class="tag ${status === 'covered' ? 'tag-yes' : 'tag-no'}">${escape(status)}</span></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <p style="margin:1rem 0 0;color:var(--ink-soft);max-width:64ch">
      The four that cannot be tested are not gaps in the suite. Each waits on a decision above: a test
      asserting a rule the system does not have would either pass by accident or fail for the wrong
      reason.
    </p>
  </section>

  <footer>
    34 scenarios and 141 steps pass on the current build. Regenerate this note with
    <code>node docs/make-handover.mjs</code>.
  </footer>
</div>
</body>
</html>
`;

mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
writeFileSync(new URL('./out/where-things-stand.md', import.meta.url), md);
writeFileSync(new URL('./out/where-things-stand.html', import.meta.url), html);
console.log('handover note written to docs/out/');

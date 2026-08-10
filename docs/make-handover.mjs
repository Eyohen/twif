// One source for the handover note, rendered to Markdown and to a standalone
// HTML page, so the two cannot drift apart.
//   node docs/make-handover.mjs
import { writeFileSync, mkdirSync } from 'node:fs';

const DECISIONS = [
  {
    title: 'Should payment gate production?',
    today: 'No. A job reaches Production when Accounts approve the invoice — payment status is never consulted, on the server or in the app. An unpaid invoice that Accounts approve goes straight to a tailor.',
    question: 'Should an unpaid, or partly paid, order be held back from Production?',
    options: [
      'Approval alone releases production, as today. Accounts carry the judgement.',
      'Fully paid only. Nothing is cut until the money is in.',
      'A deposit is enough. Needs a figure — a percentage, or an amount.',
    ],
    recommend: 'Worth deciding before go-live: today a garment can be made for someone who has paid nothing, and nothing in the app objects.',
  },
  {
    title: 'Should there be a delivery step?',
    today: 'There is none. Production runs Order Sheet Confirmed → Assigned → In Progress → Ready. Nothing anywhere sets Delivered, Collected or Completed — the store manager’s order filters mention them, but no screen produces them. An order’s last state is Ready for Collection.',
    question: 'Should someone mark an order as handed over, and who?',
    options: [
      'Leave it. Ready for Collection is the end of the line.',
      'The Store Manager marks it collected when the customer takes it.',
      'Production marks it out, the store marks it collected — two steps.',
    ],
    recommend: 'Without this, nothing in TWIF can tell you what has actually left the shop, and the customer’s tracking page never reaches a final state.',
  },
  {
    title: 'Should missing measurements block a job?',
    today: 'No. Missing measurements are counted on an Exceptions card on the production board. The job still sits in the normal queue and can be assigned and started.',
    question: 'Should a job without measurements be held out of the queue?',
    options: [
      'Warn only, as today.',
      'Hold it in a blocked queue with the reason shown, until measurements are added.',
    ],
    recommend: 'A tailor cannot cut without measurements, so the warning is doing no work where it sits.',
  },
  {
    title: 'Do you want the authentication gap closed?',
    today: 'Sign-in happens entirely in the browser: the PIN is checked against a list compiled into the JavaScript, so all seven PINs can be read from the deployed bundle. Separately, /api/oms/* has no authentication at all — customer records, invoices and payment evidence are readable by anyone who knows the address.',
    question: 'Should I move sign-in to the server and put the OMS API behind it?',
    options: [
      'Yes — server-side sign-in, hashed PINs, a session the API checks.',
      'Not yet, and accept the exposure for now.',
    ],
    recommend: 'This is the one I would fix before real customer data goes in. It is not cosmetic and it is not small, but it is well-defined.',
  },
];

const OPEN = [
  {
    title: 'No amount is ever recorded against a payment',
    detail: 'An invoice carries a status — unpaid, partly paid, fully paid — but no figure for what was actually handed over. Screens that used to invent one now read "Not recorded". The server will pass a paid amount through if one exists, but nothing in the app ever writes it, so Accounts cannot reconcile.',
  },
  {
    title: 'Archive Customer cannot be reached',
    detail: 'The handler exists and works; no button is wired to it, so the action is unreachable from the interface.',
  },
  {
    title: 'Duplicate customer emails in the live data',
    detail: 'New and edited customers now need a unique address, but records created before that may still share one. GET /oms/customers/duplicates reports them. I have not touched live customer records.',
  },
  {
    title: 'The sweep for controls that lead nowhere is unfinished',
    detail: 'Every dead control I met on a screen I touched is fixed. I have not run the rule across all seven roles as one pass.',
  },
  {
    title: 'The rate limit is tight enough to trip in normal use',
    detail: 'A full test run exhausted it and the API began refusing requests. A shop with several tabs polling notifications every twenty seconds shares one address, so it is plausible during a busy day.',
  },
];

const TESTED = [
  ['An order travels customer → invoice → order sheet → approval → production → tailor → ready → tracking', 'covered'],
  ['A job’s state survives changing hands and reloading', 'covered'],
  ['An order reaches production only once Accounts approve it', 'covered'],
  ['A tailor is offered Start Work or Mark Ready according to where the job is', 'covered'],
  ['An unpaid order is kept out of production', 'cannot be tested — no such rule exists'],
  ['A partly paid order follows the payment rule', 'cannot be tested — no such rule exists'],
  ['An order is marked delivered', 'cannot be tested — no delivery state exists'],
  ['A job with no measurements is held back', 'cannot be tested — it is only counted, not held'],
];

const md = [
  '# TWIF OMS — where things stand',
  '',
  'Written after the end-to-end lifecycle work. Everything below was checked against the code and the running app, not assumed.',
  '',
  '## Decisions I need from you',
  '',
  ...DECISIONS.flatMap((item, index) => [
    `### ${index + 1}. ${item.title}`,
    '',
    `**Today:** ${item.today}`,
    '',
    `**The question:** ${item.question}`,
    '',
    ...item.options.map((option) => `- ${option}`),
    '',
    `*${item.recommend}*`,
    '',
  ]),
  '## Open work, no decision needed',
  '',
  ...OPEN.flatMap((item) => [`### ${item.title}`, '', item.detail, '']),
  '## What the tests cover',
  '',
  '| Behaviour | Status |',
  '| --- | --- |',
  ...TESTED.map(([what, status]) => `| ${what} | ${status} |`),
  '',
  'The four that cannot be tested are not gaps in the suite. Each one waits on a decision above: a test asserting a rule the system does not have would pass by accident or fail for the wrong reason.',
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
  .decision h3 { margin: 0 0 .8rem; font-family: var(--body); font-size: 1.08rem; font-weight: 660; }
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
    <h2>Decisions I need from you</h2>
    <div class="stack">
      ${DECISIONS.map((item, index) => `
        <article class="decision">
          <h3>${index + 1}. ${escape(item.title)}</h3>
          <dl>
            <div><dt>Today</dt><dd>${escape(item.today)}</dd></div>
            <div><dt>The question</dt><dd>${escape(item.question)}</dd></div>
            <div><dt>Options</dt><dd><ul>${item.options.map((option) => `<li>${escape(option)}</li>`).join('')}</ul></dd></div>
          </dl>
          <p class="rec">${escape(item.recommend)}</p>
        </article>`).join('')}
    </div>
  </section>

  <section>
    <h2>Open work, no decision needed</h2>
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

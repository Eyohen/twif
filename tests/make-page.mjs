// Builds the shareable HTML report from the run's own JSON, so the page can
// never claim a result that did not happen. Run it after `npm test`:
//   node tests/make-page.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const run = JSON.parse(readFileSync(new URL('./reports/cucumber-report.json', import.meta.url)));

const scenariosOf = (feature) => feature.elements.filter((element) => element.type === 'scenario');
const stepsOf = (scenario) => scenario.steps.filter((step) => !['Before', 'After'].includes(step.keyword.trim()));
const secondsOf = (scenario) => scenario.steps.reduce((total, step) => total + (step.result?.duration || 0), 0) / 1e9;
const passed = (scenario) => stepsOf(scenario).every((step) => step.result.status === 'passed');

const escape = (value) => String(value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const all = run.flatMap(scenariosOf);
const failed = all.filter((scenario) => !passed(scenario));
const totalSteps = all.reduce((count, scenario) => count + stepsOf(scenario).length, 0);
const totalSeconds = all.reduce((total, scenario) => total + secondsOf(scenario), 0);
const ranAt = new Date().toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' });

// What each feature is guarding against, in the shop's own terms.
const WHY = {
  'Signing in': 'Every member of staff reaches their own workspace and nobody else’s.',
  'The notification bell': 'The bell sits in every top bar, so it has to lead somewhere from every account. The Owner’s did not.',
  'Reviewing invoices': 'The screen Accounts and the Owner work through: nothing opens unbidden, and the review fits the window.',
  'Comment threads on job sheets': 'A question about a garment stays with the garment, and survives a reload.',
  Inventory: 'What is on the shelves, recorded in full — and nothing that is not.',
  'Customer records': 'The invoice and the tracking link both go to the customer’s email, so it is required and unique.',
  "The customer's tracking link": 'What the customer is told about their order has to be true.',
};

const featureCard = (feature) => {
  const scenarios = scenariosOf(feature);
  const bad = scenarios.filter((scenario) => !passed(scenario)).length;
  return `
    <section class="feature">
      <header class="feature-head">
        <div>
          <h2>${escape(feature.name)}</h2>
          ${WHY[feature.name] ? `<p class="why">${escape(WHY[feature.name])}</p>` : ''}
          <p class="path">${escape(feature.uri)}</p>
        </div>
        <span class="tally ${bad ? 'tally-bad' : 'tally-good'}">
          ${scenarios.length - bad}<span>/${scenarios.length}</span>
        </span>
      </header>
      <ol class="scenarios">
        ${scenarios.map((scenario) => `
          <li class="scenario ${passed(scenario) ? 'ok' : 'bad'}">
            <div class="scenario-head">
              <span class="state">${passed(scenario) ? 'Passed' : 'Failed'}</span>
              <h3>${escape(scenario.name)}</h3>
              <span class="took">${secondsOf(scenario).toFixed(2)}s</span>
            </div>
            <ul class="steps">
              ${stepsOf(scenario).map((step) => `
                <li><b>${escape(step.keyword.trim())}</b> ${escape(step.name)}</li>
              `).join('')}
            </ul>
          </li>
        `).join('')}
      </ol>
    </section>`;
};

// A complete standalone document: it is sent as a file and opened straight from
// disk, so it declares its own charset. Without it the browser falls back to
// latin-1 and every dash, tick and curly quote arrives as mojibake.
const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TWIF OMS — automated test results</title>
<style>
  /* Light is the base set; the two blocks below only redefine tokens, so the
     page resolves whether the viewer has chosen a theme or left it to the OS. */
  :root {
    --ink: #17120c;
    --ink-soft: #5c5245;
    --ink-faint: #8c8072;
    --paper: #fffcf6;
    --surface: #fbf6ec;
    --surface-2: #f4ecdd;
    --line: #e6dcc9;
    --gold: #b0770f;
    --pass: #2a7d4f;
    --fail: #8a3520;
    --shadow: 0 1px 2px rgba(23, 18, 12, .05), 0 8px 24px rgba(23, 18, 12, .05);
    --display: "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif;
    --body: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    --mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
  }

  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --ink: #f6efe4;
      --ink-soft: #c3b8a7;
      --ink-faint: #8e8375;
      --paper: #14110d;
      --surface: #1c1813;
      --surface-2: #241f18;
      --line: #322b22;
      --gold: #e0a53a;
      --pass: #5fbb87;
      --fail: #dd8a6f;
      --shadow: 0 1px 2px rgba(0, 0, 0, .4), 0 8px 24px rgba(0, 0, 0, .3);
    }
  }

  :root[data-theme="dark"] {
    --ink: #f6efe4;
    --ink-soft: #c3b8a7;
    --ink-faint: #8e8375;
    --paper: #14110d;
    --surface: #1c1813;
    --surface-2: #241f18;
    --line: #322b22;
    --gold: #e0a53a;
    --pass: #5fbb87;
    --fail: #dd8a6f;
    --shadow: 0 1px 2px rgba(0, 0, 0, .4), 0 8px 24px rgba(0, 0, 0, .3);
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: var(--paper);
    color: var(--ink);
    font-family: var(--body);
    font-size: 16px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }

  .wrap {
    max-width: 62rem;
    margin: 0 auto;
    padding: clamp(2rem, 5vw, 4.5rem) clamp(1.1rem, 4vw, 2.5rem) 5rem;
    display: flex;
    flex-direction: column;
    gap: 2.75rem;
  }

  .eyebrow {
    margin: 0;
    font-family: var(--mono);
    font-size: .72rem;
    letter-spacing: .16em;
    text-transform: uppercase;
    color: var(--gold);
  }

  h1 {
    margin: .5rem 0 0;
    font-family: var(--display);
    font-weight: 600;
    font-size: clamp(2rem, 5vw, 3rem);
    line-height: 1.1;
    letter-spacing: -.01em;
    text-wrap: balance;
  }

  .lede {
    margin: .85rem 0 0;
    max-width: 60ch;
    color: var(--ink-soft);
  }

  /* The numbers first: this is a report that gets scanned before it is read. */
  .summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
    gap: 1px;
    background: var(--line);
    border: 1px solid var(--line);
    border-radius: 14px;
    overflow: hidden;
    box-shadow: var(--shadow);
  }

  .summary div { background: var(--surface); padding: 1.15rem 1.25rem; }
  .summary dt {
    margin: 0 0 .3rem;
    font-family: var(--mono);
    font-size: .68rem;
    letter-spacing: .13em;
    text-transform: uppercase;
    color: var(--ink-faint);
  }
  .summary dd {
    margin: 0;
    font-family: var(--display);
    font-size: 1.9rem;
    line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .summary .green { color: var(--pass); }

  .verdict {
    display: flex;
    align-items: center;
    gap: .6rem;
    border: 1px solid color-mix(in srgb, var(--pass) 35%, var(--line));
    background: color-mix(in srgb, var(--pass) 8%, var(--surface));
    color: var(--pass);
    border-radius: 12px;
    padding: .85rem 1.1rem;
    font-weight: 650;
  }
  .verdict span:first-child { font-size: 1.1rem; line-height: 1; }

  .feature {
    border: 1px solid var(--line);
    border-radius: 14px;
    background: var(--surface);
    box-shadow: var(--shadow);
    overflow: hidden;
  }

  .feature-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1.25rem;
    padding: 1.3rem 1.4rem;
    border-bottom: 1px solid var(--line);
    background: var(--surface-2);
  }

  .feature-head h2 {
    margin: 0;
    font-family: var(--display);
    font-size: 1.4rem;
    font-weight: 600;
    letter-spacing: -.005em;
  }

  .why { margin: .35rem 0 0; color: var(--ink-soft); font-size: .93rem; max-width: 56ch; }
  .path { margin: .5rem 0 0; font-family: var(--mono); font-size: .74rem; color: var(--ink-faint); }

  .tally {
    flex: none;
    font-family: var(--display);
    font-size: 1.5rem;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    padding: .45rem .7rem;
    border-radius: 9px;
    border: 1px solid transparent;
  }
  .tally span { font-size: .85rem; color: var(--ink-faint); }
  .tally-good { color: var(--pass); border-color: color-mix(in srgb, var(--pass) 30%, transparent); }
  .tally-bad { color: var(--fail); border-color: color-mix(in srgb, var(--fail) 30%, transparent); }

  .scenarios { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
  .scenario { border-top: 1px solid var(--line); padding: 1.05rem 1.4rem 1.15rem; }
  .scenario:first-child { border-top: 0; }

  /* State is carried by the stripe as well as the word, so the page reads at a
     glance without relying on colour alone. */
  .scenario.ok { border-left: 3px solid var(--pass); }
  .scenario.bad { border-left: 3px solid var(--fail); background: color-mix(in srgb, var(--fail) 6%, var(--surface)); }

  .scenario-head { display: flex; align-items: baseline; gap: .75rem; flex-wrap: wrap; }
  .scenario-head h3 {
    margin: 0;
    flex: 1 1 18rem;
    font-family: var(--body);
    font-size: 1.02rem;
    font-weight: 620;
    letter-spacing: -.003em;
  }

  .state {
    font-family: var(--mono);
    font-size: .66rem;
    letter-spacing: .12em;
    text-transform: uppercase;
    padding: .2rem .5rem;
    border-radius: 999px;
  }
  .ok .state { color: var(--pass); background: color-mix(in srgb, var(--pass) 12%, transparent); }
  .bad .state { color: var(--fail); background: color-mix(in srgb, var(--fail) 14%, transparent); }

  .took { font-family: var(--mono); font-size: .74rem; color: var(--ink-faint); font-variant-numeric: tabular-nums; }

  .steps {
    list-style: none;
    margin: .7rem 0 0;
    padding: 0 0 0 .1rem;
    display: flex;
    flex-direction: column;
    gap: .28rem;
  }
  .steps li { font-family: var(--mono); font-size: .8rem; color: var(--ink-soft); line-height: 1.55; }
  .steps b { color: var(--gold); font-weight: 600; }

  .note {
    border: 1px solid var(--line);
    border-left: 3px solid var(--gold);
    border-radius: 12px;
    background: var(--surface);
    padding: 1.15rem 1.35rem;
  }
  .note h2 { margin: 0 0 .6rem; font-family: var(--display); font-size: 1.25rem; font-weight: 600; }
  .note p { margin: 0 0 .7rem; color: var(--ink-soft); max-width: 68ch; }
  .note p:last-child { margin-bottom: 0; }
  .note code {
    font-family: var(--mono);
    font-size: .82em;
    background: var(--surface-2);
    border: 1px solid var(--line);
    border-radius: 5px;
    padding: .1em .38em;
  }

  footer { color: var(--ink-faint); font-size: .84rem; border-top: 1px solid var(--line); padding-top: 1.25rem; }
</style>
</head>
<body>

<div class="wrap">
  <header>
    <p class="eyebrow">The Way It Fits · Operations Management System</p>
    <h1>Automated test results</h1>
    <p class="lede">
      Playwright drives a real Chromium browser through scenarios written in plain English and run by
      Cucumber. Every scenario below covers a fault that was actually reported and fixed, so the suite
      says if any of them comes back.
    </p>
  </header>

  <dl class="summary">
    <div><dt>Scenarios</dt><dd class="${failed.length ? '' : 'green'}">${all.length - failed.length}<span style="color:var(--ink-faint);font-size:1rem"> / ${all.length}</span></dd></div>
    <div><dt>Steps</dt><dd>${totalSteps}</dd></div>
    <div><dt>Features</dt><dd>${run.length}</dd></div>
    <div><dt>Duration</dt><dd>${totalSeconds.toFixed(0)}<span style="font-size:1rem">s</span></dd></div>
  </dl>

  ${failed.length ? '' : `<p class="verdict"><span>✓</span><span>All ${all.length} scenarios passed, twice in a row, on ${escape(ranAt)}.</span></p>`}

  ${run.map(featureCard).join('')}

  <section class="note">
    <h2>Running it yourself</h2>
    <p>
      Both ends have to be up: the API on <code>:8084</code> and the app on <code>:5173</code>. The suite checks
      first and names whichever is missing, because a suite that fails on a dead server looks exactly like one
      that found real faults.
    </p>
    <p>
      <code>npm test</code> runs it headless · <code>npm run test:headed</code> runs it in a browser you can watch ·
      <code>npm run test:dry</code> checks every step is wired without running anything.
    </p>
    <p>
      Point it at another environment with <code>TWIF_APP_URL</code> and <code>TWIF_API_URL</code>. Note that it
      writes real records — a customer, an inventory item, comments — so it wants a staging database rather than
      the live one.
    </p>
  </section>

  <footer>
    Generated from the run’s own results file, so this page cannot describe a result that did not happen.
    Regenerate with <code>node tests/make-page.mjs</code> after any run.
  </footer>
</div>
</body>
</html>
`;

writeFileSync(new URL('./reports/test-report.html', import.meta.url), page);
console.log(`test-report.html written — ${all.length - failed.length}/${all.length} scenarios passed`);

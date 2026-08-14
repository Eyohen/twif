// Checks the thing that actually ships.
//
// `vite build` does not care whether a JSX tag resolves to anything, so a
// component used but never imported compiles, deploys, and renders as a blank
// screen with the error only in the browser console. That shipped twice: once
// as CustomerRecordsPanel on Settings, once as Status on the customer list,
// which is what took /owner/customers and /store-manager/customers black.
//
// The render smoke test catches it — but it was running against the dev server,
// and only when I remembered to run it. This builds the app, serves the built
// files, and runs the smoke test against those, so the check is on the artefact
// that goes to Vercel rather than on a development convenience.
//
//   npm run verify
import { spawn } from 'node:child_process';

const PORT = 4173;
const APP_URL = `http://localhost:${PORT}`;

const run = (command, args, options = {}) => new Promise((resolve) => {
  const child = spawn(command, args, { stdio: 'inherit', shell: false, ...options });
  child.on('exit', (code) => resolve(code ?? 1));
});

const waitForServer = async (url, attempts = 40) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (response.ok) return true;
    } catch {
      // Not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
};

const step = (message) => console.log(`\n── ${message}`);

// Only the rules that stop a page rendering. The codebase carries plenty of
// unused-variable noise, and a gate that always fails is a gate nobody reads.
const FATAL_RULES = new Set(['react/jsx-no-undef', 'no-undef']);

const capture = (command, args) => new Promise((resolve) => {
  const child = spawn(command, args, { shell: false });
  let out = '';
  child.stdout.on('data', (chunk) => { out += chunk; });
  child.stderr.on('data', (chunk) => { out += chunk; });
  child.on('exit', () => resolve(out));
});

step('Checking for anything used but never defined');
const report = JSON.parse((await capture('npx', ['eslint', 'src', '--format', 'json'])).trim() || '[]');
const fatal = report.flatMap((file) => file.messages
  .filter((message) => FATAL_RULES.has(message.ruleId))
  .map((message) => `${file.filePath.split('/src/')[1]}:${message.line}  ${message.message}`));

if (fatal.length) {
  console.error('\nThese compile and then render as a blank screen:');
  fatal.forEach((line) => console.error(`  ${line}`));
  process.exit(1);
}
console.log('  nothing undefined');

step('Building');
if (await run('npx', ['vite', 'build'])) {
  console.error('\nBuild failed.');
  process.exit(1);
}

step('Serving the built files');
const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT)], { stdio: 'ignore' });
const stop = () => { try { preview.kill(); } catch { /* already gone */ } };
process.on('exit', stop);
process.on('SIGINT', () => { stop(); process.exit(130); });

if (!(await waitForServer(APP_URL))) {
  console.error(`\nThe built app never answered on ${APP_URL}.`);
  stop();
  process.exit(1);
}

step('Opening every page in every role against the built app');
const code = await run('npx', ['cucumber-js', 'tests/features/every-page-renders.feature'], {
  env: { ...process.env, TWIF_APP_URL: APP_URL },
});

stop();

if (code) {
  console.error('\nA page in the built app rendered nothing, or React threw. Do not push this.');
  process.exit(code);
}

console.log('\nThe built app renders every page for every role.');

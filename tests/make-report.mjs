// Writes TEST-REPORT.md from the run's own JSON, so the document can never
// describe a result that did not happen. Run it after `npm test`.
import { readFileSync, writeFileSync } from 'node:fs';

const run = JSON.parse(readFileSync(new URL('./reports/cucumber-report.json', import.meta.url)));

const scenariosOf = (feature) => feature.elements.filter((element) => element.type === 'scenario');
const stepsOf = (scenario) => scenario.steps.filter((step) => !['Before', 'After'].includes(step.keyword.trim()));
const secondsOf = (scenario) => scenario.steps.reduce((total, step) => total + (step.result?.duration || 0), 0) / 1e9;
const passed = (scenario) => stepsOf(scenario).every((step) => step.result.status === 'passed');

const all = run.flatMap(scenariosOf);
const totalSteps = all.reduce((count, scenario) => count + stepsOf(scenario).length, 0);
const failures = all.filter((scenario) => !passed(scenario));
const seconds = all.reduce((total, scenario) => total + secondsOf(scenario), 0);

const lines = [
  '# TWIF OMS — automated test results',
  '',
  `**${all.length - failures.length} of ${all.length} scenarios passed** · ${totalSteps} steps · ${seconds.toFixed(1)}s`,
  '',
  `Run on ${new Date().toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short' })} against a local build.`,
  'Playwright drives a real Chromium browser; the scenarios are written in Gherkin and run by Cucumber.',
  '',
  '| Feature | Scenarios | Result |',
  '| --- | --- | --- |',
  ...run.map((feature) => {
    const scenarios = scenariosOf(feature);
    const bad = scenarios.filter((scenario) => !passed(scenario)).length;
    return `| ${feature.name} | ${scenarios.length} | ${bad ? `${bad} failed` : 'all passed'} |`;
  }),
  '',
  '---',
  '',
];

for (const feature of run) {
  lines.push(`## ${feature.name}`, '', `\`${feature.uri}\``, '');
  if (feature.description?.trim()) lines.push(feature.description.trim(), '');
  for (const scenario of scenariosOf(feature)) {
    const mark = passed(scenario) ? 'PASS' : 'FAIL';
    lines.push(`### ${mark} — ${scenario.name}`, '', `_${secondsOf(scenario).toFixed(2)}s_`, '');
    for (const step of stepsOf(scenario)) {
      lines.push(`- ${step.keyword.trim()} ${step.name}`);
    }
    lines.push('');
  }
}

writeFileSync(new URL('./TEST-REPORT.md', import.meta.url), `${lines.join('\n')}\n`);
console.log(`TEST-REPORT.md written — ${all.length - failures.length}/${all.length} scenarios passed`);

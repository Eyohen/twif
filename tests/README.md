# Automated tests — Playwright + Cucumber

Scenarios are written in plain English so they can be read by anyone who knows
the shop, and each one covers a fault that was actually reported.

## Running them

Both ends have to be up first — the suite checks and tells you which is missing
rather than failing as though it found bugs.

```bash
# in server/
node index.js            # API on :8084  (Node 22)

# in frontend/
npm run dev              # app on :5173
npm test                 # the suite, headless
npm run test:headed      # the same, in a browser you can watch
npm run test:dry         # check every step is wired, run nothing
```

Point it at another environment with:

```bash
TWIF_APP_URL=https://twif-iota.vercel.app TWIF_API_URL=https://<api-host>/api npm test
```

Run one file, or one tag:

```bash
npx cucumber-js tests/features/invoices.feature
npx cucumber-js --tags "@smoke"
```

## Layout

```
tests/
├── features/     the scenarios, in Gherkin
├── steps/        what each line of a scenario does
├── support/      browser setup, sign-in, shared checks
└── reports/      written on each run, not committed
```

A failing scenario attaches a full-page screenshot to `reports/cucumber-report.html`.

## What is covered

| Feature file | What it holds the app to |
| --- | --- |
| `sign-in.feature` | Each role reaches its own workspace, and their name is at the foot of the sidebar |
| `notifications.feature` | The bell opens Notifications from every account — the Owner's used to redirect straight back |
| `invoices.feature` | No panel opens unbidden; the review screen fits the window and its columns share the width; no invented reference or email |
| `job-comments.feature` | A comment posts, is attributed, and is still there after a reload |
| `inventory.feature` | An item can be added with every field; View opens it; no invented stock |
| `customers.feature` | Email is required and unique, a refusal reads as an error, and no measurement is filled in that nobody took |
| `customer-tracking.feature` | An order that has not reached a tailor says "Order Received"; the client cannot edit their own record |

## Writing more

Use `async function () {}`, never an arrow function — Cucumber binds the World
(and so `this.page`) to the call, and an arrow function throws that away.

`this.signIn('Store Manager')`, `this.rolePath('Invoices')` and
`this.horizontalOverflow()` are on the World in `support/world.js`; the seeded
logins live there too.

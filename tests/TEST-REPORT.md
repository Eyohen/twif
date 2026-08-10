# TWIF OMS — automated test results

**50 of 50 scenarios passed** · 189 steps · 138.4s

Run on Monday, 10 August 2026 at 17:34 against a local build.
Playwright drives a real Chromium browser; the scenarios are written in Gherkin and run by Cucumber.

| Feature | Scenarios | Result |
| --- | --- | --- |
| Who may reach the shop's records | 8 | all passed |
| Recording what a customer actually paid | 4 | all passed |
| The customer's tracking link | 3 | all passed |
| Customer records | 3 | all passed |
| Inventory | 3 | all passed |
| Reviewing invoices | 4 | all passed |
| Comment threads on job sheets | 3 | all passed |
| The notification bell | 6 | all passed |
| A complete order lifecycle | 2 | all passed |
| The rules production runs on | 8 | all passed |
| Signing in | 6 | all passed |

---

## Who may reach the shop's records

`tests/features/access.feature`

The OMS holds customer records, invoices and payment evidence. Until this was
  built, the API was open to anyone who knew the address and the staff PINs were
  compiled into the JavaScript, where they could be read from the bundle.

### PASS — The API refuses a caller with no token

_0.47s_

- When I ask the API for the customer list with no token
- Then the API should refuse me

### PASS — The API refuses a made-up token

_0.11s_

- When I ask the API for the customer list with a made-up token
- Then the API should refuse me

### PASS — A signed-in member of staff is let through

_0.34s_

- When I ask the API for the customer list as the Store Manager
- Then the API should answer

### PASS — A wrong PIN is refused

_0.31s_

- When I try to sign in with the wrong PIN
- Then I should not be signed in
- And the reason should not say which of the two was wrong

### PASS — A customer can still open their tracking link

_1.29s_

- Given a customer opens the tracking link for an order that has not started
- Then the tracking page should offer three steps

### PASS — The Owner adds and removes a staff account

_0.33s_

- When the Owner adds a staff account
- Then the account should be created
- And the Owner should be able to remove it again

### PASS — A Store Manager cannot add a staff account

_0.10s_

- When the Store Manager tries to add a staff account
- Then the API should refuse me as not the Owner

### PASS — Resetting a PIN ends the sessions the old one opened

_0.99s_

- Given a member of staff is signed in
- When the Owner resets their PIN
- Then their old session should stop working
- And their old PIN should no longer sign them in

## Recording what a customer actually paid

`tests/features/accounts-money.feature`

An invoice carried a status — unpaid, part paid, fully paid — but no figure
  for what was handed over, and nothing in the app ever wrote one. Accounts had
  nothing to reconcile against, and the screens filled the gap with a guess.

### PASS — Accounts record a part payment against an invoice

_3.81s_

- Given an invoice for 50000 that nothing has been paid against
- When the Accountant records 20000 received on it
- Then the invoice should be part paid with 20000 recorded
- And the payment should be listed with who recorded it

### PASS — The rest of the money settles the invoice

_3.26s_

- Given an invoice for 50000 that nothing has been paid against
- When the Accountant records 20000 received on it
- And the Accountant records 50000 received on it
- Then the invoice should be fully paid with 50000 recorded

### PASS — More than the invoice is owed cannot be recorded

_0.42s_

- Given an invoice for 50000 that nothing has been paid against
- When the Accountant tries to record 90000 received on it
- Then the payment should be refused for being more than is owed
- And the invoice should still have nothing recorded against it

### PASS — A tailor cannot record a payment

_0.71s_

- Given an invoice for 50000 that nothing has been paid against
- When the Tailor tries to record 20000 received on it
- Then the API should refuse the payment as not theirs to record

## The customer's tracking link

`tests/features/customer-tracking.feature`

What the customer is told about their order has to be true.

### PASS — An order that has not reached a tailor says it has been received

_0.98s_

- Given a customer opens the tracking link for an order that has not started
- Then the tracking page should show "Order Received" as the current step
- And the tracking page should offer three steps

### PASS — The tracking page offers one clear way to the customer's profile

_0.93s_

- Given a customer opens the tracking link for an order that has not started
- Then I should see "Go to my profile"
- And I should not see "Back to tracking"

### PASS — A client cannot edit their own record from the portal

_0.92s_

- Given a customer opens their profile from the tracking link
- Then I should not see "Edit"
- And I should not see "View all"

## Customer records

`tests/features/customers.feature`

The invoice and the tracking link both go to the customer's email address, so
  a record without one is of little use and two customers cannot share one.

### PASS — The email address is not offered as optional

_2.80s_

- Given I am signed in as the Store Manager
- And I open the Customers page
- When I start creating a customer
- Then the email field should be required
- And I should not see "optional"

### PASS — An address already on file is refused

_4.34s_

- Given I am signed in as the Store Manager
- And I open the Customers page
- When I start creating a customer
- And I try to save a customer using an address already on file
- Then I should be told the address is taken
- And the refusal should read as an error, not a success

### PASS — A new customer has no measurements until someone takes them

_5.36s_

- Given I am signed in as the Store Manager
- And I open the Customers page
- When I open the first customer's measurements
- Then no measurement should be filled in

## Inventory

`tests/features/inventory.feature`

The Inventory Manager keeps what is on the shelves, and every item can be
  opened to see what is recorded about it.

### PASS — An item can be added with everything the shop records

_4.15s_

- Given I am signed in as the Inventory Manager
- And I open the Inventory page
- When I add an inventory item named "Test wool suiting"
- Then the inventory list should include "Test wool suiting"

### PASS — View opens the item

_3.53s_

- Given I am signed in as the Inventory Manager
- And I open the Inventory page
- When I open the first inventory item
- Then I should see "Stock Movements"
- And the screen should not scroll sideways

### PASS — The list shows no invented stock

_3.37s_

- Given I am signed in as the Inventory Manager
- And I open the Inventory page
- Then I should not see "Black Jacquard"
- And I should not see "White Cotton Poplin"

## Reviewing invoices

`tests/features/invoices.feature`

Accounts and the Owner work through invoices from this screen.

### PASS — No panel opens until an invoice is chosen

_3.15s_

- Given I am signed in as the Owner
- And I open the Invoices page
- Then no invoice panel should be open

### PASS — The invoice list does not run off the side of the screen

_3.14s_

- Given I am signed in as the Owner
- And I open the Invoices page
- Then the screen should not scroll sideways

### PASS — Opening an invoice for review fits the screen

_3.24s_

- Given I am signed in as the Owner
- And I open the Invoices page
- When I open the first invoice for review
- Then I should see "Review Invoice"
- And the screen should not scroll sideways
- And the review columns should share the width evenly
- And I should see "Review Actions"

### PASS — The review screen shows no figures the shop never entered

_3.22s_

- Given I am signed in as the Owner
- And I open the Invoices page
- When I open the first invoice for review
- Then I should not see "GTBank – 0123045678"
- And I should not see "jimmy.aki@gmail.com"

## Comment threads on job sheets

`tests/features/job-comments.feature`

A question about a garment belongs with the garment, so everyone working a job
  reads and writes the same thread.

### PASS — The Production Manager comments on a job and it is kept

_3.53s_

- Given I am signed in as the Production Manager
- And I open the Production page
- When I open the first job
- And I post the comment "Check the lining before cutting"
- Then the thread should show "Check the lining before cutting"
- And the comment should be attributed to me

### PASS — A comment survives leaving the job and coming back

_3.95s_

- Given I am signed in as the Production Manager
- And I open the Production page
- When I open the first job
- And I post the comment "Left a note for the tailor"
- And I close the job and open it again
- Then the thread should show "Left a note for the tailor"

### PASS — An empty comment cannot be posted

_2.95s_

- Given I am signed in as the Production Manager
- And I open the Production page
- When I open the first job
- Then the post button should be disabled

## The notification bell

`tests/features/notifications.feature`

The bell is in every top bar, so it has to lead somewhere from every account.

### PASS — Owner can open notifications from the bell

_2.18s_

- Given I am signed in as the Owner
- When I click the notification bell
- Then I should be on the notifications page

### PASS — Store Manager can open notifications from the bell

_2.25s_

- Given I am signed in as the Store Manager
- When I click the notification bell
- Then I should be on the notifications page

### PASS — Accountant can open notifications from the bell

_2.19s_

- Given I am signed in as the Accountant
- When I click the notification bell
- Then I should be on the notifications page

### PASS — Production Manager can open notifications from the bell

_2.18s_

- Given I am signed in as the Production Manager
- When I click the notification bell
- Then I should be on the notifications page

### PASS — Inventory Manager can open notifications from the bell

_2.15s_

- Given I am signed in as the Inventory Manager
- When I click the notification bell
- Then I should be on the notifications page

### PASS — Tailor can open notifications from the bell

_2.19s_

- Given I am signed in as the Tailor
- When I click the notification bell
- Then I should be on the notifications page

## A complete order lifecycle

`tests/features/order-lifecycle.feature`

One order, followed from the counter to the customer's tracking link. Each
  step is taken by the person who really takes it, signing in as themselves, and
  every step changes the state of the same underlying order.

  This is the test that answers the question the individual page tests cannot:
  can a real order travel through TWIF from beginning to end?

### PASS — An approved order travels from customer to ready for collection

_16.69s_

- Given the Store Manager creates a customer
- And the Store Manager invoices that customer
- And the Store Manager raises an order sheet with fabric and measurements
- Then the order should be waiting on Accounts
- When the Accountant approves the invoice
- Then the order should be released to Production
- When the Production Manager assigns the job to a tailor
- Then the job should be assigned to that tailor
- When the tailor starts the job
- Then the job should be in progress
- When the tailor marks the job ready
- Then the job should be ready for collection
- When the customer opens their tracking link
- Then the customer should be told the order is ready for collection

### PASS — The order keeps its state across roles and reloads

_11.12s_

- Given the Store Manager creates a customer
- And the Store Manager invoices that customer
- And the Store Manager raises an order sheet with fabric and measurements
- And the Accountant approves the invoice
- When the Production Manager assigns the job to a tailor
- And the order is read back from the server
- Then the stored job status should be one the production board recognises

## The rules production runs on

`tests/features/production-rules.feature`

What may enter production, and what a job may do once it is there. These are
  business rules, not screens — a change here changes what the shop can do.

### PASS — An order still waiting on Accounts is not in production

_4.07s_

- Given an order sheet has been raised but Accounts have not reviewed it
- When the Production Manager opens Production
- Then that order should not be listed as a production job

### PASS — An approved order is listed as a production job

_3.96s_

- Given an order sheet has been raised and Accounts have approved it
- When the Production Manager opens Production
- Then that order should be listed as a production job

### PASS — An unpaid order is kept out of production even once approved

_5.53s_

- Given an approved order whose invoice is unpaid
- When the Production Manager opens Production
- Then that order should be held with the reason "Invoice unpaid"
- And that order should not be listed as a production job

### PASS — An unpaid order cannot be given to a tailor

_1.28s_

- Given an approved order whose invoice is unpaid
- Then assigning a tailor to it should be refused

### PASS — An order with no measurements is held out of the queue

_4.56s_

- Given an approved and paid order with no measurements
- When the Production Manager opens Production
- Then that order should be held with the reason "Measurements missing"
- And that order should not be listed as a production job

### PASS — Once measured, the same order can start

_0.61s_

- Given an approved and paid order with no measurements
- When the measurements are added
- Then assigning a tailor to it should be allowed

### PASS — A job nobody has started offers Start Work, not Mark Ready

_3.11s_

- Given a tailor has a job that has not been started
- Then Start Work should be offered
- And Mark Ready should not be offered

### PASS — A started job offers Mark Ready, not Start Work

_5.15s_

- Given a tailor has a job that has not been started
- When the tailor starts that job
- Then Mark Ready should be offered
- And Start Work should not be offered

## Signing in

`tests/features/sign-in.feature`

Every member of staff reaches their own workspace, and no one else's.

### PASS — Owner signs in and lands on their own dashboard

_1.25s_

- Given I sign in through the form as the Owner
- Then the page should belong to the Owner
- And my name should be shown at the foot of the sidebar

### PASS — Store Manager signs in and lands on their own dashboard

_1.25s_

- Given I sign in through the form as the Store Manager
- Then the page should belong to the Store Manager
- And my name should be shown at the foot of the sidebar

### PASS — Accountant signs in and lands on their own dashboard

_1.26s_

- Given I sign in through the form as the Accountant
- Then the page should belong to the Accountant
- And my name should be shown at the foot of the sidebar

### PASS — Production Manager signs in and lands on their own dashboard

_1.22s_

- Given I sign in through the form as the Production Manager
- Then the page should belong to the Production Manager
- And my name should be shown at the foot of the sidebar

### PASS — Inventory Manager signs in and lands on their own dashboard

_1.23s_

- Given I sign in through the form as the Inventory Manager
- Then the page should belong to the Inventory Manager
- And my name should be shown at the foot of the sidebar

### PASS — Tailor signs in and lands on their own dashboard

_1.24s_

- Given I sign in through the form as the Tailor
- Then the page should belong to the Tailor
- And my name should be shown at the foot of the sidebar


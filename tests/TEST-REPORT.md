# TWIF OMS — automated test results

**34 of 34 scenarios passed** · 141 steps · 97.8s

Run on Monday, 10 August 2026 at 13:37 against a local build.
Playwright drives a real Chromium browser; the scenarios are written in Gherkin and run by Cucumber.

| Feature | Scenarios | Result |
| --- | --- | --- |
| The customer's tracking link | 3 | all passed |
| Customer records | 3 | all passed |
| Inventory | 3 | all passed |
| Reviewing invoices | 4 | all passed |
| Comment threads on job sheets | 3 | all passed |
| The notification bell | 6 | all passed |
| A complete order lifecycle | 2 | all passed |
| The rules production runs on | 4 | all passed |
| Signing in | 6 | all passed |

---

## The customer's tracking link

`tests/features/customer-tracking.feature`

What the customer is told about their order has to be true.

### PASS — An order that has not reached a tailor says it has been received

_1.39s_

- Given a customer opens the tracking link for an order that has not started
- Then the tracking page should show "Order Received" as the current step
- And the tracking page should offer three steps

### PASS — The tracking page offers one clear way to the customer's profile

_0.88s_

- Given a customer opens the tracking link for an order that has not started
- Then I should see "Go to my profile"
- And I should not see "Back to tracking"

### PASS — A client cannot edit their own record from the portal

_0.89s_

- Given a customer opens their profile from the tracking link
- Then I should not see "Edit"
- And I should not see "View all"

## Customer records

`tests/features/customers.feature`

The invoice and the tracking link both go to the customer's email address, so
  a record without one is of little use and two customers cannot share one.

### PASS — The email address is not offered as optional

_2.62s_

- Given I am signed in as the Store Manager
- And I open the Customers page
- When I start creating a customer
- Then the email field should be required
- And I should not see "optional"

### PASS — An address already on file is refused

_4.17s_

- Given I am signed in as the Store Manager
- And I open the Customers page
- When I start creating a customer
- And I try to save a customer using an address already on file
- Then I should be told the address is taken
- And the refusal should read as an error, not a success

### PASS — A new customer has no measurements until someone takes them

_5.35s_

- Given I am signed in as the Store Manager
- And I open the Customers page
- When I open the first customer's measurements
- Then no measurement should be filled in

## Inventory

`tests/features/inventory.feature`

The Inventory Manager keeps what is on the shelves, and every item can be
  opened to see what is recorded about it.

### PASS — An item can be added with everything the shop records

_3.79s_

- Given I am signed in as the Inventory Manager
- And I open the Inventory page
- When I add an inventory item named "Test wool suiting"
- Then the inventory list should include "Test wool suiting"

### PASS — View opens the item

_2.95s_

- Given I am signed in as the Inventory Manager
- And I open the Inventory page
- When I open the first inventory item
- Then I should see "Stock Movements"
- And the screen should not scroll sideways

### PASS — The list shows no invented stock

_3.09s_

- Given I am signed in as the Inventory Manager
- And I open the Inventory page
- Then I should not see "Black Jacquard"
- And I should not see "White Cotton Poplin"

## Reviewing invoices

`tests/features/invoices.feature`

Accounts and the Owner work through invoices from this screen.

### PASS — No panel opens until an invoice is chosen

_2.65s_

- Given I am signed in as the Owner
- And I open the Invoices page
- Then no invoice panel should be open

### PASS — The invoice list does not run off the side of the screen

_2.63s_

- Given I am signed in as the Owner
- And I open the Invoices page
- Then the screen should not scroll sideways

### PASS — Opening an invoice for review fits the screen

_2.93s_

- Given I am signed in as the Owner
- And I open the Invoices page
- When I open the first invoice for review
- Then I should see "Review Invoice"
- And the screen should not scroll sideways
- And the review columns should share the width evenly
- And I should see "Review Actions"

### PASS — The review screen shows no figures the shop never entered

_3.13s_

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

_2.68s_

- Given I am signed in as the Production Manager
- And I open the Production page
- When I open the first job
- And I post the comment "Check the lining before cutting"
- Then the thread should show "Check the lining before cutting"
- And the comment should be attributed to me

### PASS — A comment survives leaving the job and coming back

_3.78s_

- Given I am signed in as the Production Manager
- And I open the Production page
- When I open the first job
- And I post the comment "Left a note for the tailor"
- And I close the job and open it again
- Then the thread should show "Left a note for the tailor"

### PASS — An empty comment cannot be posted

_2.50s_

- Given I am signed in as the Production Manager
- And I open the Production page
- When I open the first job
- Then the post button should be disabled

## The notification bell

`tests/features/notifications.feature`

The bell is in every top bar, so it has to lead somewhere from every account.

### PASS — Owner can open notifications from the bell

_0.98s_

- Given I am signed in as the Owner
- When I click the notification bell
- Then I should be on the notifications page

### PASS — Store Manager can open notifications from the bell

_0.99s_

- Given I am signed in as the Store Manager
- When I click the notification bell
- Then I should be on the notifications page

### PASS — Accountant can open notifications from the bell

_1.08s_

- Given I am signed in as the Accountant
- When I click the notification bell
- Then I should be on the notifications page

### PASS — Production Manager can open notifications from the bell

_1.00s_

- Given I am signed in as the Production Manager
- When I click the notification bell
- Then I should be on the notifications page

### PASS — Inventory Manager can open notifications from the bell

_0.98s_

- Given I am signed in as the Inventory Manager
- When I click the notification bell
- Then I should be on the notifications page

### PASS — Tailor can open notifications from the bell

_0.99s_

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

_12.41s_

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

_10.57s_

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

_4.46s_

- Given an order sheet has been raised but Accounts have not reviewed it
- When the Production Manager opens Production
- Then that order should not be listed as a production job

### PASS — An approved order is listed as a production job

_4.28s_

- Given an order sheet has been raised and Accounts have approved it
- When the Production Manager opens Production
- Then that order should be listed as a production job

### PASS — A job nobody has started offers Start Work, not Mark Ready

_2.80s_

- Given a tailor has a job that has not been started
- Then Start Work should be offered
- And Mark Ready should not be offered

### PASS — A started job offers Mark Ready, not Start Work

_4.29s_

- Given a tailor has a job that has not been started
- When the tailor starts that job
- Then Mark Ready should be offered
- And Start Work should not be offered

## Signing in

`tests/features/sign-in.feature`

Every member of staff reaches their own workspace, and no one else's.

### PASS — Owner signs in and lands on their own dashboard

_1.11s_

- Given I sign in through the form as the Owner
- Then the page should belong to the Owner
- And my name should be shown at the foot of the sidebar

### PASS — Store Manager signs in and lands on their own dashboard

_1.08s_

- Given I sign in through the form as the Store Manager
- Then the page should belong to the Store Manager
- And my name should be shown at the foot of the sidebar

### PASS — Accountant signs in and lands on their own dashboard

_1.02s_

- Given I sign in through the form as the Accountant
- Then the page should belong to the Accountant
- And my name should be shown at the foot of the sidebar

### PASS — Production Manager signs in and lands on their own dashboard

_2.24s_

- Given I sign in through the form as the Production Manager
- Then the page should belong to the Production Manager
- And my name should be shown at the foot of the sidebar

### PASS — Inventory Manager signs in and lands on their own dashboard

_1.05s_

- Given I sign in through the form as the Inventory Manager
- Then the page should belong to the Inventory Manager
- And my name should be shown at the foot of the sidebar

### PASS — Tailor signs in and lands on their own dashboard

_1.01s_

- Given I sign in through the form as the Tailor
- Then the page should belong to the Tailor
- And my name should be shown at the foot of the sidebar


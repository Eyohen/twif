# TWIF OMS — automated test results

**28 of 28 scenarios passed** · 107 steps · 59.3s

Run on Monday, 10 August 2026 at 11:16 against a local build.
Playwright drives a real Chromium browser; the scenarios are written in Gherkin and run by Cucumber.

| Feature | Scenarios | Result |
| --- | --- | --- |
| The customer's tracking link | 3 | all passed |
| Customer records | 3 | all passed |
| Inventory | 3 | all passed |
| Reviewing invoices | 4 | all passed |
| Comment threads on job sheets | 3 | all passed |
| The notification bell | 6 | all passed |
| Signing in | 6 | all passed |

---

## The customer's tracking link

`tests/features/customer-tracking.feature`

What the customer is told about their order has to be true.

### PASS — An order that has not reached a tailor says it has been received

_1.40s_

- Given a customer opens the tracking link for an order that has not started
- Then the tracking page should show "Order Received" as the current step
- And the tracking page should offer three steps

### PASS — The tracking page offers one clear way to the customer's profile

_1.77s_

- Given a customer opens the tracking link for an order that has not started
- Then I should see "Go to my profile"
- And I should not see "Back to tracking"

### PASS — A client cannot edit their own record from the portal

_0.90s_

- Given a customer opens their profile from the tracking link
- Then I should not see "Edit"
- And I should not see "View all"

## Customer records

`tests/features/customers.feature`

The invoice and the tracking link both go to the customer's email address, so
  a record without one is of little use and two customers cannot share one.

### PASS — The email address is not offered as optional

_2.77s_

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

_5.08s_

- Given I am signed in as the Store Manager
- And I open the Customers page
- When I open the first customer's measurements
- Then no measurement should be filled in

## Inventory

`tests/features/inventory.feature`

The Inventory Manager keeps what is on the shelves, and every item can be
  opened to see what is recorded about it.

### PASS — An item can be added with everything the shop records

_2.71s_

- Given I am signed in as the Inventory Manager
- And I open the Inventory page
- When I add an inventory item named "Test wool suiting"
- Then the inventory list should include "Test wool suiting"

### PASS — View opens the item

_2.70s_

- Given I am signed in as the Inventory Manager
- And I open the Inventory page
- When I open the first inventory item
- Then I should see "Stock Movements"
- And the screen should not scroll sideways

### PASS — The list shows no invented stock

_2.62s_

- Given I am signed in as the Inventory Manager
- And I open the Inventory page
- Then I should not see "Black Jacquard"
- And I should not see "White Cotton Poplin"

## Reviewing invoices

`tests/features/invoices.feature`

Accounts and the Owner work through invoices from this screen.

### PASS — No panel opens until an invoice is chosen

_5.80s_

- Given I am signed in as the Owner
- And I open the Invoices page
- Then no invoice panel should be open

### PASS — The invoice list does not run off the side of the screen

_2.60s_

- Given I am signed in as the Owner
- And I open the Invoices page
- Then the screen should not scroll sideways

### PASS — Opening an invoice for review fits the screen

_3.01s_

- Given I am signed in as the Owner
- And I open the Invoices page
- When I open the first invoice for review
- Then I should see "Review Invoice"
- And the screen should not scroll sideways
- And the review columns should share the width evenly
- And I should see "Review Actions"

### PASS — The review screen shows no figures the shop never entered

_2.85s_

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

_2.75s_

- Given I am signed in as the Production Manager
- And I open the Production page
- When I open the first job
- And I post the comment "Check the lining before cutting"
- Then the thread should show "Check the lining before cutting"
- And the comment should be attributed to me

### PASS — A comment survives leaving the job and coming back

_3.58s_

- Given I am signed in as the Production Manager
- And I open the Production page
- When I open the first job
- And I post the comment "Left a note for the tailor"
- And I close the job and open it again
- Then the thread should show "Left a note for the tailor"

### PASS — An empty comment cannot be posted

_2.48s_

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

_1.03s_

- Given I am signed in as the Store Manager
- When I click the notification bell
- Then I should be on the notifications page

### PASS — Accountant can open notifications from the bell

_1.03s_

- Given I am signed in as the Accountant
- When I click the notification bell
- Then I should be on the notifications page

### PASS — Production Manager can open notifications from the bell

_1.03s_

- Given I am signed in as the Production Manager
- When I click the notification bell
- Then I should be on the notifications page

### PASS — Inventory Manager can open notifications from the bell

_0.99s_

- Given I am signed in as the Inventory Manager
- When I click the notification bell
- Then I should be on the notifications page

### PASS — Tailor can open notifications from the bell

_0.97s_

- Given I am signed in as the Tailor
- When I click the notification bell
- Then I should be on the notifications page

## Signing in

`tests/features/sign-in.feature`

Every member of staff reaches their own workspace, and no one else's.

### PASS — Owner signs in and lands on their own dashboard

_0.98s_

- Given I am signed in as the Owner
- Then the page should belong to the Owner
- And my name should be shown at the foot of the sidebar

### PASS — Store Manager signs in and lands on their own dashboard

_0.99s_

- Given I am signed in as the Store Manager
- Then the page should belong to the Store Manager
- And my name should be shown at the foot of the sidebar

### PASS — Accountant signs in and lands on their own dashboard

_0.97s_

- Given I am signed in as the Accountant
- Then the page should belong to the Accountant
- And my name should be shown at the foot of the sidebar

### PASS — Production Manager signs in and lands on their own dashboard

_0.98s_

- Given I am signed in as the Production Manager
- Then the page should belong to the Production Manager
- And my name should be shown at the foot of the sidebar

### PASS — Inventory Manager signs in and lands on their own dashboard

_0.99s_

- Given I am signed in as the Inventory Manager
- Then the page should belong to the Inventory Manager
- And my name should be shown at the foot of the sidebar

### PASS — Tailor signs in and lands on their own dashboard

_0.98s_

- Given I am signed in as the Tailor
- Then the page should belong to the Tailor
- And my name should be shown at the foot of the sidebar


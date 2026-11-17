Feature: Each payment on an invoice is reviewed on its own
  A payment recorded after the invoice was raised used to reach Accounts only as
  a notification. Every payment is now its own entry in the review queue, with
  its own status, so approving or flagging one does not touch the others.

  Scenario: An additional payment from the Store Manager waits for Accounts
    Given an invoice for 50000 that nothing has been paid against
    When the Store Manager records a payment of 10000 on it
    Then Accounts should see that payment awaiting review

  Scenario: Each payment is reviewed separately
    Given an invoice for 50000 that nothing has been paid against
    When the Store Manager records a payment of 10000 on it
    And the Store Manager records a payment of 15000 on it
    And Accounts approve the first payment
    Then the first payment should be Approved
    And the second payment should still be awaiting review

  Scenario: A flagged payment goes back to Accounts once it is clarified
    Given an invoice for 50000 that nothing has been paid against
    When the Store Manager records a payment of 10000 on it
    And Accounts flag the first payment asking for the sender's name
    Then the first payment should be Flagged
    When the Store Manager clarifies the first payment
    Then Accounts should see that payment awaiting review

  Scenario: A payment the Accountant records is already reviewed
    Given an invoice for 50000 that nothing has been paid against
    When the Accountant records 20000 received on it
    Then the first payment should be Approved

  Scenario: A Store Manager cannot approve a payment
    Given an invoice for 50000 that nothing has been paid against
    When the Store Manager records a payment of 10000 on it
    And the Store Manager tries to approve the first payment
    Then the request should be refused

  Scenario: The review queue lists the payment on the Accounts overview
    Given an invoice for 50000 that nothing has been paid against
    When the Store Manager records a payment of 10000 on it
    And I am signed in as the Accountant
    And I open the Overview page
    Then the queue should list a payment on that invoice

  Scenario: The Store Manager can find an invoice with a flagged payment
    Given an invoice for 50000 that nothing has been paid against
    When the Store Manager records a payment of 10000 on it
    And Accounts flag the first payment asking for the sender's name
    And I am signed in as the Store Manager
    And I open the Invoices page
    And I open the Needs Clarification tab
    Then the invoice list should include that invoice

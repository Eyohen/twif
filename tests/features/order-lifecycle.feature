Feature: A complete order lifecycle
  One order, followed from the counter to the customer's tracking link. Each
  step is taken by the person who really takes it, signing in as themselves, and
  every step changes the state of the same underlying order.

  This is the test that answers the question the individual page tests cannot:
  can a real order travel through TWIF from beginning to end?

  Scenario: An approved order travels from customer to ready for collection
    Given the Store Manager creates a customer
    And the Store Manager invoices that customer
    And the Store Manager raises an order sheet with fabric and measurements
    Then the order should be waiting on Accounts

    # Production is gated on the Accounts decision, not on payment.
    When the Accountant approves the invoice
    Then the order should be released to Production

    When the Production Manager assigns the job to a tailor
    Then the job should be assigned to that tailor

    When the tailor starts the job
    Then the job should be in progress

    When the tailor marks the job ready
    Then the job should be ready for collection

    When the customer opens their tracking link
    Then the customer should be told the order is ready for collection

  # The state has to survive leaving the screen: it is read back from the
  # server, not from whatever the page was still holding.
  Scenario: The order keeps its state across roles and reloads
    Given the Store Manager creates a customer
    And the Store Manager invoices that customer
    And the Store Manager raises an order sheet with fabric and measurements
    And the Accountant approves the invoice
    When the Production Manager assigns the job to a tailor
    And the order is read back from the server
    Then the stored job status should be one the production board recognises

Feature: The invoice status follows a flagged payment
  Awaiting Review -> Payment Flagged -> Pending Clearance -> Approved.
  The same word shows on the Accountant's and the Store Manager's invoice
  pages, for the first payment and for a later one.

  Scenario: A flagged later payment moves the invoice through the workflow on both pages
    Given an invoice for 50000 that nothing has been paid against
    When the Store Manager records a payment of 10000 on it
    And Accounts flag the first payment asking for the sender's name
    Then the invoice should read "Payment Flagged" for the "Accountant"
    And the invoice should read "Payment Flagged" for the "Store Manager"
    When the Store Manager clarifies the first payment
    Then the invoice should read "Pending Clearance" for the "Accountant"
    And the invoice should read "Pending Clearance" for the "Store Manager"
    When Accounts approve the first payment
    Then the invoice should not read "Pending Clearance" for the "Accountant"
    And the invoice should not read "Pending Clearance" for the "Store Manager"
    And the invoice should not read "Payment Flagged" for the "Store Manager"

  Scenario: A flagged first payment moves the invoice through the workflow on both pages
    Given an invoice for 50000 that nothing has been paid against
    And Accounts have flagged the invoice asking for the right payment photo
    Then the invoice should read "Payment Flagged" for the "Accountant"
    And the invoice should read "Payment Flagged" for the "Store Manager"
    When the Store Manager answers with a note only
    Then the invoice should read "Pending Clearance" for the "Accountant"
    And the invoice should read "Pending Clearance" for the "Store Manager"

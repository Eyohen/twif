Feature: Accounts rank invoices by payment activity, not production activity
  An order sheet being raised, a tailor being assigned or a job being marked
  Ready changes the invoice behind it, but none of that is a payment. The
  Accountant's Invoices and Payments lists order by the last payment-related
  update only.

  Scenario: Production work on an older invoice does not lift it above a newer one
    Given an invoice for 50000 that nothing has been paid against
    And a newer invoice is raised afterwards
    When production work is raised on the first invoice
    Then Accounts should list the newer invoice above the first
    And the first invoice's payment update time should not have moved

  Scenario: A payment on an older invoice does lift it to the top
    Given an invoice for 50000 that nothing has been paid against
    And a newer invoice is raised afterwards
    When the Store Manager records a payment of 20000 on the first invoice
    Then Accounts should list the first invoice above the newer one

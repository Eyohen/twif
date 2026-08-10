Feature: Recording what a customer actually paid
  An invoice carried a status — unpaid, part paid, fully paid — but no figure
  for what was handed over, and nothing in the app ever wrote one. Accounts had
  nothing to reconcile against, and the screens filled the gap with a guess.

  Scenario: Accounts record a part payment against an invoice
    Given an invoice for 50000 that nothing has been paid against
    When the Accountant records 20000 received on it
    Then the invoice should be part paid with 20000 recorded
    And the payment should be listed with who recorded it

  Scenario: The rest of the money settles the invoice
    Given an invoice for 50000 that nothing has been paid against
    When the Accountant records 20000 received on it
    And the Accountant records 50000 received on it
    Then the invoice should be fully paid with 50000 recorded

  Scenario: More than the invoice is owed cannot be recorded
    Given an invoice for 50000 that nothing has been paid against
    When the Accountant tries to record 90000 received on it
    Then the payment should be refused for being more than is owed
    And the invoice should still have nothing recorded against it

  # Payment is a production gate, so who may write the figure matters.
  Scenario: A tailor cannot record a payment
    Given an invoice for 50000 that nothing has been paid against
    When the Tailor tries to record 20000 received on it
    Then the API should refuse the payment as not theirs to record

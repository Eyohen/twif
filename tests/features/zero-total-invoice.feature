Feature: An invoice that comes to nothing reads Fully Paid
  Nothing is owed on an invoice whose total is 0, so its payment status is
  Fully Paid by itself — whatever it was raised as, and however it got to 0.

  Scenario: An invoice raised at 0 is fully paid even when sent as unpaid
    When a Store Manager raises an invoice that comes to 0 marked as unpaid
    Then the invoice should read Fully Paid

  Scenario: An invoice re-priced down to 0 becomes fully paid
    Given an invoice for 50000 that nothing has been paid against
    When the invoice is given a 100% discount
    Then the invoice should read Fully Paid
    And the invoice order status should read Fully Paid

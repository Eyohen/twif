Feature: Recording how an invoice was paid
  A paid invoice without its payment channel cannot be reconciled by Accounts.

  Background:
    Given I am signed in as the Store Manager
    And I open the Invoices page

  Scenario Outline: Paid invoices require a payment method on the invoice form
    Given I prepare a new invoice with payment status "<status>" and no payment method
    Then Payment Method should be marked as required
    When I try to save that invoice
    Then I should be prompted to select a payment method
    And the invoice without a payment method should not be saved

    Examples:
      | status         |
      | Fully Paid     |
      | Partially Paid |

  Scenario Outline: The API also rejects paid invoices without a payment method
    When I submit a "<status>" invoice without a payment method directly to the API
    Then the API should reject the missing payment method

    Examples:
      | status         |
      | Fully Paid     |
      | Partially Paid |

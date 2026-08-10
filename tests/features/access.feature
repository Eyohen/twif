Feature: Who may reach the shop's records
  The OMS holds customer records, invoices and payment evidence. Until this was
  built, the API was open to anyone who knew the address and the staff PINs were
  compiled into the JavaScript, where they could be read from the bundle.

  Scenario: The API refuses a caller with no token
    When I ask the API for the customer list with no token
    Then the API should refuse me

  Scenario: The API refuses a made-up token
    When I ask the API for the customer list with a made-up token
    Then the API should refuse me

  Scenario: A signed-in member of staff is let through
    When I ask the API for the customer list as the Store Manager
    Then the API should answer

  Scenario: A wrong PIN is refused
    When I try to sign in with the wrong PIN
    Then I should not be signed in
    And the reason should not say which of the two was wrong

  # The customer's own link is deliberately open: it is emailed to them and they
  # have no account to sign in to.
  Scenario: A customer can still open their tracking link
    Given a customer opens the tracking link for an order that has not started
    Then the tracking page should offer three steps

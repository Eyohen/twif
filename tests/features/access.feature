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

  # These routes used to re-check the Owner by taking their phone and PIN in the
  # request body. Once the PINs left the bundle there was no PIN to send, and
  # every one of them refused — staff could not be added, edited or removed.
  Rule: Managing staff is authorised by the signed-in session

    Scenario: The Owner adds and removes a staff account
      When the Owner adds a staff account
      Then the account should be created
      And the Owner should be able to remove it again

    Scenario: A Store Manager cannot add a staff account
      When the Store Manager tries to add a staff account
      Then the API should refuse me as not the Owner

    Scenario: Resetting a PIN ends the sessions the old one opened
      Given a member of staff is signed in
      When the Owner resets their PIN
      Then their old session should stop working
      And their old PIN should no longer sign them in

Feature: Customer records
  The invoice and the tracking link both go to the customer's email address, so
  a record without one is of little use and two customers cannot share one.

  Background:
    Given I am signed in as the Store Manager
    And I open the Customers page

  Scenario: The email address is not offered as optional
    When I start creating a customer
    Then the email field should be required
    And I should not see "optional"

  Scenario: An address already on file is refused
    When I start creating a customer
    And I try to save a customer using an address already on file
    Then I should be told the address is taken
    And the refusal should read as an error, not a success

  # Every new customer used to arrive with a 16" neck and a 42" chest already
  # filled in — measurements nobody had taken.
  Scenario: A new customer has no measurements until someone takes them
    When I open the first customer's measurements
    Then no measurement should be filled in

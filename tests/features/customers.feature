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

  # An elite member gets a discount on every invoice they are sent. The tag was
  # saving and then showing nowhere — the list and the profile both worked the
  # label out from the order count and ignored the tier — which is
  # indistinguishable from it not having saved.
  Scenario: Tagging a customer an elite member shows on their record
    Given I am signed in as the Owner
    And I open the Customers page
    When the Owner tags the first customer an elite member
    Then the customer list should show them as an elite member
    And their profile should show them as an elite member

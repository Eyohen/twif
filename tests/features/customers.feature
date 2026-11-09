Feature: Customer records
  The invoice and the tracking link go to the customer's email address when there
  is one, and two customers cannot share an address.

  Background:
    Given I am signed in as the Store Manager
    And I open the Customers page

  # Optional since 25 September: a customer can be added at the counter without
  # one. If an address is given, though, no two customers may share it (below).
  Scenario: The email address is offered as optional
    When I start creating a customer
    Then the email field should not be required
    And I should see "optional"

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

  Scenario: A customer created by a Store Manager inherits that manager's store
    When the Store Manager creates a customer from the Customers tab
    Then the new customer should show the Store Manager's assigned store

  Scenario: Measurements save for a customer generated from an invoice
    Given an invoice-only customer with no email address
    When I add measurements to that generated customer profile
    Then the generated customer's measurements should remain saved

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

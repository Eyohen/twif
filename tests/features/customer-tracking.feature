Feature: The customer's tracking link
  What the customer is told about their order has to be true.

  # Any status that was not Ready reported as In Progress, so from the moment
  # the invoice was sent the customer was told a tailor was at work on their
  # garment — before an order sheet existed and before anyone was assigned.
  Scenario: An order that has not reached a tailor says it has been received
    Given a customer opens the tracking link for an order that has not started
    Then the tracking page should show "Order Received" as the current step
    And the tracking page should offer three steps

  Scenario: The tracking page offers one clear way to the customer's profile
    Given a customer opens the tracking link for an order that has not started
    Then I should see "Go to my profile"
    And I should not see "Back to tracking"

  Scenario: A client cannot edit their own record from the portal
    Given a customer opens their profile from the tracking link
    Then I should not see "Edit"
    And I should not see "View all"

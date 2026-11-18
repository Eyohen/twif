Feature: The Production Manager's Tailor Target tab
  Production sees every tailor's weekly target and how they are doing against
  it without going through the Owner or Admin.

  Scenario: The Production Manager has a Tailor Target tab
    Given I am signed in as the Production Manager
    When I open the Tailor Target page
    Then I should see the tailors' weekly targets
    And I should be able to step back to an earlier week

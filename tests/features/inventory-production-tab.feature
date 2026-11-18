Feature: The Inventory Manager's Production and Assign Fabric tabs
  The Production Priority Queue moved off the Overview into its own Production
  tab, next to the list of active jobs. It is view-only: fabric supply is the
  Inventory Manager's job, running production is the Production Manager's.

  Scenario: The tabs are in the navigation and the queue has left the Overview
    Given I am signed in as the Inventory Manager
    Then the navigation should offer Assign Fabric and Production
    And the Overview should not show the Production Priority Queue

  Scenario: The Production tab shows the queue and the job list without management actions
    Given an order sheet has been raised and Accounts have approved it
    And I am signed in as the Inventory Manager
    When I open the Production page
    Then I should see the Priority Production Queue and the Production Job List
    And there should be no button to assign, edit or move a job along
    When I view the first job in the list
    Then its details should open as view only

  Scenario: Assign Fabric is its own tab
    Given I am signed in as the Inventory Manager
    When I open the Assign Fabric page
    Then I should see the orders awaiting fabric

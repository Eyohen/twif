Feature: The Inventory Manager can assign fabric before a tailor is assigned
  Fabric preparation no longer waits for Production. The Inventory Manager reads
  the Store Manager's design notes on the job, chooses the fabric and releases
  it; Production then assigns the tailor on their own.

  Scenario: Design notes are on the job for the Inventory Manager
    Given an approved order whose garment has design notes and no tailor yet
    And I am signed in as the Inventory Manager
    When I open the Production page
    And I view the job for that order
    Then I should see the design notes in the job details

  Scenario: Fabric is released with no tailor assigned, and Production assigns one afterwards
    Given an approved order whose garment has design notes and no tailor yet
    And I am signed in as the Inventory Manager
    When I open that order in Assign Fabric
    Then I should see the design notes on the Assign Fabric page
    When I choose some fabric for the garment and release it
    Then the garment should read as released
    And the order should still have no tailor and still be ready to assign
    When Production assigns a tailor to that garment
    Then the garment should keep its released fabric and have the tailor
    And the fabric record should name that tailor instead of 'not assigned yet'

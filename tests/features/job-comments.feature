Feature: Comment threads on job sheets
  A question about a garment belongs with the garment, so everyone working a job
  reads and writes the same thread.

  Scenario: The Production Manager comments on a job and it is kept
    Given I am signed in as the Production Manager
    And I open the Production page
    When I open the first job
    And I post the comment "Check the lining before cutting"
    Then the thread should show "Check the lining before cutting"
    And the comment should be attributed to me

  Scenario: A comment survives leaving the job and coming back
    Given I am signed in as the Production Manager
    And I open the Production page
    When I open the first job
    And I post the comment "Left a note for the tailor"
    And I close the job and open it again
    Then the thread should show "Left a note for the tailor"

  Scenario: An empty comment cannot be posted
    Given I am signed in as the Production Manager
    And I open the Production page
    When I open the first job
    Then the post button should be disabled

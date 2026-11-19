Feature: Filtering users by role
  The Role filter on User Management lists every role a user can hold,
  Inventory Manager included.

  Scenario Outline: The <role> can filter the user list to Inventory Managers
    Given I am signed in as the <role>
    And I open the User Management page
    When I filter the users by the Inventory Manager role
    Then only Inventory Managers should be listed

    Examples:
      | role  |
      | Owner |
      | Administrator |

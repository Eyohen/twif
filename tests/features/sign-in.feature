Feature: Signing in
  Every member of staff reaches their own workspace, and no one else's.

  Scenario Outline: <role> signs in and lands on their own dashboard
    Given I sign in through the form as the <role>
    Then the page should belong to the <role>
    And my name should be shown at the foot of the sidebar

    Examples:
      | role               |
      | Owner              |
      | Store Manager      |
      | Accountant         |
      | Production Manager |
      | Inventory Manager  |
      | Tailor             |

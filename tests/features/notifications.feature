Feature: The notification bell
  The bell is in every top bar, so it has to lead somewhere from every account.

  # The Owner's bell used to do nothing: Notifications was missing from the
  # Owner's navigation and the route guard only permits a view that appears
  # there, so it navigated and was redirected straight back to the overview.
  Scenario Outline: <role> can open notifications from the bell
    Given I am signed in as the <role>
    When I click the notification bell
    Then I should be on the notifications page

    Examples:
      | role               |
      | Owner              |
      | Store Manager      |
      | Accountant         |
      | Production Manager |
      | Inventory Manager  |
      | Tailor             |

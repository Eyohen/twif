Feature: Fabric photos can be opened full size
  A fabric's photo used to show only as a small thumbnail that did nothing when
  clicked. Everyone who can see inventory can now open it full size and zoom in.

  Scenario Outline: <role> can open a fabric photo from the inventory list
    Given a fabric has been added with a photo
    And I am signed in as the <role>
    When I search the inventory list for that fabric
    And I click its photo
    Then the photo should open full size
    When I zoom in
    Then the photo should be shown larger
    When I press Escape
    Then the full size photo should close

    Examples:
      | role               |
      | Owner              |
      | Administrator      |
      | Inventory Manager  |
      | Production Manager |
      | Store Manager      |

  Scenario: The photo opens full size from the fabric's own page too
    Given a fabric has been added with a photo
    And I am signed in as the Inventory Manager
    When I search the inventory list for that fabric
    And I open that fabric's page
    And I click the photo on the fabric's page
    Then the photo should open full size
    When I close the full size photo
    Then the full size photo should close

  Scenario: A fabric with no photo of its own shows a stock picture that does not open
    Given a fabric has been added without a photo
    And I am signed in as the Inventory Manager
    When I search the inventory list for that fabric
    Then its picture should not be a link to a full size view

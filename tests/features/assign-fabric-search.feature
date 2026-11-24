Feature: Searching for a fabric on the Assign Fabric page
  Typing a fabric's name or SKU lists the matching fabrics to pick from; before,
  the typing only narrowed a closed dropdown, so nothing seemed to happen.

  Scenario: Typing the fabric's name lists it and it can be picked
    Given an approved order whose garment has design notes and no tailor yet
    And a fabric has been added with a photo
    And I am signed in as the Inventory Manager
    When I open that order in Assign Fabric
    And I type the fabric's name into the fabric search
    Then the fabric should be listed in the search results
    When I pick it from the search results
    Then it should be added to the garment

  Scenario: Typing the fabric's SKU finds it
    Given an approved order whose garment has design notes and no tailor yet
    And a fabric has been added with a photo
    And I am signed in as the Inventory Manager
    When I open that order in Assign Fabric
    And I type the fabric's SKU into the fabric search
    Then the fabric should be listed in the search results

  Scenario: A search that matches nothing says so
    Given an approved order whose garment has design notes and no tailor yet
    And I am signed in as the Inventory Manager
    When I open that order in Assign Fabric
    And I type "zzz-no-such-fabric" into the fabric search
    Then the search should say nothing matches

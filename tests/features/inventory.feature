Feature: Inventory
  The Inventory Manager keeps what is on the shelves, and every item can be
  opened to see what is recorded about it.

  Background:
    Given I am signed in as the Inventory Manager
    And I open the Inventory page

  Scenario: An item can be added with everything the shop records
    When I add an inventory item named "Test wool suiting"
    Then the inventory list should include "Test wool suiting"

  # The View buttons used to lead nowhere at all.
  Scenario: View opens the item
    When I open the first inventory item
    Then I should see "Stock Movements"
    And the screen should not scroll sideways

  # The list fell back to eight invented fabrics whenever the API returned
  # nothing, so an unreachable server looked like a stocked shelf.
  Scenario: The list shows no invented stock
    Then I should not see "Black Jacquard"
    And I should not see "White Cotton Poplin"

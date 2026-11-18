Feature: The Production Manager's sidebar
  The main tabs stay put, with no scrollbar of their own. The Shortcuts below
  them fold away and scroll on their own where there is not room.

  Scenario: The main tabs are static and the shortcuts collapse
    Given I am signed in as the Production Manager
    Then every main tab should be visible without scrolling the tab list
    When I collapse the Shortcuts
    Then the shortcuts should be hidden and every main tab still visible
    When I expand the Shortcuts
    Then the shortcuts should be listed again

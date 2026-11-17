Feature: The order of a department's parameters can be set
  Parameters were always shown in the order they were created. The Owner can
  now put them in the order that suits the work, and the order is kept.

  Scenario: The Owner moves a parameter and the new order is kept
    When the Owner moves the last parameter of the Suit department to the top
    Then the Suit department should list that parameter first
    And Additional Information should still be last
    And the Owner puts the Suit parameters back as they were

  Scenario: A parameter added to a department can be placed anywhere
    When the Owner adds a parameter "Order test colour" to the Suit department and places it second
    Then the Suit department should list "Order test colour" second
    And the Owner removes the "Order test colour" parameter again

  Scenario: Only the Owner or Admin can change the order
    When the Production Manager tries to reorder the Suit parameters
    Then the request should be refused

  Scenario: The Admin can change the order but not the parameters themselves
    When the Admin reverses the order of the Suit parameters
    Then the request should be accepted
    When the Admin tries to rename the first Suit parameter
    Then the request should be refused
    And the Owner puts the Suit parameters back as they were

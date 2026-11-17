Feature: Two rules that protect the performance records
  The weekly tailor targets are counted from the date Production marked a job
  ready, and set by the Owner. Neither can be changed by a side door.

  Scenario: A ready date cannot be written by a request
    Given an order sheet has been raised and Accounts have approved it
    When the Owner saves the order sheet with a ready date of 1 January 2020
    Then the order sheet should not carry that ready date

  Scenario: Changing a tailor's role cannot quietly erase their weekly target
    When the Owner sets the tailor's weekly target to 6
    And the Administrator tries to change the tailor's role to Store Manager
    Then the request should be refused
    And the tailor's weekly target should be 6

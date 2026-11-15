Feature: Weekly production targets for tailors
  Each tailor has a weekly target set by the Owner. Completed jobs are counted
  against it for the week they were finished in, never capped, and every week
  stands on its own.

  # What a week came to is worked out on the server and cannot be changed from a
  # screen, so these are checked against the API the screens read.
  Rule: Only the Owner sets a target

    Scenario: The Owner sets a tailor's weekly target
      When the Owner sets the tailor's weekly target to 6
      Then the tailor's weekly target should be 6

    Scenario: The Production Manager cannot change a weekly target
      When the Production Manager tries to set the tailor's weekly target to 9
      Then the request should be refused

    Scenario: A target must be a whole number of jobs
      When the Owner tries to set the tailor's weekly target to 0
      Then the request should be rejected as invalid

  Rule: Targets are visible to the people who need them

    Scenario: The Production Manager sees each tailor's week against their target
      When the Production Manager reads this week's targets
      Then the tailor's row should show a target, a completed count and a status

    Scenario: A tailor sees their own weeks without the management flags
      When the tailor reads their own weekly record
      Then the record should list this week first and carry no management flag

    Scenario: A tailor cannot read the whole team's targets
      When the tailor tries to read the team's targets
      Then the request should be refused

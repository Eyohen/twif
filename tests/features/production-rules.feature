Feature: The rules production runs on
  What may enter production, and what a job may do once it is there. These are
  business rules, not screens — a change here changes what the shop can do.

  # Production is gated on the Accounts decision. Payment is not consulted:
  # an unpaid invoice that Accounts approve is released to production.
  Rule: An order reaches production when Accounts approve it

    Scenario: An order still waiting on Accounts is not in production
      Given an order sheet has been raised but Accounts have not reviewed it
      When the Production Manager opens Production
      Then that order should not be listed as a production job

    Scenario: An approved order is listed as a production job
      Given an order sheet has been raised and Accounts have approved it
      When the Production Manager opens Production
      Then that order should be listed as a production job

  # The tailor's controls follow the job's state, so a garment cannot be
  # reported finished before anyone has touched it.
  Rule: A job moves Ready to Assign, then In Progress, then Ready

    Scenario: A job nobody has started offers Start Work, not Mark Ready
      Given a tailor has a job that has not been started
      Then Start Work should be offered
      And Mark Ready should not be offered

    Scenario: A started job offers Mark Ready, not Start Work
      Given a tailor has a job that has not been started
      When the tailor starts that job
      Then Mark Ready should be offered
      And Start Work should not be offered

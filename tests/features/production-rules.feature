Feature: The rules production runs on
  What may enter production, and what a job may do once it is there. These are
  business rules, not screens — a change here changes what the shop can do.

  # Approval is the first of three gates: Accounts approve it, the customer has
  # paid something, and the garment has measurements.
  Rule: An order reaches production when Accounts approve it

    Scenario: An order still waiting on Accounts is not in production
      Given an order sheet has been raised but Accounts have not reviewed it
      When the Production Manager opens Production
      Then that order should not be listed as a production job

    Scenario: An approved order is listed as a production job
      Given an order sheet has been raised and Accounts have approved it
      When the Production Manager opens Production
      Then that order should be listed as a production job

  # An approved invoice is not enough on its own. Enough of the money has to be
  # in first — 70% by default, set in Settings. The invoice asks the customer
  # for 80% upfront, which leaves a little room above the gate.
  Rule: An order is held until enough of it has been paid

    Scenario: An unpaid order is kept out of production even once approved
      Given an approved order whose invoice is unpaid
      When the Production Manager opens Production
      Then that order should be held with the reason "Invoice unpaid"
      And that order should not be listed as a production job

    Scenario: An unpaid order cannot be given to a tailor
      Given an approved order whose invoice is unpaid
      Then assigning a tailor to it should be refused

    Scenario: A part payment below the threshold is not enough
      Given an approved order with 40% of the invoice paid
      Then assigning a tailor to it should be refused

    Scenario: A part payment at the threshold releases the order
      Given an approved order with 70% of the invoice paid
      Then assigning a tailor to it should be allowed

    Scenario: A fully paid order goes through
      Given an approved order with 100% of the invoice paid
      Then assigning a tailor to it should be allowed

  # Approving the invoice is Accounts' decision. Releasing an order the gate is
  # holding is not — that is the Owner's and Admin's alone.
  Rule: Only an Owner or Admin can release a held order

    Scenario: Accounts cannot push a held order through, the Owner can
      Given an approved order with 40% of the invoice paid
      Then the Accountant should not be able to release it
      And the Owner should be able to release it

  # A tailor cannot cut without measurements, so the job waits until it has them.
  Rule: An order with no measurements is held

    Scenario: An order with no measurements is held out of the queue
      Given an approved and paid order with no measurements
      When the Production Manager opens Production
      Then that order should be held with the reason "Measurements missing"
      And that order should not be listed as a production job

    Scenario: Once measured, the same order can start
      Given an approved and paid order with no measurements
      When the measurements are added
      Then assigning a tailor to it should be allowed

    # A shop raises the invoice at the counter and measures the customer after.
    # The order sheet takes its copy of the measurements when it is raised, so
    # measuring later left the job held for good with nothing to undo it.
    Scenario: Measuring the customer after the order sheet was raised releases the job
      Given an approved and paid order with no measurements
      When the customer is measured on their own profile
      And the Production Manager opens Production
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

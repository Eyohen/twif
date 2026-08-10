Feature: Reviewing invoices
  Accounts and the Owner work through invoices from this screen.

  Background:
    Given I am signed in as the Owner
    And I open the Invoices page

  # A panel used to open on the right the moment the page loaded, because the
  # selection defaulted to the first invoice.
  Scenario: No panel opens until an invoice is chosen
    Then no invoice panel should be open

  Scenario: The invoice list does not run off the side of the screen
    Then the screen should not scroll sideways

  # The three columns were `1fr 1fr 260px`, and a `1fr` track will not shrink
  # below its content, so the summary table squeezed the evidence column to a
  # strip and pushed the actions off the right edge.
  Scenario: Opening an invoice for review fits the screen
    When I open the first invoice for review
    Then I should see "Review Invoice"
    And the screen should not scroll sideways
    And the review columns should share the width evenly
    And I should see "Review Actions"

  Scenario: The review screen shows no figures the shop never entered
    When I open the first invoice for review
    Then I should not see "GTBank – 0123045678"
    And I should not see "jimmy.aki@gmail.com"

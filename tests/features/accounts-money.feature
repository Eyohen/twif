Feature: Recording what a customer actually paid
  An invoice carried a status — unpaid, part paid, fully paid — but no figure
  for what was handed over, and nothing in the app ever wrote one. Accounts had
  nothing to reconcile against, and the screens filled the gap with a guess.

  Scenario: Accounts record a part payment against an invoice
    Given an invoice for 50000 that nothing has been paid against
    When the Accountant records 20000 received on it
    Then the invoice should be part paid with 20000 recorded
    And the payment should be listed with who recorded it

  Scenario: The rest of the money settles the invoice
    Given an invoice for 50000 that nothing has been paid against
    When the Accountant records 20000 received on it
    # Each payment adds to what has come in, so the rest of 50000 is 30000.
    And the Accountant records 30000 received on it
    Then the invoice should be fully paid with 50000 recorded

  Scenario: More than the invoice is owed cannot be recorded
    Given an invoice for 50000 that nothing has been paid against
    When the Accountant tries to record 90000 received on it
    Then the payment should be refused for being more than is owed
    And the invoice should still have nothing recorded against it

  # Payment is a production gate, so who may write the figure matters.
  Scenario: A tailor cannot record a payment
    Given an invoice for 50000 that nothing has been paid against
    When the Tailor tries to record 20000 received on it
    Then the API should refuse the payment as not theirs to record

  # An invoice's lines can be corrected — wording, rate, quantity, discount, and
  # lines added or removed — and what it comes to follows them. It cannot be
  # corrected to less than what has already been paid against it. (This replaced
  # the August rule that figures were fixed once sent.)
  Rule: An invoice's lines can be corrected and the total follows them

    Scenario: The wording of a line can be corrected
      Given an invoice for 50000 that nothing has been paid against
      When the Owner renames the first line to "Three-piece suit (navy)"
      Then the line should read "Three-piece suit (navy)"
      And the invoice should still come to 50000

    Scenario: Correcting a rate changes what the invoice comes to
      Given an invoice for 50000 that nothing has been paid against
      When the Owner changes the rate of the first line to 40000
      Then the invoice should now come to 40000

    Scenario: A line can be added and the total follows
      Given an invoice for 50000 that nothing has been paid against
      When the Owner adds a second line "Alterations" at 5000
      Then the invoice should now come to 55000

    Scenario: An invoice cannot be corrected to less than has been paid
      Given an invoice for 50000 that nothing has been paid against
      And 20000 has been recorded against it
      When the Owner tries to bring the first line below what has been paid
      Then the change should be refused
      And the invoice should still come to 50000

  Rule: An approved invoice cannot be deleted

    Scenario: An invoice Accounts have not seen can be deleted
      Given an invoice for 50000 that nothing has been paid against
      Then the Owner should be able to delete it

    Scenario: An approved invoice cannot be deleted, even by the Owner
      Given an invoice for 50000 that nothing has been paid against
      And the invoice has been paid in full
      And the Accountant approves it
      Then deleting it should be refused
      And the timeline should record who approved it and when

  # The invoice the customer receives is the shop's word on what they owe. It
  # was printing the whole sum as the balance due whatever had been paid,
  # under a "Fully Paid" badge, because nothing subtracted the payment.
  Rule: The invoice the customer receives shows what is still owed

    Scenario: An invoice paid in full does not ask for the money again
      When an invoice for 50000 is raised as fully paid
      Then the invoice document should not say 50000 is due
      And the invoice document should show 50000 as paid

    Scenario: A part-paid invoice asks for the remainder only
      When an invoice for 50000 is raised with 20000 paid
      Then the invoice document should say 30000 is due

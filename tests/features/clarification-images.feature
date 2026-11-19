Feature: Images with a clarification
  When Accounts flag an invoice, the Store Manager answers in writing and may
  attach pictures — for instance the correct payment photo. The pictures are
  optional, travel with the answer, and are there for Accounts when they review.

  Scenario: A clarification with an image reaches Accounts
    Given an invoice for 50000 that nothing has been paid against
    And Accounts have flagged the invoice asking for the right payment photo
    When the Store Manager answers with a note and an image
    Then Accounts should see the clarification with 1 image
    And the image should be available to Accounts
    And the invoice list should not carry the image itself

  Scenario: A written clarification alone is still accepted
    Given an invoice for 50000 that nothing has been paid against
    And Accounts have flagged the invoice asking for the right payment photo
    When the Store Manager answers with a note only
    Then Accounts should see the clarification with 0 images

  Scenario: A file that is not an image is not kept
    Given an invoice for 50000 that nothing has been paid against
    And Accounts have flagged the invoice asking for the right payment photo
    When the Store Manager answers with a note and a web page pretending to be an image
    Then Accounts should see the clarification with 0 images

  Scenario: An image sent with a flagged payment's clarification is kept with that payment
    Given an invoice for 50000 that nothing has been paid against
    When the Store Manager records a payment of 10000 on it
    And Accounts flag the first payment asking for the sender's name
    And the Store Manager clarifies the first payment with an image
    Then the first payment should carry 1 clarification image

  Scenario: The Store Manager attaches an image on the clarification screen
    Given an invoice for 50000 that nothing has been paid against
    And Accounts have flagged the invoice asking for the right payment photo
    And I am signed in as the Store Manager
    And I open the Invoices page
    When I open that invoice to answer the flag
    And I write a clarification and attach an image
    And I submit the clarification
    Then Accounts should see the clarification with 1 image
    And the Accountant can see the image when reviewing the invoice

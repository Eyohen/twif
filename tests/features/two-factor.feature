Feature: Two-factor sign-in for the Admin account
  The Admin can reach every part of the shop's records, and a phone number with
  a short PIN is not enough to protect that. Admin sign-in takes a code from an
  authenticator app as well. Every other role signs in with phone and PIN.

  Background:
    Given the Admin has no authenticator set up

  Scenario: An Admin's PIN alone does not sign them in
    When the Admin signs in with their PIN
    Then they should not have a session yet
    And they should be asked to set up an authenticator

  Scenario: A ticket from the PIN cannot be used against the API
    When the Admin signs in with their PIN
    Then the API should refuse that ticket as a session

  Scenario: Setting up the authenticator finishes the sign-in
    Given the Admin signs in with their PIN
    When they scan the barcode and enter a code from the app
    Then they should be signed in
    And they should be given recovery codes

  Scenario: Signing in afterwards asks for a code
    Given the Admin has an authenticator set up
    When the Admin signs in with their PIN
    Then they should not have a session yet
    And they should be asked for a code

  Scenario: The wrong code is refused
    Given the Admin has an authenticator set up
    And the Admin signs in with their PIN
    When they enter the wrong code
    Then the code should be refused

  Scenario: A code from the app signs them in
    Given the Admin has an authenticator set up
    And the Admin signs in with their PIN
    When they enter a code from the app
    Then they should be signed in

  # A lost phone should not lock an Admin out of the shop's records.
  Scenario: A recovery code works once
    Given the Admin has an authenticator set up
    And the Admin signs in with their PIN
    When they enter a recovery code
    Then they should be signed in
    And that same recovery code should not work again

  Scenario: A tailor still signs in with a PIN alone
    When the Tailor signs in with their PIN
    Then they should be signed in

Feature: Accountant ordering and clear fabric name errors
  Accounts see the invoice that was just changed first, and an item name that
  is already taken says so instead of "Resource already exists".

  Scenario: An invoice that just had a payment recorded comes first for Accounts
    Given an invoice for 50000 that nothing has been paid against
    When the Store Manager records a payment of 20000 on it
    Then it should be the most recently updated invoice in the register

  Scenario: Renaming an item to a name already in use is explained
    When the Inventory Manager renames an item to the name of another item
    Then the refusal should name the item that already has that name

Feature: Every page in the menu renders
  A component referenced but never defined does not fail the build — esbuild
  does not check that a JSX tag resolves — so the page compiles, ships, and
  renders as a blank white area with the error only in the browser console.
  Settings shipped that way and was reported as "empty".

  Nothing here checks what a page says. It checks that opening it produces a
  page rather than nothing, and that React did not throw.

  Scenario Outline: <role> can open every page in their menu
    When the <role> opens every page in their menu
    Then every one should render something
    And none of them should have thrown

    Examples:
      | role               |
      | Owner              |
      | Store Manager      |
      | Accountant         |
      | Production Manager |
      | Inventory Manager  |
      | Tailor             |

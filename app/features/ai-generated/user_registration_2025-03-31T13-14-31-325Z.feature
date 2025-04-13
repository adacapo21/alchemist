@registration
Feature: User Registration
  As a new user
  I want to register an account
  So that I can access preventimmo services
  

  Scenario: New user completes registration successfully
    Given I am on page "/espace-client/visitor.php?action=register"
    And I set fullscreen
    When I register as new user with ":default"
    Then I should see "Un email de confirmation vient de vous être envoyé"

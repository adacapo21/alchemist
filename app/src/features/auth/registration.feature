# src/features/auth/registration.feature
@registration
Feature: Registration
  In order to access preventimmo services
  As a new user
  I need to be able to register an account

  Scenario: registration_as_new_user
    Given I am on page "/espace-client/visitor.php?action=register"
    And I set fullscreen
    When I register as new user with ":default"
    Then I should see "Un email de confirmation vient de vous être envoyé"
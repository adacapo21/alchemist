@registration_french
# Language: fr
Feature: Inscription
  Afin d'accéder aux services Preventimmo
  En tant que nouvel utilisateur
  Je dois pouvoir créer un compte


  Scenario: inscription_en_tant_que_nouvel_utilisateur
    Given que je suis sur la page "/espace-client/visitor.php?action=register"
    And que je mets en plein écran
    When je m'inscris en tant que nouvel utilisateur avec ":default"
    Then je devrais voir "Un email de confirmation vient de vous être envoyé"
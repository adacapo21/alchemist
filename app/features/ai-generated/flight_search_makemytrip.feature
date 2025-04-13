@automated
Feature: Flight Booking on MakeMyTrip
  As a user
  I want to test booking of flight from Dubai to New Delhi next week on makemytrip.com
  So that I can verify if prices of flights is more than 2000

  Scenario: Test booking of flight from Dubai to New Delhi next week
    Given I am on the MakeMyTrip website
    When I close any modal popups
    And I select flight search
    And I clear the From field
    And I enter "Dubai" in the From field
    And I clear the To field
    And I enter "New Delhi" in the To field
    And I select next week for travel dates
    Then I should see search results for flights
    And I should verify if prices of flights is more than 2000 
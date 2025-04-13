@automated @ai-test
Feature: Amazon Product Search
  As a user
  I want to search for products on Amazon
  So that I can find the best deals

  Scenario: Search for headphones and filter by price range
    Given I am on the Amazon website
    When I search for "wireless headphones"
    And I filter results by price range $50-$100
    And I sort results by customer reviews
    Then I should see products matching my search criteria
    And I should see products within the selected price range
    And I should verify top results have 4+ star ratings 
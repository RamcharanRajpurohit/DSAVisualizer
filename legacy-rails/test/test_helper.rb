ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

module ActiveSupport
  class TestCase
    # Run tests in parallel with specified workers
    parallelize(workers: :number_of_processors)

    # Setup all fixtures in test/fixtures/*.yml for all tests in alphabetical order.
    # This app has no database (ActiveRecord railtie is not loaded), so skip fixtures.
    fixtures :all if defined?(ActiveRecord)

    # Add more helper methods to be used by all tests here...
  end
end

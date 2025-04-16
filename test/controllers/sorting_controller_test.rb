require "test_helper"

class SortingControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get sorting_index_url
    assert_response :success
  end
end

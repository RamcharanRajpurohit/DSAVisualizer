require "test_helper"

class BstControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get bst_index_url
    assert_response :success
  end
end

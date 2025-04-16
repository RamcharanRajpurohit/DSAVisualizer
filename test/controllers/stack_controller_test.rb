require "test_helper"

class StackControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get stack_index_url
    assert_response :success
  end
end

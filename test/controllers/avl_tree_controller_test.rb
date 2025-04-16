require "test_helper"

class AvlTreeControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get avl_tree_index_url
    assert_response :success
  end
end

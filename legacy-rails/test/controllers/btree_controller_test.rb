require "test_helper"

class BtreeControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get btree_index_url
    assert_response :success
  end
end

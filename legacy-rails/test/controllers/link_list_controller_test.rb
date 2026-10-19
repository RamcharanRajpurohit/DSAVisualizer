require "test_helper"

class LinkListControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get link_list_index_url
    assert_response :success
  end
end

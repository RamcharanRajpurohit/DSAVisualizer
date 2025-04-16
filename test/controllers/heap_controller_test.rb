require "test_helper"

class HeapControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get heap_index_url
    assert_response :success
  end
end

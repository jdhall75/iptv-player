#!/bin/bash

# IPTV Player Backend API Test Script
# This script tests all authentication and playlist endpoints

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:8787}"
TIMESTAMP=$(date +%s)
TEST_EMAIL="test_${TIMESTAMP}@example.com"
TEST_USERNAME="testuser_${TIMESTAMP}"
TEST_PASSWORD="TestPass123@"

# Variables to store tokens and IDs
ACCESS_TOKEN=""
PLAYLIST_ID=""
PLAYLIST_ID_2=""
FAVORITE_ID=""
FAVORITE_ID_2=""

# Helper functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_test() {
    echo -e "${YELLOW}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    exit 1
}

# Test functions
test_health_check() {
    print_test "Testing health check endpoint"

    response=$(curl -s "$API_URL/")

    if echo "$response" | grep -q '"success":true'; then
        print_success "Health check passed"
        echo "$response" | jq .
    else
        print_error "Health check failed"
    fi
}

test_register() {
    print_test "Testing user registration"

    response=$(curl -s -X POST "$API_URL/api/auth/register" \
        -H "Content-Type: application/json" \
        -d "{\"email\": \"$TEST_EMAIL\", \"username\": \"$TEST_USERNAME\", \"password\": \"$TEST_PASSWORD\"}")

    if echo "$response" | grep -q '"success":true'; then
        ACCESS_TOKEN=$(echo "$response" | jq -r '.accessToken')
        print_success "User registered successfully"
        echo "$response" | jq '.user'
    else
        print_error "User registration failed: $response"
    fi
}

test_login() {
    print_test "Testing user login"

    # Add a small delay to ensure different timestamp for JWT tokens
    sleep 2

    response=$(curl -s -X POST "$API_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\"}")

    if echo "$response" | grep -q '"success":true'; then
        ACCESS_TOKEN=$(echo "$response" | jq -r '.accessToken')
        print_success "User logged in successfully"
        echo "$response" | jq '.user'
    else
        print_error "User login failed: $response"
    fi
}

test_get_current_user() {
    print_test "Testing get current user"

    response=$(curl -s "$API_URL/api/auth/me" \
        -H "Authorization: Bearer $ACCESS_TOKEN")

    if echo "$response" | grep -q '"success":true'; then
        print_success "Current user retrieved successfully"
        echo "$response" | jq '.user'
    else
        print_error "Get current user failed: $response"
    fi
}

test_create_playlist() {
    print_test "Testing create playlist"

    response=$(curl -s -X POST "$API_URL/api/playlists" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -d '{"name": "Test Playlist 1", "m3u_url": "https://example.com/playlist1.m3u"}')

    if echo "$response" | grep -q '"success":true'; then
        PLAYLIST_ID=$(echo "$response" | jq -r '.playlist.id')
        print_success "Playlist created successfully (ID: $PLAYLIST_ID)"
        echo "$response" | jq '.playlist'
    else
        print_error "Create playlist failed: $response"
    fi
}

test_create_second_playlist() {
    print_test "Testing create second playlist"

    response=$(curl -s -X POST "$API_URL/api/playlists" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -d '{"name": "Test Playlist 2", "m3u_url": "https://example.com/playlist2.m3u"}')

    if echo "$response" | grep -q '"success":true'; then
        PLAYLIST_ID_2=$(echo "$response" | jq -r '.playlist.id')
        print_success "Second playlist created successfully (ID: $PLAYLIST_ID_2)"
        echo "$response" | jq '.playlist'
    else
        print_error "Create second playlist failed: $response"
    fi
}

test_get_all_playlists() {
    print_test "Testing get all playlists"

    response=$(curl -s "$API_URL/api/playlists" \
        -H "Authorization: Bearer $ACCESS_TOKEN")

    if echo "$response" | grep -q '"success":true'; then
        count=$(echo "$response" | jq '.playlists | length')
        print_success "Retrieved $count playlists"
        echo "$response" | jq '.playlists'
    else
        print_error "Get all playlists failed: $response"
    fi
}

test_get_single_playlist() {
    print_test "Testing get single playlist"

    response=$(curl -s "$API_URL/api/playlists/$PLAYLIST_ID" \
        -H "Authorization: Bearer $ACCESS_TOKEN")

    if echo "$response" | grep -q '"success":true'; then
        print_success "Retrieved single playlist"
        echo "$response" | jq '.playlist'

        # Check if last_accessed was updated
        last_accessed=$(echo "$response" | jq -r '.playlist.last_accessed')
        if [ "$last_accessed" != "null" ]; then
            print_success "last_accessed timestamp updated"
        fi
    else
        print_error "Get single playlist failed: $response"
    fi
}

test_update_playlist() {
    print_test "Testing update playlist"

    response=$(curl -s -X PUT "$API_URL/api/playlists/$PLAYLIST_ID" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -d '{"name": "Updated Test Playlist", "m3u_url": "https://example.com/updated-playlist.m3u"}')

    if echo "$response" | grep -q '"success":true'; then
        name=$(echo "$response" | jq -r '.playlist.name')
        if [ "$name" == "Updated Test Playlist" ]; then
            print_success "Playlist updated successfully"
            echo "$response" | jq '.playlist'
        else
            print_error "Playlist name not updated correctly"
        fi
    else
        print_error "Update playlist failed: $response"
    fi
}

test_delete_playlist() {
    print_test "Testing delete playlist"

    response=$(curl -s -X DELETE "$API_URL/api/playlists/$PLAYLIST_ID_2" \
        -H "Authorization: Bearer $ACCESS_TOKEN")

    if echo "$response" | grep -q '"success":true'; then
        print_success "Playlist deleted successfully"
        echo "$response" | jq .

        # Verify it's deleted
        verify_response=$(curl -s "$API_URL/api/playlists/$PLAYLIST_ID_2" \
            -H "Authorization: Bearer $ACCESS_TOKEN")

        if echo "$verify_response" | grep -q "not found"; then
            print_success "Verified playlist is deleted"
        fi
    else
        print_error "Delete playlist failed: $response"
    fi
}

test_unauthorized_access() {
    print_test "Testing unauthorized access (should fail)"

    response=$(curl -s "$API_URL/api/playlists")

    if echo "$response" | grep -q '"error".*[Uu]nauthorized'; then
        print_success "Unauthorized access properly rejected"
    else
        print_error "Unauthorized access not properly rejected: $response"
    fi
}

test_invalid_playlist_data() {
    print_test "Testing invalid playlist data (missing M3U URL)"

    response=$(curl -s -X POST "$API_URL/api/playlists" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -d '{"name": "Invalid Playlist"}')

    if echo "$response" | grep -q '"success":false'; then
        print_success "Invalid data properly rejected"
        echo "$response" | jq .
    else
        print_error "Invalid data not properly rejected: $response"
    fi
}

test_invalid_m3u_url() {
    print_test "Testing invalid M3U URL format"

    response=$(curl -s -X POST "$API_URL/api/playlists" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -d '{"name": "Invalid URL Playlist", "m3u_url": "not-a-url"}')

    if echo "$response" | grep -q '"success":false'; then
        print_success "Invalid M3U URL properly rejected"
        echo "$response" | jq .
    else
        print_error "Invalid M3U URL not properly rejected: $response"
    fi
}

test_get_channels() {
    print_test "Testing get channels from playlist (will fail with example URL)"

    response=$(curl -s "$API_URL/api/channels/$PLAYLIST_ID" \
        -H "Authorization: Bearer $ACCESS_TOKEN")

    # This will fail because example.com doesn't have a real M3U file
    # But we're testing that the endpoint works and returns proper error
    if echo "$response" | grep -q '"success":false' || echo "$response" | grep -q '"channels"'; then
        print_success "Channels endpoint accessible (expected to fail with test URL)"
        echo "$response" | jq .
    else
        print_error "Get channels failed unexpectedly: $response"
    fi
}

test_create_favorite() {
    print_test "Testing create favorite"

    response=$(curl -s -X POST "$API_URL/api/favorites" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -d '{
            "channel_name": "Test Channel 1",
            "channel_url": "https://example.com/stream1.m3u8",
            "channel_logo": "https://example.com/logo1.png",
            "channel_group": "News",
            "source_playlist_id": "'"$PLAYLIST_ID"'"
        }')

    if echo "$response" | grep -q '"success":true'; then
        FAVORITE_ID=$(echo "$response" | jq -r '.favorite.id')
        print_success "Favorite created successfully (ID: $FAVORITE_ID)"
        echo "$response" | jq '.favorite'
    else
        print_error "Create favorite failed: $response"
    fi
}

test_create_second_favorite() {
    print_test "Testing create second favorite"

    response=$(curl -s -X POST "$API_URL/api/favorites" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -d '{
            "channel_name": "Test Channel 2",
            "channel_url": "https://example.com/stream2.m3u8",
            "channel_group": "Sports"
        }')

    if echo "$response" | grep -q '"success":true'; then
        FAVORITE_ID_2=$(echo "$response" | jq -r '.favorite.id')
        print_success "Second favorite created successfully (ID: $FAVORITE_ID_2)"
        echo "$response" | jq '.favorite'
    else
        print_error "Create second favorite failed: $response"
    fi
}

test_get_all_favorites() {
    print_test "Testing get all favorites"

    response=$(curl -s "$API_URL/api/favorites" \
        -H "Authorization: Bearer $ACCESS_TOKEN")

    if echo "$response" | grep -q '"success":true'; then
        count=$(echo "$response" | jq '.favorites | length')
        print_success "Retrieved $count favorites"
        echo "$response" | jq '.favorites'
    else
        print_error "Get all favorites failed: $response"
    fi
}

test_get_single_favorite() {
    print_test "Testing get single favorite"

    response=$(curl -s "$API_URL/api/favorites/$FAVORITE_ID" \
        -H "Authorization: Bearer $ACCESS_TOKEN")

    if echo "$response" | grep -q '"success":true'; then
        print_success "Retrieved single favorite"
        echo "$response" | jq '.favorite'
    else
        print_error "Get single favorite failed: $response"
    fi
}

test_duplicate_favorite() {
    print_test "Testing duplicate favorite (should fail)"

    response=$(curl -s -X POST "$API_URL/api/favorites" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -d '{
            "channel_name": "Test Channel 1",
            "channel_url": "https://example.com/stream1.m3u8"
        }')

    if echo "$response" | grep -q '"success":false' && echo "$response" | grep -q "already in favorites"; then
        print_success "Duplicate favorite properly rejected"
        echo "$response" | jq .
    else
        print_error "Duplicate favorite not properly rejected: $response"
    fi
}

test_delete_favorite() {
    print_test "Testing delete favorite"

    response=$(curl -s -X DELETE "$API_URL/api/favorites/$FAVORITE_ID_2" \
        -H "Authorization: Bearer $ACCESS_TOKEN")

    if echo "$response" | grep -q '"success":true'; then
        print_success "Favorite deleted successfully"
        echo "$response" | jq .

        # Verify it's deleted
        verify_response=$(curl -s "$API_URL/api/favorites/$FAVORITE_ID_2" \
            -H "Authorization: Bearer $ACCESS_TOKEN")

        if echo "$verify_response" | grep -q "not found"; then
            print_success "Verified favorite is deleted"
        fi
    else
        print_error "Delete favorite failed: $response"
    fi
}

test_delete_favorite_by_url() {
    print_test "Testing delete favorite by URL"

    response=$(curl -s -X POST "$API_URL/api/favorites/by-url/delete" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -d '{"channel_url": "https://example.com/stream1.m3u8"}')

    if echo "$response" | grep -q '"success":true'; then
        print_success "Favorite deleted by URL successfully"
        echo "$response" | jq .
    else
        print_error "Delete favorite by URL failed: $response"
    fi
}

test_invalid_favorite_data() {
    print_test "Testing invalid favorite data (missing channel URL)"

    response=$(curl -s -X POST "$API_URL/api/favorites" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -d '{"channel_name": "Invalid Channel"}')

    if echo "$response" | grep -q '"success":false'; then
        print_success "Invalid favorite data properly rejected"
        echo "$response" | jq .
    else
        print_error "Invalid favorite data not properly rejected: $response"
    fi
}

test_logout() {
    print_test "Testing user logout"

    response=$(curl -s -X POST "$API_URL/api/auth/logout" \
        -H "Authorization: Bearer $ACCESS_TOKEN")

    if echo "$response" | grep -q '"success":true'; then
        print_success "User logged out successfully"
        echo "$response" | jq .
    else
        print_error "User logout failed: $response"
    fi
}

# Cleanup function
cleanup() {
    print_header "Cleaning up test data"

    if [ -n "$PLAYLIST_ID" ]; then
        print_test "Deleting remaining test playlist"
        curl -s -X DELETE "$API_URL/api/playlists/$PLAYLIST_ID" \
            -H "Authorization: Bearer $ACCESS_TOKEN" > /dev/null
        print_success "Test playlist deleted"
    fi
}

# Main test execution
main() {
    print_header "IPTV Player Backend API Tests"
    echo "API URL: $API_URL"
    echo "Test Email: $TEST_EMAIL"
    echo "Test Username: $TEST_USERNAME"

    print_header "Authentication Tests"
    test_health_check
    test_register
    test_get_current_user
    test_login

    print_header "Playlist CRUD Tests"
    test_create_playlist
    test_create_second_playlist
    test_get_all_playlists
    test_get_single_playlist
    test_update_playlist
    test_delete_playlist

    print_header "Channels Tests"
    test_get_channels

    print_header "Favorites CRUD Tests"
    test_create_favorite
    test_create_second_favorite
    test_get_all_favorites
    test_get_single_favorite
    test_delete_favorite
    test_delete_favorite_by_url

    print_header "Error Handling Tests"
    test_unauthorized_access
    test_invalid_playlist_data
    test_invalid_m3u_url
    test_duplicate_favorite
    test_invalid_favorite_data

    print_header "Cleanup Tests"
    test_logout
    cleanup

    print_header "All Tests Passed! ✓"
    echo -e "${GREEN}All API endpoints are working correctly${NC}\n"
}

# Run tests
main

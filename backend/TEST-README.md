# Backend API Testing

This directory contains comprehensive integration tests for the IPTV Player backend API.

## Test Script

### `test-api.sh`

A complete integration test suite that validates all backend API endpoints.

## Running Tests

### Prerequisites

1. Backend development server must be running:
   ```bash
   npm run dev
   ```

2. The server should be accessible at `http://localhost:8787` (default)

### Execute Tests

```bash
# From the backend directory
npm run test:api

# Or run directly
./test-api.sh

# Or specify custom API URL
API_URL=http://localhost:8787 ./test-api.sh
```

## Test Coverage

### Authentication Tests ✅
- **Health Check**: Verifies API is responding
- **User Registration**: Creates new user account with validation
- **Get Current User**: Retrieves authenticated user information
- **User Login**: Authenticates existing user and retrieves tokens
- **User Logout**: Invalidates current session

### Playlist CRUD Tests ✅
- **Create Playlist**: Creates new M3U playlist with validation
- **Create Second Playlist**: Tests multiple playlists per user
- **Get All Playlists**: Retrieves user's playlist collection
- **Get Single Playlist**: Fetches individual playlist (tests last_accessed tracking)
- **Update Playlist**: Modifies playlist name and M3U URL
- **Delete Playlist**: Removes playlist and verifies deletion

### Error Handling Tests ✅
- **Unauthorized Access**: Validates authentication requirements
- **Invalid Playlist Data**: Tests missing required fields
- **Invalid M3U URL**: Tests URL format validation

### Cleanup Tests ✅
- **Logout**: Session invalidation
- **Data Cleanup**: Removes test playlists

## Test Features

### Automatic Test Data Generation
- Generates unique test users using timestamps
- Format: `test_<timestamp>@example.com` / `testuser_<timestamp>`
- Prevents conflicts when running multiple test runs
- No manual cleanup required between runs

### Color-Coded Output
- 🔵 Blue headers for test sections
- 🟡 Yellow for test descriptions
- 🟢 Green checkmarks for passed tests
- 🔴 Red X for failed tests

### JSON Response Formatting
- Pretty-prints JSON responses using `jq`
- Makes test output easy to read and debug

### Automatic Cleanup
- Deletes test playlists after tests complete
- Logs out test user session
- Leaves database in clean state

## Test Output Example

```bash
========================================
IPTV Player Backend API Tests
========================================

API URL: http://localhost:8787
Test Email: test_1762227748@example.com
Test Username: testuser_1762227748

========================================
Authentication Tests
========================================

▶ Testing health check endpoint
✓ Health check passed
{
  "success": true,
  "message": "IPTV Player API",
  "version": "1.0.0"
}

▶ Testing user registration
✓ User registered successfully
{
  "id": "...",
  "email": "test_1762227748@example.com",
  "username": "testuser_1762227748"
}

... [more tests] ...

========================================
All Tests Passed! ✓
========================================

All API endpoints are working correctly
```

## Customization

### Environment Variables

- `API_URL`: Override default API URL (default: `http://localhost:8787`)

Example:
```bash
API_URL=http://localhost:3000 ./test-api.sh
```

### Test Data

Edit these variables in `test-api.sh`:
```bash
TIMESTAMP=$(date +%s)
TEST_EMAIL="test_${TIMESTAMP}@example.com"
TEST_USERNAME="testuser_${TIMESTAMP}"
TEST_PASSWORD="TestPass123@"
```

## Troubleshooting

### Tests Fail: "Connection refused"
- Ensure backend server is running: `npm run dev`
- Check that server is on port 8787
- Verify no firewall blocking localhost connections

### Tests Fail: Database errors
- Run database migrations: `npm run db:migrate`
- Check D1 database is properly configured in `wrangler.toml`

### Tests Fail: JWT errors
- Ensure JWT_SECRET is set in `.dev.vars` file
- Check environment variables are loaded by wrangler

### Test hangs during login
- Normal behavior - script includes 2-second delay to ensure unique JWT timestamps
- Required to prevent UNIQUE constraint violations on session tokens

## Dependencies

- `curl`: HTTP requests
- `jq`: JSON parsing and formatting
- `bash`: Shell execution

## Integration with CI/CD

The test script can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Start Backend
  run: |
    cd backend
    npm run dev &
    sleep 5  # Wait for server to start

- name: Run API Tests
  run: |
    cd backend
    npm run test:api
```

## Test Development

To add new tests:

1. Create a new test function following the pattern:
   ```bash
   test_new_feature() {
       print_test "Testing new feature"
       response=$(curl -s "$API_URL/api/endpoint" -H "Authorization: Bearer $ACCESS_TOKEN")
       if echo "$response" | grep -q '"success":true'; then
           print_success "New feature test passed"
       else
           print_error "New feature test failed: $response"
       fi
   }
   ```

2. Add the test function call to the `main()` function under the appropriate section

3. Ensure cleanup of any created resources in the `cleanup()` function

## License

Same as parent project (MIT)

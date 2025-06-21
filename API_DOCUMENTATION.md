# Disaster Response Coordination Platform - API Documentation

## Base URL
```
http://localhost:3000
```

## Authentication
Currently uses mock authentication with hard-coded users. Authentication is handled via `user_id` parameter in request bodies.

## Common Response Codes
- `200` - Success
- `201` - Created
- `204` - No Content (for delete operations)
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

---

## Health Check

### GET /health
Check the health and status of the API server.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-06-21T10:30:00.000Z",
  "uptime": 3600.5
}
```

---

## Disasters API

### GET /api/disasters
Retrieve a list of disasters with optional filtering and pagination.

**Query Parameters:**
- `tags` (string, optional) - Comma-separated list of tags to filter by (e.g., "flood,urgent")
- `tagsMatchMode` (string, optional) - Filter mode: "any" (default) or "all"
- `page` (integer, optional) - Page number for pagination (default: 1)
- `perPage` (integer, optional) - Items per page (default: 10)

**Example Request:**
```
GET /api/disasters?tags=flood,urgent&tagsMatchMode=any&page=1&perPage=5
```

**Response:**
```json
{
  "disasters": [
    {
      "id": "123",
      "title": "NYC Flood",
      "description": "Heavy flooding in Manhattan",
      "tags": ["flood", "urgent"],
      "location": {
        "type": "Point",
        "coordinates": [-74.0060, 40.7128]
      },
      "location_name": "Manhattan, NYC",
      "owner_id": "netrunnerX",
      "created_at": "2025-06-21T10:00:00.000Z",
      "audit_trail": [
        {
          "action": "create",
          "user_id": "netrunnerX",
          "timestamp": "2025-06-21T10:00:00.000Z"
        }
      ]
    }
  ],
  "page_info": {
    "current_page": 1,
    "per_page": 5,
    "has_more_pages": false,
    "total_count": 1
  }
}
```

### POST /api/disasters
Create a new disaster record.

**Request Body:**
```json
{
  "title": "NYC Flood",
  "description": "Heavy flooding in Manhattan due to heavy rainfall",
  "tags": "flood,urgent,evacuation",
  "location_name": "Manhattan, NYC",
  "user_id": "netrunnerX"
}
```

**Required Fields:**
- `title` (string) - Disaster title
- `description` (string) - Detailed description

**Optional Fields:**
- `tags` (string) - Comma-separated tags
- `location_name` (string) - Location description
- `user_id` (string) - User creating the disaster

**Response:**
```json
{
  "id": "124",
  "title": "NYC Flood",
  "description": "Heavy flooding in Manhattan due to heavy rainfall",
  "tags": ["flood", "urgent", "evacuation"],
  "location": {
    "type": "Point",
    "coordinates": [-74.0060, 40.7128]
  },
  "location_name": "Manhattan, NYC",
  "owner_id": "netrunnerX",
  "created_at": "2025-06-21T10:30:00.000Z",
  "audit_trail": [
    {
      "action": "create",
      "user_id": "netrunnerX",
      "timestamp": "2025-06-21T10:30:00.000Z"
    }
  ]
}
```

### PUT /api/disasters/:id
Update an existing disaster record.

**URL Parameters:**
- `id` (string) - Disaster ID

**Request Body:**
```json
{
  "title": "NYC Severe Flood",
  "description": "Heavy flooding in Manhattan with road closures",
  "tags": "flood,urgent,evacuation,road-closure",
  "location_name": "Manhattan, NYC",
  "user_id": "reliefAdmin"
}
```

**Response:**
```json
{
  "id": "124",
  "title": "NYC Severe Flood",
  "description": "Heavy flooding in Manhattan with road closures",
  "tags": ["flood", "urgent", "evacuation", "road-closure"],
  "location": {
    "type": "Point",
    "coordinates": [-74.0060, 40.7128]
  },
  "location_name": "Manhattan, NYC",
  "owner_id": "netrunnerX",
  "created_at": "2025-06-21T10:30:00.000Z",
  "audit_trail": [
    {
      "action": "create",
      "user_id": "netrunnerX",
      "timestamp": "2025-06-21T10:30:00.000Z"
    },
    {
      "action": "update",
      "user_id": "reliefAdmin",
      "timestamp": "2025-06-21T11:00:00.000Z"
    }
  ]
}
```

### DELETE /api/disasters/:id
Delete a disaster record.

**URL Parameters:**
- `id` (string) - Disaster ID

**Response:**
- Status: `204 No Content`

---

## Social Media API

### GET /api/disasters/:id/social-media
Retrieve social media posts related to a specific disaster.

**URL Parameters:**
- `id` (string) - Disaster ID

**Features:**
- Fetches posts from BlueSky platform
- Uses AI (Gemini) to generate relevant search queries
- Filters and reformats posts for relevance
- Implements caching to reduce API calls

**Response:**
```json
[
  {
    "id": "post_123",
    "content": "Heavy flooding reported in Manhattan. Need emergency supplies #flood #NYC",
    "author": "citizen_reporter",
    "created_at": "2025-06-21T10:45:00.000Z",
    "relevance_score": 0.95,
    "post_type": "alert",
    "location_mentioned": "Manhattan",
    "urgency_level": "high"
  },
  {
    "id": "post_124",
    "content": "Volunteers needed for flood relief in Lower East Side",
    "author": "relief_volunteer",
    "created_at": "2025-06-21T11:00:00.000Z",
    "relevance_score": 0.88,
    "post_type": "help_offer",
    "location_mentioned": "Lower East Side",
    "urgency_level": "medium"
  }
]
```

**Error Responses:**
- `404` - Disaster not found or no social media posts found
- `500` - Failed to fetch disaster data or social media posts

---

## Resources API

### GET /api/disasters/:id/resources
Retrieve resources near a specific disaster location using geospatial queries.

**URL Parameters:**
- `id` (string) - Disaster ID

**Query Parameters:**
- `lat` (float, required) - Latitude coordinate
- `lon` (float, required) - Longitude coordinate

**Example Request:**
```
GET /api/disasters/123/resources?lat=40.7128&lon=-74.0060
```

**Features:**
- Uses Supabase geospatial queries (ST_DWithin)
- Default search radius: 10km
- Implements caching for performance

**Response:**
```json
[
  {
    "id": "resource_1",
    "disaster_id": "123",
    "name": "Red Cross Emergency Shelter",
    "location_name": "Lower East Side, NYC",
    "location": {
      "type": "Point",
      "coordinates": [-73.9857, 40.7484]
    },
    "type": "shelter",
    "capacity": 200,
    "current_occupancy": 150,
    "contact_info": {
      "phone": "+1-555-RED-CROSS",
      "email": "shelter@redcross.org"
    },
    "resources_available": ["food", "water", "medical_aid"],
    "created_at": "2025-06-21T09:00:00.000Z"
  },
  {
    "id": "resource_2",
    "disaster_id": "123",
    "name": "NYC Emergency Food Distribution",
    "location_name": "Manhattan Community Center",
    "location": {
      "type": "Point",
      "coordinates": [-74.0060, 40.7128]
    },
    "type": "food_distribution",
    "operating_hours": "8:00 AM - 8:00 PM",
    "contact_info": {
      "phone": "+1-555-NYC-FOOD"
    },
    "resources_available": ["food", "water", "clothing"],
    "created_at": "2025-06-21T09:30:00.000Z"
  }
]
```

**Error Responses:**
- `404` - No resources found for this disaster
- `500` - Failed to fetch resources

---

## Data Models

### Disaster Object
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "tags": ["string"],
  "location": {
    "type": "Point",
    "coordinates": [longitude, latitude]
  },
  "location_name": "string",
  "owner_id": "string",
  "created_at": "ISO8601 timestamp",
  "audit_trail": [
    {
      "action": "string",
      "user_id": "string",
      "timestamp": "ISO8601 timestamp"
    }
  ]
}
```

### Resource Object
```json
{
  "id": "string",
  "disaster_id": "string",
  "name": "string",
  "location_name": "string",
  "location": {
    "type": "Point",
    "coordinates": [longitude, latitude]
  },
  "type": "string",
  "created_at": "ISO8601 timestamp"
}
```

### Social Media Post Object
```json
{
  "id": "string",
  "content": "string",
  "author": "string",
  "created_at": "ISO8601 timestamp",
  "relevance_score": "number",
  "post_type": "string",
  "location_mentioned": "string",
  "urgency_level": "string"
}
```

---

## External Integrations

### Google Gemini AI
- **Location Extraction**: Extracts location names from disaster descriptions
- **Query Generation**: Generates relevant search queries for social media
- **Content Filtering**: Filters and reformats social media posts for relevance

### BlueSky Social Media Platform
- **Authentication**: Uses app-specific credentials
- **Post Search**: Searches for posts using generated queries
- **Rate Limiting**: Handled through caching mechanism

### Supabase Database
- **Geospatial Queries**: Uses PostGIS for location-based searches
- **Caching**: Implements TTL-based caching for external API responses
- **Audit Trails**: Tracks all changes to disaster records

---

## Caching Strategy

The API implements intelligent caching to improve performance and reduce external API calls:

- **Cache Duration**: 1 hour TTL for social media and resource data
- **Cache Keys**: Format `disaster:{id}:{endpoint}`
- **Storage**: Supabase cache table with JSONB values
- **Invalidation**: Automatic expiration based on `expires_at` field

---

## Error Handling

All endpoints implement comprehensive error handling:

- **Validation Errors**: Return 400 with descriptive error messages
- **Database Errors**: Logged server-side, return 500 with generic message
- **External API Failures**: Graceful fallback with appropriate error codes
- **Authentication Errors**: Currently minimal due to mock auth system

---

## Rate Limiting

Currently commented out but designed to be implemented:
- Basic rate limiting middleware available
- Can be enabled by uncommenting in `app.js`

---

## Logging

Structured logging implemented using Morgan:
- **Format**: Combined format for production
- **Actions**: Logs all database operations and external API calls
- **Errors**: Comprehensive error logging with stack traces

---

## Future Endpoints (Planned)

Based on the application structure, these endpoints are planned but not yet implemented:

- `POST /api/disasters/:id/verify-image` - Image verification using Gemini AI
- `POST /api/geocode` - Location extraction and geocoding
- `GET /api/disasters/:id/official-updates` - Government/relief website updates

---

## Sample Mock Data

### Disaster Sample:
```json
{
  "title": "NYC Flood",
  "location_name": "Manhattan, NYC",
  "description": "Heavy flooding in Manhattan",
  "tags": ["flood", "urgent"],
  "owner_id": "netrunnerX"
}
```

### Report Sample:
```json
{
  "disaster_id": "123",
  "user_id": "citizen1",
  "content": "Need food in Lower East Side",
  "image_url": "http://example.com/flood.jpg",
  "verification_status": "pending"
}
```

### Resource Sample:
```json
{
  "disaster_id": "123",
  "name": "Red Cross Shelter",
  "location_name": "Lower East Side, NYC",
  "type": "shelter"
}
```

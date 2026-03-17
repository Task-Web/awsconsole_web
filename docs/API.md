# Base Site API Reference

This document describes all API endpoints exposed by `basesite`. All endpoints are cookie-scoped:
each user has isolated state identified by a `user_id` cookie. Cookies are automatically set on
first request if not present.

## Cookie Identity

- Cookie name: `user_id` (configurable via `COOKIE_NAME` env var)
- Cookie max age: 30 days (configurable via `COOKIE_MAX_AGE` env var)
- Query parameter override: Add `?cookie=<value>` to any request to pin identity

## Endpoints

### State Management

#### GET /api/state

Retrieve the current user's state.

**Response** `200 OK`
```json
{
  "user_id": "abc123",
  "state": {
    "meta": {
      "created_at": "2024-04-01T12:00:00+00:00",
      "updated_at": "2024-04-01T12:30:00+00:00",
      "version": 2,
      "type": "unrestricted"
    },
    "data": {
      "examples": {
        "huggingface_file": {
          "url": "https://huggingface.co/datasets/...",
          "note": "Initial example file reference."
        }
      },
      "uploads": []
    },
    "note": null
  }
}
```

---

#### PUT /api/state

Replace the entire user state.

**Request Body**
```json
{
  "data": { ... },
  "note": "Optional description of this state",
  "meta": {
    "created_at": "...",
    "updated_at": "...",
    "version": 1,
    "type": "unrestricted"
  }
}
```

- `data` (required): The new state data object
- `note` (optional): Human-readable note describing the change
- `meta` (optional): If provided, sets envelope metadata explicitly; otherwise auto-generated

**Response** `200 OK`
```json
{
  "user_id": "abc123",
  "state": { ... }
}
```

**Error Response** `400 Bad Request`
```json
{
  "detail": "Invalid JSON body"
}
```

---

#### PATCH /api/state

Merge data into existing state. Uses shallow merge on the `data` object.

**Request Body**
```json
{
  "data": { "key": "value" },
  "note": "Optional description"
}
```

- `data` (required): Fields to merge into existing state data
- `note` (optional): Human-readable note describing the change

**Response** `200 OK`
```json
{
  "user_id": "abc123",
  "state": { ... }
}
```

**Error Response** `400 Bad Request`
```json
{
  "detail": "Invalid JSON body"
}
```

---

#### DELETE /api/state

Reset user state to defaults and delete all uploaded files for this user.

**Response** `200 OK`
```json
{
  "user_id": "abc123",
  "state": {
    "meta": { ... },
    "data": {
      "examples": { ... },
      "uploads": []
    },
    "note": null
  }
}
```

---

### File Operations

#### POST /api/files

Upload one or more files for the current user.

**Request**
- Content-Type: `multipart/form-data`
- Field name: `files` (can be repeated for multiple files)

**Response** `200 OK`
```json
[
  {
    "id": "b5b0c835dfe64f0d8b800d5c1700f9f9",
    "name": "report.pdf",
    "filename": "b5b0c835dfe64f0d8b800d5c1700f9f9__report.pdf",
    "type": "application/pdf",
    "size": 84231,
    "url": "/api/files/b5b0c835dfe64f0d8b800d5c1700f9f9__report.pdf",
    "uploaded_at": "2024-04-01T12:10:00+00:00"
  }
]
```

**Error Responses**
- `400 Bad Request`: `{"detail": "No files provided"}`
- `500 Internal Server Error`: `{"detail": "Failed to upload files"}`

---

#### GET /api/files

List all files uploaded by the current user.

**Response** `200 OK`
```json
[
  {
    "id": "b5b0c835dfe64f0d8b800d5c1700f9f9",
    "name": "report.pdf",
    "filename": "b5b0c835dfe64f0d8b800d5c1700f9f9__report.pdf",
    "type": "application/pdf",
    "size": 84231,
    "url": "/api/files/b5b0c835dfe64f0d8b800d5c1700f9f9__report.pdf",
    "uploaded_at": "2024-04-01T12:10:00+00:00"
  }
]
```

**Error Response** `500 Internal Server Error`
```json
{
  "detail": "Failed to list files"
}
```

---

#### GET /api/files/{filename}

Download a specific file. The `filename` includes the ID prefix (e.g., `<id>__<name>`).

**Response** `200 OK`
- Content-Type: Detected from file extension
- Content-Disposition: `attachment; filename="<original_name>"`
- Body: File binary content

**Error Responses**
- `404 Not Found`: `{"detail": "File not found"}`
- `500 Internal Server Error`: `{"detail": "Failed to read file"}`

---

### System Information

#### GET /api/info

Returns system and request information.

**Response** `200 OK`
```json
{
  "app_name": "Base Experiment Site",
  "node_version": "v20.10.0",
  "env": {
    "node_version": "v20.10.0",
    "platform": "linux",
    "env_mode": "development"
  },
  "request": {
    "client": "127.0.0.1",
    "headers": { ... },
    "path": "/api/info",
    "method": "GET",
    "user_id": "abc123"
  }
}
```

---

#### GET /health

Health check endpoint.

**Response** `200 OK`
```json
{
  "status": "ok"
}
```

---

## Error Format

All error responses follow this format:
```json
{
  "detail": "Error message describing what went wrong"
}
```

## TypeScript Types

See `src/lib/types.ts` for complete type definitions:

- `StateMeta`: State metadata (timestamps, version)
- `UserState<T>`: State envelope with `meta`, `data`, `note`
- `StateResponse<T>`: API response wrapper with `user_id` and `state`
- `StateRequest<T>`: PUT request body
- `StatePatchRequest<T>`: PATCH request body
- `FileMetadata`: Uploaded file metadata
- `InfoResponse`: System info response

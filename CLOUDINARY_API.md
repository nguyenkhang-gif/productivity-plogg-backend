# Cloudinary Upload API

All endpoints require a valid JWT cookie (same auth as every other protected route).

Base URL: `/api/cloudinary`

Files are stored in Cloudinary under `{folder}/{userId}/` — each user's files are isolated by their ID.

---

## Endpoints

### POST `/api/cloudinary/upload`

Upload a general file (image, video, document, etc.).

**Request** — `multipart/form-data`

| Field | Type   | Required | Description         |
|-------|--------|----------|---------------------|
| file  | File   | Yes      | Any file to upload  |

**Response `200`**
```json
{
  "url": "https://res.cloudinary.com/dsr4rajwm/image/upload/v.../uploads/userId/filename.jpg"
}
```

---

### POST `/api/cloudinary/icon`

Upload an icon file. Stored separately under `icons/{userId}/`.

**Request** — `multipart/form-data`

| Field | Type | Required | Description       |
|-------|------|----------|-------------------|
| file  | File | Yes      | Icon file to upload |

**Response `200`**
```json
{
  "url": "https://res.cloudinary.com/dsr4rajwm/image/upload/v.../icons/userId/filename.png"
}
```

---

### GET `/api/cloudinary/files`

List uploaded files for the authenticated user (from `uploads/` folder).

**Query Parameters**

| Param | Type   | Default | Description           |
|-------|--------|---------|-----------------------|
| page  | number | 1       | Page number           |
| limit | number | 20      | Items per page (max 500 total fetched) |

**Response `200`**
```json
{
  "items": [
    {
      "publicId": "uploads/userId/sample_image",
      "url": "https://res.cloudinary.com/dsr4rajwm/image/upload/v.../uploads/userId/sample_image.jpg",
      "format": "jpg",
      "size": 204800,
      "createdAt": "2026-04-29T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### GET `/api/cloudinary/icons`

List uploaded icons for the authenticated user (from `icons/` folder).

**Query Parameters**

| Param | Type   | Default | Description |
|-------|--------|---------|-------------|
| page  | number | 1       | Page number |
| limit | number | 20      | Items per page |

**Response `200`** — same shape as `/files`

---

### DELETE `/api/cloudinary/files/*publicId`

Delete a file by its Cloudinary `publicId`. The publicId can contain slashes (e.g. `uploads/userId/filename`).

**URL Example**
```
DELETE /api/cloudinary/files/uploads/abc123/my_image
```

**Response `204 No Content`**

> Note: Get the `publicId` from the `items[].publicId` field returned by the list endpoints. Do **not** use the full URL.

---

## Usage Examples

### Upload a file

```js
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const res = await fetch('/api/cloudinary/upload', {
  method: 'POST',
  credentials: 'include',
  body: formData,
});
const { url } = await res.json();
```

### List files with pagination

```js
const res = await fetch('/api/cloudinary/files?page=1&limit=20', {
  credentials: 'include',
});
const { items, pagination } = await res.json();
```

### Delete a file

```js
// publicId from list endpoint: "uploads/userId/my_image"
const publicId = 'uploads/userId/my_image';

await fetch(`/api/cloudinary/files/${publicId}`, {
  method: 'DELETE',
  credentials: 'include',
});
```

---

## Notes

- Files are sorted by `created_at` descending (newest first).
- `publicId` does **not** include the file extension.
- The API fetches up to 500 files from Cloudinary and paginates in memory — suitable for typical user libraries.
- Both `uploads` and `icons` folders are scoped per user — users cannot access each other's files via these endpoints.

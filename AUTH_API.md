# Auth API

Base URL: `/api/auth`

Authentication sử dụng **JWT Bearer Token**. Sau khi login, đính kèm token vào header:
```
Authorization: Bearer <access_token>
```

---

## Endpoints

### POST `/api/auth/register`

Tạo tài khoản mới.

**Request Body** — `application/json`

| Field      | Type   | Required | Constraint              |
|------------|--------|----------|-------------------------|
| fullName   | string | Yes      |                         |
| username   | string | Yes      |                         |
| email      | string | Yes      | Valid email format      |
| password   | string | Yes      | Minimum 6 characters   |
| gender     | string | Yes      | `male` \| `female` \| `other` |
| profilePic | string | No       | URL string              |

**Response `201`**
```json
{
  "id": "664f1a2b3c4d5e6f7a8b9c0d",
  "fullName": "Nguyen Khang",
  "username": "khang915",
  "email": "khang@example.com",
  "gender": "male",
  "profilePic": null,
  "membership": null,
  "role": "user",
  "createdAt": "2026-04-29T10:00:00.000Z",
  "updatedAt": "2026-04-29T10:00:00.000Z"
}
```

**Errors**
| Status | Condition                      |
|--------|-------------------------------|
| 409    | Email hoặc username đã tồn tại |
| 400    | Body không hợp lệ             |

---

### POST `/api/auth/login`

Đăng nhập, nhận về access token.

**Request Body** — `application/json`

| Field    | Type   | Required |
|----------|--------|----------|
| email    | string | Yes      |
| password | string | Yes      |

**Response `200`**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors**
| Status | Condition                    |
|--------|------------------------------|
| 401    | Sai email hoặc password      |

---

### GET `/api/auth/profile`

Lấy thông tin profile của user đang đăng nhập.

**Headers**
```
Authorization: Bearer <access_token>
```

**Response `200`**
```json
{
  "id": "664f1a2b3c4d5e6f7a8b9c0d",
  "fullName": "Nguyen Khang",
  "username": "khang915",
  "email": "khang@example.com",
  "gender": "male",
  "profilePic": "https://res.cloudinary.com/...",
  "membership": null,
  "role": "user",
  "createdAt": "2026-04-29T10:00:00.000Z",
  "updatedAt": "2026-04-29T10:00:00.000Z"
}
```

**Errors**
| Status | Condition           |
|--------|---------------------|
| 401    | Token không hợp lệ  |
| 404    | User không tồn tại  |

---

### PATCH `/api/auth/profile`

Cập nhật thông tin profile. Chỉ gửi các field muốn thay đổi.

**Headers**
```
Authorization: Bearer <access_token>
```

**Request Body** — `application/json` (tất cả optional)

| Field      | Type   | Constraint     |
|------------|--------|----------------|
| fullName   | string |                |
| username   | string |                |
| gender     | string |                |
| profilePic | string | Valid URL       |

**Response `200`**
```json
{
  "id": "664f1a2b3c4d5e6f7a8b9c0d",
  "fullName": "Nguyen Khang Updated",
  "username": "khang_new",
  "email": "khang@example.com",
  "gender": "male",
  "profilePic": "https://res.cloudinary.com/dsr4rajwm/image/upload/v.../icons/userId/avatar.png",
  "membership": null,
  "role": "user",
  "createdAt": "2026-04-29T10:00:00.000Z",
  "updatedAt": "2026-04-29T11:00:00.000Z"
}
```

**Errors**
| Status | Condition                        |
|--------|----------------------------------|
| 401    | Token không hợp lệ               |
| 409    | Username đã được dùng bởi user khác |
| 400    | Body không hợp lệ               |

---

## JWT Token

Token được ký bằng `JWT_SECRET_KEY` và có thời hạn theo `JWT_EXPIRATION_TIME` trong env.

Payload của token:
```json
{
  "email": "khang@example.com",
  "sub": "664f1a2b3c4d5e6f7a8b9c0d",
  "role": "user",
  "iat": 1714388400,
  "exp": 1714392000
}
```

---

## Usage Flow

```js
// 1. Register
const res = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fullName: 'Nguyen Khang',
    username: 'khang915',
    email: 'khang@example.com',
    password: 'secret123',
    gender: 'male',
  }),
});

// 2. Login
const { access_token } = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'khang@example.com', password: 'secret123' }),
}).then(r => r.json());

// 3. Get profile
const profile = await fetch('/api/auth/profile', {
  headers: { Authorization: `Bearer ${access_token}` },
}).then(r => r.json());

// 4. Update profile
const updated = await fetch('/api/auth/profile', {
  method: 'PATCH',
  headers: {
    Authorization: `Bearer ${access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    fullName: 'Nguyen Khang Updated',
    profilePic: 'https://res.cloudinary.com/...',
  }),
}).then(r => r.json());
```

---

## Notes

- `passwordHash` và `resetPasswordToken` không bao giờ được trả về trong response.
- `role` hiện tại mặc định là `"user"` khi register. Các giá trị có thể là `"user"`, `"admin"`, `"moderator"`.
- Email không thể thay đổi sau khi đăng ký.

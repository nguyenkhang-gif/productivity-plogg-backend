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

### GET `/api/auth/google`

Khởi động luồng đăng nhập Google OAuth 2.0. Browser sẽ được redirect đến trang đăng nhập Google.

> Không gọi endpoint này bằng `fetch` — phải mở trực tiếp trên browser hoặc dùng `window.location.href`.

**Response**: Redirect `302` → Google login page

---

### GET `/api/auth/google/callback`

Callback sau khi Google xác thực xong. Không gọi trực tiếp — Google tự redirect về đây.

**Response**: Redirect `302` → `FRONTEND_URL/auth/callback?token=<access_token>`

Frontend đọc `token` từ query string và lưu vào localStorage/cookie.

---

### GET `/api/auth/facebook`

Khởi động luồng đăng nhập Facebook OAuth 2.0. Browser sẽ được redirect đến trang đăng nhập Facebook.

> Không gọi endpoint này bằng `fetch` — phải mở trực tiếp trên browser hoặc dùng `window.location.href`.

**Response**: Redirect `302` → Facebook login page

---

### GET `/api/auth/facebook/callback`

Callback sau khi Facebook xác thực xong. Không gọi trực tiếp — Facebook tự redirect về đây.

**Response**: Redirect `302` → `FRONTEND_URL/auth/callback?token=<access_token>`

Frontend đọc `token` từ query string và lưu vào localStorage/cookie.

**Lưu ý đặc biệt với Facebook:**
- Nếu user đăng ký Facebook bằng số điện thoại (không có email), hệ thống vẫn tạo được account nhưng email trong DB sẽ là placeholder dạng `fb_<facebookId>@placeholder.local`.
- Nếu user đăng nhập Facebook có email trùng với account hiện có → hệ thống tự động link `facebookId` vào account đó (không tạo account mới).

---

## OAuth Flow

```
Browser → GET /api/auth/google (hoặc /facebook)
       → Redirect đến Google/Facebook login
       → User đăng nhập
       → Google/Facebook redirect về /callback
       → Server tạo/link account, ký JWT
       → Redirect về FRONTEND_URL/auth/callback?token=<jwt>
       → Frontend lưu token, dùng cho các request tiếp theo
```

```js
// Frontend: khởi động OAuth
window.location.href = 'http://localhost:8000/api/auth/facebook';

// Frontend: xử lý callback (trang /auth/callback)
const params = new URLSearchParams(window.location.search);
const token = params.get('token');
localStorage.setItem('access_token', token);
```

---

## Setup OAuth Providers

### Google OAuth

1. Vào [Google Cloud Console](https://console.cloud.google.com)
2. Tạo project hoặc chọn project có sẵn
3. **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
4. Application type: **Web application**
5. Thêm vào **Authorized redirect URIs**:
   - `http://localhost:8000/api/auth/google/callback` (local dev)
   - `https://your-domain.com/api/auth/google/callback` (production)
6. Copy **Client ID** và **Client Secret** vào `.env`

```env
GOOGLE_CLIENT_ID=<client_id>
GOOGLE_CLIENT_SECRET=<client_secret>
GOOGLE_CALLBACK_URL=http://localhost:8000/api/auth/google/callback
```

---

### Facebook OAuth — Hướng dẫn tạo App trên developers.facebook.com

#### Bước 1: Tạo Facebook App

1. Vào [developers.facebook.com](https://developers.facebook.com) → đăng nhập bằng tài khoản Facebook cá nhân
2. Nhấn **My Apps → Create App**
3. Chọn use case: **Authenticate and request data from users with Facebook Login**
4. Nhấn **Next**
5. Nhập **App name** (ví dụ: `Plog Dev`) và **App contact email**
6. Nhấn **Create App** → xác nhận mật khẩu Facebook nếu được hỏi

#### Bước 2: Cấu hình Facebook Login

1. Trong dashboard của App vừa tạo, tìm product **Facebook Login** → nhấn **Set up**
2. Chọn platform **Web**
3. Nhập Site URL: `http://localhost:3000` (hoặc domain production) → **Save**
4. Vào **Facebook Login → Settings** (sidebar trái)
5. Trong **Valid OAuth Redirect URIs**, thêm:
   ```
   http://localhost:8000/api/auth/facebook/callback
   ```
   (production: `https://your-domain.com/api/auth/facebook/callback`)
6. Bật **Login with the JavaScript SDK**: OFF (không cần vì dùng server-side)
7. Nhấn **Save Changes**

#### Bước 3: Lấy App ID và App Secret

1. Vào **App Settings → Basic** (sidebar trái)
2. Copy **App ID** và **App Secret** (nhấn Show để hiện secret)
3. Điền vào `.env`:

```env
FACEBOOK_APP_ID=<app_id>
FACEBOOK_APP_SECRET=<app_secret>
FACEBOOK_CALLBACK_URL=http://localhost:8000/api/auth/facebook/callback
```

#### Bước 4: Cấu hình permissions (scopes)

App mới mặc định chỉ có `public_profile`. Để lấy email:

1. Vào **App Review → Permissions and Features**
2. Tìm permission **email** → nhấn **Add** (không cần submit review cho email trong môi trường dev)
3. Trong **Development mode**, chỉ tester được thêm vào mới đăng nhập được

#### Bước 5: Thêm tester (chỉ cần trong Development mode)

1. Vào **Roles → Test Users** hoặc **Roles → Roles**
2. Nhấn **Add Testers** → nhập Facebook username/email của người cần test
3. Người được mời cần accept invite tại [developers.facebook.com/apps](https://developers.facebook.com/apps) → **Pending** → **Accept**

#### Bước 6: Chuyển sang Live mode (Production)

Khi deploy production:

1. Vào **App Settings → Basic**
2. Điền đầy đủ: **Privacy Policy URL**, **Terms of Service URL**, **App Icon** (required)
3. Chuyển toggle từ **Development** → **Live**
4. Cập nhật **Valid OAuth Redirect URIs** với domain production
5. Cập nhật `FACEBOOK_CALLBACK_URL` trong `.env` production

> **Lưu ý**: Trong Development mode, chỉ Facebook account được thêm vào Roles → Testers mới đăng nhập được app. Live mode thì tất cả user đều dùng được.

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

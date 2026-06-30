# Zira Chat Authentication System Documentation

This document outlines the redesigned, email-based authentication system for Zira Chat, replacing the legacy Firebase phone-number verification.

## 1. Environment Variables Guide

Ensure the following variables are configured in `apps/server/.env`:

```env
# Server settings
PORT=4000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb://localhost:27017/zirachat

# JWT Secret keys
JWT_SECRET=NFkvlWFbZEnlrJrVi0zRjO3yiB4T5vjKxhCqVywr2xM=
JWT_REFRESH_SECRET=f0RnjPmaOlCYxsBUuwe0elJJXMzp29QCR9MNK9hFBu0=

# Gmail SMTP Authentication Settings
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password
```

---

## 2. Gmail SMTP Setup Guide

To allow Zira Chat to send OTP emails, you must configure a Gmail App Password:

1. Go to your **Google Account settings**.
2. Enable **2-Step Verification** (required for App Passwords).
3. Search for or select **App Passwords**.
4. Generate a new App Password, select **Other (custom name)**, name it `Zira Chat`, and copy the generated 16-character code.
5. Place this code into the `GMAIL_APP_PASSWORD` environment variable (without spaces).

---

## 3. Database Schema Documentation

### User Schema (`User` Model)

| Field | Type | Attributes | Description |
|---|---|---|---|
| `_id` | ObjectId | Auto-generated | Unique identifier |
| `email` | String | Unique, Index, Required | Registered user email |
| `username` | String | Unique, Index, Required | 5-20 characters identifier |
| `password` | String | Required | bcrypt hashed password |
| `profilePhoto` | String | Default: `""` | URL to profile avatar |
| `bio` | String | Default: `"Hey there! I am using Zira Chat."` | User status message |
| `isOnline` | Boolean | Default: `false` | Real-time presence flag |
| `emailVerified` | Boolean | Default: `false` | True after successful OTP verification |
| `lastSeen` | Date | Default: `Date.now` | Last activity timestamp |
| `settings` | Object | Nested | Theme, notifications, privacy details |
| `mutedChats` | Array of ObjectId | Ref: `Chat` | Muted chat conversations |
| `blockedUsers` | Array of ObjectId | Ref: `User` | Blocked user IDs |

### OTP Schema (`Otp` Model)

| Field | Type | Attributes | Description |
|---|---|---|---|
| `email` | String | Required, Index | Target email address |
| `otpHash` | String | Required | Hashed 6-digit verification code |
| `expiresAt` | Date | TTL Index (Expires in 10m) | Expiration timestamp |
| `type` | String | Enum (`"verification"`, `"password_reset"`) | OTP action category |
| `attempts` | Number | Default: `0` | Verification attempts (Max 5) |
| `verified` | Boolean | Default: `false` | Set to true after validation |
| `lastSentAt` | Date | Default: `Date.now` | Cooldown check timestamp |

---

## 4. API Endpoints Documentation

### Registration Flow

#### 1. Send OTP
* **URL**: `/api/v1/auth/send-otp`
* **Method**: `POST`
* **Body**:
  ```json
  {
    "email": "user@example.com"
  }
  ```
* **Response**: `200 OK` on success, `409 Conflict` if email already registered. Includes 60s cooldown limit.

#### 2. Verify OTP
* **URL**: `/api/v1/auth/verify-otp`
* **Method**: `POST`
* **Body**:
  ```json
  {
    "email": "user@example.com",
    "otp": "123456"
  }
  ```
* **Response**: `200 OK` on success. Rate limited after 5 failed attempts.

#### 3. Complete Registration
* **URL**: `/api/v1/auth/register`
* **Method**: `POST`
* **Body**:
  ```json
  {
    "email": "user@example.com",
    "otp": "123456",
    "username": "user123",
    "password": "Password123!",
    "confirmPassword": "Password123!"
  }
  ```
* **Response**: `201 Created` returning user model and JWT access token.

---

### Login Flow

#### Authenticate Credentials
* **URL**: `/api/v1/auth/login`
* **Method**: `POST`
* **Body**:
  ```json
  {
    "username": "user123",
    "password": "Password123!"
  }
  ```
* **Response**: `200 OK` returning user model, JWT token, and setting HTTP-Only cookie refresh token.

---

### Forgot Password Flow

#### 1. Request Reset OTP
* **URL**: `/api/v1/auth/forgot-password/send-otp`
* **Method**: `POST`
* **Body**:
  ```json
  {
    "username": "user123"
  }
  ```
* **Response**: `200 OK` with generic message to prevent username enumeration.

#### 2. Verify Reset OTP
* **URL**: `/api/v1/auth/forgot-password/verify-otp`
* **Method**: `POST`
* **Body**:
  ```json
  {
    "username": "user123",
    "otp": "123456"
  }
  ```
* **Response**: `200 OK` on validation.

#### 3. Update Password
* **URL**: `/api/v1/auth/forgot-password/reset`
* **Method**: `POST`
* **Body**:
  ```json
  {
    "username": "user123",
    "otp": "123456",
    "password": "NewSecurePassword1!",
    "confirmPassword": "NewSecurePassword1!"
  }
  ```
* **Response**: `200 OK` on password change. All active sessions are revoked.

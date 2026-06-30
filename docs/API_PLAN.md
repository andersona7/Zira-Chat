# API and Real-Time Event Planning

## RESTful Endpoints (Express.js)

### Authentication (`/api/v1/auth`)
* `POST /register`: Create account.
* `POST /login`: Authenticate and return tokens.
* `POST /refresh`: Rotate refresh token.
* `POST /logout`: Invalidate session.

### Users (`/api/v1/users`)
* `GET /me`: Get current user profile.
* `PATCH /me`: Update profile/settings.
* `GET /search`: Search users by phone/name.

### Chats (`/api/v1/chats`)
* `GET /`: Fetch user's chat list with pagination.
* `POST /direct`: Create or get a 1-to-1 chat.
* `POST /group`: Create a new group.
* `GET /:chatId/messages`: Fetch message history (cursor-based pagination).

### Media (`/api/v1/media`)
* `POST /upload`: Secure pre-signed URL generation or direct buffer upload to Cloudinary.

## WebSocket Events (Socket.IO)

### Client to Server (Emits)
* `join_chat`: Subscribes to a specific chat room.
* `send_message`: Payload containing message data.
* `typing_start` / `typing_end`: Broadcasts typing indicator.
* `mark_read`: Updates message status.
* `call_initiate`: WebRTC signaling offer.

### Server to Client (Listens)
* `receive_message`: Incoming new message.
* `message_status_update`: Updates UI checks (Sent -> Delivered -> Read).
* `user_presence_update`: Online/Offline status changes.
* `incoming_call`: WebRTC incoming signaling.
# Database Design (MongoDB)

## Collections and Schema Definitions

### 1. Users Collection
```json
{
  "_id": "ObjectId",
  "phoneNumber": "String (Unique, Indexed)",
  "email": "String (Optional)",
  "passwordHash": "String",
  "displayName": "String",
  "avatarUrl": "String",
  "about": "String",
  "publicKey": "String",
  "status": "Enum ['ONLINE', 'OFFLINE']",
  "lastSeen": "Date",
  "settings": {
    "theme": "Enum ['LIGHT', 'DARK', 'SYSTEM']",
    "readReceipts": "Boolean",
    "lastSeenPrivacy": "Enum ['EVERYONE', 'CONTACTS', 'NOBODY']"
  },
  "createdAt": "Date",
  "updatedAt": "Date"
}

### 2. Chats Collection (1-to-1 and Groups)
```json
{
  "_id": "ObjectId",
  "type": "Enum ['DIRECT', 'GROUP']",
  "participants": ["ObjectId (Ref: Users)"],
  "groupMetadata": {
    "name": "String",
    "description": "String",
    "avatarUrl": "String",
    "admins": ["ObjectId (Ref: Users)"],
    "joinLink": "String"
  },
  "lastMessage": "ObjectId (Ref: Messages)",
  "unreadCounts": {
    "userId_1": "Number",
    "userId_2": "Number"
  },
  "createdAt": "Date",
  "updatedAt": "Date"
}

### 3. Messages Collection
```json
{
  "_id": "ObjectId",
  "chatId": "ObjectId (Ref: Chats, Indexed)",
  "senderId": "ObjectId (Ref: Users, Indexed)",
  "type": "Enum ['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'SYSTEM']",
  "content": "String (Encrypted/Plain)",
  "media": {
    "url": "String",
    "publicId": "String",
    "mimeType": "String",
    "size": "Number",
    "duration": "Number"
  },
  "replyTo": "ObjectId (Ref: Messages)",
  "status": "Enum ['SENT', 'DELIVERED', 'READ']",
  "deliveredTo": ["ObjectId (Ref: Users)"],
  "readBy": ["ObjectId (Ref: Users)"],
  "reactions": [
    {
      "emoji": "String",
      "userId": "ObjectId"
    }
  ],
  "isDeleted": "Boolean",
  "createdAt": "Date"
}
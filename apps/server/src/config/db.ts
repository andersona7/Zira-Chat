import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI as string);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Automatically clean up legacy phone number index
    const db = conn.connection.db;
    if (db) {
      const usersCollections = await db.listCollections({ name: 'users' }).toArray();
      if (usersCollections.length > 0) {
        try {
          await db.collection('users').dropIndex('phoneNumber_1');
          console.log('✅ Legacy phoneNumber_1 index dropped or already removed.');
        } catch (indexErr: any) {
          if (indexErr.codeName !== 'IndexNotFound') {
            console.warn('⚠️ Warning checking/dropping legacy phone index:', indexErr.message);
          }
        }
      }

      const statusesCollections = await db.listCollections({ name: 'statuses' }).toArray();
      if (statusesCollections.length > 0) {
        try {
          await db.collection('statuses').dropIndex('expiresAt_1');
          console.log('✅ Legacy statuses expiresAt_1 index dropped or already removed.');
        } catch (indexErr: any) {
          if (indexErr.codeName !== 'IndexNotFound') {
            console.warn('⚠️ Warning checking/dropping legacy statuses index:', indexErr.message);
          }
        }
      }

      const sessionsCollections = await db.listCollections({ name: 'sessions' }).toArray();
      if (sessionsCollections.length > 0) {
        try {
          await db.collection('sessions').dropIndex('refreshToken_1');
          console.log('✅ Legacy sessions refreshToken_1 index dropped or already removed.');
        } catch (indexErr: any) {
          if (indexErr.codeName !== 'IndexNotFound') {
            console.warn('⚠️ Warning checking/dropping legacy sessions index:', indexErr.message);
          }
        }
      }
    }
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${(error as Error).message}`);
    process.exit(1);
  }
};
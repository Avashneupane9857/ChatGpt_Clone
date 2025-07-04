import mongoose, { Connection } from "mongoose";

interface CachedConnection {
  conn: Connection | null;
  promise: Promise<Connection> | null;
}

declare global {
  var mongoose: CachedConnection | undefined;
}

const cached: CachedConnection = global.mongoose || { conn: null, promise: null };

export default async function connectDB(): Promise<Connection> {
  if (cached.conn) return cached.conn;
  
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB as string).then((mongoose) => {
      return mongoose.connection;
    });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
  
  return cached.conn;
}
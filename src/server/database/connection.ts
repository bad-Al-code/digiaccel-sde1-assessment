import mongoose, { type Mongoose } from 'mongoose';
import { env, isProduction } from '../config/env';
import { logger } from '../core/logger';

interface ConnectionCache {
  connection: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

const globalForMongo = globalThis as typeof globalThis & {
  __todoMongoCache?: ConnectionCache;
};

const cache: ConnectionCache = (globalForMongo.__todoMongoCache ??= {
  connection: null,
  promise: null,
});

let listenersBound = false;

export class DatabaseConnection {
  public async connect(): Promise<Mongoose> {
    if (cache.connection) {
      return cache.connection;
    }

    cache.promise ??= this.openConnection();

    try {
      cache.connection = await cache.promise;

      return cache.connection;
    } catch (error) {
      cache.promise = null;

      throw this.describeFailure(error);
    }
  }

  public async disconnect(): Promise<void> {
    if (!cache.connection) {
      return;
    }

    await cache.connection.disconnect();
    cache.connection = null;
    cache.promise = null;
  }

  public isConnected(): boolean {
    return mongoose.connection.readyState === 1;
  }

  public get readyState(): number {
    return mongoose.connection.readyState;
  }

  private openConnection(): Promise<Mongoose> {
    this.bindEventListeners();

    return mongoose.connect(env.MONGODB_URI, {
      dbName: env.MONGODB_DB_NAME,
      maxPoolSize: 10,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 5_000,
      socketTimeoutMS: 45_000,
      bufferCommands: false,
      autoIndex: !isProduction,
    });
  }

  private bindEventListeners(): void {
    if (listenersBound) {
      return;
    }

    listenersBound = true;

    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connected', { database: env.MONGODB_DB_NAME });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('error', (error: unknown) => {
      logger.error('MongoDB connection error', { error });
    });
  }

  private describeFailure(error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('ServerSelection') || message.includes('server selection')) {
      return new Error(
        'Could not reach MongoDB. Check the Atlas IP allowlist covers this host, and that the cluster is not paused.',
      );
    }

    if (message.includes('Authentication failed') || message.includes('bad auth')) {
      return new Error(
        'MongoDB rejected the credentials. Check the user and that special characters in the password are percent-encoded.',
      );
    }

    return error instanceof Error ? error : new Error(message);
  }
}

export const database = new DatabaseConnection();

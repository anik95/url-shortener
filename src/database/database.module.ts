import {
  Global,
  Inject,
  Logger,
  Module,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { relations } from './relations.js';

// The token services will use to ask for the database
export const DRIZZLE = Symbol('DRIZZLE');

function createDb(connectionString: string) {
  return drizzle({
    relations,
    connection: { connectionString },
    logger: true, // prints every SQL query, handy while learning
  });
}

// The type of our db object, for use in services
export type Database = ReturnType<typeof createDb>;

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        createDb(config.getOrThrow<string>('DATABASE_URL')),
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseModule.name);

  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  // Runs on startup: check the database is reachable
  async onModuleInit() {
    await this.db.execute(sql`select 1`);
    this.logger.log('Connected to PostgreSQL');
  }

  // Runs on shutdown: close the connection cleanly
  async onApplicationShutdown() {
    await this.db.$client.end();
  }
}

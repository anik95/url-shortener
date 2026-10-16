import {
  Body,
  Controller,
  Get,
  Inject,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  Redirect,
} from '@nestjs/common';
import { ShortenUrlDto } from './dto/shorten-url.dto.js';
import { nanoid } from 'nanoid';
import { DRIZZLE, type Database } from '../database/database.module.js';
import { clicks, urls } from '../database/schema.js';
import { DrizzleQueryError } from 'drizzle-orm';
import { type Redis } from 'ioredis';
import { REDIS } from '../redis/redis.module.js';

@Controller('urls')
export class UrlsController {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  @Post('/shorten')
  async createShortUrl(@Body() shortenUrlDto: ShortenUrlDto) {
    const { url } = shortenUrlDto;
    let attemptCount = 0;
    while (true) {
      try {
        const shortUrl = nanoid(8);
        await this.db.insert(urls).values({
          originalUrl: url,
          shortCode: shortUrl,
        });
        return { shortUrl, originalUrl: url };
      } catch (error) {
        const isCollision =
          error instanceof DrizzleQueryError &&
          (error.cause as { code?: string })?.code === '23505'; // Unique violation error code for PostgreSQL
        if (!isCollision) throw error; // Not a collision: surface the real error
        if (attemptCount < 5) {
          attemptCount++;
          continue; // Retry with a new code
        }
        throw new InternalServerErrorException(
          'Could not generate a unique short code',
        );
      }
    }
  }

  @Get('/:shortCode')
  @Redirect()
  async orignalUrl(@Param('shortCode') shortCode: string) {
    const cacheKey = `url:${shortCode}`;

    const cached = await this.redis.hgetall(cacheKey);

    let originalUrl = '';
    let urlId = '';

    if (cached.id) {
      originalUrl = cached.originalUrl;
      urlId = cached.id;
    }

    if (!cached.id) {
      const urlRecord = await this.db.query.urls.findFirst({
        where: { shortCode },
      });
      if (!urlRecord) {
        throw new NotFoundException('Short code not found');
      }

      originalUrl = urlRecord.originalUrl;
      urlId = urlRecord.id;

      await this.redis
        .multi()
        .hset(cacheKey, {
          id: urlId,
          originalUrl,
        })
        .expire(cacheKey, 60 * 60 * 24)
        .exec();
    }

    await this.db.insert(clicks).values({ urlId });

    return { url: originalUrl, statusCode: 302 };
  }

  @Get('/:shortCode/stats')
  async getUrlStats(@Param('shortCode') shortCode: string) {
    const urlRecord = await this.db.query.urls.findFirst({
      where: {
        shortCode,
      },
      with: { clicks: true },
    });
    if (!urlRecord) {
      throw new NotFoundException('Short code not found');
    }
    return {
      shortCode: urlRecord.shortCode,
      originalUrl: urlRecord.originalUrl,
      totalClicks: urlRecord.clicks.length,
      clicks: urlRecord.clicks,
    };
  }
}

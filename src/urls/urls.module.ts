import { Module } from '@nestjs/common';
import { UrlsController } from './urls.controller.js';

@Module({
  controllers: [UrlsController],
})
export class UrlsModule {}

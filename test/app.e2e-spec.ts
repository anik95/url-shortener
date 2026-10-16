import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';

// Needs Postgres and Redis running: docker compose up -d db redis
describe('URL shortener (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Same pipe as main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('shortens, redirects and counts the click', async () => {
    const res = await request(app.getHttpServer())
      .post('/urls/shorten')
      .send({ url: 'https://example.com' })
      .expect(201);
    const code = res.body.shortUrl;

    await request(app.getHttpServer())
      .get(`/urls/${code}`)
      .expect(302)
      .expect('Location', 'https://example.com');

    const stats = await request(app.getHttpServer())
      .get(`/urls/${code}/stats`)
      .expect(200);
    expect(stats.body.totalClicks).toBe(1);
  });

  it.each([
    {},
    { url: 'nope' },
    { url: 'ftp://x.com' },
    { url: 'https://x.com', extra: 1 },
  ])('rejects bad input %j with 400', (body) =>
    request(app.getHttpServer()).post('/urls/shorten').send(body).expect(400),
  );

  it('returns 404 for an unknown code', async () => {
    await request(app.getHttpServer()).get('/urls/doesnotexist').expect(404);
    await request(app.getHttpServer())
      .get('/urls/doesnotexist/stats')
      .expect(404);
  });
});

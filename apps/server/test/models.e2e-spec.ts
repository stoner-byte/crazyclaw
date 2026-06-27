import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { CRAZYCLAW_ROOT } from './../src/config/config-file.service';

describe('ModelsController (e2e)', () => {
  let app: INestApplication<App>;
  let rootDir: string;
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'crazyclaw-models-e2e-'));
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({ choices: [{ message: { content: 'pong' } }] }),
    });
    global.fetch = fetchMock;
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CRAZYCLAW_ROOT)
      .useValue(rootDir)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.restoreAllMocks();
    await rm(rootDir, { recursive: true, force: true });
  });

  it('runs the full CRUD and test flow with API response envelopes', async () => {
    await request(app.getHttpServer())
      .get('/api/models')
      .expect(200)
      .expect({ code: 0, data: [], message: 'Models loaded' });

    const create = await request(app.getHttpServer())
      .post('/api/models')
      .send({
        id: 'gpt',
        provider: 'openai',
        modelId: 'gpt-4o-mini',
        enabled: true,
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test-secret',
        input: ['text', 'image'],
      })
      .expect(201);
    expect(create.body.code).toBe(0);
    expect(create.body.data).toMatchObject({
      id: 'gpt',
      provider: 'openai',
      modelId: 'gpt-4o-mini',
      hasApiKey: true,
    });
    expect(JSON.stringify(create.body)).not.toContain('sk-test-secret');
    const persisted = JSON.parse(
      await readFile(join(rootDir, 'crazyclaw.json'), 'utf8'),
    );
    expect(persisted.models).toEqual([
      expect.objectContaining({
        id: 'gpt',
        provider: 'openai',
        modelId: 'gpt-4o-mini',
      }),
    ]);

    await request(app.getHttpServer())
      .get('/api/models/gpt')
      .expect(200)
      .expect(({ body }) => {
        expect(body.code).toBe(0);
        expect(body.data.id).toBe('gpt');
        expect(JSON.stringify(body)).not.toContain('sk-test-secret');
      });

    await request(app.getHttpServer())
      .put('/api/models/gpt')
      .send({
        id: 'gpt',
        provider: 'openai',
        modelId: 'gpt-4o-mini',
        enabled: false,
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        input: ['text'],
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.code).toBe(0);
        expect(body.data.enabled).toBe(false);
        expect(body.data.hasApiKey).toBe(true);
      });

    await request(app.getHttpServer())
      .post('/api/models/gpt/test')
      .send({ mode: 'text' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.code).toBe(0);
        expect(body.data).toMatchObject({
          id: 'gpt',
          provider: 'openai',
          mode: 'text',
          ok: true,
        });
      });

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized sk-test-secret',
    });
    await request(app.getHttpServer())
      .post('/api/models/gpt/test')
      .send({ mode: 'text' })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toEqual({
          code: 1104,
          data: null,
          message: 'Model test failed: 401 Unauthorized [REDACTED]',
        });
        expect(JSON.stringify(body)).not.toContain('sk-test-secret');
      });

    await request(app.getHttpServer())
      .delete('/api/models/gpt')
      .expect(200)
      .expect({ code: 0, data: { id: 'gpt' }, message: 'Model deleted' });

    await request(app.getHttpServer())
      .get('/api/models/gpt')
      .expect(200)
      .expect({ code: 1101, data: null, message: 'Model not found' });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { CRAZYCLAW_ROOT } from './../src/config/config-file.service';

describe('AgentsController (e2e)', () => {
  let app: INestApplication<App>;
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'crazyclaw-agents-e2e-'));
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
    await rm(rootDir, { recursive: true, force: true });
  });

  it('runs the full CRUD flow with API response envelopes', async () => {
    await request(app.getHttpServer())
      .get('/api/agents')
      .expect(200)
      .expect({ code: 0, data: [], message: 'Agents loaded' });

    const create = await request(app.getHttpServer())
      .post('/api/agents')
      .send({
        id: 'coder',
        description: 'Coding assistant',
        enabled: true,
        tools: ['shell'],
        systemPrompt: 'You are a coding agent.',
      })
      .expect(201);
    expect(create.body.code).toBe(0);
    expect(create.body.data).toMatchObject({
      id: 'coder',
      description: 'Coding assistant',
      enabled: true,
      tools: ['shell'],
      workspaces: [join(rootDir, 'coder')],
      systemPrompt: 'You are a coding agent.',
    });

    await request(app.getHttpServer())
      .get('/api/agents/coder')
      .expect(200)
      .expect(({ body }) => {
        expect(body.code).toBe(0);
        expect(body.data.id).toBe('coder');
      });

    await request(app.getHttpServer())
      .put('/api/agents/coder')
      .send({
        id: 'coder',
        description: 'Updated',
        enabled: false,
        tools: ['git'],
        workspaces: [join(rootDir, 'coder'), '/tmp/project'],
        systemPrompt: 'Updated prompt',
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.code).toBe(0);
        expect(body.data.enabled).toBe(false);
        expect(body.data.workspaces).toEqual([
          join(rootDir, 'coder'),
          '/tmp/project',
        ]);
      });

    await request(app.getHttpServer())
      .delete('/api/agents/coder')
      .expect(200)
      .expect({ code: 0, data: { id: 'coder' }, message: 'Agent deleted' });

    await request(app.getHttpServer())
      .get('/api/agents/coder')
      .expect(200)
      .expect({ code: 1001, data: null, message: 'Agent not found' });
  });
});

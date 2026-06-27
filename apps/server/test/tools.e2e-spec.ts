import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { CRAZYCLAW_ROOT } from './../src/config/config-file.service';

describe('ToolsController (e2e)', () => {
  let app: INestApplication<App>;
  let rootDir: string;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), 'crazyclaw-tools-e2e-'));
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

  it('runs the full CRUD flow with object-shaped persistence', async () => {
    await request(app.getHttpServer())
      .get('/api/tools')
      .expect(200)
      .expect({ code: 0, data: [], message: 'Tools loaded' });

    const create = await request(app.getHttpServer())
      .post('/api/tools')
      .send({
        name: 'shell',
        description: 'Run shell commands',
        builtIn: true,
        enabled: true,
      })
      .expect(201);
    expect(create.body).toEqual({
      code: 0,
      data: {
        name: 'shell',
        description: 'Run shell commands',
        builtIn: true,
        enabled: true,
      },
      message: 'Tool created',
    });
    const persisted = JSON.parse(
      await readFile(join(rootDir, 'crazyclaw.json'), 'utf8'),
    );
    expect(persisted.tools.shell).toMatchObject({ name: 'shell' });

    await request(app.getHttpServer())
      .get('/api/tools/shell')
      .expect(200)
      .expect(({ body }) => {
        expect(body.code).toBe(0);
        expect(body.data.name).toBe('shell');
      });

    await request(app.getHttpServer())
      .put('/api/tools/shell')
      .send({
        name: 'shell',
        description: 'Disabled shell',
        builtIn: true,
        enabled: false,
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.code).toBe(0);
        expect(body.data.enabled).toBe(false);
      });

    await request(app.getHttpServer())
      .delete('/api/tools/shell')
      .expect(200)
      .expect({
        code: 1204,
        data: null,
        message: 'Built-in tool cannot be deleted',
      });

    await request(app.getHttpServer())
      .post('/api/tools')
      .send({
        name: 'filesystem',
        description: '',
        enabled: true,
      })
      .expect(201);
    await request(app.getHttpServer())
      .delete('/api/tools/filesystem')
      .expect(200)
      .expect({
        code: 0,
        data: { name: 'filesystem' },
        message: 'Tool deleted',
      });
  });
});

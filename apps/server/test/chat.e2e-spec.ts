import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createAgent } from '@crazyclaw/core';
import { AppModule } from './../src/app.module';

jest.mock('@crazyclaw/core', () => ({
  createAgent: jest.fn(),
}));

describe('ChatController (e2e)', () => {
  let app: INestApplication<App>;
  const stream = jest.fn();

  beforeEach(async () => {
    (createAgent as jest.Mock).mockReset();
    stream.mockReset();
    stream.mockReturnValue(
      (async function* () {
        yield { content: 'pong', additional_kwargs: {} };
      })(),
    );
    (createAgent as jest.Mock).mockResolvedValue({ stream });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('passes selected agent and model from POST chat body', async () => {
    await request(app.getHttpServer())
      .post('/api/chat')
      .send({
        agent: 'boss',
        model: 'qwen',
        messages: [{ role: 'user', content: 'ping' }],
      })
      .expect(201)
      .expect(({ text }) => {
        expect(text).toContain('"content":"pong"');
        expect(text).toContain('data: [DONE]');
      });

    expect(createAgent).toHaveBeenCalledWith('boss', 'qwen');
    expect(stream).toHaveBeenCalledWith('ping');
  });

  it('passes selected agent and model from GET chat query', async () => {
    await request(app.getHttpServer())
      .get('/api/chat')
      .query({ input: 'hello', agent: 'coder', model: 'gpt' })
      .expect(200);

    expect(createAgent).toHaveBeenCalledWith('coder', 'gpt');
    expect(stream).toHaveBeenCalledWith('hello');
  });

  it('rejects chat requests without selected agent or model', async () => {
    await request(app.getHttpServer())
      .post('/api/chat')
      .send({
        messages: [{ role: 'user', content: 'ping' }],
      })
      .expect(400);

    expect(createAgent).not.toHaveBeenCalled();
  });
});

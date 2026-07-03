import {
  Body,
  Controller,
  Get,
  Logger,
  type MessageEvent,
  Post,
  Query,
  Res,
  Sse,
} from '@nestjs/common';
import type { Response } from 'express';
import type { Observable } from 'rxjs';
import { createAgent } from '@crazyclaw/core';
import { ChatService } from './chat.service';
import type { ChatStreamQuery } from './chat.types';

type ChatTestPayload = {
  agent: string;
  messages?: Array<{ role?: string; content?: string }>;
  model: string;
};

@Controller('api/chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  @Sse('stream')
  stream(@Query() query: ChatStreamQuery): Observable<MessageEvent> {
    return this.chatService.stream(query);
  }

  @Get()
  async testByQuery(
    @Query() query: { agent?: string; input?: string; model?: string },
    @Res() res: Response,
  ) {
    return this.test(
      {
        agent: query.agent ?? '',
        messages: [{ role: 'user', content: query.input }],
        model: query.model ?? '',
      },
      res,
    );
  }

  @Post()
  async test(@Body() body: ChatTestPayload, @Res() res: Response) {
    const input = getLastUserContent(body);
    const agentName = getRequiredString(body.agent);
    const modelName = getRequiredString(body.model);
    if (!input || !agentName || !modelName) {
      this.logger.warn('[api-chat] request ignored because required fields are missing');
      res.status(400).end();
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      const agent = await createAgent(agentName, modelName);
      const response = await agent.stream(input);
      let thinking = false;

      for await (const chunk of response) {
        const reasoningContent = chunk.additional_kwargs?.reasoning_content;
        const content = typeof chunk.content === 'string' ? chunk.content : '';

        if (reasoningContent) {
          if (!thinking) {
            thinking = true;
            writeOpenAIChunk(res, '<think>');
          }
          writeOpenAIChunk(res, reasoningContent);
          continue;
        }

        if (thinking) {
          thinking = false;
          writeOpenAIChunk(res, '</think>');
        }

        if (content) {
          writeOpenAIChunk(res, content);
        }
      }

      writeDone(res);
    } catch (error) {
      this.logger.error(
        `[api-chat] request failed: ${error instanceof Error ? error.message : 'unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      writeOpenAIChunk(res, '请求失败');
      writeDone(res);
    } finally {
      res.end();
    }
  }
}

function getLastUserContent(body: ChatTestPayload): string {
  const message = body.messages
    ?.slice()
    .reverse()
    .find((item) => item.role === 'user' && typeof item.content === 'string');
  return message?.content?.trim() ?? '';
}

function getRequiredString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function writeOpenAIChunk(res: Response, content: string, role?: string) {
  res.write(
    `data: ${JSON.stringify({
      choices: [{ delta: { role, content } }],
    })}\n\n`,
  );
}

function writeDone(res: Response) {
  res.write('data: [DONE]\n\n');
}

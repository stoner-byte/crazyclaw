import { Controller, type MessageEvent, Logger, Query, Sse, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { Observable } from 'rxjs';
import { createAgent } from '@crazyclaw/core';
import { ChatService } from './chat.service';
import type { ChatStreamQuery } from './chat.types';

@Controller('api/chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  @Sse('stream')
  stream(@Query() query: ChatStreamQuery): Observable<MessageEvent> {
    return this.chatService.stream(query);
  }

  @Get()
    async test(@Query() query: {input: string}, @Res() res: Response) {
      if (!query.input) {
        this.logger.warn('[api-chat] request ignored because input is empty');
        return "";
      } else {
        try {
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          let { input } = query;
          input = decodeURIComponent(input).trim()

          const agent = await createAgent('coder', 'qwen');

          const response = await agent.stream(query.input);

          let thinking = true;
          console.log('思考中...');
          for await (const chunk of response) {
            // console.log(chunk);
            if (thinking) {
              if (chunk.additional_kwargs.reasoning_content) {
                res.write(chunk.additional_kwargs.reasoning_content);
              } else {
                thinking = false;
              }
            }
            if (!thinking) {
              res.write(chunk.content);
            }
          }
        } catch (error) {
          console.log(error)
        } finally {
          res.end()
        }
      }
    }
}

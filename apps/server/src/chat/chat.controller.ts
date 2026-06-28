import { Controller, type MessageEvent, Query, Sse, Get } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { createAgent } from '@crazyclaw/core';
import { ChatService } from './chat.service';
import type { ChatStreamQuery } from './chat.types';

@Controller('api/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Sse('stream')
  stream(@Query() query: ChatStreamQuery): Observable<MessageEvent> {
    return this.chatService.stream(query);
  }

  @Get()
    async test() {
      const agent = await createAgent('coder', 'qwen');

      const response = await agent.stream('你好，你是谁？');

      let thinking = true;
      console.log('思考中...');
      for await (const chunk of response) {
        // console.log(chunk);
        if (thinking) {
          if (chunk.additional_kwargs.reasoning_content) {
            process.stdout.write(chunk.additional_kwargs.reasoning_content);
          } else {
            console.log();
            thinking = false;
          }
        }
        if (!thinking) {
          process.stdout.write(chunk.content);
        }
      }

      return 'test'
    }
}

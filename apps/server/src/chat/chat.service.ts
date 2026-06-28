import { Injectable, type MessageEvent } from '@nestjs/common';
import { EMPTY, type Observable } from 'rxjs';
import type { ChatStreamQuery } from './chat.types';

@Injectable()
export class ChatService {
  stream(_query: ChatStreamQuery): Observable<MessageEvent> {
    return EMPTY;
  }
}

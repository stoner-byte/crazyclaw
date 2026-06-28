import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AgentsController } from './agents/agents.controller';
import { AgentsService } from './agents/agents.service';
import { ChatController } from './chat/chat.controller';
import { ChatService } from './chat/chat.service';
import {
  ConfigFileService,
  CRAZYCLAW_ROOT,
  DEFAULT_CRAZYCLAW_ROOT,
} from './config/config-file.service';
import { ModelsController } from './models/models.controller';
import { ModelsService } from './models/models.service';
import { ToolsController } from './tools/tools.controller';
import { ToolsService } from './tools/tools.service';

@Module({
  imports: [],
  controllers: [
    AppController,
    AgentsController,
    ChatController,
    ModelsController,
    ToolsController,
  ],
  providers: [
    AppService,
    ConfigFileService,
    AgentsService,
    ChatService,
    ModelsService,
    ToolsService,
    {
      provide: CRAZYCLAW_ROOT,
      useValue: DEFAULT_CRAZYCLAW_ROOT,
    },
  ],
})
export class AppModule {}

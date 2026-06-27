import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AgentsController } from './agents/agents.controller';
import { AgentsService } from './agents/agents.service';
import {
  ConfigFileService,
  CRAZYCLAW_ROOT,
  DEFAULT_CRAZYCLAW_ROOT,
} from './config/config-file.service';
import { ModelsController } from './models/models.controller';
import { ModelsService } from './models/models.service';

@Module({
  imports: [],
  controllers: [AppController, AgentsController, ModelsController],
  providers: [
    AppService,
    ConfigFileService,
    AgentsService,
    ModelsService,
    {
      provide: CRAZYCLAW_ROOT,
      useValue: DEFAULT_CRAZYCLAW_ROOT,
    },
  ],
})
export class AppModule {}

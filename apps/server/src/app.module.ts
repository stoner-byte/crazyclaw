import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AgentsController } from './agents/agents.controller';
import { AgentsService, CRAZYCLAW_ROOT } from './agents/agents.service';
import { homedir } from 'node:os';
import { join } from 'node:path';

@Module({
  imports: [],
  controllers: [AppController, AgentsController],
  providers: [
    AppService,
    AgentsService,
    {
      provide: CRAZYCLAW_ROOT,
      useValue: join(homedir(), '.crazyclaw'),
    },
  ],
})
export class AppModule {}

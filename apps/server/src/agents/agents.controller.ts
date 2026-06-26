import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { AgentsService } from './agents.service';
import type { AgentPayload } from './agents.types';

@Controller('api/agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  findAll() {
    return this.agentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.agentsService.findOne(id);
  }

  @Post()
  create(@Body() payload: AgentPayload) {
    return this.agentsService.create(payload);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() payload: AgentPayload) {
    return this.agentsService.update(id, payload);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.agentsService.remove(id);
  }
}

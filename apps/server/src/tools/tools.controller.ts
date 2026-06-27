import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ToolsService } from './tools.service';
import type { ToolPayload } from './tools.types';

@Controller('api/tools')
export class ToolsController {
  constructor(private readonly toolsService: ToolsService) {}

  @Get()
  findAll() {
    return this.toolsService.findAll();
  }

  @Get(':name')
  findOne(@Param('name') name: string) {
    return this.toolsService.findOne(name);
  }

  @Post()
  create(@Body() payload: ToolPayload) {
    return this.toolsService.create(payload);
  }

  @Put(':name')
  update(@Param('name') name: string, @Body() payload: ToolPayload) {
    return this.toolsService.update(name, payload);
  }

  @Delete(':name')
  remove(@Param('name') name: string) {
    return this.toolsService.remove(name);
  }
}

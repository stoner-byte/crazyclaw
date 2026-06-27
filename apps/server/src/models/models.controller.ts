import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ModelsService } from './models.service';
import type { ModelPayload, ModelTestPayload } from './models.types';

@Controller('api/models')
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  @Get()
  findAll() {
    return this.modelsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.modelsService.findOne(id);
  }

  @Post()
  create(@Body() payload: ModelPayload) {
    return this.modelsService.create(payload);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() payload: ModelPayload) {
    return this.modelsService.update(id, payload);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.modelsService.remove(id);
  }

  @Post(':id/test')
  test(@Param('id') id: string, @Body() payload: ModelTestPayload) {
    return this.modelsService.test(id, payload);
  }
}

// src/auto-project/auto-project.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  ParseIntPipe,
  UseGuards,
  DefaultValuePipe,
  Query,
} from '@nestjs/common';
import { AutoProjectReadService } from './auto-project-read.service';
import { CreateAutoProjectDto } from './dto/request/create-project.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/users.decorator';
import { CurrentUserType } from 'src/auth/types/current-user.type';
import { AutoProjectWriteService } from './auto-project-write.service';
import { AutoProjectDetailsDto } from './dto/response/auto-project-details.dto';
import { AutoProjectListResponseDto } from './dto/response/auto-project-list-item.dto';
import { UpdateAutoProjectDto } from './dto/request/update-project.dto';

@Controller('auto-project')
@UseGuards(JwtAuthGuard)
export class AutoProjectController {
  constructor(
    private readonly autoProjectReadService: AutoProjectReadService,
    private readonly autoProjectWriteService: AutoProjectWriteService,
  ) {}

  @Post()
  async create(
    @Body() createDto: CreateAutoProjectDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<AutoProjectDetailsDto> {
    return this.autoProjectWriteService.create(createDto, user.id);
  }

  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('page_size', new DefaultValuePipe(10), ParseIntPipe)
    pageSize: number,
    @Query('sort_by', new DefaultValuePipe('created_at')) sortBy: string,
    @Query('sort_order', new DefaultValuePipe('desc'))
    sortOrder: 'asc' | 'desc',
    @CurrentUser() user: CurrentUserType,
  ): Promise<AutoProjectListResponseDto> {
    return this.autoProjectReadService.findAll(
      page,
      pageSize,
      user.id,
      sortBy,
      sortOrder,
    );
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserType,
  ): Promise<AutoProjectDetailsDto> {
    return this.autoProjectReadService.findOne(id, user.id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateAutoProjectDto,
    @CurrentUser() user: CurrentUserType,
  ): Promise<AutoProjectDetailsDto> {
    return this.autoProjectWriteService.update(id, updateDto, user.id);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserType,
  ): Promise<void> {
    return this.autoProjectWriteService.remove(id, user.id);
  }
}

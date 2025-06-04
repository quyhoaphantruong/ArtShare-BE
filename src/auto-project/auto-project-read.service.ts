import { BadRequestException, Injectable } from '@nestjs/common';
import { TryCatch } from 'src/common/try-catch.decorator';
import { PrismaService } from 'src/prisma.service';
import { AutoProjectListItemDto } from './dto/response/auto-project-list-item.dto';
import { plainToInstance } from 'class-transformer';
import { AutoProjectDetailsDto } from './dto/response/auto-project-details.dto';

@Injectable()
export class AutoProjectReadService {
  constructor(private readonly prisma: PrismaService) {}

  @TryCatch()
  async findAll(
    page: number,
    pageSize: number,
    userId: string,
  ): Promise<AutoProjectListItemDto[]> {
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const autoProjects = await this.prisma.autoProject.findMany({
      skip,
      take,
      where: {
        user_id: userId,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return plainToInstance(AutoProjectListItemDto, autoProjects);
  }

  @TryCatch()
  async findOne(id: number, userId: string): Promise<AutoProjectDetailsDto> {
    const autoProject = await this.prisma.autoProject.findFirst({
      where: {
        id,
        user_id: userId,
      },
    });

    if (!autoProject) {
      throw new BadRequestException('Auto project not found');
    }

    return plainToInstance(AutoProjectDetailsDto, autoProject);
  }
}

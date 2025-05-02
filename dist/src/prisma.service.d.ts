import { OnModuleInit, OnApplicationShutdown } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
export declare class PrismaService extends PrismaClient implements OnModuleInit, OnApplicationShutdown {
    onModuleInit(): Promise<void>;
    onApplicationShutdown(): Promise<void>;
    onModuleDestroy(): Promise<void>;
}

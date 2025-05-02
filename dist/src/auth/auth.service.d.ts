import { PrismaService } from 'src/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Tokens } from './types/tokens.type';
export declare class AuthService {
    private prisma;
    private jwtService;
    private config;
    constructor(prisma: PrismaService, jwtService: JwtService, config: ConfigService);
    private readonly logger;
    signup(userId: string, email: string, password: string | '', username: string): Promise<any>;
    login(token: string): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    signout(uid: string): Promise<{
        message: string;
    }>;
    verifyToken(idToken: string): Promise<import("firebase-admin/lib/auth/token-verifier").DecodedIdToken>;
    getTokens(userId: string, email: string, roles: string[]): Promise<Tokens>;
    createRandomUsername(): string;
}

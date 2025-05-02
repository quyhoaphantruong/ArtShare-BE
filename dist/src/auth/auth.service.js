"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const admin = __importStar(require("firebase-admin"));
const prisma_service_1 = require("../prisma.service");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
let AuthService = AuthService_1 = class AuthService {
    constructor(prisma, jwtService, config) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.config = config;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async signup(userId, email, password, username) {
        try {
            const existingUser = await this.prisma.user.findUnique({
                where: { id: userId },
            });
            this.logger.log(username);
            if (existingUser) {
                return {
                    message_type: 'USER_ALREADY_EXIST',
                    user: existingUser,
                };
            }
            const userRole = await this.prisma.role.findUnique({
                where: { role_name: 'USER' },
                select: { role_id: true },
            });
            if (!userRole) {
                this.logger.error("Default 'USER' role not found in the database. Please run seeding.");
                throw new common_1.NotFoundException('System configuration error: Default user role not found.');
            }
            const newUser = await this.prisma.$transaction(async (tx) => {
                const user = await tx.user.create({
                    data: {
                        id: userId,
                        email,
                        username: this.createRandomUsername(),
                    },
                });
                await tx.userRole.create({
                    data: {
                        user_id: user.id,
                        role_id: userRole.role_id,
                    },
                });
                return user;
            });
            return { message_type: 'SIGNUP_SUCCESS', newUser };
        }
        catch (error) {
            throw new Error(`Error creating user: ${error.message}`);
        }
    }
    async login(token) {
        try {
            this.logger.log('Received token for verification', token);
            const decodedToken = await admin.auth().verifyIdToken(token);
            this.logger.log('Decoded token successfully from login: ' +
                JSON.stringify(decodedToken));
            const userFromDb = await this.prisma.user.findUnique({
                where: { id: decodedToken.uid },
                include: {
                    roles: {
                        include: {
                            role: true,
                        },
                    },
                },
            });
            if (!userFromDb) {
                throw new Error(`User with email ${decodedToken.email} not found in database`);
            }
            const roleNames = userFromDb.roles.map((userRole) => userRole.role.role_name);
            this.logger.log(`User roles extracted: ${roleNames}`);
            const tokens = await this.getTokens(userFromDb.id, decodedToken.email, roleNames);
            let user = null;
            this.logger.log(user);
            try {
                user = await this.prisma.user.update({
                    where: { id: decodedToken.uid },
                    data: { refresh_token: tokens.refresh_token },
                });
                this.logger.log(`Refresh token updated for user with email: ${decodedToken.email}`);
            }
            catch (dbError) {
                this.logger.error('Error updating refresh token in database:', dbError.stack);
            }
            return {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
            };
        }
        catch (error) {
            this.logger.error('Error during token verification', error.stack);
            if (error.code === 'auth/argument-error') {
                this.logger.error('The ID token is invalid or malformed.');
                throw new Error('The ID token is invalid or malformed.');
            }
            this.logger.error('Invalid token', error.stack);
            throw new Error('Invalid token');
        }
    }
    async signout(uid) {
        try {
            await admin.auth().revokeRefreshTokens(uid);
            return { message: 'User signed out successfully' };
        }
        catch (error) {
            throw new Error(`Error signing out: ${error.message}`);
        }
    }
    async verifyToken(idToken) {
        try {
            return await admin.auth().verifyIdToken(idToken);
        }
        catch (error) {
            this.logger.error(error.stack);
            throw new common_1.UnauthorizedException('You are not authorized to access this resource');
        }
    }
    async getTokens(userId, email, roles) {
        const jwtPayload = {
            userId: userId,
            email: email,
            roles: roles,
        };
        const [at, rt] = await Promise.all([
            this.jwtService.signAsync(jwtPayload, {
                secret: this.config.get('AT_SECRET'),
                expiresIn: '1000d',
            }),
            this.jwtService.signAsync(jwtPayload, {
                secret: this.config.get('RT_SECRET'),
                expiresIn: '7d',
            }),
        ]);
        return {
            access_token: at,
            refresh_token: rt,
        };
    }
    createRandomUsername() {
        return `user_${crypto.randomUUID()}`;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);

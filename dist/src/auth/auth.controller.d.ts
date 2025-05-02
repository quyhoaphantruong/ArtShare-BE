import { AuthService } from './auth.service';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    signup(body: {
        userId: string;
        email: string;
        password: string;
        username: string;
    }): Promise<any>;
    login(body: {
        token: string;
    }): Promise<{
        access_token: string;
        refresh_token: string;
    }>;
    signout(body: {
        uid: string;
    }): Promise<{
        message: string;
    }>;
    verifyToken(body: {
        token: string;
    }): Promise<import("firebase-admin/lib/auth/token-verifier").DecodedIdToken>;
}

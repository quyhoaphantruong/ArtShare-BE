import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../types/jwtPayload.type';
declare const AtStrategy_base: new (...args: unknown[]) => any;
export declare class AtStrategy extends AtStrategy_base {
    constructor(config: ConfigService);
    validate(payload: JwtPayload): JwtPayload;
}
export {};

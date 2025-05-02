import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../types/jwtPayload.type';
import { JwtPayloadWithRt } from '../types/jwtPayloadWithRt.type';
declare const RtStrategy_base: new (...args: unknown[]) => any;
export declare class RtStrategy extends RtStrategy_base {
    constructor(config: ConfigService);
    validate(req: Request, payload: JwtPayload): JwtPayloadWithRt;
}
export {};

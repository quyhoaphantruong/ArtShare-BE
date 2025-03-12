import { IsNumber } from "class-validator";

export class FollowRequestDTO {
    @IsNumber()
    followerId: number;
    @IsNumber()
    followingId: number;
}
  
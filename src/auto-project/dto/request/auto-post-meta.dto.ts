import { IsDate, IsInt } from 'class-validator';

export class AutoPostMeta {
  @IsDate()
  scheduled_at: Date;

  @IsInt()
  images_count: number;
}

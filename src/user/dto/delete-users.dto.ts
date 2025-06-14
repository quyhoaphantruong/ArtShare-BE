import { IsArray, IsNotEmpty } from 'class-validator';

export class DeleteUsersDTO {
  @IsArray()
  @IsNotEmpty()
  userIds: string[];
}

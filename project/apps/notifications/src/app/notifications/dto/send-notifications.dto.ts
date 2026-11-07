import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEmail, IsOptional } from 'class-validator';

export class SendNotificationsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ type: [Object] })
  @IsArray()
  posts!: { title: string; id: string }[];
}

import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty()
  @IsString()
  @Length(10, 300)
  text!: string;
}

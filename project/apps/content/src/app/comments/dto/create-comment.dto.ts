import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';
import {
  COMMENT_TEXT_MIN_LENGTH,
  COMMENT_TEXT_MAX_LENGTH,
} from '@readme/shared-types';

export class CreateCommentDto {
  @ApiProperty()
  @IsString()
  @Length(COMMENT_TEXT_MIN_LENGTH, COMMENT_TEXT_MAX_LENGTH)
  text!: string;
}

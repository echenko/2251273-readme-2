import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PostType, SortType, DEFAULT_POSTS_LIMIT } from '@readme/shared-types';

export class QueryPostsDto {
  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({ default: DEFAULT_POSTS_LIMIT, maximum: DEFAULT_POSTS_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(DEFAULT_POSTS_LIMIT)
  limit?: number;

  @ApiPropertyOptional({ enum: SortType, default: SortType.Date })
  @IsOptional()
  @IsEnum(SortType)
  sortBy?: SortType;

  @ApiPropertyOptional({ enum: PostType })
  @IsOptional()
  @IsEnum(PostType)
  type?: PostType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

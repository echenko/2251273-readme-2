import { ApiProperty } from '@nestjs/swagger';

export class FileResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() originalName!: string;
  @ApiProperty() mimeType!: string;
  @ApiProperty() size!: number;
  @ApiProperty({ enum: ['avatar', 'photo'] }) kind!: 'avatar' | 'photo';
  @ApiProperty() ownerId!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() url!: string;
}

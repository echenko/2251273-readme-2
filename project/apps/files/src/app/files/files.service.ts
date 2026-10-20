import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  MAX_AVATAR_SIZE,
  MAX_PHOTO_SIZE,
  ALLOWED_IMAGE_MIME_TYPES,
} from '@readme/shared-types';
import { FileEntity, FileKind } from './entities/file.entity';
import { FilesRepository } from './repositories/files.repository';

const LIMITS: Record<FileKind, { maxSize: number; mimes: string[] }> = {
  avatar: { maxSize: MAX_AVATAR_SIZE, mimes: ALLOWED_IMAGE_MIME_TYPES },
  photo: { maxSize: MAX_PHOTO_SIZE, mimes: ALLOWED_IMAGE_MIME_TYPES },
};

@Injectable()
export class FilesService {
  constructor(private readonly filesRepository: FilesRepository) {}

  async save(
    ownerId: string,
    kind: FileKind,
    file: Express.Multer.File | undefined,
  ): Promise<FileEntity> {
    if (!file) throw new BadRequestException('File is required');

    const limits = LIMITS[kind];
    if (!limits) throw new BadRequestException(`Unknown kind: ${kind}`);
    if (!limits.mimes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid mime type: ${file.mimetype}. Allowed: ${limits.mimes.join(', ')}`,
      );
    }
    if (file.size > limits.maxSize) {
      throw new BadRequestException(
        `File is too large: ${file.size} > ${limits.maxSize}`,
      );
    }

    return this.filesRepository.create({
      id: randomUUID(),
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      kind,
      ownerId,
      createdAt: new Date(),
      content: file.buffer,
    });
  }

  async getById(id: string): Promise<FileEntity> {
    const file = await this.filesRepository.findById(id);
    if (!file) throw new NotFoundException('File not found');
    return file;
  }

  async remove(ownerId: string, id: string): Promise<{ success: boolean }> {
    const file = await this.getById(id);
    if (file.ownerId !== ownerId) throw new ForbiddenException('Not your file');
    await this.filesRepository.delete(id);
    return { success: true };
  }

  toResponse(file: FileEntity) {
    const { content, ...rest } = file;
    return { ...rest, url: `/files/${file.id}` };
  }
}

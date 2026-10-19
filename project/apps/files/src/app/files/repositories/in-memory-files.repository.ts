import { Injectable } from '@nestjs/common';
import { FileEntity } from '../entities/file.entity';
import { FilesRepository } from './files.repository';

@Injectable()
export class InMemoryFilesRepository implements FilesRepository {
  private readonly store = new Map<string, FileEntity>();

  async create(file: FileEntity): Promise<FileEntity> {
    this.store.set(file.id, file);
    return file;
  }

  async findById(id: string): Promise<FileEntity | null> {
    return this.store.get(id) ?? null;
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }
}

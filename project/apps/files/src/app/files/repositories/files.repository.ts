import { FileEntity } from '../entities/file.entity';

export abstract class FilesRepository {
  abstract create(file: FileEntity): Promise<FileEntity>;
  abstract findById(id: string): Promise<FileEntity | null>;
  abstract delete(id: string): Promise<boolean>;
}

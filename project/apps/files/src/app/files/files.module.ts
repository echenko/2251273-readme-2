import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { FilesRepository } from './repositories/files.repository';
import { InMemoryFilesRepository } from './repositories/in-memory-files.repository';

@Module({
  controllers: [FilesController],
  providers: [
    FilesService,
    { provide: FilesRepository, useClass: InMemoryFilesRepository },
  ],
  exports: [FilesService],
})
export class FilesModule {}

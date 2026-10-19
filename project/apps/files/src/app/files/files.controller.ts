import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Загрузить аватар (≤500 KB, jpeg/png)' })
  async uploadAvatar(@CurrentUser() user: { sub: string }, @UploadedFile() file: Express.Multer.File) {
    return this.filesService.toResponse(await this.filesService.save(user.sub, 'avatar', file));
  }

  @Post('photo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Загрузить фото (≤1 MB, jpg/png)' })
  async uploadPhoto(@CurrentUser() user: { sub: string }, @UploadedFile() file: Express.Multer.File) {
    return this.filesService.toResponse(await this.filesService.save(user.sub, 'photo', file));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить файл' })
  async get(@Param('id') id: string, @Res() res: Response) {
    const file = await this.filesService.getById(id);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Length', file.size);
    res.end(file.content);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить свой файл' })
  remove(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.filesService.remove(user.sub, id);
  }
}

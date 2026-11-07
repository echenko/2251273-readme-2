import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { SendNotificationsDto } from './dto/send-notifications.dto';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Запустить рассылку уведомлений' })
  @ApiResponse({ status: 200, description: 'Задачи поставлены в очередь' })
  send(@Body() dto: SendNotificationsDto) {
    return this.notificationsService.enqueue(dto);
  }
}

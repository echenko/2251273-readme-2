import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SendNotificationsDto } from './dto/send-notifications.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject('NOTIFICATIONS_SERVICE') private readonly client: ClientProxy,
  ) {}

  async enqueue(dto: SendNotificationsDto) {
    const recipients = dto.email ? [dto.email] : await this.getAllUserEmails();
    for (const email of recipients) {
      this.client.emit('send_email', { email, posts: dto.posts });
    }
    this.logger.log(`Enqueued ${recipients.length} email tasks`);
    return { enqueued: recipients.length };
  }

  private async getAllUserEmails(): Promise<string[]> {
    return ['user1@example.com', 'user2@example.com'];
  }
}

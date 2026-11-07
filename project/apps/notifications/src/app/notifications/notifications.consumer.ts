import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { MailService } from '../mail/mail.service';

@Controller()
export class NotificationsConsumer {
  private readonly logger = new Logger(NotificationsConsumer.name);

  constructor(private readonly mailService: MailService) {}

  @EventPattern('send_email')
  async handleSendEmail(
    @Payload() data: { email: string; posts: { title: string; id: string }[] },
  ) {
    try {
      await this.mailService.sendNewPostsEmail(data.email, data.posts);
      this.logger.log(`Email processed for ${data.email}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${data.email}`, error);
    }
  }
}

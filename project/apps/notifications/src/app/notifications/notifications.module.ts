import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsConsumer } from './notifications.consumer';
import { RabbitMQModule } from '../rabbitmq/rabbitmq.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [RabbitMQModule, MailModule],
  controllers: [NotificationsController, NotificationsConsumer],
  providers: [NotificationsService],
})
export class NotificationsModule {}

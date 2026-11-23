import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SendNotificationsDto } from './dto/send-notifications.dto';
import * as fs from 'fs';
import * as path from 'path';

const STATE_FILE = path.join(__dirname, '../../../last-sent.json');

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  public lastSentAt: Date | undefined;

  constructor(
    @Inject('NOTIFICATIONS_SERVICE') private readonly client: ClientProxy,
    private readonly http: HttpService,
  ) {}

  onModuleInit() {
    if (fs.existsSync(STATE_FILE)) {
      try {
        const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
        if (state.lastSentAt) {
          this.lastSentAt = new Date(state.lastSentAt);
          this.logger.log(`Восстановлена дата последней рассылки: ${this.lastSentAt.toISOString()}`);
        }
      } catch (error) {
        this.logger.error('Не удалось прочитать last-sent.json', error);
      }
    }
  }

  async enqueue(dto: SendNotificationsDto) {
    let recipients: string[] = [];
    let posts = dto.posts;

    if (dto.email) {
      recipients = [dto.email];
    } else {
      try {
        const usersUrl = process.env.USERS_URL || 'http://localhost:3005';
        const { data } = await firstValueFrom(
          this.http.get<string[]>(`${usersUrl}/users/emails`, {
            headers: {
              'x-internal-token': process.env.INTERNAL_TOKEN || 'super-secret-internal-token-123',
            },
          }),
        );
        recipients = data;
      } catch (error) {
        this.logger.error('Failed to fetch user emails', error);
        throw new Error('Cannot fetch user emails');
      }
    }

    if (!posts || posts.length === 0) {
      try {
        const params: Record<string, string> = {};
        if (this.lastSentAt) {
          params.publishedAfter = this.lastSentAt.toISOString();
        }

        const contentUrl = process.env.CONTENT_URL || 'http://localhost:3001';
        const { data } = await firstValueFrom(
          this.http.get<{ items: { id: string; title: string }[] }>(
            `${contentUrl}/posts`,
            { params },
          ),
        );
        posts = data.items.map((p) => ({ id: p.id, title: p.title }));
      } catch (error) {
        this.logger.error('Failed to fetch posts', error);
        throw new Error('Cannot fetch posts');
      }
    }

    if (posts.length === 0) {
      this.logger.log('No new posts to send');
      return { enqueued: 0 };
    }

    for (const email of recipients) {
      this.client.emit('send_email', { email, posts });
    }

    this.lastSentAt = new Date();
    try {
      fs.writeFileSync(
        STATE_FILE,
        JSON.stringify({ lastSentAt: this.lastSentAt.toISOString() }, null, 2),
      );
    } catch (error) {
      this.logger.error('Failed to save lastSentAt to file', error);
    }

    this.logger.log(`Enqueued ${recipients.length} emails with ${posts.length} posts`);
    return { enqueued: recipients.length };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailer: MailerService) {}

  async sendNewPostsEmail(to: string, posts: { title: string; id: string }[]) {
    const list = posts.map((p) => `<li><b>${p.title}</b> (id: ${p.id})</li>`).join('');
    await this.mailer.sendMail({
      to,
      subject: `Readme: ${posts.length} новых публикаций`,
      html: `<h1>Новые публикации в Readme</h1><ul>${list}</ul><p>— команда Readme</p>`,
    });
    this.logger.log(`Email sent to ${to} with ${posts.length} posts`);
  }
}

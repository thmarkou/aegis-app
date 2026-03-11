import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class MessageLog extends Model {
  static table = 'message_logs';

  @field('message') message!: string;
  @field('sent_at') sentAt!: number;
}

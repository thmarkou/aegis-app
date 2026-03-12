import { Model, Q } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class IncomingStation extends Model {
  static table = 'incoming_stations';

  @field('callsign') callsign!: string;
  @field('ssid') ssid!: number;
  @field('latitude') latitude!: number;
  @field('longitude') longitude!: number;
  @field('altitude') altitude!: number | null;
  @field('last_seen_at') lastSeenAt!: number;
  @field('comment') comment!: string | null;
}

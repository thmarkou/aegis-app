import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class Repeater extends Model {
  static table = 'repeaters';

  @field('name') name!: string;
  @field('callsign') callsign!: string | null;
  @field('location_name') locationName!: string | null;
  @field('frequency') frequency!: number;
  @field('offset') offset!: number;
  @field('tone') tone!: number | null;
  @field('latitude') latitude!: number;
  @field('longitude') longitude!: number;
  @field('is_active') isActive!: boolean;
  @field('type') type!: string;
}

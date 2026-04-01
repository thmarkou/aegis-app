import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export default class PowerDevice extends Model {
  static table = 'power_devices';

  @field('slug') slug!: string;
  @field('name') name!: string;
  @field('last_full_charge_at') lastFullChargeAt!: number | null;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}

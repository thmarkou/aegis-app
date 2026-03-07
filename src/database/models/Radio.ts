import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class Radio extends Model {
  static table = 'radios';

  @field('model') model!: string;
  @field('brand') brand!: string;
  @field('battery_mah') batteryMah!: number;
  @field('weight_grams') weightGrams!: number;
  @field('is_primary') isPrimary!: boolean;
}

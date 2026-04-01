import { Model } from '@nozbe/watermelondb';
import { field, date } from '@nozbe/watermelondb/decorators';

export default class MissionPreset extends Model {
  static table = 'mission_presets';

  @field('name') name!: string;
  @field('duration_days') durationDays!: number;
  @field('calories_per_day') caloriesPerDay!: number;
  @field('water_liters_per_day') waterLitersPerDay!: number;
  @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}

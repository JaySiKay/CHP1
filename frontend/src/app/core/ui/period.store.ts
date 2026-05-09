import { Injectable, signal } from '@angular/core';
import type { Period } from '../../shared/ui/period-picker.component';

@Injectable({ providedIn: 'root' })
export class PeriodStore {
  private readonly _period = signal<Period>('week');
  readonly period = this._period.asReadonly();

  set(period: Period): void {
    this._period.set(period);
  }
}

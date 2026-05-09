import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService, Kpi } from './dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly kpis = signal<Kpi[]>([]);

  constructor(private readonly svc: DashboardService) {}

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  protected async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const data = await this.svc.getKpis();
      this.kpis.set(data);
    } catch (err: any) {
      this.error.set(err?.message ?? 'Failed to load dashboard data');
    } finally {
      this.loading.set(false);
    }
  }
}

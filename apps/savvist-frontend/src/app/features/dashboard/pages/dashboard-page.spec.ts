import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DashboardPage } from './dashboard-page';
import { UserService } from '../../../core/services/user.service';
import { DashboardService } from '../services/dashboard.service';

describe('DashboardPage', () => {
  let component: DashboardPage;
  let fixture: ComponentFixture<DashboardPage>;
  let mockUserService: { user: ReturnType<typeof vi.fn> };
  let mockDashboardService: {
    summary: ReturnType<typeof signal>;
    todaysAllowance: ReturnType<typeof signal>;
    isLoadingSummary: ReturnType<typeof signal>;
    summaryError: ReturnType<typeof signal>;
    trend: ReturnType<typeof signal>;
    isLoadingTrend: ReturnType<typeof signal>;
    trendError: ReturnType<typeof signal>;
    reload: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockUserService = {
      user: vi.fn().mockReturnValue({
        id: '1',
        displayName: 'John Doe',
        baseSalary: 30000,
        isUnemployed: false,
        currency: 'PHP',
        locale: 'en-PH',
        timeZone: 'Asia/Manila',
      }),
    };

    mockDashboardService = {
      summary: signal({
        id: 'metric1',
        userId: '1',
        day: '2026-10-31',
        totalFund: 50000,
        actualCash: 25000,
        health: 0.8,
        growth: 0.15,
      }),
      todaysAllowance: signal({ allowance: 1000, day: '2026-10-31' }),
      isLoadingSummary: signal(false),
      summaryError: signal(null),
      trend: signal([]),
      isLoadingTrend: signal(false),
      trendError: signal(null),
      reload: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: DashboardService, useValue: mockDashboardService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the user name in the top left', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const userNameEl = compiled.querySelector('.user-name');
    expect(userNameEl).toBeTruthy();
    expect(userNameEl?.textContent?.trim()).toContain('John Doe');
  });

  it('should render three card-computed-amount and two apex-gauge-label components', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const cards = compiled.querySelectorAll('app-card-computed-amount');
    const gauges = compiled.querySelectorAll('app-apex-gauge-label');
    expect(cards.length).toBe(3);
    expect(gauges.length).toBe(2);
  });
});

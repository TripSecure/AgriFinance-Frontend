import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PortfolioOfficerDashboardComponent } from './portfolio-officer-dashboard.component';

describe('PortfolioOfficerDashboardComponent', () => {
  let component: PortfolioOfficerDashboardComponent;
  let fixture: ComponentFixture<PortfolioOfficerDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortfolioOfficerDashboardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PortfolioOfficerDashboardComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

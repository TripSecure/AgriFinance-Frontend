import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InputProviderDashboardComponent } from './input-provider-dashboard.component';

describe('InputProviderDashboardComponent', () => {
  let component: InputProviderDashboardComponent;
  let fixture: ComponentFixture<InputProviderDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputProviderDashboardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InputProviderDashboardComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

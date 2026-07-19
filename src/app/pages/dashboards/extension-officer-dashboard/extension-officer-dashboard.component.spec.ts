import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExtensionOfficerDashboardComponent } from './extension-officer-dashboard.component';

describe('ExtensionOfficerDashboardComponent', () => {
  let component: ExtensionOfficerDashboardComponent;
  let fixture: ComponentFixture<ExtensionOfficerDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExtensionOfficerDashboardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ExtensionOfficerDashboardComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

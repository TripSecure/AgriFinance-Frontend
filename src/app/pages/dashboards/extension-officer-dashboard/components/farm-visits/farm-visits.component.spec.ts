import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FarmVisitsComponent } from './farm-visits.component';

describe('FarmVisitsComponent', () => {
  let component: FarmVisitsComponent;
  let fixture: ComponentFixture<FarmVisitsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FarmVisitsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FarmVisitsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

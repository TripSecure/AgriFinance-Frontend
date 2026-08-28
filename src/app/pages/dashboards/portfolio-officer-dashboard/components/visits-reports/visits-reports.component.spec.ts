import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VisitsReportsComponent } from './visits-reports.component';

describe('VisitsReportsComponent', () => {
  let component: VisitsReportsComponent;
  let fixture: ComponentFixture<VisitsReportsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisitsReportsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(VisitsReportsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InputServiceProvidersComponent } from './input-service-providers.component';

describe('InputServiceProvidersComponent', () => {
  let component: InputServiceProvidersComponent;
  let fixture: ComponentFixture<InputServiceProvidersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputServiceProvidersComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InputServiceProvidersComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExtensionOfficersComponent } from './extension-officers.component';

describe('ExtensionOfficersComponent', () => {
  let component: ExtensionOfficersComponent;
  let fixture: ComponentFixture<ExtensionOfficersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExtensionOfficersComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ExtensionOfficersComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

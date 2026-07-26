import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeneralLoaderComponent } from './general-loader.component';

describe('GeneralLoaderComponent', () => {
  let component: GeneralLoaderComponent;
  let fixture: ComponentFixture<GeneralLoaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeneralLoaderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeneralLoaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

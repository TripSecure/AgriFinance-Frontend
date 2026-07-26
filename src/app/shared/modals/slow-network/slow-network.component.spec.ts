import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SlowNetworkComponent } from './slow-network.component';

describe('SlowNetworkComponent', () => {
  let component: SlowNetworkComponent;
  let fixture: ComponentFixture<SlowNetworkComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SlowNetworkComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SlowNetworkComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

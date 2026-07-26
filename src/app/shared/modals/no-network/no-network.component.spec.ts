import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoNetworkComponent } from './no-network.component';

describe('NoNetworkComponent', () => {
  let component: NoNetworkComponent;
  let fixture: ComponentFixture<NoNetworkComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoNetworkComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NoNetworkComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

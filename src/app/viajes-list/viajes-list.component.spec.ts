import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ViajesListComponent } from './viajes-list.component';

describe('ViajesListComponent', () => {
  let component: ViajesListComponent;
  let fixture: ComponentFixture<ViajesListComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [ViajesListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ViajesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

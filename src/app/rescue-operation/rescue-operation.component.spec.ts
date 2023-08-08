import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RescueOperationComponent } from './rescue-operation.component';

describe('RescueOperationComponent', () => {
  let component: RescueOperationComponent;
  let fixture: ComponentFixture<RescueOperationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RescueOperationComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RescueOperationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

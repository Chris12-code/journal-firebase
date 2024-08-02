import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddCarTourModalComponent } from './add-car-tour-modal.component';

describe('TourDialogComponent', () => {
  let component: AddCarTourModalComponent;
  let fixture: ComponentFixture<AddCarTourModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AddCarTourModalComponent]
    });
    fixture = TestBed.createComponent(AddCarTourModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

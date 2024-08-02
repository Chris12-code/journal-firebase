import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddTourModalComponent } from './add-tour-modal.component';

describe('TourDialogComponent', () => {
  let component: AddTourModalComponent;
  let fixture: ComponentFixture<AddTourModalComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AddTourModalComponent]
    });
    fixture = TestBed.createComponent(AddTourModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

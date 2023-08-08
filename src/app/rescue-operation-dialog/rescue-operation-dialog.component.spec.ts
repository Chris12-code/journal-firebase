import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RescueOperationDialogComponent } from './rescue-operation-dialog.component';

describe('RescueOperationDialogComponent', () => {
  let component: RescueOperationDialogComponent;
  let fixture: ComponentFixture<RescueOperationDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RescueOperationDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RescueOperationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

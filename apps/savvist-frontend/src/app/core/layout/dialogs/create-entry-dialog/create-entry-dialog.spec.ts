import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { CreateEntryDialog } from './create-entry-dialog';

describe('CreateEntryDialog', () => {
  let component: CreateEntryDialog;
  let fixture: ComponentFixture<CreateEntryDialog>;
  const mockDialogRef = {
    close: jest.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateEntryDialog],
      providers: [{ provide: MatDialogRef, useValue: mockDialogRef }],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateEntryDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close dialog when close button is clicked', () => {
    const closeSpy = jest.spyOn(mockDialogRef, 'close');
    const closeBtn = fixture.nativeElement.querySelector('button[maticonbutton], button[aria-label="Close dialog"]');
    closeBtn?.click();
    expect(closeSpy).toHaveBeenCalled();
  });
});


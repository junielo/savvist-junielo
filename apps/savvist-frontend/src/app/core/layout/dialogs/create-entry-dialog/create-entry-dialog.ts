import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButtonModule,
    MatIconModule,
  ],
  selector: 'app-create-entry-dialog',
  styleUrl: './create-entry-dialog.scss',
  templateUrl: './create-entry-dialog.html',
})
export class CreateEntryDialog {
  private readonly dialogRef = inject(MatDialogRef<CreateEntryDialog>);

  protected close(): void {
    this.dialogRef.close();
  }
}

export { CreateEntryDialog as CreateEntry };


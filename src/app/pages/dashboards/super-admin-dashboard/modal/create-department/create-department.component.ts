import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Department } from '../../components/department/department.state';

@Component({
  selector: 'app-create-department',
  templateUrl: './create-department.component.html',
  styleUrl: './create-department.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateDepartmentComponent {
  private readonly dialogRef = inject(MatDialogRef<CreateDepartmentComponent, Department | null>);
  protected readonly department = inject<Department | null>(MAT_DIALOG_DATA, { optional: true });

  protected close(): void {
    this.dialogRef.close(null);
  }
}

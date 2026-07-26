import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatDialogRef, MatDialogTitle } from '@angular/material/dialog';

@Component({
  selector: 'app-no-network',
  imports: [MatDialogTitle],
  templateUrl: './no-network.component.html',
  styleUrl: './no-network.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NoNetworkComponent {
  private readonly dialogRef = inject(MatDialogRef<NoNetworkComponent>);

  onCancel(): void {
    this.dialogRef.close();
  }
}

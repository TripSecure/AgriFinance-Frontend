import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatDialogRef, MatDialogTitle } from '@angular/material/dialog';

@Component({
  selector: 'app-slow-network',
  imports: [MatDialogTitle],
  templateUrl: './slow-network.component.html',
  styleUrl: './slow-network.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SlowNetworkComponent {
  private readonly dialogRef = inject(MatDialogRef<SlowNetworkComponent>);

  onCancel(): void {
    this.dialogRef.close();
  }
}

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Store } from '@ngxs/store';
import { Logout } from '../../../auth/services/auth/auth.actions';
import { AuthState } from '../../../auth/services/auth/auth.states';
import { ToastrService } from '../../../../shared/toastr/toastr.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, MatIconModule, MatMenuModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly toastr = inject(ToastrService);

  protected readonly profile = this.store.selectSignal(AuthState.getProfile);
  protected readonly displayName = computed(() => this.profile()?.full_name ?? '');

  onLogout(): void {
    this.store.dispatch(new Logout()).subscribe(() => {
      this.toastr.triggerToastr('success', 'Logged out successfully.');
      void this.router.navigate(['/auth/login']);
    });
  }

  goToAccountSettings(): void {
    void this.router.navigate(['/dashboard/account-settings']);
  }
}

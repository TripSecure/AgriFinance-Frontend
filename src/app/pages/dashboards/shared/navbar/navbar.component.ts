import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Store } from '@ngxs/store';
import { Logout } from '../../../auth/services/auth/auth.actions';
import { AuthState } from '../../../auth/services/auth/auth.states';
import { ToastrService } from '../../../../shared/toastr/toastr.service';
// import {
//   GetUser,
//   UserState,
// } from '../../../pages/dashboard/components/access-roles/users.state';

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

  userId = this.store.selectSignal(AuthState.getUserId);
  // user = this.store.selectSignal(UserState.user);
  user = signal('AO');

  ngOnInit(): void {
    // this.store.dispatch(new GetUser(this.userId()));
  }

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

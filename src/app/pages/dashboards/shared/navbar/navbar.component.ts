import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router } from '@angular/router';
import { Store } from '@ngxs/store';
import { Logout } from '../../../auth/services/auth/auth.actions';
// import { ToastrService } from '../../shared/toastr/toastr.service';
import { AuthState } from '../../../auth/services/auth/auth.states';
// import {
//   GetUser,
//   UserState,
// } from '../../../pages/dashboard/components/access-roles/users.state';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, MatIconModule, MatMenuModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent {
  private router = inject(Router);
  private store = inject(Store);

  // private toastr = inject(ToastrService);

  userId = this.store.selectSignal(AuthState.getUserId);
  // user = this.store.selectSignal(UserState.user);
  user = signal("AO");

  ngOnInit() {
    // this.store.dispatch(new GetUser(this.userId()));
  }

  onLogout() {
    this.store.dispatch(new Logout()).subscribe(() => {
      // this.toastr.triggerToastr('success', 'Logout successful');
      this.router.navigate(['/login']);
    });
  }

  goToAccountSettings() {
    this.router.navigate(['/dashboard/account-settings']);
  }
}

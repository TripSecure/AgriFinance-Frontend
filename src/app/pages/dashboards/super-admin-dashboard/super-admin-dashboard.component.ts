import { Component } from '@angular/core';
import { NavbarComponent } from '../shared/navbar/navbar.component';
import { Router, RouterModule } from '@angular/router';
import { Actions, ofActionDispatched } from '@ngxs/store';
import { Logout } from '../../../pages/auth/services/auth/auth.actions';

@Component({
  selector: 'app-super-admin-dashboard',
  imports: [RouterModule, NavbarComponent],
  templateUrl: './super-admin-dashboard.component.html',
  styleUrl: './super-admin-dashboard.component.scss',
})
export class SuperAdminDashboardComponent {
  constructor(
    private actions$: Actions,
    private router: Router,
  ) {}

  ngOnInit() {
    this.actions$.pipe(ofActionDispatched(Logout)).subscribe(() => {
      void this.router.navigate(['/auth/login']);
    });
  }
}


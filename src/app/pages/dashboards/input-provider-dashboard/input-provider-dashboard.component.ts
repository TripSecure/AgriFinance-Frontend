import { Component } from '@angular/core';
import { NavbarComponent } from '../shared/navbar/navbar.component';
import { Router, RouterModule } from '@angular/router';
import { Actions, ofActionDispatched } from '@ngxs/store';
import { Logout } from '../../../pages/auth/services/auth/auth.actions';

@Component({
  selector: 'app-input-provider-dashboard',
  imports: [RouterModule, NavbarComponent],
  templateUrl: './input-provider-dashboard.component.html',
  styleUrl: './input-provider-dashboard.component.scss',
})
export class InputProviderDashboardComponent {
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

import { Component } from '@angular/core';
import { NavbarComponent } from '../shared/navbar/navbar.component';
import { Router, RouterModule } from '@angular/router';

import { Actions, ofActionDispatched } from '@ngxs/store';
import { Logout } from '../../../pages/auth/services/auth/auth.actions';

@Component({
  selector: 'app-portfolio-officer-dashboard',
  imports: [ RouterModule, NavbarComponent],
  templateUrl: './portfolio-officer-dashboard.component.html',
  styleUrl: './portfolio-officer-dashboard.component.scss',
})
export class PortfolioOfficerDashboardComponent {
  constructor(
    private actions$: Actions,
    private router: Router,
  ) {}

  ngOnInit() {
    this.actions$.pipe(ofActionDispatched(Logout)).subscribe(() => {
      this.router.navigate(['/']);
    });
  }
}

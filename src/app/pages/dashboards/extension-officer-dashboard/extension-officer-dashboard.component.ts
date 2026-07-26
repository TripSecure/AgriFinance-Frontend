import { Component } from '@angular/core';
import { NavbarComponent } from '../shared/navbar/navbar.component';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Actions, ofActionDispatched } from '@ngxs/store';
import { Logout } from '../../../pages/auth/services/auth/auth.actions';
@Component({
  selector: 'app-extension-officer-dashboard',
  imports: [MatIconModule, RouterModule, NavbarComponent],
  templateUrl: './extension-officer-dashboard.component.html',
  styleUrl: './extension-officer-dashboard.component.scss',
})
export class ExtensionOfficerDashboardComponent {
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


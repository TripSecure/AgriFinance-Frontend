import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  Event as RouterEvent,
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterOutlet,
} from '@angular/router';
import { Store } from '@ngxs/store';
import { MatDialog } from '@angular/material/dialog';
import { ToastrComponent } from './shared/toastr/toastr.component';
import { GeneralLoaderComponent } from './shared/general-loader/general-loader.component';
import { PersistState } from './pages/auth/services/auth/auth.actions';
import { SlowNetworkComponent } from './shared/modals/slow-network/slow-network.component';
import { NoNetworkComponent } from './shared/modals/no-network/no-network.component';

interface NetworkInformation extends EventTarget {
  readonly rtt?: number;
}

interface NavigatorWithConnection extends Navigator {
  readonly connection?: NetworkInformation;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastrComponent, GeneralLoaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:beforeunload)': 'onBeforeUnload()',
    '(window:online)': 'onOnline()',
    '(window:offline)': 'onOffline()',
  },
})
export class App {
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  protected readonly title = signal('TripSecure');
  protected readonly showLoader = signal(false);

  constructor() {
    const connection = (navigator as NavigatorWithConnection).connection;

    if (connection) {
      this.handleConnection(connection);
      connection.addEventListener('change', () => this.handleConnection(connection));
    }

    this.router.events.subscribe((event: RouterEvent) => {
      if (event instanceof NavigationStart) {
        this.showLoader.set(true);
      }

      if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.showLoader.set(false);
      }
    });
  }

  protected onBeforeUnload(): void {
    this.store.dispatch(new PersistState()).subscribe();
  }

  protected onOnline(): void {
    this.dialog.closeAll();
  }

  protected onOffline(): void {
    this.dialog.open(NoNetworkComponent);
  }

  private handleConnection(connection: NetworkInformation): void {
    if ((connection.rtt ?? 0) > 800) {
      this.dialog.open(SlowNetworkComponent);
    }
  }
}

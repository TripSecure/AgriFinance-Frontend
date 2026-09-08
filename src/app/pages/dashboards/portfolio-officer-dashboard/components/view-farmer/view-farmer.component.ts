import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Store } from '@ngxs/store';
import { filter } from 'rxjs';
import { TabsModule } from 'primeng/tabs';
import { FarmersState, GetPortfolioFarmerDetails } from '../farmers/farmers.state';

@Component({
  selector: 'app-view-farmer',
  imports: [TabsModule, RouterLink, RouterOutlet],
  templateUrl: './view-farmer.component.html',
  styleUrl: './view-farmer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewFarmerComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  protected readonly farmer = this.store.selectSignal(FarmersState.selectedFarmer);
  protected readonly isDetailLoading = this.store.selectSignal(FarmersState.isDetailLoading);

  protected readonly farmerId = computed(() => this.route.snapshot.paramMap.get('farmerId') || '');

  protected readonly farmerName = computed(() => {
    const f = this.farmer();
    if (!f) return 'Farmer Profile';
    return (
      f.fullName ||
      f.full_name ||
      [f.firstName, f.lastName].filter(Boolean).join(' ') ||
      'Farmer Profile'
    );
  });

  protected readonly farmerContact = computed(() => {
    const f = this.farmer();
    return f?.phone || f?.phoneNumber || f?.email || '-';
  });

  protected readonly farmerLocation = computed(() => {
    const f = this.farmer();
    return [f?.community, f?.region].filter(Boolean).join(', ') || f?.location || '-';
  });

  protected readonly farmerStatus = computed(() => {
    const f = this.farmer();
    return (f?.approvalStatus || f?.status || 'Active').toUpperCase();
  });

  protected readonly activeTab = computed(() => {
    const url = this.router.url;
    if (url.includes('/loans')) {
      return 'loans';
    }
    if (url.includes('/reports')) {
      return 'reports';
    }
    return 'farms';
  });

  ngOnInit(): void {
    const id = this.farmerId();
    if (id) {
      this.store.dispatch(new GetPortfolioFarmerDetails(id)).subscribe();
    }
  }
}

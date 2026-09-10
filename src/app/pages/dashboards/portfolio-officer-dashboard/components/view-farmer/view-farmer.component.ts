import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
export class ViewFarmerComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  public readonly farmerId = input<string | undefined>();

  protected readonly farmer = this.store.selectSignal(FarmersState.selectedFarmer);
  protected readonly isDetailLoading = this.store.selectSignal(FarmersState.isDetailLoading);

  private readonly routeFarmerId = toSignal(
    this.route.paramMap.pipe(filter(Boolean)),
  );

  protected readonly effectiveFarmerId = computed(() => {
    return (
      this.farmerId() ||
      this.routeFarmerId()?.get('farmerId') ||
      this.route.snapshot.paramMap.get('farmerId') ||
      this.route.parent?.snapshot.paramMap.get('farmerId') ||
      ''
    );
  });

  private readonly navEnd = toSignal(
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)),
  );

  protected readonly activeTab = computed(() => {
    this.navEnd();
    const url = this.router.url;
    if (url.includes('/loans')) {
      return 'loans';
    }
    if (url.includes('/reports')) {
      return 'reports';
    }
    return 'farms';
  });

  protected readonly farmerName = computed(() => {
    const f = this.farmer();
    if (!f) return 'Farmer Profile';
    const personal =
      typeof f['personalDetails'] === 'object' && f['personalDetails'] !== null
        ? (f['personalDetails'] as Record<string, unknown>)
        : typeof f['personal_details'] === 'object' && f['personal_details'] !== null
        ? (f['personal_details'] as Record<string, unknown>)
        : null;

    return (
      f.fullName ||
      f.full_name ||
      personal?.['fullName'] ||
      personal?.['full_name'] ||
      personal?.['name'] ||
      [f.firstName, f.lastName].filter(Boolean).join(' ') ||
      [personal?.['firstName'], personal?.['lastName']].filter(Boolean).join(' ') ||
      f['name'] ||
      'Farmer Profile'
    ) as string;
  });

  protected readonly farmerContact = computed(() => {
    const f = this.farmer();
    if (!f) return '-';
    const personal =
      typeof f['personalDetails'] === 'object' && f['personalDetails'] !== null
        ? (f['personalDetails'] as Record<string, unknown>)
        : typeof f['personal_details'] === 'object' && f['personal_details'] !== null
        ? (f['personal_details'] as Record<string, unknown>)
        : null;

    return (
      f.phone ||
      f.phoneNumber ||
      f['phone_number'] ||
      personal?.['phone'] ||
      personal?.['phoneNumber'] ||
      personal?.['phone_number'] ||
      f.email ||
      personal?.['email'] ||
      '-'
    ) as string;
  });

  protected readonly farmerLocation = computed(() => {
    const f = this.farmer();
    if (!f) return '-';
    const farm =
      typeof f['farmDetails'] === 'object' && f['farmDetails'] !== null
        ? (f['farmDetails'] as Record<string, unknown>)
        : typeof f['farm_details'] === 'object' && f['farm_details'] !== null
        ? (f['farm_details'] as Record<string, unknown>)
        : null;

    const community =
      f.community ||
      farm?.['community'] ||
      farm?.['farmAddressCommunity'] ||
      farm?.['location'];
    const region = f.region || farm?.['region'] || farm?.['farmAddressRegion'];
    return [community, region].filter(Boolean).join(', ') || f.location || '-';
  });

  protected readonly farmerStatus = computed(() => {
    const f = this.farmer();
    return String(
      f?.approvalStatus || f?.status || f?.['verificationStatus'] || 'Active',
    ).toUpperCase();
  });

  constructor() {
    effect(() => {
      const id = this.effectiveFarmerId();
      if (id) {
        this.store.dispatch(new GetPortfolioFarmerDetails(id)).subscribe();
      }
    });
  }
}

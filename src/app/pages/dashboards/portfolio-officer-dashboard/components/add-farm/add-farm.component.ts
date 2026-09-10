import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { FormInputComponent, SelectOption } from '../../../../../shared/form-input/form-input.component';
import { ToastrService } from '../../../../../shared/toastr/toastr.service';
import { FarmersState, GetPortfolioFarmers } from '../farmers/farmers.state';
import { CreatePortfolioFarm, CreatePortfolioFarmPayload, PortfolioFarmsState } from '../farms/farms.state';

type FarmerDetailsControls = {
  farmerId: FormControl<string>;
  farmerCode: FormControl<string>;
  region: FormControl<string>;
  district: FormControl<string>;
  community: FormControl<string>;
  farmAddress: FormControl<string>;
  gpsLatitude: FormControl<number>;
  gpsLongitude: FormControl<number>;
  cooperativeGroupName: FormControl<string>;
};

type ProductionDetailsControls = {
  farmSizeAcres: FormControl<number>;
  primaryCrop: FormControl<string>;
  secondaryCrop: FormControl<string>;
  expectedAnnualYield: FormControl<number>;
  farmingExperienceYears: FormControl<number>;
  irrigationMethod: FormControl<string>;
};

@Component({
  selector: 'app-add-farm',
  imports: [
    FormInputComponent,
    MatButtonModule,
    MatIconModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './add-farm.component.html',
  styleUrl: './add-farm.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddFarmComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);
  private readonly toastr = inject(ToastrService);

  protected readonly isCreating = this.store.selectSignal(PortfolioFarmsState.isCreating);
  protected readonly stateErrors = this.store.selectSignal(PortfolioFarmsState.errors);
  protected readonly stateMessage = this.store.selectSignal(PortfolioFarmsState.message);
  protected readonly farmers = this.store.selectSignal(FarmersState.farmers);

  protected readonly farmerIdFromRoute = signal<string | null>(null);
  protected readonly localSubmitError = signal<string | null>(null);

  protected readonly isFarmerContext = computed(() => Boolean(this.farmerIdFromRoute()));
  protected readonly pageTitle = computed(() => 'Add Farm');
  protected readonly backLink = computed(() => {
    const farmerId = this.farmerIdFromRoute();
    return farmerId
      ? `/dashboard/portfolio-officer/farmers/${farmerId}/farms`
      : '/dashboard/portfolio-officer/farms';
  });
  protected readonly backLinkLabel = computed(() => {
    return this.isFarmerContext() ? 'Back to farmer farms' : 'Back to farms';
  });

  protected readonly submitButtonText = computed(() => {
    return this.isCreating() ? 'Submitting...' : 'Submit Farm';
  });

  protected readonly regionOptions = ['Greater Accra', 'Ashanti', 'Northern', 'Eastern', 'Volta'];
  protected readonly cropOptions = ['maize', 'rice', 'cassava', 'cocoa', 'soybean', 'vegetables'];
  protected readonly irrigationOptions = ['rainfed', 'manual', 'drip', 'sprinkler', 'mechanized'];

  protected readonly farmerOptions = computed<SelectOption[]>(() => {
    return this.farmers().map((farmer) => ({
      id: farmer.id,
      name: `${farmer.fullName || farmer.full_name || 'Farmer'} (${farmer.farmerCode || farmer.farmer_code || farmer.id})`,
    }));
  });

  protected readonly farmerDetailsForm = new FormGroup<FarmerDetailsControls>({
    farmerId: new FormControl('', { nonNullable: true }),
    farmerCode: new FormControl('', { nonNullable: true, validators: Validators.required }),
    region: new FormControl('Greater Accra', {
      nonNullable: true,
      validators: Validators.required,
    }),
    district: new FormControl('', { nonNullable: true, validators: Validators.required }),
    community: new FormControl('', { nonNullable: true, validators: Validators.required }),
    farmAddress: new FormControl('', { nonNullable: true, validators: Validators.required }),
    gpsLatitude: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(-90), Validators.max(90)],
    }),
    gpsLongitude: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(-180), Validators.max(180)],
    }),
    cooperativeGroupName: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });

  protected readonly productionDetailsForm = new FormGroup<ProductionDetailsControls>({
    farmSizeAcres: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0.01)],
    }),
    primaryCrop: new FormControl('maize', { nonNullable: true, validators: Validators.required }),
    secondaryCrop: new FormControl('cassava', { nonNullable: true }),
    expectedAnnualYield: new FormControl(0, { nonNullable: true }),
    farmingExperienceYears: new FormControl(0, { nonNullable: true }),
    irrigationMethod: new FormControl('rainfed', { nonNullable: true }),
  });

  constructor() {
    this.farmerDetailsForm.controls.farmerId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((selectedId) => {
        const selected = this.farmers().find((f) => f.id === selectedId);
        const code = selected?.farmerCode || selected?.farmer_code;
        if (code && !this.farmerDetailsForm.controls.farmerCode.dirty) {
          this.farmerDetailsForm.controls.farmerCode.setValue(code);
        }
      });
  }

  ngOnInit(): void {
    const farmerId =
      this.route.snapshot.paramMap.get('farmerId') ||
      this.route.parent?.snapshot.paramMap.get('farmerId') ||
      this.route.snapshot.queryParamMap.get('farmerId') ||
      null;

    if (farmerId) {
      this.farmerIdFromRoute.set(farmerId);
      this.farmerDetailsForm.controls.farmerId.setValue(farmerId);
      const farmer =
        this.store.selectSnapshot(FarmersState.selectedFarmer) ||
        this.store.selectSnapshot(FarmersState.farmers).find((f) => f.id === farmerId);
      const code = farmer?.farmerCode || farmer?.farmer_code;
      if (code) {
        this.farmerDetailsForm.controls.farmerCode.setValue(code);
      }
    } else {
      this.farmerDetailsForm.controls.farmerId.setValidators(Validators.required);
      this.farmerDetailsForm.controls.farmerId.updateValueAndValidity();
      this.store.dispatch(new GetPortfolioFarmers({ rows: 100 })).subscribe();
    }
  }

  protected onSubmit(): void {
    this.markAllFormsTouched();

    const targetFarmerId =
      this.farmerIdFromRoute() || this.farmerDetailsForm.controls.farmerId.value;

    if (!targetFarmerId) {
      this.localSubmitError.set('Please select an associated farmer.');
      this.farmerDetailsForm.controls.farmerId.setErrors({ required: true });
      return;
    }

    if (this.farmerDetailsForm.invalid || this.productionDetailsForm.invalid) {
      this.localSubmitError.set('Please complete all required fields.');
      return;
    }

    this.localSubmitError.set(null);
    const farmerDetails = this.farmerDetailsForm.getRawValue();
    const production = this.productionDetailsForm.getRawValue();
    const farmSizeAcresNum = Number(production.farmSizeAcres) || 0;
    const sizeHectaresNum = farmSizeAcresNum / 2.47105;

    const payload: CreatePortfolioFarmPayload = {
      farmerId: targetFarmerId,
      farmerDetails: {
        farmerCode: farmerDetails.farmerCode,
        region: farmerDetails.region,
        district: farmerDetails.district,
        community: farmerDetails.community,
        farmAddress: farmerDetails.farmAddress,
        gpsLatitude: Number(farmerDetails.gpsLatitude) || 0,
        gpsLongitude: Number(farmerDetails.gpsLongitude) || 0,
        cooperativeGroupName: farmerDetails.cooperativeGroupName,
      },
      production: {
        farmSizeAcres: farmSizeAcresNum,
        primaryCrop: production.primaryCrop,
        secondaryCrop: production.secondaryCrop,
        expectedAnnualYield: Number(production.expectedAnnualYield) || 0,
        farmingExperienceYears: Number(production.farmingExperienceYears) || 0,
        irrigationMethod: production.irrigationMethod,
      },
      // Backend validation & compatibility fallbacks
      cropType: production.primaryCrop,
      crop_type: production.primaryCrop,
      primaryCrop: production.primaryCrop,
      primary_crop: production.primaryCrop,
      secondaryCrop: production.secondaryCrop || undefined,
      secondary_crop: production.secondaryCrop || undefined,
      sizeHectares: sizeHectaresNum,
      size_hectares: sizeHectaresNum,
      sizeAcres: farmSizeAcresNum,
      farmSizeAcres: farmSizeAcresNum,
      farmSizeHectares: sizeHectaresNum,
      farm_size_hectares: sizeHectaresNum,
      farmerCode: farmerDetails.farmerCode,
      farmer_code: farmerDetails.farmerCode,
      region: farmerDetails.region,
      farmAddressRegion: farmerDetails.region,
      farm_address_region: farmerDetails.region,
      district: farmerDetails.district,
      farmAddressDistrict: farmerDetails.district,
      farm_address_district: farmerDetails.district,
      community: farmerDetails.community,
      farmAddressCommunity: farmerDetails.community,
      farm_address_community: farmerDetails.community,
      location: farmerDetails.community || farmerDetails.region,
      locationLabel: `${farmerDetails.community}, ${farmerDetails.region}`,
      location_label: `${farmerDetails.community}, ${farmerDetails.region}`,
      gpsAddress: farmerDetails.farmAddress,
      gps_address: farmerDetails.farmAddress,
      farmAddress: farmerDetails.farmAddress,
      farm_address: farmerDetails.farmAddress,
      address: farmerDetails.farmAddress,
      gpsLatitude: Number(farmerDetails.gpsLatitude) || 0,
      gps_latitude: Number(farmerDetails.gpsLatitude) || 0,
      latitude: Number(farmerDetails.gpsLatitude) || 0,
      lat: Number(farmerDetails.gpsLatitude) || 0,
      gpsLongitude: Number(farmerDetails.gpsLongitude) || 0,
      gps_longitude: Number(farmerDetails.gpsLongitude) || 0,
      longitude: Number(farmerDetails.gpsLongitude) || 0,
      lng: Number(farmerDetails.gpsLongitude) || 0,
      lon: Number(farmerDetails.gpsLongitude) || 0,
      gpsLocation: {
        latitude: Number(farmerDetails.gpsLatitude) || 0,
        longitude: Number(farmerDetails.gpsLongitude) || 0,
      },
      gps_location: {
        latitude: Number(farmerDetails.gpsLatitude) || 0,
        longitude: Number(farmerDetails.gpsLongitude) || 0,
      },
      cooperativeName: farmerDetails.cooperativeGroupName,
      cooperative_name: farmerDetails.cooperativeGroupName,
      cooperative: farmerDetails.cooperativeGroupName,
      groupName: farmerDetails.cooperativeGroupName,
      group_name: farmerDetails.cooperativeGroupName,
      cooperativeGroupName: farmerDetails.cooperativeGroupName,
      annualYield: Number(production.expectedAnnualYield) || 0,
      expectedAnnualYield: Number(production.expectedAnnualYield) || 0,
      yieldKg: Number(production.expectedAnnualYield) || 0,
      farmingExperienceYears: Number(production.farmingExperienceYears) || 0,
      irrigationMethod: production.irrigationMethod || undefined,
    };

    this.store.dispatch(new CreatePortfolioFarm(targetFarmerId, payload)).subscribe({
      next: () => {
        if (this.stateErrors().length) {
          this.toastr.triggerToastr('error', this.stateErrors()[0]);
          return;
        }

        const fallbackMessage = 'Farm added successfully.';
        this.toastr.triggerToastr('success', this.stateMessage() || fallbackMessage);
        if (this.isFarmerContext()) {
          void this.router.navigate([
            '/dashboard/portfolio-officer/farmers',
            targetFarmerId,
            'farms',
          ]);
        } else {
          void this.router.navigate(['/dashboard/portfolio-officer/farms']);
        }
      },
      error: () => {
        this.toastr.triggerToastr('error', 'Unable to add farm.');
      },
    });
  }

  private markAllFormsTouched(): void {
    this.farmerDetailsForm.markAllAsTouched();
    this.productionDetailsForm.markAllAsTouched();
  }
}

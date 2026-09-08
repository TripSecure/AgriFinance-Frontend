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
import { MatStepperModule } from '@angular/material/stepper';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '@ngxs/store';
import { FormInputComponent, SelectOption } from '../../../../../shared/form-input/form-input.component';
import { ToastrService } from '../../../../../shared/toastr/toastr.service';
import { FarmersState, GetPortfolioFarmers } from '../farmers/farmers.state';
import { CreatePortfolioFarm, CreatePortfolioFarmPayload, PortfolioFarmsState } from '../farms/farms.state';

type FarmerDetailsControls = {
  farmerId: FormControl<string>;
  farmerCode: FormControl<string>;
  cropType: FormControl<string>;
  secondaryCrop: FormControl<string>;
  sizeHectares: FormControl<number>;
  annualYield: FormControl<number>;
  irrigationMethod: FormControl<string>;
  region: FormControl<string>;
  district: FormControl<string>;
  community: FormControl<string>;
  gpsAddress: FormControl<string>;
  gpsLatitude: FormControl<number>;
  gpsLongitude: FormControl<number>;
  cooperativeName: FormControl<string>;
};

@Component({
  selector: 'app-add-farm',
  imports: [
    FormInputComponent,
    MatButtonModule,
    MatIconModule,
    MatStepperModule,
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
  protected readonly isLinear = signal(false);

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
    cropType: new FormControl('maize', { nonNullable: true, validators: Validators.required }),
    secondaryCrop: new FormControl('cassava', { nonNullable: true }),
    sizeHectares: new FormControl(1, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(0.01)],
    }),
    annualYield: new FormControl(0, { nonNullable: true }),
    irrigationMethod: new FormControl('rainfed', { nonNullable: true }),
    region: new FormControl('Greater Accra', {
      nonNullable: true,
      validators: Validators.required,
    }),
    district: new FormControl('', { nonNullable: true, validators: Validators.required }),
    community: new FormControl('', { nonNullable: true, validators: Validators.required }),
    gpsAddress: new FormControl('', { nonNullable: true, validators: Validators.required }),
    gpsLatitude: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(-90), Validators.max(90)],
    }),
    gpsLongitude: new FormControl(0, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(-180), Validators.max(180)],
    }),
    cooperativeName: new FormControl('', { nonNullable: true, validators: Validators.required }),
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

    if (this.farmerDetailsForm.invalid) {
      this.localSubmitError.set('Please complete all required fields.');
      return;
    }

    this.localSubmitError.set(null);
    const formValue = this.farmerDetailsForm.getRawValue();
    const sizeHectaresNum = Number(formValue.sizeHectares) || 0;
    const payload: CreatePortfolioFarmPayload = {
      farmerId: targetFarmerId,
      farmerCode: formValue.farmerCode,
      farmer_code: formValue.farmerCode,
      sizeHectares: sizeHectaresNum,
      size_hectares: sizeHectaresNum,
      farmSizeHectares: sizeHectaresNum,
      farm_size_hectares: sizeHectaresNum,
      sizeAcres: sizeHectaresNum * 2.47105,
      farmSizeAcres: sizeHectaresNum * 2.47105,
      cropType: formValue.cropType,
      crop_type: formValue.cropType,
      primaryCrop: formValue.cropType,
      primary_crop: formValue.cropType,
      secondaryCrop: formValue.secondaryCrop || undefined,
      secondary_crop: formValue.secondaryCrop || undefined,
      annualYield: formValue.annualYield ? Number(formValue.annualYield) : undefined,
      yieldKg: formValue.annualYield ? Number(formValue.annualYield) : undefined,
      irrigationMethod: formValue.irrigationMethod || undefined,
      farmName: formValue.gpsAddress || formValue.community || 'Farm',
      farm_name: formValue.gpsAddress || formValue.community || 'Farm',
      region: formValue.region,
      farmAddressRegion: formValue.region,
      farm_address_region: formValue.region,
      district: formValue.district,
      farmAddressDistrict: formValue.district,
      farm_address_district: formValue.district,
      community: formValue.community,
      farmAddressCommunity: formValue.community,
      farm_address_community: formValue.community,
      location: formValue.community || formValue.region,
      locationLabel: `${formValue.community}, ${formValue.region}`,
      location_label: `${formValue.community}, ${formValue.region}`,
      gpsAddress: formValue.gpsAddress,
      gps_address: formValue.gpsAddress,
      farmAddress: formValue.gpsAddress,
      farm_address: formValue.gpsAddress,
      address: formValue.gpsAddress,
      gpsLatitude: Number(formValue.gpsLatitude),
      gps_latitude: Number(formValue.gpsLatitude),
      latitude: Number(formValue.gpsLatitude),
      lat: Number(formValue.gpsLatitude),
      gpsLongitude: Number(formValue.gpsLongitude),
      gps_longitude: Number(formValue.gpsLongitude),
      longitude: Number(formValue.gpsLongitude),
      lng: Number(formValue.gpsLongitude),
      lon: Number(formValue.gpsLongitude),
      gpsLocation: {
        latitude: Number(formValue.gpsLatitude),
        longitude: Number(formValue.gpsLongitude),
      },
      gps_location: {
        latitude: Number(formValue.gpsLatitude),
        longitude: Number(formValue.gpsLongitude),
      },
      cooperativeName: formValue.cooperativeName,
      cooperative_name: formValue.cooperativeName,
      cooperative: formValue.cooperativeName,
      groupName: formValue.cooperativeName,
      group_name: formValue.cooperativeName,
      farmDetails: {
        farmerCode: formValue.farmerCode,
        farmAddressRegion: formValue.region,
        district: formValue.district,
        community: formValue.community,
        gpsAddress: formValue.gpsAddress,
        farmSizeHectares: sizeHectaresNum,
        primaryCrop: formValue.cropType,
        gpsLocation: {
          latitude: Number(formValue.gpsLatitude),
          longitude: Number(formValue.gpsLongitude),
        },
        cooperativeName: formValue.cooperativeName,
      },
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
  }
}

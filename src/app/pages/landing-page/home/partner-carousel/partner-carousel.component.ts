import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-partner-carousel',
  templateUrl: './partner-carousel.component.html',
  styleUrl: './partner-carousel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartnerCarouselComponent {
  protected readonly partners = [
    'GHANA COCOBOD',
    'ECOBANK',
    'MTN MOMO',
    'STANBIC BANK',
    'ABSA',
    'VODAFONE',
  ];
}

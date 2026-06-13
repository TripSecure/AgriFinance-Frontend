import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PartnerCarouselComponent } from './partner-carousel/partner-carousel.component';

@Component({
  selector: 'app-home',
  imports: [NgOptimizedImage, RouterLink, PartnerCarouselComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly activeStoryIndex = signal(0);

  protected readonly partners = [
    'GHANA COCOBOD',
    'ECOBANK',
    'MTN MOMO',
    'STANBIC BANK',
    'ABSA',
    'VODAFONE',
  ];

  protected readonly solutions = [
    {
      title: 'Traditional Wisdom',
      description:
        'Integrating localized farming knowledge with predictive climate analytics for optimal planting.',
      iconPath:
        'M12 2a7 7 0 0 0-7 7c0 2.1.9 4 2.4 5.3V18h3v-4.8a2 2 0 1 1 3.2 0V18h3v-3.7A7 7 0 0 0 12 2Zm-3 8a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm-6 9h6v2H9v-2Z',
    },
    {
      title: 'Modern Finance',
      description:
        'Customized credit facilities and digital wallets designed for the seasonal nature of agriculture.',
      iconPath:
        'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15.9V19h-2v-1.1c-1.7-.3-3-1.3-3.1-3.1h2.2c.1.9.8 1.4 1.9 1.4 1.2 0 1.8-.5 1.8-1.2 0-.6-.4-1-2.2-1.5-2.1-.5-3.4-1.3-3.4-3.1 0-1.6 1.1-2.7 2.8-3V6h2v1.3c1.7.3 2.8 1.3 2.9 2.9h-2.2c-.1-.8-.7-1.2-1.7-1.2-1.1 0-1.6.4-1.6 1.1 0 .6.5.9 2.4 1.4 2 .5 3.2 1.4 3.2 3.2 0 1.6-1.1 2.8-3 3.2Z',
    },
    {
      title: 'Risk Shield',
      description:
        'Automated weather-indexed insurance that pays out instantly when drought or floods occur.',
      iconPath:
        'm12 2 8 3v6c0 5.1-3.4 9.8-8 11-4.6-1.2-8-5.9-8-11V5l8-3Zm0 2.2L6 6.4V11c0 3.9 2.5 7.6 6 8.8 3.5-1.2 6-4.9 6-8.8V6.4l-6-2.2Zm-1 10.6-3-3 1.4-1.4L11 12l3.6-3.6 1.4 1.4-5 5Z',
    },
    {
      title: 'Input Access',
      description:
        'Bulk procurement of high-quality seeds and fertilizers delivered directly to farm gates.',
      iconPath:
        'M4 3h16v4h-1v14H5V7H4V3Zm3 4v12h10V7H7Zm2 3h6v2H9v-2Z',
    },
    {
      title: 'Market Linkages',
      description:
        'Direct connection to off-takers and processing plants to ensure fair pricing for produce.',
      iconPath:
        'M4 3h16l2 6v2a3 3 0 0 1-2 2.8V21H4v-7.2A3 3 0 0 1 2 11V9l2-6Zm1.5 2-.7 3h14.4l-.7-3h-13ZM6 13.8V19h12v-5.2a3.1 3.1 0 0 1-2-1.1A3.1 3.1 0 0 1 12 13a3.1 3.1 0 0 1-4-.3 3.1 3.1 0 0 1-2 1.1Z',
    },
    {
      title: 'Field Tech',
      description:
        'Real-time farm monitoring via satellite imagery and mobile-based soil sensor integration.',
      iconPath:
        'M12 8a4 4 0 0 1 4 4c0 1.1-.4 2.1-1.2 2.8l-1.4-1.4A2 2 0 1 0 10.6 13l-1.4 1.4A4 4 0 0 1 12 8Zm-6.4-2.4L7 7a7 7 0 0 0 0 10l-1.4 1.4a9 9 0 0 1 0-12.8Zm12.8 0a9 9 0 0 1 0 12.8L17 17a7 7 0 0 0 0-10l1.4-1.4ZM12 11a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z',
    },
  ];

  protected readonly journeySteps = [
    {
      title: 'Registration & Profiling',
      description:
        'Onboard via our digital platform or field agents to create your data-driven farmer profile.',
    },
    {
      title: 'Resource Allocation',
      description:
        'Receive pre-approved financing for seeds, fertilizers, and insurance coverage tailored to your soil.',
    },
    {
      title: 'Support & Monitoring',
      description:
        'Get technical advice and weather updates through the growing season via our mobile app.',
    },
    {
      title: 'Harvest & Market Access',
      description:
        'Secure structured off-take agreements and receive payments directly into your digital wallet.',
    },
  ];

  protected readonly farmerStories = [
    {
      name: 'Akosua',
      role: 'Maize Farmer, Ghana',
      quote:
        "TripSecure didn't just give me a loan; they gave me a roadmap for success. My yields have doubled in just two seasons.",
      image: '/images/farmer-stories-akosua.png',
      alt: 'Akosua holding a basket of freshly harvested vegetables',
    },
    {
      name: 'Kwame',
      role: "Cocoa Farmer, Côte d'Ivoire",
      quote:
        "The monitoring system saved my crop from a blight I didn't even see coming. This technology is a blessing for our community.",
      image: '/images/farmer-stories-kwame.png',
      alt: 'Portrait of Kwame standing outdoors on his farm',
    },
    {
      name: 'Abena',
      role: 'Young Agri-Entrepreneur, Ghana',
      quote:
        'As a young entrepreneur, finding finance was impossible until TripSecure. They looked at my data, not just my collateral.',
      image: '/images/farmer-stories-abena.png',
      alt: 'Abena holding a tablet inside a greenhouse',
    },
  ];

  protected readonly visibleFarmerStories = computed(() => {
    const startIndex = this.activeStoryIndex();

    return this.farmerStories.map(
      (_, offset) => this.farmerStories[(startIndex + offset) % this.farmerStories.length],
    );
  });

  protected showPreviousStory(): void {
    this.activeStoryIndex.update(
      (index) => (index - 1 + this.farmerStories.length) % this.farmerStories.length,
    );
  }

  protected showNextStory(): void {
    this.activeStoryIndex.update((index) => (index + 1) % this.farmerStories.length);
  }
}

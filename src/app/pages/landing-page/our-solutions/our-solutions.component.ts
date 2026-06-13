import { NgOptimizedImage, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-our-solutions',
  imports: [NgOptimizedImage, NgTemplateOutlet],
  templateUrl: './our-solutions.component.html',
  styleUrl: './our-solutions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OurSolutionsComponent {}

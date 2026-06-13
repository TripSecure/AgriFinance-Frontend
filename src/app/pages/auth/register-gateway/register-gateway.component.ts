import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-register-gateway',
  imports: [NgOptimizedImage, RouterLink],
  templateUrl: './register-gateway.component.html',
  styleUrl: './register-gateway.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterGatewayComponent {}

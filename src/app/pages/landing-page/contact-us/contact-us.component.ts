import { NgOptimizedImage, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface ContactFormValue {
  fullName: string;
  emailAddress: string;
  phoneNumber: string;
  farmType: string;
  message: string;
}

@Component({
  selector: 'app-contact-us',
  imports: [NgOptimizedImage, NgTemplateOutlet, ReactiveFormsModule, RouterLink],
  templateUrl: './contact-us.component.html',
  styleUrl: './contact-us.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactUsComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly contactErrorMessages: Record<
    keyof ContactFormValue,
    Partial<Record<string, string>>
  > = {
    fullName: {
      required: 'Enter your full name.',
    },
    emailAddress: {
      required: 'Enter your email address.',
      email: 'Enter a valid email address.',
    },
    phoneNumber: {
      required: 'Enter your phone number.',
    },
    farmType: {
      required: 'Select a farm type.',
    },
    message: {
      required: 'Tell us how we can help.',
    },
  };

  protected readonly isSubmitting = signal(false);
  protected readonly contactForm = this.formBuilder.group({
    fullName: ['', Validators.required],
    emailAddress: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', Validators.required],
    farmType: ['Commercial Crop', Validators.required],
    message: ['', Validators.required],
  });
  protected readonly contactControls = this.contactForm.controls;

  protected getContactFieldError(controlName: keyof ContactFormValue): string | null {
    const control = this.contactControls[controlName];

    if (!control.touched || control.valid) {
      return null;
    }

    const messages = this.contactErrorMessages[controlName];
    const errorKey = Object.keys(control.errors ?? {}).find((key) => messages[key]);

    return errorKey ? (messages[errorKey] ?? null) : null;
  }

  protected async applyNow(): Promise<void> {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    try {
      const submittedForm: ContactFormValue = this.contactForm.getRawValue();
      console.log('Contact application:', submittedForm);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}

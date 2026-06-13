import { NgOptimizedImage, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormField, email, form, required, submit } from '@angular/forms/signals';

interface ContactFormModel {
  fullName: string;
  emailAddress: string;
  phoneNumber: string;
  farmType: string;
  message: string;
}

@Component({
  selector: 'app-contact-us',
  imports: [NgOptimizedImage, NgTemplateOutlet, FormField],
  templateUrl: './contact-us.component.html',
  styleUrl: './contact-us.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactUsComponent {
  private readonly contactModel = signal<ContactFormModel>({
    fullName: '',
    emailAddress: '',
    phoneNumber: '',
    farmType: 'Commercial Crop',
    message: '',
  });

  protected readonly contactForm = form(this.contactModel, (fields) => {
    required(fields.fullName, { message: 'Enter your full name.' });
    required(fields.emailAddress, { message: 'Enter your email address.' });
    email(fields.emailAddress, { message: 'Enter a valid email address.' });
    required(fields.phoneNumber, { message: 'Enter your phone number.' });
    required(fields.farmType, { message: 'Select a farm type.' });
    required(fields.message, { message: 'Tell us how we can help.' });
  });

  protected async applyNow(event: SubmitEvent): Promise<void> {
    event.preventDefault();

    await submit(this.contactForm, async (submittedForm) => {
      console.log('Contact application:', submittedForm().value());
    });
  }
}

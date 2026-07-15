import { Directive } from '@angular/core';

@Directive({
  selector: '[appNumbersOnly]',
  host: {
    '(input)': 'onInputChange($event)',
  },
})
export class NumbersOnlyDirective {
  onInputChange(event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) {
      return;
    }

    event.target.value = event.target.value.replace(/\D/g, '');
  }
}

import { AbstractControl, FormArray, FormGroup } from '@angular/forms';

export function getInvalidControlLabels(control: AbstractControl): string[] {
  const labels: string[] = [];
  collectInvalidControls(control, labels);

  return labels;
}

function collectInvalidControls(control: AbstractControl, labels: string[], key = ''): void {
  if (control instanceof FormGroup) {
    Object.entries(control.controls).forEach(([childKey, childControl]) => {
      collectInvalidControls(childControl, labels, childKey);
    });

    return;
  }

  if (control instanceof FormArray) {
    control.controls.forEach((childControl, index) => {
      collectInvalidControls(childControl, labels, `${key} ${index + 1}`);
    });

    return;
  }

  if (control.invalid) {
    labels.push(toReadableLabel(key));
  }
}

function toReadableLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
}

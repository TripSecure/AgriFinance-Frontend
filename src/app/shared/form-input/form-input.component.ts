import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  Input,
  output,
  QueryList,
  signal,
  Signal,
  ViewChild,
  ViewChildren,
  WritableSignal,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MultiSelectModule } from 'primeng/multiselect';
import { DatePicker } from 'primeng/datepicker';
import { Select, SelectChangeEvent } from 'primeng/select';
import { forkJoin, take } from 'rxjs';
import { KycDocumentUploadService } from '../services/kyc-document-upload.service';
import { extractErrorMessage } from '../request.utils';

type FileUploadStatus = 'idle' | 'uploading' | 'uploaded' | 'error';

export interface SelectOption {
  id: string | number;
  name: string;
}

@Component({
  selector: 'app-form-input',
  imports: [
    ReactiveFormsModule,
    CommonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatIconModule,
    MatCheckboxModule,
    MultiSelectModule,
    DatePicker,
    Select,
  ],
  templateUrl: './form-input.component.html',
  styleUrl: './form-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormInputComponent {
  private readonly kycDocumentUploadService = inject(KycDocumentUploadService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private uploadRequestId = 0;

  readonly label = input('');
  readonly name = input.required<string>();
  readonly type = input('');
  readonly placeholder = input('');
  readonly title = input('');
  readonly formText = input('');
  readonly icon = input('credit_card');
  readonly accept = input('image/*');
  readonly allowMultiple = input(true);
  readonly uploadRole = input('');
  readonly uploadDocumentType = input('');
  readonly uploadEndpoint = input('');
  readonly shouldPatchFileControl = input(true);
  readonly formGroup = input<FormGroup>(new FormGroup({}));
  readonly isSelect = input(false);
  readonly isOption = input(false);
  readonly isCheckbox = input(false);
  readonly visible = input(false);

  readonly isMultiSelect = input(false);
  readonly isRequired = input(false);
  readonly filter = input(false);
  readonly filterBy = input('name');
  readonly showClear = input(false);
  readonly readOnly = input(false);
  readonly checks = input<string[]>([]);
  readonly selections = input<string[]>([]);
  readonly rawOptions = input<Signal<SelectOption[]> | SelectOption[] | unknown>([], {
    alias: 'options',
  });

  readonly options = computed<SelectOption[]>(() => {
    const opts = this.rawOptions();
    if (typeof opts === 'function') {
      const res = (opts as () => unknown)();
      return Array.isArray(res) ? (res as SelectOption[]) : [];
    }
    if (Array.isArray(opts)) {
      return opts as SelectOption[];
    }
    return [];
  });

  readonly selectionOptions = computed<SelectOption[]>(() => {
    return this.selections().map((item) => ({
      id: item,
      name: this.formatOptionLabel(item),
    }));
  });

  protected readonly control = computed(() => this.formGroup().get(this.name()));
  protected readonly showError = computed(() => {
    const ctrl = this.control();
    return Boolean(ctrl && ctrl.invalid && (ctrl.dirty || ctrl.touched));
  });

  // Mutated internally by the upload flow below, so these stay as plain (non-signal) inputs.
  @Input() uploadStatus: FileUploadStatus = 'idle';
  @Input() uploadedFileName = '';
  @Input() uploadError = '';

  otpArray = new Array(4).fill('');
  otp: string[] = new Array(4).fill('');
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef>;
  readonly otpChange = output<string>();
  readonly fileSelected = output<File[]>();

  selectedOption: WritableSignal<string> = signal('');
  selectedFileNames = signal<string[]>([]);
  isDragActive = signal(false);
  open = true;

  visibility() {
    this.open = !this.open;
  }

  onSelectChange(event: SelectChangeEvent): void {
    this.selectedOption.set(String(event.value ?? ''));
  }

  onChange(event: Event | SelectChangeEvent): void {
    if (event && typeof event === 'object' && 'value' in event) {
      this.selectedOption.set(String((event as SelectChangeEvent).value ?? ''));
    } else if (event && (event as Event).target) {
      this.selectedOption.set(((event as Event).target as HTMLSelectElement).value);
    }
  }

  private formatOptionLabel(value: string): string {
    if (!value) return '';
    return value
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  browseFiles(): void {
    this.fileInput?.nativeElement.click();
  }

  onFileInputChange(event: Event): void {
    const input = event.target;

    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    this.setSelectedFiles(input.files);
  }

  onFileDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragActive.set(true);
  }

  onFileDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragActive.set(false);
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragActive.set(false);
    this.setSelectedFiles(event.dataTransfer?.files ?? null);
  }

  onFileKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    this.browseFiles();
  }

  onInput(event: Event, index: number) {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '');

    if (value) {
      this.otp[index] = value;
      this.emitOtp();
      if (index < this.otpInputs.length - 1) {
        this.otpInputs.get(index + 1)?.nativeElement.focus();
      }
    }
  }

  onKeyDown(event: KeyboardEvent, index: number) {
    if (event.key === 'Backspace') {
      if (this.otp[index]) {
        this.otp[index] = '';
      } else if (index > 0) {
        this.otpInputs.get(index - 1)?.nativeElement.focus();
        this.otp[index - 1] = '';
      }
      this.emitOtp();
    }
  }

  onPaste(event: ClipboardEvent) {
    event.preventDefault();
    const pasteData = event.clipboardData?.getData('text') || '';
    const digits = pasteData.replace(/\D/g, '').split('');

    if (digits.length >= this.otpInputs.length) {
      this.otp = digits.slice(0, this.otpInputs.length);
      setTimeout(() => {
        this.otpInputs.last?.nativeElement.focus();
      });
    }
  }

  emitOtp() {
    this.otpChange.emit(this.otp.join(''));
  }

  private setSelectedFiles(fileList: FileList | null): void {
    const files = Array.from(fileList ?? []);
    const selectedFiles = this.allowMultiple() ? files : files.slice(0, 1);
    const control = this.formGroup().get(this.name());

    this.selectedFileNames.set(selectedFiles.map((file) => file.name));
    this.fileSelected.emit(selectedFiles);
    control?.markAsDirty();
    control?.markAsTouched();

    if (this.uploadRole()) {
      this.uploadSelectedFiles(selectedFiles);
      return;
    }

    if (this.shouldPatchFileControl()) {
      control?.setValue(selectedFiles);
    }
  }

  private uploadSelectedFiles(files: File[]): void {
    const control = this.formGroup().get(this.name());

    if (!files.length || !control) {
      return;
    }

    const requestId = this.uploadRequestId + 1;
    this.uploadRequestId = requestId;
    this.uploadStatus = 'uploading';
    this.uploadedFileName = '';
    this.uploadError = '';
    this.changeDetectorRef.markForCheck();
    control.setValue(this.allowMultiple() ? [] : '');
    this.changeDetectorRef.markForCheck();

    const documentType = this.uploadDocumentType() || this.name();

    forkJoin(
      files.map((file) =>
        this.kycDocumentUploadService
          .uploadDocument(file, documentType, this.uploadRole(), this.uploadEndpoint())
          .pipe(take(1)),
      ),
    ).subscribe({
      next: (responses) => {
        if (this.uploadRequestId !== requestId) {
          return;
        }

        const paths = responses.map((response) => response.data.url ?? response.data.path);
        control.setValue(this.allowMultiple() ? paths : paths[0]);
        control.updateValueAndValidity();
        this.uploadStatus = 'uploaded';
        this.uploadedFileName = paths.map((path) => this.getPathFileName(path)).join(', ');
        this.uploadError = '';
        this.changeDetectorRef.markForCheck();
      },
      error: (error: unknown) => {
        if (this.uploadRequestId !== requestId) {
          return;
        }

        control.setValue(this.allowMultiple() ? [] : '');
        this.changeDetectorRef.markForCheck();
        control.updateValueAndValidity();
        this.uploadStatus = 'error';
        this.uploadedFileName = '';
        this.uploadError = extractErrorMessage(error, 'Upload failed. Choose the file again.');
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  private getPathFileName(path: string): string {
    return path.split('/').pop() || path;
  }
}

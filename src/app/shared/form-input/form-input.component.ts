import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  Output,
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
import { forkJoin, take } from 'rxjs';
import { KycDocumentUploadService } from '../services/kyc-document-upload.service';

type FileUploadStatus = 'idle' | 'uploading' | 'uploaded' | 'error';

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
  ],
  templateUrl: './form-input.component.html',
  styleUrl: './form-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormInputComponent {
  private readonly kycDocumentUploadService = inject(KycDocumentUploadService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private uploadRequestId = 0;

  @Input() label!: string;
  @Input({ required: true }) name!: string;
  @Input() type!: string;
  @Input() placeholder!: string;
  @Input() title!: string;
  @Input() formText = '';
  @Input() icon = 'credit_card';
  @Input() accept = 'image/*';
  @Input() allowMultiple = true;
  @Input() uploadRole = '';
  @Input() uploadDocumentType = '';
  @Input() uploadStatus: FileUploadStatus = 'idle';
  @Input() uploadedFileName = '';
  @Input() uploadError = '';
  @Input() shouldPatchFileControl = true;
  @Input() formGroup: FormGroup = new FormGroup({});
  @Input() isSelect = false;
  @Input() isOption = false;
  @Input() isCheckbox = false;
  @Input() visible = false;

  @Input() isMultiSelect = false;
  @Input() isRequired = false;
  @Input() checks!: any;
  @Input() selections: any[] = [];
  @Input() options!: Signal<any[]>;

  otpArray = new Array(4).fill('');
  otp: string[] = new Array(4).fill('');
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef>;
  @Output() otpChange = new EventEmitter<string>();
  @Output() fileSelected = new EventEmitter<File[]>();

  selectedOption: WritableSignal<string> = signal('');
  selectedFileNames = signal<string[]>([]);
  isDragActive = signal(false);
  open = true;

  visibility() {
    this.open = !this.open;
  }

  onChange(event: Event) {
    this.selectedOption.set((event.target as HTMLSelectElement).value);
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

  onInput(event: any, index: number) {
    const input = event.target;
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
    const selectedFiles = this.allowMultiple ? files : files.slice(0, 1);
    const control = this.formGroup.get(this.name);

    this.selectedFileNames.set(selectedFiles.map((file) => file.name));
    this.fileSelected.emit(selectedFiles);
    control?.markAsDirty();
    control?.markAsTouched();

    if (this.uploadRole) {
      this.uploadSelectedFiles(selectedFiles);
      return;
    }

    if (this.shouldPatchFileControl) {
      control?.setValue(selectedFiles);
    }
  }

  private uploadSelectedFiles(files: File[]): void {
    const control = this.formGroup.get(this.name);

    if (!files.length || !control) {
      return;
    }

    const requestId = this.uploadRequestId + 1;
    this.uploadRequestId = requestId;
    this.uploadStatus = 'uploading';
    this.uploadedFileName = '';
    this.uploadError = '';
    this.changeDetectorRef.markForCheck();
    control.setValue(this.allowMultiple ? [] : '');
    this.changeDetectorRef.markForCheck();

    const documentType = this.uploadDocumentType || this.name;

    forkJoin(
      files.map((file) =>
        this.kycDocumentUploadService
          .uploadDocument(file, documentType, this.uploadRole)
          .pipe(take(1)),
      ),
    ).subscribe({
      next: (responses) => {
        if (this.uploadRequestId !== requestId) {
          return;
        }

        const paths = responses.map((response) => response.data.path);
        control.setValue(this.allowMultiple ? paths : paths[0]);
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

        control.setValue(this.allowMultiple ? [] : '');
        this.changeDetectorRef.markForCheck();
        control.updateValueAndValidity();
        this.uploadStatus = 'error';
        this.uploadedFileName = '';
        this.uploadError = this.getUploadErrorMessage(error);
        this.changeDetectorRef.markForCheck();
      },
    });
  }

  private getPathFileName(path: string): string {
    return path.split('/').pop() || path;
  }

  private getUploadErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && this.hasMessage(error.error)) {
      return error.error.message;
    }

    return 'Upload failed. Choose the file again.';
  }

  private hasMessage(value: unknown): value is { message: string } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'message' in value &&
      typeof value.message === 'string'
    );
  }
}

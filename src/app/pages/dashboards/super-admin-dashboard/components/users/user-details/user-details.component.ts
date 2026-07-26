import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Store } from '@ngxs/store';
import { GetUserDetails, User, UsersState } from '../users.state';

interface DetailField {
  label: string;
  value: string;
}

interface DetailLink {
  label: string;
  url: string;
}

interface DetailSection {
  title: string;
  fields: DetailField[];
}

@Component({
  selector: 'app-user-details',
  imports: [MatIconModule, RouterLink],
  templateUrl: './user-details.component.html',
  styleUrl: './user-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  protected readonly user = this.store.selectSignal(UsersState.selectedUser);
  protected readonly isLoading = this.store.selectSignal(UsersState.isDetailLoading);
  protected readonly userName = computed(() => this.getUserName(this.user()));
  protected readonly userInitials = computed(() => this.getInitials(this.userName()));
  protected readonly status = computed(() => this.getUserStatus(this.user()));
  protected readonly summaryFields = computed(() => this.buildSummaryFields(this.user()));
  protected readonly detailSections = computed(() => this.buildDetailSections(this.user()));
  protected readonly documentLinks = computed(() => this.buildDocumentLinks(this.user()));

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('userId');

    if (!userId) {
      this.router.navigate(['../'], { relativeTo: this.route });
      return;
    }

    this.store.dispatch(new GetUserDetails(userId)).subscribe();
  }

  protected getUserRole(user: User | null): string {
    return this.formatLabel(this.getStringValue(user, ['role']) || '-');
  }

  protected isApproved(): boolean {
    return this.status().toLowerCase() === 'approved';
  }

  protected isRejected(): boolean {
    return ['denied', 'rejected', 'suspended'].includes(this.status().toLowerCase());
  }

  protected isPending(): boolean {
    return !this.isApproved() && !this.isRejected();
  }

  protected trackByLabel(_: number, item: DetailField | DetailLink): string {
    return item.label;
  }

  protected trackBySection(_: number, section: DetailSection): string {
    return section.title;
  }

  private buildSummaryFields(user: User | null): DetailField[] {
    if (!user) {
      return [];
    }

    return [
      { label: 'User ID', value: user.id },
      { label: 'Email', value: this.getStringValue(user, ['email']) || '-' },
      { label: 'Phone', value: this.getStringValue(user, ['phone', 'phoneNumber']) || '-' },
      { label: 'Date created', value: this.formatValue(this.getFirstValue(user, ['createdAt', 'dateCreated', 'created_at'])) },
    ];
  }

  private buildDetailSections(user: User | null): DetailSection[] {
    if (!user) {
      return [];
    }

    const fields = this.collectFields(user).filter((field) => field.value !== '-');

    return fields.length ? [{ title: 'User information', fields }] : [];
  }

  private buildDocumentLinks(user: User | null): DetailLink[] {
    if (!user) {
      return [];
    }

    const links: DetailLink[] = [];
    const seen = new Set<string>();
    this.collectLinks(user, '', links, seen);
    return links;
  }

  private collectFields(value: unknown, parentKey = ''): DetailField[] {
    if (!this.isRecord(value)) {
      return [];
    }

    return Object.entries(value).flatMap(([key, fieldValue]) => {
      const path = parentKey ? `${parentKey}.${key}` : key;

      if (this.shouldSkipField(key, path, fieldValue)) {
        return [];
      }

      if (this.isRecord(fieldValue)) {
        return this.collectFields(fieldValue, path);
      }

      if (Array.isArray(fieldValue)) {
        return this.isLinkOrDocumentKey(key)
          ? []
          : [{ label: this.formatPath(path), value: this.formatValue(fieldValue) }];
      }

      return [{ label: this.formatPath(path), value: this.formatValue(fieldValue) }];
    });
  }

  private collectLinks(value: unknown, parentKey: string, links: DetailLink[], seen: Set<string>): void {
    if (!this.isRecord(value)) {
      return;
    }

    Object.entries(value).forEach(([key, fieldValue]) => {
      const path = parentKey ? `${parentKey}.${key}` : key;

      if (typeof fieldValue === 'string' && this.shouldTreatAsLink(key, fieldValue)) {
        this.addLink(links, seen, this.formatPath(path), fieldValue);
        return;
      }

      if (Array.isArray(fieldValue)) {
        fieldValue.forEach((item, index) => {
          if (typeof item === 'string' && this.shouldTreatAsLink(key, item)) {
            this.addLink(links, seen, `${this.formatPath(path)} ${index + 1}`, item);
          }

          if (this.isRecord(item)) {
            this.collectLinks(item, `${path}.${index + 1}`, links, seen);
          }
        });
        return;
      }

      if (this.isRecord(fieldValue)) {
        this.collectLinks(fieldValue, path, links, seen);
      }
    });
  }

  private addLink(links: DetailLink[], seen: Set<string>, label: string, url: string): void {
    if (seen.has(url)) {
      return;
    }

    seen.add(url);
    links.push({ label, url });
  }

  private shouldSkipField(key: string, path: string, value: unknown): boolean {
    const normalizedKey = key.toLowerCase();
    const normalizedPath = path.toLowerCase();
    const skippedKeys = new Set([
      'id',
      'fullname',
      'full_name',
      'firstname',
      'lastname',
      'email',
      'phone',
      'phonenumber',
      'role',
      'status',
      'approvalstatus',
      'createdat',
      'datecreated',
      'created_at',
    ]);

    return skippedKeys.has(normalizedKey) || this.shouldTreatAsLink(normalizedPath, value);
  }

  private shouldTreatAsLink(key: string, value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0 && (this.isUrl(value) || this.isLinkOrDocumentKey(key));
  }

  private isLinkOrDocumentKey(key: string): boolean {
    return /document|doc|url|link|path|file|certificate|photo|image|upload|attachment|license|letter/i.test(key);
  }

  private isUrl(value: string): boolean {
    return /^(https?:\/\/|\/)/i.test(value);
  }

  private getUserName(user: User | null): string {
    if (!user) {
      return '-';
    }

    return (
      this.getStringValue(user, ['fullName', 'full_name']) ||
      [this.getStringValue(user, ['firstName']), this.getStringValue(user, ['lastName'])].filter(Boolean).join(' ') ||
      '-'
    );
  }

  private getUserStatus(user: User | null): string {
    return this.getStringValue(user, ['approvalStatus', 'status']) || 'pending';
  }

  private getStringValue(user: User | null, keys: string[]): string {
    const value = this.getFirstValue(user, keys);
    return typeof value === 'string' ? value : '';
  }

  private getFirstValue(user: User | null, keys: string[]): unknown {
    if (!user) {
      return null;
    }

    return keys.map((key) => user[key]).find((value) => value !== undefined && value !== null) ?? null;
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    if (typeof value === 'number') {
      return String(value);
    }

    if (typeof value === 'string') {
      return this.formatDateIfPossible(value) || this.formatLabel(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.formatValue(item)).join(', ');
    }

    return '-';
  }

  private formatDateIfPossible(value: string): string | null {
    if (!/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: value.includes('T') ? 'short' : undefined,
    }).format(date);
  }

  private formatPath(path: string): string {
    return path
      .split('.')
      .map((part) => this.formatLabel(part))
      .join(' / ');
  }

  protected formatLabel(value: string): string {
    return value
      .replace(/[_-]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (letter) => letter.toUpperCase()) || '-';
  }

  private getInitials(value: string): string {
    if (!value || value === '-') {
      return 'U';
    }

    return value
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'U';
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}



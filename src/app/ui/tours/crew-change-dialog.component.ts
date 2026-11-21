import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {JournalService, Result} from '../../application/journal.service';
import {MasterDataService} from '../../application/master-data.service';
import {Role, ROLE_LABELS, ROLES, Tour} from '../../domain/model';
import * as rules from '../../domain/tour';
import {nowMinute} from '../shared/datetime';
import {DateTimeFieldComponent} from '../shared/datetime-field.component';
import {backendErrorMessage, joinErrors} from '../shared/errors';
import {PersonFieldComponent} from '../shared/person-field.component';
import {describeWarnings, tourTitle} from './tour-text';

export type CrewChangeMode = 'add' | 'end' | 'replace' | 'swap' | 'endTour';

export interface CrewChangeData {
  mode: CrewChangeMode;
  tour: Tour;
  memberId?: string;
}

const TITLES: Record<CrewChangeMode, string> = {
  add: 'Mitglied hinzufügen',
  end: 'Mitglied austragen',
  replace: 'Mitglied ersetzen',
  swap: 'Rollen tauschen',
  endTour: 'Tour beenden',
};

/** One crew change at a given time: add, end, replace, swap roles, or end the whole tour. */
@Component({
  selector: 'app-crew-change-dialog',
  imports: [DateTimeFieldComponent, FormsModule, MatButtonModule, MatDialogModule, MatInputModule, MatSelectModule, PersonFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ title }}</h2>
    <mat-dialog-content>
      <div class="dialog-form">
      <p class="muted">{{ tourLabel }}</p>

      @switch (data.mode) {
        @case ('add') {
          <div class="dialog-row">
            <app-person-field label="Person" [(personId)]="personId" [exclude]="onDuty" />
            <mat-form-field>
              <mat-label>Rolle</mat-label>
              <mat-select [(ngModel)]="role" name="role">
                @for (r of roles; track r) {
                  <mat-option [value]="r">{{ roleLabels[r] }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
        }
        @case ('end') {
          <p>{{ memberLabel(data.memberId) }} verlässt die Tour. Die übrigen Mitglieder bleiben eingetragen.</p>
        }
        @case ('replace') {
          <p>{{ memberLabel(data.memberId) }} wird ersetzt durch:</p>
          <app-person-field label="Neue Person" [(personId)]="personId" [exclude]="onDuty" />
        }
        @case ('swap') {
          <div class="dialog-row">
            <mat-form-field>
              <mat-label>Erste Person</mat-label>
              <mat-select [(ngModel)]="swapA" name="swapA">
                @for (m of activeMembers; track m.id) {
                  <mat-option [value]="m.id">{{ memberLabel(m.id) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field>
              <mat-label>Zweite Person</mat-label>
              <mat-select [(ngModel)]="swapB" name="swapB">
                @for (m of activeMembers; track m.id) {
                  <mat-option [value]="m.id">{{ memberLabel(m.id) }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
        }
        @case ('endTour') {
          <p>Alle noch eingetragenen Mitglieder werden mit dieser Zeit ausgetragen.</p>
        }
      }

      <app-datetime-field label="Zeitpunkt" [(value)]="at" />

      @for (w of warnings(); track w) {
        <p class="warning-text">{{ w }}</p>
      }
      @if (error()) {
        <p class="error-text">{{ error() }}</p>
      }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Abbrechen</button>
      <button mat-flat-button type="button" (click)="confirm()" [disabled]="busy()">{{ title }}</button>
    </mat-dialog-actions>
  `,
})
export class CrewChangeDialogComponent {
  protected readonly data = inject<CrewChangeData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<CrewChangeDialogComponent, boolean>);
  private readonly journal = inject(JournalService);
  protected readonly md = inject(MasterDataService);

  protected readonly roles = ROLES;
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly title = TITLES[this.data.mode];
  protected readonly tourLabel = tourTitle(this.data.tour, this.md);
  protected readonly activeMembers = this.data.tour.members.filter(m => !m.to);
  /** Persons currently on duty in this tour; not offered again. */
  protected readonly onDuty = this.activeMembers.map(m => m.personId);

  /** Ending a tour linked to a planned slot proposes the planned end; everything else proposes now. */
  protected readonly at = signal<Date | undefined>(
    (this.data.mode === 'endTour' ? this.journal.slotOf(this.data.tour)?.end : undefined) ?? nowMinute(),
  );
  protected readonly personId = signal('');
  protected role: Role = 'THIRD';
  protected swapA = this.activeMembers[0]?.id ?? '';
  protected swapB = this.activeMembers[1]?.id ?? '';

  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected memberLabel(memberId: string | undefined): string {
    const m = this.data.tour.members.find(x => x.id === memberId);
    return m ? `${this.md.personName(m.personId)} (${ROLE_LABELS[m.role]})` : '';
  }

  /** The tour as it would look after the change, for overlap warnings. */
  private draft(at: Date): Tour | undefined {
    const {tour, memberId} = this.data;
    const personId = this.personId();
    if (this.data.mode === 'add' && personId) return rules.addMember(tour, {personId, role: this.role, from: at});
    if (this.data.mode === 'replace' && personId && memberId) return rules.replaceMember(tour, memberId, personId, at);
    return undefined;
  }

  protected warnings(): string[] {
    const at = this.at();
    const draft = at && this.draft(at);
    return draft ? describeWarnings(this.journal.warningsFor(draft), this.journal.tours(), this.md) : [];
  }

  protected async confirm(): Promise<void> {
    const at = this.at();
    const personId = this.personId();
    if (!at) {
      this.error.set('Bitte einen Zeitpunkt angeben.');
      return;
    }
    const {tour, memberId, mode} = this.data;
    if ((mode === 'add' || mode === 'replace') && !personId) {
      this.error.set('Bitte eine Person wählen.');
      return;
    }
    if (mode === 'swap' && (!this.swapA || !this.swapB || this.swapA === this.swapB)) {
      this.error.set('Bitte zwei verschiedene Personen wählen.');
      return;
    }

    this.busy.set(true);
    this.error.set(null);
    try {
      let result: Result;
      switch (mode) {
        case 'add':
          result = await this.journal.addMember(tour, {personId, role: this.role, from: at});
          break;
        case 'end':
          result = await this.journal.endMember(tour, memberId!, at);
          break;
        case 'replace':
          result = await this.journal.replaceMember(tour, memberId!, personId, at);
          break;
        case 'swap':
          result = await this.journal.swapRoles(tour, this.swapA, this.swapB, at);
          break;
        case 'endTour':
          result = await this.journal.endTour(tour, at);
          break;
      }
      if (result.ok) this.ref.close(true);
      else this.error.set(joinErrors(result.errors));
    } catch (err) {
      this.error.set(backendErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}

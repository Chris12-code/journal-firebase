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
import {fromLocalInput, nowMinute, toLocalInput} from '../shared/datetime';
import {backendErrorMessage, joinErrors} from '../shared/errors';
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
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatInputModule, MatSelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ title }}</h2>
    <mat-dialog-content>
      <p class="muted">{{ tourLabel }}</p>

      @switch (data.mode) {
        @case ('add') {
          <div class="dialog-row">
            <mat-form-field>
              <mat-label>Person</mat-label>
              <mat-select [(ngModel)]="personId" name="person">
                @for (p of md.activePersons(); track p.number) {
                  <mat-option [value]="p.number">{{ p.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
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
          <mat-form-field class="full-width">
            <mat-label>Neue Person</mat-label>
            <mat-select [(ngModel)]="personId" name="person">
              @for (p of md.activePersons(); track p.number) {
                <mat-option [value]="p.number">{{ p.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
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

      <mat-form-field class="full-width">
        <mat-label>Zeitpunkt</mat-label>
        <input matInput type="datetime-local" [(ngModel)]="at" name="at">
      </mat-form-field>

      @for (w of warnings(); track w) {
        <p class="warning-text">{{ w }}</p>
      }
      @if (error()) {
        <p class="error-text">{{ error() }}</p>
      }
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

  /** Ending a tour linked to a planned slot proposes the planned end; everything else proposes now. */
  protected at = toLocalInput(
    (this.data.mode === 'endTour' ? this.journal.slotOf(this.data.tour)?.end : undefined) ?? nowMinute(),
  );
  protected personId = '';
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
    if (this.data.mode === 'add' && this.personId) return rules.addMember(tour, {personId: this.personId, role: this.role, from: at});
    if (this.data.mode === 'replace' && this.personId && memberId) return rules.replaceMember(tour, memberId, this.personId, at);
    return undefined;
  }

  protected warnings(): string[] {
    const at = fromLocalInput(this.at);
    const draft = at && this.draft(at);
    return draft ? describeWarnings(this.journal.warningsFor(draft), this.journal.tours(), this.md) : [];
  }

  protected async confirm(): Promise<void> {
    const at = fromLocalInput(this.at);
    if (!at) {
      this.error.set('Bitte einen Zeitpunkt angeben.');
      return;
    }
    const {tour, memberId, mode} = this.data;
    if ((mode === 'add' || mode === 'replace') && !this.personId) {
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
          result = await this.journal.addMember(tour, {personId: this.personId, role: this.role, from: at});
          break;
        case 'end':
          result = await this.journal.endMember(tour, memberId!, at);
          break;
        case 'replace':
          result = await this.journal.replaceMember(tour, memberId!, this.personId, at);
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

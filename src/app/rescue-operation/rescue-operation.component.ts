import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RescueOperation } from './rescue-operation';

@Component({
  selector: 'app-rescue-operation',
  templateUrl: './rescue-operation.component.html',
  styleUrls: ['./rescue-operation.component.css']
})
export class RescueOperationComponent {

  @Input() rescueOperation: RescueOperation | null = null;
  @Output() edit = new EventEmitter<RescueOperation>();

}

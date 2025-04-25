import { Pipe, PipeTransform } from '@angular/core';
import { Registration } from '../../models/registration.model';

@Pipe({
  name: 'total',
  pure: true,
})
export class TotalPipe implements PipeTransform {
  transform(registrations: Registration[], prop: keyof Registration): number {
    return registrations.reduce((total, registration) => {
      return total + (Number(registration[prop]) || 0);
    }, 0);
  }
}

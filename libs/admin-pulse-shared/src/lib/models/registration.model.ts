import { RegistrationDto } from './registration.dto';
import { UserDto } from './user.dto';

export interface Registration extends RegistrationDto {
  user?: UserDto;
}

import { PartialType } from '@nestjs/mapped-types';

export class CreateDoctorDto {
  name: string;
  specialty: string;
}

export class UpdateDoctorDto extends PartialType(CreateDoctorDto) {}
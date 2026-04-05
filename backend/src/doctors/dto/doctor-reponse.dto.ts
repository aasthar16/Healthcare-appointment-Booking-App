import { 
  IsString, 
  IsOptional, 
  IsNumber, 
  IsDate, 
  IsArray,
  IsEnum 
} from 'class-validator';

export class DoctorResponseDto {
  @IsString()
  id: string;

  @IsString()
  userId: string;

  @IsString()
  name: string;

  @IsString()
  specialty: string;

  @IsOptional()
  @IsString()
  bio?: string | null;

  @IsOptional()
  @IsString()
  avatarUrl?: string | null;

  @IsOptional()
  @IsNumber()
  consultationFee?: number | null;

  @IsEnum(['PENDING_DOCUMENTS', 'VERIFIED', 'REJECTED'])
  verificationStatus: 'PENDING_DOCUMENTS' | 'VERIFIED' | 'REJECTED';

  @IsOptional()
  @IsString()
  licenseDocUrl?: string | null;

  @IsOptional()
  @IsString()
  degreeDocUrl?: string | null;

  @IsDate()
  createdAt: Date;

  // Computed/Related fields
  @IsOptional()
  @IsNumber()
  averageRating?: number;

  @IsOptional()
  @IsNumber()
  totalRatings?: number;
}
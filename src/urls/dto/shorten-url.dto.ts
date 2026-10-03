import { IsString, IsUrl, MaxLength } from 'class-validator';

export class ShortenUrlDto {
  @IsString()
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'url must be a valid http or https URL' },
  )
  @MaxLength(2048, { message: 'url must not exceed 2048 characters' })
  url: string;
}

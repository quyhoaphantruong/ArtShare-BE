export class GeneratePostMetadataResponseDto {
  title: string;
  description: string;
  categories: {id: number, name: string}[];
}
import { ISafeSearchAnnotation } from "src/safe-search/types/safe-search-annotation.type";

export class AdultDetectionReponseDto {
  isAdult: boolean;
  annotation: ISafeSearchAnnotation;
}
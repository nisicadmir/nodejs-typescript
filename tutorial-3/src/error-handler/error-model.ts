export class ErrorModel {
  /**
   * Unique error code which identifies the error.
   */
  public code: string;
  /**
   * Status code of the error.
   */
  public status: number;
  /**
   * Any additional data that is required for translation.
   */
  public metaData?: any;
}

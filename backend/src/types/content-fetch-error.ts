export type ContentFetchErrorCode =
  | "invalid_url"
  | "access_denied"
  | "authentication_required"
  | "rate_limited"
  | "unsupported_content"
  | "content_too_large"
  | "empty_content"
  | "timeout"
  | "network_error"
  | "upstream_error";

export class ContentFetchError extends Error {
  constructor(
    public readonly code: ContentFetchErrorCode,
    message: string,
    public readonly statusCode?: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ContentFetchError";
  }
}

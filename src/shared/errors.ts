export class AppError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
    this.code = code;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super("VALIDATION_ERROR", message, options);
  }
}

export class QuotaExceededError extends AppError {
  readonly used: number;
  readonly limit: number;
  readonly resetsAt: Date;

  constructor(used: number, limit: number, resetsAt: Date) {
    super(
      "QUOTA_EXCEEDED",
      `Quota exceeded: ${used}/${limit} chars used until ${resetsAt.toISOString()}`,
    );
    this.used = used;
    this.limit = limit;
    this.resetsAt = resetsAt;
  }
}

export class NotInVoiceError extends AppError {
  constructor() {
    super("NOT_IN_VOICE", "User is not in a voice channel");
  }
}

export class NotConnectedError extends AppError {
  constructor() {
    super("NOT_CONNECTED", "Bot is not connected to a voice channel");
  }
}

export class TtsProviderError extends AppError {
  constructor(message: string, options?: ErrorOptions) {
    super("TTS_PROVIDER_ERROR", message, options);
  }
}


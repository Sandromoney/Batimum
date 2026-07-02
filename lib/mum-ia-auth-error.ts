export class MumIaAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MumIaAuthError";
  }
}

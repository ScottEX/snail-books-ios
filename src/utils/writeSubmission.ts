type WriteResult = { status: string; message?: string };

/** Retain the key and uploaded payload until the same draft is acknowledged. */
export class WriteSubmission<Payload> {
  private pending: { signature: string; key: string; payload?: Payload } | undefined;
  running = false;

  async run<Result extends WriteResult>(
    input: unknown,
    prepare: () => Payload | Promise<Payload>,
    send: (payload: Payload, key: string) => Promise<Result>,
  ): Promise<Result | undefined> {
    if (this.running) return undefined;
    this.running = true;
    try {
      const signature = JSON.stringify(input);
      if (this.pending?.signature !== signature) {
        const random = () => Math.random().toString(36).slice(2);
        this.pending = { signature, key: `${Date.now().toString(36)}-${random()}-${random()}` };
      }
      const pending = this.pending;
      pending.payload ??= await prepare();
      const response = await send(pending.payload, pending.key);
      if (response.status === 'ok') this.pending = undefined;
      return response;
    } finally {
      this.running = false;
    }
  }
}

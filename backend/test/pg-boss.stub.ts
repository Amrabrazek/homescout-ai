// pg-boss is ESM-only and Jest 29 runs tests as CommonJS, so tests get this
// stand-in. Tests never start a real queue; they mock the services using it.
export class PgBoss {
  on() {}
  async start() {}
  async stop() {}
}

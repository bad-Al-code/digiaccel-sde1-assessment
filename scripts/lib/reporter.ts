import assert from 'node:assert/strict';

export class Reporter {
  private passed = 0;
  private readonly failures: string[] = [];
  private currentGroup = '';

  public group(title: string): void {
    this.currentGroup = title;
    console.log(`\n  ${title}`);
  }

  public check(label: string, assertion: () => void): void {
    try {
      assertion();
      this.passed += 1;
      console.log(`    pass  ${label}`);
    } catch (error) {
      const detail = error instanceof Error ? error.message.split('\n')[0] : String(error);
      this.failures.push(`${this.currentGroup} > ${label}: ${detail}`);
      console.log(`    FAIL  ${label}`);
      console.log(`          ${detail}`);
    }
  }

  public equal(label: string, actual: unknown, expected: unknown): void {
    this.check(label, () => {
      assert.deepEqual(
        actual,
        expected,
        `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
      );
    });
  }

  public ok(label: string, value: unknown, detail?: unknown): void {
    this.check(label, () => {
      assert.ok(
        value,
        detail === undefined ? 'expected truthy' : `context: ${JSON.stringify(detail)}`,
      );
    });
  }

  public async rejects(label: string, run: () => Promise<unknown>, match?: RegExp): Promise<void> {
    try {
      await run();
      this.failures.push(`${this.currentGroup} > ${label}: expected a rejection`);
      console.log(`    FAIL  ${label} (expected a rejection)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (match && !match.test(message)) {
        this.failures.push(`${this.currentGroup} > ${label}: "${message}" did not match ${match}`);
        console.log(`    FAIL  ${label}`);
        console.log(`          got: ${message}`);
        return;
      }

      this.passed += 1;
      console.log(`    pass  ${label}`);
    }
  }

  public summary(title: string): void {
    const total = this.passed + this.failures.length;
    console.log(`\n${'-'.repeat(64)}`);
    console.log(`${title}: ${this.passed}/${total} passed`);

    if (this.failures.length > 0) {
      console.log(`\n${this.failures.length} failure(s):`);
      this.failures.forEach((failure) => console.log(`  - ${failure}`));
      process.exitCode = 1;
      return;
    }

    console.log('All checks passed.');
  }

  public get failed(): boolean {
    return this.failures.length > 0;
  }
}

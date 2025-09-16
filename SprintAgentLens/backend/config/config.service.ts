export abstract class ConfigService {
  protected getString(key: string, defaultValue?: string): string {
    const value = process.env[key];
    if (value === undefined) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`Environment variable ${key} is required but not set`);
    }
    return value;
  }

  protected getRequiredString(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new Error(`Environment variable ${key} is required but not set`);
    }
    return value;
  }

  protected getNumber(key: string, defaultValue?: number): number {
    const value = process.env[key];
    if (value === undefined) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`Environment variable ${key} is required but not set`);
    }
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      throw new Error(`Environment variable ${key} must be a valid number, got: ${value}`);
    }
    return num;
  }

  protected getBoolean(key: string, defaultValue?: boolean): boolean {
    const value = process.env[key];
    if (value === undefined) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`Environment variable ${key} is required but not set`);
    }
    return value.toLowerCase() === 'true';
  }

  protected getArray(key: string, separator: string = ',', defaultValue?: string[]): string[] {
    const value = process.env[key];
    if (value === undefined) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`Environment variable ${key} is required but not set`);
    }
    return value.split(separator).map(item => item.trim()).filter(item => item.length > 0);
  }

  protected getJson<T>(key: string, defaultValue?: T): T {
    const value = process.env[key];
    if (value === undefined) {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`Environment variable ${key} is required but not set`);
    }
    try {
      return JSON.parse(value);
    } catch (error) {
      throw new Error(`Environment variable ${key} must be valid JSON, got: ${value}`);
    }
  }
}
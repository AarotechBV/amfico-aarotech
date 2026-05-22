import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import { ADMIN_PULSE_BASE_URL } from './admin-pulse.constants';

@Injectable()
export class AdminPulseHttpService {
  readonly #logger = new Logger(AdminPulseHttpService.name);

  constructor(
    private readonly http: HttpService,
    @Inject(ADMIN_PULSE_BASE_URL) private readonly baseUrl: string,
  ) {}

  async get<T>(
    path: string,
    token: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const config: AxiosRequestConfig = {
      headers: { Authorization: `Bearer ${token}` },
      params: this.#cleanParams(params),
    };
    try {
      const response = await firstValueFrom(this.http.get<T>(url, config));
      return response.data;
    } catch (err) {
      throw this.#mapError(err, `GET ${path}`);
    }
  }

  #cleanParams(
    params?: Record<string, string | number | boolean | undefined>,
  ) {
    if (!params) return undefined;
    return Object.fromEntries(
      Object.entries(params).filter(([, value]) => value !== undefined),
    );
  }

  #mapError(err: unknown, context: string): Error {
    if (err instanceof AxiosError) {
      const status = err.response?.status;
      const body = err.response?.data;
      this.#logger.error(`AdminPulse ${context} failed (${status}): ${err.message}`);
      return new BadGatewayException({
        message: `AdminPulse request failed: ${context}`,
        upstreamStatus: status,
        upstreamBody: body,
      });
    }
    this.#logger.error(`AdminPulse ${context} failed: ${String(err)}`);
    return new BadGatewayException(`AdminPulse request failed: ${context}`);
  }
}

import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { AxiosError } from 'axios';
import { catchError, firstValueFrom } from 'rxjs';

@Injectable()
export class AppService {
  constructor(private readonly httpService: HttpService) {}

  async get(url: string, method: string, body: any) {
    if (method == 'GET') {
      const { data } = await firstValueFrom(
        this.httpService.get(url).pipe(
          catchError((error: AxiosError) => {
            throw 'Error';
          }),
        ),
      );
      return data;
    }
    if (method == 'POST') {
      const { data } = await firstValueFrom(
        this.httpService.post(url, body).pipe(
          catchError((error: AxiosError) => {
            throw 'Error';
          }),
        ),
      );
      return data;
    }
  }
}

import { Controller, Get, Req } from '@nestjs/common';
import { AppService } from './app.service';
import { Request } from 'express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('*')
  get(@Req() req: Request) {
    const originalUrl = req.originalUrl.split('/')[1];
    const apiUrl = process.env[originalUrl];

    if (apiUrl) {
      return this.appService.get(
        `${apiUrl}${req.originalUrl}`,
        req.method,
        req.body,
      );
    }
  }
}

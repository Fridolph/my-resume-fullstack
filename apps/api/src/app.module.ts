import { Module } from "@nestjs/common";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { AppController } from "./app.controller";
import { ApiExceptionFilter } from "./common/api-exception.filter";
import { ApiResponseInterceptor } from "./common/api-response.interceptor";

@Module({
  controllers: [AppController],
  providers: [
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
  ],
})
export class AppModule {}

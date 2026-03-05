import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module.js";
import { HttpExceptionFilter } from "./common/http-exception.filter.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false })
  );

  const logger = new Logger("SEMSE-API");
  const port = Number(process.env.PORT ?? 4000);
  const host = process.env.HOST ?? "0.0.0.0";

  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(port, host);
  logger.log(`API listening on http://${host}:${port}`);
}

bootstrap().catch((error) => {
  // Fail fast in bootstrap errors to avoid half-started service.
  // eslint-disable-next-line no-console
  console.error("Fatal bootstrap error", error);
  process.exit(1);
});

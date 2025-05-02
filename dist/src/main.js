"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const metadata_1 = __importDefault(require("./metadata"));
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({
        origin: [process.env.FRONTEND_URL || 'http://localhost:5173'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
        whitelist: true,
    }));
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Art Sharing')
        .setDescription('The Art Sharing API description')
        .setVersion('1.0')
        .addTag('artsharing')
        .build();
    const documentFactory = () => swagger_1.SwaggerModule.createDocument(app, config);
    await swagger_1.SwaggerModule.loadPluginMetadata(metadata_1.default);
    swagger_1.SwaggerModule.setup('api', app, documentFactory);
    await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

import express from "express";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { errorHandler } from "./middlewares/error.middleware";
import passport, { initializePassport } from "./config/passport";
import { Request } from "express";

const app = express();
app.set('trust proxy', 1);

initializePassport();

morgan.token("pathNoQuery", (req) => (req as Request).originalUrl.split("?")[0]);


app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl)
    if (!origin) return callback(null, true);
    // In development allow any localhost port
    if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    // In production match exact CORS_ORIGIN
    if (origin === process.env.CORS_ORIGIN) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
app.use(morgan(":method :pathNoQuery :status :response-time ms - :res[content-length]"));

registerRoutes(app);

app.use(errorHandler);

export default app; 
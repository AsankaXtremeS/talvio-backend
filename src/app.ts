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
    if (!origin) return callback(null, true);

    const allowed = (process.env.CORS_ORIGIN ?? '')
      .split(',')
      .map(s => s.trim());

    // wildcard allows everything
    if (allowed.includes('*')) return callback(null, true);

    // dev convenience: any localhost port
    if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    if (allowed.includes(origin)) return callback(null, true);

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
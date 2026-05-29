"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promise_1 = __importDefault(require("mysql2/promise"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load .env from ai_engine
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../ai_engine/.env') });
const pool = promise_1.default.createPool({
    host: process.env.DB_HOST || "db-classinsight-it-18cf.j.aivencloud.com",
    port: parseInt(process.env.DB_PORT || "15183", 10),
    user: process.env.DB_USER || "avnadmin",
    password: process.env.DB_PASS || "",
    database: process.env.DB_NAME || "defaultdb",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
exports.default = pool;

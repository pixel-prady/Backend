import dotenv from "dotenv"
import connectDB from "./db/connection.js";

dotenv.config({
    path:"./.env"
})

console.log(process.env.MONGODB_URI);

connectDB()
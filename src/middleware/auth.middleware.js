import { apierror } from "../utils/apierrors.js";
import { asyncHandler } from "../utils/asynchandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        const token =
            req.cookies?.accessToken ||
            req.header("Authorization")?.replace("Bearer", "");

        if (!token) {
            throw new apierror(401, "Unauthorized request");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id).select(
            "-password -refreshToken"
        );

        if (!user) {
            throw new apierror(401, "INVALID ACCESS TOKEN");
        }

        req.user = user;
        next();
    } catch (error) {
        throw new apierror(401, error?.message || "INVALID ACCESS TOKEN");
    }
});

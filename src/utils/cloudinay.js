import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({
    path: "../.env",
});

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        //uploading on cloudinay

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });
        console.log("FILE IS UPLOADED IN CLOUDINARY", response.url);
        return response;
    } catch (error) {
        console.error("CLOUDINARY UPLOAD ERROR:", error);
        fs.unlinkSync(localFilePath);
    }
};
export { uploadOnCloudinary };

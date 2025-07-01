import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

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

        fs.unlinkSync(localFilePath);
        return response;
    } catch (error) {
        console.error("CLOUDINARY UPLOAD ERROR:", error);
        fs.unlinkSync(localFilePath);
    }
};

const deleteFromCloudinary = async (publicId) => {
    try {
        if (!publicId) return null;
        // deleting from cloudinay :
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: "auto",
        });

        console.log("CLOUDINARY IMAGE DELETED:", result);
        return result;
    } catch (error) {
        console.error("CLOUDINARY DELETE ERROR:", error);
        throw error;
    }
};

export { uploadOnCloudinary , deleteFromCloudinary};

import { asyncHandler } from "../utils/asynchandler.js";
import { apierror } from "../utils/apierrors.js";
import { User } from "../models/user.model.js";
import {
    deleteFromCloudinary,
    uploadOnCloudinary,
} from "../utils/cloudinay.js";
import { apiresponse } from "../utils/apiresponse.js";
import mongoose from "mongoose";

const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;

        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new apierror(
            500,
            "SOMETHING WENT WRONG WHILE GENERATING ACCESS AND REFRESH TOKENS !!"
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, username, password } = req.body;
    // if ( fullName === ""){
    //     throw new apierror(400,"FULLNAME IS REQUIRED")
    // }

    if (
        [fullName, email, username, password].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new apierror(400, "ALL FIELDS ARE REQUIRED");
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (existedUser) {
        throw new apierror(409, "user with email or usernamae already exists ");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;

    let coverImageLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new apierror(400, "Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new apierror(400, "Avatar file is required");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new apierror(
            500,
            "Something went wrong while registering the User"
        );
    }

    return res
        .status(201)
        .json(
            new apiresponse(200, createdUser, "User registered successfully")
        );
});

const loginUser = asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;

    if (!username && !email) {
        throw new apierror(400, "EMAIL OR PASSWORD IS REQUIRED");
    }
    const user = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (!user) {
        throw new apierror(404, "USER DOES NOT EXISTS !!");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new apierror(401, "PASSWORD INCORRECT");
    }
    const { accessToken, refreshToken } =
        await generateAccessTokenAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    // cookies :
    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new apiresponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "USER LOGGED IN SUCCESSFULLY"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined,
            },
        },
        {
            new: true,
        }
    );
    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new apiresponse(200, {}, "USER LOGGED OUT SUCCESSFULLY"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incommingRefreshToken =
        req.cookie.refreshToken || req.body.refreshToken;

    if (!incommingRefreshToken) {
        throw new apierror(401, "UNAUTHORIZED REQUEST");
    }

    try {
        const decodedToken = jwt.verify(
            incommingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new apierror(401, "INVALID REFRESH TOKEN");
        }

        if (incommingRefreshToken !== user?.refreshToken) {
            throw new apierror(401, "REFRESH TOKEN IS EPXIRED OR USED");
        }

        const options = {
            httpOnly: true,
            secure: true,
        };

        const { accessToken, newRefreshToken } =
            await generateAccessTokenAndRefreshToken(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new apiresponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "ACCESS TOKEN REFRESHED SUCCESSFULLY"
                )
            );
    } catch (error) {
        throw new apierror(
            401,
            error?.error.message || "INVALID REFRESH TOKEN "
        );
    }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);

    const isCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isCorrect) {
        throw new apierror(400, "INCORRECT PASSWORD");
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new apiresponse(200, {}, "PASSWORD CHANGED SUCCESSFULLY"));
});

const currentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new apiresponse(200, req.user, "CURRENT USER FETCHED SUCCESSFULLY")
        );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;
    if (!fullName || !email) {
        throw new apierror(400, "ALL FIELDS ARE REQUIRED");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email,
            },
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(
            new apiresponse(200, user, "ACCOUNT DETAILS UPDATED SUCCESSFULLY")
        );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new apierror(400, "AVATAR FILE IS MISSING ");
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar.url) {
        throw new apierror(400, "ERROR UPLAODING FILE ON CLOUDINARY");
    }

    const user = await User.findById(req.user?._id);

    if (!user) {
        throw new apierror(400, "USER NOT FOUND ");
    }
    const public_id = user.avatar;

    user.avatar = avatar.url;

    await user.save({ validateBeforeSave: false });

    await deleteFromCloudinary(public_id);

    return res
        .status(200)
        .json(new apiresponse(200, user, "AVATAR IMAGE UPDATED SUCCESSFULLY"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;
    if (!coverImageLocalPath) {
        throw new apierror(400, "COVER IMAGE FILE IS MISSING");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage.url) {
        throw new apierror(400, "ERROR UPLOADING FILE ON CLOUDINARY");
    }

    const user = await User.findById(req.user?._id);

    if (!user) {
        throw new apierror(404, "USER NOT FOUND");
    }

    const oldCoverImage = user.coverImage;

    user.coverImage = coverImage.url;

    await user.save({ validateBeforeSave: false });

    if (oldCoverImage) {
        await deleteFromCloudinary(oldCoverImage);
    }

    return res
        .status(200)
        .json(new apiresponse(200, user, "COVER IMAGE UPDATED SUCCESSFULLY"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;
    if (!username?.trim()) {
        throw new apierror(400, "USERNAME IS MISSING ");
    }

    const currentUserId = req.user?._id
        ? new mongoose.Types.ObjectId(req.user._id)
        : null;

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase(),
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo",
            },
        },
        {
            $addFields: {
                currentUserId: currentUserId,
                subscribersCount: {
                    $size: "$subscribers",
                },
                channelSubscribedToCount: {
                    $size: "$subscribedTo",
                },
                // to show subscribe or subscribed to frontend (true = subscribed , false = notSubscribed)
                isSubscribed: {
                    $cond: {
                        if: {
                            $in: ["$currentUserId", "$subscribers.subscriber"],
                        },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
                createdAt: 1,
            },
        },
    ]);

    if (!channel?.length) {
        throw new apierror(404, "CHANNEL DOES NOT EXIST ");
    }

    return res
        .status(200)
        .json(
            new apiresponse(
                200,
                channel[0],
                "USER CHANNEL FETCHED SUCCESSFULLY"
            )
        );
});

const getWatchHistory = asyncHandler(async (req, res) => {
    const currentUserId = req.user?._id
        ? new mongoose.Types.ObjectId(req.user._id)
        : null;

    const user = await User.aggregate([
        {
            $match: {
                _id: currentUserId,
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner",
                            },
                        },
                    },
                ],
            },
        },
    ]);

    return res
        .status(200)
        .json(200, user[0].watchHistory, "WATCH HISTORY FETCHED SUCCESSFULLY");
});
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    currentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
};

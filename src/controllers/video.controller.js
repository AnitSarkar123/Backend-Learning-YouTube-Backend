import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    /*note:
        What is req.query?
    req: This is the request object provided by Express.js in a route handler. It contains information about the HTTP request.
    query: This is a property of the req object that contains an object representing the query string parameters.
    Example
    Consider the following URL:
    
    http://example.com/items?page=2&limit=20&sortBy=name&sortType=asc&userId=123
    In this URL, the part after the ? is the query string: page=2&limit=20&sortBy=name&sortType=asc&userId=123.
    
    When this URL is accessed in an Express.js route handler, req.query would be an object like this:
    {
      page: '2',
      limit: '20',
      sortBy: 'name',
      sortType: 'asc',
      userId: '123'
    } */

    try {
        const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
        //TODO: get all videos based on query, sort, pagination
        if (!userId) {
            throw new ApiError(400, "User Id not provided");
        }

        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid User Id");
        }
        //another process to do aggrigation pipeline
        const pipeline = [];
        if (userId) {
            pipeline.push({
                $match: {
                    owner: new mongoose.Types.ObjectId(userId)
                }
            });


        }
        if (query) {
            pipeline.push({
                $match: {
                    $or: [
                        { title: { $regex: query, $options: "i" } },
                        { description: { $regex: query, $options: "i" } }
                        //The "i" option in the $options parameter makes the regular expression search case-insensitive, allowing you to match patterns regardless of whether the characters are uppercase or lowercase.
                    ]
                }
            });

        }
        // fetch videos only that are set isPublished as true
        pipeline.push({ $match: { isPublished: true } });
        //sortBy can be views, createdAt, duration
        //sortType can be ascending(-1) or descending(1)
        if (sortBy && sortType) {
            pipeline.push({
                $sort: {
                    [sortBy]: sortType === "asc" ? 1 : -1,
                },
            });
        } else {
            pipeline.push({ $sort: { createdAt: -1 } });
        }
        pipeline.push(
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "ownerDetails",
                    pipeline: [
                        {
                            $project: {
                                username: 1,
                                "avatar.url": 1,
                            },
                        },
                    ],
                },
            },
            {
                $unwind: "$ownerDetails",//The "$unwind "stage in MongoDB's aggregation framework is used to deconstruct an array field from the input documents to output a document for each element of the array. Essentially, it "flattens" the array field so that each element of the array becomes a separate document.
            }
        );
        const videoAggregate = Video.aggregate(pipeline);

        const options = {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
        };

        const video = await Video.aggregatePaginate(videoAggregate, options);

        return res
            .status(200)
            .json(new ApiResponse(200, video, "Videos fetched successfully"));
    } catch (error) {
        throw new ApiErrorHandler(
            error.statusCode || 500,
            error.message || "Internal server error while fetching "
        );
    }

})

const publishAVideo = asyncHandler(async (req, res) => {
    try {
        const { title, description } = req.body
        // TODO: get video, upload to cloudinary, create video
        if (!title || !description || description.trim().length < 2) {
            throw new ApiError(400, "Title and Description are required nad description must be more than 2 characters")
        }
        const videoLocalPath = req.files?.videoFile[0]?.path;
        const thumbnailLocalPath = req.files?.thumbnail[0]?.path;

        if (!videoLocalPath) {
            throw new ApiError(400, "Video file is missing");
        }
        if (!thumbnailLocalPath) {
            throw new ApiError(400, "Thumbnail is missing");
        }

        const VideoPublicId = await uploadOnCloudinary(videoLocalPath);
        const ThumbNailPublicId = await uploadOnCloudinary(thumbnailLocalPath);

        const uploadVideo = await Video.create({
            videoFile: cloudinaryVideoUrl.url,
            thumbNail: cloudinaryThumbnailUrl.url,
            VideoPublicId,
            ThumbNailPublicId,
            owner: new mongoose.Types.ObjectId(req.user?._id),
            title: title,
            description,
            duration: duration,
            isPublished: isPublished,
        });

        if (!uploadVideo) {
            throw new ApiError(
                500,
                "Something went wrong while saving the video to database"
            );
        }

        return res
            .status(200)
            .json(new ApiResponse(200, uploadVideo, "Video uploaded successfully"));
    } catch (error) {
        throw new ApiErrorHandler(
            error.statusCode || 500,
            error.message || "Internal server error while fetching "
        );
    }

})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video Id");
    }
    const userId = req.user?._id;
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid Video Id");
    }
    const getvedio = await Vedio.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            },

        },
        {
            $lookup: {
                from: "liles",
                localField: "_id",
                foreignField: "video",
                as: "likes",
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers",
                        },
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribers",
                            },
                            isSubscribed: {
                                $cond: {
                                    if: {
                                        $in: [req.user?._id, "$subscribers.subscriber"],
                                    },
                                    then: true,
                                    else: false,
                                },
                            },
                        },
                    },
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1,
                            subscribersCount: 1,
                            isSubscribed: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes",
                },
                owner: {
                    $first: "$owner",
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                "videoFile.url": 1,
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                duration: 1,
                comments: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1,
            },
        },
    ]);

    if (!getvideo) {
        throw new ApiError(500, "failed to fetch video");
    }

    // increment views if video fetched successfully
    await Video.findByIdAndUpdate(videoId, {
        $inc: {
            views: 1,
        },
    });

    // add this video to user watch history
    await User.findByIdAndUpdate(req.user?._id, {
        $addToSet: {
            watchHistory: videoId,
        },
    });

    return res
        .status(200)
        .json(new ApiResponse(200, getvideo[0], "video details fetched successfully"));
})


const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Vedio is not found");
    }
    const { newtitle, newdescription, isPublished } = req.body;
    const thumbnailLocalPath = req.file?.path;
    if (!newtitle || !newdescription || !isPublished) {
        throw new ApiError(400, "ALl three fields are required");
    }
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is not missing");
    }
    const oldVideo = await Video.findById(videoId);

    const oldThumbnail = oldVideo.thumbnail;
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!thumbnail.url) {
        throw new ApiError(500, "Error while uploading on cloudinary");
    }

    await deleteFromCloudinary(oldThumbnail);//it can be exchanged see the user controller

    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                isPublished,
                thumbnail: thumbnail.url,
            },
        },
        { new: true }
    );

    if (!video) {
        throw new ApiError(500, "Video not found after updating the details");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video updated successfully"));



})

const deleteVideo = asyncHandler(async (req, res) => {

    //TODO: delete video
    const { videoId } = req.params;
    if (!videoId) {
        throw new ApiError(400, "Video Id is not provided");
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video Id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(400, "No video with given id exists.");
    }

    const deletedVideo = await Video.findByIdAndDelete(video);
    if (!deletedVideo) {
        throw new ApiError(500, "Error in  deleting the video");
    }

    await deleteFromCloudinary(video.videoFile);
    await deleteFromCloudinary(video.thumbnail);

    return res
        .status(200)
        .json(new ApiResponse(200, deletedVideo, "Video deleted successfully"));

})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!videoId) {
        throw new ApiError(400, "Video Id is not provided");
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Video Id");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const togglePublish = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video.isPublished,
            },
        },
        { new: true }
    );

    if (!togglePublish) {
        throw new ApiError(500, "Unable to toggle the published section");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, togglePublish, "isPublished is successfully toggled")
        );
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}

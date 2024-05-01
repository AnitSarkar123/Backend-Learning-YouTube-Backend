import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: toggle like on video
    if (!req.user?._id) {
        throw new ApiError(401, "Unauthorized, please login")
    }
    if (!mongoose.Types.ObjectId.isValid(videoId) || !videoId) {
        throw new ApiError(404, "Video not found")
    } try {
        const ExistingLike = await Like.findOne({
            video: videoId,
            likedBy: req.user._id
        });
        if (ExistingLike) {
            //throw new ApiError(400, "Already liked")
            const DeleteLike = await Like.findByIdAndDelete({
                vedio: videoId,
                likedBy: req.user._id
            });
            if (DeleteLike.deletedcount > 0) {
                return res
                    .status(200)
                    .json(new ApiResponse(200, [], "Like deleted successfully"))
            }

        }
        const like = await Like.create({
            video: videoId,
            likedBy: req.user._id
        })
        if (!like) {
            throw new ApiError(400, "Like not created or invalid vedio or invalid user");
        }
        return res
            .status(201)
            .json(new ApiResponse(201, like, "Like created successfully"))
    } catch (error) {
        throw new ApiError(
            error.statuscode || 500,
            error.message || "Internal server error while creating a like"
        );

    }



})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    //TODO: toggle like on comment
    if (!req.user?._id) {
        throw new ApiError(401, "Unauthorized, please login");
    }
    if (!mongoose.Types.ObjectId.isValid(commentId) || !commentId) {
        throw new ApiError(404, "Comment not found");
    }
    try {
        const ExixtCommentLike = await Like.findOne({
            comment: commentId,
            likedBy: req.user._id
        });
        if (ExixtCommentLike) {
            //throw new ApiError(400, "Already liked")
            const DeleteCommentLike = await Like.findByIdAndDelete({
                comment: commentId,
                likedBy: req.user._id
            });
            if (DeleteCommentLike.deletedcount > 0) {
                return res
                    .status(200)
                    .json(new ApiResponse(200, [], "Like deleted successfully"))
            }
        }
        const like = await Like.create({
            comment: commentId,
            likedBy: req.user._id
        })
        if (!like) {
            throw new ApiError(400, "Like not created or invalid comment or invalid user");
        }
        return res
            .status(201)
            .json(new ApiResponse(201, like, "Like created successfully"));

    } catch (error) {
        throw new ApiError(
            error.statuscode || 500,
            error.message || "Internal server error while creating a like"
        );

    }


})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    //TODO: toggle like on tweet
    if (!req.user?._id) {
        throw new ApiError(401, "Unauthorized, please login");
    }
    if (!mongoose.Types.ObjectId.isValid(tweetId) || !tweetId) {
        throw new ApiError(404, "Tweet not found");
    }
    try {
        const ExistingTweetLike = await Like.findOne({
            tweet: tweetId,
            likedBy: req.user._id
        })
        if (ExistingTweetLike) {
            //throw new ApiError(400, "Already liked")
            const DeleteTweetLike = await Like.findByIdAndDelete({
                tweet: tweetId,
                likedBy: req.user._id
            });
            if (DeleteTweetLike.deletedcount > 0) {
                return res
                    .status(200)
                    .json(new ApiResponse(200, [], "Like deleted successfully"))
            }

        }
        const tweetLike = await Like.create({
            tweet: tweetId,
            likedBy: req.user._id
        })
        if (!tweetLike) {
            throw new ApiError(400, "Like not created or invalid tweet or invalid user");
        }
        return res
            .status(201)
            .json(new ApiResponse(201, tweetLike, "Like created successfully"));
    } catch (error) {
        throw new ApiError(
            error.statuscode || 500,
            error.message || "Internal server error while creating a like"
        );
    }


}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    if (!req.user?._id) {
        throw new ApiError(401, "Unauthorized, please login");
    }
    try {
        //video: { $exists: true }: This part of the query ensures that only likes on videos
        // are considered. It filters out documents where the video field exists
        //(i.e., is not null or undefined). This is useful if your Like collection may also include likes on other types of content, like comments or tweets.
        const likedVideos = await Like.find({
            likedBy: req.user?._id,
            video: { $exists: true },
        }).populate("video");
        // .populate('video')
        //This is a Mongoose method used to replace the video field in each document
        // with the actual details of the liked video. By populating the video field,
        //you retrieve the full information about the video that was liked. This is particularly useful when you want to get details from the referenced document
        if (!likedVideos || likedVideos.length === 0) {
            //   throw new ApiError(404, "No liked videos found");
            return res
                .status(200)
                .json(
                    new ApiResponce(201, likedVideos || [], "No liked videos available")
                );
        }
        return res
            .status(200)
            .json(new ApiResponse(200, likedVideos, "Liked videos fetched successfully"));
    } catch (error) {

        throw new ApiErrorHandler(
            error.statusCode || 500,
            error?.message || "internal server error while fetching all liked videos"
        );
    }

})
const getAllLikeofVedio = asyncHandler(async (req, res) => {
    // The function getAllLikeofVedio give all the users who liked a specific vedio
    const { videoId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(videoId) || !videoId) {
        throw new ApiError(404, "Invalid Video ID")
    }
    try {
        let pipeline = [];
        pipeline.push({
            $match: {
                video: mongoose.Types.ObjectId(videoId),
            },
        });
        pipeline.push(
            {
                $lookup: {
                    // Add lookup configuration here
                    from: "users",
                    localField: "likedBy",
                    foreignField: "_id",
                    as: "ownerDetails",

                },
            },
            {
                $unwind: {
                    path: "$ownerDetails",
                    preserveNullAndEmptyArrays: true, // optional option
                },
            },
            {
                $addFields: {
                    owner: {
                        username: "$ownerDetails.username",
                        avatar: "$ownerDetails.avatar",
                        fullName: "$ownerDetails.fullName",
                        _id: "$ownerDetails._id",
                    },
                },
            },
            {
                $group: {
                    _id: "$video",
                    totalLikes: { $sum: 1 },
                    // addToSet create an array of owners on the basis of $owner field and find unique owner
                    owners: { $addToSet: "$owner" },
                },
            },
            // {
            //   $unwind: "$owners",
            // },
            {
                $project: {
                    _id: 1,
                    totalLikes: 1,
                    owners: 1, // now it shows all arrray
                    //owner: { $first: "$owners" }, // in this way it just select the first element
                },
            }
        );
        const likedDetails = await Like.aggregate(pipeline);
        if (!likedDetails) {
            throw new ApiErrorHandler(
                500,
                "error while fetching video likes bt video id"
            );
        }
        return res
            .status(200)
            .json(
                new ApiResponce(
                    200,
                    likedDetails,
                    "likes by video Id fetched successfully"
                )
            );



    } catch (error) {
        throw new ApiErrorHandler(
            error.statusCode || 500,
            error?.message || "internal server error while fetching likes by video id"
        );

    }

})
const getAlllikeofComment = asyncHandler(async (req, res) => {
    // The function getAlllikeofComment give all the users who liked a specific comment
    const { commentId } = req.params
    if (!mongoose.Types.ObjectId.isValid(commentId) || !commentId) {
        throw new ApiError(404, "Invalid Comment ID")
    }
    try {
        let pipeline = [];
        pipeline.push({
            $match: {
                comment: new mongoose.Types.ObjectId(contentId),
            },
        });
        pipeline.push(
            {
                $lookup: {
                    from: "users",
                    localField: "likedBy",
                    foreignField: "_id",
                    as: "ownerDetails",
                },
            },
            {
                $unwind: {
                    path: "$ownerDetails",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $addFields: {
                    owner: {
                        _id: "$ownerDetails._id",
                        fullName: "$ownerDetails.fullName",
                        avatar: "$ownerDetails.avatar",
                    },
                },
            },
            {
                $group: {
                    _id: "$comment",
                    totalLikes: { $sum: 1 },
                    // addToSet create an array of owners on the basis of $owner field and find unique owner
                    owners: { $addToSet: "$owner" },
                },
            },
            // {
            //   $unwind: "$owners",
            // },
            {
                $project: {
                    _id: 1,
                    totalLikes: 1,
                    owners: 1, // now it shows all arrray
                    //owner: { $first: "$owners" }, // in this way it just select the first element
                },
            }
        );
        const likedDetails = await Like.aggregate(pipeline);
        if (!likedDetails) {
            throw new ApiErrorHandler(
                500,
                "error while fetching comments likes by comment id"
            );
        }
        return res
            .status(200)
            .json(
                new ApiResponce(
                    200,
                    likedDetails,
                    "Total likes by comment Id fetched successfully"
                )
            );



    }
    catch (e) {
        throw new ApiErrorHandler(
            e.statusCode || 500,
            e?.message || "internal server error while fetching likes by comment id"
        );
    }

})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos,
    getAllLikeofVedio,
    getAlllikeofComment
}
import mongoose from "mongoose"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query
    if (!mongoose.Types.ObjectId.isValid(videoId) || !videoId) {
        throw new ApiError(404, "Invalid Video or vedio not found");
    }
    const getComments = await Comment.aggregate([
        {
            $match: {
                vedio: new mongoose.Types.ObjectId(vedioId),
            },

        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
            },


        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likescount"

            },
        },
        {
            $addFields: {
                likescount: {
                    $size: "$likescount"
                },
                owner: {
                    // $arrayElemAt:["$owner",0] this is the optobal method 
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$likes.likedBy"]
                        },
                        then: true,
                        else: false

                    },
                },

            },
        },
        {
            $sort: {
                createdAt: -1,
            },

        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                likescount: 1,
                owner: {
                    username: 1,
                    fullName: 1,
                    'avatar.url': 1,
                },
                isLiked: 1,
            },
        },


    ]);


    if (!getComments) {
        throw new ApiError(500, "Error while loading getComments section");
    }

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        //we also can do this but above is better
        // page: 1,
        // limit: 10,
    };

    const comments = await Comment.aggregatePaginate(getComments, options);

    if (!comments) {
        throw new ApiError(500, "Error while loading comments section");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, comments, "Comments fetched successfully!"));
});




const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    try {
        const { videoId } = req.params
        const { content } = req.body
        if (!mongoose.Types.ObjectId.isValid(videoId) || !videoId) {
            throw new ApiError(404, "Invalid Video or vedio not found");
        }
        if (!content || content.trim().length < 1 || content.trim().length > 1080) {
            throw new ApiError(400, "Content is required and should be between 1 and 1080 characters");
        }
        if (!req.user?._id) {
            throw new ApiError(401, "Unauthorized, please login");
        }
        const uploadComment = await Comment.create({
            video: videoId,
            content,
            owner: req.user._id
        })
        if (!uploadComment) {
            throw new ApiError(500, "Internal server error while creating a comment");
        }
        return res
            .status(201)
            .json(new ApiResponse(201, uploadComment, "Comment created successfully"))
    } catch (error) {
        throw new ApiError(501, error?.message || "Error to genereate comment")
    }

});

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    try {
        const { commentId } = req.params
        const { content } = req.body
        if (!mongoose.Types.ObjectId.isValid(commentId) || !content || content.trim().length < 1 || content.trim().length > 1080) {
            throw new ApiError(400, "Content is required and should be between 1 and 1080 characters");
        }
        const comment = await Comment.findById(commentId)
        if (!comment) {
            throw new ApiError(404, "Comment not found")
        }
        if (!req.user?._id.toString() !== comment?.owner.toString()) {
            throw new ApiError(401, "this is not your comment")
        }
        const uploadComment = await Comment.findByIdAndUpdate(
            commentId,
            {
                $set: {
                    content: content,
                },
            },
            { new: true }
        );
        if (!uploadComment) {
            throw new ApiError(500, "Failed to update comment");
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    uploadComment,
                    "Comment has been updated Successfully"
                )
            );
    } catch (error) {
        throw new ApiError(501, error?.message || "Error to Update comment")
    }



});

const deleteComment = asyncHandler(async (req, res) => {
    try {
        // TODO: delete a comment
        const { commentId } = req.params
        // const { content } = req.body
        if (!mongoose.Types.ObjectId.isValid(commentId)) {
            throw new ApiError(400, "Content is required and should be between 1 and 1080 characters");
        }
        const comment = await Comment.findById(commentId)
        if (!comment) {
            throw new ApiError(404, "Comment not found")
        }
        if (!req.user?._id.toString() !== comment?.owner.toString()) {
            throw new ApiError(401, "this is not your comment")
        }

        const deletedComment = await Comment.findByIdAndDelete(commentId);
        if (!deletedComment) {
            throw new ApiError(500, "Failed to delete comment");
        }
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    deletedComment,
                    "Comment has been deleted Successfully"
                )
            );

    } catch (error) {
        throw new ApiError(501, error?.message || "Error to Delete comment")
    }



})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}

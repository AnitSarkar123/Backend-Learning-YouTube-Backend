import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const { content } = req.body;
    if (!content || content.trim().length < 2 || content.trim().length > 280) {
        throw new ApiError(400, "Content is required and should be between 2 and 280 characters");
    }
    if (!req.user?._id) {
        throw new ApiError(401, "Unauthorized, please login");
    }
    try {
        const tweet = await Tweet.create({
            content,
            owner: req.user._id
        });
        return res
            .status(201)
            .json(new ApiResponse(201, tweet, "Tweet created successfully"));
    } catch (error) {
        throw new ApiError(
            error.statusCode || 500,
            error.message || "Internal server error while creating a tweet"
        );
    }
});


const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    if (!req.user?._id) {
        throw new ApiError(401, "Unauthorized, please login");
    }
    try {
        const usertweets = await Tweet.find({ owner: req.user._id })
            .populate("owner", "username email")
            .sort({ createdAt: -1 });
        if (!usertweets || usertweets.length === 0) {
            return res
                .status(200)
                .json(new ApiResponse(400, userTweets || [], "user Tweets not found"));
        }
        return res
            .status(200)
            .json(new ApiResponse(200, usertweets, "User tweets retrieved successfully"));
    } catch (error) {
        throw new ApiError(
            error.statusCode || 500,
            error.message || "Internal server error while retrieving user tweets"
        );
    }

})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const { content } = req.body;
    const { tweetId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(tweetId) || !content || content.trim().length < 2 || content.trim().length > 280) {
        throw new ApiError(400, "Content is required and should be between 2 and 280 characters");
    }
    if (!req.user?._id) {
        throw new ApiError(401, "Unauthorized, please login");
    }
    try {
        const tweet = await Tweet.findOneAndUpdate(
            { _id: tweetId, owner: req.user._id },
            { $set: { content } },
            { new: true }
        ).exec();

        if (!tweet) {
            throw new ApiError(404, "Tweet not found");
        }
        return res
            .status(200)
            .json(new ApiResponse(200, tweetId, "Tweet updated successfully"));
    }
    catch (error) {
        throw new ApiError(
            error.statusCode || 500,
            error.message || "Internal server error while updating a tweet"
        );
    }

});

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const { tweetId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(tweetId) || !tweetId) {
        throw new ApiError(404, "Tweet not found");
    }
    if (!req.user?._id) {
        throw new ApiError(401, "Unauthorized, please login");
    }
    try {

        const deletTwieet = await Tweet.findOneAndDelete(
            {
                _id: tweetId,
                owner: req.user._id
            });
        if (!deletTwieet) {
            throw new ApiError(404, "Tweet not found");
        }

        //check for user authentication   
        const user = await User.findById(req.user._id);
        if (!user) {
            throw new ApiError(401, "Unauthorized, please login");
        }
        if (user.tweets.length === 1) {
            throw new ApiError(400, "You cannot delete the last tweet");
        }
        return res
            .status(200)
            .json(new ApiResponse(200, deletTwieet, "Tweet deleted successfully"));
    } catch (error) {
        error.statusCode || 500,
            error.message || "Internal server error while deleting a tweet"
    }
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}

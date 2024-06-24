import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    // TODO: toggle subscription
    // check if channel exists
    if (isValidObjectId(channelId)) {
        throw new ApiError(400, "Channel not found")
    }
    const userId = req.user?._id;
    if (!userId) {
        throw new ApiError(401, "Please login to subscribe any channel");
    }
    const existingSubscriber = await Subscription.findOne({
        channel: channelId,
        subscriber: new mongoose.Types.ObjectId(userId),
    })
    if (existingSubscriber) {
        await Subscription.deleteOne({
            channel: channelId,
            subscriber: userId,
        })
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { isSubscribed: false },
                    "Unsubscribed successfully"
                )
            );
    }
    const subscribing = await Subscription.create({
        subscriber: new mongoose.Types.ObjectId(userId),
        channel: channelId,
    });

    if (!subscribing) {
        throw new ApiError(500, "Server error while subscribing");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, { isSubscribed: true }, "Subscribed successfully")
        );


})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    let pipeline = [];
    if (!channelId || !mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiErrorHandler(404, "channel id does not exist, Invalid Id");
    }
    try {
        const { page = 1, limit = 4, query, sortBy, sortType } = req.query;
        pipeline.push({
            $match: {
                channel: new mongoose.Types.ObjectId(channelId),
            },
        });
        pipeline.push({ $sort: { createdAt: -1 } });
        pipeline.push(
            {
                $lookup: {
                    from: "users",
                    localField: "subscriber",
                    foreignField: "_id",
                    as: "subscriberDetails",
                },
            },
            {
                $unwind: {
                    path: "$subscriberDetails",
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $addFields: {
                    subscriber: {
                        _id: "$subscriberDetails._id",
                        fullName: "$subscriberDetails.fullName",
                        avatar: "$subscriberDetails.avatar",
                        userName: "$subscriberDetails.userName",
                    },
                },
            },
            {
                $project: {
                    subscriberDetails: 0,
                },
            }
        );
        const getSubscribersListAggregate = Subscription.aggregate(pipeline);
        if (!getSubscribersListAggregate) {
            return res.status(200).json(new ApiResponce(200, [], "No subscriber"));
        }
        const result = await Subscription.aggregatePaginate(
            getSubscribersListAggregate,
            {
                page: parseInt(page, 10),
                limit: parseInt(limit, 10),
            }
        );
        if (!result) {
            throw new ApiErrorHandler(
                500,
                "error while fetching subscriber of a channel."
            );
        }
        return res
            .status(200)
            .json(
                new ApiResponce(200, result, "Subscribers list fetched successfully")
            );
    } catch (error) {
        throw new ApiErrorHandler(
            error.statusCode || 500,
            error?.message || "internal server error while fetching a channel by Id"
        );
    }


})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel Id");
    }

    const subscribedChannels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(channelId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "subscribedChannel",
                pipeline: [
                    {
                        $lookup: {
                            from: "videos",
                            localField: "_id",
                            foreignField: "owner",
                            as: "videos",
                        },
                    },
                    {
                        $addFields: {
                            latestVideo: {
                                $last: "$videos",
                            },
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$subscribedChannel",
        },
        {
            $project: {
                _id: 0,
                subscribedChannel: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1,
                    latestVideo: {
                        _id: 1,
                        "videoFile.url": 1,
                        "thumbnail.url": 1,
                        owner: 1,
                        title: 1,
                        description: 1,
                        duration: 1,
                        createdAt: 1,
                        views: 1,
                    },
                },
            },
        },
    ]);

    if (!subscribedChannels) {
        throw new error(500, "Server error while fetching subscribed channels");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscribedChannels,
                "Subscribed channels fetched successfully"
            )
        );

})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}
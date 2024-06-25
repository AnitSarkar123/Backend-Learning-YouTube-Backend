import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body
    //TODO: create playlist
    const userId = req.user?._id;
    if (!userId || isValidObjectId(userId)) {
        throw new ApiError(402, "To create playlist login")
    }
    if (!name) {
        throw new ApiError(401, "Name of the playlist requred")
    }
    // check playlist name already exist or not
    const PlaylistExist = await Playlist.findOne({
        owner: userId,
        name,
    });
    if (PlaylistExist) {
        //console.log("Error object type:", typeof error);
        throw new ApiErrorHandler(
            404,
            "play list already exit. please choose another name"
        );
    }

    const newplaylist = await Playlist.create({ name, description, owner: userId })
    if (!newplaylist) {
        throw new ApiError(500, " server Error while createing a playlist");
    }
    return res
        .status(200)
        .json(new ApiResponse(200, newplaylist, "Playlist created successfully"));
})
//check it aganin
const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params
    //TODO: get user playlists
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user id")
    }
    const playlist = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: "vedios",
                localField: "video",
                foreignField: "_id",
                as: "videos"
            },
        },

        {
            $addFields: {
                totalVideos: {
                    $size: "$videos",
                },
                totalViews: {
                    $sum: "$videos.views",
                },
            },
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                totalVideos: 1,
                totalViews: 1,
                updatedAt: 1,
            },
        },
    ]);

    if (!playlist) {
        throw new ApiError(500, "Server error while finding the playlist");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "User playlist fetched successfully"));


})

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    if (!playlistId || !mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiErrorHandler(404, "Invalid play list Id");
    }
    try {
        const getPlaylist = await Playlist.findById(playlistId);
        if (!getPlaylist) {
            throw new ApiErrorHandler(404, "play list not available");
        }
        return res
            .status(200)
            .json(new ApiResponse(200, getPlaylist, "playlist fetched successfully"));
    } catch (error) {
        throw new ApiErrorHandler(
            error?.statusCode || 500,
            error?.message ||
            "internal server error while fetching the playlist by Id"
        );
    }



})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }
    if (!playlistId || !mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Invalid  playlist id")
    }
    if (!req.user?._id) {
        throw new ApiError(401, "Unauthorized");
    }
    try {
        const ifexist = await Playlist.findOne({
            _id: playlistId,
            owner: req.user._id,
            videos: { $in: [videoId] },
        })
        if (ifexist) {
            throw new ApiError(400, "Video already exist in playlist")
        }
        const updatePlaylist = await Playlist.findByIdAndUpdate(
            {
                _id: playlistId,
                owner: req.user._id,
            },
            {
                $addToSet: { video: videoId },

            },
            {
                new: true,
            }

        );
        if (!updatePlaylist) {
            throw new ApiErrorHandler(
                404,
                "video not added into this playlist, try again"
            );
        }
        return res
            .status(200)
            .json(new ApiResponse(200, updatePlaylist, "video added successfully"));
    } catch (error) {
        throw new ApiErrorHandler(
            error?.statusCode || 500,
            error?.message || "internal server error while adding video into playlisy"
        );
    }







})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params
    // TODO: remove video from playlist
    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video id")
    }
    if (!playlistId || !mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Invalid  playlist id")
    }
    if (!req.user?._id) {
        throw new ApiError(401, "Unauthorized");
    }
    try {
        const deleteVediofromPlayList = await Playlist.findByIdAndUpdate(
            {
                _id: playlistId,
                owner: req.user?._id,
                videos: videoId,

            },
            {
                $pull: {
                    videos: videoId,
                }

            }, {
            new: true,
        }

        )
        if (!deleteVediofromPlayList) {
            throw new ApiErrorHandler(401, "video not exist or Unauthorized user");
        }
        return res
            .status(200)
            .json(
                new ApiResponce(
                    200,
                    deleteVediofromPlayList,
                    "Video deleted from playlist successfully"
                )
            );
    } catch (error) {
        throw new ApiErrorHandler(
            error?.statusCode || 500,
            error?.message || "internal server error while deleting the playlist"
        );

    }




})

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist Id");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(400, "Playlist not found");
    }

    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "You are not authorized to delete the playlist");
    }

    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);

    if (!deletedPlaylist) {
        throw new ApiError(500, "Server error while deleting playlist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, deletedPlaylist, "Playlist deleted successfully")
        );
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;

    if (!(name && description)) {
        throw new ApiError(400, "All fields are required , name and description");
    }

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist Id");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(400, "Playlist not found");
    }

    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "Only owner can edit the playlist");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                name,
                description,
            },
        },
        { new: true }
    );

    if (!updatedPlaylist) {
        throw new ApiError(500, "Server error while updating the playlist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedPlaylist, "Playlist updated successfully")
        );
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}

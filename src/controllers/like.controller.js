import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID")
    }
    const existingLike = await Like.findOne({
        owner: req.user._id,
        video: videoId
    })
    if (existingLike) {
        // Unlike the video
        await Like.deleteOne({ _id: existingLike._id })
        return res.status(200).json(new ApiResponse("Video unliked successfully", true))
    } else {
        // Like the video
        const newLike = await Like.create({
            owner: req.user._id,
            video: videoId
        })
        return res
          .status(201)
          .json(new ApiResponse(200, newLike, "Video liked successfully"));
    }
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID")
    }
    const existingLike = await Like.findOne({
        owner: req.user._id,
        comment: commentId
    })
    if (existingLike) {
        // Unlike the comment
        await Like.deleteOne({ _id: existingLike._id })
        return res.status(200).json(new ApiResponse("Comment unliked successfully", true))
    } else {
        // Like the comment
        const newLike =  Like.create({
            owner: req.user._id,
            comment: commentId
        })
        return res.status(201).json(new ApiResponse("Comment liked successfully", true))
    }


})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID")
    }
    const existingLike = await Like.findOne({
        owner: req.user._id,
        tweet: tweetId
    })
    if (existingLike) {
        // Unlike the tweet
        await Like.deleteOne({ _id: existingLike._id })
        return res.status(200).json(new ApiResponse("Tweet unliked successfully", true))
    } else {
        // Like the tweet
        const newLike =  Like.create({
            owner: req.user._id,
            tweet: tweetId
        })
        return res.status(201).json(new ApiResponse("Tweet liked successfully", true))
    }
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
  const likedVideos = await Like.aggregate([
    {
      $match: {
        owner: req.user._id,
        video: { $exists: true }, // Ensure it's a video like
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
      },
    },
    { $unwind: "$video" },
    {
      $lookup: {
        from: "users",
        localField: "video.owner",
        foreignField: "_id",
        as: "video.owner",
      },
    },
    { $unwind: "$video.owner" },
    {
      $project: {
        _id: "$video._id",
        title: "$video.title",
        description: "$video.description",
        createdAt: "$video.createdAt",
        liked: { $literal: true },
        owner: {
          _id: "$video.owner._id",
          fullName: "$video.owner.fullName",
          username: "$video.owner.username",
          avatar: "$video.owner.avatar",
        },
      },
    },
  ]);

  if (!likedVideos || likedVideos.length === 0) {
    return res
      .status(404)
      .json(new ApiResponse(404, [], "No liked videos found"));
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "Liked videos fetched successfully")
    );
});
  

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}
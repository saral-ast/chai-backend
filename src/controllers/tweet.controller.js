import mongoose, { isValidObjectId, mongo } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { pipeline } from "stream";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  const { content } = req.body;
  const ownerId = req.user._id;
  if (!content) {
    throw new ApiError(400, "Content is required");
  }
  const newTweet = await Tweet.create({
    content,
    owner: ownerId,
  });

  if (!newTweet) {
    throw new ApiError(500, "Failed to create tweet");
  }

  return res
    .status(201)
    .json(new ApiResponse(200,"Tweet created successfully", newTweet));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets
  
  // console.log(userId)
  // const valid = isValidObjectId(userId)
  // console.log(valid)
  const { userId } = req.params;
  if (!userId.trim() || !isValidObjectId(userId)) {
    throw new ApiError(400, "userId is required or invalid!");
  }
  const user = await User.findById(userId).select("username avatar");

  if (!user) {
    throw new ApiError(400, "user not found");
  }
  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "likeCount",
      },
    },
    {
      $addFields: {
        likeCount: {
          $size: "$likeCount",
        },
      },
    },
    {
      $project: {
        content: 1,
        createdAt: 1,
        updatedAt: 1,
        // owner: 1,
        likeCount: 1,
      },
    },
    {
      $sort: {
        createdAt: -1, // Sort by createdAt in descending order
      },
    },
  ]);

  

  if (tweets.length == 0) {
    throw new ApiError(400, "No tweets Available");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, {
       tweets: tweets,
       owner: user
    }, "tweets fetched successfully !"));
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  const { tweetId } = req.params;
  const  content  = req.body.content;
  console.log(content, tweetId);

  if (!tweetId.trim() || !isValidObjectId(tweetId)) {
    throw new ApiError(400, "tweetId is required or invalid!");
  }
  const tweet = await Tweet.findById(tweetId).select('-owner');
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }
  if (!content) {
    throw new ApiError(400, "Content is required");
  }
  tweet.content = content;
  tweet.updatedAt = new Date();
  const updatedTweet = await tweet.save();
  return res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "Tweet updated successfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
  const { tweetId } = req.params;
  if (!tweetId.trim() || !isValidObjectId(tweetId)) {
    throw new ApiError(400, "tweetId is required or invalid!");
  }
  const tweet = await Tweet.deleteOne({ _id: tweetId });
  if( tweet.deletedCount === 0 || tweet.acknowledged === false) {
    throw new ApiError(404, "Tweet not found or already deleted");
  }
  // await tweet.delete();
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Tweet deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };

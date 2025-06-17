import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const pipeline = [
    {
      $match: { video: videoId },
    },
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
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "comment",
        as: "likes",
        pipeline: [
          {
            $match: {
              owner: req.user._id,
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
        likes: {
          $size: "$likes",
        },
      },
    },
  ];

  const aggregate = Comment.aggregate(pipeline);
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };
  const comments = await Comment.aggregatePaginate(aggregate, options);
  if (!comments || comments.length === 0) {
    throw new ApiError(404, "No comments found for this video");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments retrieved successfully"));
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { content } = req.body;
  const { videoId } = req.params;

  if (!content) {
    throw new ApiError(400, "Comment content is required");
  }
  const comment = await Comment.create({
    content,
    video: videoId,
    owner: req.user._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(200, comment, "Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { commentId } = req.params;
  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, "Comment content is required");
  }
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }
  const comment = await Comment.findOneAndUpdate(
    { _id: commentId, owner: req.user._id },
    { content: content.trim() },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment updated successfully"));
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const isOwner = comment.owner.toString() === req.user._id.toString();
  const isVideoOwner =
    comment.video.owner.toString() === req.user._id.toString();
  if (!isOwner && !isVideoOwner) {
    throw new ApiError(
      403,
      "You do not have permission to delete this comment"
    );
  }
  await Comment.deleteOne({ _id: new mongoose.Types.ObjectId(commentId) });
  return res
    .status(200)
    .json(new ApiResponse(200, null, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };

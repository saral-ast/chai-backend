import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, sortBy, sortType, userId } = req.query;
  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);

  const matchConditions = {};

  if (userId && isValidObjectId(userId)) {
    matchConditions.owner = new mongoose.Types.ObjectId(userId);
    const isOwner = req.user && userId === req.user._id.toString();
    if (!isOwner) {
      matchConditions.isPublished = true;
    }
  } else {
    matchConditions.isPublished = true;
  }

  const sortConditions = {};
  if (sortBy && sortType) {
    sortConditions[sortBy] = sortType === "asc" ? 1 : -1;
  } else {
    sortConditions.createdAt = -1;
  }

  const videosAggregation = [
    { $match: matchConditions },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [{ $project: { fullName: 1, username: 1, avatar: 1 } }],
      },
    },
    {
      $addFields: { owner: { $first: "$owner" } },
    },
    { $sort: sortConditions },
  ];

  const aggregate = Video.aggregate(videosAggregation);

  const video = await Video.aggregatePaginate(aggregate, {
    page: pageNumber,
    limit: limitNumber,
    customLabels: {
      totalDocs: "totalVideos",
      docs: "videos",
      limit: "limit",
      page: "currentPage",
      totalPages: "totalPages",
    },
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        page: pageNumber,
        limit: limitNumber,
        videos: video.videos,
      },
      "Videos fetched successfully"
    )
  );
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    throw new ApiError(400, "Title and description are required");
  }
  // TODO: get video, upload to cloudinary, create video
  const videoLocalPath = req.files.videoFile[0].path;
  const thumbnailLocalPath = req.files.thumbnail[0].path;
  if (!videoLocalPath || !thumbnailLocalPath) {
    throw new ApiError(400, "Video file and thumbnail are required");
  }

  const videoUrl = await uploadOnCloudinary(videoLocalPath);
  const thumbnailUrl = await uploadOnCloudinary(thumbnailLocalPath);

  console.log("Video URL:", videoUrl?.url);
  console.log("Thumbnail URL:", thumbnailUrl?.url);
  console.log("durattion", videoUrl?.duration.toFixed(2));

  if (!videoUrl || !thumbnailUrl) {
    throw new ApiError(400, "Error while uploading on cloudinary");
  }

  const video = await Video.create({
    videoFile: videoUrl?.url,
    thumbnail: thumbnailUrl?.url,
    title,
    duration: videoUrl?.duration.toFixed(2), // duration in seconds
    description,
    owner: req.user._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(200, video, "Video published successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
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
      $addFields: {
        owner: {
          $first: "$owner",
        },
      },
    },
  ]);

  if (!video || video.length === 0) {
    throw new ApiError(404, "Video not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }
  const { title, description } = req.body;
  if (req.files && req.files.thumbnail) {
    const thumbnailLocalPath = req.files.thumbnail[0].path;
    const thumbnailUrl = await uploadOnCloudinary(thumbnailLocalPath);
    if (!thumbnailUrl) {
      throw new ApiError(400, "Error while uploading thumbnail on cloudinary");
    }
    req.body.thumbnail = thumbnailUrl?.url;

    const video = await Video.findByIdAndUpdate(
      videoId,
      { title, description, thumbnail: req.body.thumbnail },
      { new: true }
    ).select("-owner");
  }

  const video = await Video.findByIdAndUpdate(
    videoId,
    { title, description },
    { new: true }
  ).select("-owner");

  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }
  const video = await Video.deleteOne({ _id: videoId });
  if (!video.deletedCount) {
    throw new ApiError(404, "Video not found");
  }
  // Optionally, you can also delete the video file from cloudinary if needed
  // await deleteFromCloudinary(video.videoFile);
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  video.isPublished = !video.isPublished;
  await video.save();
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video status toggled successfully"));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};

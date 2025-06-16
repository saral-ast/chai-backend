import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }
    const subscriberId = req.user._id;

    if( req.user._id.toString() === channelId) {
        throw new ApiError(400, "You cannot subscribe to your own channel");
    }
    const channel = await User.findById(channelId);
    if (!channel) {
        throw new ApiError(404, "Channel not found");
    }
    // check if subscription already exists
    const existingSubscription = await Subscription.findOne({
        subscriber: subscriberId,
        channel: channelId
    })
    if (existingSubscription) {
        // if subscription exists, delete it
        await Subscription.deleteOne({
            subscriber: subscriberId,
            channel: channelId
        })
        return res.status(200).json(
            new ApiResponse(200, "Subscription removed successfully")
        )
    }
    const subscription = await Subscription.create({
        subscriber: subscriberId,
        channel: channelId
    })


    return res.status(200).json(
        new ApiResponse(200, "Subscription toggled successfully", subscription)
    )
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    console.log(req.params);
    if (!isValidObjectId(channelId)) {
      throw new ApiError(400, "Invalid Channel ID");
    }
    const subscriberList = await Subscription.aggregate([
      {
        $match: {
          channel: new mongoose.Types.ObjectId(channelId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "subscriber",
          foreignField: "_id",
          as: "subscriber",
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
          subscriber: {
            $first: "$subscriber",
          },
        },
      },
    ]);
    if (subscriberList.length === 0) {
      return res
        .status(404)
        .json(new ApiError(404, "No subscribed channels found"));
    }
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          "Subscribed channels fetched successfully",
            subscriberList
        )
      );
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;
    console.log(req.params)
    if (!isValidObjectId(subscriberId)) {
      throw new ApiError(400, "Invalid subscriber ID");
    }
    const channelList = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId),
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel",
                pipeline: [
                    {
                        $project: {
                            fullName: 1,
                            username: 1,
                            avatar: 1,
                        }
                    },
                ],
            }
        },
        {
            $addFields: {
                channel: {
                    $first: "$channel"
                }
            }
        },

    ]);
    if (channelList.length === 0) {
        return res.status(404).json(
            new ApiError(404, "No subscribed channels found")
        )
    }
    return res.status(200).json(
        new ApiResponse(200, "Subscribed channels fetched successfully", channelList)
    )
    
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}
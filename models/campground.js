var mongoose = require("mongoose");

// SCHEMA SETUP
var campgroundSchema = new mongoose.Schema({
    name: String,
    image: String,
    imageId: String,
    image1: String,
    imageId1: String,
    image2: String,
    imageId2: String,
    image3: String,
    imageId3: String,
    description: String,
    price: Number,
    createdAt: { type: Date, default: Date.now },
    author: {
        id: {
           type: mongoose.Schema.Types.ObjectId,
           ref: "User"
        },
        username: String
    },
    comments: [
        {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment"
        }
    ]
});

module.exports = mongoose.model("Campground", campgroundSchema);

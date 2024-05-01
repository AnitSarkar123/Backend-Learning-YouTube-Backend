import mongoose, { Schema } from "mongoose";

const replySchema = new mongoose.Schema({
    replayContent: {
        type: String,
        required: true,
        trim: true,
    },
    parentCommentId: {
        type: Schema.Types.ObjectId,
        ref: "Comment"
    },
    ParentReply: {
        type: Schema.Types.ObjectId,
        ref: "Reply"

    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
},
    { timestamps: true }
);


export const Reply = mongoose.model("Reply", replySchema);

// Comment.findById(commentId).populate('replies').then(comment => {
//     // comment object will now have populated replies array
//     console.log(comment);
//   });
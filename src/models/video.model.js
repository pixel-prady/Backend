import mongoose ,{Schema, Types} from "mongoose"   
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"

const videoSchema = new Schema ({
    videoFile:{
        type: String, // cloudniary url ; 
        required:true,
    },
    thumbnail:{
        type: String, // cloudniary url ; 
        required:true,
    },
    title:{
        type: String, 
        required:true,
    },
    discription:{
        type: String, 
        required:true,
    },
    duration:{
        type: Number, // cloudinary url ;
        required:true,
    },
    views:{
        type: String, 
        default:0
    },
    isPublished:{
        type:Boolean,
        default:true
    },
    owner:{
        type: Schema.Types.ObjectId,
        ref :"User"
    }
},{timestamps:true})


videoSchema.plugin(mongooseAggregatePaginate)
const Video = mongoose.model("Video",videoSchema)
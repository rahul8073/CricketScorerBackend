const mongoose=require('mongoose')
const UserSchema=mongoose.Schema({
    userName:{
        type:String
    },
    userId:{
        type:String,
        required:true
    }
},{timestamps: true})
module.exports=mongoose.model('User',UserSchema);
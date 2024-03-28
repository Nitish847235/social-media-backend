const { ObjectId } = require('mongodb');
const User = require("../model/user");


   
  const create = async (req,res) => {
      try {
        let {userId, friendId} = req.body;

        if(!userId || !friendId){
            return res.badRequest({message : "Insufficient request parameters! userId and friendId is required"}) 
        }

        const user1 = await User.findOne({_id:userId,isDeleted: false});

        if(!user1){
            return res.recordNotFound();
        }
        if(user1.following.includes(friendId)){
            return res.badRequest({message : "You already follow"})
        }

        const user2 = await User.findOne({_id:friendId,isDeleted: false});

        if(!user2){
            return res.recordNotFound();
        }

        let data = {
            follow_by_user: false,
            follower_of_user: user1.followers.includes(friendId),
            request_by_user: false,
            blocked_user: false
        }

        if(user2?.requestes?.includes(userId)){
            return res.badRequest({message : "You have already send follow request"})
        }

        if(user2.isPrivate && !(user2?.requestes?.includes(userId))){
            let requestes = [];
            if(user2.requestes)
                requestes = [...user2.requestes];
            requestes.push(userId);
            const updatedUser2 = await User.findOneAndUpdate({_id:friendId},{requestes:requestes});
            data.request_by_user = true;
            return res.success({ data : data });
        }

        let followers = [];
        if(user2.followers)
            followers = [...user2.followers];
        followers.push(userId);
        await User.findOneAndUpdate({_id:friendId},{followers:followers});

        let following = [];
        if(user1.following)
        following = [...user1.following];
        following.push(friendId);
        await User.findOneAndUpdate({_id:userId},{following:following});

        data.follow_by_user = true;

        return res.success({ data : data });
        
      }
      catch (error){
        return res.internalServerError({ message:error.message });
      }
    };

  const reqAccept = async (req,res) => {
      try {
        let {userId, friendId} = req.body;

        if(!userId || !friendId){
            return res.badRequest({message : "Insufficient request parameters! userId and friendId is required"}) 
        }

        const user1 = await User.findOne({_id:userId,isDeleted: false});

        if(!user1){
            return res.recordNotFound();
        }
        if(user1.followers.includes(friendId)){
            return res.badRequest({message : "This user already your follower"})
        }

        const user2 = await User.findOne({_id:friendId,isDeleted: false});

        if(!user2){
            return res.recordNotFound();
        }

        let data = {
            follow_by_user: user1?.following?.includes(friendId),
            follower_of_user: false,
            request_by_user: user2?.requestes?.includes(userId),
            request_accept_user: false,
            blocked_user: false
        }


        if(!(user1?.requestes?.includes(friendId))){
            return res.badRequest({message : "user request for follow you was removed"})
        }

        let requestes = [];
            if(user1.requestes)
                requestes = [...user1.requestes];
        let index = user1.requestes.indexOf(friendId);
        requestes.splice(index,1);
          
        let followers = [];
        if(user1.followers)
            followers = [...user1.followers];
        followers.push(friendId);
        await User.findOneAndUpdate({_id:userId},{requestes:requestes,followers:followers});
        data.request_accept_user = true;

        let following = [];
        if(user2.following)
        following = [...user2.following];
        following.push(userId);
        await User.findOneAndUpdate({_id:friendId},{following:following});

        data.follower_of_user = true;

        return res.success({ data : data });
        
      }
      catch (error){
        return res.internalServerError({ message:error.message });
      }
    };

    // request of all user for follow
    // error here please solve this -------------------------------------------------------------------------------->
  const findAllRequest = async (req,res) => {
      try {
        let {userId} = req.body;

        if(!userId){
            return res.badRequest({message : "Insufficient request parameters! userId is required"}) 
        }

        let page = 1;
        let limit = 10;
        if(req.query.page && Number(req.query.page)>0)
          page = Number(req.query.page)
        if(req.query.limit && Number(req.query.limit)>0)
          limit = Number(req.query.limit)

        let user = await User.findById(userId);
        
        const requestedIds = user?.requestes?.slice((page - 1)*limit, (page - 1)*limit + limit);

        let ids = [];

        for(const id of requestedIds){
            ids.push({_id:id});
        }

        const results = await User.find({$or:ids}, {username:1,Bio:1,picture:1});

        

        // console.log(requestedIds);

        // const result  = await User.find()

        // const results = await User.aggregate([
        //     {
        //                   $lookup: {
        //                     from: "user", 
        //                     localField: requestedIds,
        //                     foreignField: "_id",
        //                     as: "requestUser"
        //                   }
        //                 },
        //                 {
        //                               $unwind: "$requestUser"
        //                             },
        //                             {
        //                               $project: {
        //                                 _id: 0,
        //                                 username: "$requestUser.username",
        //                                 Bio: "$requestUser.Bio",
        //                                 picture: "$requestUser.picture"
        //                               }
        //                             }
        // ]);
    

        // const results = await User.aggregate(
        //     [
        //         {
        //           $match: {
        //             _id: userId
        //           }
        //         },
        //         {
        //           $unwind: "$requestes"
        //         },
        //         {
        //           $lookup: {
        //             from: "user", 
        //             localField: "requestes.$oid",
        //             foreignField: "_id",
        //             as: "requestUser"
        //           }
        //         },
        //         {
        //           $unwind: "$requestUser"
        //         },
        //         {
        //           $project: {
        //             _id: 0,
        //             username: "$requestUser.username",
        //             picture: { $ifNull: ["$requestUser.picture", null] },
        //             Bio: { $ifNull: ["$requestUser.Bio", null] }
        //           }
        //         },
        //         {
        //           $group: {
        //             _id: null,
        //             result: { $push: "$$ROOT" },
        //             totalReqs: { $sum: 1 }
        //           }
        //         },
        //         {
        //           $project: {
        //             _id: 0,
        //             result: { $slice: ["$result", (page - 1) * limit, limit] },
        //             totalReqs: 1
        //           }
        //         }
        //       ]
        // )
        


        if(!results && results.length==0)
            return res.recordNotFound();

        let data = {
            results: results,
            totalDocs: user?.requestes?.length
        }

        return res.success({ data : data });
        
      }
      catch (error){
        return res.internalServerError({ message:error.message });
      }
    };

    // reject send following or remove following

  const destroy = async (req,res) => {
      try {
        let {userId, friendId} = req.body;

        if(!userId || !friendId){
            return res.badRequest({message : "Insufficient request parameters! userId and friendId is required"}) 
        }

        const user1 = await User.findOne({_id:userId,isDeleted: false});

        if(!user1){
            return res.recordNotFound();
        }

        const user2 = await User.findOne({_id:friendId,isDeleted: false});

        if(!user2){
            return res.recordNotFound();
        }

        let data = {
            follow_by_user: false,
            follower_of_user: user1.followers.includes(friendId),
            request_by_user: false,
            blocked_user: false
        }

        if(user2.requestes.includes(userId)){
            let requestes = [];
            if(user2.requestes)
                requestes = [...user2.requestes];
            let index = user2.requestes.indexOf(userId);
            requestes.splice(index,1);
            const updatedUser2 = await User.findOneAndUpdate({_id:friendId},{requestes:requestes});
            return res.success({ data : data });
        }
        
        let following = [];
        if(user1.following)
        following = [...user1.following];
        let index = user1.following.indexOf(friendId);
        following.splice(index,1);
        await User.findOneAndUpdate({_id:userId},{following:following});

        let followers = [];
        if(user2.followers)
            followers = [...user2.followers];
        let index2 = user2.followers.indexOf(userId);
        followers.splice(index2,1);
        await User.findOneAndUpdate({_id:friendId},{followers:followers});

        

        return res.success({ data :data });
      } catch (error){
        return res.internalServerError({ message:error.message });
      }
    };

// reject request follower or remove follower

  const reqRemoveFollower = async (req,res) => {
      try {
        let {userId, friendId} = req.body;

        if(!userId || !friendId){
            return res.badRequest({message : "Insufficient request parameters! userId and friendId is required"}) 
        }

        const user1 = await User.findOne({_id:userId,isDeleted: false});

        if(!user1){
            return res.recordNotFound();
        }

        const user2 = await User.findOne({_id:friendId,isDeleted: false});

        if(!user2){
            return res.recordNotFound();
        }

        let data = {
            follow_by_user: user1.following.includes(friendId),
            follower_of_user: user1.followers.includes(friendId),
            request_by_user: false,
            request_accept_user: false,
            blocked_user: false
        }

        if(user1.requestes.includes(friendId)){
            let requestes = [];
            if(user1.requestes)
                requestes = [...user1.requestes];
            let index = user1.requestes.indexOf(friendId);
            requestes.splice(index,1);
            await User.findOneAndUpdate({_id:userId},{requestes:requestes});
            return res.success({ data : data });
        }
        
        let following = [];
        if(user2.following)
        following = [...user2.following];
        let index = user2.following.indexOf(friendId);
        following.splice(index,1);
        await User.findOneAndUpdate({_id:friendId},{following:following});

        let followers = [];
        if(user1.followers)
            followers = [...user1.followers];
        let index2 = user1.followers.indexOf(userId);
        followers.splice(index2,1);
        await User.findOneAndUpdate({_id:userId},{followers:followers});
        data.follower_of_user = false;

        return res.success({ data :data });
      } catch (error){
        return res.internalServerError({ message:error.message });
      }
    };

  
//   const removeRequest = async (req,res) => {
//       try {
//         let {userId, friendId} = req.body;

//         if(!userId || !friendId){
//             return res.badRequest({message : "Insufficient request parameters! userId and friendId is required"}) 
//         }

//         const user2 = await User.findOne({_id:friendId,isDeleted: false});

//         if(!user2){
//             return res.recordNotFound();
//         }


//       } catch (error){
//         return res.internalServerError({ message:error.message }); 
//       }
//     };

//   const deleteData = async (req,res) => {
//     try { 
//       if (!req.params.id){
//         return res.badRequest({ message : 'Insufficient request parameters! id is required.' });
//       }
//       const query = { _id:req.params.id };
//       const deletedUser = await User.findOneAndDelete( query);
//       if (!deletedUser){
//         return res.recordNotFound();
//       }
//       return res.success({ data :deletedUser });
          
//     }
//     catch (error){
//       return res.internalServerError({ message:error.message });
//     }
//   };

  
  

module.exports = {
    create,
    reqAccept,
    findAllRequest,
  destroy,
  reqRemoveFollower
//   softDelete,
//   deleteData
}
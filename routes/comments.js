var express = require("express"),
    router = express.Router({mergeParams: true}),
    Campground  = require("../models/campground"),
    Comment = require("../models/comment"),
    middleware = require("../middleware");
    
    
//=============================
// Comments section
//=============================
router.get("/new",middleware.isLoggedIn, function(req, res) {
    Campground.findById(req.params.id, function(err, campground){
        if(err || !campground){
            req.flash("error", "Product not Found");
            return res.redirect("back");
        } else {
            //render show template with that campground
            res.render("comments/new", {campground: campground});
        }  
    })
})

router.post("/", middleware.isLoggedIn, function(req, res){
    //lookup campground using ID
    Campground.findById(req.params.id, function(err, campground) {
        if(err || !campground){
            req.flash("error", "Product id not found check your link");
            res.redirect("/");
        } else {
            Comment.create(req.body.comment, function(err, comment){
                if(err){
                    console.log(err);
                } else {
                    //add email and id to comment
                    comment.author.id = req.user._id;
                    comment.author.email = req.user.email;
                    //save comment
                    comment.save();
                    
                    campground.comments.push(comment);
                    campground.save();
                    res.redirect('/' + campground._id);
                }
            })
        }
    })
})

// COMMENT EDIT ROUTE
router.get("/:comment_id/edit", middleware.checkCommentOwnership, function(req, res){
    Campground.findById(req.params.id, function(err, foundCampground) {
        if(err || !foundCampground){
            req.flash("error", "cannot find that Product");
            return res.redirect("back");
        }
        Comment.findById(req.params.comment_id, function(err, foundComment){
            if(err || !foundCampground){
                req.flash("Comment not found");
                res.redirect("back");
            } else {
                res.render("comments/edit", {campground_id: req.params.id, comment: foundComment});
            }
        });
    });
});

// COMMENT UPDATE
router.put("/:comment_id", middleware.checkCommentOwnership, function(req, res){
   Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, updatedComment){
      if(err || !updatedComment){
          req.flash('error', "Comment not found");
          return res.redirect('back');
      } else {
          res.redirect("/" + req.params.id );
      }
   });
});

// COMMENT DESTROY ROUTE
router.delete("/:comment_id", middleware.checkCommentOwnership, function(req, res){
    //findByIdAndRemove
    Comment.findByIdAndRemove(req.params.comment_id, function(err){
       if(err){
           res.redirect("back");
       } else {
           req.flash("success", "Comment deleted")
           res.redirect("/" + req.params.id);
       }
    });
});
module.exports = router;
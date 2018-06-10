require("dotenv").config(); 

var passport = require("passport");
var User = require("../models/user");
var express = require("express");
var router  = express.Router();
var Campground = require("../models/campground");
var middleware = require("../middleware");
var request = require("request");
var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'twa-sa', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

//root route
router.get("/", function(req, res){
Campground.find({}, function(err, allCampgrounds){
       if(err){
           req.flash("error", err.message);
           return res.redirect("back");
       } else {
                res.render("campgrounds/index",{campgrounds:allCampgrounds, page: 'campgrounds'});
        }
    });
});

// show register form
router.get("/register", function(req, res){
   res.render("register", {page: 'register'});
});

//handle sign up logic
router.post("/register", function(req, res){
    var newUser = new User({username: req.body.username});
    User.register(newUser, req.body.password, function(err, user){
        if(err){
          req.flash("error", err.message);
          return res.redirect("/register");
        }
        passport.authenticate("local")(req, res, function(){
           req.flash("success", "Welcome to YelpCamp " + user.username);
           res.redirect("/"); 
        });
    });
});

//show login form
router.get("/login", function(req, res){
   res.render("login", {page: 'login'});
});

//handling login logic
router.post("/login", passport.authenticate("local", 
    {
        successRedirect: "/",
        failureRedirect: "/login"
    }), function(req, res){
});

// logout route
router.get("/logout", function(req, res){
   req.logout();
   req.flash("success", "Logged you out!");
   res.redirect("/");
});


//CREATE - add new campground to DB
router.post("/", middleware.isLoggedIn, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'image1', maxCount: 1 },{ name: 'image2', maxCount: 1 }, { name: 'image3', maxCount: 1 }]), function(req, res) {
    cloudinary.v2.uploader.upload(req.files['image'][0].path, function(err, result) {
      if(err) {
        req.flash('error', err.message);
        return res.redirect('back');
      }
      req.body.campground.image = result.secure_url;
      req.body.campground.imageId = result.public_id;
    
    cloudinary.v2.uploader.upload(req.files['image1'][0].path, function(err, result) {
      if(err) {
        req.flash('error', err.message);
        return res.redirect('back');
      }
      req.body.campground.image1 = result.secure_url;
      req.body.campground.imageId1 = result.public_id;
    
    cloudinary.v2.uploader.upload(req.files['image2'][0].path, function(err, result) {
      if(err) {
        req.flash('error', err.message);
        return res.redirect('back');
      }
      req.body.campground.image2 = result.secure_url;
      req.body.campground.imageId2 = result.public_id;
      
    cloudinary.v2.uploader.upload(req.files['image3'][0].path, function(err, result) {
      if(err) {
        req.flash('error', err.message);
        return res.redirect('back');
      }
      req.body.campground.image3 = result.secure_url;
      req.body.campground.imageId3 = result.public_id;
      
      // add author to campground
      req.body.campground.author = {
        id: req.user._id,
        username: req.user.username
      }
      Campground.create(req.body.campground, function(err, campground) {
        if (err) {
          req.flash('error', err.message);
          return res.redirect('back');
        }
        res.redirect('/' + campground.id);
      });
    })
    })
    })
});
});

//NEW - show form to create new campground
router.get("/new", middleware.isLoggedIn, function(req, res){
   res.render("new"); 
});

// SHOW - shows more info about one campground
router.get("/:id", function(req, res){
    //find the campground with provided ID
    Campground.findById(req.params.id).populate("comments").exec(function(err, foundCampground){
        if(err){
            console.log(err);
        } else {
            //render show template with that campground
            res.render("show", {campground: foundCampground});
        }
    });
});

router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req, res){
    //find the campground with provided ID
    Campground.findById(req.params.id, function(err, foundCampground){
        if(err){
            console.log(err);
        } else {
            //render show template with that campground
            res.render("edit", {campground: foundCampground});
        }
    });
});

router.put("/:id", upload.fields([{ name: 'image', maxCount: 1 }, { name: 'image1', maxCount: 1 },{ name: 'image2', maxCount: 1 }, { name: 'image3', maxCount: 1 }]), function(req, res){
    Campground.findById(req.params.id, async function(err, campground){
        if(err){
            req.flash("error", err.message);
            res.redirect("back");
        } else {
            if (req.files['image'][0]) {
              try {
                  await cloudinary.v2.uploader.destroy(campground.imageId);
                  var result = await cloudinary.v2.uploader.upload(req.files["image"][0].path);
                  campground.imageId = result.public_id;
                  campground.image = result.secure_url;
              } catch(err) {
                  req.flash("error", err.message);
                  return res.redirect("back");
              }
            }
            if(req.files["image1"][0]){
              try {
                  await cloudinary.v2.uploader.destroy(campground.imageId1);
                  var result1 = await cloudinary.v2.uploader.upload(req.files["image1"][0].path);
                  campground.imageId1 = result1.public_id;
                  campground.image1 = result1.secure_url;
              } catch(err) {
                  req.flash("error", err.message);
                  return res.redirect("back");
              }
            }
            if(req.files["image2"][0]){
              try {
                  await cloudinary.v2.uploader.destroy(campground.imageId2);
                  var result2 = await cloudinary.v2.uploader.upload(req.files["image2"][0].path);
                  campground.imageId2 = result2.public_id;
                  campground.image2 = result2.secure_url;
              } catch(err) {
                  req.flash("error", err.message);
                  return res.redirect("back");
              }
            }
            if(req.files["image3"][0]){
              try {
                  await cloudinary.v2.uploader.destroy(campground.imageId3);
                  var result3 = await cloudinary.v2.uploader.upload(req.files["image3"][0].path);
                  campground.imageId3 = result3.public_id;
                  campground.image3 = result3.secure_url;
              } catch(err) {
                  req.flash("error", err.message);
                  return res.redirect("back");
              }
            }
            campground.name = req.body.name;
            campground.description = req.body.description;
            campground.save();
            req.flash("success","Successfully Updated!");
            res.redirect("/" + campground._id);
        }
    });
});

router.delete('/:id', function(req, res) {
  Campground.findById(req.params.id, async function(err, campground) {
    if(err) {
      req.flash("error", err.message);
      return res.redirect("back");
    }
    try {
        console.log(campground.imageId);
        await cloudinary.v2.uploader.destroy(campground.imageId);
        console.log(campground.imageId1);
        await cloudinary.v2.uploader.destroy(campground.imageId1);
        console.log(campground.imageId2);
        await cloudinary.v2.uploader.destroy(campground.imageId2);
        console.log(campground.imageId3);
        await cloudinary.v2.uploader.destroy(campground.imageId3);
        campground.remove();
        req.flash('success', 'Campground deleted successfully!');
        res.redirect('/');
    } catch(err) {
        if(err) {
          req.flash("error", err.message);
          return res.redirect("back");
        }
    }
  });
});

module.exports = router;
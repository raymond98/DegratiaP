require("dotenv").config(); 

var passport = require("passport");
var csrf = require('csurf');
var User = require("../models/user");
var express = require("express");
var router  = express.Router();
var Campground = require("../models/campground");
var middleware = require("../middleware");
var request = require("request");
var multer = require('multer');
var Cart = require("../models/cart")
var async = require("async");
var nodemailer = require("nodemailer");
var crypto = require("crypto");

var csrfProtection = csrf();
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
router.get("/register",csrfProtection, function(req, res){
   res.render("register", {csrfToken: req.csrfToken(), page: 'register'});
});

//handle sign up logic
router.post("/register", function(req, res){
    var newUser = new User({email: req.body.email, username: req.body.username});
    if(req.body.adminCode === process.env.ADMINPASS) {
      newUser.isAdmin = true;
    }
    User.register(newUser, req.body.password, function(err, user){
        if(err){
          req.flash("error", err.message);
          return res.redirect("/register");
        }
        passport.authenticate("local")(req, res, function(){
           req.flash("success", "Welcome to DegratiaP online store " + user.email);
           res.redirect("/"); 
        });
    });
});

//show login form
router.get("/login",csrfProtection, function(req, res){
   res.render("login", {page: 'login',csrfToken: req.csrfToken()});
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
   req.flash("success", "See you later!");
   res.redirect("/");
});

// forgot password
router.get('/forgot', function(req, res) {
  res.render('forgot');
});

router.post('/forgot', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'degratiap@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'degratiap@gmail.com',
        subject: 'DegratiaP Store User Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});

router.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (err || !user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', {token: req.params.token});
  });
});

router.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (err || !user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }
        if(req.body.password === req.body.confirm) {
          user.setPassword(req.body.password, function(err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
          })
        } else {
            req.flash("error", "Passwords do not match.");
            return res.redirect('back');
        }
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'degratiap@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'degratiap@mail.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/');
  });
});

//About Us
router.get("/about", function(req, res){
   res.render("about"); 
});


//CREATE - add new Product to DB
router.post("/", middleware.isLoggedIn, middleware.isAdmin, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'image1', maxCount: 1 },{ name: 'image2', maxCount: 1 }, { name: 'image3', maxCount: 1 }]), function(req, res) {
    
    cloudinary.v2.uploader.upload(req.files['image'][0].path, function(err, result) {
      if(err && req.files['image'][0].path) {
        req.flash('error', 'Please upload all the pictures required');
        return res.redirect('back');
      }
      if(req.files['image']){
      req.body.campground.image = result.secure_url;
      req.body.campground.imageId = result.public_id;
      }
    
    cloudinary.v2.uploader.upload(req.files['image1'][0].path, function(err, result) {
      if(err && req.files['image1'][0].path) {
        req.flash('error', 'Please upload all the pictures required');
        return res.redirect('back');
      }
      if(req.files['image1']){
      req.body.campground.image1 = result.secure_url;
      req.body.campground.imageId1 = result.public_id;
      }
    
    cloudinary.v2.uploader.upload(req.files['image2'][0].path, function(err, result) {
      if(err && req.files['image2'][0].path) {
        req.flash('error', 'Please upload all the pictures required');
        return res.redirect('back');
      }
      if(req.files['image2']){
      req.body.campground.image2 = result.secure_url;
      req.body.campground.imageId2 = result.public_id;
      }
      
    cloudinary.v2.uploader.upload(req.files['image3'][0].path, function(err, result) {
      if(err && req.files['image3'][0].path) {
        req.flash('error', 'Please upload all the pictures required');
        return res.redirect('back');
      }
      if(req.files['image3']){
      req.body.campground.image3 = result.secure_url;
      req.body.campground.imageId3 = result.public_id;
      }
      
      // add author to campground
      req.body.campground.author = {
        id: req.user._id,
        email: req.user.email
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
router.get("/new", middleware.isLoggedIn,middleware.isAdmin, function(req, res){
   res.render("new"); 
});

//ADD the product to the store
router.get("/addToCart/:id", function(req, res){
  var productId = req.params.id;
  var cart = new Cart(req.session.cart ? req.session.cart : {});

  Campground.findById(productId, function(err, product) {
      if (err) {
        return res.redirect('/');
      }
      cart.add(product, product.id);
      req.session.cart = cart;
      res.redirect("/");
    });
});

router.get('/reduce/:id', function(req, res, next) {
    var productId = req.params.id;
    var cart = new Cart(req.session.cart ? req.session.cart : {});

    cart.reduceByOne(productId);
    req.session.cart = cart;
    res.redirect('/cart');
});

router.get('/remove/:id', function(req, res, next) {
    var productId = req.params.id;
    var cart = new Cart(req.session.cart ? req.session.cart : {});

    cart.removeItem(productId);
    req.session.cart = cart;
    res.redirect('/cart');
});

router.get('/shopping', function(req, res, next) {
   if (!req.session.cart) {
       return res.render('ecommerce/cart', {products: null});
   } 
    var cart = new Cart(req.session.cart);
    console.log(cart.generateArray());
    res.render('ecommerce/cart', {products: cart.generateArray(), totalPrice: cart.totalPrice});
});

router.get('/checkout', middleware.isLoggedIn, function(req, res, next) {
    if (!req.session.cart) {
        return res.redirect('/cart');
    }
    var cart = new Cart(req.session.cart);
    var errMsg = req.flash('error')[0];
    res.render('ecommerce/checkout', {products: cart.generateArray(), total: cart.totalPrice, errMsg: errMsg, noError: !errMsg});
});

router.get('/success', function(req, res, next) {
   if (!req.session.cart) {
       return res.render('ecommerce/cart', {products: null});
   } 
    var cart = new Cart(req.session.cart);
    res.render('ecommerce/success', {products: cart});
});

router.get('/cancel', function(req, res, next) {
   if (!req.session.cart) {
       return res.render('ecommerce/cart', {products: null});
   } 
    res.render('ecommerce/cancel');
});

router.get('/notify', function(req, res, next) {
   if (!req.session.cart) {
       return res.render('ecommerce/cart', {products: null});
   } 
    res.render('ecommerce/notify');
});

// SHOW - shows more info about one campground
router.get("/:id", function(req, res){
    //find the campground with provided ID
    Campground.findById(req.params.id).populate("comments").exec(function(err, foundCampground){
        if(err || !foundCampground){
          return res.redirect('back');
        } else {
            //render show template with that campground
            res.render("show", {campground: foundCampground});
        }
    });
});

router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req, res){
    //find the campground with provided ID
    Campground.findById(req.params.id, function(err, foundCampground){
        if(err || !foundCampground){
            req.flash('error', "Product id not found check your link");
            return res.redirect('back');
        } else {
            //render show template with that campground
            res.render("edit", {campground: foundCampground});
        }
    });
});

router.put("/:id", upload.fields([{ name: 'image', maxCount: 1 }, { name: 'image1', maxCount: 1 },{ name: 'image2', maxCount: 1 }, { name: 'image3', maxCount: 1 }]), function(req, res){
    Campground.findById(req.params.id, async function(err, campground){
        if(err || !campground){
            req.flash("error", "Product id not found check your link");
            res.redirect("back");
        } else {
            if (req.files['image']) {
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
            if(req.files["image1"]){
              try {
                  await cloudinary.v2.uploader.destroy(campground.imageId1);
                  var result1 = await cloudinary.v2.uploader.upload(req.files["image1"][0].path);
                  campground.imageId1 = result1.public_id;
                  campground.image1 = result1.secure_url;
              }  catch(err) {
                  req.flash("error", err.message);
                  return res.redirect("back");
              }
            }
            if(req.files["image2"]){
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
            if(req.files["image3"]){
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
            campground.price = req.body.price;
            campground.save();
            req.flash("success","Successfully Updated!");
            res.redirect("/" + campground._id);
        }
    });
});

router.delete("/:id", function(req, res) {
  Campground.findById(req.params.id, async function(err, campground) {
    if(err || !campground) {
      req.flash("error", "Product you are trying to delete is not found");
      return res.redirect("back");
    }
    try {
        await cloudinary.v2.uploader.destroy(campground.imageId);
        await cloudinary.v2.uploader.destroy(campground.imageId1);
        await cloudinary.v2.uploader.destroy(campground.imageId2);
        await cloudinary.v2.uploader.destroy(campground.imageId3);
        campground.remove();
        req.flash('success', 'Product deleted successfully!');
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
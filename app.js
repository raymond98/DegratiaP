require("dotenv").config(); 

var express               = require("express"),
    app                   = express(),
    bodyParser            = require("body-parser"),
    mongoose              = require("mongoose"),
    flash                 = require("connect-flash"),
    Campground            = require("./models/campground"),
    Comment               = require("./models/comment"),
    passport              = require("passport"),
    LocalStrategy         = require("passport-local"),
    passportLocalMongoose = require("passport-local-mongoose"),
    User                  = require("./models/user"),
    seedDB                = require("./seeds"),
    methodOverride        = require("method-override");
    
//requring routes
var commentRoutes    = require("./routes/comments"),
    campgroundRoutes = require("./routes/campgrounds");

app.use(bodyParser.urlencoded({extended: true})); //tell express to use bodyParser
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.locals.moment = require("moment");

mongoose.connect(process.env.DATABASEURL);

app.use(methodOverride("_method"));
app.use(flash());

//Passport configuration
app.use(require("express-session")({
    secret: "Rusty is the best and cutest dog in the world",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

//Methods that comes with the passport-local-mongoose
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//passing current usser information to all routes
app.use(function(req, res, next){
   res.locals.currentUser = req.user;
   res.locals.error = req.flash("error");
   res.locals.success = req.flash("success");
   next();
});

app.use("/", campgroundRoutes);
app.use("/:id/comments", commentRoutes);

app.listen(process.env.PORT, process.env.IP, function(){
    console.log("DegratiaP Server is running");
})
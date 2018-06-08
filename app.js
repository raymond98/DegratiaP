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
    
require("dotenv").config();    
//requring routes
var commentRoutes    = require("./routes/comments"),
    campgroundRoutes = require("./routes/campgrounds"),
    indexRoutes      = require("./routes/index")

app.use(bodyParser.urlencoded({extended: true})); //tell express to use bodyParser
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));

mongoose.connect(process.env.DATABASEURL);

//these must be hidden
 //mongoose.connect("mongodb://localhost/yelp_camp");
//mongoose.connect("mongodb://ray:Kea1469P@ds247290.mlab.com:47290/matlapane");

app.use(methodOverride("_method"));
app.use(flash());
//seedDB();

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

app.use("/", indexRoutes);
app.use("/campgrounds", campgroundRoutes);
app.use("/campgrounds/:id/comments", commentRoutes);

app.listen(process.env.PORT, process.env.IP, function(){
    console.log("YelpCamp Server is running");
})
var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook');
var TwitterStrategy = require('passport-twitter');
var routes = require('./routes/index');
var auth = require('./routes/auth');
var models = require('./models/models');
var User = models.User;
var crypto = require("crypto");
var hashPassword = models.hashPassword;

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var session = require("express-session");
var MongoStore = require('connect-mongo')(session);
app.use(session({
  secret: "wonder woman",
  store: new MongoStore({mongooseConnection: require('mongoose').connection}),
  proxy: true,
  resave: true,
  saveUninitialized: true,
  cookie: {maxAge: 60*60*1000}
}));

passport.serializeUser(function(user, done) {
  done(null, user._id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new LocalStrategy(function(username, password, done) {
  User.findOne({username: username}, function(err, user) {
    if (err) {
      console.log(err);
      return done(err);
    }

    if (!user) {
      return done(null, false)
    }

    if (user.password !== hashPassword(password)) {
      return done(null, false)
    }

    return done(null, user)
  })
}))

passport.use(new FacebookStrategy({
    clientID: process.env.FB_CLIENT_ID,
    clientSecret: process.env.FB_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/callback",
    profileFields: ['id', 'displayName', 'photos']
  }, function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({facebookID: profile.id}, {
      username: profile.displayName,
      phone: process.env.MY_TWILIO_NUMBER.slice(2),
      facebookID: profile.id,
      pictureURL: profile.photos[0].value
    }, function (err, user) {
        return cb(err, user);
      }
    );
  }
))

passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    callbackURL: "http://localhost:3000/auth/twitter/callback"
  }, function(token, tokenSecret, profile, cb) {
    User.findOrCreate({twitterID: profile.id}, {
      username: profile.displayName,
      phone: process.env.MY_TWILIO_NUMBER.slice(2),
      twitterID: profile.id,
      pictureURL: profile.photos[0].value,
      twitterToken: token,
      twitterTokenSecret: tokenSecret
    }, function(err, user) {
      return cb(err, user)
    })
  }
))

app.use(passport.initialize());
app.use(passport.session());

app.use('/', auth(passport));
app.use('/', routes);

//catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;

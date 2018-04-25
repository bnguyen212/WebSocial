var express = require('express');
var router = express.Router();
var models = require('../models/models');
var User = models.User;
var hashPassword = models.hashPassword;

module.exports = function(passport) {

  router.get('/signup', function(req, res) {
    res.render('signup')
  })

  router.post('/signup', function(req, res) {
    if (!req.body.username) {
      res.render('signup', {
        form: req.body,
        error: "Username is empty."
      })
    } else if (req.body.phone.length !== 10 || !(/^[0-9]+$/.test(req.body.phone))) {
      res.render('signup', {
        form: req.body,
        error: "Phone number must be 10 digits.",
      })
    } else if (!req.body.password) {
      res.render('signup', {
        form: req.body,
        error: "Password cannot be blank."
      })
    } else if (req.body.password.length < 5) {
      res.render('signup', {
        form: req.body,
        error: "Password is too short. Must be at least 5 characters long."
      })
    } else if (req.body.password !== req.body.repeatPassword) {
      res.render('signup', {
        form: req.body,
        error: "Passwords do not match."
      })
    } else {
      User.findOne({username: req.body.username}, function(err, user) {
        if (err) {
          res.render('signup', {
            form: req.body,
            error: err
          })
        } else if (!user) {
          var newUser = new User({
            username: req.body.username,
            password: hashPassword(req.body.password),
            phone: req.body.phone
          })

          newUser.save(function(err) {
            if (err) {
              res.render('signup', {
                form: req.body,
                error: err,
              })
            } else {
              res.redirect("/login");
            }
          })
        } else {
          res.render('signup', {
            form: req.body,
            error: "Username already exist."
          })
        }
      })
    }
  })

  router.get("/login", function(req, res) {
    res.render("login")
  })

  router.post("/login", passport.authenticate('local', {successRedirect: "/contacts", failureRedirect: "/login"}))

  router.get('/auth/facebook', passport.authenticate('facebook'));

  router.get('/auth/facebook/callback',
    passport.authenticate('facebook', {successRedirect: "/", failureRedirect: '/login'}));

  router.get('/auth/twitter', passport.authenticate('twitter'));

  router.get('/auth/twitter/callback', 
    passport.authenticate('twitter', {successRedirect: "/", failureRedirect: '/login' }));

  router.get("/logout", function(req, res) {
    req.logout();
    res.redirect("/login")
  })

  return router;
}

var express = require('express');
var router = express.Router();
var models = require('../models/models');
var Contact = models.Contact;
var Message = models.Message;
var User = models.User;
var Twitter = require('twitter');
var client = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// receive incoming messages from Twilio
router.post("/messages/receive", function(req, res, next) {
  User.findOne({phone: req.body.To.substring(2)}, function(err, user) {
    if (err || !user) {
      console.log(err || `No user associated with ${req.body.To}!`);
      res.end();
    } else {
      Contact.findOne({owner: user._id, phone: req.body.From.substring(2)}, function(err, contact) {
        if (err || !contact) {
          console.log(err || `No contact information associated with ${req.body.From}!`);
          res.end();
        } else {
          var newMessage = new Message({
            created: new Date(),
            content: req.body.Body,
            user: user._id,
            contact: contact._id,
            channel: 'SMS',
            status: 'received',
            from: req.body.From
          })
          newMessage.save(function(err) {
            if (err) {
              console.log(err);
              res.end();
            } else {
              res.send('Got it!');
            }
          })
        }
      }) 
    }
  })
})

/* GET home page. */
router.use(function(req, res, next){
  if (!req.user) {
    res.redirect('/login');
  } else {
    return next();
  }
});

router.get('/', function(req, res, next) {
  res.redirect("/contacts")
})

// view all contacts
router.get('/contacts', function(req, res) {
  Contact.find({owner: req.user._id}, function(err, contacts) {
    if (err) {
      return res.send(err)
    }
    res.render('contacts', {user: req.user, contacts: contacts})
  })
})

// render view to add new contact
router.get('/contacts/new', function(req, res) {
  res.render('newContact')
})

// render view to edit current contact
router.get('/contacts/:id', function(req, res) {
  Contact.findById(req.params.id, function(err, contact) {
    if (err) {
      return res.render("newContact", {error: err})
    } else if (!contact) {
      return res.render("newContact", {error: "Contact ID invalid"})
    } else {
      res.render('editContact', {form: contact, id: req.params.id})
    }
  })
})

// create new contact
router.post('/contacts/new', function(req, res) {
  if (!req.body.name) {
    res.render('newContact', {
      form: req.body,
      error: "Name is empty."
    })
  } else if (!req.body.phone) {
    res.render('newContact', {
      form: req.body,
      error: "Phone number is empty."
    })
  } else if (req.body.phone.length !== 10 || !(/^[0-9]+$/.test(req.body.phone))) {
    res.render('newContact', {
      form: req.body,
      error: "Phone number must be 10 digits."
    })
  } else {
    Contact.findOne({name: req.body.name, owner: req.user._id}, function(err, contact) {
      if (err) {
        res.render('newContact', {
          form: req.body,
          error: err
        })
      } else if (!contact) {
        var newContact = new Contact({
          name: req.body.name,
          phone: req.body.phone,
          owner: req.user._id
        })
        newContact.save(function(err) {
          if (err) {
            return res.render('newContact', {
              form: req.body,
              error: err,
            })
          } else {
            res.redirect("/contacts");
          }
        })
      } else {
        res.render('newContact', {
          form: req.body,
          error: "Contact name already exist."
        })
      }
    })
  }
})

// update contact info
router.post("/contacts/:id", function(req, res) {
  if (!req.body.name) {
    res.render('editContact', {
      form: req.body,
      error: "Name is empty.",
      id: req.params.id,
    })
  } else if (!req.body.phone) {
    res.render('editContact', {
      form: req.body,
      error: "Phone number is empty.",
      id: req.params.id,
    })
  } else if (req.body.phone.length !== 10 || !(/^[0-9]+$/.test(req.body.phone))) {
    res.render('editContact', {
      form: req.body,
      error: "Phone number must be 10 digits.",
      id: req.params.id,
    })
  } else {
    Contact.findOne({name: req.body.name, owner: req.user._id}, function(err, contact) {
      if (err) {
        res.render('editContact', {
          form: req.body,
          error: err,
          id: req.params.id
        })
      } else if (contact._id === req.params.id || !contact) {
        Contact.findByIdAndUpdate(req.params.id, {name: req.body.name, phone: req.body.phone}, function(err) {
          if (err) {
            res.render("editContact", {
              form: req.body,
              error: err,
              id: req.params.id,
            })
          } else {
            res.redirect("/contacts")
          }
        })
      } else {
        res.render('editContact', {
          form: req.body,
          error: "Contact name already exist.",
          id: req.params.id
        })
      }
    })
  }
})

// get all messages
router.get("/messages", function(req, res) {
  Message.find({user: req.user._id}).populate('contact').exec(function(err, messages) {
    if (err) {
      res.render("messages", {error: err})
    } else {
      res.render('messages', {messages: messages})
    }
  })
})

// view messages sent to a specific contact
router.get("/messages/:contactId", function(req, res) {
  Message.find({user: req.user._id, contact: req.params.contactId}).populate('contact').exec(function(err, messages) {
    if (err) {
      res.render("messages", {error: err})
    } else {
      res.render('messages', {messages: messages})
    }
  })
})

// render view to send messages to a specific contact
router.get("/messages/send/:contactId", function(req, res) {
  Contact.findById(req.params.contactId, function(err, contact) {
    if (err) {
      res.render('newMessage', {error: err, contactId: req.params.contactId})
    } else if (!contact) {
      res.render('newMessage', {error: "Invalid contactId.", contactId: req.params.contactId})
    } else {
      res.render('newMessage', {contactId: contact._id, contact: contact})
    }
  })
})

// send message to a specific contact
router.post("/messages/send/:contactId", function(req, res) {
  if (req.body.content) {
    Contact.findById(req.params.contactId, function(err, contact) {
      if (err) {
        res.render('newMessage', {error: err, form: req.body, contactId: req.params.contactId})
      } else if (!contact) {
        res.render('newMessage', {error: "Invalid contactId.", form: req.body, contactId: req.params.contactId})
      } else {
        var data = {
          body: req.body.content,
          to: '+1' + contact.phone,
          from: '+1' + req.user.phone
        }
        client.messages.create(data, function(err, msg) {
          if (err) {
            res.render('newMessage', {error: err, form: req.body, contactId: req.params.contactId})
          } else {
            var newMessage = new Message({
              created: new Date(),
              content: req.body.content,
              user: req.user._id,
              contact: contact._id,
              channel: "SMS",
              status: 'sent',
            })
            newMessage.save(function(err) {
              if (err) {
                res.render('newMessage', {error: "Message sent but failed to save on Mlab", form: req.body, contactId: req.params.contactId})
              } else {
                res.redirect("/messages")
              }
            })
          }
        })
      }
    })
  } else {
    res.render('newMessage', {error: "Did you forget to write something?", contactId: req.params.contactId})
  }
})

// import twitter followers as contacts
router.get("/twitter/import", function(req, res) {
  var clientTwitter = new Twitter({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: req.user.twitterToken,
    access_token_secret: req.user.twitterTokenSecret
  });
  clientTwitter.get('followers/list.json?count=200', function(err, followers) {
    if (followers) {
      User.findOneAndUpdate({twitterID: req.user.twitterID}, {followers: followers}, function (err) {
        res.redirect("/contacts")
      })
    }
  })
})

// get all twitter messages
router.get("/twitter/messages", function(req, res) {
  var clientTwitter = new Twitter({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: req.user.twitterToken,
    access_token_secret: req.user.twitterTokenSecret
  });
  clientTwitter.get('/direct_messages', function(err, messages) {
    clientTwitter.get('/direct_messages/sent', function(err, messagesSent) {
      var allMsg = messages.concat(messagesSent);
      console.log(allMsg);
      allMsg.sort(function(a, b) {
        return new Date(a.created_at) - new Date(b.created_at)
      });
      res.render("twitterMessages", {allMsg: allMsg})
    })
  })
})

// render view to send message to twitter followers
router.get("/twitter/messages/send/:id", function(req, res) {
  var index = req.user.followers.users.find(function(element) {return element.id_str === req.params.id})
  res.render('newTwitterMessage', {user: index})
})

// send message to a specific twitter follower
router.post("/twitter/messages/send/:id", function(req, res) {
  var index = req.user.followers.users.find(function(element) {return element.id_str === req.params.id})
  if (req.body.content) {
    var clientTwitter = new Twitter({
      consumer_key: process.env.TWITTER_CONSUMER_KEY,
      consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
      access_token_key: req.user.twitterToken,
      access_token_secret: req.user.twitterTokenSecret,
    });
    clientTwitter.post('/direct_messages/new', {screen_name: index.screen_name, text: req.body.content}, function(err, msg) {
      if (err) {
        console.log(err);
        res.render('newTwitterMessage', {error: err, user: index, form: req.body})
      } else {
        res.redirect('/twitter/messages')
      }
    })

  } else {
    res.render('newTwitterMessage', {user: index, form: req.body, error: "Did you forget to write a message?"})
  }
})

module.exports = router;

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const layouts = require("express-ejs-layouts");
const axios = require('axios');
const auth = require('./routes/auth');
const session = require("express-session"); 
const MongoDBStore = require('connect-mongodb-session')(session);

const mongoose = require( 'mongoose' );
//const mongodb_URI = 'mongodb://localhost:27017/cs103a_todo'
const mongodb_URI = 'mongodb+srv://cs_sj:BrandeisSpr22@cluster0.kgugl.mongodb.net/RichardZhu?retryWrites=true&w=majority'

mongoose.connect( mongodb_URI, { useNewUrlParser: true, useUnifiedTopology: true } );
// fix deprecation warnings
//mongoose.set('useFindAndModify', false); 
//mongoose.set('useCreateIndex', true);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {console.log("we are connected!!!")});

// middleware to test is the user is logged in, and if not, send them to the login page
const isLoggedIn = (req,res,next) => {
  if (res.locals.loggedIn) {
    next()
  }
  else res.redirect('/login')
}

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

var store = new MongoDBStore({
  uri: mongodb_URI,
  collection: 'mySessions'
});

// Catch errors
store.on('error', function(error) {
  console.log(error);
});

app.use(require('express-session')({
  secret: 'This is a secret 7f89a789789as789f73j2krklfdslu89fdsjklfds',
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  },
  store: store,
  // Boilerplate options, see:
  // * https://www.npmjs.com/package/express-session#resave
  // * https://www.npmjs.com/package/express-session#saveuninitialized
  resave: true,
  saveUninitialized: true
}));


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(layouts);

app.use(layouts)
app.use(auth)
app.use('/', indexRouter);
app.use('/users', usersRouter);


app.get('/signup',(req,res,next) => {
  res.render('signup')
})

app.get('/stats',(req,res,next) => {
  isLoggedIn,
  res.render('stats')
})

app.get('/uploadvideo',(req,res,next) => {
  res.render('uploadvideo')
})

app.post('/stats',
isLoggedIn,
  async (req,res,next) => {
    try {
    const uid = req.body.uid;
    const url="https://api.bilibili.com/x/space/arc/search?mid=" + uid + "&ps=30&tid=0&pn=1&keyword=&order=pubdate&jsonp=jsonp"
    const response = await axios.get(url)
    console.dir(response.data)
    const data = response.data.data.list.vlist
    res.locals.uid = uid
    res.locals.data = data
    res.render('showstats')
    //res.json(response.data.data.list.vlist)
  }catch(e){
    next(e);
   }
  })


const CommentItem = require('./models/Comment');

app.post('/video1',
  isLoggedIn,
  async (req,res,next) => {
    try {
      const desc = req.body.desc;
      const username = req.body.username;
      const commentObj = {
        userId:res.locals.user._id.username,
        username: String,
        descr:desc,
        createdAt: new Date(),
      }
      const commentItem = new CommentItem(commentObj); // create ORM object for item
      await commentItem.save();  // stores it in the database
      res.redirect('/video1');
    }catch(err){
      next(err);
    }
  }
)

app.get('/video1',
        isLoggedIn,
  async (req,res,next) => {
   try {
    console.log("In video1");
    const commentitems = await CommentItem.find();
    console.log(commentitems);
    res.locals.commentitems = commentitems || []
    res.render('video1')
   }catch(e){
    next(e);
   }
  }
)

app.get('/deleteCommentItem/:itemId',
    isLoggedIn,
    async (req,res,next) => {
      try {
        const itemId = req.params.itemId;
        await CommentItem.deleteOne({_id:itemId});
        res.redirect('/video1');
      } catch(e){
        next(e);
      }
    }
)


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});



// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

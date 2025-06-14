const express        = require('express');
const cors           = require('cors');
const passport       = require('passport');
const session        = require('express-session');
const GithubStrategy = require('passport-github2');
const bodyParser     = require('body-parser');
const mongodb = require('./db/conn')

require('./loadEnv');

const routes        = require('./routes/index');
const swaggerRoutes = require('./routes/swagger.js');

const PORT = process.env.PORT || 8080;
const app  = express();

app.set('trust proxy', true); // NOTE: for Swagger dynamic proto

app.use(bodyParser.json());

app.use(session({
  secret:            "secret",
  resave:            false,
  saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new GithubStrategy({
  clientID:     process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL:  process.env.GITHUB_OAUTH_CALLBACK_URL,
}, (_accessToken, _refreshToken, profile, done) => {
  return done(null, profile);
}));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api-docs', swaggerRoutes);
app.use('/', routes);

app.get('/github/callback', passport.authenticate('github', { failureRedirect: '/api-docs' }), (req, res) => {
  req.session.user = req.user;
  res.redirect('/');
});

app.get('/login', passport.authenticate('github'), (_req, _res) => {});

app.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect('/');
  });
});

app.get('/', (req, res) => {
  res.send(req.session.user !== undefined
    ? `Logged in as ${req.session.user.username}`
    : "Logged out"
  );
});

// Global error handling
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).send({ error: "Uh oh! An unexpected error occurred." });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});

// init mongodb
mongodb.initDb((err) => {
  if (err) {
      console.log(err);
  } else {
      app.listen(PORT, () => {console.log(`DB is listening and node running on port ${PORT}`)});
  }
});
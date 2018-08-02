const path = require('path');
const express = require('express');
const compression = require('compression');
const app = express();

const publicDir = path.join(__dirname, 'dist');

app.use(compression());
app.use(express.static(publicDir, { maxAge: '1y' }));

const listener = app.listen(process.env.PORT || 8000, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});

# express-cache-gm-image
Express middleware to resize and crop pictures from url parameters with gm, cache and express.static.

# Example
http://127.0.0.1:3000/images/example.png?w=50&h=100&r=1&c=2&f=1&y=20

```javascript
import express from 'express'

import ImageMiddleware from 'express-cache-gm-image'

const staticOptions = { // one settings for many static instances
  redirect: false,
  dotfiles: 'ignore',
  maxAge: 86400000
}

const app = express()

app.get('/*', ImageMiddleware({
  root: './public',
  cacheDir: './cache/imager',
  staticOptions: staticOptions,
  nextFunction: function (req, res) {
    return res.status(404).send('Not Found')
  }
}))

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})
```

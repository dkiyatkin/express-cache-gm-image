const fs = require('fs')
const p = require('path')

const express = require('express')
const mkdirp = require('mkdirp')
const gm = require('gm')
const mime = require('mime')

function updateImage (origFsPath, cacheFsPath, query, cb) {
  query = {
    w: parseInt(query.w) || 0,
    h: parseInt(query.h) || 0,
    c: parseInt(query.c) || 0,
    f: parseInt(query.f) || 0,
    x: parseInt(query.x) || 0,
    y: parseInt(query.y) || 0,
    r: parseInt(query.r) || 0,
  }
  if (query.f) query.f = '!'
  if ((query.r && !query.c) || (!query.c && !query.r)) { // resize default
    gm(origFsPath)
      .resize(query.w, query.h, query.f)
      .noProfile()
      .write(cacheFsPath, cb)
  } else if (query.r && query.c) { // resize and crop
    gm(origFsPath)
      .resize(query.w, query.h, query.f)
      .crop(query.w, query.h, query.x, query.y)
      .noProfile()
      .write(cacheFsPath, cb)
  } else if (!query.r && query.c) { // crop only
    gm(origFsPath)
      .crop(query.w, query.h, query.x, query.y)
      .noProfile()
      .write(cacheFsPath, cb)
  } else {
    cb(new Error('Wrong params for updateImage'))
  }
}

function ImagerMiddleware ({root, cacheDir, staticOptions, nextFunction}) {
  const expressStatic = express.static(cacheDir, staticOptions)

  return function (req, res, next) {
    const newNextFunction = nextFunction ? nextFunction.bind(null, req, res) : next
    if (!Object.keys(req.query).length) return next()
    if (!(req.query.w || req.query.h)) return next()
    const origUrlPath = req.params[0]
    if (mime.getType(origUrlPath).split('/')[0] !== 'image') return next() // должно быть изображение
    const basename = p.basename(origUrlPath)
    const origFsPath = p.join(root, origUrlPath)
    const cachePathFromOrigUrlPath = p.dirname(origUrlPath)
    const queryindex = req.originalUrl.indexOf('?')
    const queryname = req.originalUrl.slice(queryindex + 1)
    const cacheDirToFile = p.join(cacheDir, queryname, cachePathFromOrigUrlPath)
    mkdirp(cacheDirToFile, function (err) {
      if (err) return next(err)
      const cacheUrlPath = p.join(queryname, cachePathFromOrigUrlPath, basename)
      const cacheFsPath = p.join(cacheDir, cacheUrlPath)

      fs.stat(origFsPath, function (err, origStats) {
        if (err) return newNextFunction() // файл не найден 404
        fs.stat(cacheFsPath, function (err, cacheStats) {
          if (err || origStats.mtime.getTime() > cacheStats.mtime.getTime()) {
            updateImage(origFsPath, cacheFsPath, Object.assign({}, req.query), function (err) {
              if (err) return next(err)
              req.url = cacheUrlPath
              expressStatic(req, res, newNextFunction)
            })
          } else {
            req.url = cacheUrlPath
            expressStatic(req, res, newNextFunction)
          }
        })
      })
    })
  }
}

module.exports = ImagerMiddleware

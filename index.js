const fs = require('fs')
const p = require('path')

const express = require('express')
const mkdirp = require('mkdirp')
const gm = require('gm')
const mime = require('mime')

function updateImage (origFsPath, cacheFsPath, query, cb) {
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
    if (mime.lookup(origUrlPath).split('/')[0] !== 'image') return next() // должно быть изображение
    const extname = p.extname(origUrlPath)
    const origFsPath = p.join(root, origUrlPath)

    const cachePathFromOrigUrlPath = origUrlPath.replace(/\//g, '|')
    let name = ''
    if (req.query.w) { name += 'w' + req.query.w }
    if (req.query.h) { name += 'h' + req.query.h }
    if (req.query.f) { name += 'f' + req.query.f }
    if (req.query.c) { name += 'c' + req.query.c }
    if (req.query.x) { name += 'x' + req.query.x }
    if (req.query.y) { name += 'y' + req.query.y }
    if (req.query.r) { name += 'r' + req.query.r }
    const cacheDirToFile = p.join(cacheDir, cachePathFromOrigUrlPath)
    mkdirp(cacheDirToFile, function (err) {
      if (err) return next(err)
      const cacheUrlPath = p.join(cachePathFromOrigUrlPath, name + extname)
      const cacheFsPath = p.join(cacheDir, cacheUrlPath)

      fs.stat(origFsPath, function (err, origStats) {
        if (err) return newNextFunction() // файл не найден 404
        fs.stat(cacheFsPath, function (err, cacheStats) {
          if (err || origStats.mtime.getTime() > cacheStats.mtime.getTime()) {
            updateImage(origFsPath, cacheFsPath, req.query, function (err) {
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

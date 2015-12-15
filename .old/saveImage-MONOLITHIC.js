  /**
   * save image to DB and FS, if it has not any duplicate
   */
  var saveImageMONOLITHIC = function(image, images, callback) {
//return callback(null, null);
    var showcaseWidth = 320; // TODO: choose this in config(and pass to client...)

    if (image.hasDuplicate) {
      log.silly('saveImageMOLOLITHIC: image is void (has duplicate): SKIPPING');
      return callback(null, null);
    }

    // save image to FS and DB
    var destinationDir = config.images.path + '/' + image.personKey;
    mkdirp(destinationDir, function(err, made) {
      if (err) {
        log.warn('can\'t make directory ', destinationDir);
        return callback(err, image);
      }
      // use a hash of response url + current timestamp as filename
      var hash = crypto.createHash('md5').update(image.url + Date.now()).digest('hex');
      // use response url extension as filename extension
      var ext = path.extname(image.url);
      ext = local.normalizeExtension(ext);
      var basename = hash + ext;
      image.basename = image.personKey + '/' + basename;
      // TODO: better handle different sizes...
      image.basename = image.personKey + '/' + showcaseWidth + 'x' + '-' + basename;
      //var destination = destinationDir + '/' + basename;
      var destinationFull = destinationDir + '/' + 'full-' + basename;
      var destinationShowcase = destinationDir + '/' + showcaseWidth + 'x' + '-' + basename;

      // save image contents to filesystem
      fs.writeFile(
        destinationFull,
        image.contents,
        'binary',
        function(err) {
          if (err) {
            log.warn('can\'t write file to file system:', err);
            return callback(err, image);
          }
          log.info('image', image.url, 'saved to', destinationFull);
          callback(null, image); // success
        }
      );

/**/
      // save image contents to FS
      // let use jimp to save full-sized and showcase-sized images
//log.debug('buffering');
      var buf = new Buffer(image.contents, 'binary');
//log.debug('reading');
      jimp.read(buf, function(err, img) { // THIS IS FAST
        if (err) {
          log.warn(err);
          return callback(err, image);
        }
log.debug('read', image.url);

/*
        img
          // write full size image
          .write(destinationFull, function(err) {
            if (err) {
              log.warn(err);
              return callback(err, image);
            }
log.debug('written', destinationFull);
          })
*/
/*
          // write showcase-resized image
          .resize(Math.min(showcaseWidth, img.bitmap.width), jimp.AUTO) // to avoid enlarging small showcase images
          .quality(75)
          .write(destinationShowcase, function(err) {
            if (err) {
              log.warn(err);
              return callback(err, image);
            }
          })
        ;
*/
      });
      buf = null; // delete Buffer object

      // save image to DB
      var imageObj;
      if (image.isNew) {
        imageObj = new Image();
        for (var p in image) {
          imageObj[p] = image[p]; // clone image properties to imageObj
        }
      } else {
        // TODO: use grep() !!!
        var imageFilter = images.filter(function(img) {
          return ((img._doc.personKey === image.personKey) && (img._doc.url === image.url));
        });
        imageObj = imageFilter[0];
      }

      imageObj.save(function(err) {
        if (err) {
          log.warn('can\'t save image', imageObj.basename, ':', err);
        } else {
          log.info('image', imageObj.basename, 'added');
        }
        callback(null, image); // success
      });

    });
  };
